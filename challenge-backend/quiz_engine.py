"""
quiz_engine.py
──────────────
Self-contained quiz logic: AI question generation, the async game loop,
and per-question scoring.

Token model (DROPS only)
─────────────────────────
  Stake  → player calls DropsToken.redeem(amount, quizCode)  [burns DROPS]
  Win    → backend calls DropsToken.claim(winner, amount*2, sig) [mints DROPS]
  Tie    → backend calls DropsToken.claim(each,   amount,   sig) [mints each]

On-chain resolution via QuizHub (activity ledger only, holds no tokens):
  Winner found → setWinner(quizId, winnerAddress)
  Tie          → declareTie(quizId)
Then immediately mint via DropsToken.claim().

Required env vars:
  RESOLVER_PRIVATE_KEY   — private key of the wallet set as `resolver` on QuizHub
  QUIZ_HUB_CONTRACT      — deployed QuizHub address
  DROPS_TOKEN_CONTRACT   — deployed DROPS token address
  CELO_RPC_URL           — defaults to https://forno.celo.org
"""
from __future__ import annotations
import os, json, asyncio, logging
from typing import Dict, Callable, Awaitable

import httpx
import asyncpg
from web3 import Web3
from eth_account import Account
from eth_account.messages import encode_defunct

from notifications import NotificationService

from drops_service import (
    credit_game_reward, credit_tie_refund, record_matchup,
    increment_weekly_stats
)

logger = logging.getLogger(__name__)

# ─── Gemini / Groq config ─────────────────────────────────────────────────────

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
GEMINI_URL = (
    "https://generativelanguage.googleapis.com/v1beta"
    "/models/gemini-2.5-flash:generateContent"
)
GROQ_API_KEY = os.getenv("GROQ_API_KEY")
GROQ_URL     = "https://api.groq.com/openai/v1/chat/completions"
GROQ_MODEL   = "llama-3.3-70b-versatile"

# ─── On-chain config ──────────────────────────────────────────────────────────

RESOLVER_PRIVATE_KEY  = os.getenv("RESOLVER_PRIVATE_KEY", "")
QUIZ_HUB_CONTRACT     = os.getenv("QUIZ_HUB_CONTRACT", "")
DROPS_TOKEN_CONTRACT  = os.getenv("DROPS_TOKEN_CONTRACT", "")
CELO_RPC_URL          = os.getenv("CELO_RPC_URL", "https://forno.celo.org")

DROPS_DECIMALS = 18

# ── QuizHub — resolver functions only ────────────────────────────────────────
_QUIZ_HUB_ABI = [
    {
        "inputs": [
            {"internalType": "bytes32", "name": "quizId",  "type": "bytes32"},
            {"internalType": "address", "name": "winner",  "type": "address"},
        ],
        "name": "setWinner",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function",
    },
    {
        "inputs": [
            {"internalType": "bytes32", "name": "quizId", "type": "bytes32"},
        ],
        "name": "declareTie",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function",
    },
    {
        "inputs": [
            {"internalType": "bytes32", "name": "quizId",  "type": "bytes32"},
            {"internalType": "address", "name": "player",  "type": "address"},
        ],
        "name": "confirmBurn",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function",
    },
    {
        "inputs": [
            {"internalType": "bytes32", "name": "quizId",         "type": "bytes32"},
            {"internalType": "address", "name": "player1",        "type": "address"},
            {"internalType": "address", "name": "player2",        "type": "address"},
            {"internalType": "uint256", "name": "stakePerPlayer", "type": "uint256"},
        ],
        "name": "registerQuiz",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function",
    },
]

# ── DropsToken — claim (mint) function only ───────────────────────────────────
_DROPS_CLAIM_ABI = [
    {
        "inputs": [
            {"internalType": "uint256", "name": "amount",    "type": "uint256"},
            {"internalType": "uint256", "name": "timestamp", "type": "uint256"},
            {"internalType": "bytes",   "name": "signature", "type": "bytes"},
        ],
        "name": "claim",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function",
    },
]

# ─── Round config ─────────────────────────────────────────────────────────────

ROUND_CONFIG = [
    {"type": "easy",   "timeLimit": 7},
    {"type": "medium", "timeLimit": 10},
    {"type": "hard",   "timeLimit": 13},
]

BASE_POINTS = 500
SPEED_BONUS = 500


# ─── AI Question Generation ───────────────────────────────────────────────────

async def _call_gemini(prompt: str) -> dict:
    async with httpx.AsyncClient(timeout=60) as client:
        resp = await client.post(
            f"{GEMINI_URL}?key={GEMINI_API_KEY}",
            json={
                "contents": [{"parts": [{"text": prompt}]}],
                "generationConfig": {"responseMimeType": "application/json"},
            },
        )
        resp.raise_for_status()
        raw  = resp.json()
        text = raw["candidates"][0]["content"]["parts"][0]["text"]
        return json.loads(text)


async def _call_groq(prompt: str) -> dict:
    async with httpx.AsyncClient(timeout=60) as client:
        resp = await client.post(
            GROQ_URL,
            headers={
                "Authorization": f"Bearer {GROQ_API_KEY}",
                "Content-Type":  "application/json",
            },
            json={
                "model": GROQ_MODEL,
                "messages": [
                    {
                        "role":    "system",
                        "content": "You are a quiz generator. Return ONLY valid JSON, no markdown fences.",
                    },
                    {"role": "user", "content": prompt},
                ],
                "temperature": 0.7,
            },
        )
        resp.raise_for_status()
        raw  = resp.json()
        text = raw["choices"][0]["message"]["content"]
        text = text.strip().removeprefix("```json").removeprefix("```").removesuffix("```").strip()
        return json.loads(text)


async def generate_questions(topic: str, total_count: int = 15) -> dict:
    per_round = total_count // 3
    prompt = f"""
Generate a 1v1 quiz challenge about "{topic}".
Create exactly {total_count} multiple-choice questions divided into 3 rounds:
- Round 1 (Easy):   {per_round} questions — straightforward recall.
- Round 2 (Medium): {per_round} questions — requires understanding.
- Round 3 (Hard):   {per_round} questions — tricky, nuanced, or analytical.

Return ONLY valid JSON:
{{
  "rounds": [
    {{ "type": "easy",   "timeLimit": 7,  "questions": [ ... ] }},
    {{ "type": "medium", "timeLimit": 10, "questions": [ ... ] }},
    {{ "type": "hard",   "timeLimit": 13, "questions": [ ... ] }}
  ]
}}
Each question object:
{{
  "question": "Question text?",
  "options":  [ {{"id":"A","text":"..."}}, {{"id":"B","text":"..."}},
                {{"id":"C","text":"..."}}, {{"id":"D","text":"..."}} ],
  "correctId": "A"
}}
"""
    data = None
    if GEMINI_API_KEY:
        try:
            logger.info("generate_questions: trying Gemini...")
            data = await _call_gemini(prompt)
            logger.info("generate_questions: Gemini succeeded.")
        except Exception as e:
            logger.warning("Gemini failed (%s), falling back to Groq.", e)

    if data is None:
        if not GROQ_API_KEY:
            raise RuntimeError("Gemini unavailable and GROQ_API_KEY not set.")
        try:
            logger.info("generate_questions: trying Groq fallback...")
            data = await _call_groq(prompt)
            logger.info("generate_questions: Groq succeeded.")
        except Exception as e:
            raise RuntimeError(f"Both Gemini and Groq failed. Last error: {e}") from e

    for i, rnd in enumerate(data["rounds"]):
        rnd["timeLimit"] = ROUND_CONFIG[i]["timeLimit"]
        rnd["type"]      = ROUND_CONFIG[i]["type"]

    return data


def strip_answers(rounds_data: dict) -> dict:
    import copy
    safe = copy.deepcopy(rounds_data)
    for rnd in safe.get("rounds", []):
        for q in rnd.get("questions", []):
            q.pop("correctId", None)
    return safe


# ─── Scoring ──────────────────────────────────────────────────────────────────

def calc_points(time_taken: float, time_limit: int) -> int:
    time_remaining = max(0.0, time_limit - time_taken)
    speed_factor   = time_remaining / time_limit
    return BASE_POINTS + int(SPEED_BONUS * speed_factor)


# ─── On-chain helpers ─────────────────────────────────────────────────────────

def _get_quiz_id(code: str) -> bytes:
    return Web3.keccak(text=code)


def _build_w3() -> tuple[Web3, any]:
    if not RESOLVER_PRIVATE_KEY:
        raise RuntimeError("RESOLVER_PRIVATE_KEY env var not set")
    if not QUIZ_HUB_CONTRACT:
        raise RuntimeError("QUIZ_HUB_CONTRACT env var not set")
    w3      = Web3(Web3.HTTPProvider(CELO_RPC_URL))
    account = Account.from_key(RESOLVER_PRIVATE_KEY)
    return w3, account


def _sign_claim(recipient: str, amount_wei: int, timestamp: int) -> bytes:
    if not RESOLVER_PRIVATE_KEY:
        raise RuntimeError("RESOLVER_PRIVATE_KEY env var not set")

    packed  = Web3.solidity_keccak(
        ["address", "uint256", "uint256"],
        [Web3.to_checksum_address(recipient), amount_wei, timestamp],
    )
    account = Account.from_key(RESOLVER_PRIVATE_KEY)
    signed  = account.sign_message(encode_defunct(packed))
    return signed.signature


def _mint_drops(w3: Web3, account, recipient: str, amount_wei: int) -> str:
    if not DROPS_TOKEN_CONTRACT:
        raise RuntimeError("DROPS_TOKEN_CONTRACT env var not set")

    import time
    ts  = int(time.time())
    sig = _sign_claim(recipient, amount_wei, ts)

    token = w3.eth.contract(
        address=Web3.to_checksum_address(DROPS_TOKEN_CONTRACT),
        abi=_DROPS_CLAIM_ABI,
    )

    tx = token.functions.claim(amount_wei, ts, sig).build_transaction({
        "from":  account.address,
        "nonce": w3.eth.get_transaction_count(account.address, "pending"),
        "gas":   120_000,
    })
    signed_tx = account.sign_transaction(tx)
    tx_hash   = w3.eth.send_raw_transaction(signed_tx.raw_transaction)
    receipt   = w3.eth.wait_for_transaction_receipt(tx_hash, timeout=60)
    if receipt["status"] != 1:
        raise RuntimeError(f"DropsToken.claim reverted: {tx_hash.hex()}")
    return tx_hash.hex()


# ─── On-chain resolution: winner ─────────────────────────────────────────────

async def _set_winner_on_chain(code: str, winner_address: str) -> str | None:
    """
    Records the winner on QuizHub (activity ledger only).
    Does NOT mint DROPS — that happens in claim_game_reward() when the
    winner explicitly clicks Claim.
    Returns the hub tx hash, or None on failure (non-fatal).
    """
    def _send() -> str:
        w3, account = _build_w3()
        hub     = w3.eth.contract(
            address=Web3.to_checksum_address(QUIZ_HUB_CONTRACT),
            abi=_QUIZ_HUB_ABI,
        )
        quiz_id   = _get_quiz_id(code)
        winner_cs = Web3.to_checksum_address(winner_address)
 
        nonce = w3.eth.get_transaction_count(account.address, "pending")
        tx = hub.functions.setWinner(quiz_id, winner_cs).build_transaction({
            "from":  account.address,
            "nonce": nonce,
            "gas":   120_000,
        })
        signed  = account.sign_transaction(tx)
        tx_hash = w3.eth.send_raw_transaction(signed.raw_transaction)
        receipt = w3.eth.wait_for_transaction_receipt(tx_hash, timeout=60)
        if receipt["status"] != 1:
            raise RuntimeError(f"setWinner reverted: {tx_hash.hex()}")
        return tx_hash.hex()
 
    loop = asyncio.get_event_loop()
    try:
        hub_tx = await loop.run_in_executor(None, _send)
        logger.info("setWinner OK  code=%s  winner=%s  hub_tx=%s", code, winner_address, hub_tx)
        return hub_tx
    except Exception as exc:
        logger.error("_set_winner_on_chain FAILED  code=%s  error=%s", code, exc)
        return None
 
 
# ─── On-chain resolution: tie (no mint — just ledger) ────────────────────────
 
async def _declare_tie_on_chain(code: str) -> str | None:
    """
    Records a tie on QuizHub (activity ledger only).
    Does NOT mint DROPS — that happens in claim_game_reward() for each player.
    Returns the hub tx hash, or None on failure (non-fatal).
    """
    def _send() -> str:
        w3, account = _build_w3()
        hub     = w3.eth.contract(
            address=Web3.to_checksum_address(QUIZ_HUB_CONTRACT),
            abi=_QUIZ_HUB_ABI,
        )
        quiz_id = _get_quiz_id(code)
 
        nonce = w3.eth.get_transaction_count(account.address, "pending")
        tx = hub.functions.declareTie(quiz_id).build_transaction({
            "from":  account.address,
            "nonce": nonce,
            "gas":   120_000,
        })
        signed  = account.sign_transaction(tx)
        tx_hash = w3.eth.send_raw_transaction(signed.raw_transaction)
        receipt = w3.eth.wait_for_transaction_receipt(tx_hash, timeout=60)
        if receipt["status"] != 1:
            raise RuntimeError(f"declareTie reverted: {tx_hash.hex()}")
        return tx_hash.hex()
 
    loop = asyncio.get_event_loop()
    try:
        hub_tx = await loop.run_in_executor(None, _send)
        logger.info("declareTie OK  code=%s  hub_tx=%s", code, hub_tx)
        return hub_tx
    except Exception as exc:
        logger.error("_declare_tie_on_chain FAILED  code=%s  error=%s", code, exc)
        return None
 
 
# ─── Pending claim writer ─────────────────────────────────────────────────────
 
async def _write_pending_claim(
    pool:         asyncpg.Pool,
    wallet:       str,
    code:         str,
    drops_amount: float,
    reason:       str,
) -> None:
    try:
        async with pool.acquire() as conn:
            await conn.execute(
                """INSERT INTO challenge_pending_claims
                   (wallet_address, game_code, drops_amount, reason)
                   VALUES ($1, $2, $3, $4)
                   ON CONFLICT (wallet_address, game_code) DO NOTHING""",
                wallet.lower(), code, drops_amount, reason,
            )
        logger.info(
            "pending claim written  wallet=%s  code=%s  drops=%s  reason=%s",
            wallet, code, drops_amount, reason,
        )
    except Exception as e:
        logger.error(                          # ← was silently dying before
            "pending claim FAILED  wallet=%s  code=%s  drops=%s  reason=%s  error=%s",
            wallet, code, drops_amount, reason, e,
        )
        raise   # re-raise so create_task logs it too
# ─── On-chain resolution: tie ─────────────────────────────────────────────────

async def _declare_tie_on_chain(
    code: str,
    player1: str,
    player2: str,
    stake_drops: float,
) -> None:
    def _send() -> tuple[str, str, str]:
        w3, account = _build_w3()

        hub     = w3.eth.contract(
            address=Web3.to_checksum_address(QUIZ_HUB_CONTRACT),
            abi=_QUIZ_HUB_ABI,
        )
        quiz_id = _get_quiz_id(code)

        tx = hub.functions.declareTie(quiz_id).build_transaction({
            "from":  account.address,
            "nonce": w3.eth.get_transaction_count(account.address, "pending"),
            "gas":   120_000,
        })
        signed  = account.sign_transaction(tx)
        tx_hash = w3.eth.send_raw_transaction(signed.raw_transaction)
        receipt = w3.eth.wait_for_transaction_receipt(tx_hash, timeout=60)
        if receipt["status"] != 1:
            raise RuntimeError(f"declareTie reverted: {tx_hash.hex()}")

        hub_tx     = tx_hash.hex()
        refund_wei = int(stake_drops * (10 ** DROPS_DECIMALS))

        mint1_tx = _mint_drops(w3, account, player1, refund_wei)
        mint2_tx = _mint_drops(w3, account, player2, refund_wei)

        return hub_tx, mint1_tx, mint2_tx

    loop = asyncio.get_event_loop()
    try:
        hub_tx, mint1_tx, mint2_tx = await loop.run_in_executor(None, _send)
        logger.info(
            "declareTie OK  code=%s  hub_tx=%s  p1_mint=%s  p2_mint=%s",
            code, hub_tx, mint1_tx, mint2_tx,
        )
    except Exception as exc:
        logger.error("_declare_tie_on_chain FAILED  code=%s  error=%s", code, exc)


# ─── Game Loop ────────────────────────────────────────────────────────────────

BroadcastFn = Callable[[str, dict], Awaitable[None]]


async def run_game_loop(
    code:       str,
    challenges: Dict[str, dict],
    game_state: Dict[str, dict],
    pool:       asyncpg.Pool,
    broadcast:  BroadcastFn,
    notif:      "NotificationService",
) -> None:
    import time as _time

    challenge = challenges[code]
    state     = game_state[code]

    challenge["status"] = "active"
    await _mark_started(pool, code)

    await broadcast(code, {"type": "game_start", "message": "Challenge starting in 3…"})
    await asyncio.sleep(3)

    rounds = challenge["rounds"]

    for r_idx, rnd in enumerate(rounds):
        await broadcast(code, {
            "type":        "round_announce",
            "round":       rnd["type"],
            "roundIndex":  r_idx,
            "totalRounds": len(rounds),
            "timeLimit":   rnd["timeLimit"],
        })
        await asyncio.sleep(3)

        for q_idx, q in enumerate(rnd["questions"]):
            current_q_payload = {
                "roundIndex":     r_idx,
                "questionIndex":  q_idx,
                "totalQuestions": len(rnd["questions"]),
                "roundName":      rnd["type"],
                "startedAt":      int(_time.time() * 1000),
                "data": {
                    "question":  q["question"],
                    "options":   q["options"],
                    "timeLimit": rnd["timeLimit"],
                },
            }
            state["currentQuestion"] = current_q_payload

            await broadcast(code, {"type": "question", **current_q_payload})
            await asyncio.sleep(rnd["timeLimit"])

            state["currentQuestion"] = None

            ans_key       = f"{r_idx}_{q_idx}"
            round_answers = state["answers"].get(ans_key, {})
            q_scores: Dict[str, int] = {}

            for wallet, ans in round_answers.items():
                correct = ans["answerId"] == q["correctId"]
                pts     = calc_points(ans["timeTaken"], rnd["timeLimit"]) if correct else 0
                challenge["players"][wallet]["points"] += pts
                q_scores[wallet] = pts
                asyncio.create_task(
                    _save_answer(pool, code, wallet, r_idx, q_idx,
                                 ans["answerId"], correct, ans["timeTaken"], pts)
                )

            await broadcast(code, {
                "type":           "question_end",
                "roundIndex":     r_idx,
                "questionIndex":  q_idx,
                "correctId":      q["correctId"],
                "questionScores": q_scores,
                "totalScores": {
                    w: p["points"]
                    for w, p in challenge["players"].items()
                },
            })
            await asyncio.sleep(3)

        await broadcast(code, {
            "type":       "round_end",
            "roundIndex": r_idx,
            "roundType":  rnd["type"],
            "scores":     {w: p["points"] for w, p in challenge["players"].items()},
        })
        await asyncio.sleep(4)

    # ── Determine outcome ─────────────────────────────────────────────────────
    players = challenge["players"]
    scores  = {w: p["points"] for w, p in players.items()}
    wallets = list(scores.keys())

    if scores[wallets[0]] == scores[wallets[1]]:
        winner  = None
        outcome = "tie"
    else:
        winner  = max(scores, key=scores.__getitem__)
        outcome = "winner"

    challenge["status"] = "finished"
    challenge["winner"] = winner

    await _mark_finished(pool, code, winner)

    stake_drops = float(challenge.get("stakeAmount", 0))

    # ── Record matchup ────────────────────────────────────────────────────────
    if len(wallets) == 2:
        asyncio.create_task(record_matchup(pool, wallets[0], wallets[1]))

    # ── Update weekly stats ───────────────────────────────────────────────────
    asyncio.create_task(increment_weekly_stats(pool, winner, wallets))

    if outcome == "winner" and winner:
        # Ledger-only on-chain call (no mint) — fire-and-forget
        asyncio.create_task(_set_winner_on_chain(code, winner))
 
        # Write a pending claim row — minting happens when winner clicks Claim
        payout_drops = stake_drops * 2
        asyncio.create_task(_write_pending_claim(pool, winner, code, payout_drops, "game_win"))
 
        loser = next(w for w in wallets if w != winner)
        await notif.notify_game_over(code, winner, loser, stake_drops, "DROPS")
 
    else:
        p1, p2 = wallets[0], wallets[1]
        # Ledger-only on-chain call — fire-and-forget
        asyncio.create_task(_declare_tie_on_chain(code))
 
        # Each player gets their stake back as a claimable row
        for wallet in [p1, p2]:
            asyncio.create_task(
                _write_pending_claim(pool, wallet, code, stake_drops, "tie_refund")
            )
 
        for wallet in wallets:
            await notif.send(
                wallet,
                "game_over",
                "🤝 It's a tie!",
                "The match ended in a draw. Click Claim to get your DROPS stake back.",
                {"code": code},
            )
    await broadcast(code, {
        "type":    "game_over",
        "outcome": outcome,
        "winner":  winner,
        "finalScores": {
            w: {
                "username": players[w]["username"],
                "points":   players[w]["points"],
            }
            for w in wallets
        },
        "canRematch": True,
    })
    logger.info("Game %s finished. Winner: %s", code, winner or "TIE")


# ─── DB Helpers ───────────────────────────────────────────────────────────────

async def _mark_started(pool: asyncpg.Pool, code: str) -> None:
    async with pool.acquire() as conn:
        await conn.execute(
            "UPDATE challenge_games SET status='active', started_at=NOW() WHERE code=$1",
            code,
        )


async def _mark_finished(pool: asyncpg.Pool, code: str, winner: str | None) -> None:
    async with pool.acquire() as conn:
        await conn.execute(
            """UPDATE challenge_games
               SET status='finished', winner_address=$1, finished_at=NOW()
               WHERE code=$2""",
            winner, code,
        )
        await conn.execute(
            """UPDATE challenge_players SET total_duels = COALESCE(total_duels, 0) + 1
               WHERE wallet_address IN (
                   SELECT wallet_address FROM challenge_game_players
                   WHERE challenge_id = (SELECT id FROM challenge_games WHERE code = $1)
               )""",
            code,
        )
        if winner:
            await conn.execute(
                "UPDATE challenge_players SET total_wins = COALESCE(total_wins, 0) + 1 WHERE wallet_address=$1",
                winner,
            )
            await conn.execute(
                """UPDATE challenge_players SET total_losses = COALESCE(total_losses, 0) + 1
                   WHERE wallet_address IN (
                       SELECT wallet_address FROM challenge_game_players
                       WHERE challenge_id = (SELECT id FROM challenge_games WHERE code = $1)
                         AND wallet_address != $2
                   )""",
                code, winner,
            )

    async with pool.acquire() as conn:
        await conn.execute(
            """UPDATE challenge_game_players cgp
               SET final_points = COALESCE((
                   SELECT SUM(cga.points_awarded)
                   FROM challenge_game_answers cga
                   WHERE cga.challenge_id = cgp.challenge_id
                     AND cga.wallet_address = cgp.wallet_address
               ), 0)
               WHERE cgp.challenge_id = (SELECT id FROM challenge_games WHERE code = $1)""",
            code,
        )


async def _save_answer(
    pool:       asyncpg.Pool,
    code:       str,
    wallet:     str,
    r_idx:      int,
    q_idx:      int,
    answer_id:  str,
    is_correct: bool,
    time_taken: float,
    points:     int,
) -> None:
    async with pool.acquire() as conn:
        await conn.execute(
            """INSERT INTO challenge_game_answers
               (challenge_id, wallet_address, round_index, question_index,
                answer_id, is_correct, time_taken, points_awarded)
               VALUES (
                 (SELECT id FROM challenge_games WHERE code=$1),
                 $2, $3, $4, $5, $6, $7, $8
               )""",
            code, wallet, r_idx, q_idx, answer_id, is_correct, time_taken, points,
        )