from __future__ import annotations
import os, json, random, string, asyncio, logging, uuid
from typing import Dict, List, Optional
import datetime
from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect, UploadFile, File, Form, Query,BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from web3 import Web3
import httpx
import time as _time_module
import asyncpg
from supabase import create_client, Client
from models import (
    CheckAvailabilityRequest, CreateChallengeRequest, JoinChallengeRequest,
    RematachRequest, ClaimRequest, UpdateProfileRequest, UserProfile, SyncProfileRequest,
    StakeOfferRequest, Employee, VerifyRequest, ClaimStakeRequest, RedeemRequest, BuyDropsRequest,ClaimRequest
)
from datetime import datetime, timedelta
from quiz_engine import (_mark_finished, _set_winner_on_chain)
from abi import QUIZ_HUB_ABI
from eth_account import Account
import re
from pydantic import BaseModel
from drops_service import (
    mint_welcome_drops,
    check_pre_badge_rules,
    redeem_reward_drops,
    buy_drops_with_g,
    get_player_stakes_db,
    claim_stake_db,
    claim_pending_drops,
    weekly_leaderboard_reset_loop,
    get_tier,
    BADGE_UNLOCK_DUELS,
    PRE_BADGE_MAX_STAKE,
    MIN_STAKE_DROPS,
    check_game_drops_balance,   # ← add
    deduct_game_drops,          # ← add
)

load_dotenv()

_required = [
    "SUPABASE_URL",
    "SUPABASE_SERVICE_KEY",
    "DATABASE_URL",
    "QUIZ_HUB_CONTRACT",
    "DROPS_TOKEN_CONTRACT",
    "RESOLVER_PRIVATE_KEY",
]

DROPS_TOKEN_CONTRACT = os.getenv("DROPS_TOKEN_CONTRACT")
QUIZ_HUB_CONTRACT    = os.getenv("QUIZ_HUB_CONTRACT")
CELO_RPC_URL         = os.getenv("CELO_RPC_URL", "https://forno.celo.org")
DROPS_DECIMALS       = 18
MIN_STAKE_DROPS      = 10.0

_missing = [v for v in _required if not os.getenv(v)]
if _missing:
    raise RuntimeError(f"Missing required environment variables: {', '.join(_missing)}")

from quiz_engine import generate_questions, run_game_loop, strip_answers
from notifications import NotificationService

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Quizhub Quiz Platform", version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_KEY")
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

BACKEND_ADDRESS  = os.getenv("BACKEND_ADDRESS")
PRIVATE_KEY      = os.getenv("RESOLVER_PRIVATE_KEY")
CONTRACT_ADDRESS = os.getenv("QUIZ_HUB_CONTRACT")
DATABASE_URL     = os.getenv("DATABASE_URL")
STORAGE_BUCKET   = "employee-photos"

RPC_URLS = {
    42220: "https://forno.celo.org",
    8453:  "https://mainnet.base.org",
    1135:  "https://rpc.api.lisk.com",
}

# ─── Global In-Memory State ───────────────────────────────────────────────────
challenges:  Dict[str, dict]            = {}
game_state:  Dict[str, dict]            = {}
connections: Dict[str, List[WebSocket]] = {}
notify_conn: Dict[str, List[WebSocket]] = {}
offers:      Dict[str, dict]            = {}
pool: asyncpg.Pool = None
notif: NotificationService = None

DROPS_REDEEM_EVENT_SIG = Web3.keccak(
    text="PointsRedeemed(address,uint256,string)"
).hex()

# ─── Helpers ──────────────────────────────────────────────────────────────────

def smart_checksum(address: str) -> str:
    if not address:
        return ""
    return Web3.to_checksum_address(address)

def normalize_db_address(address: str) -> str:
    if not address:
        return ""
    return address.lower()

def make_code(k: int = 6) -> str:
    return "".join(random.choices(string.ascii_uppercase + string.digits, k=k))

def checksum(addr: str) -> str:
    return Web3.to_checksum_address(addr) if addr else addr

def generate_unique_id():
    while True:
        num    = str(random.randint(0, 999)).zfill(3)
        new_id = f"FD{num}"
        response = supabase.table("challenge_employees").select("id").eq("id", new_id).execute()
        if not response.data:
            return new_id

# ─── Lifecycle ────────────────────────────────────────────────────────────────

@app.on_event("startup")
async def startup():
    global pool, notif

    db_url = DATABASE_URL
    if db_url.startswith("postgres://"):
        db_url = db_url.replace("postgres://", "postgresql://", 1)

    pool = await asyncpg.create_pool(
        dsn=db_url,
        min_size=5,
        max_size=15,
        statement_cache_size=0,
        ssl="require",
        timeout=30,
        command_timeout=60,
        server_settings={"application_name": "quizhub_backend"},
    )
    notif = NotificationService(pool, notify_conn)
    asyncio.create_task(_nightly_snapshot_loop())
    asyncio.create_task(weekly_leaderboard_reset_loop(pool))
    logger.info("🚀 Quiz Platform Started")

@app.on_event("shutdown")
async def shutdown():
    if pool:
        await pool.close()

# ─── Broadcast ────────────────────────────────────────────────────────────────

async def broadcast(code: str, payload: dict) -> None:
    sockets = connections.get(code, [])
    dead    = []
    for ws in sockets:
        try:
            await ws.send_json(payload)
        except Exception:
            dead.append(ws)
    for ws in dead:
        sockets.remove(ws)

# ─── On-chain helpers ─────────────────────────────────────────────────────────

async def _verify_redeem_tx(
    tx_hash: str,
    expected_wallet: str,
    expected_code: str,
    scan_mode: bool = False,
) -> tuple[bool, float]:
    async with httpx.AsyncClient() as client:

        if scan_mode:
            # Scan the last ~5000 blocks for a matching PointsRedeemed log
            latest_resp = await client.post(CELO_RPC_URL, json={
                "jsonrpc": "2.0", "id": 0,
                "method": "eth_blockNumber", "params": [],
            })
            latest_block = int(latest_resp.json()["result"], 16)
            from_block   = hex(max(0, latest_block - 5000))

            logs_resp = await client.post(CELO_RPC_URL, json={
                "jsonrpc": "2.0", "id": 1,
                "method": "eth_getLogs",
                "params": [{
                    "fromBlock": from_block,
                    "toBlock":   "latest",
                    "address":   DROPS_TOKEN_CONTRACT,
                    "topics":    [
                        DROPS_REDEEM_EVENT_SIG,
                        # topic[1] = indexed wallet address (zero-padded to 32 bytes)
                        "0x" + "0" * 24 + expected_wallet[2:],
                    ],
                }],
            })
            logs = logs_resp.json().get("result", [])

        else:
            r = await client.post(CELO_RPC_URL, json={
                "jsonrpc": "2.0", "id": 1,
                "method": "eth_getTransactionReceipt",
                "params": [tx_hash],
            })
            receipt = r.json().get("result")

            if not receipt or receipt.get("status") != "0x1":
                return False, 0.0
            if receipt.get("to", "").lower() != DROPS_TOKEN_CONTRACT.lower():
                return False, 0.0
            logs = receipt.get("logs", [])

    for log in logs:
        if log["topics"][0].lower() != DROPS_REDEEM_EVENT_SIG.lower():
            continue
        log_user = "0x" + log["topics"][1][-40:]
        if log_user.lower() != expected_wallet.lower():
            continue
        data_hex = log["data"][2:]
        try:
            amount_wei = int(data_hex[:64], 16)
            str_len    = int(data_hex[128:192], 16)
            str_hex    = data_hex[192: 192 + str_len * 2]
            reward_id  = bytes.fromhex(str_hex).decode("utf-8")
        except Exception:
            continue
        if reward_id.upper() != expected_code.upper():
            continue
        return True, amount_wei / (10 ** DROPS_DECIMALS)

    return False, 0.0

async def _call_register_quiz_on_chain(
    code: str, player1: str, player2: str, agreed_stake: float
) -> None:
    from quiz_engine import _build_w3, _get_quiz_id, _QUIZ_HUB_ABI

    def _send() -> str:
        w3, account = _build_w3()
        hub = w3.eth.contract(
            address=Web3.to_checksum_address(QUIZ_HUB_CONTRACT),
            abi=_QUIZ_HUB_ABI,
        )
        quiz_id   = _get_quiz_id(code)
        stake_wei = int(agreed_stake * (10 ** DROPS_DECIMALS))
        p1_cs     = Web3.to_checksum_address(player1)
        p2_cs     = Web3.to_checksum_address(player2)

        tx = hub.functions.registerQuiz(quiz_id, p1_cs, p2_cs, stake_wei).build_transaction({
            "from":  account.address,
            "nonce": w3.eth.get_transaction_count(account.address, "pending"),
            "gas":   150_000,
        })
        signed  = account.sign_transaction(tx)
        tx_hash = w3.eth.send_raw_transaction(signed.raw_transaction)
        receipt = w3.eth.wait_for_transaction_receipt(tx_hash, timeout=60)
        if receipt["status"] != 1:
            raise RuntimeError(f"registerQuiz reverted: {tx_hash.hex()}")
        return tx_hash.hex()

    loop = asyncio.get_event_loop()
    try:
        tx_hash = await loop.run_in_executor(None, _send)
        logger.info("registerQuiz OK  code=%s  tx=%s", code, tx_hash)
    except Exception as e:
        logger.error("registerQuiz FAILED  code=%s  error=%s", code, e)


async def _call_confirm_burn_on_chain(code: str, player_address: str) -> None:
    from quiz_engine import _build_w3, _get_quiz_id, _QUIZ_HUB_ABI

    def _send() -> str:
        w3, account = _build_w3()
        hub = w3.eth.contract(
            address=Web3.to_checksum_address(QUIZ_HUB_CONTRACT),
            abi=_QUIZ_HUB_ABI,
        )
        quiz_id   = _get_quiz_id(code)
        player_cs = Web3.to_checksum_address(player_address)

        tx = hub.functions.confirmBurn(quiz_id, player_cs).build_transaction({
            "from":  account.address,
            "nonce": w3.eth.get_transaction_count(account.address, "pending"),
            "gas":   100_000,
        })
        signed  = account.sign_transaction(tx)
        tx_hash = w3.eth.send_raw_transaction(signed.raw_transaction)
        receipt = w3.eth.wait_for_transaction_receipt(tx_hash, timeout=60)
        if receipt["status"] != 1:
            raise RuntimeError(f"confirmBurn reverted: {tx_hash.hex()}")
        return tx_hash.hex()

    loop = asyncio.get_event_loop()
    try:
        tx_hash = await loop.run_in_executor(None, _send)
        logger.info("confirmBurn OK  code=%s  player=%s  tx=%s", code, player_address, tx_hash)
    except Exception as e:
        logger.error("confirmBurn FAILED  code=%s  player=%s  error=%s", code, player_address, e)

# ─── Player Endpoints ─────────────────────────────────────────────────────────

@app.post("/api/players/register")
async def register_player(wallet: str, username: str):
    wallet = wallet.lower()
    
    # Use supabase user_profiles table instead of challenge_players
    existing = supabase.table("user_profiles").select("*").eq("wallet_address", wallet).execute()
    
    if not existing.data:
        # Auto-generate unique username if taken
        username_check = supabase.table("user_profiles").select("username").eq("username", username).execute()
        final_username = username if not username_check.data else f"{username}_{wallet[-4:]}"
        
        supabase.table("user_profiles").insert({
            "wallet_address": wallet,
            "username": final_username,
            "avatar_url": "",
        }).execute()

    # Still maintain challenge_players for game-specific data (drops, tier, etc.)
    async with pool.acquire() as conn:
        await conn.execute(
            """INSERT INTO challenge_players (wallet_address, username)
               VALUES ($1, $2)
               ON CONFLICT (wallet_address) DO UPDATE SET username=EXCLUDED.username""",
            wallet, username,
        )

    minted = await mint_welcome_drops(pool, wallet)

    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            "SELECT game_drops, reward_drops, drops_minted, tier, rematch_badge FROM challenge_players WHERE wallet_address=$1",
            wallet,
        )

    return {
        "success": True,
        "gameDrops": float(row["game_drops"]),
        "rewardDrops": float(row["reward_drops"]),
        "alreadyMinted": row["drops_minted"],
        "tier": row["tier"],
        "rematchBadge": row["rematch_badge"],
        "welcomeMinted": minted,
    }



# ─── Welcome DROPS: issue claim signature ─────────────────────────────────────
@app.post("/api/drops/buy")
async def buy_drops(body: BuyDropsRequest):
    wallet = body.walletAddress.lower()

    if body.expectedGAmount <= 0:
        raise HTTPException(status_code=400, detail="expectedGAmount must be > 0")
    if not body.gTxHash:
        raise HTTPException(status_code=400, detail="gTxHash required")

    try:
        result = await buy_drops_with_g(
            pool,
            wallet,
            g_tx_hash=body.gTxHash,
            expected_g_amount=body.expectedGAmount,
            drops_amount=body.dropsAmount,   # frontend sends this too
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except RuntimeError as e:
        raise HTTPException(status_code=502, detail=str(e))

    return result

@app.get("/api/drops/welcome-status")
async def welcome_status(wallet: str = Query(...)):
    """
    Lets the frontend check whether the player has already called welcome()
    on-chain, to decide whether to show the claim button.
    Reads directly from the contract — no DB involved.
    """
    from drops_service import _build_w3, _DROPS_TOKEN_ABI

    wallet_cs = Web3.to_checksum_address(wallet.lower())

    def _check() -> bool:
        w3, _ = _build_w3()
        token  = w3.eth.contract(
            address=Web3.to_checksum_address(DROPS_TOKEN_CONTRACT),
            abi=_DROPS_TOKEN_ABI,
        )
        return token.functions.hasClaimedWelcome(wallet_cs).call()

    loop    = asyncio.get_event_loop()
    claimed = await loop.run_in_executor(None, _check)
    return {"success": True, "claimed": claimed}


# ─── Buy DROPS: confirm on-chain claim after user submits tx ──────────────────

@app.post("/api/drops/buy-claimed")
async def confirm_buy_claimed(body: dict):
    """
    Frontend calls this after the claim() tx for a buy purchase confirms.
    Updates challenge_buy_drops_history status from 'pending_claim' → 'confirmed'.
    """
    wallet    = body.get("walletAddress", "").lower()
    g_tx_hash = body.get("gTxHash", "")      # original $G payment tx (used as key)
    mint_hash = body.get("mintTxHash", "")   # the DROP claim() tx hash

    if not wallet or not g_tx_hash:
        raise HTTPException(status_code=400, detail="walletAddress and gTxHash required")

    async with pool.acquire() as conn:
        updated = await conn.execute(
            """UPDATE challenge_buy_drops_history
               SET status='confirmed', mint_tx_hash=$1
               WHERE tx_hash=$2 AND wallet_address=$3""",
            mint_hash, g_tx_hash, wallet,
        )

    if updated == "UPDATE 0":
        raise HTTPException(status_code=404, detail="Buy record not found")

    logger.info("Buy DROPS confirmed  wallet=%s  gTx=%s  mintTx=%s", wallet, g_tx_hash, mint_hash)
    return {"success": True}


# ─── Game-win DROPS signature (for reward_drops credited after a win) ─────────
# Only needed if you also want winners to claim DROP tokens on-chain for game wins.
# reward_drops are currently DB-only; skip this if that's intentional.

@app.post("/api/drops/game-reward-signature")
async def get_game_reward_signature(body: dict):
    """
    After a game win, if you want to let the winner mint their reward_drops
    as actual on-chain DROP tokens, call this endpoint.
    The frontend then calls DropsToken.claim() with the returned payload.
    """
    from drops_service import _sign_claim, CELO_CHAIN_ID, DROPS_DECIMALS

    wallet       = body.get("walletAddress", "").lower()
    drops_amount = float(body.get("dropsAmount", 0))

    if not wallet:
        raise HTTPException(status_code=400, detail="walletAddress required")
    if drops_amount <= 0:
        raise HTTPException(status_code=400, detail="dropsAmount must be > 0")

    wallet_cs = Web3.to_checksum_address(wallet)

    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            "SELECT reward_drops FROM challenge_players WHERE wallet_address=$1", wallet
        )

    if not row:
        raise HTTPException(status_code=404, detail="Player not found")
    if float(row["reward_drops"]) < drops_amount:
        raise HTTPException(
            status_code=400,
            detail=f"Insufficient reward drops. Available: {row['reward_drops']}"
        )

    amount_wei = int(drops_amount * (10 ** DROPS_DECIMALS))
    ts         = int((_time_module.time() // 600) * 600)
    sig        = _sign_claim(wallet_cs, amount_wei, ts, chain_id=CELO_CHAIN_ID)

    # Debit reward_drops now — re-credit if user never submits the tx
    # (or use a pending_signatures table for stricter accounting)
    async with pool.acquire() as conn:
        await conn.execute(
            "UPDATE challenge_players SET reward_drops=reward_drops-$1 WHERE wallet_address=$2",
            drops_amount, wallet,
        )

    return {
        "success":   True,
        "contract":  DROPS_TOKEN_CONTRACT,
        "amount":    str(amount_wei),
        "timestamp": ts,
        "signature": "0x" + sig.hex(),
        "chainId":   CELO_CHAIN_ID,
    }
    
@app.get("/api/players/by-username/{username}")
async def get_player_by_username(username: str):
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            "SELECT wallet_address, username FROM user_profiles WHERE LOWER(username) = LOWER($1)",
            username.strip(),
        )
    if not row:
        raise HTTPException(status_code=404, detail="Player not found")
    return {"success": True, "wallet": row["wallet_address"], "username": row["username"]}


@app.get("/api/players/{wallet}")
async def get_player(wallet: str):
    wallet = wallet.lower()
    
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            "SELECT * FROM challenge_players WHERE wallet_address=$1", wallet
        )
        if not row:
            # Auto-register with a placeholder username
            generated_username = f"User{wallet[-4:].upper()}"
            await conn.execute(
                """INSERT INTO challenge_players (wallet_address, username)
                   VALUES ($1, $2) ON CONFLICT (wallet_address) DO NOTHING""",
                wallet, generated_username,
            )
            row = await conn.fetchrow(
                "SELECT * FROM challenge_players WHERE wallet_address=$1", wallet
            )
    
    if not row:
        raise HTTPException(status_code=404, detail="Player not found")
    
    result = dict(row)
    
    # Overlay username/avatar from shared user_profiles
    profile_res = supabase.table("user_profiles").select("username, avatar_url, bio").eq("wallet_address", wallet).execute()
    if profile_res.data:
        result["username"]   = profile_res.data[0].get("username") or result["username"]
        result["avatar_url"] = profile_res.data[0].get("avatar_url", "")
        result["bio"]        = profile_res.data[0].get("bio", "")
    
    return result
# ─── Challenge Creation ───────────────────────────────────────────────────────

@app.post("/api/challenge/create")
async def create_challenge(body: CreateChallengeRequest):
    if body.stakeAmount < MIN_STAKE_DROPS:
        raise HTTPException(
            status_code=400,
            detail=f"Minimum stake is {MIN_STAKE_DROPS} DROPS."
        )

    code     = make_code()
    topic    = body.topic
    creator  = body.creatorAddress.lower()
    stake    = body.stakeAmount
    chain_id = body.chainId

    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            "SELECT rematch_badge, total_duels FROM challenge_players WHERE wallet_address=$1", creator
        )

    has_badge   = False
    total_duels = 0
    if row:
        total_duels = int(row["total_duels"] or 0)
        has_badge   = row["rematch_badge"]
        if not has_badge:
            if total_duels < BADGE_UNLOCK_DUELS:
                if body.stakeAmount != MIN_STAKE_DROPS:
                    raise HTTPException(
                        status_code=400,
                        detail=f"Play {BADGE_UNLOCK_DUELS - total_duels} more game(s) to unlock custom stakes. "
                               f"Your stake must be exactly {MIN_STAKE_DROPS} DROPS for now."
                    )
            elif body.stakeAmount > PRE_BADGE_MAX_STAKE:
                raise HTTPException(
                    status_code=400,
                    detail=f"Earn the Rematch Badge (play {BADGE_UNLOCK_DUELS} games) "
                           f"to stake more than {PRE_BADGE_MAX_STAKE} DROPS."
                )

    # ── Check creator has enough game_drops to cover the stake ───────────────
    try:
        await check_game_drops_balance(pool, creator, stake)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    questions = await generate_questions(topic, body.questionCount)

    async with pool.acquire() as conn:
        challenge_id = await conn.fetchval(
            """INSERT INTO challenge_games
               (code, creator_address, topic, stake_amount, token_symbol, chain_id,
                status, is_public, rounds_data)
               VALUES ($1,$2,$3,$4,'DROPS',$5,'waiting',$6,$7)
               RETURNING id""",
            code, creator, topic, stake, chain_id,
            body.isPublic, json.dumps(questions),
        )
        await conn.execute(
            """INSERT INTO challenge_players (wallet_address, username)
               VALUES ($1,$2)
               ON CONFLICT (wallet_address) DO UPDATE SET username=EXCLUDED.username""",
            creator, body.creatorUsername,
        )
        await conn.execute(
            """INSERT INTO challenge_game_players (challenge_id, wallet_address, username)
               VALUES ($1,$2,$3)""",
            challenge_id, creator, body.creatorUsername,
        )

    challenges[code] = {
        "id":           str(challenge_id),
        "code":         code,
        "topic":        topic,
        "creator":      creator,
        "creatorName":  body.creatorUsername,
        "stakeAmount":  stake,
        "agreedStake":  None,
        "token":        "DROPS",
        "chainId":      chain_id,
        "status":       "pending",
        "isPublic":     body.isPublic,
        "inviteWallet": body.inviteWallet,
        "rounds":       questions["rounds"],
        "players": {
            creator: {
                "username":   body.creatorUsername,
                "points":     0,
                "ready":      False,
                "txVerified": False,
            }
        },
        "player_offers":    {},
        "onChainConfirmed": False,
    }

    game_state[code] = {"answers": {}, "currentQuestion": None}

    return {
        "success": True,
        "code": code,
        "token": "DROPS",
        "minStake": MIN_STAKE_DROPS,
        "negotiationLocked": not has_badge and total_duels < BADGE_UNLOCK_DUELS,  # ADD
    }

@app.post("/api/challenge/{code}/on-chain-confirmed")
async def on_chain_confirmed(code: str, body: dict):
    code           = code.upper()
    creator_wallet = body.get("creatorWallet", "").lower()
    tx_hash        = body.get("txHash", "")

    if code not in challenges:
        raise HTTPException(status_code=404, detail="Challenge not found")

    challenge = challenges[code]

    if challenge["creator"].lower() != creator_wallet:
        raise HTTPException(status_code=403, detail="Not the creator")

    # Must be pending — not already confirmed or cancelled
    if challenge["status"] != "pending":
        if challenge["status"] == "waiting":
            return {"success": True, "alreadyConfirmed": True}
        raise HTTPException(status_code=400, detail=f"Cannot confirm — status is '{challenge['status']}'")

    # Flip to joinable
    challenge["status"]           = "waiting"
    challenge["onChainConfirmed"] = True
    challenge["txHash"]           = tx_hash

    async with pool.acquire() as conn:
        await conn.execute(
            "UPDATE challenge_games SET status='waiting', tx_hash=$1 WHERE code=$2",
            tx_hash, code,
        )

    # Send notifications now that it's live
    if challenge.get("isPublic"):
        asyncio.create_task(
            notif.notify_public_challenge(
                code,
                challenge["topic"],
                creator_wallet,
                challenge["stakeAmount"],
                challenge["token"],
                creator_username=challenge.get("creatorName", ""),
            )
        )
    elif challenge.get("inviteWallet"):
        asyncio.create_task(
            notif.notify_friend_invite(
                code,
                challenge["topic"],
                challenge.get("creatorName", creator_wallet[:8]),
                challenge["inviteWallet"],
                challenge["stakeAmount"],
                challenge["token"],
            )
        )

    return {"success": True}

# ─── Stake Offer / Negotiation Endpoints ──────────────────────────────────────

@app.post("/api/challenge/{code}/offer")
async def submit_offer(code: str, body: StakeOfferRequest):
    code   = code.upper()
    wallet = body.walletAddress.lower()
    amount = round(float(body.amount), 6)

    if amount < MIN_STAKE_DROPS:
        raise HTTPException(
            status_code=400,
            detail=f"Minimum stake is {MIN_STAKE_DROPS} DROPS. Offered {amount} DROPS."
        )

    if code not in challenges:
        raise HTTPException(status_code=404, detail="Challenge not found")


    challenge = challenges[code]

    # Check challenger's duel count
    async with pool.acquire() as conn:
        challenger_row = await conn.fetchrow(
            "SELECT total_duels FROM challenge_players WHERE wallet_address=$1", wallet
        )
        creator_row = await conn.fetchrow(
            "SELECT total_duels FROM challenge_players WHERE wallet_address=$1", challenge["creator"].lower()
        )

    challenger_duels = int((challenger_row or {}).get("total_duels") or 0)
    creator_duels    = int((creator_row    or {}).get("total_duels") or 0)

    locked_stake = challenge.get("stakeAmount", MIN_STAKE_DROPS)

    if challenger_duels < BADGE_UNLOCK_DUELS or creator_duels < BADGE_UNLOCK_DUELS:
        # Negotiation locked — must use the challenge's fixed stake
        if round(amount, 6) != round(locked_stake, 6):
            raise HTTPException(
                status_code=400,
                detail=f"Stake negotiation is locked until both players have played "
                    f"{BADGE_UNLOCK_DUELS} games. You must join at exactly {locked_stake} DROPS."
            )

    if "player_offers" not in challenge:
        challenge["player_offers"] = {}

    challenge["player_offers"][wallet] = amount

    username = (
        challenge["players"].get(wallet, {}).get("username")
        or getattr(body, "username", None)
        or "Anon"
    )

    await broadcast(code, {
        "type":      "pre_lobby_offer",
        "wallet":    wallet,
        "amount":    amount,
        "username":  username,
        "sentAt":    datetime.utcnow().isoformat(),
        "isCreator": wallet == challenge["creator"].lower(),
    })

    return {"success": True, "amount": amount}


@app.post("/api/challenge/{code}/counter")
async def send_targeted_counter(code: str, body: dict):
    code           = code.upper()
    creator_wallet = body.get("creatorWallet", "").lower()
    creator_name   = body.get("creatorName", "")
    target_wallet  = body.get("targetWallet", "").lower()
    amount         = float(body.get("amount", 0))

    if amount < MIN_STAKE_DROPS:
        raise HTTPException(
            status_code=400,
            detail=f"Minimum stake is {MIN_STAKE_DROPS} DROPS."
        )

    if code not in challenges:
        raise HTTPException(status_code=404, detail="Challenge not found")

    challenge = challenges[code]

    async with pool.acquire() as conn:
        creator_row = await conn.fetchrow(
            "SELECT total_duels FROM challenge_players WHERE wallet_address=$1", creator_wallet
        )
        target_row = await conn.fetchrow(
            "SELECT total_duels FROM challenge_players WHERE wallet_address=$1", target_wallet
        )

    creator_duels = int((creator_row or {}).get("total_duels") or 0)
    target_duels  = int((target_row  or {}).get("total_duels") or 0)

    if creator_duels < BADGE_UNLOCK_DUELS or target_duels < BADGE_UNLOCK_DUELS:
        raise HTTPException(
            status_code=400,
            detail=f"Stake negotiation is locked until both players have played {BADGE_UNLOCK_DUELS} games."
        )

    if challenge["creator"].lower() != creator_wallet:
        raise HTTPException(status_code=403, detail="Only the creator can send counter-offers")
    if target_wallet == creator_wallet:
        raise HTTPException(status_code=400, detail="Cannot counter your own wallet")
    if amount <= 0:
        raise HTTPException(status_code=400, detail="Amount must be positive")

    last_counter_key = f"last_counter_{creator_wallet}_{target_wallet}"
    last_sent = challenge.get(last_counter_key)
    if last_sent:
        elapsed = (datetime.utcnow() - last_sent).total_seconds()
        if elapsed < 10:
            raise HTTPException(
                status_code=429,
                detail=f"Wait {int(10 - elapsed)}s before sending another counter to this player",
            )
    challenge[last_counter_key] = datetime.utcnow()

    if not creator_name:
        creator_name = (
            challenge.get("creatorName")
            or challenge["players"].get(creator_wallet, {}).get("username")
            or creator_wallet[:8]
        )

    await broadcast(code, {
        "type":         "pre_lobby_counter",
        "fromWallet":   creator_wallet,
        "fromName":     creator_name,
        "amount":       amount,
        "sentAt":       datetime.utcnow().isoformat(),
        "targetWallet": target_wallet,
    })

    return {"success": True, "amount": amount, "targetWallet": target_wallet}


@app.post("/api/challenge/{code}/pre-lobby-accept")
async def pre_lobby_accept(code: str, body: dict):
    code              = code.upper()
    creator_wallet    = body.get("creatorWallet", "").lower()
    challenger_wallet = body.get("challengerWallet", "").lower()
    amount            = float(body.get("amount", 0))

    if amount < MIN_STAKE_DROPS:
        raise HTTPException(
            status_code=400,
            detail=f"Minimum stake is {MIN_STAKE_DROPS} DROPS."
        )

    if code not in challenges:
        raise HTTPException(status_code=404, detail="Challenge not found")

    challenge = challenges[code]

    if challenge["creator"].lower() != creator_wallet:
        raise HTTPException(status_code=403, detail="Only the creator can accept")

    if challenge.get("agreedStake") is not None:
        raise HTTPException(status_code=400, detail="Stake already agreed")

    challenge["stakeAmount"] = amount
    challenge["agreedStake"] = amount

    await _persist_agreed_stake(code, amount)

    asyncio.create_task(
        _call_register_quiz_on_chain(code, creator_wallet, challenger_wallet, amount)
    )

    await broadcast(code, {
        "type":       "pre_lobby_accepted",
        "amount":     amount,
        "winner":     challenger_wallet,
        "challenger": challenger_wallet,
        "by":         creator_wallet,
    })

    await broadcast(code, {
        "type":     "burn_now",
        "message":  f"Stake agreed: {amount} DROPS each. Please burn your DROPS now.",
        "amount":   amount,
        "quizCode": code,
    })

    return {"success": True, "amount": amount}


async def _persist_agreed_stake(code: str, amount: float) -> None:
    async with pool.acquire() as conn:
        await conn.execute(
            "UPDATE challenge_games SET stake_amount=$1, token_symbol='DROPS' WHERE code=$2",
            amount, code,
        )

# ─── Confirm Burn ─────────────────────────────────────────────────────────────

@app.post("/api/challenge/{code}/confirm-burn")
async def confirm_burn(code: str, body: dict):
    code    = code.upper()
    wallet  = body.get("walletAddress", "").lower()
    tx_hash = body.get("txHash", "")
    success = body.get("success", False)

    if code not in challenges:
        raise HTTPException(status_code=404, detail="Challenge not found")

    challenge = challenges[code]

    if wallet not in challenge["players"]:
        raise HTTPException(status_code=403, detail="Not a player in this challenge")

    if challenge["players"][wallet].get("txVerified"):
        return {"success": True, "alreadyVerified": True}

    if not success:
        raise HTTPException(
            status_code=400,
            detail="Frontend reported stake transaction as failed."
        )

    # ── Deduct stake from game_drops ─────────────────────────────────────────
    stake_amount = float(challenge.get("agreedStake") or challenge.get("stakeAmount", 0))
    try:
        await deduct_game_drops(pool, wallet, stake_amount, reason=f"stake:game:{code}")
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    challenge["players"][wallet]["txVerified"] = True
    challenge["players"][wallet]["txHash"]     = tx_hash

    async with pool.acquire() as conn:
        await conn.execute(
            """UPDATE challenge_game_players SET tx_hash=$1, tx_verified=TRUE
               WHERE challenge_id=(SELECT id FROM challenge_games WHERE code=$2)
                 AND wallet_address=$3""",
            tx_hash, code, wallet,
        )

    await broadcast(code, {"type": "stake_verified", "wallet": wallet})
    asyncio.create_task(_call_confirm_burn_on_chain(code, wallet))

    return {"success": True}

# ─── Join Challenge ───────────────────────────────────────────────────────────

@app.post("/api/challenge/{code}/join")
async def join_challenge(code: str, body: JoinChallengeRequest):
    code   = code.upper()
    joiner = body.walletAddress.lower()

    if code not in challenges:
        async with pool.acquire() as conn:
            row = await conn.fetchrow("SELECT * FROM challenge_games WHERE code=$1", code)
        if not row:
            raise HTTPException(status_code=404, detail="Challenge not found")

        d           = dict(row)
        rounds_data = d.get("rounds_data") or {}
        if isinstance(rounds_data, str):
            rounds_data = json.loads(rounds_data)

        async with pool.acquire() as conn:
            player_rows = await conn.fetch(
                "SELECT wallet_address, username, tx_verified, ready FROM challenge_game_players WHERE challenge_id=$1",
                d["id"],
            )

        players_dict = {
            r["wallet_address"]: {
                "username":   r["username"],
                "points":     0,
                "ready":      r["ready"],
                "txVerified": r["tx_verified"],
            }
            for r in player_rows
        }

        challenges[code] = {
            "id":          str(d["id"]),
            "code":        code,
            "topic":       d["topic"],
            "creator":     d["creator_address"],
            "creatorName": d.get("creator_name", ""),
            "stakeAmount": float(d["stake_amount"]),
            "agreedStake": float(d["stake_amount"]),
            "token":       d["token_symbol"],
            "chainId":     d["chain_id"],
            "rounds":      rounds_data.get("rounds", []),
            "status":      d["status"],
            "isPublic":    d["is_public"],
            "players":     players_dict,
            "player_offers": {},
        }
        game_state[code] = {"answers": {}}

    challenge = challenges[code]

    if challenge["status"] != "waiting":
        raise HTTPException(status_code=400, detail="Challenge is not open")
    if len(challenge["players"]) >= 2:
        raise HTTPException(status_code=400, detail="Challenge is already full")
    if joiner in challenge["players"]:
        return {"success": True, "challenge": _safe_challenge(challenge)}

    FAKE_HASHES = {"pre-lobby-agreed", "sync-recovery", "auto-sync", "", None}
    tx_verified = body.txHash not in FAKE_HASHES

    async with pool.acquire() as conn:
        await conn.execute(
            """INSERT INTO challenge_players (wallet_address, username, last_seen_at)
               VALUES ($1, $2, NOW())
               ON CONFLICT (wallet_address)
               DO UPDATE SET last_seen_at=NOW()""",
            joiner, body.username,
        )
        await conn.execute(
            """INSERT INTO challenge_game_players
                (challenge_id, wallet_address, username, tx_hash, tx_verified)
               VALUES ((SELECT id FROM challenge_games WHERE code=$1), $2, $3, $4, $5)
               ON CONFLICT (challenge_id, wallet_address)
               DO UPDATE SET tx_hash=$4, tx_verified=$5""",
            code, joiner, body.username, body.txHash, tx_verified,
        )

    challenge["players"][joiner] = {
        "username":   body.username,
        "points":     0,
        "ready":      False,
        "txVerified": tx_verified,
    }

    asyncio.create_task(
        notif.notify_player_joined(code, body.username, challenge["creator"])
    )

    await broadcast(code, {
        "type":   "player_joined",
        "player": {"walletAddress": joiner, "username": body.username},
    })
    await _maybe_auto_start(code)
    return {"success": True, "challenge": _safe_challenge(challenge)}

# ─── Sync Stake ───────────────────────────────────────────────────────────────

@app.post("/api/challenge/{code}/sync-stake")
async def sync_stake(code: str, body: dict):
    code   = code.upper()
    wallet = body.get("walletAddress", "").lower()

    if not wallet:
        raise HTTPException(status_code=400, detail="walletAddress required")

    # Only hydrate if truly missing — never overwrite an already-live challenge
    if code not in challenges:
        async with pool.acquire() as conn:
            row = await conn.fetchrow(
                "SELECT * FROM challenge_games WHERE code=$1", code
            )
        if not row:
            raise HTTPException(status_code=404, detail="Challenge not found")

        d           = dict(row)
        rounds_data = d.get("rounds_data") or {}
        if isinstance(rounds_data, str):
            rounds_data = json.loads(rounds_data)

        async with pool.acquire() as conn:
            player_rows = await conn.fetch(
                """SELECT wallet_address, username, tx_verified, ready
                   FROM challenge_game_players WHERE challenge_id=$1""",
                d["id"],
            )

        challenges[code] = {
            "id":          str(d["id"]),
            "code":        code,
            "topic":       d["topic"],
            "creator":     d["creator_address"],
            "stakeAmount": float(d["stake_amount"]),
            "agreedStake": float(d["stake_amount"]),
            "token":       d["token_symbol"],
            "chainId":     d["chain_id"],
            "rounds":      rounds_data.get("rounds", []),
            "status":      d["status"],
            "isPublic":    d["is_public"],
            "players": {
                r["wallet_address"]: {
                    "username":   r["username"],
                    "points":     0,
                    "ready":      r["ready"],
                    "txVerified": r["tx_verified"],
                }
                for r in player_rows
            },
            "player_offers": {},
        }
        game_state[code] = {"answers": {}}
    else:
        # Challenge already in memory — just make sure this wallet is listed.
        # Re-fetch their individual DB row to pick up any txVerified written
        # by a concurrent confirm-burn, without clobbering the other player.
        challenge = challenges[code]
        if wallet not in challenge["players"]:
            async with pool.acquire() as conn:
                prow = await conn.fetchrow(
                    """SELECT wallet_address, username, tx_verified, ready
                       FROM challenge_game_players
                       WHERE challenge_id = (SELECT id FROM challenge_games WHERE code=$1)
                         AND wallet_address = $2""",
                    code, wallet,
                )
            if prow:
                challenge["players"][wallet] = {
                    "username":   prow["username"],
                    "points":     0,
                    "ready":      prow["ready"],
                    "txVerified": prow["tx_verified"],
                }
        else:
            # Player exists in memory — sync their txVerified from DB
            # without touching other players' state
            async with pool.acquire() as conn:
                prow = await conn.fetchrow(
                    """SELECT tx_verified, ready FROM challenge_game_players
                       WHERE challenge_id = (SELECT id FROM challenge_games WHERE code=$1)
                         AND wallet_address = $2""",
                    code, wallet,
                )
            if prow:
                # Merge: keep True if already set in memory (from confirm-burn)
                challenges[code]["players"][wallet]["txVerified"] = (
                    challenges[code]["players"][wallet].get("txVerified")
                    or prow["tx_verified"]
                )
                challenges[code]["players"][wallet]["ready"] = (
                    challenges[code]["players"][wallet].get("ready")
                    or prow["ready"]
                )

    challenge = challenges[code]

    if wallet not in challenge["players"]:
        raise HTTPException(status_code=403, detail="You are not in this challenge")

    if challenge["players"][wallet].get("txVerified"):
        return {"success": True, "alreadyVerified": True}

    # ── Try 1: QuizHub contract flags ────────────────────────────────────────
    contract_verified = False
    contract_verified = False
    try:
        GET_QUIZ_ABI = [{
            "inputs": [{"internalType": "bytes32", "name": "quizId", "type": "bytes32"}],
            "name":   "getQuiz",
            "outputs": [{
                "components": [
                    {"internalType": "bytes32",  "name": "id",               "type": "bytes32"},
                    {"internalType": "address",  "name": "creator",          "type": "address"},
                    {"internalType": "address",  "name": "player1",          "type": "address"},
                    {"internalType": "address",  "name": "player2",          "type": "address"},
                    {"internalType": "uint256",  "name": "stakePerPlayer",   "type": "uint256"},
                    {"internalType": "uint8",    "name": "status",           "type": "uint8"},
                    {"internalType": "address",  "name": "winner",           "type": "address"},
                    {"internalType": "bool",     "name": "p1BurnConfirmed",  "type": "bool"},
                    {"internalType": "bool",     "name": "p2BurnConfirmed",  "type": "bool"},
                    {"internalType": "uint256",  "name": "createdAt",        "type": "uint256"},
                    {"internalType": "uint256",  "name": "registeredAt",     "type": "uint256"},
                    {"internalType": "uint256",  "name": "startedAt",        "type": "uint256"},
                    {"internalType": "uint256",  "name": "finishedAt",       "type": "uint256"},
                ],
                "internalType": "struct QuizHub.Quiz",
                "name": "",
                "type": "tuple",
            }],
            "stateMutability": "view",
            "type": "function",
        }]

        w3       = Web3(Web3.HTTPProvider(CELO_RPC_URL))
        contract = w3.eth.contract(
            address=Web3.to_checksum_address(CONTRACT_ADDRESS),
            abi=GET_QUIZ_ABI,
        )
        quiz_id_bytes = Web3.keccak(text=code)
        quiz          = contract.functions.getQuiz(quiz_id_bytes).call()
        player1       = quiz[2].lower()
        player2       = quiz[3].lower()

        if wallet == player1:
            contract_verified = quiz[7]   # p1BurnConfirmed
        elif wallet == player2:
            contract_verified = quiz[8]   # p2BurnConfirmed

    except Exception as e:
        logger.warning("sync-stake contract check failed: %s", e)

    if contract_verified:
        logger.info("sync-stake: contract confirmed  code=%s  wallet=%s", code, wallet)
        await _mark_verified_and_broadcast(code, wallet, tx_hash=None, pool=pool)
        return {"success": True, "verified": True, "source": "contract"}

    # ── Try 2: Scan DROPS token logs ─────────────────────────────────────────
    verified, burned_amount = await _verify_redeem_tx(
        tx_hash="",
        expected_wallet=wallet,
        expected_code=code,
        scan_mode=True,
    )

    if not verified:
        return {
            "success": False,
            "verified": False,
            "message": "No DROPS redeem found on-chain for this wallet and quiz code.",
        }

    logger.info(
        "sync-stake: log scan confirmed  code=%s  wallet=%s  burned=%s",
        code, wallet, burned_amount,
    )
    await _mark_verified_and_broadcast(code, wallet, tx_hash=None, pool=pool)
    asyncio.create_task(_call_confirm_burn_on_chain(code, wallet))
    return {"success": True, "verified": True, "source": "log_scan"}

async def _mark_verified_and_broadcast(
    code: str, wallet: str, tx_hash: str | None, pool
) -> None:
    # Deduct stake if not already deducted (sync-stake path)
    challenge    = challenges.get(code, {})
    stake_amount = float(challenge.get("agreedStake") or challenge.get("stakeAmount", 0))
    if stake_amount > 0:
        try:
            await deduct_game_drops(pool, wallet, stake_amount, reason=f"stake:sync:{code}")
        except ValueError as e:
            # Already deducted or insufficient — log and continue
            # (confirm-burn may have already done it)
            logger.warning(
                "_mark_verified_and_broadcast deduct skipped  wallet=%s  code=%s  reason=%s",
                wallet, code, e,
            )

    challenges[code]["players"][wallet]["txVerified"] = True
    if tx_hash:
        challenges[code]["players"][wallet]["txHash"] = tx_hash

    async with pool.acquire() as conn:
        await conn.execute(
            """UPDATE challenge_game_players
               SET tx_verified = TRUE
               {tx_clause}
               WHERE challenge_id = (SELECT id FROM challenge_games WHERE code=$2)
                 AND wallet_address = $3""".format(
                tx_clause=", tx_hash=$1" if tx_hash else ""
            ),
            *([tx_hash, code, wallet] if tx_hash else [code, wallet]),
        )

    await broadcast(code, {"type": "stake_verified", "wallet": wallet})
    
# ─── Challenge Read Endpoints ─────────────────────────────────────────────────

@app.get("/api/challenge/lobby")
async def get_lobby(
    limit:  int = Query(default=20, le=50),
    offset: int = Query(default=0),
):
    async with pool.acquire() as conn:
        rows = await conn.fetch(
            "SELECT * FROM challenge_public_lobby LIMIT $1 OFFSET $2", limit, offset,
        )
    return {"success": True, "challenges": [dict(r) for r in rows]}


@app.get("/api/challenge/{code}")
async def get_challenge(code: str):
    code = code.upper()
    if code in challenges:
        return {"success": True, "challenge": _safe_challenge(challenges[code])}

    async with pool.acquire() as conn:
        row = await conn.fetchrow("SELECT * FROM challenge_games WHERE code=$1", code)
        if not row:
            raise HTTPException(status_code=404, detail="Challenge not found")

        d = dict(row)
        d["stakeAmount"]    = float(d.get("stake_amount", 0))
        d["stake"]          = d["stakeAmount"]
        d["agreedStake"]    = d["stakeAmount"]
        d["token"]          = d.get("token_symbol", "")
        d["chainId"]        = d.get("chain_id")
        d["isPublic"]       = d.get("is_public")
        d["creator"]        = d.get("creator_address", "")
        d["winner_address"] = d.get("winner_address")

        creator_row = await conn.fetchrow(
            "SELECT username FROM challenge_players WHERE wallet_address=$1", d["creator"]
        )
        d["creatorName"] = creator_row["username"] if creator_row else d["creator"][:8]
        
        creator_duels_row = await conn.fetchrow(
            "SELECT total_duels FROM challenge_players WHERE wallet_address=$1", d["creator"]
        )
        creator_duels = int((creator_duels_row or {}).get("total_duels") or 0)
        d["negotiationLocked"] = creator_duels < BADGE_UNLOCK_DUELS
        
        player_rows = await conn.fetch(
            """SELECT wallet_address, username, tx_verified, ready,
                      COALESCE(final_points, 0) AS points
               FROM challenge_game_players WHERE challenge_id=$1""",
            d["id"],
        )
        d["players"] = {
            r["wallet_address"]: {
                "username":   r["username"],
                "points":     r["points"],
                "ready":      r["ready"],
                "txVerified": r["tx_verified"],
            }
            for r in player_rows
        }

    return {"success": True, "challenge": d}

# ─── Drops Endpoints ─────────────────────────────────────────────────────────

@app.get("/api/drops/balance/{wallet}")
async def get_drops_balance(wallet: str):
    wallet = wallet.lower()
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            """SELECT game_drops, reward_drops, tier, rematch_badge,
                      total_duels, drops_minted
               FROM challenge_players WHERE wallet_address=$1""",
            wallet,
        )
        if not row:
            # Auto-register on first balance check
            generated_username = f"User{wallet[-4:].upper()}"
            await conn.execute(
                """INSERT INTO challenge_players (wallet_address, username)
                   VALUES ($1, $2) ON CONFLICT DO NOTHING""",
                wallet, generated_username,
            )
            row = await conn.fetchrow(
                """SELECT game_drops, reward_drops, tier, rematch_badge,
                          total_duels, drops_minted
                   FROM challenge_players WHERE wallet_address=$1""",
                wallet,
            )

    tier_name, apy_pct    = get_tier(int(row["total_duels"] or 0))
    games_until_badge     = max(0, BADGE_UNLOCK_DUELS - int(row["total_duels"] or 0))

    return {
        "success":         True,
        "gameDrops":       float(row["game_drops"] or 0),
        "rewardDrops":     float(row["reward_drops"] or 0),
        "tier":            tier_name,
        "apyPct":          apy_pct,
        "rematchBadge":    row["rematch_badge"] or False,
        "totalDuels":      row["total_duels"] or 0,
        "gamesUntilBadge": games_until_badge,
        "maxStake":        PRE_BADGE_MAX_STAKE if not row["rematch_badge"] else None,
    }

@app.post("/api/drops/redeem")
async def redeem_drops(body: RedeemRequest):
    wallet = body.walletAddress.lower()

    if body.dropsAmount <= 0:
        raise HTTPException(status_code=400, detail="dropsAmount must be > 0")

    try:
        result = await redeem_reward_drops(pool, wallet, body.dropsAmount)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except RuntimeError as e:
        raise HTTPException(status_code=502, detail=str(e))

    return result

@app.post("/api/players/confirm-welcome")
async def confirm_welcome(body: dict):
    wallet   = body.get("walletAddress", "").lower()
    tx_hash  = body.get("txHash", "")

    if not wallet:
        raise HTTPException(status_code=400, detail="walletAddress required")

    async with pool.acquire() as conn:
        await conn.execute(
            """UPDATE challenge_players
               SET drops_minted=TRUE, welcome_tx_hash=$1
               WHERE wallet_address=$2""",
            tx_hash or None, wallet,
        )

    logger.info("welcome confirmed  wallet=%s  tx=%s", wallet, tx_hash)
    return {"success": True}

@app.get("/api/drops/stakes/{wallet}")
async def get_player_stakes(wallet: str):
    stakes = await get_player_stakes_db(pool, wallet)
    return {"success": True, "stakes": stakes}


@app.post("/api/drops/claim-stake")
async def claim_stake(body: ClaimStakeRequest):
    wallet = body.walletAddress.lower()
    try:
        result = await claim_stake_db(pool, wallet, body.stakeId)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    return result


@app.get("/api/drops/redeem-history/{wallet}")
async def redeem_history(wallet: str, limit: int = Query(default=20, le=50)):
    async with pool.acquire() as conn:
        rows = await conn.fetch(
            """SELECT id, drops_burned, g_price_usd, player_g, fee_g, staked_g,
                      stake_pool_id, tx_hash, created_at
               FROM challenge_redeem_history
               WHERE wallet_address=$1
               ORDER BY created_at DESC LIMIT $2""",
            wallet.lower(), limit,
        )
    results = []
    for r in rows:
        d = dict(r)
        d["id"]            = str(d["id"])
        d["stake_pool_id"] = str(d["stake_pool_id"]) if d["stake_pool_id"] else None
        d["created_at"]    = d["created_at"].isoformat()
        results.append(d)
    return {"success": True, "history": results}


@app.get("/api/drops/preview-redeem")
async def preview_redeem(wallet: str, drops: float = Query(gt=0)):
    wallet = wallet.lower()
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            "SELECT total_duels, reward_drops FROM challenge_players WHERE wallet_address=$1", wallet
        )
    if not row:
        raise HTTPException(status_code=404, detail="Player not found")

    from drops_service import _fetch_g_price_usd
    g_price_usd      = await _fetch_g_price_usd()
    usd_value        = drops / 100.0
    player_usd       = usd_value * 0.75
    stake_usd        = usd_value * 0.25
    fee_usd          = player_usd * 0.10
    _, apy_pct       = get_tier(int(row["total_duels"]))
    stake_earned_usd = stake_usd * (apy_pct / 100.0)

    return {
        "success":         True,
        "dropsToRedeem":   drops,
        "availableReward": float(row["reward_drops"]),
        "gPriceUsd":       g_price_usd,
        "playerG":         player_usd / g_price_usd,
        "feeG":            fee_usd    / g_price_usd,
        "stakedG":         stake_usd  / g_price_usd,
        "stakeEarnedG":    stake_earned_usd / g_price_usd,
        "apyPct":          apy_pct,
        "sufficient":      float(row["reward_drops"]) >= drops,
    }

# ─── Claim (winner minting) ───────────────────────────────────────────────────
 
@app.get("/api/challenge/{code}/claim-status/{wallet}")
async def claim_status(code: str, wallet: str):
    """
    Returns the pending claim state for a player in a finished game.
 
    Response:
        {
          "hasClaim": true,
          "claimed": false,
          "dropAmount": 20.0,
          "reason": "tie_refund",   // or "game_win"
          "txHash": null            // set once claimed
        }
 
    If no claim row exists (e.g. player wasn't in the game):
        { "hasClaim": false }
    """
    wallet = wallet.lower()
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            """SELECT drops_amount, reason, claimed, tx_hash
               FROM challenge_pending_claims
               WHERE wallet_address = $1
                 AND game_code      = $2""",
            wallet, code,
        )
 
    if not row:
        return {"hasClaim": False}
 
    return {
        "hasClaim":   True,
        "claimed":    row["claimed"],
        "dropAmount": float(row["drops_amount"]),
        "reason":     row["reason"],
        "txHash":     row["tx_hash"],
    }
 
@app.post("/api/challenge/claim")
async def claim_reward(body: ClaimRequest):
    logger.info("claim_reward body: %s", body.model_dump())
    wallet = (body.wallet or body.walletAddress or "").strip()
    if not wallet:
        raise HTTPException(status_code=400, detail="wallet or walletAddress is required")
    try:
        return await claim_pending_drops(
            pool   = pool,
            wallet = wallet,
            code   = body.code,
            notif  = notif,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except RuntimeError as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/challenge/{wallet}/pending-claims")
async def get_pending_claims(wallet: str):
    async with pool.acquire() as conn:
        rows = await conn.fetch(
            """SELECT code, topic, stake_amount * 2 AS win_amount, token_symbol, chain_id
               FROM challenge_games
               WHERE winner_address=$1 AND claimed=FALSE AND status='finished'""",
            wallet.lower(),
        )
    return {"success": True, "claims": [dict(r) for r in rows]}


@app.get("/api/challenge/{wallet}/history")
async def challenge_history(wallet: str, limit: int = Query(default=10, le=50)):
    async with pool.acquire() as conn:
        rows = await conn.fetch(
            """SELECT g.code, g.topic, g.stake_amount, g.token_symbol,
                      g.status, g.winner_address, g.created_at, g.finished_at
               FROM challenge_games g
               JOIN challenge_game_players cgp ON cgp.challenge_id = g.id
               WHERE cgp.wallet_address=$1
               ORDER BY g.created_at DESC LIMIT $2""",
            wallet.lower(), limit,
        )
    return {"success": True, "history": [dict(r) for r in rows]}

# ─── Rematch Flow ─────────────────────────────────────────────────────────────

@app.post("/api/challenge/{code}/rematch-invite")
async def send_rematch_invite(code: str, body: dict):
    code      = code.upper()
    requester = body.get("requesterWallet", "").lower()

    if not requester:
        raise HTTPException(status_code=400, detail="requesterWallet required")

    if code in challenges:
        c       = challenges[code]
        topic   = c["topic"]
        stake   = c.get("stakeAmount", c.get("stake", 0))
        token   = c["token"]
        players = {w: p["username"] for w, p in c["players"].items()}
    else:
        async with pool.acquire() as conn:
            row = await conn.fetchrow("SELECT * FROM challenge_games WHERE code=$1", code)
        if not row:
            raise HTTPException(status_code=404, detail="Challenge not found")
        d = dict(row)
        topic = d["topic"]
        stake = float(d["stake_amount"])
        token = d["token_symbol"]
        async with pool.acquire() as conn:
            prows = await conn.fetch(
                "SELECT wallet_address, username FROM challenge_game_players WHERE challenge_id=$1",
                d["id"],
            )
        players = {r["wallet_address"]: r["username"] for r in prows}

    if requester not in players:
        raise HTTPException(status_code=403, detail="You were not part of this challenge")

    last_rematch_key = f"last_rematch_{requester}"
    last_sent = challenges.get(code, {}).get(last_rematch_key)
    if last_sent:
        elapsed = (datetime.utcnow() - last_sent).total_seconds()
        if elapsed < 30:
            raise HTTPException(
                status_code=429,
                detail=f"Wait {int(30 - elapsed)}s before sending another rematch invite",
            )
    if code in challenges:
        challenges[code][last_rematch_key] = datetime.utcnow()

    requester_name  = players[requester]
    opponent_wallet = next((w for w in players if w != requester), None)
    if not opponent_wallet:
        raise HTTPException(status_code=400, detail="Cannot find opponent")

    await broadcast(code, {
        "type":            "rematch_invite",
        "originalCode":    code,
        "topic":           topic,
        "stakeAmount":     stake,
        "tokenSymbol":     token,
        "requesterWallet": requester,
        "requesterName":   requester_name,
    })

    async def _rematch_timeout():
        await asyncio.sleep(30)
        already_rematched = any(
            challenges.get(c_code, {}).get("rematch_of") == code
            for c_code in list(challenges)
        )
        if not already_rematched:
            await broadcast(code, {
                "type":            "rematch_timeout",
                "requesterWallet": requester,
                "message":         "Rematch request expired — opponent did not respond.",
            })

    asyncio.create_task(_rematch_timeout())
    return {"success": True, "opponentWallet": opponent_wallet}


@app.post("/api/challenge/{code}/rematch-accept-invite")
async def accept_rematch_invite(code: str, body: dict):
    code             = code.upper()
    acceptor         = body.get("acceptorWallet",  "").lower()
    requester_wallet = body.get("requesterWallet", "").lower()

    if not acceptor or not requester_wallet:
        raise HTTPException(status_code=400, detail="acceptorWallet and requesterWallet required")

    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            "SELECT username FROM challenge_players WHERE wallet_address=$1", acceptor
        )
    acceptor_name = row["username"] if row else f"User{acceptor[-4:].upper()}"

    await broadcast(code, {
        "type":           "rematch_invite_accepted",
        "originalCode":   code,
        "acceptorWallet": acceptor,
        "acceptorName":   acceptor_name,
    })
    return {"success": True}


@app.post("/api/challenge/{code}/rematch")
async def request_rematch(code: str, body: RematachRequest):
    code      = code.upper()
    requester = body.requesterWallet.lower()

    if code in challenges:
        c        = challenges[code]
        topic    = c["topic"]
        stake    = c.get("stakeAmount", c.get("stake", 0))
        token    = c["token"]
        chain_id = c["chainId"]
        orig_id  = c["id"]
        players  = {w: p["username"] for w, p in c["players"].items()}
    else:
        async with pool.acquire() as conn:
            row = await conn.fetchrow("SELECT * FROM challenge_games WHERE code=$1", code)
        if not row:
            raise HTTPException(status_code=404, detail="Original challenge not found")
        d        = dict(row)
        topic    = d["topic"]
        stake    = float(d["stake_amount"])
        token    = d["token_symbol"]
        chain_id = d["chain_id"]
        orig_id  = str(d["id"])
        async with pool.acquire() as conn:
            prows = await conn.fetch(
                "SELECT wallet_address, username FROM challenge_game_players WHERE challenge_id=$1",
                d["id"],
            )
        players = {r["wallet_address"]: r["username"] for r in prows}

    if requester not in players:
        raise HTTPException(status_code=403, detail="You were not part of this challenge")

    requester_username = players[requester]
    opponent_wallet    = next((w for w in players if w != requester), None)
    if not opponent_wallet:
        raise HTTPException(status_code=400, detail="Cannot find opponent")

    questions_data = await generate_questions(topic)
    new_code       = make_code()
    new_id         = str(uuid.uuid4())

    new_challenge = {
        "id":           new_id,
        "code":         new_code,
        "topic":        topic,
        "creator":      requester,
        "creatorName":  requester_username,
        "stakeAmount":  stake,
        "agreedStake":  None,
        "token":        token,
        "chainId":      chain_id,
        "rounds":       questions_data["rounds"],
        "status":       "waiting",
        "isPublic":     False,
        "inviteWallet": opponent_wallet,
        "players": {
            requester: {
                "username":   requester_username,
                "points":     0,
                "ready":      False,
                "txVerified": False,
            }
        },
        "player_offers":    {},
        "onChainConfirmed": False,
        "rematch_of":       code,
    }

    async with pool.acquire() as conn:
        await conn.execute(
            """INSERT INTO challenge_games
               (id, code, creator_address, topic, stake_amount, token_symbol,
                chain_id, status, is_public, rounds_data, rematch_of)
               VALUES ($1,$2,$3,$4,$5,$6,$7,'waiting',FALSE,$8,$9)""",
            new_id, new_code, requester, topic, stake, token,
            chain_id, json.dumps(questions_data), orig_id,
        )
        await conn.execute(
            "INSERT INTO challenge_game_players (challenge_id, wallet_address, username) VALUES ($1,$2,$3)",
            new_id, requester, requester_username,
        )

    challenges[new_code] = new_challenge
    game_state[new_code] = {"answers": {}}

    await broadcast(code, {
        "type":            "rematch_ready",
        "newCode":         new_code,
        "topic":           topic,
        "stakeAmount":     stake,
        "tokenSymbol":     token,
        "requesterWallet": requester,
        "requesterName":   requester_username,
    })
    return {
        "success":        True,
        "newCode":        new_code,
        "opponentWallet": opponent_wallet,
        "challenge":      _safe_challenge(new_challenge),
    }


@app.post("/api/challenge/{code}/rematch-decline")
async def decline_rematch_invite(code: str, body: dict):
    code     = code.upper()
    decliner = body.get("declinerWallet", "").lower()

    if not decliner:
        raise HTTPException(status_code=400, detail="declinerWallet required")

    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            "SELECT username FROM challenge_players WHERE wallet_address=$1", decliner
        )
    decliner_name = row["username"] if row else f"User{decliner[-4:].upper()}"

    await broadcast(code, {
        "type":           "rematch_declined",
        "declinerWallet": decliner,
        "declinerName":   decliner_name,
    })
    return {"success": True}

# ─── Profile Endpoints ────────────────────────────────────────────────────────

_USERNAME_RE = re.compile(r"^[a-zA-Z0-9_]+$")

def _validate_username(username: str) -> Optional[str]:
    if len(username) < 3:
        return "Username must be at least 3 characters"
    if len(username) > 24:
        return "Username must be 24 characters or fewer"
    if not _USERNAME_RE.match(username):
        return "Letters, numbers, and underscores only"
    return None

_PROFILE_COLS = """
    wallet_address,
    username,
    COALESCE(avatar_url, '') AS avatar_url,
    COALESCE(bio,        '') AS bio,
    COALESCE(email,      '') AS email,
    COALESCE(phone,      '') AS phone
"""


@app.get("/api/profile/{wallet}")
async def get_profile_by_wallet(wallet: str):
    wallet = wallet.lower()
    
    # Read from shared user_profiles
    res = supabase.table("user_profiles").select("*").eq("wallet_address", wallet).execute()
    
    if not res.data:
        return {"success": True, "profile": None}
    
    profile = res.data[0]
    
    # Merge game-specific data from challenge_players
    async with pool.acquire() as conn:
        game_row = await conn.fetchrow(
            "SELECT game_drops, reward_drops, tier, rematch_badge, total_duels, total_wins FROM challenge_players WHERE wallet_address=$1",
            wallet,
        )
    
    if game_row:
        profile.update({
            "game_drops": float(game_row["game_drops"] or 0),
            "reward_drops": float(game_row["reward_drops"] or 0),
            "tier": game_row["tier"],
            "rematch_badge": game_row["rematch_badge"],
            "total_duels": game_row["total_duels"],
            "total_wins": game_row["total_wins"],
        })
    
    return {"success": True, "profile": profile}


@app.get("/api/profile/user/{username}")
async def get_profile_by_username(username: str):
    res = supabase.table("user_profiles").select("*").ilike("username", username).execute()
    
    if not res.data:
        return {"success": False, "profile": None}
    
    profile = res.data[0]
    wallet = profile["wallet_address"]
    
    async with pool.acquire() as conn:
        game_row = await conn.fetchrow(
            "SELECT game_drops, reward_drops, tier, rematch_badge, total_duels, total_wins FROM challenge_players WHERE wallet_address=$1",
            wallet,
        )
    
    if game_row:
        profile.update({
            "game_drops": float(game_row["game_drops"] or 0),
            "reward_drops": float(game_row["reward_drops"] or 0),
            "tier": game_row["tier"],
            "rematch_badge": game_row["rematch_badge"],
            "total_duels": game_row["total_duels"],
            "total_wins": game_row["total_wins"],
        })
    
    return {"success": True, "profile": profile}


@app.post("/api/profile/update")
async def update_profile(body: UpdateProfileRequest):
    wallet   = body.wallet_address.lower()
    username = body.username.strip()

    if not wallet:
        raise HTTPException(status_code=400, detail="wallet_address is required")
    if not username:
        raise HTTPException(status_code=400, detail="username is required")

    err = _validate_username(username)
    if err:
        raise HTTPException(status_code=400, detail=err)

    # Check uniqueness against user_profiles
    conflict = supabase.table("user_profiles").select("wallet_address").eq("username", username).neq("wallet_address", wallet).execute()
    if conflict.data:
        raise HTTPException(status_code=409, detail="Username is already taken")

    # Update shared user_profiles
    supabase.table("user_profiles").upsert({
        "wallet_address": wallet,
        "username":       username,
        "avatar_url":     body.avatar_url or "",
        "bio":            body.bio or "",
        "email":          body.email or "",
        "updated_at":     datetime.utcnow().isoformat(),
    }, on_conflict="wallet_address").execute()

    # Also keep challenge_players username in sync
    async with pool.acquire() as conn:
        await conn.execute(
            "UPDATE challenge_players SET username=$1 WHERE wallet_address=$2",
            username, wallet,
        )

    profile = supabase.table("user_profiles").select("*").eq("wallet_address", wallet).execute().data[0]
    return {"success": True, "profile": profile}


@app.post("/api/profile/check-availability")
async def check_availability(body: CheckAvailabilityRequest):
    value  = body.value.strip()
    wallet = body.current_wallet.lower()

    if body.field.lower() != "username":
        return {"available": True, "message": "Available"}

    err = _validate_username(value)
    if err:
        return {"available": False, "message": err}

    # Check against shared user_profiles
    res = supabase.table("user_profiles").select("wallet_address").ilike("username", value).execute()
    if res.data and res.data[0]["wallet_address"].lower() != wallet:
        return {"available": False, "message": "Username is already taken"}
    return {"available": True, "message": "Available"}


@app.post("/api/profile/sync")
async def sync_profile(req: SyncProfileRequest):
    try:
        wallet = req.wallet_address.lower()
        
        existing = supabase.table("user_profiles").select("*").eq("wallet_address", wallet).execute()
        if existing.data:
            return {"success": True, "profile": existing.data[0]}

        username_check = supabase.table("user_profiles").select("username").eq("username", req.username).execute()
        final_username = req.username if not username_check.data else f"{req.username}_{wallet[-4:]}"

        new_profile = {
            "wallet_address": wallet,
            "username":       final_username,
            "avatar_url":     req.avatar_url or "",
            "email":          req.email or "",
        }
        insert_res = supabase.table("user_profiles").insert(new_profile).execute()
        return {"success": True, "profile": insert_res.data[0]}
    except Exception as e:
        return {"success": False, "error": str(e)}
# ─── Ranks ────────────────────────────────────────────────────────────────────

async def _take_rank_snapshot() -> None:
    async with pool.acquire() as conn:
        rows = await conn.fetch(
            """SELECT wallet_address FROM challenge_players
               WHERE COALESCE(total_duels, 0) > 0
               ORDER BY total_wins DESC, total_duels DESC"""
        )
        if not rows:
            return
        today = __import__("datetime").date.today()
        await conn.executemany(
            """INSERT INTO challenge_rank_snapshots (wallet_address, rank_position, snapshotted_at)
               VALUES ($1, $2, $3)
               ON CONFLICT (wallet_address, snapshotted_at) DO UPDATE
                   SET rank_position = EXCLUDED.rank_position""",
            [(row["wallet_address"], idx + 1, today) for idx, row in enumerate(rows)],
        )
    logger.info("Rank snapshot taken — %d players", len(rows))


async def _nightly_snapshot_loop() -> None:
    import datetime as dt
    while True:
        now      = dt.datetime.utcnow()
        tomorrow = (now + dt.timedelta(days=1)).replace(hour=0, minute=0, second=5, microsecond=0)
        await asyncio.sleep((tomorrow - now).total_seconds())
        try:
            await _take_rank_snapshot()
        except Exception as e:
            logger.error("Nightly snapshot failed: %s", e)


@app.get("/api/ranks")
async def get_ranks(limit: int = Query(default=100, le=200), weekly: bool = Query(default=False)):
    import datetime as dt

    async with pool.acquire() as conn:
        if weekly:
            rows = await conn.fetch(
                """SELECT p.wallet_address, p.tier,
                          COALESCE(p.weekly_wins, 0)  AS weekly_wins,
                          COALESCE(p.weekly_duels, 0) AS weekly_duels
                   FROM challenge_players p
                   WHERE COALESCE(p.weekly_duels, 0) > 0
                   ORDER BY p.weekly_wins DESC, p.weekly_duels DESC
                   LIMIT $1""",
                limit,
            )
        else:
            yesterday = dt.date.today() - dt.timedelta(days=1)
            rows = await conn.fetch(
                """SELECT p.wallet_address, p.tier,
                          COALESCE(p.total_wins,   0)   AS total_wins,
                          COALESCE(p.total_duels,  0)   AS total_duels,
                          COALESCE(p.total_earned, 0.0) AS total_earned,
                          ys.rank_position               AS yesterday_rank
                   FROM challenge_players p
                   LEFT JOIN challenge_rank_snapshots ys
                       ON ys.wallet_address = p.wallet_address
                      AND ys.snapshotted_at = $1
                   WHERE COALESCE(p.total_duels, 0) > 0
                   ORDER BY p.total_wins DESC, p.total_duels DESC
                   LIMIT $2""",
                yesterday, limit,
            )

    # Batch fetch profiles from user_profiles for display names/avatars
    wallets = [r["wallet_address"] for r in rows]
    profiles_map = {}
    if wallets:
        profiles_res = supabase.table("user_profiles").select("wallet_address, username, avatar_url").in_("wallet_address", wallets).execute()
        profiles_map = {p["wallet_address"]: p for p in (profiles_res.data or [])}

    players = []
    for rank, row in enumerate(rows, start=1):
        d = dict(row)
        wallet = d["wallet_address"]
        profile = profiles_map.get(wallet, {})
        
        d["username"]   = profile.get("username")   or f"User{wallet[-4:].upper()}"
        d["avatar_url"] = profile.get("avatar_url") or ""
        d["rank"]       = rank
        
        if not weekly:
            yesterday_pos = d.pop("yesterday_rank", None)
            d["rank_delta"] = 0 if yesterday_pos is None else (yesterday_pos - rank)
        
        players.append(d)

    return {"success": True, "players": players, "weekly": weekly}

@app.get("/api/ranks/weekly-history")
async def get_weekly_leaderboard_history(limit: int = Query(default=10, le=50)):
    async with pool.acquire() as conn:
        rows = await conn.fetch(
            """SELECT week_start, wallet_address, username, weekly_wins, weekly_duels, rank_position
               FROM challenge_weekly_leaderboard
               ORDER BY week_start DESC, rank_position ASC
               LIMIT $1""",
            limit,
        )
    results = []
    for r in rows:
        d = dict(r)
        d["week_start"] = d["week_start"].isoformat()
        results.append(d)
    return {"success": True, "history": results}


@app.post("/api/ranks/snapshot")
async def trigger_snapshot():
    await _take_rank_snapshot()
    return {"success": True, "message": "Snapshot taken"}

# ─── Notification Endpoints ───────────────────────────────────────────────────

@app.get("/api/notifications/{wallet}")
async def get_notifications(wallet: str, limit: int = Query(default=20, le=50)):
    items = await notif.get_unread(wallet, limit)
    return {"success": True, "notifications": items}


@app.get("/api/notifications/{wallet}/count")
async def get_unread_count(wallet: str):
    count = await notif.unread_count(wallet)
    return {"success": True, "unread": count}


@app.post("/api/notifications/{wallet}/read/{notif_id}")
async def mark_read(wallet: str, notif_id: str):
    await notif.mark_read(wallet, notif_id)
    return {"success": True}


@app.post("/api/notifications/{wallet}/read-all")
async def mark_all_read(wallet: str):
    await notif.mark_all_read(wallet)
    return {"success": True}

# ─── Employee Endpoints ───────────────────────────────────────────────────────

@app.post("/register", response_model=Employee)
async def register_employee(
    name:  str        = Form(...),
    role:  str        = Form(...),
    photo: UploadFile = File(None),
):
    emp_id      = generate_unique_id()
    issue_date  = datetime.now()
    expiry_date = issue_date + timedelta(days=365 * 7)
    photo_url   = None

    if photo and photo.filename:
        try:
            file_ext = photo.filename.split(".")[-1].lower()
            allowed  = {"jpg", "jpeg", "png", "webp", "gif"}
            if file_ext not in allowed:
                raise HTTPException(status_code=400, detail="Invalid image format.")
            file_bytes   = await photo.read()
            storage_path = f"{emp_id}/{uuid.uuid4()}.{file_ext}"
            supabase.storage.from_(STORAGE_BUCKET).upload(
                storage_path, file_bytes,
                {"content-type": photo.content_type or f"image/{file_ext}"},
            )
            photo_url = supabase.storage.from_(STORAGE_BUCKET).get_public_url(storage_path)
        except HTTPException:
            raise
        except Exception as e:
            logger.warning("Photo upload failed: %s", e)

    employee_data = {
        "id":          emp_id,
        "name":        name,
        "role":        role,
        "issue_date":  issue_date.strftime("%d/%m/%Y"),
        "expiry_date": expiry_date.strftime("%d/%m/%Y"),
        "photo_url":   photo_url,
    }
    try:
        response = supabase.table("challenge_employees").insert(employee_data).execute()
        return response.data[0]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@app.post("/api/challenge/{code}/cancel")
async def cancel_challenge(code: str, body: dict):
    code           = code.upper()
    creator_wallet = body.get("creatorWallet", "").lower()
    reason         = body.get("reason", "cancelled")

    challenge = challenges.get(code)

    if not challenge:
        async with pool.acquire() as conn:
            row = await conn.fetchrow(
                "SELECT creator_address, status FROM challenge_games WHERE code=$1", code
            )
        if not row:
            return {"success": True}
        if row["creator_address"].lower() != creator_wallet:
            raise HTTPException(status_code=403, detail="Not the creator")
        if row["status"] not in ("pending",):
            return {"success": True, "message": "Not cancellable"}
    else:
        if challenge["creator"].lower() != creator_wallet:
            raise HTTPException(status_code=403, detail="Not the creator")
        if challenge["status"] != "pending":
            return {"success": True, "message": "Not cancellable"}
        challenges.pop(code, None)
        game_state.pop(code, None)

    async with pool.acquire() as conn:
        await conn.execute(
            "UPDATE challenge_games SET status='cancelled', cancel_reason=$1 WHERE code=$2",
            reason, code,
        )

    logger.info("Challenge cancelled  code=%s  reason=%s", code, reason)
    return {"success": True}

@app.post("/verify")
def verify_employee(qr_data: VerifyRequest):
    try:
        response = supabase.table("challenge_employees").select("*").eq("id", qr_data.id).execute()
        if not response.data:
            return {"valid": False, "employee": None}
        emp_record = response.data[0]
        is_valid = (emp_record["name"] == qr_data.name and emp_record["role"] == qr_data.role)
        return {"valid": is_valid, "employee": emp_record if is_valid else None}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

# ─── WebSocket: Game ──────────────────────────────────────────────────────────

@app.websocket("/ws/presence")
async def presence_socket(ws: WebSocket):
    await ws.accept()
    presence_sockets.append(ws)
    await ws.send_json({"type": "presence", "online": list(presence_wallets)})

    wallet = None
    try:
        async for msg in ws.iter_json():
            if msg.get("type") == "ping":
                # Respond to keepalive — prevents idle timeout
                await ws.send_json({"type": "pong"})
            elif msg.get("type") == "hello" and msg.get("wallet"):
                wallet = msg["wallet"].lower()
                presence_wallets.add(wallet)
                await _broadcast_presence()
    except WebSocketDisconnect:
        pass
    finally:
        # FIX: lists don't have .discard() — use plain remove
        if ws in presence_sockets:
            presence_sockets.remove(ws)
        if wallet and wallet in presence_wallets:
            presence_wallets.discard(wallet)
            await _broadcast_presence()
            
@app.websocket("/ws/challenge/{code}")
async def challenge_socket(ws: WebSocket, code: str):
    import time as _time
 
    code = code.upper()
    await ws.accept()
    connections.setdefault(code, []).append(ws)
    connected_wallet = None
 
    if code in challenges:
        await ws.send_json({
            "type":      "state_sync",
            "challenge": _safe_challenge(challenges[code]),
        })
 
        # FIX 5: snapshot existing pre-lobby offers to the newly connected client
        # so they don't need to wait for the next offer broadcast to see who's waiting.
        challenge = challenges[code]
        if challenge.get("status") == "waiting" and challenge.get("player_offers"):
            snapshot_offers = []
            for wallet, amount in challenge["player_offers"].items():
                player_info = challenge["players"].get(wallet, {})
                snapshot_offers.append({
                    "wallet":   wallet,
                    "username": player_info.get("username", wallet[:8]),
                    "amount":   amount,
                    "sentAt":   challenge.get(f"offer_time_{wallet}",
                                              __import__("datetime").datetime.utcnow().isoformat()),
                })
            # Sort descending by amount to match frontend sort order
            snapshot_offers.sort(key=lambda o: o["amount"], reverse=True)
            await ws.send_json({
                "type":   "pre_lobby_offers_snapshot",
                "offers": snapshot_offers,
            })
 
    try:
        async for msg in ws.iter_json():
            m_type = msg.get("type")
            wallet = msg.get("walletAddress", "").lower()
 
            if wallet and not connected_wallet:
                connected_wallet = wallet
 
            if wallet and wallet in (challenges.get(code, {}).get("players") or {}):
                if game_state.get(code):
                    game_state[code].pop(f"disconnected_{wallet}", None)
                    game_state[code][f"reconnected_{wallet}"] = True
 
            if m_type == "rejoin":
                if code in challenges and code in game_state:
                    challenge = challenges[code]
                    gs        = game_state[code]
                    if challenge.get("status") == "active":
                        current_q = gs.get("currentQuestion")
                        if current_q:
                            elapsed_ms = int(_time.time() * 1000) - current_q["startedAt"]
                            time_limit = current_q["data"]["timeLimit"]
                            time_left  = max(0, time_limit - elapsed_ms / 1000)
                            if time_left > 0:
                                await ws.send_json({
                                    "type":           "question",
                                    "roundIndex":     current_q["roundIndex"],
                                    "questionIndex":  current_q["questionIndex"],
                                    "totalQuestions": current_q["totalQuestions"],
                                    "round":          current_q["roundName"],
                                    "startedAt":      current_q["startedAt"],
                                    "data": {
                                        "question":  current_q["data"]["question"],
                                        "options":   current_q["data"]["options"],
                                        "timeLimit": time_limit,
                                    },
                                })
                            else:
                                await ws.send_json({
                                    "type":      "state_sync",
                                    "challenge": _safe_challenge(challenge),
                                    "totalScores": {
                                        w: p["points"]
                                        for w, p in challenge["players"].items()
                                    },
                                })
                        else:
                            await ws.send_json({
                                "type":      "state_sync",
                                "challenge": _safe_challenge(challenge),
                                "totalScores": {
                                    w: p["points"]
                                    for w, p in challenge["players"].items()
                                },
                            })
 
            elif m_type == "stake_confirmed":
                await _handle_stake_confirmed(code, wallet, msg.get("txHash", ""))
            elif m_type == "ready":
                await _handle_ready(code, wallet)
            elif m_type == "submit_answer":
                _handle_submit_answer(code, wallet, msg)
            elif m_type == "chat":
                await broadcast(code, {
                    "type":      "chat",
                    "sender":    msg.get("username"),
                    "wallet":    wallet,
                    "text":      msg.get("text"),
                    "timestamp": asyncio.get_event_loop().time(),
                })
 
    except WebSocketDisconnect:
        sockets = connections.get(code, [])
        if ws in sockets:
            sockets.remove(ws)
 
        if connected_wallet and code in challenges:
            challenge = challenges[code]
            player    = challenge["players"].get(connected_wallet, {})
            username  = player.get("username") or f"User{connected_wallet[-4:].upper()}"
 
            await broadcast(code, {
                "type":         "player_left",
                "wallet":       connected_wallet,
                "username":     username,
                "message":      f"{username} has left the game.",
                "isActiveGame": challenge.get("status") == "active",
            })
 
            if challenge.get("status") == "active":
                asyncio.create_task(
                    _disconnect_grace(code, connected_wallet, username)
                )
 
 
# ─── Also update submit_offer to record the offer timestamp ──────────────────
# This gives the snapshot something to read for sentAt.
# Replace the existing submit_offer endpoint body with this version:
 
@app.post("/api/challenge/{code}/offer")
async def submit_offer(code: str, body: StakeOfferRequest):
    code   = code.upper()
    wallet = body.walletAddress.lower()
    amount = round(float(body.amount), 6)
 
    if amount < MIN_STAKE_DROPS:
        raise HTTPException(
            status_code=400,
            detail=f"Minimum stake is {MIN_STAKE_DROPS} DROPS. Offered {amount} DROPS."
        )
 
    if code not in challenges:
        raise HTTPException(status_code=404, detail="Challenge not found")
 
    challenge = challenges[code]
 
    if "player_offers" not in challenge:
        challenge["player_offers"] = {}
 
    challenge["player_offers"][wallet] = amount
 
    # FIX 5 (companion): store the offer timestamp so the snapshot can echo it
    sent_at = datetime.utcnow().isoformat()
    challenge[f"offer_time_{wallet}"] = sent_at
 
    username = (
        challenge["players"].get(wallet, {}).get("username")
        or getattr(body, "username", None)
        or "Anon"
    )
 
    await broadcast(code, {
        "type":      "pre_lobby_offer",
        "wallet":    wallet,
        "amount":    amount,
        "username":  username,
        "sentAt":    sent_at,
        "isCreator": wallet == challenge["creator"].lower(),
    })
 
    return {"success": True, "amount": amount}
 
# ─── Disconnect Grace ─────────────────────────────────────────────────────────

GRACE_SECONDS = 60

async def _disconnect_grace(code: str, wallet: str, username: str) -> None:
    if game_state.get(code):
        game_state[code][f"disconnected_{wallet}"] = True

    for elapsed in range(GRACE_SECONDS):
        await asyncio.sleep(1)

        if game_state.get(code, {}).get(f"reconnected_{wallet}"):
            game_state[code].pop(f"reconnected_{wallet}", None)
            game_state[code].pop(f"disconnected_{wallet}", None)
            await broadcast(code, {"type": "player_rejoined", "wallet": wallet, "username": username})
            return

        if code not in challenges or challenges[code].get("status") != "active":
            return

        seconds_left = GRACE_SECONDS - elapsed - 1
        if seconds_left % 10 == 0 or seconds_left <= 5:
            await broadcast(code, {
                "type":        "reconnect_countdown",
                "wallet":      wallet,
                "username":    username,
                "secondsLeft": seconds_left,
            })

    if code not in challenges or challenges[code].get("status") != "active":
        return

    challenge = challenges[code]
    players   = challenge["players"]
    winner    = next((w for w in players if w.lower() != wallet.lower()), None)
    if not winner:
        return

    challenge["status"] = "finished"
    challenge["winner"] = winner
    await _mark_finished(pool, code, winner)

    stake = float(challenge.get("stakeAmount", challenge.get("stake", 0)))
    asyncio.create_task(_set_winner_on_chain(code, winner, stake))

    await notif.notify_game_over(code, winner, wallet, stake, "DROPS")
    await broadcast(code, {
        "type":        "game_over",
        "outcome":     "winner",
        "winner":      winner,
        "reason":      "forfeit",
        "forfeitedBy": wallet,
        "finalScores": {
            w: {"username": p["username"], "points": p["points"]}
            for w, p in players.items()
        },
        "canRematch": True,
    })
    logger.info("Forfeit: %s disconnected, %s wins  code=%s", wallet, winner, code)

# ─── WS Helpers ───────────────────────────────────────────────────────────────

async def _handle_stake_confirmed(code: str, wallet: str, tx_hash: str) -> None:
    if code not in challenges:
        return

    challenge = challenges[code]

    if wallet not in challenge["players"]:
        return

    if challenge["players"][wallet].get("txVerified"):
        await broadcast(code, {"type": "stake_verified", "wallet": wallet})
        return

    FAKE_HASHES = {"auto-sync", "sync-recovery", "pre-lobby-agreed", "", None}
    if tx_hash in FAKE_HASHES:
        logger.info("Ignoring fake tx_hash '%s' for %s — use /sync-stake", tx_hash, wallet)
        return

    logger.info(
        "stake_confirmed WS received for %s code=%s — full verify via /confirm-burn",
        wallet, code
    )


async def _handle_ready(code: str, wallet: str) -> None:
    if code not in challenges or wallet not in challenges[code]["players"]:
        return
    challenge = challenges[code]
    if not challenge["players"][wallet].get("txVerified"):
        return
    challenge["players"][wallet]["ready"] = True
    await broadcast(code, {"type": "player_ready", "wallet": wallet})
    await _maybe_auto_start(code)


def _handle_submit_answer(code: str, wallet: str, msg: dict) -> None:
    if code not in game_state:
        return
    r_idx = msg.get("roundIndex")
    q_idx = msg.get("questionIndex")
    key   = f"{r_idx}_{q_idx}"
    state = game_state[code]

    if key not in state["answers"]:
        state["answers"][key] = {}

    state["answers"][key][wallet] = {
        "answerId":  msg.get("answerId"),
        "timeTaken": msg.get("timeTaken", 0),
    }

async def _run_game_loop_safe(code: str) -> None:
    try:
        await run_game_loop(code, challenges, game_state, pool, broadcast, notif)
    except Exception as e:
        logger.error("run_game_loop CRASHED  code=%s  error=%s", code, e, exc_info=True)
        await broadcast(code, {"type": "error", "message": "Game loop crashed. Please refresh."})


async def _maybe_auto_start(code: str) -> None:
    if code not in challenges:
        return
    c = challenges[code]
    if (
        len(c["players"]) == 2
        and all(p.get("txVerified") for p in c["players"].values())
        and all(p.get("ready")      for p in c["players"].values())
        and c["status"] == "waiting"
    ):
        
        logger.info(
            "auto-start triggered  code=%s  players=%s",
            code, list(c["players"].keys()),
        )
        wallets = list(c["players"].keys())
        asyncio.create_task(notif.notify_game_starting(code, wallets))
        asyncio.create_task(
            _run_game_loop_safe(code)  # wrapped version below
        )


# ─── WebSocket: Notifications ─────────────────────────────────────────────────

@app.websocket("/ws/notify/{wallet}")
async def notify_socket(ws: WebSocket, wallet: str):
    wallet = wallet.lower()
    await ws.accept()
    notify_conn.setdefault(wallet, []).append(ws)

    try:
        async with pool.acquire() as conn:
            await conn.execute(
                "UPDATE challenge_players SET last_seen_at=NOW() WHERE wallet_address=$1", wallet,
            )
    except Exception as e:
        logger.warning("Could not update last_seen_at for %s: %s", wallet, e)

    try:
        count = await notif.unread_count(wallet)
        await ws.send_json({"type": "unread_count", "count": count})
    except Exception:
        sockets = notify_conn.get(wallet, [])
        if ws in sockets:
            sockets.remove(ws)
        return

    try:
        while True:
            await ws.receive_text()
    except WebSocketDisconnect:
        sockets = notify_conn.get(wallet, [])
        if ws in sockets:
            sockets.remove(ws)
        if not sockets:
            notify_conn.pop(wallet, None)

# ─── Presence ─────────────────────────────────────────────────────────────────

presence_wallets: set[str] = set()
presence_sockets: list[WebSocket] = []

async def _broadcast_presence() -> None:
    online = list(presence_wallets)
    dead   = []
    for ws in presence_sockets:
        try:
            await ws.send_json({"type": "presence", "online": online})
        except Exception:
            dead.append(ws)
    for ws in dead:
        presence_sockets.remove(ws)


@app.websocket("/ws/presence")
async def presence_socket(ws: WebSocket):
    await ws.accept()
    presence_sockets.append(ws)
    await ws.send_json({"type": "presence", "online": list(presence_wallets)})

    wallet = None
    try:
        async for msg in ws.iter_json():
            if msg.get("type") == "hello" and msg.get("wallet"):
                wallet = msg["wallet"].lower()
                presence_wallets.add(wallet)
                await _broadcast_presence()
    except WebSocketDisconnect:
        pass
    finally:
        presence_sockets.discard(ws) if hasattr(presence_sockets, "discard") else (
            presence_sockets.remove(ws) if ws in presence_sockets else None
        )
        if wallet and wallet in presence_wallets:
            presence_wallets.discard(wallet)
            await _broadcast_presence()

# ─── Internal helpers ─────────────────────────────────────────────────────────

def _safe_challenge(c: dict) -> dict:
    import copy
    safe = copy.deepcopy(c)
    safe["player_offers"] = c.get("player_offers", {})
    safe_rounds = strip_answers({"rounds": safe.get("rounds", [])})
    safe["rounds"] = safe_rounds["rounds"]
    if "agreedStake" not in safe:
        safe["agreedStake"] = None
    if "stakeAmount" not in safe and "stake" in safe:
        safe["stakeAmount"] = safe["stake"]
    if "stake" not in safe:
        safe["stake"] = safe.get("stakeAmount") or 0
    # ADD:
    safe.setdefault("negotiationLocked", c.get("negotiationLocked", False))
    return safe

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=10000, reload=True)