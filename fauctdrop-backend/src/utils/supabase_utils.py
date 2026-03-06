"""
utils/supabase_utils.py — Supabase / Postgres query helpers.

All functions import supabase from config and pool from database.
They do NOT import routers or services to avoid circular dependencies.
"""
from __future__ import annotations

import secrets
import logging
from datetime import datetime
from typing import Any, Dict, List, Optional

from fastapi import HTTPException
from web3 import Web3

from config import supabase

logger = logging.getLogger(__name__)


# ── Faucet tasks ──────────────────────────────────────────────────────────────

async def store_faucet_tasks(faucet_address: str, tasks: List[Dict], user_address: str) -> Dict:
    """Upsert task list for a faucet in Supabase."""
    if not Web3.is_address(faucet_address):
        raise HTTPException(status_code=400, detail=f"Invalid faucet address: {faucet_address}")

    data = {
        "faucet_address": Web3.to_checksum_address(faucet_address),
        "tasks": tasks,
        "created_by": Web3.to_checksum_address(user_address),
        "created_at": datetime.now().isoformat(),
        "updated_at": datetime.now().isoformat(),
    }
    resp = supabase.table("faucet_tasks").upsert(data, on_conflict="faucet_address").execute()
    if not resp.data:
        raise HTTPException(status_code=500, detail="Failed to store faucet tasks")
    logger.info("Stored %d tasks for %s", len(tasks), faucet_address)
    return resp.data[0]


async def get_faucet_tasks(faucet_address: str) -> Optional[Dict]:
    """Retrieve task list for a faucet from Supabase."""
    if not Web3.is_address(faucet_address):
        raise HTTPException(status_code=400, detail=f"Invalid faucet address: {faucet_address}")
    resp = supabase.table("faucet_tasks").select("*").eq(
        "faucet_address", Web3.to_checksum_address(faucet_address)
    ).execute()
    return resp.data[0] if resp.data else None


# ── Secret codes ──────────────────────────────────────────────────────────────

async def generate_secret_code() -> str:
    """Generate a 6-character uppercase alphanumeric secret code."""
    chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
    return "".join(secrets.choice(chars) for _ in range(6))


async def store_secret_code(
    faucet_address: str,
    secret_code: str,
    start_time: int,
    end_time: int,
) -> None:
    """Upsert a secret code record for a faucet."""
    resp = supabase.table("secret_codes").upsert(
        {
            "faucet_address": faucet_address,
            "secret_code": secret_code,
            "start_time": start_time,
            "end_time": end_time,
        },
        on_conflict="faucet_address",
    ).execute()
    if not resp.data:
        raise HTTPException(status_code=500, detail="Failed to store secret code")


async def get_secret_code_from_db(faucet_address: str) -> Optional[Dict[str, Any]]:
    """Fetch secret code record and enrich with validity flags."""
    if not Web3.is_address(faucet_address):
        raise HTTPException(status_code=400, detail=f"Invalid faucet address: {faucet_address}")
    checksum = Web3.to_checksum_address(faucet_address)
    resp = supabase.table("secret_codes").select("*").eq("faucet_address", checksum).execute()
    if not resp.data:
        return None
    rec = resp.data[0]
    now = int(datetime.now().timestamp())
    return {
        "faucet_address": rec["faucet_address"],
        "secret_code": rec["secret_code"],
        "start_time": rec["start_time"],
        "end_time": rec["end_time"],
        "is_valid": rec["start_time"] <= now <= rec["end_time"],
        "is_expired": now > rec["end_time"],
        "is_future": now < rec["start_time"],
        "created_at": rec.get("created_at"),
        "time_remaining": max(0, rec["end_time"] - now) if now <= rec["end_time"] else 0,
    }


async def get_valid_secret_code(faucet_address: str) -> Optional[str]:
    """Return the secret code string only if it's currently valid."""
    data = await get_secret_code_from_db(faucet_address)
    return data["secret_code"] if data and data["is_valid"] else None


async def get_all_secret_codes() -> List[Dict]:
    """Return all secret codes with validity flags."""
    resp = supabase.table("secret_codes").select("*").order("created_at", desc=True).execute()
    now = int(datetime.now().timestamp())
    result = []
    for row in resp.data or []:
        result.append({
            "faucet_address": row["faucet_address"],
            "secret_code": row["secret_code"],
            "start_time": row["start_time"],
            "end_time": row["end_time"],
            "is_valid": row["start_time"] <= now <= row["end_time"],
            "is_expired": now > row["end_time"],
            "is_future": now < row["start_time"],
            "created_at": row.get("created_at"),
            "time_remaining": max(0, row["end_time"] - now) if now <= row["end_time"] else 0,
        })
    return result


async def check_secret_code_status(faucet_address: str, secret_code: str) -> Dict[str, Any]:
    """Validate a secret code for a faucet; return a status dict."""
    data = await get_secret_code_from_db(faucet_address)
    if not data:
        return {"valid": False, "reason": "No secret code found", "code_exists": False}
    matches = data["secret_code"] == secret_code
    time_ok = data["is_valid"]
    reason = (
        "Valid" if matches and time_ok
        else ("Secret code does not match" if not matches
              else ("Expired" if data["is_expired"] else "Not yet active"))
    )
    return {
        "valid": matches and time_ok,
        "code_exists": True,
        "code_matches": matches,
        "time_valid": time_ok,
        "is_expired": data["is_expired"],
        "is_future": data["is_future"],
        "time_remaining": data["time_remaining"],
        "reason": reason,
    }


async def verify_secret_code(faucet_address: str, secret_code: str) -> bool:
    """Return True iff the secret code is valid for this faucet right now."""
    status = await check_secret_code_status(faucet_address, secret_code)
    return status["valid"]


# ── Deleted faucets ───────────────────────────────────────────────────────────

async def get_all_deleted_faucets() -> List[Dict]:
    try:
        resp = supabase.table("deleted_faucets").select("*").order("deleted_at", desc=True).execute()
        return resp.data or []
    except Exception as exc:
        logger.error("get_all_deleted_faucets error: %s", exc)
        return []


async def record_deleted_faucet(faucet_address: str, deleted_by: str, chain_id: int) -> Dict:
    if not Web3.is_address(faucet_address) or not Web3.is_address(deleted_by):
        raise ValueError("Invalid address format")
    data = {
        "faucet_address": Web3.to_checksum_address(faucet_address),
        "deleted_by": Web3.to_checksum_address(deleted_by),
        "chain_id": chain_id,
        "deleted_at": datetime.now().isoformat(),
    }
    resp = supabase.table("deleted_faucets").upsert(data, on_conflict="faucet_address").execute()
    if not resp.data:
        raise Exception("Failed to record deleted faucet")
    return resp.data[0]


async def is_faucet_permanently_deleted(faucet_address: str) -> bool:
    if not Web3.is_address(faucet_address):
        return False
    resp = supabase.table("deleted_faucets").select("faucet_address").eq(
        "faucet_address", Web3.to_checksum_address(faucet_address)
    ).execute()
    return len(resp.data) > 0


# ── Admin popup preferences ───────────────────────────────────────────────────

async def save_admin_popup_preference(
    user_address: str, faucet_address: str, dont_show_again: bool
) -> Dict:
    if not Web3.is_address(user_address) or not Web3.is_address(faucet_address):
        raise HTTPException(status_code=400, detail="Invalid address format")
    data = {
        "user_address": Web3.to_checksum_address(user_address),
        "faucet_address": Web3.to_checksum_address(faucet_address),
        "dont_show_admin_popup": dont_show_again,
        "updated_at": datetime.now().isoformat(),
    }
    resp = supabase.table("admin_popup_preferences").upsert(
        data, on_conflict="user_address,faucet_address"
    ).execute()
    if not resp.data:
        raise HTTPException(status_code=500, detail="Failed to save admin popup preference")
    return resp.data[0]


async def get_admin_popup_preference(user_address: str, faucet_address: str) -> bool:
    if not Web3.is_address(user_address) or not Web3.is_address(faucet_address):
        return False
    resp = supabase.table("admin_popup_preferences").select("dont_show_admin_popup").eq(
        "user_address", Web3.to_checksum_address(user_address)
    ).eq("faucet_address", Web3.to_checksum_address(faucet_address)).execute()
    return resp.data[0]["dont_show_admin_popup"] if resp.data else False


async def get_user_all_popup_preferences(user_address: str) -> List[Dict]:
    if not Web3.is_address(user_address):
        raise HTTPException(status_code=400, detail="Invalid user address")
    resp = supabase.table("admin_popup_preferences").select("*").eq(
        "user_address", Web3.to_checksum_address(user_address)
    ).execute()
    return resp.data or []


# ── Droplist ──────────────────────────────────────────────────────────────────

async def get_droplist_config() -> Optional[Dict]:
    try:
        resp = supabase.table("droplist_config").select("*").order("created_at", desc=True).limit(1).execute()
        return resp.data[0] if resp.data else None
    except Exception as exc:
        logger.error("get_droplist_config error: %s", exc)
        return None
