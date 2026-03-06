"""
dependencies.py — FastAPI dependency injectors for DB connections,
the Web3 signer, and Supabase client.

Import from here in every router:
    from dependencies import require_pool, get_signer, supabase
"""
from __future__ import annotations

import asyncpg
import logging
from typing import AsyncGenerator

from fastapi import HTTPException

from config import BACKEND_PRIVATE_KEY_A, supabase  # re-export supabase
from database import get_pool

logger = logging.getLogger(__name__)

# ── Web3 account / signer ────────────────────────────────────────────────────
try:
    from eth_account import Account

    _signer = Account.from_key(BACKEND_PRIVATE_KEY_A)
    SIGNER_ADDRESS: str = _signer.address
    logger.info("✅ Signer loaded: %s", SIGNER_ADDRESS)
except Exception as exc:
    logger.warning("⚠️  Could not load signer from BACKEND_PRIVATE_KEY_A: %s", exc)
    _signer = None
    SIGNER_ADDRESS = ""


def get_signer() -> "Account":
    """Return the backend signing Account; raise 503 if not configured."""
    if _signer is None:
        raise HTTPException(status_code=503, detail="Backend signer not configured")
    return _signer


# ── asyncpg connection dependency ────────────────────────────────────────────
async def require_pool() -> AsyncGenerator[asyncpg.Connection, None]:
    """
    FastAPI dependency that acquires a DB connection from the pool,
    yields it to the route handler, then releases it.

    Usage:
        @router.get("/example")
        async def example(conn = Depends(require_pool)):
            ...
    """
    pool = get_pool()
    conn = await pool.acquire()
    try:
        yield conn
    finally:
        await pool.release(conn)


# Re-export supabase for convenience so routers only need one import
__all__ = ["require_pool", "get_signer", "SIGNER_ADDRESS", "supabase"]
