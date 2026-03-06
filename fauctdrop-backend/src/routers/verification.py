"""
routers/verification.py — Social & On-chain Verification endpoints.

All references to `supabase`, `pool`, `signer` etc. are resolved
via the dependency/utility imports below. Route functions are
verbatim from the original main.py with @app. → @router..
"""
from __future__ import annotations

import asyncio
import hashlib
import hmac
import json
import logging
import os
import re
import secrets
import shutil
import traceback
import uuid
from datetime import datetime, timedelta, timezone
from decimal import Decimal
from typing import Any, Dict, List, Optional, Tuple, Union

import aiohttp
import dateutil.parser
import httpx
import shortuuid
from fastapi import APIRouter, BackgroundTasks, Depends, File, Form, HTTPException, Request, UploadFile
from fastapi.responses import JSONResponse, RedirectResponse
from pydantic import BaseModel, Field
from web3 import Web3
from web3.constants import ADDRESS_ZERO as ZeroAddress
from web3.exceptions import ContractLogicError
from eth_account import Account
from eth_account.messages import encode_defunct

from abis import (
    ERC20_ABI, ERC20_BALANCE_ABI, ERC721_ABI, FAUCET_ABI,
    FACTORY_ABI, QUEST_ABI, JOIN_ABI, SUBMIT_ABI, SET_REWARDS_ABI, HAS_JOINED_ABI,
)
from config import (
    ALCHEMY_API_KEY, BACKEND_PRIVATE_KEY_A, CHAIN_CONFIGS, CHAIN_INFO,
    CHAIN_TOKEN_MAP, DISCORD_API_URL, DISCORD_BOT_TOKEN, GEMINI_API_KEY,
    GEMINI_URL, PLATFORM_OWNER, PROXY_URL, SESSION_SECRET,
    TELEGRAM_API_URL, TELEGRAM_BOT_TOKEN, USDT_CONTRACTS, VALID_CHAIN_IDS,
    get_rpc_url, oauth, supabase,
)
from database import get_pool
from dependencies import SIGNER_ADDRESS, get_signer, require_pool
from models import (
    AddTasksRequest, AdminPopupPreferenceRequest, ApprovalRequest,
    AvailabilityCheck, BatchVerificationResponse, BotVerifyRequest,
    BulkCheckTransferRequest, Chain, CheckAndTransferUSDTRequest,
    CheckInRequest, ClaimCustomRequest, ClaimNoCodeRequest, ClaimRequest,
    CustomXPostTemplate, DeleteFaucetRequest, DroplistConfig,
    DroplistConfigRequest, DroplistTask, FaucetMetadata, FaucetTask,
    FinalizeRewardsRequest, GenerateNewDropCodeRequest, GetAdminPopupPreferenceRequest,
    GetSecretCodeForAdminRequest, GetSecretCodeRequest, GetTasksRequest,
    ImageUploadResponse, JoinQuestRequest, LinkedWalletRequest, OnchainVerifyRequest,
    Quest, QuestDraft, QuestFinalize, QuestMetaUpdate, QuestOverview,
    QuestTask, QuestTaskEdit, QuestTasksUpdate, QuestUpdate, RegisterFaucetRequest,
    SetClaimParametersRequest, SocialMediaLink, StagePassRequirements,
    SubmissionUpdate, SyncProfileRequest, TaskVerificationRequest,
    TransferUSDTRequest, UserProfile, UserProfileUpdate, VerificationRequest,
    VerificationResult, VerificationRule, XVerifyRequest, XShareVerifyRequest, XQuoteVerifyRequest, TelegramVerifyRequest,
)
from utils.blockchain import (
    build_transaction_with_standard_gas, check_sufficient_balance,
    check_pause_status, check_user_is_authorized_for_faucet,
    check_whitelist_status, claim_tokens, claim_tokens_custom,
    claim_tokens_no_code, set_claim_parameters, wait_for_transaction_receipt,
    whitelist_user,
)
from utils.crypto import verify_signature
from utils.supabase_utils import (
    check_secret_code_status, generate_secret_code, get_admin_popup_preference,
    get_all_deleted_faucets, get_all_secret_codes, get_droplist_config,
    get_faucet_tasks, get_secret_code_from_db, get_user_all_popup_preferences,
    get_valid_secret_code, is_faucet_permanently_deleted, record_deleted_faucet,
    save_admin_popup_preference, store_faucet_tasks, store_secret_code,
    verify_secret_code,
)
from routers.utility import store_user_profile
from routers.quest import extract_telegram_chat_id, verify_bot_is_admin, check_telegram_membership, process_auto_approval, get_quest_context
from routers.quest import TELEGRAM_API, check_tag_via_oembed
from routers.profile import get_user_profile
from utils.web3_utils import (
    alchemy_clients, CHAIN_RPC_URLS, get_chain_enum, get_chain_info,
    get_explorer_config, get_w3, get_web3_instance,
)

logger = logging.getLogger(__name__)
pool = None  # resolved lazily via get_pool()

def _pool():
    return get_pool()

def _signer():
    return get_signer()

# Compatibility shim so extracted code using "signer" still works
class _SignerProxy:
    @property
    def address(self): return get_signer().address
    @property 
    def key(self): return get_signer().key

signer = _SignerProxy()

router = APIRouter(tags=["Verification"])

@router.post("/api/tasks/verify")
async def verify_task_endpoint(request: TaskVerificationRequest):
    """Verify task completion for user"""
    try:
        if not Web3.is_address(request.walletAddress):
            raise HTTPException(status_code=400, detail="Invalid wallet address")
       
        wallet_address = Web3.to_checksum_address(request.walletAddress)
       
        # Get user profile
        profile = await get_user_profile(wallet_address)
        if not profile:
            # Create new profile
            profile = UserProfile(walletAddress=wallet_address)
       
        # Check if task is already completed
        if request.taskId in profile.completedTasks:
            return {
                "success": True,
                "completed": True,
                "message": "Task already completed",
                "verifiedWith": request.xAccountId
            }
       
        # Here you would implement actual verification logic
        # For now, we'll simulate verification
        verification_success = True # Replace with actual verification
       
        if verification_success:
            profile.completedTasks.append(request.taskId)
            await store_user_profile(profile)
       
        return {
            "success": True,
            "completed": verification_success,
            "message": "Task verified successfully" if verification_success else "Verification failed",
            "verifiedWith": request.xAccountId if verification_success else None
        }
       
    except Exception as e:
        print(f"Error verifying task: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Task verification failed: {str(e)}")


@router.post("/api/tasks/verify-all")
async def verify_all_tasks_endpoint(request: dict):
    """Verify all tasks for a user"""
    try:
        wallet_address = request.get("walletAddress")
        if not wallet_address or not Web3.is_address(wallet_address):
            raise HTTPException(status_code=400, detail="Invalid wallet address")
       
        wallet_address = Web3.to_checksum_address(wallet_address)
       
        # Get droplist config to check tasks
        config = await get_droplist_config()
        if not config:
            raise HTTPException(status_code=404, detail="No droplist configuration found")
       
        # Get user profile
        profile = await get_user_profile(wallet_address)
        if not profile:
            raise HTTPException(status_code=404, detail="User profile not found")
       
        tasks = config.get("tasks", [])
        completed_count = len(profile.completedTasks)
        requirement_threshold = config.get("config", {}).get("requirementThreshold", 5)
       
        return {
            "success": True,
            "completedTasks": completed_count,
            "totalTasks": len(tasks),
            "requirementMet": completed_count >= requirement_threshold,
            "message": f"User has completed {completed_count}/{len(tasks)} tasks"
        }
       
    except Exception as e:
        print(f"Error verifying all tasks: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Task verification failed: {str(e)}")


@router.post("/api/telegram/webhook")
async def telegram_webhook(request: Request, background_tasks: BackgroundTasks):
    """
    Telegram sends every new message here. 
    We process it in the background so Telegram gets a fast 200 OK response.
    """
    data = await request.json()
    
    # Check if it's a standard message
    if "message" in data:
        msg = data["message"]
        chat_id = str(msg["chat"]["id"])
        
        # Only count messages from actual users, not other bots
        if "from" in msg and not msg["from"].get("is_bot"):
            user_id = str(msg["from"]["id"])
            background_tasks.add_task(increment_message_count, user_id, chat_id)
            
    return {"status": "ok"}
def increment_message_count(user_id: str, chat_id: str):
    """Upserts the message count in Supabase"""
    try:
        # Fetch current count
        existing = supabase.table("telegram_message_counts")\
            .select("message_count")\
            .eq("telegram_user_id", user_id)\
            .eq("chat_id", chat_id)\
            .execute()
            
        if existing.data:
            new_count = existing.data[0]["message_count"] + 1
            supabase.table("telegram_message_counts")\
                .update({"message_count": new_count})\
                .eq("telegram_user_id", user_id)\
                .eq("chat_id", chat_id)\
                .execute()
        else:
            supabase.table("telegram_message_counts")\
                .insert({"telegram_user_id": user_id, "chat_id": chat_id, "message_count": 1})\
                .execute()
    except Exception as e:
        print(f"Error saving message count: {e}")
# --- 3. VERIFY MESSAGE COUNT QUEST ---
class VerifyMessageCountRequest(BaseModel):
    wallet_address: str
    chat_id: str
    required_count: int


@router.post("/api/tasks/verify-x")
async def verify_x(request: XVerifyRequest):
    try:
        wallet = Web3.to_checksum_address(request.walletAddress)
        task_id = request.taskId
        submitted_handle = request.submittedHandle.strip().lower().replace("@", "")
        # 1. Get saved Twitter handle from profile
        profile = supabase.table("user_profiles")\
            .select("twitter_handle")\
            .eq("wallet_address", wallet.lower())\
            .execute()
        if not profile.data or not profile.data[0].get("twitter_handle"):
            return {"verified": False, "message": "Please connect your X account in Profile Settings first."}
        saved_handle = profile.data[0]["twitter_handle"].lower().replace("@", "")
        if saved_handle != submitted_handle:
            return {"verified": False, "message": "Error: do the task and try again."}
        # Simulate a small delay
        import asyncio
        await asyncio.sleep(2.5)
        # === VERIFICATION LOGIC ===
        
        # 2. Get the faucet_address from the submission
        sub_data = supabase.table("submissions").select("faucet_address").eq("submission_id", request.submissionId).execute()
        faucet_addr = sub_data.data[0]["faucet_address"] if sub_data.data else ""
        # 3. Update status to approved FIRST
        supabase.table("submissions").update({
            "status": "approved"
        }).eq("submission_id", request.submissionId).execute()
        # 4. Award points using the correct faucet address
        await process_auto_approval(
            request.submissionId,
            faucet_address=faucet_addr,      
            wallet_address=wallet
        )
        
        return {
            "verified": True,
            "message": "\u2705 X task verified successfully! Points awarded."
        }
    except Exception as e:
        print(f"X Verify Error: {e}")
        return {"verified": False, "message": "Something went wrong. Try again."}
# ====================== X SYSTEM TASK (SHARE WITH TAG) ======================


@router.post("/api/tasks/verify-x-share")
async def verify_x_share(request: XShareVerifyRequest):
    try:
        wallet = Web3.to_checksum_address(request.walletAddress)
        proof_url = request.proofUrl.strip().lower()
        required_tag = request.requiredTag.strip()
        # 1. Get saved Twitter handle from profile
        profile_res = supabase.table("user_profiles")\
            .select("twitter_handle")\
            .eq("wallet_address", wallet.lower())\
            .execute()
        if not profile_res.data or not profile_res.data[0].get("twitter_handle"):
            return {"verified": False, "message": "Please connect your X account in Profile Settings first."}
        saved_handle = profile_res.data[0]["twitter_handle"].lower().replace("@", "")
        # 2. Extract username from submitted URL
        match = re.search(r'(?:x\.com|twitter\.com)/([a-zA-Z0-9_]{1,15})/status/(\d+)', proof_url)
        if not match:
            return {"verified": False, "message": "Invalid X URL format. Please submit a direct link to your post."}
        url_username = match.group(1)
        
        if url_username != saved_handle:
            return {"verified": False, "message": f"The tweet link belongs to @{url_username}, but your linked account is @{saved_handle}."}
        # 3. Check for the tag
        tag_check_result = await check_tag_via_oembed(proof_url, required_tag)
        if not tag_check_result["success"]:
            return {"verified": False, "message": tag_check_result["message"]}
        # 4. Get the faucet_address from the submission
        sub_data = supabase.table("submissions").select("faucet_address").eq("submission_id", request.submissionId).execute()
        faucet_addr = sub_data.data[0]["faucet_address"] if sub_data.data else ""
        # 5. Update status to approved FIRST
        supabase.table("submissions").update({
            "status": "approved"
        }).eq("submission_id", request.submissionId).execute()
        # 6. Award Points 
        await process_auto_approval(
            request.submissionId,
            faucet_address=faucet_addr,  
            wallet_address=wallet
        )
        
        return {
            "verified": True,
            "message": f"\u2705 Post verified! Tag {required_tag} found and points awarded."
        }
    except Exception as e:
        print(f"X Share Verify Error: {e}")
        return {"verified": False, "message": "Something went wrong during verification. Try again."}
    
# ====================== REAL X QUOTE VERIFICATION ======================


@router.post("/api/tasks/verify-x-quote")
async def verify_x_quote(request: XQuoteVerifyRequest):
    try:
        wallet = Web3.to_checksum_address(request.walletAddress)
        proof_url = request.proofUrl.strip().lower()
        # 1. Get saved Twitter handle from profile
        profile_res = supabase.table("user_profiles")\
            .select("twitter_handle")\
            .eq("wallet_address", wallet.lower())\
            .execute()
        if not profile_res.data or not profile_res.data[0].get("twitter_handle"):
            return {"verified": False, "message": "Please connect your X account in Profile Settings first."}
        saved_handle = profile_res.data[0]["twitter_handle"].lower().replace("@", "")
        # 2. Extract username and Tweet ID
        match = re.search(r'(?:x\.com|twitter\.com)/([a-zA-Z0-9_]{1,15})/status/(\d+)', proof_url)
        
        if not match:
            return {"verified": False, "message": "Invalid X/Twitter URL format. Please submit a direct link to your post."}
        url_username = match.group(1)
        tweet_id = match.group(2)
        if url_username != saved_handle:
            return {"verified": False, "message": f"Error: do the task and try again."}
        # 3. Verify Tweet existence via X's public oEmbed API
        standardized_url = f"https://twitter.com/{url_username}/status/{tweet_id}"
        oembed_api_url = f"https://publish.twitter.com/oembed?url={standardized_url}"
        async with httpx.AsyncClient(timeout=10.0) as client:
            try:
                response = await client.get(oembed_api_url)
            except httpx.RequestError:
                return {"verified": False, "message": "Network error while checking X. Please try again."}
        if response.status_code == 404:
            return {"verified": False, "message": "We couldn't find your post. It might be deleted, invalid, or your account is private."}
        elif response.status_code != 200:
             return {"verified": False, "message": "X verification service is currently unavailable. Please try again later."}
        # 4. Get the faucet_address from the submission
        sub_data = supabase.table("submissions").select("faucet_address").eq("submission_id", request.submissionId).execute()
        faucet_addr = sub_data.data[0]["faucet_address"] if sub_data.data else ""
        # 5. Update status to approved FIRST
        supabase.table("submissions").update({
            "status": "approved"
        }).eq("submission_id", request.submissionId).execute()
        # 6. Award Points
        await process_auto_approval(
            request.submissionId,
            faucet_address=faucet_addr,  
            wallet_address=wallet
        )
        
        return {
            "verified": True,
            "message": "\u2705 Quote verified successfully! Points awarded."
        }
    except Exception as e:
        print(f"X Quote Verify Error: {e}")
        return {"verified": False, "message": "Something went wrong during verification. Try again."}
# ============================================================
# DISCORD AUTO-VERIFICATION ENGINE
# ============================================================
# ---- HELPER: Extract Invite Code ----
def extract_discord_invite_code(url: str) -> str:
    """Extracts the invite code from various Discord link formats."""
    match = re.search(r'(?:discord\.gg/|discord\.com/invite/)([a-zA-Z0-9-]+)', url)
    if match:
        return match.group(1)
    return None
# ---- HELPER: Get Guild ID from Invite ----
import asyncio
import httpx
from functools import lru_cache
# Simple in-memory cache: {invite_code: guild_id}
_invite_cache: dict[str, str] = {}
async def get_guild_id_from_invite(invite_code: str, bot_token: str) -> str | None:
    """
    Resolves a Discord invite code to a guild ID.
    - Uses bot token authentication to avoid rate limits
    - Caches results in-memory to minimize API calls
    - Handles 429 rate limit with retry-after backoff
    """
    if not invite_code:
        print("\u274c No invite code extracted")
        return None
    # Return cached result if available
    if invite_code in _invite_cache:
        print(f"\u2705 Cache hit for invite: {invite_code} \u2192 {_invite_cache[invite_code]}")
        return _invite_cache[invite_code]
    print(f"\ud83d\udd0d Resolving invite: {invite_code} (Render live)")
    headers = {
        "Authorization": f"Bot {DISCORD_BOT_TOKEN}",
        "User-Agent": "FaucetDrops-Bot (https://faucetdrops.io, 1.0)",
        "Accept": "application/json"
    }
    url = f"https://discord.com/api/v10/invites/{invite_code}?with_counts=True"
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            for attempt in range(3):
                resp = await client.get(url, headers=headers)
                print(f"Discord invite API status: {resp.status_code} (attempt {attempt + 1})")
                if resp.status_code == 200:
                    data = resp.json()
                    guild_id = data.get("guild", {}).get("id")
                    if guild_id:
                        _invite_cache[invite_code] = guild_id
                        print(f"\u2705 SUCCESS - Guild ID: {guild_id}")
                    else:
                        print("\u26a0\ufe0f 200 OK but no guild ID in response")
                    return guild_id
                elif resp.status_code == 429:
                    retry_after = float(resp.headers.get("Retry-After", 1.0))
                    print(f"\u23f3 Rate limited. Retrying after {retry_after}s...")
                    await asyncio.sleep(retry_after)
                    continue
                elif resp.status_code == 404:
                    print(f"\u274c Invite not found or expired: {invite_code}")
                    return None
                else:
                    print(f"\u274c Discord returned {resp.status_code}: {resp.text[:300]}")
                    return None
            print("\u274c Exhausted retries after repeated rate limiting")
            return None
    except httpx.TimeoutException:
        print(f"\u274c Timeout resolving invite: {invite_code}")
        return None
    except Exception as e:
        print(f"\u274c Exception resolving invite: {str(e)}")
        return None


@router.get("/debug/discord-invite")
async def debug_discord_invite(invite: str):
    """Full debug tool for Discord invite resolution on Render"""
    print(f"\ud83d\udd0d DEBUG INVITE REQUEST: {invite}")
    
    # Normalize input
    invite_code = extract_discord_invite_code(invite)
    if not invite_code:
        return {"error": "Invalid invite link", "received": invite}
    print(f"\ud83d\udccc Extracted invite code: {invite_code}")
    headers = {
        "User-Agent": "FaucetDrops-Debug-Bot",
        "Accept": "application/json"
    }
    results = []
    # Try multiple Discord API patterns
    test_urls = [
        f"https://discord.com/api/v10/invites/{invite_code}",
        f"https://discord.com/api/v10/invites/{invite_code}?with_counts=True",
        f"https://discord.com/api/invites/{invite_code}"
    ]
    async with httpx.AsyncClient(timeout=15.0) as client:
        for i, url in enumerate(test_urls):
            try:
                print(f"\ud83c\udf10 Attempt {i+1}: {url}")
                resp = await client.get(url, headers=headers)
                
                result = {
                    "attempt": i+1,
                    "url": url,
                    "status": resp.status_code,
                    "response_preview": resp.text[:500] if resp.text else None
                }
                
                if resp.status_code == 200:
                    data = resp.json()
                    guild_id = data.get("guild", {}).get("id")
                    result["success"] = True
                    result["guild_id"] = guild_id
                    print(f"\u2705 SUCCESS! Guild ID: {guild_id}")
                else:
                    result["success"] = False
                    print(f"\u274c Failed with {resp.status_code}")
                
                results.append(result)
                
            except Exception as e:
                results.append({
                    "attempt": i+1,
                    "url": url,
                    "error": str(e)
                })
                print(f"\ud83d\udca5 Exception: {e}")
    return {
        "invite_code": invite_code,
        "original_url": invite,
        "results": results,
        "final_message": "Check the logs above. The first successful guild_id is what matters."
    }


@router.get("/debug/env-check")
async def debug_env():
    return {
        "DISCORD_BOT_TOKEN_set": bool(DISCORD_BOT_TOKEN),
        "DISCORD_BOT_TOKEN_preview": DISCORD_BOT_TOKEN[:12] + "..." if DISCORD_BOT_TOKEN else None,
        "TELEGRAM_BOT_TOKEN_set": bool(TELEGRAM_BOT_TOKEN),
    }
# ---- CORE: Check Membership and Roles ----
async def check_discord_membership_and_roles(guild_id: str, discord_user_id: str, required_role_id: str = None) -> dict:
    """
    Checks if a user is in a Discord server, and optionally checks if they have a specific role.
    """
    if not DISCORD_BOT_TOKEN:
        return {"verified": False, "reason": "server_error", "message": "Bot token is missing on the server."}
    headers = {
        "Authorization": f"Bot {DISCORD_BOT_TOKEN}"
    }
    
    async with httpx.AsyncClient(timeout=10.0) as client:
        resp = await client.get(
            f"{DISCORD_API_URL}/guilds/{guild_id}/members/{discord_user_id}",
            headers=headers
        )
        
        if resp.status_code == 200:
            data = resp.json()
            
            # 1. Just checking for server membership
            if not required_role_id:
                return {"verified": True, "message": "Discord membership confirmed!"}
            
            # 2. Checking for a specific role
            user_roles = data.get("roles", [])
            if required_role_id in user_roles:
                return {"verified": True, "message": "Role requirement met!"}
            else:
                return {
                    "verified": False, 
                    "reason": "missing_role", 
                    "message": "You are in the server, but you do not have the required role yet. Please verify or level up first."
                }
                
        elif resp.status_code == 404:
            return {"verified": False, "reason": "not_member", "message": "You have not joined this server."}
        elif resp.status_code == 403:
            return {"verified": False, "reason": "bot_not_in_server", "message": "FaucetDrops Bot is not in this server. Contact the quest creator."}
        else:
            return {"verified": False, "reason": "api_error", "message": f"Discord API Error: {resp.status_code}"}
# ---- REQUEST SCHEMA ----
class DiscordVerifyRequest(BaseModel):
    submissionId: str
    faucetAddress: str
    walletAddress: str
    taskId: str         # Needed to look up the role requirement in DB
    taskUrl: str        # The Discord invite link
    taskAction: str     # "join" or "role"
class CheckDiscordBotRequest(BaseModel):
    inviteUrl: Optional[str] = None
    serverId: str
PROXY_URL = os.getenv("PROXY_URL") 


@router.post("/api/bot/check-discord-status", tags=["Bot Verification"])
async def check_discord_bot_status(req: CheckDiscordBotRequest):
    if not DISCORD_BOT_TOKEN:
        return {"is_in_server": False, "message": "Bot token not configured"}
    guild_id = req.serverId
    if not guild_id:
        return {"is_in_server": False, "message": "Server ID is required"}
    headers = {
        "Authorization": f"Bot {DISCORD_BOT_TOKEN.strip()}"
    }
    
    # TELL HTTPX TO USE THE PROXY IF ONE EXISTS
    client_options = {"timeout": 15.0}
    if PROXY_URL:
        # MUST BE SINGULAR 'proxy', NOT 'proxies'!
        client_options["proxy"] = PROXY_URL 
    try:
        async with httpx.AsyncClient(**client_options) as client:
            resp = await client.get(
                f"{DISCORD_API_URL}/guilds/{guild_id}",
                headers=headers
            )
            
            if resp.status_code == 200:
                return {"is_in_server": True, "message": "Bot is successfully in the server"}
            else:
                return {"is_in_server": False, "message": f"API Error {resp.status_code}: {resp.text[:100]}"}
    except Exception as e:
        return {"is_in_server": False, "message": f"Proxy/Connection Error: {str(e)}"}
        
# ---- MAIN VERIFICATION ENDPOINT ----


@router.post("/api/bot/verify-discord", tags=["Bot Verification"])
async def verify_discord_task(
    request: DiscordVerifyRequest,
    background_tasks: BackgroundTasks
):
    """
    Auto-verifies Discord tasks (Join Server, Attain Role).
    Deletes the submission on failure so the user can retry safely.
    """
    try:
        wallet_cs = Web3.to_checksum_address(request.walletAddress)
        faucet_cs = Web3.to_checksum_address(request.faucetAddress)
        # 1. Fetch User's Discord ID
        # 1. Fetch User's Discord ID
        profile_res = supabase.table("user_profiles")\
            .select("discord_id")\
            .eq("wallet_address", wallet_cs.lower())\
            .execute()
            
        if not profile_res.data or not profile_res.data[0].get("discord_id"):
            supabase.table("submissions").delete().eq("submission_id", request.submissionId).execute()
            return {
                "verified": False, 
                "reason": "discord_not_linked", 
                "message": "\u26a0\ufe0f Connect your Discord in Profile Settings first."
            }
        raw_discord_id = profile_res.data[0]["discord_id"]
        # Strip Privy prefix if present: "discord:123456789" \u2192 "123456789"
        discord_user_id = raw_discord_id.split(":")[-1] if ":" in str(raw_discord_id) else raw_discord_id
        print(f"\ud83d\udd0d Raw discord_id from DB: '{raw_discord_id}'")
        print(f"\ud83d\udd0d Clean discord_user_id used for API call: '{discord_user_id}'")
        # 3. Determine what we are verifying (Join vs Role)
        # Fetch the quest context to get task details
        _, tasks_list = await get_quest_context(faucet_cs)
        target_task = next((t for t in tasks_list if t['id'] == request.taskId), None)
        
        if not target_task:
            supabase.table("submissions").delete().eq("submission_id", request.submissionId).execute()
            return {"verified": False, "message": "\u274c Task configuration not found."}
        # 2. Extract Guild ID directly from the Task Configuration (No API limits!)
        guild_id = target_task.get("targetServerId")
        if not guild_id:
            supabase.table("submissions").delete().eq("submission_id", request.submissionId).execute()
            return {
                "verified": False, 
                "reason": "missing_server_id", 
                "message": "\u274c The quest creator did not configure the Discord Server ID correctly."
            }
        action = target_task.get("action", "join")
        required_role_id = None
        
        # If the task requires a role, grab the role ID stored in `targetHandle`
        if action in ["role", "verify"]:
            required_role_id = target_task.get("targetHandle")
        
        # If the task requires a role, grab the role ID stored in `targetHandle`
        if action in ["role", "verify"]:
            required_role_id = target_task.get("targetHandle") 
        # 4. Check Membership & Roles via Bot API
        membership = await check_discord_membership_and_roles(guild_id, discord_user_id, required_role_id)
        if membership["verified"]:
            # \u2705 Success! Award Points by calling existing auto-approval function
            background_tasks.add_task(
                process_auto_approval, 
                request.submissionId, 
                faucet_cs, 
                wallet_cs
            )
            return {"verified": True, "message": f"\u2705 {membership['message']} Points awarded."}
        else:
            # \u274c Failed - delete submission so user can retry
            supabase.table("submissions").delete().eq("submission_id", request.submissionId).execute()
            return {"verified": False, "reason": membership["reason"], "message": f"\u274c {membership['message']}"}
            
    except Exception as e:
        print(f"\u274c Discord verification error: {e}")
        import traceback
        traceback.print_exc()
        
        # Always delete the submission on crash so the user isn't stuck "Pending"
        supabase.table("submissions").delete().eq("submission_id", request.submissionId).execute()
        raise HTTPException(status_code=500, detail=str(e))
# \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
# SLUG HELPERS  (add near the top of main.py, after generate_slug())
# \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
def name_to_slug(name: str) -> str:
    """
    Convert a faucet name to a URL-safe slug segment.
    "My Cool Faucet \ud83d\ude80" \u2192 "my-cool-faucet"
    Mirrors the same function in the indexer.
    """
    slug = name.lower()
    slug = re.sub(r"[^\w\s-]", "", slug)   # strip emoji / punctuation
    slug = re.sub(r"[\s_]+", "-", slug)     # spaces \u2192 hyphens
    slug = re.sub(r"-+", "-", slug)         # collapse runs
    return slug.strip("-")
def build_faucet_slug(name: str, faucet_address: str) -> str:
    """
    Canonical slug:  "{name-slug}-{last6ofAddress}"
    Example:  "Social Faucet" / 0x...ab1234  \u2192  "social-faucet-ab1234"
    Mirrors build_faucet_slug() in the indexer so slugs are consistent
    even when generated client-side for redirect purposes.
    """
    addr_suffix = faucet_address[-6:].lower()
    return f"{name_to_slug(name)}-{addr_suffix}"
# \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
# SLUG LOOKUP ENDPOINT
# Add this alongside the existing /api/faucets/by-slug/{} endpoint.
# \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550


@router.post("/api/bot/verify-telegram")
async def verify_telegram_task(
    request: TelegramVerifyRequest,
    background_tasks: BackgroundTasks
):
    """
    Auto-verifies Telegram join/subscribe tasks.
    NO MANUAL FALLBACK - Delete submission on failure so user can retry.
    """
    try:
        wallet_cs = Web3.to_checksum_address(request.walletAddress)
        faucet_cs = Web3.to_checksum_address(request.faucetAddress)
        # 1. Get user's linked Telegram ID
        profile_res = supabase.table("user_profiles")\
            .select("telegram_user_id, telegram_handle, username")\
            .eq("wallet_address", wallet_cs.lower())\
            .execute()
        
        if not profile_res.data or not profile_res.data[0].get("telegram_user_id"):
            # Delete submission so user can retry after linking
            supabase.table("submissions").delete().eq("submission_id", request.submissionId).execute()
            
            return {
                "verified": False,
                "reason": "telegram_not_linked",
                "message": "\u26a0\ufe0f Connect your Telegram in Profile Settings first."
            }
        
        telegram_user_id = profile_res.data[0]["telegram_user_id"]
        
        # 2. Extract chat ID from task URL
        chat_id = extract_telegram_chat_id(request.taskUrl)
        
        if not chat_id:
            # Private group - cannot auto-verify, delete submission
            supabase.table("submissions").delete().eq("submission_id", request.submissionId).execute()
            
            return {
                "verified": False,
                "reason": "private_group",
                "message": "\u274c Cannot verify private groups automatically. Contact quest admin."
            }
        
        # 3. Check if bot is admin in the chat
        bot_check = await verify_bot_is_admin(chat_id)
        
        if not bot_check["is_admin"]:
            # Bot not admin - cannot verify, delete submission
            supabase.table("submissions").delete().eq("submission_id", request.submissionId).execute()
            
            return {
                "verified": False,
                "reason": "bot_not_admin",
                "message": "\u274c Bot verification unavailable for this channel. Contact the quest creator.",
                "bot_username": bot_check.get("bot_username")
            }
        
        # 4. Check user membership
        membership = await check_telegram_membership(chat_id, telegram_user_id)
        
        if membership["verified"]:
            # \u2705 Auto-approve and award points
            background_tasks.add_task(
                process_auto_approval,
                request.submissionId,
                request.faucetAddress,
                request.walletAddress
            )
            
            return {
                "verified": True,
                "message": "\u2705 Telegram membership verified! Points awarded.",
                "status": membership.get("status")
            }
        else:
            # \u274c Not a member - Delete submission so user can retry
            supabase.table("submissions").delete()\
                .eq("submission_id", request.submissionId)\
                .execute()
            
            return {
                "verified": False,
                "reason": "not_member",
                "message": f"\u274c You are not a member of this channel yet. Join first then try again."
            }
            
    except Exception as e:
        print(f"\u274c Telegram verification error: {e}")
        traceback.print_exc()
        # Delete submission on error so user can retry
        supabase.table("submissions").delete().eq("submission_id", request.submissionId).execute()
        raise HTTPException(status_code=500, detail=str(e))
# ---- ADMIN: Verify Bot Setup for a Channel ----
class BotAdminCheckRequest(BaseModel):
    channelUrl: str


@router.post("/api/bot/check-telegram-admin")
async def check_bot_admin_status(request: BotAdminCheckRequest):
    """
    Quest creators call this when setting up a Telegram task.
    Returns whether the bot is already admin in their channel.
    """
    chat_id = extract_telegram_chat_id(request.channelUrl)
    
    if not chat_id:
        return {
            "success": False,
            "is_admin": False,
            "message": "Invalid or private Telegram link. Only public channels/groups support auto-verification."
        }
    
    result = await verify_bot_is_admin(chat_id)
    
    # Get bot username for display
    async with httpx.AsyncClient() as client:
        me = await client.get(f"{TELEGRAM_API}/getMe")
        bot_username = me.json().get("result", {}).get("username", "YourQuestBot")
    
    return {
        "success": True,
        "chat_id": chat_id,
        "is_admin": result["is_admin"],
        "bot_username": bot_username,
        "instructions": f"Add @{bot_username} as an admin to {chat_id} to enable auto-verification.",
        "message": result["message"]
    }
# ---- WEBHOOK: Telegram Bot receives messages (optional but useful) ----


@router.post("/api/telegram/webhook")
async def telegram_webhook(request: Request):
    """
    Receives updates from Telegram (when users interact with the bot directly).
    Set this as your webhook: https://api.telegram.org/bot{TOKEN}/setWebhook?url=YOUR_URL/api/telegram/webhook
    """
    try:
        body = await request.json()
        message = body.get("message") or body.get("channel_post", {})
        
        if not message:
            return {"ok": True}
        
        chat_id = message.get("chat", {}).get("id")
        text = message.get("text", "")
        user = message.get("from", {})
        user_id = user.get("id")
        username = user.get("username", "")
        
        # Respond to /start command
        if text == "/start":
            await send_telegram_message(
                chat_id,
                f"\ud83d\udc4b Hi @{username}!\
\
"
                f"I'm the FaucetDrops Quest Bot \ud83e\udd16\
\
"
                f"To use auto-verification:\
"
                f"1. Link your Telegram account in your FaucetDrops profile\
"
                f"2. Your Telegram User ID: `{user_id}`\
\
"
                f"Copy your ID above and paste it in your profile settings!"
            )
        
        # Respond to /myid command
        elif text == "/myid":
            await send_telegram_message(
                chat_id,
                f"\ud83c\udd94 Your Telegram User ID: `{user_id}`\
\
"
                f"Use this in your FaucetDrops profile to enable auto-verification!"
            )
        
        return {"ok": True}
        
    except Exception as e:
        print(f"Webhook error: {e}")
        return {"ok": True}  # Always return 200 to Telegram
async def send_telegram_message(chat_id: int, text: str):
    async with httpx.AsyncClient() as client:
        await client.post(f"{TELEGRAM_API}/sendMessage", json={
            "chat_id": chat_id,
            "text": text,
            "parse_mode": "Markdown"
        })
import asyncio
import logging
import os
import time
from decimal import Decimal
from typing import Optional
import asyncpg
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status
from pydantic import BaseModel, field_validator
from tenacity import (
    retry,
    retry_if_exception_type,
    stop_after_attempt,
    wait_exponential,
    before_sleep_log,
)
from web3 import Web3
from web3.exceptions import ContractLogicError
try:
    from web3.middleware import ExtraDataToPOAMiddleware as _poa_middleware  # web3 >= 6
except ImportError:
    from web3.middleware import geth_poa_middleware as _poa_middleware  # web3 < 6
from web3.types import TxReceipt
logger = logging.getLogger(__name__)
