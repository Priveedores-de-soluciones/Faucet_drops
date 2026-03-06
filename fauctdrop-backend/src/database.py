"""
database.py — asyncpg connection pool lifecycle.
Call `init_pool()` on startup and `close_pool()` on shutdown.
"""
from __future__ import annotations

import asyncpg
import logging
from typing import Optional

from config import DATABASE_URL

logger = logging.getLogger(__name__)

# Module-level pool singleton — set by init_pool()
pool: Optional[asyncpg.Pool] = None


async def init_pool() -> asyncpg.Pool:
    """Create and return the asyncpg connection pool."""
    global pool
    pool = await asyncpg.create_pool(
        DATABASE_URL,
        min_size=2,
        max_size=10,
        command_timeout=60,
        statement_cache_size=0,
    )
    logger.info("✅ asyncpg pool created (%s)", DATABASE_URL.split("@")[-1])
    return pool


async def close_pool() -> None:
    """Gracefully close the connection pool."""
    global pool
    if pool:
        await pool.close()
        pool = None
        logger.info("asyncpg pool closed")


def get_pool() -> asyncpg.Pool:
    """Return the live pool; raise RuntimeError if not initialised."""
    if pool is None:
        raise RuntimeError("Database pool is not initialised. Call init_pool() first.")
    return pool
