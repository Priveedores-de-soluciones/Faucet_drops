"""
services/quiz_game.py — Quiz in-memory state, game loop, DB helpers, WS broadcast.

The global dicts (quizzes, connections, etc.) are the single source of truth
for live quiz sessions.  Routers import from here, not the other way around.
"""
from __future__ import annotations

import asyncio
import json
import logging
import random
import string
import traceback
from datetime import datetime, timezone
from typing import Dict, List, Optional

import httpx
from fastapi import WebSocket

from config import GEMINI_API_KEY, GEMINI_URL, REWARD_API_URL
from database import get_pool

logger = logging.getLogger(__name__)

# ── Shared in-memory state ────────────────────────────────────────────────────
quizzes:        Dict[str, dict] = {}   # code → quiz data
connections:    Dict[str, List[WebSocket]] = {}  # code → [ws, ...]
player_sockets: Dict[str, Dict[str, WebSocket]] = {}  # code → {wallet → ws}
game_state:     Dict[str, dict] = {}   # code → runtime state


# ── Helpers ───────────────────────────────────────────────────────────────────

def make_code(length: int = 6) -> str:
    while True:
        code = "".join(random.choices(string.ascii_uppercase + string.digits, k=length))
        if code not in quizzes:
            return code


def utc_now_ms() -> float:
    return datetime.now(timezone.utc).timestamp() * 1000


def calc_points(time_limit: int, time_taken_s: float, is_correct: bool) -> int:
    if not is_correct:
        return 0
    speed_ratio = max(0.0, 1.0 - (time_taken_s / time_limit))
    return 1000 + int(speed_ratio * 1000)


def leaderboard_snapshot(code: str) -> List[dict]:
    state = game_state.get(code, {})
    players = state.get("players", {})
    prev_ranks = state.get("prev_ranks", {})
    entries = sorted(
        [
            {
                "walletAddress": addr,
                "username": p["username"],
                "avatarUrl": p.get("avatarUrl"),
                "points": p["points"],
                "pointsThisRound": p.get("pointsThisRound", 0),
                "streak": p.get("streak", 0),
                "answeredCorrectly": p.get("answeredCorrectly", False),
            }
            for addr, p in players.items()
        ],
        key=lambda x: x["points"],
        reverse=True,
    )
    result = []
    for i, e in enumerate(entries):
        rank = i + 1
        prev = prev_ranks.get(e["walletAddress"], rank)
        result.append({**e, "rank": rank, "rankChange": prev - rank})
    state["prev_ranks"] = {e["walletAddress"]: e["rank"] for e in result}
    return result


# ── WebSocket broadcast ───────────────────────────────────────────────────────

async def broadcast(code: str, payload: dict) -> None:
    dead: List[WebSocket] = []
    for ws in list(connections.get(code, [])):
        try:
            await ws.send_text(json.dumps(payload))
        except Exception:
            dead.append(ws)
    for ws in dead:
        try:
            connections[code].remove(ws)
        except ValueError:
            pass


async def send_to_player(code: str, wallet: str, payload: dict) -> None:
    ws = player_sockets.get(code, {}).get(wallet)
    if ws:
        try:
            await ws.send_text(json.dumps(payload))
        except Exception:
            pass


# ── DB helpers ────────────────────────────────────────────────────────────────

async def db_get_quiz_by_code(code: str) -> Optional[dict]:
    pool = get_pool()
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            "SELECT * FROM faucet_quizzes WHERE code = $1", code.upper()
        )
        return dict(row) if row else None


async def db_join_quiz(
    code: str, wallet: str, username: str, avatar_url: Optional[str]
) -> dict:
    pool = get_pool()
    async with pool.acquire() as conn:
        quiz = await conn.fetchrow(
            "SELECT id, status, max_participants FROM faucet_quizzes WHERE code = $1",
            code.upper(),
        )
        if not quiz:
            return {"success": False, "message": "Quiz not found"}
        if quiz["status"] != "waiting":
            return {"success": False, "message": "Quiz already started"}
        count = await conn.fetchval(
            "SELECT COUNT(*) FROM faucet_quiz_participants WHERE quiz_id = $1",
            quiz["id"],
        )
        if quiz["max_participants"] > 0 and count >= quiz["max_participants"]:
            return {"success": False, "message": "Quiz is full"}
        await conn.execute(
            """
            INSERT INTO faucet_quiz_participants
                (quiz_id, wallet_address, username, avatar_url)
            VALUES ($1, $2, $3, $4)
            ON CONFLICT (quiz_id, wallet_address) DO NOTHING
            """,
            quiz["id"], wallet, username, avatar_url,
        )
        return {"success": True}


async def db_upsert_answer(
    quiz_id: str, question_id: str, wallet: str,
    answer_id: str, is_correct: bool,
    time_taken_s: float, points_earned: int, streak: int,
) -> None:
    pool = get_pool()
    async with pool.acquire() as conn:
        await conn.execute(
            """
            INSERT INTO faucet_quiz_answers
                (quiz_id, question_id, wallet_address, answer_id, is_correct,
                 time_taken_s, points_earned, streak_at_time, answered_at)
            VALUES ($1,$2,$3,$4,$5,$6,$7,$8,NOW())
            ON CONFLICT (quiz_id, question_id, wallet_address)
            DO UPDATE SET
                answer_id      = EXCLUDED.answer_id,
                is_correct     = EXCLUDED.is_correct,
                time_taken_s   = EXCLUDED.time_taken_s,
                points_earned  = EXCLUDED.points_earned,
                streak_at_time = EXCLUDED.streak_at_time,
                answered_at    = NOW()
            """,
            quiz_id, question_id, wallet, answer_id, is_correct,
            time_taken_s, points_earned, streak,
        )


async def db_create_payouts(
    quiz_id: str, winners: list, token_symbol: str, token_address: str, chain_id: int
) -> None:
    pool = get_pool()
    async with pool.acquire() as conn:
        async with conn.transaction():
            for w in winners:
                await conn.execute(
                    """
                    INSERT INTO faucet_quiz_reward_payouts
                        (quiz_id, wallet_address, username, rank, points,
                         percentage, amount, token_symbol, token_address, chain_id)
                    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
                    ON CONFLICT (quiz_id, wallet_address) DO NOTHING
                    """,
                    quiz_id, w["walletAddress"], w.get("username"),
                    w["rank"], w.get("points", 0),
                    w["pct"], w["amount"],
                    token_symbol, token_address, chain_id,
                )
            await conn.execute(
                "UPDATE faucet_quiz_rewards SET dispatch_status = 'processing' WHERE quiz_id = $1",
                quiz_id,
            )


async def db_update_payout_status(
    quiz_id: str, wallet: str, status: str,
    tx_hash: Optional[str] = None, error: Optional[str] = None,
) -> None:
    pool = get_pool()
    async with pool.acquire() as conn:
        async with conn.transaction():
            await conn.execute(
                """
                UPDATE faucet_quiz_reward_payouts
                SET status = $1, tx_hash = $2, error_message = $3,
                    sent_at = CASE WHEN $1 = 'sent' THEN NOW() ELSE sent_at END
                WHERE quiz_id = $4 AND wallet_address = $5
                """,
                status, tx_hash, error, quiz_id, wallet,
            )
            pending = await conn.fetchval(
                "SELECT COUNT(*) FROM faucet_quiz_reward_payouts WHERE quiz_id = $1 AND status = 'pending'",
                quiz_id,
            )
            if pending == 0:
                await conn.execute(
                    """
                    UPDATE faucet_quiz_rewards
                    SET dispatch_status = 'completed', dispatched_at = NOW()
                    WHERE quiz_id = $1
                    """,
                    quiz_id,
                )


# ── DB finalization ───────────────────────────────────────────────────────────

async def _db_finalize(quiz_db_id: str, final_lb: list) -> None:
    pool = get_pool()
    try:
        async with pool.acquire() as conn:
            async with conn.transaction():
                for entry in final_lb:
                    await conn.execute(
                        """
                        UPDATE faucet_quiz_participants
                        SET final_points = $1, final_rank = $2
                        WHERE quiz_id = $3 AND wallet_address = $4
                        """,
                        entry["points"], entry["rank"],
                        quiz_db_id, entry["walletAddress"],
                    )
                await conn.execute(
                    """
                    UPDATE faucet_quiz_participants qp
                    SET is_winner = TRUE
                    FROM faucet_quiz_rewards qr
                    WHERE qr.quiz_id = $1 AND qp.quiz_id = $1
                      AND qp.final_rank <= qr.total_winners
                    """,
                    quiz_db_id,
                )
                await conn.execute(
                    "UPDATE faucet_quizzes SET status = 'finished', finished_at = NOW() WHERE id = $1",
                    quiz_db_id,
                )
    except Exception as exc:
        logger.error("[DB] Finalize error: %s", exc)


# ── Reward dispatch ───────────────────────────────────────────────────────────

async def process_quiz_rewards(code: str, final_leaderboard: List[dict]) -> None:
    quiz = quizzes.get(code)
    if not quiz:
        return
    reward_cfg = quiz.get("reward")
    if not reward_cfg or reward_cfg.get("poolAmount", 0) <= 0:
        return
    distribution = reward_cfg.get("distribution", [])
    winners = []
    for row in distribution:
        rank = row.get("rank", 0)
        if rank < 1:
            continue
        player = next((e for e in final_leaderboard if e.get("rank") == rank), None)
        if not player:
            continue
        winners.append({
            "rank": rank,
            "walletAddress": player["walletAddress"],
            "username": player.get("username", ""),
            "points": player.get("points", 0),
            "amount": row.get("amount", 0),
            "pct": row.get("pct", 0),
        })
    if not winners:
        return
    payload = {
        "quizCode": code,
        "contractAddress": quiz.get("faucetAddress", ""),
        "chainId": quiz.get("chainId", 0),
        "tokenAddress": reward_cfg.get("tokenAddress", ""),
        "tokenSymbol": reward_cfg.get("tokenSymbol", ""),
        "tokenDecimals": reward_cfg.get("tokenDecimals", 18),
        "poolAmount": reward_cfg.get("poolAmount", 0),
        "distributionType": reward_cfg.get("distributionType", "weighted"),
        "winners": winners,
    }
    try:
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.post(REWARD_API_URL, json=payload)
            if resp.status_code == 200:
                result = resp.json()
                await broadcast(code, {
                    "type": "rewards_dispatched",
                    "winners": winners,
                    "txHash": result.get("txHash"),
                    "message": "Winners whitelisted! Visit the quiz contract to claim your reward.",
                })
            else:
                logger.error("[Quiz %s] Reward dispatch failed: %d", code, resp.status_code)
    except Exception as exc:
        logger.error("[Quiz %s] Reward dispatch error: %s", code, exc)


# ── Game loop ─────────────────────────────────────────────────────────────────

async def run_quiz_loop(code: str) -> None:
    quiz = quizzes[code]
    state = game_state[code]
    questions = quiz["questions"]
    state["status"] = "active"
    quizzes[code]["status"] = "active"

    # 3-second countdown
    for i in range(3, 0, -1):
        await broadcast(code, {"type": "countdown", "value": i})
        await asyncio.sleep(1)

    for q_idx, question in enumerate(questions):
        state["current_q"] = q_idx
        state["answers"][q_idx] = {}
        for addr in state["players"]:
            state["players"][addr]["pointsThisRound"] = 0
            state["players"][addr]["answeredCorrectly"] = False

        started_at = utc_now_ms()
        await broadcast(code, {
            "type": "question",
            "index": q_idx,
            "total": len(questions),
            "question": question["question"],
            "options": question["options"],
            "timeLimit": question.get("timeLimit", quiz["timePerQuestion"]),
            "startedAt": started_at,
        })
        await asyncio.sleep(question.get("timeLimit", quiz["timePerQuestion"]))

        correct_id = question["correctId"]
        for addr, ans in state["answers"].get(q_idx, {}).items():
            is_correct = ans["answerId"] == correct_id
            pts = calc_points(
                question.get("timeLimit", quiz["timePerQuestion"]),
                ans["timeTaken"],
                is_correct,
            )
            player = state["players"].get(addr)
            if player:
                player["points"] += pts
                player["pointsThisRound"] = pts
                player["answeredCorrectly"] = is_correct
                player["streak"] = (player.get("streak", 0) + 1) if is_correct else 0
                await send_to_player(code, addr, {
                    "type": "answer_result",
                    "isCorrect": is_correct,
                    "pointsEarned": pts,
                    "correctId": correct_id,
                    "streak": player["streak"],
                })

        await broadcast(code, {
            "type": "question_end",
            "correctId": correct_id,
            "correctText": next(
                (o["text"] for o in question["options"] if o["id"] == correct_id), ""
            ),
        })
        await asyncio.sleep(2)

        is_last = q_idx == len(questions) - 1
        lb = leaderboard_snapshot(code)
        await broadcast(code, {
            "type": "leaderboard",
            "entries": lb,
            "questionIndex": q_idx,
            "isLast": is_last,
        })
        if not is_last:
            await asyncio.sleep(6)

    # ── Finish ────────────────────────────────────────────────────────────────
    await asyncio.sleep(8)
    final_lb = leaderboard_snapshot(code)
    state["status"] = "finished"
    quizzes[code]["status"] = "finished"

    reward_cfg = quiz.get("reward")
    reward_info = None
    if reward_cfg and reward_cfg.get("poolAmount", 0) > 0:
        reward_info = {
            "poolAmount": reward_cfg["poolAmount"],
            "tokenSymbol": reward_cfg["tokenSymbol"],
            "totalWinners": reward_cfg.get("totalWinners", 0),
            "faucetAddress": quiz.get("faucetAddress"),
        }

    await broadcast(code, {
        "type": "game_over",
        "finalLeaderboard": final_lb,
        "reward": reward_info,
    })

    asyncio.create_task(process_quiz_rewards(code, final_lb))
    quiz_db_id = quizzes[code].get("db_id")
    if quiz_db_id:
        asyncio.create_task(_db_finalize(quiz_db_id, final_lb))


# ── Startup loaders ───────────────────────────────────────────────────────────

async def reload_single_quiz_from_db(code: str) -> bool:
    """Fetch one quiz from DB and hydrate the global dicts. Returns True on success."""
    pool = get_pool()
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            """
            SELECT q.*,
                COALESCE(r.pool_amount, 0) as pool_amount,
                COALESCE(r.token_symbol, '') as token_symbol,
                COALESCE(r.total_winners, 0) as total_winners,
                COALESCE(r.distribution_type, 'equal') as distribution_type
            FROM faucet_quizzes q
            LEFT JOIN faucet_quiz_rewards r ON r.quiz_id = q.id
            WHERE q.code = $1
            """,
            code.upper(),
        )
        if not row:
            return False
        quiz = _build_quiz_dict(row)
        q_rows = await conn.fetch(
            "SELECT * FROM faucet_quiz_questions WHERE quiz_id = $1 ORDER BY position",
            row["id"],
        )
        quiz["questions"] = []
        for q in q_rows:
            opts = await conn.fetch(
                "SELECT option_id as id, option_text as text FROM faucet_quiz_question_options WHERE question_id = $1",
                q["id"],
            )
            quiz["questions"].append({
                "question": q["question_text"],
                "options": [dict(o) for o in opts],
                "correctId": q["correct_id"],
                "timeLimit": q["time_limit"],
            })
        quiz["totalQuestions"] = len(quiz["questions"])
        quizzes[code.upper()] = quiz

        if code.upper() not in game_state:
            state = {"status": quiz["status"], "players": {}, "answers": {}, "prev_ranks": {}, "current_q": -1}
            participants = await conn.fetch(
                "SELECT wallet_address, username, avatar_url, points FROM faucet_quiz_participants WHERE quiz_id = $1",
                row["id"],
            )
            for p in participants:
                addr = p["wallet_address"]
                state["players"][addr] = {
                    "walletAddress": addr,
                    "username": p["username"],
                    "avatarUrl": p["avatar_url"],
                    "points": p.get("points", 0),
                    "streak": 0,
                    "pointsThisRound": 0,
                    "answeredCorrectly": False,
                    "joinedAt": utc_now_ms(),
                }
            game_state[code.upper()] = state
            connections.setdefault(code.upper(), [])
            player_sockets.setdefault(code.upper(), {})
    return True


def _build_quiz_dict(row) -> dict:
    return {
        "code": row["code"].upper(),
        "title": row["title"],
        "description": row["description"],
        "coverImageUrl": row["cover_image_url"],
        "status": row["status"],
        "creatorAddress": row["creator_address"],
        "creatorUsername": row["creator_username"],
        "timePerQuestion": row["time_per_question"],
        "maxParticipants": row["max_participants"],
        "startTime": row["start_time"].isoformat() if row["start_time"] else None,
        "createdAt": row["created_at"].isoformat(),
        "chainId": row["chain_id"],
        "faucetAddress": row["faucet_address"],
        "isAiGenerated": row["is_ai_generated"],
        "db_id": str(row["id"]),
        "reward": {
            "poolAmount": float(row["pool_amount"]),
            "tokenSymbol": row["token_symbol"],
            "totalWinners": row["total_winners"],
            "distributionType": row["distribution_type"],
        } if row["pool_amount"] and float(row["pool_amount"]) > 0 else None,
    }


async def load_quizzes_from_db() -> None:
    """Load all quizzes from DB into memory at startup."""
    pool = get_pool()
    async with pool.acquire() as conn:
        rows = await conn.fetch(
            """
            SELECT q.*, r.pool_amount, r.token_symbol, r.total_winners, r.distribution_type
            FROM faucet_quizzes q
            LEFT JOIN faucet_quiz_rewards r ON r.quiz_id = q.id
            ORDER BY q.created_at DESC
            """
        )
        for row in rows:
            code = row["code"].upper()
            quiz = _build_quiz_dict(row)
            q_rows = await conn.fetch(
                "SELECT * FROM faucet_quiz_questions WHERE quiz_id = $1 ORDER BY position",
                row["id"],
            )
            quiz["questions"] = []
            for q in q_rows:
                opts = await conn.fetch(
                    "SELECT option_id as id, option_text as text FROM faucet_quiz_question_options WHERE question_id = $1",
                    q["id"],
                )
                quiz["questions"].append({
                    "question": q["question_text"],
                    "options": [dict(o) for o in opts],
                    "correctId": q["correct_id"],
                    "timeLimit": q["time_limit"],
                })
            quiz["totalQuestions"] = len(quiz["questions"])
            quizzes[code] = quiz
            game_state[code] = {"status": quiz["status"], "players": {}, "answers": {}, "prev_ranks": {}, "current_q": -1}
            connections[code] = []
            player_sockets[code] = {}
    logger.info("[Startup] Loaded %d quizzes from database", len(quizzes))


async def load_all_active_quizzes() -> None:
    """Load only waiting/active quizzes + their participants from DB."""
    pool = get_pool()
    async with pool.acquire() as conn:
        rows = await conn.fetch(
            """
            SELECT q.*,
                COALESCE(r.pool_amount, 0) as pool_amount,
                COALESCE(r.token_symbol, '') as token_symbol,
                COALESCE(r.total_winners, 0) as total_winners,
                COALESCE(r.distribution_type, 'equal') as distribution_type
            FROM faucet_quizzes q
            LEFT JOIN faucet_quiz_rewards r ON r.quiz_id = q.id
            WHERE q.status IN ('waiting', 'active')
            ORDER BY q.created_at DESC
            """
        )
        for row in rows:
            code = row["code"].upper()
            quiz = _build_quiz_dict(row)
            q_rows = await conn.fetch(
                "SELECT * FROM faucet_quiz_questions WHERE quiz_id = $1 ORDER BY position",
                row["id"],
            )
            quiz["questions"] = []
            for q in q_rows:
                opts = await conn.fetch(
                    "SELECT option_id as id, option_text as text FROM faucet_quiz_question_options WHERE question_id = $1",
                    q["id"],
                )
                quiz["questions"].append({
                    "question": q["question_text"],
                    "options": [dict(o) for o in opts],
                    "correctId": q["correct_id"],
                    "timeLimit": q["time_limit"],
                })
            quiz["totalQuestions"] = len(quiz["questions"])
            quizzes[code] = quiz
            state = {"status": quiz["status"], "players": {}, "answers": {}, "prev_ranks": {}, "current_q": -1}
            participants = await conn.fetch(
                "SELECT wallet_address, username, avatar_url FROM faucet_quiz_participants WHERE quiz_id = $1",
                row["id"],
            )
            for p in participants:
                addr = p["wallet_address"]
                state["players"][addr] = {
                    "walletAddress": addr,
                    "username": p["username"],
                    "avatarUrl": p["avatar_url"],
                    "points": 0,
                    "streak": 0,
                    "pointsThisRound": 0,
                    "answeredCorrectly": False,
                    "joinedAt": utc_now_ms(),
                }
            game_state[code] = state
            connections[code] = []
            player_sockets[code] = {}
            logger.info("[Startup] Loaded quiz %s with %d players", code, len(participants))
    logger.info("[Startup] ✅ Loaded %d active quizzes", len(quizzes))
