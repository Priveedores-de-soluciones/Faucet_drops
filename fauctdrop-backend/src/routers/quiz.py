"""
routers/quiz.py — Quiz REST endpoints and WebSocket handler.

Imports state from services.quiz_game (single source of truth for in-memory data).
"""
from __future__ import annotations

import json
import traceback
from datetime import datetime, timezone
from typing import List, Optional

import httpx
from fastapi import APIRouter, HTTPException, WebSocket, WebSocketDisconnect
from web3 import Web3

from abis import QUEST_ABI
from config import GEMINI_API_KEY, GEMINI_URL, VALID_CHAIN_IDS
from database import get_pool
from models import CreateQuizRequest, GenerateQuizRequest, JoinQuizRequest
from services.quiz_game import (
    broadcast,
    connections,
    db_create_payouts,
    db_update_payout_status,
    game_state,
    leaderboard_snapshot,
    make_code,
    player_sockets,
    quizzes,
    reload_single_quiz_from_db,
    run_quiz_loop,
    send_to_player,
    utc_now_ms,
)
from utils.blockchain import (
    build_transaction_with_standard_gas,
    check_sufficient_balance,
    wait_for_transaction_receipt,
)
from utils.web3_utils import get_web3_instance

quiz_router = APIRouter(tags=["quiz"])
ws_router   = APIRouter()


# ── List ──────────────────────────────────────────────────────────────────────

@quiz_router.get("/list")
async def list_quizzes():
    """Returns all quizzes (DB-authoritative, enriched with live player counts)."""
    try:
        pool = get_pool()
        async with pool.acquire() as conn:
            rows = await conn.fetch("""
                SELECT
                    q.id, q.code, q.title, q.description, q.cover_image_url,
                    q.status, q.creator_address, q.creator_username,
                    q.time_per_question, q.max_participants, q.chain_id,
                    q.faucet_address, q.is_ai_generated, q.start_time, q.created_at,
                    r.pool_amount, r.token_symbol, r.total_winners
                FROM faucet_quizzes q
                LEFT JOIN faucet_quiz_rewards r ON r.quiz_id = q.id
                ORDER BY q.created_at DESC
                LIMIT 100
            """)
        result = []
        for row in rows:
            code = row["code"].upper()
            state = game_state.get(code, {})
            player_count = len(state.get("players", {}))
            if not state:
                pool = get_pool()
                async with pool.acquire() as conn:
                    player_count = await conn.fetchval(
                        "SELECT COUNT(*) FROM faucet_quiz_participants WHERE quiz_id = $1",
                        row["id"],
                    ) or 0
            result.append({
                "code":            code,
                "title":           row["title"] or "",
                "description":     row["description"] or "",
                "coverImageUrl":   row["cover_image_url"],
                "status":          row["status"] or "waiting",
                "creatorUsername": row["creator_username"] or "",
                "creatorAddress":  row["creator_address"] or "",
                "totalQuestions":  quizzes.get(code, {}).get("totalQuestions", 0),
                "playerCount":     player_count,
                "maxParticipants": row["max_participants"] or 0,
                "createdAt":       row["created_at"].isoformat() if row["created_at"] else "",
                "startTime":       row["start_time"].isoformat() if row["start_time"] else None,
                "isAiGenerated":   row["is_ai_generated"] or False,
                "chainId":         row["chain_id"] or 0,
                "faucetAddress":   row["faucet_address"],
                "reward": {
                    "poolAmount":   float(row["pool_amount"]) if row["pool_amount"] else 0,
                    "tokenSymbol":  row["token_symbol"] or "",
                    "totalWinners": row["total_winners"] or 0,
                } if row["pool_amount"] is not None else None,
            })
        order = {"active": 0, "waiting": 1, "finished": 2}
        result.sort(key=lambda x: (
            order.get(x["status"], 3),
            -(datetime.fromisoformat(x["createdAt"]).timestamp() if x["createdAt"] else 0),
        ))
        return {"success": True, "quizzes": result, "total": len(result)}
    except Exception as exc:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(exc))


# ── Create ────────────────────────────────────────────────────────────────────

@quiz_router.post("/create")
async def create_quiz(body: CreateQuizRequest):
    code = make_code()
    quiz = {
        "code": code,
        "title": body.title,
        "description": body.description,
        "questions": [q.model_dump() for q in body.questions],
        "timePerQuestion": body.timePerQuestion,
        "maxParticipants": body.maxParticipants,
        "startTime": body.startTime,
        "creatorAddress": body.creatorAddress,
        "creatorUsername": body.creatorUsername,
        "coverImageUrl": body.coverImageUrl,
        "status": "waiting",
        "createdAt": datetime.now(timezone.utc).isoformat(),
        "totalQuestions": len(body.questions),
        "chainId": body.chainId,
        "faucetAddress": body.faucetAddress,
        "isAiGenerated": False,
        "reward": body.reward.model_dump() if body.reward else None,
    }
    quizzes[code] = quiz
    game_state[code] = {"status": "waiting", "players": {}, "answers": {}, "prev_ranks": {}, "current_q": -1}
    connections[code] = []
    player_sockets[code] = {}

    pool = get_pool()
    async with pool.acquire() as conn:
        async with conn.transaction():
            quiz_id = await conn.fetchval("""
                INSERT INTO faucet_quizzes
                    (code, title, description, cover_image_url, creator_address,
                     creator_username, status, is_ai_generated, time_per_question,
                     max_participants, chain_id, start_time, faucet_address)
                VALUES ($1,$2,$3,$4,$5,$6,'waiting',$7,$8,$9,$10,$11,$12)
                RETURNING id
            """,
                code, body.title, body.description, body.coverImageUrl,
                body.creatorAddress, body.creatorUsername,
                False, body.timePerQuestion, body.maxParticipants,
                body.chainId,
                datetime.fromisoformat(body.startTime) if body.startTime else None,
                body.faucetAddress,
            )
            for i, q in enumerate(body.questions):
                q_id = await conn.fetchval("""
                    INSERT INTO faucet_quiz_questions
                        (quiz_id, position, question_text, correct_id, time_limit)
                    VALUES ($1,$2,$3,$4,$5) RETURNING id
                """, quiz_id, i, q.question, q.correctId, q.timeLimit)
                for opt in q.options:
                    await conn.execute("""
                        INSERT INTO faucet_quiz_question_options
                            (question_id, option_id, option_text)
                        VALUES ($1,$2,$3)
                    """, q_id, opt.id, opt.text)
            if body.reward:
                r = body.reward
                await conn.execute("""
                    INSERT INTO faucet_quiz_rewards
                        (quiz_id, pool_amount, token_address, token_symbol,
                         token_decimals, token_logo_url, chain_id, total_winners,
                         distribution_type, pool_usd_value, faucet_address)
                    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
                """,
                    quiz_id, r.poolAmount, r.tokenAddress, r.tokenSymbol,
                    r.tokenDecimals, r.tokenLogoUrl, r.chainId,
                    r.totalWinners, r.distributionType, r.poolUsdValue,
                    body.faucetAddress,
                )
                for tier in r.distribution:
                    await conn.execute("""
                        INSERT INTO faucet_quiz_reward_tiers (quiz_id, rank, percentage, amount)
                        VALUES ($1,$2,$3,$4)
                    """, quiz_id, tier.rank, tier.pct, tier.amount)
            quizzes[code]["db_id"] = str(quiz_id)
    return {"success": True, "code": code, "quiz": quiz}


# ── AI Generate ───────────────────────────────────────────────────────────────

@quiz_router.post("/generate-ai")
async def generate_quiz_ai(body: GenerateQuizRequest):
    prompt = f"""You are a quiz master. Generate exactly {body.numQuestions} multiple-choice questions about "{body.topic}".
Difficulty: {body.difficulty}.
Return ONLY valid JSON (no markdown, no extra text):
{{
  "title": "Quiz title here",
  "questions": [
    {{
      "question": "Question text?",
      "options": [
        {{"id": "A", "text": "Option A"}},
        {{"id": "B", "text": "Option B"}},
        {{"id": "C", "text": "Option C"}},
        {{"id": "D", "text": "Option D"}}
      ],
      "correctId": "B",
      "timeLimit": {body.timePerQuestion}
    }}
  ]
}}
Rules: 4 options per question, correctId in [A,B,C,D], vary correct answer positions."""

    async with httpx.AsyncClient(timeout=60) as client:
        resp = await client.post(
            GEMINI_URL,
            params={"key": GEMINI_API_KEY},
            json={
                "contents": [{"parts": [{"text": prompt}]}],
                "generationConfig": {
                    "temperature": 0.7,
                    "maxOutputTokens": 8192,
                    "responseMimeType": "application/json",
                },
            },
        )
    if resp.status_code != 200:
        raise HTTPException(status_code=502, detail=f"Gemini API error: {resp.text}")
    raw = resp.json()
    text = raw["candidates"][0]["content"]["parts"][0]["text"]
    try:
        data = json.loads(text)
    except Exception:
        raise HTTPException(status_code=502, detail="Failed to parse Gemini response")

    title = body.title or data.get("title", f"{body.topic} Quiz")
    questions = data.get("questions", [])
    if not questions:
        raise HTTPException(status_code=502, detail="Gemini returned no questions")

    code = make_code()
    quiz = {
        "code": code,
        "title": title,
        "description": f"AI-generated quiz about {body.topic} ({body.difficulty})",
        "questions": questions,
        "timePerQuestion": body.timePerQuestion,
        "maxParticipants": 0,
        "startTime": None,
        "creatorAddress": body.creatorAddress,
        "creatorUsername": "",
        "coverImageUrl": None,
        "status": "waiting",
        "createdAt": datetime.now(timezone.utc).isoformat(),
        "totalQuestions": len(questions),
        "faucetAddress": body.faucetAddress,
        "isAiGenerated": True,
        "chainId": body.chainId,
        "reward": body.reward.model_dump() if body.reward else None,
    }
    quizzes[code] = quiz
    game_state[code] = {"status": "waiting", "players": {}, "answers": {}, "prev_ranks": {}, "current_q": -1}
    connections[code] = []
    player_sockets[code] = {}

    pool = get_pool()
    async with pool.acquire() as conn:
        async with conn.transaction():
            quiz_id = await conn.fetchval("""
                INSERT INTO faucet_quizzes
                    (code, title, description, creator_address, status,
                     is_ai_generated, time_per_question, chain_id, faucet_address)
                VALUES ($1,$2,$3,$4,'waiting',TRUE,$5,$6,$7) RETURNING id
            """,
                code, title,
                f"AI-generated quiz about {body.topic} ({body.difficulty})",
                body.creatorAddress, body.timePerQuestion, body.chainId, body.faucetAddress,
            )
            for i, q in enumerate(questions):
                q_id = await conn.fetchval("""
                    INSERT INTO faucet_quiz_questions
                        (quiz_id, position, question_text, correct_id, time_limit)
                    VALUES ($1,$2,$3,$4,$5) RETURNING id
                """, quiz_id, i, q["question"], q["correctId"], q.get("timeLimit", body.timePerQuestion))
                for opt in q.get("options", []):
                    await conn.execute("""
                        INSERT INTO faucet_quiz_question_options (question_id, option_id, option_text)
                        VALUES ($1,$2,$3)
                    """, q_id, opt["id"], opt["text"])
            if body.reward:
                r = body.reward
                await conn.execute("""
                    INSERT INTO faucet_quiz_rewards
                        (quiz_id, pool_amount, token_address, token_symbol,
                         token_decimals, token_logo_url, chain_id, total_winners,
                         distribution_type, pool_usd_value, faucet_address)
                    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
                """,
                    quiz_id, r.poolAmount, r.tokenAddress, r.tokenSymbol,
                    r.tokenDecimals, r.tokenLogoUrl, r.chainId,
                    r.totalWinners, r.distributionType, r.poolUsdValue, body.faucetAddress,
                )
                for tier in r.distribution:
                    await conn.execute("""
                        INSERT INTO faucet_quiz_reward_tiers (quiz_id, rank, percentage, amount)
                        VALUES ($1,$2,$3,$4)
                    """, quiz_id, tier.rank, tier.pct, tier.amount)
            quizzes[code]["db_id"] = str(quiz_id)
    return {"success": True, "code": code, "quiz": quiz}


# ── Get single quiz ───────────────────────────────────────────────────────────

@quiz_router.get("/{code}")
async def get_quiz(code: str):
    code = code.upper()
    if code not in quizzes:
        if not await reload_single_quiz_from_db(code):
            raise HTTPException(status_code=404, detail="Quiz not found")
    quiz = quizzes[code]
    state = game_state.get(code, {})
    return {"success": True, "quiz": {**quiz, "playerCount": len(state.get("players", {}))}}


# ── Join ──────────────────────────────────────────────────────────────────────

@quiz_router.post("/{code}/join")
async def join_quiz(code: str, body: JoinQuizRequest):
    code = code.upper()
    if code not in quizzes:
        if not await reload_single_quiz_from_db(code):
            raise HTTPException(status_code=404, detail="Quiz not found")
    quiz = quizzes[code]
    state = game_state.get(code)
    if not state:
        raise HTTPException(status_code=404, detail="Quiz state not found")

    if state["status"] == "finished":
        return {"success": False, "finished": True, "status": "finished", "message": "Quiz has ended"}
    if state["status"] == "active":
        return {"success": False, "active": True, "status": "active", "message": "Quiz is in progress"}

    max_p = quiz.get("maxParticipants", 0)
    if max_p > 0 and len(state["players"]) >= max_p:
        raise HTTPException(status_code=400, detail="Quiz is full")

    if body.walletAddress not in state["players"]:
        state["players"][body.walletAddress] = {
            "walletAddress": body.walletAddress,
            "username": body.username,
            "avatarUrl": body.avatarUrl,
            "points": 0,
            "streak": 0,
            "pointsThisRound": 0,
            "answeredCorrectly": False,
            "joinedAt": utc_now_ms(),
        }
        await broadcast(code, {
            "type": "player_list",
            "players": [
                {"walletAddress": addr, "username": p["username"],
                 "avatarUrl": p.get("avatarUrl"), "points": p.get("points", 0)}
                for addr, p in state["players"].items()
            ],
        })
        quiz_db_id = quizzes[code].get("db_id")
        if quiz_db_id:
            pool = get_pool()
            async with pool.acquire() as conn:
                await conn.execute("""
                    INSERT INTO faucet_quiz_participants (quiz_id, wallet_address, username, avatar_url)
                    VALUES ($1,$2,$3,$4)
                    ON CONFLICT (quiz_id, wallet_address) DO NOTHING
                """, quiz_db_id, body.walletAddress, body.username, body.avatarUrl)
    return {"success": True, "status": "waiting"}


# ── Dispatch rewards ──────────────────────────────────────────────────────────

@quiz_router.post("/dispatch-rewards")
async def dispatch_rewards(payload: dict):
    """Whitelist winners on-chain using setRewardAmountsBatch."""
    quiz_code        = payload.get("quizCode", "")
    contract_address = payload.get("contractAddress", "")
    chain_id         = int(payload.get("chainId", 0))
    token_decimals   = int(payload.get("tokenDecimals", 18))
    token_symbol     = payload.get("tokenSymbol", "")
    token_address    = payload.get("tokenAddress", "")
    winners          = payload.get("winners", [])

    if not winners:
        return {"success": False, "message": "No winners provided"}
    if not contract_address or not Web3.is_address(contract_address):
        return {"success": False, "message": "Missing or invalid quiz contract address"}
    if chain_id not in VALID_CHAIN_IDS:
        return {"success": False, "message": f"Unsupported chainId: {chain_id}"}

    from dependencies import get_signer
    signer = get_signer()

    try:
        w3 = await get_web3_instance(chain_id)
        contract_cs = Web3.to_checksum_address(contract_address)
        contract = w3.eth.contract(address=contract_cs, abi=QUEST_ABI)

        winner_addresses: List[str] = []
        winner_amounts:   List[int] = []
        for w in winners:
            raw_addr = w.get("walletAddress", "")
            amount_human = float(w.get("amount", 0))
            if not raw_addr or not Web3.is_address(raw_addr) or amount_human <= 0:
                continue
            winner_addresses.append(Web3.to_checksum_address(raw_addr))
            winner_amounts.append(int(amount_human * (10 ** token_decimals)))

        if not winner_addresses:
            return {"success": False, "message": "No valid winners after filtering"}

        ok, err = check_sufficient_balance(w3, signer.address)
        if not ok:
            return {"success": False, "message": f"Backend wallet low on gas: {err}"}

        tx = build_transaction_with_standard_gas(
            w3,
            contract.functions.setRewardAmountsBatch(winner_addresses, winner_amounts),
            signer.address,
        )
        signed = w3.eth.account.sign_transaction(tx, signer.key)
        tx_hash = w3.eth.send_raw_transaction(signed.raw_transaction)
        receipt = await wait_for_transaction_receipt(w3, tx_hash.hex())

        if receipt.get("status", 0) != 1:
            return {"success": False, "message": f"Transaction reverted: {tx_hash.hex()}"}

        # Persist payout records
        quiz_db_id = quizzes.get(quiz_code, {}).get("db_id")
        if quiz_db_id:
            await db_create_payouts(quiz_db_id, winners, token_symbol, token_address, chain_id)
            for addr in winner_addresses:
                await db_update_payout_status(quiz_db_id, addr, "sent", tx_hash=tx_hash.hex())

        return {
            "success": True,
            "txHash": tx_hash.hex(),
            "quizCode": quiz_code,
            "contractAddress": contract_address,
            "chainId": chain_id,
            "winnersWhitelisted": len(winner_addresses),
        }
    except HTTPException:
        raise
    except Exception as exc:
        traceback.print_exc()
        return {"success": False, "message": str(exc)}


# ── Payouts ───────────────────────────────────────────────────────────────────

@quiz_router.get("/{code}/payouts")
async def get_quiz_payouts(code: str, walletAddress: Optional[str] = None):
    code = code.upper()
    quiz = quizzes.get(code)
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")
    quiz_db_id = quiz.get("db_id")
    if not quiz_db_id:
        return {"success": True, "payouts": []}

    pool = get_pool()
    async with pool.acquire() as conn:
        base_q = """
            SELECT p.wallet_address, p.username, p.rank, p.points, p.percentage,
                   p.amount, p.token_symbol, p.token_address, p.chain_id,
                   p.status, p.tx_hash, p.sent_at, r.faucet_address
            FROM faucet_quiz_reward_payouts p
            LEFT JOIN faucet_quiz_rewards r ON r.quiz_id = p.quiz_id
            WHERE p.quiz_id = $1
        """
        if walletAddress:
            rows = await conn.fetch(base_q + " AND p.wallet_address = $2", quiz_db_id, walletAddress.lower())
        else:
            rows = await conn.fetch(base_q + " ORDER BY p.rank ASC", quiz_db_id)

    return {
        "success": True,
        "quizCode": code,
        "faucetAddress": quiz.get("faucetAddress"),
        "chainId": quiz.get("chainId"),
        "reward": quiz.get("reward"),
        "payouts": [dict(r) for r in rows],
        "totalWinners": len(rows),
    }


# ── Claim acknowledgement ─────────────────────────────────────────────────────

@quiz_router.post("/{code}/claim-ack")
async def acknowledge_claim(code: str, body: dict):
    code = code.upper()
    quiz = quizzes.get(code)
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")
    wallet = body.get("walletAddress", "")
    tx_hash = body.get("txHash", "")
    quiz_db_id = quiz.get("db_id")
    if not quiz_db_id or not wallet:
        raise HTTPException(status_code=400, detail="walletAddress required")
    await db_update_payout_status(quiz_db_id, wallet.lower(), "claimed", tx_hash=tx_hash)
    return {"success": True, "message": "Claim acknowledged"}


# ── Debug ─────────────────────────────────────────────────────────────────────

@quiz_router.get("/{code}/debug")
async def debug_quiz_state(code: str):
    code = code.upper()
    quiz = quizzes.get(code)
    state = game_state.get(code)
    return {
        "quiz_exists": bool(quiz),
        "state_exists": bool(state),
        "status": state.get("status") if state else None,
        "player_count": len(state.get("players", {})) if state else 0,
        "max_participants": quiz.get("maxParticipants") if quiz else None,
        "db_id": quiz.get("db_id") if quiz else None,
    }


# ── WebSocket ─────────────────────────────────────────────────────────────────

@ws_router.websocket("/ws/quiz/{code}")
async def quiz_websocket(ws: WebSocket, code: str):
    code = code.upper()
    if code not in quizzes:
        if not await reload_single_quiz_from_db(code):
            await ws.close(code=4004, reason="Quiz not found")
            return

    await ws.accept()
    connections.setdefault(code, []).append(ws)
    wallet = None

    try:
        async for raw in ws.iter_text():
            try:
                msg = json.loads(raw)
            except Exception:
                continue
            msg_type = msg.get("type")
            state = game_state.get(code, {})
            quiz = quizzes.get(code, {})

            if msg_type == "identify":
                wallet = msg.get("walletAddress", "")
                is_creator = wallet.lower() == quiz.get("creatorAddress", "").lower()
                player_sockets.setdefault(code, {})[wallet] = ws
                players_list = [
                    {"walletAddress": a, **{k: v for k, v in p.items() if k != "walletAddress"}}
                    for a, p in state.get("players", {}).items()
                ]
                await ws.send_text(json.dumps({
                    "type": "state_sync",
                    "status": state.get("status", "waiting"),
                    "players": players_list,
                    "isCreator": is_creator,
                    "quiz": {
                        "title": quiz.get("title"),
                        "totalQuestions": quiz.get("totalQuestions"),
                        "creatorAddress": quiz.get("creatorAddress"),
                    },
                }))
                await broadcast(code, {"type": "player_list", "players": players_list})

            elif msg_type in ("submit_answer", "change_answer"):
                q_idx = state.get("current_q", -1)
                if q_idx < 0 or state.get("status") != "active" or not wallet:
                    continue
                state["answers"].setdefault(q_idx, {})[wallet] = {
                    "answerId": msg["answerId"],
                    "timeTaken": msg.get("timeTaken", 0),
                }
                await ws.send_text(json.dumps({"type": "answer_ack", "answerId": msg["answerId"]}))

            elif msg_type == "start_quiz":
                import asyncio
                sender = msg.get("walletAddress", "").lower()
                if sender != quiz.get("creatorAddress", "").lower():
                    await ws.send_text(json.dumps({"type": "error", "message": "Only the creator can start the quiz"}))
                    continue
                if state.get("status") != "waiting":
                    await ws.send_text(json.dumps({"type": "error", "message": "Quiz has already started or finished"}))
                    continue
                state["status"] = "active"
                quizzes[code]["status"] = "active"
                await broadcast(code, {"type": "game_starting", "message": "Quiz starting in 3 seconds..."})
                asyncio.create_task(run_quiz_loop(code))

    except WebSocketDisconnect:
        pass
    finally:
        if ws in connections.get(code, []):
            connections[code].remove(ws)
        if wallet and code in player_sockets:
            player_sockets[code].pop(wallet, None)
