"""
utils/blockchain.py — On-chain transaction helpers: balance checks, tx building,
whitelist, claim, set_claim_parameters.

These functions depend on the signer singleton from dependencies.
"""
from __future__ import annotations

import asyncio
import logging
from typing import Dict, List, Optional, Tuple

from fastapi import HTTPException
from web3 import Web3
from web3.exceptions import ContractLogicError
from web3.types import TxReceipt

from abis import FAUCET_ABI
from config import PLATFORM_OWNER
from utils.web3_utils import get_chain_info
from utils.supabase_utils import (
    generate_secret_code,
    get_faucet_tasks,
    store_faucet_tasks,
    store_secret_code,
    verify_secret_code,
)

logger = logging.getLogger(__name__)


# ── Signer (lazy-resolved to avoid circular imports at module load) ────────────
def _signer():
    from dependencies import get_signer
    return get_signer()


# ── Balance / gas helpers ─────────────────────────────────────────────────────

def check_sufficient_balance(
    w3: Web3,
    signer_address: str,
    min_balance_eth: float = 0.000001,
) -> Tuple[bool, str]:
    """Ensure the signer holds at least `min_balance_eth` native tokens for gas."""
    try:
        balance = w3.eth.get_balance(signer_address)
        minimum = w3.to_wei(min_balance_eth, "ether")
        chain = get_chain_info(w3.eth.chain_id)
        if balance < minimum:
            fmt = w3.from_wei(balance, "ether")
            return False, (
                f"Insufficient funds: {fmt} {chain['native_token']} "
                f"(minimum ~{min_balance_eth})"
            )
        return True, ""
    except Exception as exc:
        return False, f"Error checking balance: {exc}"


def build_transaction_with_standard_gas(
    w3: Web3,
    contract_function,
    from_address: str,
) -> dict:
    """Build a signed-ready tx dict using network gas price + 10% buffer."""
    gas_price = w3.eth.gas_price
    tx_params = {
        "from": from_address,
        "chainId": w3.eth.chain_id,
        "nonce": w3.eth.get_transaction_count(from_address, "pending"),
        "gasPrice": gas_price,
    }
    tx = contract_function.build_transaction(tx_params)
    try:
        tx["gas"] = int(w3.eth.estimate_gas(tx) * 1.1)
    except Exception as exc:
        logger.warning("Gas estimation failed (%s), using default 200000", exc)
        tx["gas"] = 200_000
    chain = get_chain_info(w3.eth.chain_id)
    logger.debug("⛽ %s: %d gas @ %d wei", chain["name"], tx["gas"], gas_price)
    return tx


async def wait_for_transaction_receipt(
    w3: Web3,
    tx_hash: str,
    timeout: int = 300,
) -> TxReceipt:
    """Poll until the tx is mined, raising HTTPException on timeout."""
    deadline = asyncio.get_event_loop().time() + timeout
    while asyncio.get_event_loop().time() < deadline:
        try:
            receipt = w3.eth.get_transaction_receipt(tx_hash)
            if receipt is not None:
                return receipt
        except Exception:
            pass
        await asyncio.sleep(2)
    raise HTTPException(
        status_code=500,
        detail=f"Transaction {tx_hash} not mined within {timeout}s",
    )


# ── Faucet read helpers ───────────────────────────────────────────────────────

async def check_whitelist_status(w3: Web3, faucet_address: str, user_address: str) -> bool:
    contract = w3.eth.contract(address=faucet_address, abi=FAUCET_ABI)
    for _ in range(5):
        try:
            return contract.functions.isWhitelisted(user_address).call()
        except (ContractLogicError, ValueError) as exc:
            logger.warning("Retry checking whitelist: %s", exc)
            await asyncio.sleep(2)
    raise HTTPException(status_code=500, detail="Failed to check whitelist after retries")


async def check_pause_status(w3: Web3, faucet_address: str) -> bool:
    contract = w3.eth.contract(address=faucet_address, abi=FAUCET_ABI)
    try:
        return contract.functions.paused().call()
    except (ContractLogicError, ValueError) as exc:
        raise HTTPException(status_code=500, detail=f"Failed to check pause status: {exc}")


async def check_user_is_authorized_for_faucet(
    w3: Web3, faucet_address: str, user_address: str
) -> bool:
    try:
        contract = w3.eth.contract(address=faucet_address, abi=FAUCET_ABI)
        for fn_name, kwarg in [
            ("owner", {}),
            ("isAdmin", {"user": user_address}),
            ("BACKEND", {}),
        ]:
            try:
                result = getattr(contract.functions, fn_name)(**kwarg).call()
                if isinstance(result, str) and result.lower() == user_address.lower():
                    return True
                if isinstance(result, bool) and result:
                    return True
            except Exception:
                pass
        return False
    except Exception:
        return False


# ── Whitelist ─────────────────────────────────────────────────────────────────

async def whitelist_user(w3: Web3, faucet_address: str, user_address: str) -> str:
    signer = _signer()
    chain = get_chain_info(w3.eth.chain_id)
    contract = w3.eth.contract(address=faucet_address, abi=FAUCET_ABI)
    ok, err = check_sufficient_balance(w3, signer.address)
    if not ok:
        raise HTTPException(status_code=400, detail=err)
    tx = build_transaction_with_standard_gas(
        w3, contract.functions.setWhitelist(user_address, True), signer.address
    )
    signed = w3.eth.account.sign_transaction(tx, signer.key)
    tx_hash = w3.eth.send_raw_transaction(signed.raw_transaction)
    receipt = await wait_for_transaction_receipt(w3, tx_hash.hex())
    if receipt.get("status", 0) != 1:
        raise HTTPException(status_code=400, detail=f"Whitelist tx failed: {tx_hash.hex()}")
    logger.info("✅ Whitelist ok on %s: %s", chain["name"], tx_hash.hex())
    return tx_hash.hex()


# ── Claim helpers (shared logic extracted) ────────────────────────────────────

def _append_divvi_data(tx: dict, divvi_data: str, w3: Web3) -> dict:
    """Append Divvi referral bytes to the tx data field."""
    if not (isinstance(divvi_data, str) and divvi_data.startswith("0x")):
        return tx
    try:
        divvi_bytes = bytes.fromhex(divvi_data[2:])
        original = tx["data"]
        if isinstance(original, str) and original.startswith("0x"):
            original = bytes.fromhex(original[2:])
        combined = original + divvi_bytes
        tx["data"] = "0x" + combined.hex()
        try:
            tx["gas"] = int(w3.eth.estimate_gas(tx) * 1.15)
        except Exception:
            pass
    except Exception as exc:
        logger.warning("Failed to append Divvi data: %s", exc)
    return tx


async def _send_claim_tx(
    w3: Web3,
    contract_fn,
    signer,
    divvi_data: Optional[str],
) -> str:
    tx = build_transaction_with_standard_gas(w3, contract_fn, signer.address)
    if divvi_data:
        tx = _append_divvi_data(tx, divvi_data, w3)
    signed = w3.eth.account.sign_transaction(tx, signer.key)
    tx_hash = w3.eth.send_raw_transaction(signed.raw_transaction)
    receipt = await wait_for_transaction_receipt(w3, tx_hash.hex())
    if receipt.get("status", 0) != 1:
        try:
            w3.eth.call(tx, block_identifier=receipt["blockNumber"])
        except Exception as rev:
            raise HTTPException(status_code=400, detail=f"Claim failed: {rev}")
    return tx_hash.hex()


async def claim_tokens_no_code(
    w3: Web3,
    faucet_address: str,
    user_address: str,
    divvi_data: Optional[str] = None,
) -> str:
    signer = _signer()
    if await check_pause_status(w3, faucet_address):
        raise HTTPException(status_code=400, detail="Faucet is paused")
    ok, err = check_sufficient_balance(w3, signer.address)
    if not ok:
        raise HTTPException(status_code=400, detail=err)
    contract = w3.eth.contract(address=faucet_address, abi=FAUCET_ABI)
    return await _send_claim_tx(w3, contract.functions.claim([user_address]), signer, divvi_data)


async def claim_tokens(
    w3: Web3,
    faucet_address: str,
    user_address: str,
    secret_code: str,
    divvi_data: Optional[str] = None,
) -> str:
    if not await verify_secret_code(faucet_address, secret_code):
        raise HTTPException(status_code=403, detail="Invalid or expired secret code")
    return await claim_tokens_no_code(w3, faucet_address, user_address, divvi_data)


async def claim_tokens_custom(
    w3: Web3,
    faucet_address: str,
    user_address: str,
    divvi_data: Optional[str] = None,
) -> str:
    signer = _signer()
    if await check_pause_status(w3, faucet_address):
        raise HTTPException(status_code=400, detail="Faucet is paused")
    contract = w3.eth.contract(address=faucet_address, abi=FAUCET_ABI)
    try:
        if not contract.functions.hasCustomClaimAmount(user_address).call():
            raise HTTPException(status_code=400, detail="No custom claim amount set")
        if contract.functions.getCustomClaimAmount(user_address).call() <= 0:
            raise HTTPException(status_code=400, detail="Custom claim amount is zero")
        if contract.functions.hasClaimed(user_address).call():
            raise HTTPException(status_code=400, detail="User has already claimed")
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Contract read error: {exc}")
    ok, err = check_sufficient_balance(w3, signer.address)
    if not ok:
        raise HTTPException(status_code=400, detail=err)
    return await _send_claim_tx(w3, contract.functions.claim([user_address]), signer, divvi_data)


# ── set_claim_parameters ──────────────────────────────────────────────────────

async def set_claim_parameters(
    faucet_address: str,
    start_time: int,
    end_time: int,
    tasks: Optional[List[Dict]] = None,
) -> str:
    signer = _signer()
    secret_code = await generate_secret_code()
    await store_secret_code(faucet_address, secret_code, start_time, end_time)
    if tasks:
        existing: List[Dict] = []
        try:
            existing_data = await get_faucet_tasks(faucet_address)
            if existing_data and "tasks" in existing_data:
                existing = existing_data["tasks"]
        except Exception:
            pass
        combined = existing + tasks
        await store_faucet_tasks(faucet_address, combined, signer.address)
        logger.info("Stored %d tasks (appended) for %s", len(combined), faucet_address)
    return secret_code


# ── Platform owner check ──────────────────────────────────────────────────────

async def check_platform_owner_authorization(user_address: str) -> bool:
    return user_address.lower() == PLATFORM_OWNER.lower()
