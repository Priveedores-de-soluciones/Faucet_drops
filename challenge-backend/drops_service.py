"""
drops_service.py
────────────────
Handles all DROPS token logic:
  - Welcome mint (100 game_drops, once per wallet)
  - Reward routing after game (winner/tie → reward_drops)
  - Redeem: burn reward_drops → 75% $G at gecko price + 25% DROPS staked
  - Buy: player sends $G → mint game_drops (gecko price, no contract price)
  - Stake claim:
      · Principal DROPS minted back as game_drops via mintTo()
      · APY earned in DROPS, converted to $G at live gecko price,
        paid from pool via releaseCapital(stakeId, apyGWei)
  - Pre-badge enforcement
  - Tier calculation from total_duels
  - Weekly leaderboard reset + winner notifications

CHANGED (v2):
  • _resolver_mint_to and all on-chain helpers now go through chain_utils.send_tx()
    which serialises every broadcast behind a global asyncio.Lock and retries on
    "replacement transaction underpriced" with a ×1.20 gas bump — fixing the
    race condition that caused concurrent game-end mints to fail.
"""
from __future__ import annotations

import os
import asyncio
import logging
import datetime
from typing import Optional, TYPE_CHECKING

import httpx
import asyncpg
from web3 import Web3
from eth_account import Account

from abi import _DROPS_TOKEN_ABI
from chain_utils import send_tx, build_w3   # ← new serialised sender

if TYPE_CHECKING:
    from notifications import NotificationService

logger = logging.getLogger(__name__)

# ─── Env ──────────────────────────────────────────────────────────────────────
RESOLVER_PRIVATE_KEY = os.getenv("RESOLVER_PRIVATE_KEY", "")
DROPS_TOKEN_CONTRACT = os.getenv("DROPS_TOKEN_CONTRACT", "")
DROPS_REDEEM_POOL    = os.getenv("DROPS_REDEEM_POOL", "")
G_TOKEN_CONTRACT     = os.getenv("G_TOKEN_CONTRACT", "")
CELO_RPC_URL         = os.getenv("CELO_RPC_URL", "https://forno.celo.org")
G_PRICE_API_URL      = os.getenv("G_PRICE_API_URL", "")
SERVICE_ADDRESS      = os.getenv("SERVICE_ADDRESS", "")
CELO_CHAIN_ID        = int(os.getenv("CHAIN_ID", "42220"))

DROPS_DECIMALS      = 18
WELCOME_DROPS       = 100
MIN_STAKE_DROPS     = 10.0
PRE_BADGE_MAX_STAKE = 10.0
BADGE_UNLOCK_DUELS  = 10
DROPS_PER_USD       = 100.0   # 100 DROPS = $1

# ─── Tier config ──────────────────────────────────────────────────────────────
TIERS = [
    (501, "Flood",     35),
    (301, "Torrent",   30),
    (151, "Downpour",  25),
    ( 51, "Drizzle",   20),
    (  0, "Droplet",   15),
]

def get_tier(total_duels: int) -> tuple[str, int]:
    for threshold, name, apy in TIERS:
        if total_duels >= threshold:
            return name, apy
    return "Droplet", 15

# ─── ABIs ─────────────────────────────────────────────────────────────────────

_POOL_ABI = [
    {
        "inputs": [
            {"internalType": "uint256", "name": "_priceWei", "type": "uint256"},
        ],
        "name": "setGPrice",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function",
    },
    {
        "inputs": [
            {"internalType": "address", "name": "player",        "type": "address"},
            {"internalType": "uint256", "name": "totalDropsWei", "type": "uint256"},
            {"internalType": "uint256", "name": "tierApy",       "type": "uint256"},
        ],
        "name": "redeemForPlayer",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function",
    },
    {
        "inputs": [
            {"internalType": "uint256", "name": "stakeId",  "type": "uint256"},
            {"internalType": "uint256", "name": "apyGWei",  "type": "uint256"},
        ],
        "name": "releaseCapital",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function",
    },
]

# ─── Signing helper (unchanged) ───────────────────────────────────────────────

def _sign_claim(recipient: str, amount_wei: int, ts: int, chain_id: int = CELO_CHAIN_ID) -> bytes:
    from eth_account.messages import encode_defunct
    packed  = Web3.solidity_keccak(
        ["address", "uint256", "uint256", "uint256"],
        [Web3.to_checksum_address(recipient), amount_wei, ts, chain_id],
    )
    account = Account.from_key(RESOLVER_PRIVATE_KEY)
    return account.sign_message(encode_defunct(packed)).signature

# ─── Price ────────────────────────────────────────────────────────────────────

async def _fetch_g_price_usd() -> float:
    url = G_PRICE_API_URL or (
        "https://api.coingecko.com/api/v3/simple/price"
        "?ids=good-dollar&vs_currencies=usd"
    )
    async with httpx.AsyncClient(timeout=10) as client:
        resp = await client.get(url)
        resp.raise_for_status()
        data = resp.json()
        if G_PRICE_API_URL:
            return float(data.get("price") or data.get("usd") or data["data"]["price"])
        return float(data["good-dollar"]["usd"])


def _g_price_to_wei(price_usd: float) -> int:
    g_per_usd = 1.0 / price_usd
    return int(g_per_usd * (10 ** DROPS_DECIMALS))


def _drops_to_g(drops: float, g_price_usd: float) -> float:
    usd = drops / DROPS_PER_USD
    return usd / g_price_usd

# ─── Core on-chain mint ───────────────────────────────────────────────────────

async def _mint_to(recipient: str, amount_wei: int, label: str = "mintTo") -> str:
    """
    Calls DropToken.mintTo(to, amount) via the serialised send_tx helper.
    Returns the tx hash string.

    Previously this was the sync _resolver_mint_to() called with
    run_in_executor; now it is fully async and serialised globally.
    """
    w3, account = build_w3()
    token = w3.eth.contract(
        address=Web3.to_checksum_address(DROPS_TOKEN_CONTRACT),
        abi=_DROPS_TOKEN_ABI,
    )
    recipient_cs = Web3.to_checksum_address(recipient)

    def _build(nonce: int) -> dict:
        return token.functions.mintTo(recipient_cs, amount_wei).build_transaction({
            "from":  account.address,
            "nonce": nonce,
            "gas":   120_000,
        })

    receipt = await send_tx(_build, account, w3, label=label)
    return receipt["transactionHash"].hex()

# ─── Welcome ──────────────────────────────────────────────────────────────────

async def mint_welcome_drops(
    pool: asyncpg.Pool,
    wallet: str,
    notif: Optional["NotificationService"] = None,
) -> bool:
    wallet = wallet.lower()
    async with pool.acquire() as conn:
        already = await conn.fetchval(
            "SELECT drops_minted FROM challenge_players WHERE wallet_address=$1", wallet
        )
        if already:
            return False
        await conn.execute(
            """UPDATE challenge_players
               SET drops_minted=TRUE, game_drops=game_drops+$1
               WHERE wallet_address=$2""",
            WELCOME_DROPS, wallet,
        )
    logger.info("welcome drops DB-credited  wallet=%s", wallet)

    if notif:
        try:
            await notif.notify_welcome_minted(wallet)
        except Exception as e:
            logger.warning("notify_welcome_minted failed wallet=%s: %s", wallet, e)

    return True


async def confirm_welcome_mint(pool: asyncpg.Pool, wallet: str, tx_hash: str) -> None:
    wallet = wallet.lower()
    async with pool.acquire() as conn:
        await conn.execute(
            """UPDATE challenge_players
               SET drops_minted=TRUE, welcome_tx_hash=$1
               WHERE wallet_address=$2""",
            tx_hash, wallet,
        )

# ─── Game Rewards ─────────────────────────────────────────────────────────────

async def credit_game_reward(
    pool:         asyncpg.Pool,
    wallet:       str,
    drops_amount: float,
    reason:       str = "game_win",
) -> None:
    """
    Credits reward_drops in DB and mints on-chain via serialised _mint_to().

    The previous version called _resolver_mint_to() via run_in_executor, which
    meant concurrent game-end calls raced on the same nonce.  Now every mint
    goes through chain_utils.send_tx() which holds a global asyncio.Lock.
    """
    wallet = wallet.lower()

    async with pool.acquire() as conn:
        await conn.execute(
            "UPDATE challenge_players SET reward_drops=reward_drops+$1 WHERE wallet_address=$2",
            drops_amount, wallet,
        )
        await conn.execute("SELECT challenge_update_player_tier($1)", wallet)

    amount_wei = int(drops_amount * (10 ** DROPS_DECIMALS))
    try:
        tx = await _mint_to(wallet, amount_wei, label=f"credit_game_reward({reason})")
        logger.info(
            "game reward minted  wallet=%s  amount=%s  reason=%s  tx=%s",
            wallet, drops_amount, reason, tx,
        )
    except Exception as e:
        # Roll back DB credit on mint failure
        async with pool.acquire() as conn:
            await conn.execute(
                "UPDATE challenge_players SET reward_drops=reward_drops-$1 WHERE wallet_address=$2",
                drops_amount, wallet,
            )
        logger.error(
            "game reward mint FAILED  wallet=%s  amount=%s  reason=%s  error=%s",
            wallet, drops_amount, reason, e,
        )
        raise


async def credit_tie_refund(
    pool:       asyncpg.Pool,
    wallet_a:   str,
    wallet_b:   str,
    drops_each: float,
) -> None:
    # Sequential — not concurrent — so nonces are well-ordered
    for wallet in [wallet_a, wallet_b]:
        await credit_game_reward(pool, wallet, drops_each, reason="tie_refund")

# ─── Pre-badge enforcement ────────────────────────────────────────────────────

async def check_pre_badge_rules(
    pool:         asyncpg.Pool,
    wallet_a:     str,
    wallet_b:     str,
    stake_amount: float,
) -> Optional[str]:
    wallet_a = wallet_a.lower()
    wallet_b = wallet_b.lower()

    async with pool.acquire() as conn:
        rows = await conn.fetch(
            """SELECT wallet_address, total_duels, rematch_badge
               FROM challenge_players
               WHERE wallet_address = ANY($1::text[])""",
            [wallet_a, wallet_b],
        )

    player_map = {r["wallet_address"]: r for r in rows}

    for wallet in [wallet_a, wallet_b]:
        p = player_map.get(wallet)
        if not p:
            continue
        if not p["rematch_badge"] and stake_amount > PRE_BADGE_MAX_STAKE:
            return (
                f"Players without the Rematch Badge cannot stake more than "
                f"{PRE_BADGE_MAX_STAKE} DROPS per game."
            )

    needs_check = any(
        not player_map.get(w, {}).get("rematch_badge", False)
        for w in [wallet_a, wallet_b]
    )
    if needs_check:
        key_a = min(wallet_a, wallet_b)
        key_b = max(wallet_a, wallet_b)
        async with pool.acquire() as conn:
            played = await conn.fetchval(
                "SELECT 1 FROM challenge_player_matchups WHERE wallet_a=$1 AND wallet_b=$2",
                key_a, key_b,
            )
        if played:
            return (
                "These two players have already faced each other. "
                "Earn the Rematch Badge (play 10 games) to play again."
            )

    return None


async def record_matchup(pool: asyncpg.Pool, wallet_a: str, wallet_b: str) -> None:
    key_a = min(wallet_a.lower(), wallet_b.lower())
    key_b = max(wallet_a.lower(), wallet_b.lower())
    async with pool.acquire() as conn:
        await conn.execute(
            """INSERT INTO challenge_player_matchups (wallet_a, wallet_b)
               VALUES ($1, $2) ON CONFLICT DO NOTHING""",
            key_a, key_b,
        )

# ─── Badge unlock check ───────────────────────────────────────────────────────

async def maybe_notify_badge_unlock(
    pool:   asyncpg.Pool,
    wallet: str,
    notif:  "NotificationService",
) -> None:
    wallet = wallet.lower()
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            "SELECT total_duels, rematch_badge FROM challenge_players WHERE wallet_address=$1",
            wallet,
        )
    if not row:
        return

    total_duels   = int(row["total_duels"] or 0)
    already_badge = row["rematch_badge"]

    if total_duels >= BADGE_UNLOCK_DUELS and not already_badge:
        async with pool.acquire() as conn:
            updated = await conn.execute(
                """UPDATE challenge_players
                   SET rematch_badge=TRUE
                   WHERE wallet_address=$1 AND rematch_badge=FALSE""",
                wallet,
            )
        if updated != "UPDATE 0":
            try:
                await notif.notify_badge_unlocked(wallet, total_duels)
            except Exception as e:
                logger.warning("notify_badge_unlocked failed wallet=%s: %s", wallet, e)

# ─── Weekly leaderboard ───────────────────────────────────────────────────────

async def increment_weekly_stats(
    pool:        asyncpg.Pool,
    winner:      Optional[str],
    all_wallets: list[str],
) -> None:
    async with pool.acquire() as conn:
        await conn.executemany(
            "UPDATE challenge_players SET weekly_duels=weekly_duels+1 WHERE wallet_address=$1",
            [(w.lower(),) for w in all_wallets],
        )
        if winner:
            await conn.execute(
                "UPDATE challenge_players SET weekly_wins=weekly_wins+1 WHERE wallet_address=$1",
                winner.lower(),
            )

# ─── Redeem ───────────────────────────────────────────────────────────────────

async def redeem_reward_drops(
    pool:            asyncpg.Pool,
    wallet:          str,
    drops_to_redeem: float,
    notif:           Optional["NotificationService"] = None,
) -> dict:
    """
    Redeem reward_drops:
      - 75% → $G at live gecko price, paid to player via redeemForPlayer()
      - 25% DROPS locked in pool as stake
      - 10% fee on 75% paid to serviceAddress by contract

    All three sequential on-chain calls go through send_tx() so they
    never race with concurrent game mints.
    """
    wallet = wallet.lower()

    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            """SELECT reward_drops, total_duels, rematch_badge
               FROM challenge_players WHERE wallet_address=$1""",
            wallet,
        )

    if not row:
        raise ValueError("Player not found")

    reward_drops = float(row["reward_drops"])
    total_duels  = int(row["total_duels"])

    if not row["rematch_badge"]:
        raise ValueError(
            f"Must complete {BADGE_UNLOCK_DUELS} games before redeeming. "
            f"You've played {total_duels}."
        )
    if reward_drops < drops_to_redeem:
        raise ValueError(
            f"Insufficient reward drops. Available: {reward_drops}, "
            f"Requested: {drops_to_redeem}"
        )

    _, apy_pct = get_tier(total_duels)

    g_price_usd = await _fetch_g_price_usd()
    g_price_wei = _g_price_to_wei(g_price_usd)

    player_drops = drops_to_redeem * 0.75
    staked_drops = drops_to_redeem * 0.25

    player_g_gross = _drops_to_g(player_drops, g_price_usd)
    fee_g          = player_g_gross * 0.10
    player_g_net   = player_g_gross - fee_g

    # Debit DB
    async with pool.acquire() as conn:
        await conn.execute(
            "UPDATE challenge_players SET reward_drops=reward_drops-$1 WHERE wallet_address=$2",
            drops_to_redeem, wallet,
        )

    drops_total_wei  = int(drops_to_redeem * (10 ** DROPS_DECIMALS))
    staked_drops_wei = int(staked_drops    * (10 ** DROPS_DECIMALS))

    w3, account = build_w3()
    token        = w3.eth.contract(
        address=Web3.to_checksum_address(DROPS_TOKEN_CONTRACT),
        abi=_DROPS_TOKEN_ABI,
    )
    pool_cs       = Web3.to_checksum_address(DROPS_REDEEM_POOL)
    pool_contract = w3.eth.contract(address=pool_cs, abi=_POOL_ABI)
    wallet_cs     = Web3.to_checksum_address(wallet)

    try:
        # 1. Mint 25 % DROPS to pool contract
        def _build_mint(nonce: int) -> dict:
            return token.functions.mintTo(pool_cs, staked_drops_wei).build_transaction({
                "from":  account.address,
                "nonce": nonce,
                "gas":   120_000,
            })
        await send_tx(_build_mint, account, w3, label="redeem:mintToPool")

        # 2. setGPrice with live gecko price
        def _build_price(nonce: int) -> dict:
            return pool_contract.functions.setGPrice(g_price_wei).build_transaction({
                "from":  account.address,
                "nonce": nonce,
                "gas":   80_000,
            })
        await send_tx(_build_price, account, w3, label="redeem:setGPrice")

        # 3. redeemForPlayer
        def _build_redeem(nonce: int) -> dict:
            return pool_contract.functions.redeemForPlayer(
                wallet_cs, drops_total_wei, apy_pct,
            ).build_transaction({
                "from":  account.address,
                "nonce": nonce,
                "gas":   200_000,
            })
        receipt  = await send_tx(_build_redeem, account, w3, label="redeem:redeemForPlayer")
        tx_hash  = receipt["transactionHash"].hex()

    except Exception as e:
        # Roll back DB debit
        async with pool.acquire() as conn:
            await conn.execute(
                "UPDATE challenge_players SET reward_drops=reward_drops+$1 WHERE wallet_address=$2",
                drops_to_redeem, wallet,
            )
        logger.error("redeem FAILED  wallet=%s  error=%s", wallet, e)
        raise

    # Record stake
    async with pool.acquire() as conn:
        stake_row = await conn.fetchrow(
            """INSERT INTO challenge_stake_pools
               (wallet_address, drops_staked, apy_pct, g_price_at_stake, matures_at)
               VALUES ($1, $2, $3, $4, NOW() + INTERVAL '30 days')
               RETURNING id""",
            wallet, staked_drops, float(apy_pct), g_price_usd,
        )
        await conn.execute(
            """INSERT INTO challenge_redeem_history
               (wallet_address, drops_burned, g_price_usd, player_g, fee_g,
                staked_drops, stake_pool_id, tx_hash)
               VALUES ($1,$2,$3,$4,$5,$6,$7,$8)""",
            wallet, drops_to_redeem, g_price_usd,
            player_g_net, fee_g, staked_drops,
            stake_row["id"], tx_hash,
        )

    stake_id = str(stake_row["id"])
    logger.info(
        "redeem OK  wallet=%s  drops=%s  player_g=%s  staked_drops=%s  "
        "apy=%s%%  g_price=%s  tx=%s",
        wallet, drops_to_redeem, player_g_net, staked_drops,
        apy_pct, g_price_usd, tx_hash,
    )

    if notif:
        try:
            await notif.notify_redeem_completed(
                wallet         = wallet,
                drops_redeemed = drops_to_redeem,
                player_g       = player_g_net,
                staked_drops   = staked_drops,
                apy_pct        = apy_pct,
                tx_hash        = tx_hash,
                stake_id       = stake_id,
            )
        except Exception as e:
            logger.warning("notify_redeem_completed failed wallet=%s: %s", wallet, e)

    return {
        "success":       True,
        "dropsRedeemed": drops_to_redeem,
        "playerDrops":   player_drops,
        "stakedDrops":   staked_drops,
        "gPriceUsd":     g_price_usd,
        "playerG":       player_g_net,
        "feeG":          fee_g,
        "apyPct":        apy_pct,
        "txHash":        tx_hash,
        "stakeId":       stake_id,
    }

# ─── Claim Stake ──────────────────────────────────────────────────────────────

async def claim_pending_drops(
    pool:   asyncpg.Pool,
    wallet: str,
    code:   str,
    notif:  Optional["NotificationService"] = None,
) -> dict:
    """
    Called when a winner clicks "Claim" OR a tied player clicks "Refund".
 
    1. Fetches the pending claim row for (wallet, code).
    2. Validates it exists and hasn't been claimed yet.
    3. Mints drops on-chain via _mint_to() → send_tx() (serialised, retries).
    4. On success: marks claimed, credits the correct balance column.
       - reason='game_win'   → reward_drops  (earned reward)
       - reason='tie_refund' → game_drops    (stake returned, not a reward)
    5. Returns {success, dropsMinted, txHash, reason} for frontend feedback.
 
    Raises
    ------
    ValueError   — no pending claim, already claimed, wrong wallet.
    RuntimeError — on-chain mint failed (chain_utils will have retried 4×).
    """
    wallet = wallet.lower()
 
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            """SELECT id, drops_amount, reason, claimed, tx_hash
               FROM challenge_pending_claims
               WHERE wallet_address = $1
                 AND game_code      = $2""",
            wallet, code,
        )
 
    if not row:
        raise ValueError("No pending claim found for this wallet and game.")
    if row["claimed"]:
        raise ValueError(f"Already claimed. tx={row['tx_hash']}")
 
    drops_amount = float(row["drops_amount"])
    reason       = row["reason"]            # 'game_win' | 'tie_refund'
    amount_wei   = int(drops_amount * (10 ** DROPS_DECIMALS))
 
    # ── On-chain mint (serialised via chain_utils.send_tx) ────────────────────
    tx_hash = await _mint_to(
        wallet,
        amount_wei,
        label=f"claim_pending({reason},code={code})",
    )
 
    # ── DB: mark claimed + credit the right balance column ────────────────────
    balance_col = "reward_drops" if reason == "game_win" else "game_drops"
 
    async with pool.acquire() as conn:
        await conn.execute(
            """UPDATE challenge_pending_claims
               SET claimed    = TRUE,
                   tx_hash    = $1,
                   claimed_at = NOW()
               WHERE id = $2""",
            tx_hash, row["id"],
        )
        await conn.execute(
            f"""UPDATE challenge_players
                SET {balance_col} = {balance_col} + $1
                WHERE wallet_address = $2""",
            drops_amount, wallet,
        )
 
    logger.info(
        "claim_pending_drops OK  wallet=%s  code=%s  drops=%s  reason=%s  tx=%s",
        wallet, code, drops_amount, reason, tx_hash,
    )
 
    # ── Notification ──────────────────────────────────────────────────────────
    if notif:
        try:
            if reason == "game_win":
                await notif.notify_reward_claimed(
                    wallet       = wallet,
                    drops_amount = drops_amount,
                    tx_hash      = tx_hash,
                    game_code    = code,
                )
            else:
                await notif.notify_refund_claimed(
                    wallet       = wallet,
                    drops_amount = drops_amount,
                    tx_hash      = tx_hash,
                    game_code    = code,
                )
        except Exception as e:
            logger.warning("notify claim failed wallet=%s reason=%s: %s", wallet, reason, e)
 
    return {
        "success":     True,
        "dropsMinted": drops_amount,
        "txHash":      tx_hash,
        "reason":      reason,   # frontend can show "Reward claimed" vs "Stake refunded"
    }

async def deduct_game_drops(
    pool:   asyncpg.Pool,
    wallet: str,
    amount: float,
    reason: str = "stake",
) -> None:
    """
    Deduct from game_drops. Raises ValueError if insufficient balance.
    Call this before the game starts (on burn confirmation).
    """
    wallet = wallet.lower()
    async with pool.acquire() as conn:
        updated = await conn.execute(
            """UPDATE challenge_players
               SET game_drops = game_drops - $1
               WHERE wallet_address = $2
                 AND game_drops >= $1""",
            amount, wallet,
        )
    if updated == "UPDATE 0":
        async with pool.acquire() as conn:
            row = await conn.fetchrow(
                "SELECT game_drops FROM challenge_players WHERE wallet_address=$1", wallet
            )
        available = float(row["game_drops"]) if row else 0.0
        raise ValueError(
            f"Insufficient game DROPS. Required: {amount}, Available: {available:.2f}"
        )
    logger.info("game_drops deducted  wallet=%s  amount=%s  reason=%s", wallet, amount, reason)


async def check_game_drops_balance(
    pool:   asyncpg.Pool,
    wallet: str,
    amount: float,
) -> None:
    """
    Raises ValueError if wallet cannot cover `amount` from game_drops.
    Call this during challenge creation before any DB writes.
    """
    wallet = wallet.lower()
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            "SELECT game_drops FROM challenge_players WHERE wallet_address=$1", wallet
        )
    available = float(row["game_drops"]) if row else 0.0
    if available < amount:
        raise ValueError(
            f"Insufficient game DROPS to create challenge. "
            f"Required: {amount}, Available: {available:.2f}"
        )
        
        
async def claim_stake_db(
    pool:     asyncpg.Pool,
    wallet:   str,
    stake_id: str,
    notif:    Optional["NotificationService"] = None,
) -> dict:
    wallet = wallet.lower()

    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            "SELECT * FROM challenge_stake_pools WHERE id=$1 AND wallet_address=$2",
            stake_id, wallet,
        )

    if not row:
        raise ValueError("Stake not found or not owned by this wallet")
    if row["claimed"]:
        raise ValueError("Stake already claimed")

    now = datetime.datetime.utcnow().replace(tzinfo=row["matures_at"].tzinfo)
    if row["matures_at"] > now:
        raise ValueError(
            f"Stake not matured yet. Matures at {row['matures_at'].isoformat()}"
        )

    staked_drops = float(row["drops_staked"])
    apy_pct      = float(row["apy_pct"])
    g_price_usd  = await _fetch_g_price_usd()
    earned_drops = staked_drops * (apy_pct / 100.0)
    earned_g     = _drops_to_g(earned_drops, g_price_usd)
    earned_g_wei = int(earned_g * (10 ** DROPS_DECIMALS))
    principal_g  = _drops_to_g(staked_drops, g_price_usd)

    w3, account  = build_w3()

    # 1. Mint principal DROPS back as game_drops
    principal_wei = int(staked_drops * (10 ** DROPS_DECIMALS))
    wallet_cs     = Web3.to_checksum_address(wallet)
    token         = w3.eth.contract(
        address=Web3.to_checksum_address(DROPS_TOKEN_CONTRACT),
        abi=_DROPS_TOKEN_ABI,
    )

    def _build_principal(nonce: int) -> dict:
        return token.functions.mintTo(wallet_cs, principal_wei).build_transaction({
            "from":  account.address,
            "nonce": nonce,
            "gas":   120_000,
        })

    try:
        receipt  = await send_tx(_build_principal, account, w3, label="claim_stake:principal")
        mint_tx  = receipt["transactionHash"].hex()
    except Exception as e:
        logger.error("claim principal mint FAILED  wallet=%s  stake_id=%s  error=%s", wallet, stake_id, e)
        raise RuntimeError(f"Principal mint failed: {e}") from e

    # 2. releaseCapital(stakeId, apyGWei)
    pool_contract = w3.eth.contract(
        address=Web3.to_checksum_address(DROPS_REDEEM_POOL),
        abi=_POOL_ABI,
    )

    def _build_release(nonce: int) -> dict:
        return pool_contract.functions.releaseCapital(
            int(stake_id), earned_g_wei,
        ).build_transaction({
            "from":  account.address,
            "nonce": nonce,
            "gas":   200_000,
        })

    try:
        receipt    = await send_tx(_build_release, account, w3, label="claim_stake:releaseCapital")
        release_tx = receipt["transactionHash"].hex()
    except Exception as e:
        logger.error("releaseCapital FAILED  wallet=%s  stake_id=%s  error=%s", wallet, stake_id, e)
        async with pool.acquire() as conn:
            await conn.execute(
                "UPDATE challenge_stake_pools SET principal_returned=TRUE, mint_tx_hash=$1 WHERE id=$2",
                mint_tx, stake_id,
            )
        raise RuntimeError(f"APY release failed (principal already returned): {e}") from e

    # 3. DB: credit game_drops + mark claimed
    async with pool.acquire() as conn:
        await conn.execute(
            """UPDATE challenge_stake_pools
               SET claimed=TRUE, claimed_at=NOW(),
                   earned_drops=$1, earned_g=$2,
                   g_price_at_claim=$3,
                   mint_tx_hash=$4, release_tx_hash=$5,
                   principal_returned=TRUE
               WHERE id=$6""",
            earned_drops, earned_g, g_price_usd,
            mint_tx, release_tx, stake_id,
        )
        await conn.execute(
            "UPDATE challenge_players SET game_drops=game_drops+$1 WHERE wallet_address=$2",
            staked_drops, wallet,
        )

    logger.info(
        "stake claim OK  wallet=%s  stake_id=%s  principal_drops=%s  "
        "earned_drops=%s  earned_g=%s  g_price=%s  mint_tx=%s  release_tx=%s",
        wallet, stake_id, staked_drops, earned_drops,
        earned_g, g_price_usd, mint_tx, release_tx,
    )

    if notif:
        try:
            await notif.notify_stake_claimed(
                wallet          = wallet,
                stake_id        = stake_id,
                principal_drops = staked_drops,
                earned_g        = earned_g,
                apy_pct         = int(apy_pct),
                mint_tx         = mint_tx,
                release_tx      = release_tx,
            )
        except Exception as e:
            logger.warning("notify_stake_claimed failed wallet=%s: %s", wallet, e)

    return {
        "success":        True,
        "stakeId":        stake_id,
        "principalDrops": staked_drops,
        "earnedDrops":    earned_drops,
        "earnedG":        earned_g,
        "principalG":     principal_g,
        "gPriceUsd":      g_price_usd,
        "apyPct":         apy_pct,
        "mintTx":         mint_tx,
        "releaseTx":      release_tx,
    }

# ─── Buy DROPS with $G ────────────────────────────────────────────────────────

async def _quick_verify_tx_success(tx_hash: str) -> bool:
    try:
        async with httpx.AsyncClient(timeout=15) as client:
            r = await client.post(CELO_RPC_URL, json={
                "jsonrpc": "2.0", "id": 1,
                "method":  "eth_getTransactionReceipt",
                "params":  [tx_hash],
            })
            receipt = r.json().get("result")
        return receipt is not None and receipt.get("status") == "0x1"
    except Exception as e:
        logger.warning("TX verification failed: %s", e)
        return False


async def buy_drops_with_g(
    pool:              asyncpg.Pool,
    wallet:            str,
    g_tx_hash:         str,
    expected_g_amount: float,
    drops_amount:      Optional[float] = None,
) -> dict:
    wallet = wallet.lower()

    if not g_tx_hash or not g_tx_hash.startswith("0x"):
        raise ValueError("Invalid gTxHash")

    async with pool.acquire() as conn:
        exists = await conn.fetchval(
            "SELECT 1 FROM challenge_buy_drops_history WHERE g_tx_hash=$1", g_tx_hash,
        )
    if exists:
        raise ValueError("This transaction has already been processed")

    tx_ok = await _quick_verify_tx_success(g_tx_hash)
    if not tx_ok:
        raise ValueError(
            "Transaction not found or failed on-chain. "
            "Ensure the $G transfer confirmed before submitting."
        )

    if drops_amount is None:
        g_price_usd  = await _fetch_g_price_usd()
        drops_amount = expected_g_amount * g_price_usd * DROPS_PER_USD

    amount_wei = int(drops_amount * (10 ** DROPS_DECIMALS))

    async with pool.acquire() as conn:
        await conn.execute(
            "UPDATE challenge_players SET game_drops=game_drops+$1 WHERE wallet_address=$2",
            drops_amount, wallet,
        )
        await conn.execute(
            """INSERT INTO challenge_buy_drops_history
               (wallet_address, g_paid, drops_minted, g_tx_hash, status)
               VALUES ($1, $2, $3, $4, 'pending_mint')""",
            wallet, expected_g_amount, drops_amount, g_tx_hash,
        )

    try:
        mint_tx = await _mint_to(wallet, amount_wei, label="buy_drops:mintTo")
    except Exception as e:
        async with pool.acquire() as conn:
            await conn.execute(
                "UPDATE challenge_players SET game_drops=game_drops-$1 WHERE wallet_address=$2",
                drops_amount, wallet,
            )
            await conn.execute(
                "UPDATE challenge_buy_drops_history SET status='failed' WHERE g_tx_hash=$1",
                g_tx_hash,
            )
        logger.error("buy mintTo FAILED  wallet=%s  error=%s", wallet, e)
        raise RuntimeError(f"Mint failed: {e}") from e

    async with pool.acquire() as conn:
        await conn.execute(
            "UPDATE challenge_buy_drops_history SET status='confirmed', mint_tx_hash=$1 WHERE g_tx_hash=$2",
            mint_tx, g_tx_hash,
        )

    logger.info(
        "buy DROPS OK  wallet=%s  drops=%s  g_paid=%s  g_tx=%s  mint_tx=%s",
        wallet, drops_amount, expected_g_amount, g_tx_hash, mint_tx,
    )
    return {
        "success":     True,
        "dropsMinted": drops_amount,
        "gPaid":       expected_g_amount,
        "mintTxHash":  mint_tx,
    }

# ─── Stake read helpers ───────────────────────────────────────────────────────

async def get_player_stakes_db(pool: asyncpg.Pool, wallet: str) -> list:
    wallet = wallet.lower()
    async with pool.acquire() as conn:
        rows = await conn.fetch(
            """SELECT id, drops_staked, apy_pct, g_price_at_stake,
                      staked_at, matures_at, claimed, claimed_at,
                      earned_drops, earned_g, g_price_at_claim,
                      principal_returned, mint_tx_hash, release_tx_hash
               FROM challenge_stake_pools
               WHERE wallet_address=$1
               ORDER BY staked_at DESC""",
            wallet,
        )

    results = []
    for r in rows:
        d            = dict(r)
        d["id"]         = str(d["id"])
        d["staked_at"]  = d["staked_at"].isoformat()
        d["matures_at"] = d["matures_at"].isoformat()
        d["matured"]    = datetime.datetime.utcnow().replace(
            tzinfo=r["matures_at"].tzinfo
        ) >= r["matures_at"]
        if d["claimed_at"]:
            d["claimed_at"] = d["claimed_at"].isoformat()
        results.append(d)
    return results

# ─── Stake maturity background checker ───────────────────────────────────────

async def stake_maturity_check_loop(
    pool:             asyncpg.Pool,
    notif:            "NotificationService",
    interval_minutes: int = 60,
) -> None:
    while True:
        await asyncio.sleep(interval_minutes * 60)
        try:
            async with pool.acquire() as conn:
                rows = await conn.fetch(
                    """SELECT id, wallet_address, drops_staked, apy_pct
                       FROM challenge_stake_pools
                       WHERE claimed=FALSE AND maturity_notified=FALSE AND matures_at<=NOW()""",
                )
            for row in rows:
                try:
                    await notif.notify_stake_matured(
                        wallet       = row["wallet_address"],
                        stake_id     = str(row["id"]),
                        staked_drops = float(row["drops_staked"]),
                        apy_pct      = int(row["apy_pct"]),
                    )
                    async with pool.acquire() as conn:
                        await conn.execute(
                            "UPDATE challenge_stake_pools SET maturity_notified=TRUE WHERE id=$1",
                            row["id"],
                        )
                except Exception as e:
                    logger.warning(
                        "stake maturity notify failed  stake=%s  wallet=%s  err=%s",
                        row["id"], row["wallet_address"], e,
                    )
        except Exception as e:
            logger.error("stake_maturity_check_loop error: %s", e)

# ─── Weekly leaderboard reset ─────────────────────────────────────────────────

async def weekly_leaderboard_reset_loop(
    pool:  asyncpg.Pool,
    notif: Optional["NotificationService"] = None,
) -> None:
    while True:
        now            = datetime.datetime.utcnow()
        days_to_sunday = (6 - now.weekday()) % 7 or 7
        next_reset     = (now + datetime.timedelta(days=days_to_sunday)).replace(
            hour=23, minute=0, second=0, microsecond=0
        )
        wait_secs = (next_reset - now).total_seconds()
        logger.info(
            "Weekly leaderboard reset in %.0f seconds (at %s UTC)",
            wait_secs, next_reset.isoformat(),
        )
        await asyncio.sleep(wait_secs)
        try:
            if notif:
                try:
                    async with pool.acquire() as conn:
                        top_rows = await conn.fetch(
                            """SELECT wallet_address, username, weekly_wins
                               FROM challenge_players
                               WHERE COALESCE(weekly_duels,0) > 0
                               ORDER BY weekly_wins DESC, weekly_duels DESC
                               LIMIT 3""",
                        )
                    for rank, row in enumerate(top_rows, start=1):
                        await notif.notify_weekly_winner(
                            wallet      = row["wallet_address"],
                            username    = row["username"] or "Anonymous",
                            weekly_wins = int(row["weekly_wins"] or 0),
                            rank        = rank,
                        )
                except Exception as e:
                    logger.error("weekly winner notifications failed: %s", e)

            async with pool.acquire() as conn:
                await conn.execute("SELECT challenge_reset_weekly_leaderboard()")
            logger.info("Weekly leaderboard reset at %s UTC", datetime.datetime.utcnow())
        except Exception as e:
            logger.error("Weekly leaderboard reset FAILED: %s", e)