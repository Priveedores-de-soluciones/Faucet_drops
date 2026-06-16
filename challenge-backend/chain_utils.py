"""
chain_utils.py
──────────────
Serialised on-chain transaction helpers.

ALL on-chain sends from this backend must go through `send_tx()`.
This guarantees:
  • One transaction is broadcast at a time (asyncio.Lock).
  • Nonce is fetched from the node only once, then tracked locally.
  • On "replacement transaction underpriced" the tx is retried with a
    bumped gas price (×1.20) up to MAX_RETRIES times.
  • On a nonce-conflict the nonce is re-fetched and the tx is rebuilt.
  • EIP-1559 and legacy (gasPrice) transactions are both supported —
    the gas fields are injected to match whatever type build_transaction()
    returns, so we never inject gasPrice into an EIP-1559 tx or vice-versa.

Usage
-----
    from chain_utils import send_tx

    receipt = await send_tx(
        build_fn   = lambda nonce: contract.functions.foo(arg).build_transaction({
                         "from":  account.address,
                         "nonce": nonce,
                         "gas":   150_000,
                     }),
        account    = account,
        w3         = w3,
        label      = "foo()",   # for logging only
    )
"""
from __future__ import annotations

import asyncio
import logging
import os
import time
from typing import Callable

from web3 import Web3
from web3.types import TxReceipt
from eth_account.signers.local import LocalAccount

logger = logging.getLogger(__name__)

# ── Config ────────────────────────────────────────────────────────────────────

CELO_RPC_URL         = os.getenv("CELO_RPC_URL", "https://forno.celo.org")
RESOLVER_PRIVATE_KEY = os.getenv("RESOLVER_PRIVATE_KEY", "")

MAX_RETRIES    = 4
GAS_PRICE_BUMP = 1.20          # ×120 % on each retry
TX_TIMEOUT_SECS = 90

# ── Global serialisation lock ─────────────────────────────────────────────────

_tx_lock: asyncio.Lock | None = None   # created lazily inside the event-loop


def _get_lock() -> asyncio.Lock:
    global _tx_lock
    if _tx_lock is None:
        _tx_lock = asyncio.Lock()
    return _tx_lock


# ── Nonce tracking ────────────────────────────────────────────────────────────

_tracked_nonce: int | None = None   # last nonce we sent with


def _next_nonce(w3: Web3, address: str, force_refresh: bool = False) -> int:
    global _tracked_nonce
    if _tracked_nonce is None or force_refresh:
        _tracked_nonce = w3.eth.get_transaction_count(address, "pending")
        logger.debug("nonce refreshed from node: %d", _tracked_nonce)
    return _tracked_nonce


def _consume_nonce() -> None:
    global _tracked_nonce
    if _tracked_nonce is not None:
        _tracked_nonce += 1


# ── Gas helpers ───────────────────────────────────────────────────────────────

def _is_eip1559(tx: dict) -> bool:
    """Return True if the tx dict uses EIP-1559 fee fields."""
    return "maxFeePerGas" in tx or "maxPriorityFeePerGas" in tx


def _apply_gas(tx: dict, w3: Web3, base_fee_per_gas: int | None, priority: int, bump_multiplier: float = 1.0) -> dict:
    """
    Inject the correct gas fields into tx in-place, depending on tx type.

    For EIP-1559:
        maxPriorityFeePerGas = priority * bump_multiplier
        maxFeePerGas         = 2 * baseFee + maxPriorityFeePerGas
    For legacy:
        gasPrice             = w3.eth.gas_price * bump_multiplier
    """
    tx.pop("gasPrice", None)
    tx.pop("maxFeePerGas", None)
    tx.pop("maxPriorityFeePerGas", None)

    if base_fee_per_gas is not None:
        # EIP-1559 path
        bumped_priority = int(priority * bump_multiplier)
        tx["maxPriorityFeePerGas"] = bumped_priority
        tx["maxFeePerGas"]         = int(2 * base_fee_per_gas * bump_multiplier) + bumped_priority
    else:
        # Legacy path
        tx["gasPrice"] = int(w3.eth.gas_price * bump_multiplier)

    return tx


# ── Main helper ───────────────────────────────────────────────────────────────

async def send_tx(
    build_fn: Callable[[int], dict],
    account:  LocalAccount,
    w3:       Web3,
    label:    str = "tx",
    gas_price_wei: int | None = None,   # kept for API compat; ignored for EIP-1559
) -> TxReceipt:
    """
    Build, sign, broadcast, and wait for a transaction — serialised globally.

    Parameters
    ----------
    build_fn        A callable that accepts a nonce (int) and returns an
                    unsigned transaction dict (output of build_transaction()).
    account         The signing account.
    w3              A connected Web3 instance.
    label           Human-readable name used in log messages.
    gas_price_wei   Legacy override; used only when the network doesn't support
                    EIP-1559. Pass None to auto-detect (recommended).
    """
    lock = _get_lock()

    async with lock:
        loop = asyncio.get_event_loop()

        def _send_sync() -> TxReceipt:
            global _tracked_nonce

            # Detect network fee model once per send attempt
            try:
                latest_block  = w3.eth.get_block("latest")
                base_fee      = latest_block.get("baseFeePerGas")   # None on legacy chains
            except Exception:
                base_fee = None

            # Starting priority fee (EIP-1559) or legacy gas price
            priority_wei = gas_price_wei or (
                w3.eth.max_priority_fee if base_fee is not None else w3.eth.gas_price
            )
            bump = 1.0

            last_err: Exception | None = None

            for attempt in range(MAX_RETRIES):
                if attempt > 0:
                    bump *= GAS_PRICE_BUMP
                    logger.info(
                        "%s retry %d/%d  bump=%.2f",
                        label, attempt, MAX_RETRIES - 1, bump,
                    )

                force_refresh = (attempt > 0)
                nonce = _next_nonce(w3, account.address, force_refresh=force_refresh)

                try:
                    tx = build_fn(nonce)

                    # Re-fetch base fee on retry so the cap stays current
                    if attempt > 0 and base_fee is not None:
                        try:
                            latest_block = w3.eth.get_block("latest")
                            base_fee = latest_block.get("baseFeePerGas", base_fee)
                        except Exception:
                            pass

                    _apply_gas(tx, w3, base_fee, priority_wei, bump_multiplier=bump)

                    logger.debug(
                        "%s gas fields: %s",
                        label,
                        {k: tx[k] for k in ("gasPrice", "maxFeePerGas", "maxPriorityFeePerGas") if k in tx},
                    )

                    signed  = account.sign_transaction(tx)
                    tx_hash = w3.eth.send_raw_transaction(signed.raw_transaction)
                    logger.info("%s broadcast  nonce=%d  hash=%s", label, nonce, tx_hash.hex())

                    _consume_nonce()

                    receipt = w3.eth.wait_for_transaction_receipt(
                        tx_hash, timeout=TX_TIMEOUT_SECS
                    )
                    if receipt["status"] != 1:
                        raise RuntimeError(f"{label} reverted: {tx_hash.hex()}")

                    logger.info("%s confirmed  hash=%s", label, tx_hash.hex())
                    return receipt

                except Exception as exc:
                    msg = str(exc).lower()
                    last_err = exc

                    if "replacement transaction underpriced" in msg or "underpriced" in msg:
                        logger.warning("%s underpriced (attempt %d) — bumping gas", label, attempt)
                        continue

                    if "nonce too low" in msg or "already known" in msg:
                        logger.warning("%s nonce conflict (attempt %d) — refreshing", label, attempt)
                        _tracked_nonce = None
                        continue

                    raise

            raise RuntimeError(
                f"{label} failed after {MAX_RETRIES} attempts: {last_err}"
            ) from last_err

        return await loop.run_in_executor(None, _send_sync)


# ── Convenience: build a Web3 + account pair ─────────────────────────────────

def build_w3() -> tuple[Web3, LocalAccount]:
    from eth_account import Account
    w3      = Web3(Web3.HTTPProvider(CELO_RPC_URL))
    account = Account.from_key(RESOLVER_PRIVATE_KEY)
    return w3, account