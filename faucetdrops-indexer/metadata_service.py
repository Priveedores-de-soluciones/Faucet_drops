import asyncio
import requests
from typing import Dict, List, Optional

METADATA_API_BASE = "https://faucetdrop-backend.onrender.com"
DELETED_FAUCETS_URL = f"{METADATA_API_BASE}/deleted-faucets"
METADATA_TIMEOUT = 4   # seconds per request


# ── Deleted faucet list ───────────────────────────────────────────────────────

async def fetch_deleted_faucets() -> set:
    """
    Fetch the set of deleted faucet addresses (lowercase) from the backend.
    Returns an empty set on any error so callers never crash.
    """
    try:
        loop = asyncio.get_event_loop()
        resp = await loop.run_in_executor(
            None,
            lambda: requests.get(DELETED_FAUCETS_URL, timeout=5),
        )
        if resp.ok:
            data = resp.json()
            return {a.lower() for a in data.get("deletedAddresses", [])}
    except Exception:
        pass
    return set()


# ── Single faucet metadata ────────────────────────────────────────────────────

async def fetch_faucet_metadata(faucet_address: str) -> Dict:
    """
    Fetch image_url and description for one faucet.
    Returns {} if the backend has no record or the request fails.
    """
    url = f"{METADATA_API_BASE}/faucet-metadata/{faucet_address.lower()}"
    try:
        loop = asyncio.get_event_loop()
        resp = await loop.run_in_executor(
            None,
            lambda: requests.get(url, timeout=METADATA_TIMEOUT),
        )
        if resp.ok:
            body = resp.json()
            return {
                "image_url":   body.get("imageUrl", ""),
                "description": body.get("description", ""),
            }
    except Exception:
        pass
    return {}


# ── Batch enrichment ─────────────────────────────────────────────────────────

async def enrich_with_metadata(rows: List[Dict]) -> List[Dict]:
    """
    Fire off metadata requests concurrently for every row in *rows*.
    Updates the "image_url" and "description" keys in-place and returns
    the same list.

    Each row must have a "faucet_address" key.
    """
    async def _enrich_one(row: Dict) -> Dict:
        meta = await fetch_faucet_metadata(row["faucet_address"])
        row["image_url"]   = meta.get("image_url", "")
        row["description"] = meta.get("description", "")
        return row

    tasks = [_enrich_one(row) for row in rows]
    return list(await asyncio.gather(*tasks))