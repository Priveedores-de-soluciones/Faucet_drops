"""
routers/profile.py — User Profiles endpoints.

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
    VerificationResult, VerificationRule,
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

router = APIRouter(tags=["Profile"])

@router.get("/api/check-name")
async def check_quest_name_availability(name: str):
    """
    Checks if a Quest Name (title) already exists in the database.
    Used by the frontend to provide real-time validation.
    """
    try:
        clean_name = name.strip()
        
        if not clean_name or len(clean_name) < 3:
            return {
                "exists": False, 
                "valid": False, 
                "message": "Name must be at least 3 characters"
            }
        # Query Supabase 'quests' table
        # We use .ilike() for case-insensitive matching to prevent duplicate confusion
        response = supabase.table("quests")\
            .select("title")\
            .ilike("title", clean_name)\
            .execute()
        # If we get any rows back, the name exists
        exists = len(response.data) > 0
        return {
            "exists": exists,
            "valid": True,
            "message": "Name is already taken" if exists else "Name is available"
        }
    except Exception as e:
        print(f"\ud83d\udca5 Error checking name availability: {str(e)}")
        # Don't block the UI on error, just assume valid but log it
        return {"exists": False, "valid": True, "error": str(e)}


@router.get("/api/profile/user/{identifier}")
async def get_user_profile(identifier: str):
    """
    Smart endpoint: Search by Username OR Wallet Address.
    """
    try:
        # 1. Try searching by Wallet Address first (Exact Match)
        # We assume identifiers starting with '0x' are wallets
        if identifier.startswith("0x") and len(identifier) == 42:
            response = supabase.table("user_profiles")\
                .select("*")\
                .eq("wallet_address", identifier.lower())\
                .execute()
        else:
            # 2. Otherwise, treat as Username (Case Insensitive)
            response = supabase.table("user_profiles")\
                .select("*")\
                .ilike("username", identifier)\
                .execute()
        
        if not response.data:
            raise HTTPException(status_code=404, detail="User not found")
            
        return {"success": True, "profile": response.data[0]}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/api/profile/user/{username}")
async def get_profile_by_username(username: str):
    """
    Used for shareable links. Finds a profile by username string.
    """
    try:
        # Search case-insensitive
        response = supabase.table("user_profiles")\
            .select("*")\
            .ilike("username", username)\
            .execute()
        
        if not response.data:
            raise HTTPException(status_code=404, detail="User not found")
            
        return {
            "success": True, 
            "profile": response.data[0]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/api/profile/update")
async def update_user_profile(request: UserProfileUpdate):
    try:
        # 1. Standardize the address
        wallet_address = Web3.to_checksum_address(request.wallet_address)
        wallet_lower = wallet_address.lower()
        
        # 2. Security: Verify signature
        if not verify_signature(wallet_address, request.message, request.signature):
            raise HTTPException(status_code=401, detail="Invalid signature. You are not the owner of this wallet.")
        # =========================================================
        # 3. Check All Unique Fields (Username, Email, Twitter)
        # =========================================================
        def check_is_taken(column, value):
            if not value: return False # Skip empty fields
            existing = supabase.table("user_profiles").select("wallet_address").eq(column, value).execute()
            if existing.data:
                found_wallet = existing.data[0]['wallet_address']
                if found_wallet.lower() != wallet_lower:
                    return True
            return False
        # Run the checks
        if check_is_taken("username", request.username):
            raise HTTPException(status_code=400, detail="Username is already taken.")
        if check_is_taken("email", request.email):
            raise HTTPException(status_code=400, detail="Email is already used by another account.")
        if check_is_taken("twitter_handle", request.twitter_handle):
            raise HTTPException(status_code=400, detail="Twitter handle is already linked to another account.")
        # =========================================================
        # 4. Prepare data (NOW INCLUDES TELEGRAM_USER_ID)
        # =========================================================
        # 4. Prepare data
        profile_data = {
            "wallet_address": wallet_lower,
            "username": request.username, 
            "email": request.email,
            "bio": request.bio,
            "avatar_url": request.avatar_url,
            
            # Save Handles
            "twitter_handle": request.twitter_handle,
            "discord_handle": request.discord_handle,
            "telegram_handle": request.telegram_handle,
            "farcaster_handle": request.farcaster_handle,
            
            # Save Permanent IDs
            "telegram_user_id": request.telegram_user_id,
            "twitter_id": request.twitter_id,      # <--- SAVE IT HERE
            "discord_id": request.discord_id,      # <--- SAVE IT HERE
            "farcaster_id": request.farcaster_id,  # <--- SAVE IT HERE
            
            "updated_at": datetime.now().isoformat()
        }
        # 5. Upsert
        response = supabase.table("user_profiles").upsert(
            profile_data, 
            on_conflict="wallet_address"
        ).execute()
        # 5. Upsert
        response = supabase.table("user_profiles").upsert(
            profile_data, 
            on_conflict="wallet_address"
        ).execute()
        
        return {
            "success": True, 
            "message": "Profile updated successfully", 
            "profile": response.data[0]
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"\ud83d\udca5 Update Error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Server error: {str(e)}")


@router.post("/api/profile/check-availability")
async def check_availability(check: AvailabilityCheck):
        try:
            # 2. Map frontend field names to DB column names (if they differ)
            # This prevents SQL injection or invalid column errors
            field_map = {
                "username": "username",
                "email": "email",
                "twitter_handle": "twitter_handle",
                "discord_handle": "discord_handle",
                "telegram_handle": "telegram_handle",
                "farcaster_handle": "farcaster_handle"
            }
            
            if check.field not in field_map:
                return {"available": True} # Unknown field, ignore check
            db_column = field_map[check.field]
            check_value = check.value.strip()
            
            # Standardize the incoming wallet to lowercase for comparison
            requesting_wallet = check.current_wallet.lower() if check.current_wallet else ""
            # 3. QUERY: Find ANY record with this specific value
            # We select the 'wallet_address' so we can identify the owner
            response = supabase.table("user_profiles")\
                .select("wallet_address")\
                .ilike(db_column, check_value)\
                .execute()
            # 4. LOGIC: Analyze the result
            if response.data:
                # We found a record! Now, who owns it?
                owner_wallet = response.data[0]['wallet_address'].lower()
                # COMPARE: Is the owner the same person making the request?
                if owner_wallet == requesting_wallet:
                    # YES -> It's me! I am allowed to keep my own username.
                    return {"available": True}
                else:
                    # NO -> It belongs to someone else.
                    return {
                        "available": False, 
                        "message": f"This {check.field.replace('_', ' ')} is already taken."
                    }
            # 5. No record found -> Totally new and available
            return {"available": True}
        except Exception as e:
            print(f"Check Error: {e}")
            # Default to True on error to avoid blocking the UI
            return {"available": True}
        
# API Endpoints


@router.get("/api/users/{wallet_address}", tags=["User Management"])
async def get_user_profile_endpoint(wallet_address: str):
    """Get user profile"""
    try:
        profile = await get_user_profile(wallet_address)
       
        if not profile:
            raise HTTPException(status_code=404, detail="User profile not found")
       
        # FIX: Simply return the profile. 
        # Since it's already a dict, FastAPI will automatically 
        # serialize it to JSON for you.
        return profile
       
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error getting user profile: {str(e)}")
        # It's helpful to keep this print for debugging
        raise HTTPException(status_code=500, detail=f"Failed to get user profile: {str(e)}")@router.post("/api/users")
async def create_user_profile_endpoint(profile: UserProfile):
    """Create new user profile"""
    try:
        if not Web3.is_address(profile.walletAddress):
            raise HTTPException(status_code=400, detail="Invalid wallet address")
       
        profile.walletAddress = Web3.to_checksum_address(profile.walletAddress)
       
        result = await store_user_profile(profile)
       
        return {
            "success": True,
            "message": "User profile created",
            "data": result
        }
       
    except Exception as e:
        print(f"Error creating user profile: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to create user profile: {str(e)}")


@router.post("/api/x-accounts/auth/initiate")
async def initiate_x_auth(request: dict):
    """Initiate X OAuth flow"""
    # Implement X OAuth initiation
    # This would typically involve generating OAuth tokens and redirecting to X
    return {
        "authUrl": "https://api.twitter.com/oauth/authenticate?oauth_token=example",
        "state": "example_state"
    }


@router.put("/api/x-accounts/{account_id}")
async def update_x_account(account_id: str, request: dict):
    """Update X account status"""
    # Implement X account status update
    return {
        "success": True,
        "message": "Account status updated"
    }
# --- QUEST MANAGEMENT ENDPOINTS (UPDATED) ---


@router.get("/api/profile/{wallet_address}")
async def get_user_profile_data(wallet_address: str):
    """
    Called by the Wallet Button. 
    Standardizes the address to lowercase to find the user.
    """
    try:
        # Standardize input
        search_address = wallet_address.lower()
        
        # Query Supabase
        response = supabase.table("user_profiles")\
            .select("*")\
            .eq("wallet_address", search_address)\
            .execute()
        
        if response.data and len(response.data) > 0:
            # Found the user! Return their custom username
            return {"success": True, "profile": response.data[0]}
        else:
            # User truly doesn't have a profile yet
            return {"success": True, "profile": None, "message": "New User"}
            
    except Exception as e:
        print(f"Error in wallet profile fetch: {e}")
        raise HTTPException(status_code=500, detail="Database error")


@router.post("/api/profile/sync")
async def sync_profile(req: SyncProfileRequest):
    try:
        wallet = req.wallet_address.lower()
        
        # 1. Check if user already exists
        existing = supabase.table("user_profiles").select("*").eq("wallet_address", wallet).execute()
        if existing.data:
            return {"success": True, "profile": existing.data[0]}
        
        # 2. Check if the fallback username is already taken by someone else
        username_check = supabase.table("user_profiles").select("username").eq("username", req.username).execute()
        
        final_username = req.username
        if username_check.data:
            # If taken, append the last 4 characters of their wallet to make it unique
            final_username = f"{req.username}_{wallet[-4:]}"
        
        # 3. Create the new profile
        new_profile = {
            "wallet_address": wallet,
            "username": final_username,
            "avatar_url": req.avatar_url,
            "email": req.email
        }
        
        insert_res = supabase.table("user_profiles").insert(new_profile).execute()
        return {"success": True, "profile": insert_res.data[0]}
        
    except Exception as e:
        print(f"Error auto-syncing profile: {e}")
        return {"success": False, "error": str(e)}
