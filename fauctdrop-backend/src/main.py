from __future__ import annotations

import asyncio
import logging
import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.sessions import SessionMiddleware

from config import SESSION_SECRET
from database import close_pool, init_pool

logger = logging.getLogger(__name__)

# ── Application ───────────────────────────────────────────────────────────────
app = FastAPI(
    title="FaucetDrop API",
    description="Quiz, Quest, and Faucet distribution platform",
    version="2.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.add_middleware(
    SessionMiddleware,
    secret_key=SESSION_SECRET,
    max_age=3600,
)

# ── Routers ───────────────────────────────────────────────────────────────────
from routers.auth         import router as auth_router
from routers.quest        import router as quest_router
from routers.faucet       import router as faucet_router
from routers.profile      import router as profile_router
from routers.wallet       import router as wallet_router
from routers.verification import router as verification_router
from routers.utility      import router as utility_router
from routers.quiz         import quiz_router, ws_router

app.include_router(auth_router)
app.include_router(quest_router)
app.include_router(faucet_router)
app.include_router(profile_router)
app.include_router(wallet_router)
app.include_router(verification_router)
app.include_router(utility_router)
app.include_router(quiz_router, prefix="/api/quiz", tags=["quiz"])
app.include_router(ws_router)

# ── Lifecycle ─────────────────────────────────────────────────────────────────
@app.on_event("startup")
async def startup() -> None:
    # 1. Create the asyncpg pool
    db_url = os.getenv("DATABASE_URL", "")
    # asyncpg uses postgresql:// not postgresql+asyncpg://
    if db_url.startswith("postgresql+asyncpg://"):
        db_url = db_url.replace("postgresql+asyncpg://", "postgresql://")
    os.environ["DATABASE_URL"] = db_url  # update so database.py picks it up
    await init_pool()
    logger.info("✅ DB pool created")

    # 2. Load quizzes into memory
    from services.quiz_game import load_quizzes_from_db, load_all_active_quizzes
    await load_quizzes_from_db()
    await load_all_active_quizzes()

    # 3. Start background quest processor
    from services.quest_processor import internal_quest_processor
    asyncio.create_task(internal_quest_processor())
    logger.info("✅ Background quest processor started")


@app.on_event("shutdown")
async def shutdown() -> None:
    await close_pool()
    logger.info("🛑 Postgres connection pool closed")


# ── Dev server ────────────────────────────────────────────────────────────────
if __name__ == "__main__":
        import uvicorn
        uvicorn.run(app, host="0.0.0.0", port=8000)