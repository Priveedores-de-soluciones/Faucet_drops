"""
routers/faucet.py — Faucet, Claims & Droplist endpoints.

All references to `supabase`, `pool`, `signer` etc. are resolved
via the dependency/utility imports below. Route functions are
verbatim from the original main.py with @app. → @router..
"""
from __future__ import annotations

import asyncio
import asyncpg
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
from routers.utility import check_platform_owner_authorization, store_droplist_config, generate_new_drop_code_only, store_user_profile
from routers.profile import get_user_profile
from routers.quest import generate_slug
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

router = APIRouter(tags=["Faucet"])

@router.post("/upload-image", response_model=ImageUploadResponse)
async def upload_faucet_image(file: UploadFile = File(...)):
    """Upload faucet image to Supabase Storage"""
    try:
        # Validate file type
        allowed_types = ["image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp"]
        if file.content_type not in allowed_types:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid file type. Allowed types: {', '.join(allowed_types)}"
            )
       
        # Read file content
        contents = await file.read()
       
        # Validate file size (5MB max)
        max_size = 5 * 1024 * 1024 # 5MB
        if len(contents) > max_size:
            raise HTTPException(
                status_code=400,
                detail="File too large. Maximum size is 5MB"
            )
       
        # Generate unique filename
        file_extension = file.filename.split(".")[-1] if "." in file.filename else "png"
        unique_filename = f"faucet-images/{uuid.uuid4()}.{file_extension}"
       
        # Upload to Supabase Storage
        response = supabase.storage.from_("faucet-assets").upload(
            path=unique_filename,
            file=contents,
            file_options={
                "content-type": file.content_type,
                "cache-control": "3600",
                "upsert": "False"
            }
        )
       
        # Get public URL
        public_url = supabase.storage.from_("faucet-assets").get_public_url(unique_filename)
       
        print(f"\u2705 Uploaded image: {unique_filename}")
       
        return {
            "success": True,
            "imageUrl": public_url,
            "message": "Image uploaded successfully"
        }
       
    except HTTPException:
        raise
    except Exception as e:
        print(f"\ud83d\udca5 Error uploading image: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to upload image: {str(e)}")


@router.delete("/delete-image")
async def delete_faucet_image(image_url: str):
    """Delete faucet image from Supabase Storage"""
    try:
        # Extract filename from URL
        # URL format: https://[project].supabase.co/storage/v1/object/public/faucet-assets/faucet-images/[uuid].[ext]
        filename = image_url.split("/faucet-assets/")[-1]
       
        # Delete from Supabase Storage
        response = supabase.storage.from_("faucet-assets").remove([filename])
       
        print(f"\u2705 Deleted image: {filename}")
       
        return {
            "success": True,
            "message": "Image deleted successfully"
        }
       
    except Exception as e:
        print(f"\ud83d\udca5 Error deleting image: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to delete image: {str(e)}")
# Initialize the analytics manager
# API Endpoints


@router.post("/faucet-x-template")
async def save_faucet_x_template(request: CustomXPostTemplate):
    """Save custom X post template for a faucet"""
    try:
        if not Web3.is_address(request.faucetAddress):
            raise HTTPException(status_code=400, detail="Invalid faucet address")
       
        faucet_address = Web3.to_checksum_address(request.faucetAddress)
        user_address = Web3.to_checksum_address(request.userAddress)
       
        # Validate user is authorized (similar to add-faucet-tasks)
        w3 = await get_web3_instance(request.chainId)
        is_authorized = await check_user_is_authorized_for_faucet(w3, faucet_address, user_address)
       
        if not is_authorized:
            raise HTTPException(
                status_code=403,
                detail="Access denied. User must be owner, admin, or backend address."
            )
       
        data = {
            "faucet_address": faucet_address,
            "x_post_template": request.template,
            "created_by": user_address,
            "created_at": datetime.now().isoformat(),
            "updated_at": datetime.now().isoformat()
        }
       
        # Upsert template
        response = supabase.table("faucet_x_templates").upsert(
            data,
            on_conflict="faucet_address"
        ).execute()
       
        if not response.data:
            raise HTTPException(status_code=500, detail="Failed to store X post template")
       
        print(f"\u2705 Stored X post template for faucet {faucet_address}")
       
        return {
            "success": True,
            "faucetAddress": faucet_address,
            "message": "X post template saved successfully"
        }
       
    except HTTPException:
        raise
    except Exception as e:
        print(f"\ud83d\udca5 Error saving X post template: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to save template: {str(e)}")
# --- NEW API ENDPOINT: DELETE FAUCET METADATA ---
# In main.py


@router.post("/delete-faucet-metadata") 
async def delete_faucet_metadata_endpoint(request: DeleteFaucetRequest):
    try:
        # 1. Use Checksum for Web3 verification (Security)
        faucet_address_checksum = Web3.to_checksum_address(request.faucetAddress)
        user_address_checksum = Web3.to_checksum_address(request.userAddress)
        
        # 2. Verify authorization using the checksummed address
        w3 = await get_web3_instance(request.chainId)
        is_authorized = await check_user_is_authorized_for_faucet(w3, faucet_address_checksum, user_address_checksum)
        
        if not is_authorized:
            raise HTTPException(status_code=403, detail="Access denied.")
        
        # 3. CONVERT TO LOWERCASE FOR DATABASE OPERATIONS
        # This ensures we match the format stored in 'userfaucets'
        faucet_address_lower = request.faucetAddress.lower()
        # 4. Perform the Deletions using LOWERCASE address
        # Delete from userfaucets (The one showing in dashboard)
        supabase.table("userfaucets").delete().eq("faucet_address", faucet_address_lower).execute()
        
        # Clean up other metadata
        supabase.table("faucet_metadata").delete().eq("faucet_address", faucet_address_lower).execute()
        supabase.table("faucet_tasks").delete().eq("faucet_address", faucet_address_lower).execute()
        supabase.table("faucet_x_templates").delete().eq("faucet_address", faucet_address_lower).execute()
        # 5. Record deletion (Optional: store as checksum or lower, depending on preference)
        await record_deleted_faucet(faucet_address_checksum, user_address_checksum, request.chainId)
        
        return {
            "success": True,
            "faucetAddress": faucet_address_checksum,
            "message": "Faucet marked as deleted and metadata cleaned up."
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"\ud83d\udca5 Error processing deletion: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to delete metadata: {str(e)}")


@router.get("/faucet-x-template/{faucetAddress}")
async def get_faucet_x_template(faucetAddress: str):
    """Get custom X post template for a faucet"""
    try:
        if not Web3.is_address(faucetAddress):
            raise HTTPException(status_code=400, detail="Invalid faucet address")
       
        faucet_address = Web3.to_checksum_address(faucetAddress)
       
        response = supabase.table("faucet_x_templates").select("*").eq(
            "faucet_address", faucet_address
        ).execute()
       
        if response.data and len(response.data) > 0:
            return {
                "success": True,
                "faucetAddress": faucet_address,
                "template": response.data[0]["x_post_template"],
                "createdBy": response.data[0].get("created_by"),
                "createdAt": response.data[0].get("created_at"),
                "updatedAt": response.data[0].get("updated_at")
            }
       
        # Return default template if none exists
        return {
            "success": True,
            "faucetAddress": faucet_address,
            "template": None,
            "message": "No custom template found, will use default"
        }
       
    except HTTPException:
        raise
    except Exception as e:
        print(f"\ud83d\udca5 Error getting X post template: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get template: {str(e)}")


@router.delete("/faucet-x-template/{faucetAddress}")
async def delete_faucet_x_template(faucetAddress: str, userAddress: str, chainId: int):
    """Delete custom X post template for a faucet"""
    try:
        if not Web3.is_address(faucetAddress) or not Web3.is_address(userAddress):
            raise HTTPException(status_code=400, detail="Invalid address format")
       
        faucet_address = Web3.to_checksum_address(faucetAddress)
        user_address = Web3.to_checksum_address(userAddress)
       
        # Validate user is authorized
        w3 = await get_web3_instance(chainId)
        is_authorized = await check_user_is_authorized_for_faucet(w3, faucet_address, user_address)
       
        if not is_authorized:
            raise HTTPException(
                status_code=403,
                detail="Access denied. User must be owner, admin, or backend address."
            )
       
        response = supabase.table("faucet_x_templates").delete().eq(
            "faucet_address", faucet_address
        ).execute()
       
        return {
            "success": True,
            "faucetAddress": faucet_address,
            "message": "X post template deleted successfully"
        }
       
    except HTTPException:
        raise
    except Exception as e:
        print(f"\ud83d\udca5 Error deleting X post template: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to delete template: {str(e)}")
   
# Add this new endpoint after the existing secret code endpoints


@router.post("/generate-new-drop-code")
async def generate_new_drop_code_endpoint(request: GenerateNewDropCodeRequest):
    """Generate a new drop code for dropcode faucets (authorized users only)."""
    try:
        print(f"\ud83d\udd04 New drop code request: user={request.userAddress}, faucet={request.faucetAddress}")
       
        # Validate addresses
        if not Web3.is_address(request.faucetAddress) or not Web3.is_address(request.userAddress):
            raise HTTPException(status_code=400, detail="Invalid address format")
       
        # Validate chain ID
        if request.chainId not in VALID_CHAIN_IDS:
            raise HTTPException(status_code=400, detail=f"Invalid chainId: {request.chainId}")
       
        faucet_address = Web3.to_checksum_address(request.faucetAddress)
        user_address = Web3.to_checksum_address(request.userAddress)
       
        # Get Web3 instance
        w3 = await get_web3_instance(request.chainId)
       
        # Check if user is authorized (owner, admin, or backend)
        is_authorized = await check_user_is_authorized_for_faucet(w3, faucet_address, user_address)
        if not is_authorized:
            raise HTTPException(
                status_code=403,
                detail="Access denied. User must be owner, admin, or backend address."
            )
       
        # Additional check: Verify this is actually a dropcode faucet
        try:
            # Try to get existing secret code data to confirm this is a dropcode faucet
            faucet_contract = w3.eth.contract(address=faucet_address, abi=FAUCET_ABI)
           
            # Check if this faucet has the faucetType function and if it's dropcode
            try:
                faucet_type = faucet_contract.functions.faucetType().call()
                if faucet_type.lower() != 'dropcode':
                    raise HTTPException(
                        status_code=400,
                        detail=f"This operation is only available for dropcode faucets. Current type: {faucet_type}"
                    )
            except Exception as e:
                print(f"\u26a0\ufe0f Could not verify faucet type: {str(e)}")
                # Continue anyway - older contracts might not have faucetType function
               
        except Exception as e:
            print(f"\u26a0\ufe0f Could not verify faucet contract: {str(e)}")
       
        # Generate new drop code
        new_code = await generate_new_drop_code_only(faucet_address)
       
        print(f"\u2705 Successfully generated new drop code for {faucet_address}: {new_code}")
       
        return {
            "success": True,
            "faucetAddress": faucet_address,
            "userAddress": user_address,
            "secretCode": new_code,
            "chainId": request.chainId,
            "message": "New drop code generated successfully",
            "timestamp": datetime.now().isoformat(),
            "note": "Previous drop code is now invalid"
        }
       
    except HTTPException as e:
        raise e
    except Exception as e:
        print(f"\ud83d\udca5 Error in generate_new_drop_code: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to generate new drop code: {str(e)}")
# Optional: Add a debug endpoint to check drop code status


@router.post("/api/droplist/config")
async def save_droplist_config(request: DroplistConfigRequest):
    """Save droplist configuration (platform owner only)"""
    try:
        # Validate user is platform owner
        if not Web3.is_address(request.userAddress):
            raise HTTPException(status_code=400, detail="Invalid user address")
       
        user_address = Web3.to_checksum_address(request.userAddress)
       
        if not await check_platform_owner_authorization(user_address):
            raise HTTPException(
                status_code=403,
                detail="Access denied. Only platform owner can manage droplist configuration"
            )
       
        # Store configuration
        result = await store_droplist_config(request.config, request.tasks, user_address)
       
        return {
            "success": True,
            "message": f"Droplist configuration saved with {len(request.tasks)} tasks",
            "data": result
        }
       
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error saving droplist config: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to save configuration: {str(e)}")


@router.get("/api/droplist/config")
async def get_droplist_config_endpoint():
    """Get current droplist configuration"""
    try:
        config = await get_droplist_config()
       
        if not config:
            return {
                "success": True,
                "config": {
                    "isActive": False,
                    "title": "Join FaucetDrops Community",
                    "description": "Complete social media tasks to join our droplist",
                    "requirementThreshold": 5
                },
                "tasks": [],
                "message": "No configuration found, using defaults"
            }
       
        return {
            "success": True,
            "config": config.get("config", {}),
            "tasks": config.get("tasks", []),
            "createdAt": config.get("created_at"),
            "updatedAt": config.get("updated_at")
        }
       
    except Exception as e:
        print(f"Error getting droplist config: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get configuration: {str(e)}")


@router.post("/api/upload-image", tags=["Utilities"])
async def upload_image(file: UploadFile = File(...)):
    """
    Uploads an image to Supabase Storage ('quest-images' bucket) 
    and returns the public URL.
    """
    try:
        # 1. Read file content
        file_content = await file.read()
        file_ext = file.filename.split(".")[-1]
        
        # 2. Generate unique filename (using uuid)
        import uuid
        file_name = f"{uuid.uuid4()}.{file_ext}"
        
        # 3. Upload to Supabase Storage
        # NOTE: Ensure you created a public bucket named 'quest-images'
        bucket_name = "quest-images"
        
        # 'file_options' might be needed depending on supabase-py version, 
        # usually defaults work for public buckets.
        res = supabase.storage.from_(bucket_name).upload(
            path=file_name,
            file=file_content,
            file_options={"content-type": file.content_type}
        )
        
        # 4. Get Public URL
        public_url_res = supabase.storage.from_(bucket_name).get_public_url(file_name)
        
        # Check if URL was generated (Supabase-py implementation varies, checking distinct return types)
        # usually get_public_url returns a string or a dict containing publicURL
        
        final_url = public_url_res
        if not isinstance(final_url, str):
             # Some versions return specific objects, ensure we get the string
             final_url = str(final_url)
        return {"success": True, "url": final_url}
    except Exception as e:
        print(f"\u274c Upload Error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Image upload failed: {str(e)}")


@router.post("/api/droplist/submit")
async def submit_to_droplist_endpoint(request: dict):
    """Submit user to droplist"""
    try:
        wallet_address = request.get("walletAddress")
        if not wallet_address or not Web3.is_address(wallet_address):
            raise HTTPException(status_code=400, detail="Invalid wallet address")
       
        wallet_address = Web3.to_checksum_address(wallet_address)
       
        # Get droplist config
        config = await get_droplist_config()
        if not config:
            raise HTTPException(status_code=404, detail="No droplist configuration found")
       
        droplist_config = config.get("config", {})
        if not droplist_config.get("isActive", False):
            raise HTTPException(status_code=400, detail="Droplist is not currently active")
       
        # Get user profile
        profile = await get_user_profile(wallet_address)
        if not profile:
            raise HTTPException(status_code=404, detail="User profile not found")
       
        # Check if user meets requirements
        completed_count = len(profile.completedTasks)
        requirement_threshold = droplist_config.get("requirementThreshold", 5)
       
        if completed_count < requirement_threshold:
            raise HTTPException(
                status_code=400,
                detail=f"Not eligible. Completed {completed_count}/{requirement_threshold} required tasks"
            )
       
        # Check if already completed
        if profile.droplistStatus == "completed":
            return {
                "success": True,
                "message": "User already in droplist",
                "alreadySubmitted": True
            }
       
        # Update user status
        profile.droplistStatus = "completed"
        await store_user_profile(profile)
       
        # Here you could add logic to:
        # - Send confirmation email
        # - Add to external mailing list
        # - Trigger Discord/Telegram notifications
       
        return {
            "success": True,
            "message": "Successfully added to droplist",
            "completedTasks": completed_count,
            "status": "completed"
        }
       
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error submitting to droplist: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Droplist submission failed: {str(e)}")


@router.get("/api/droplist/stats")
async def get_droplist_stats():
    """Get droplist statistics"""
    try:
        # Get all users
        response = supabase.table("droplist_users").select("*").execute()
        users = response.data or []
       
        total_users = len(users)
        completed_users = len([u for u in users if u.get("droplist_status") == "completed"])
        pending_users = total_users - completed_users
       
        # Get configuration
        config = await get_droplist_config()
        is_active = config.get("config", {}).get("isActive", False) if config else False
       
        return {
            "success": True,
            "stats": {
                "totalUsers": total_users,
                "completedUsers": completed_users,
                "pendingUsers": pending_users,
                "isActive": is_active,
                "totalTasks": len(config.get("tasks", [])) if config else 0
            }
        }
       
    except Exception as e:
        print(f"Error getting droplist stats: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get stats: {str(e)}")
# X Account management endpoints (placeholder - implement OAuth flow)


@router.get("/api/faucet/slug/{slug_or_address}", tags=["Faucet Management"])
@router.get("/api/faucets/by-slug/{slug_or_address}", tags=["Faucet Management"])
async def get_faucet_address_by_slug(slug_or_address: str):
    try:
        clean_input = slug_or_address.lower().strip()
        
        # 1. Search by slug in faucet_details
        slug_res = supabase.table("faucet_details").select("*").eq("slug", clean_input).execute()
        if slug_res.data:
            f = slug_res.data[0]
            return {
                "success": True,
                "faucetAddress": f.get("faucet_address"),
                "chainId": f.get("chain_id"),
                "name": f.get("faucet_name"),
                "slug": f.get("slug")
            }

        # 2. Direct address lookup in faucet_details
        if clean_input.startswith("0x") and len(clean_input) == 42:
            addr_res = supabase.table("faucet_details").select("*").eq("faucet_address", clean_input).execute()
            if addr_res.data:
                f = addr_res.data[0]
                return {
                    "success": True,
                    "faucetAddress": f.get("faucet_address"),
                    "chainId": f.get("chain_id"),
                    "name": f.get("faucet_name"),
                    "slug": f.get("slug")
                }

        # 3. Truly not found
        raise HTTPException(status_code=404, detail="Faucet not found")
        
    except HTTPException as he:
        # Don't let the 'except Exception' block catch actual HTTP 404s
        raise he
    except Exception as e:
        print(f"\u274c Error resolving: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal database error")


@router.post("/add-faucet-tasks")
async def add_faucet_tasks_endpoint(request: AddTasksRequest):
    """Add tasks to a faucet (Appending to existing tasks)."""
    try:
        print(f"\ud83d\udcdd Adding {len(request.tasks)} tasks to faucet: {request.faucetAddress}")
        
        # 1. Validate Addresses
        if not Web3.is_address(request.faucetAddress) or not Web3.is_address(request.userAddress):
            raise HTTPException(status_code=400, detail="Invalid address format")
        
        # Validate chain ID
        if request.chainId not in VALID_CHAIN_IDS:
            raise HTTPException(status_code=400, detail=f"Invalid chainId: {request.chainId}")
        
        faucet_address = Web3.to_checksum_address(request.faucetAddress)
        user_address = Web3.to_checksum_address(request.userAddress)
        
        # 2. Get Web3 instance and Authorize User
        w3 = await get_web3_instance(request.chainId)
        
        is_authorized = await check_user_is_authorized_for_faucet(w3, faucet_address, user_address)
        if not is_authorized:
            raise HTTPException(
                status_code=403, 
                detail="Access denied. User must be owner, admin, or backend address."
            )
        # 3. Fetch Existing Tasks
        existing_tasks = []
        try:
            # We reuse your existing helper function
            existing_data = await get_faucet_tasks(faucet_address)
            if existing_data and "tasks" in existing_data:
                existing_tasks = existing_data["tasks"]
                print(f"found {len(existing_tasks)} existing tasks.")
        except Exception as e:
            print(f"No existing tasks found or DB error (continuing with empty list): {e}")
            existing_tasks = []
        # 4. Convert new tasks to dictionary format
        new_tasks_dict = [task.dict() for task in request.tasks]
        # 5. Append Logic (Merge lists)
        # Note: You might want to filter duplicates here based on URL if necessary.
        # For now, this simply adds the new ones to the end.
        combined_tasks = existing_tasks + new_tasks_dict
        # 6. Store the Combined List
        result = await store_faucet_tasks(faucet_address, combined_tasks, user_address)
        
        print(f"\u2705 Successfully stored {len(combined_tasks)} total tasks for faucet {faucet_address}")
        
        return {
            "success": True,
            "faucetAddress": faucet_address,
            "tasksAdded": len(new_tasks_dict),
            "totalTasks": len(combined_tasks),
            "userAddress": user_address,
            "chainId": request.chainId,
            "data": result,
            "message": f"Successfully added tasks. Total tasks: {len(combined_tasks)}"
        }
        
    except HTTPException as e:
        raise e
    except Exception as e:
        print(f"\ud83d\udca5 Error in add_faucet_tasks: {str(e)}")
        # Log stack trace for easier debugging
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed to add tasks: {str(e)}")
# --- USER PROFILE ENDPOINTS ---


@router.post("/admin-popup-preference")
async def save_admin_popup_preference_endpoint(request: AdminPopupPreferenceRequest):
    """Save the admin popup preference for a user-faucet combination."""
    try:
        print(f"Saving admin popup preference: user={request.userAddress}, faucet={request.faucetAddress}, dontShow={request.dontShowAgain}")
       
        result = await save_admin_popup_preference(
            request.userAddress,
            request.faucetAddress,
            request.dontShowAgain
        )
       
        return {
            "success": True,
            "message": "Admin popup preference saved successfully",
            "data": result
        }
       
    except HTTPException as e:
        raise e
    except Exception as e:
        print(f"Error in save_admin_popup_preference_endpoint: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to save preference: {str(e)}")


@router.get("/admin-popup-preference")
async def get_admin_popup_preference_endpoint(userAddress: str, faucetAddress: str):
    """Get the admin popup preference for a user-faucet combination."""
    try:
        print(f"Getting admin popup preference: user={userAddress}, faucet={faucetAddress}")
       
        dont_show_again = await get_admin_popup_preference(userAddress, faucetAddress)
       
        return {
            "success": True,
            "userAddress": userAddress,
            "faucetAddress": faucetAddress,
            "dontShowAgain": dont_show_again
        }
       
    except Exception as e:
        print(f"Error in get_admin_popup_preference_endpoint: {str(e)}")
        # Return False on error so popup still shows
        return {
            "success": False,
            "userAddress": userAddress,
            "faucetAddress": faucetAddress,
            "dontShowAgain": False,
            "error": str(e)
        }


@router.get("/admin-popup-preferences/{userAddress}")
async def get_user_admin_popup_preferences_endpoint(userAddress: str):
    """Get all admin popup preferences for a specific user."""
    try:
        print(f"Getting all admin popup preferences for user: {userAddress}")
       
        preferences = await get_user_all_popup_preferences(userAddress)
       
        return {
            "success": True,
            "userAddress": userAddress,
            "preferences": preferences,
            "count": len(preferences)
        }
       
    except HTTPException as e:
        raise e
    except Exception as e:
        print(f"Error in get_user_admin_popup_preferences_endpoint: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get preferences: {str(e)}")
# Set claim parameters endpoint for ALL faucet types


@router.post("/set-claim-parameters")
async def set_claim_parameters_endpoint(request: SetClaimParametersRequest):
    try:
        print(f"\ud83d\udccb Received set claim parameters request for faucet: {request.faucetAddress}")
        print(f"\ud83c\udfaf Tasks to store: {len(request.tasks) if request.tasks else 0}")
       
        if not Web3.is_address(request.faucetAddress):
            raise HTTPException(status_code=400, detail=f"Invalid faucetAddress: {request.faucetAddress}")
       
        if request.chainId not in VALID_CHAIN_IDS:
            raise HTTPException(status_code=400, detail=f"Invalid chainId: {request.chainId}. Must be one of {VALID_CHAIN_IDS}")
       
        faucet_address = Web3.to_checksum_address(request.faucetAddress)
       
        # Convert tasks to dict format if provided
        tasks_dict = None
        if request.tasks:
            tasks_dict = [task.dict() for task in request.tasks]
            print(f"\ud83d\udcdd Converted {len(tasks_dict)} tasks to storage format")
       
        # Set parameters and store tasks for ALL faucet types
        secret_code = await set_claim_parameters(faucet_address, request.startTime, request.endTime, tasks_dict)
       
        return {
            "success": True,
            "secretCode": secret_code,
            "tasksStored": len(tasks_dict) if tasks_dict else 0,
            "faucetAddress": faucet_address,
            "message": f"Parameters updated with {len(tasks_dict) if tasks_dict else 0} social media tasks"
        }
       
    except HTTPException as e:
        raise e
    except Exception as e:
        print(f"\ud83d\udca5 Server error in set_claim_parameters: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/faucet-tasks/{faucetAddress}")
async def get_faucet_tasks_endpoint(faucetAddress: str):
    """Get tasks for ANY faucet type."""
    try:
        if not faucetAddress or faucetAddress.lower() == "undefined":
            raise HTTPException(status_code=400, detail="Invalid faucet address")

        if not Web3.is_address(faucetAddress):
            raise HTTPException(status_code=400, detail="Invalid faucet address format")
       
        faucet_address = Web3.to_checksum_address(faucetAddress)
       
        tasks_data = await get_faucet_tasks(faucet_address)
       
        if not tasks_data:
            return {
                "success": True,
                "faucetAddress": faucet_address,
                "tasks": [],
                "count": 0,
                "message": "No tasks found for this faucet"
            }
       
        return {
            "success": True,
            "faucetAddress": faucet_address,
            "tasks": tasks_data["tasks"],
            "count": len(tasks_data["tasks"]),
            "createdBy": tasks_data.get("created_by"),
            "createdAt": tasks_data.get("created_at"),
            "updatedAt": tasks_data.get("updated_at"),
            "message": f"Found {len(tasks_data['tasks'])} social media tasks"
        }
       
    except HTTPException as e:
        raise e
    except Exception as e:
        print(f"Error in get_faucet_tasks: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get tasks: {str(e)}")


@router.delete("/faucet-tasks/{faucetAddress}")
async def delete_faucet_tasks_endpoint(faucetAddress: str, userAddress: str, chainId: int):
    """Delete all tasks for a faucet (authorized users only)."""
    try:
        print(f"\ud83d\uddd1\ufe0f Deleting tasks for faucet: {faucetAddress} by user: {userAddress}")
       
        # Validate addresses
        if not Web3.is_address(faucetAddress) or not Web3.is_address(userAddress):
            raise HTTPException(status_code=400, detail="Invalid address format")
       
        # Validate chain ID
        if chainId not in VALID_CHAIN_IDS:
            raise HTTPException(status_code=400, detail=f"Invalid chainId: {chainId}")
       
        faucet_address = Web3.to_checksum_address(faucetAddress)
        user_address = Web3.to_checksum_address(userAddress)
       
        # Get Web3 instance
        w3 = await get_web3_instance(chainId)
       
        # Check if user is authorized
        is_authorized = await check_user_is_authorized_for_faucet(w3, faucet_address, user_address)
        if not is_authorized:
            raise HTTPException(
                status_code=403,
                detail="Access denied. User must be owner, admin, or backend address."
            )
       
        # Delete tasks from database
        try:
            response = supabase.table("faucet_tasks").delete().eq("faucet_address", faucet_address).execute()
           
            if response.data:
                deleted_count = len(response.data)
                print(f"\u2705 Deleted {deleted_count} task records for faucet {faucet_address}")
            else:
                deleted_count = 0
                print(f"\ud83d\udcdd No tasks found to delete for faucet {faucet_address}")
           
            return {
                "success": True,
                "faucetAddress": faucet_address,
                "userAddress": user_address,
                "deletedCount": deleted_count,
                "message": f"Successfully deleted {deleted_count} tasks"
            }
           
        except Exception as db_error:
            print(f"\ud83d\udca5 Database error deleting tasks: {str(db_error)}")
            raise HTTPException(status_code=500, detail=f"Database error: {str(db_error)}")
       
    except HTTPException as e:
        raise e
    except Exception as e:
        print(f"\ud83d\udca5 Error in delete_faucet_tasks: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to delete tasks: {str(e)}")


@router.post("/claim")
async def claim(request: ClaimRequest):
    try:
        print(f"Received claim request: {request.dict()}")
       
        w3 = await get_web3_instance(request.chainId)
       
        try:
            user_address = w3.to_checksum_address(request.userAddress)
            faucet_address = w3.to_checksum_address(request.faucetAddress)
        except ValueError as e:
            print(f"\u274c Invalid address error: {str(e)}")
            raise HTTPException(status_code=400, detail=f"Invalid address: {str(e)}")
       
        # Use synced chain IDs
        if request.chainId not in VALID_CHAIN_IDS:
            print(f"\u274c Invalid chainId: {request.chainId}")
            raise HTTPException(status_code=400, detail=f"Invalid chainId: {request.chainId}. Must be one of {VALID_CHAIN_IDS}")
       
        print(f"\u2705 Addresses validated: user={user_address}, faucet={faucet_address}")
        # Check secret code FIRST
        try:
            is_valid_code = await verify_secret_code(faucet_address, request.secretCode)
            if not is_valid_code:
                print(f"\u274c Secret code validation failed for code: {request.secretCode}")
                raise HTTPException(status_code=400, detail=f"Invalid or expired secret code: {request.secretCode}")
            print(f"\u2705 Secret code validated: {request.secretCode}")
        except HTTPException:
            raise
        except Exception as e:
            print(f"\u274c Secret code check error: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Secret code validation error: {str(e)}")
        # Check if faucet is paused
        try:
            is_paused = await check_pause_status(w3, faucet_address)
            if is_paused:
                print(f"\u274c Faucet is paused: {faucet_address}")
                raise HTTPException(status_code=400, detail="Faucet is currently paused")
            print(f"\u2705 Faucet is active: {faucet_address}")
        except HTTPException:
            raise
        except Exception as e:
            print(f"\u274c Pause status check error: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Failed to check faucet status: {str(e)}")
        # Get faucet details
        faucet_contract = w3.eth.contract(address=faucet_address, abi=FAUCET_ABI)
        balance = w3.eth.get_balance(faucet_address)
        backend = faucet_contract.functions.BACKEND().call()
        backend_fee_percent = faucet_contract.functions.BACKEND_FEE_PERCENT().call()
        chain_info = get_chain_info(request.chainId)
        print(f"\ud83d\udcca Faucet details: balance={w3.from_wei(balance, 'ether')} {chain_info['native_token']}, BACKEND={backend}, BACKEND_FEE_PERCENT={backend_fee_percent}%")
        # Check if user already claimed
        try:
            has_claimed = faucet_contract.functions.hasClaimed(user_address).call()
            if has_claimed:
                print(f"\u274c User already claimed: {user_address}")
                raise HTTPException(status_code=400, detail="User has already claimed from this faucet")
            print(f"\u2705 User has not claimed yet: {user_address}")
        except HTTPException:
            raise
        except Exception as e:
            print(f"\u26a0\ufe0f Could not check claim status: {str(e)}")
        # Attempt to claim tokens
        try:
            print(f"\ud83d\udd04 Attempting to claim tokens for: {user_address}")
            tx_hash = await claim_tokens(w3, faucet_address, user_address, request.secretCode, request.divviReferralData)
            print(f"\u2705 Successfully claimed tokens for {user_address}, tx: {tx_hash}")
            return {"success": True, "txHash": tx_hash}
        except HTTPException as e:
            print(f"\u274c Claim failed: {str(e)}")
            raise
        except Exception as e:
            print(f"\u274c Claim error: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Failed to claim tokens: {str(e)}")
    except HTTPException as e:
        print(f"\ud83d\udeab HTTP Exception for user {request.userAddress}: {e.detail}")
        raise e
    except Exception as e:
        print(f"\ud83d\udca5 Unexpected server error for user {request.userAddress}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Unexpected error: {str(e)}")


@router.post("/claim-no-code")
async def claim_no_code(request: ClaimNoCodeRequest):
    """Endpoint to claim tokens without requiring a secret code."""
    try:
        print(f"Received claim-no-code request: {request.dict()}")
       
        w3 = await get_web3_instance(request.chainId)
       
        try:
            user_address = w3.to_checksum_address(request.userAddress)
            faucet_address = w3.to_checksum_address(request.faucetAddress)
        except ValueError as e:
            raise HTTPException(status_code=400, detail=f"Invalid address: {str(e)}")
       
        # Use synced chain IDs
        if request.chainId not in VALID_CHAIN_IDS:
            raise HTTPException(status_code=400, detail=f"Invalid chainId: {request.chainId}. Must be one of {VALID_CHAIN_IDS}")
       
        print(f"Converted to checksum addresses: user={user_address}, faucet={faucet_address}")
        faucet_contract = w3.eth.contract(address=faucet_address, abi=FAUCET_ABI)
        balance = w3.eth.get_balance(faucet_address)
        backend = faucet_contract.functions.BACKEND().call()
        backend_fee_percent = faucet_contract.functions.BACKEND_FEE_PERCENT().call()
        chain_info = get_chain_info(request.chainId)
        print(f"Faucet details: balance={w3.from_wei(balance, 'ether')} {chain_info['native_token']}, BACKEND={backend}, BACKEND_FEE_PERCENT={backend_fee_percent}%")
        if not Web3.is_address(backend):
            raise HTTPException(status_code=500, detail="Invalid BACKEND address in contract")
        tx_hash = await claim_tokens_no_code(w3, faucet_address, user_address, request.divviReferralData)
        print(f"Claimed tokens for {user_address}, tx: {tx_hash}")
        return {"success": True, "txHash": tx_hash}
    except HTTPException as e:
        raise e
    except Exception as e:
        print(f"Server error for user {request.userAddress}: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/claim-custom")
async def claim_custom(request: ClaimCustomRequest):
    """Endpoint to claim tokens from custom faucets."""
    try:
        print(f"Received claim-custom request: {request.dict()}")
       
        w3 = await get_web3_instance(request.chainId)
       
        try:
            user_address = w3.to_checksum_address(request.userAddress)
            faucet_address = w3.to_checksum_address(request.faucetAddress)
        except ValueError as e:
            print(f"\u274c Invalid address error: {str(e)}")
            raise HTTPException(status_code=400, detail=f"Invalid address: {str(e)}")
       
        # Use synced chain IDs
        if request.chainId not in VALID_CHAIN_IDS:
            print(f"\u274c Invalid chainId: {request.chainId}")
            raise HTTPException(status_code=400, detail=f"Invalid chainId: {request.chainId}. Must be one of {VALID_CHAIN_IDS}")
       
        print(f"\u2705 Addresses validated: user={user_address}, faucet={faucet_address}")
        # Check if faucet is paused
        try:
            is_paused = await check_pause_status(w3, faucet_address)
            if is_paused:
                print(f"\u274c Faucet is paused: {faucet_address}")
                raise HTTPException(status_code=400, detail="Faucet is currently paused")
            print(f"\u2705 Faucet is active: {faucet_address}")
        except HTTPException:
            raise
        except Exception as e:
            print(f"\u274c Pause status check error: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Failed to check faucet status: {str(e)}")
        # Get faucet details
        faucet_contract = w3.eth.contract(address=faucet_address, abi=FAUCET_ABI)
        try:
            balance = w3.eth.get_balance(faucet_address)
            backend = faucet_contract.functions.BACKEND().call()
            backend_fee_percent = faucet_contract.functions.BACKEND_FEE_PERCENT().call()
            chain_info = get_chain_info(request.chainId)
            print(f"\ud83d\udcca Faucet details: balance={w3.from_wei(balance, 'ether')} {chain_info['native_token']}, BACKEND={backend}, BACKEND_FEE_PERCENT={backend_fee_percent}%")
        except Exception as e:
            print(f"\u26a0\ufe0f Could not get faucet details: {str(e)}")
        # Verify this is a custom faucet by checking if user has custom amount
        try:
            has_custom_amount = faucet_contract.functions.hasCustomClaimAmount(user_address).call()
            if not has_custom_amount:
                print(f"\u274c No custom amount for user: {user_address}")
                raise HTTPException(status_code=400, detail="No custom claim amount allocated for this address")
           
            custom_amount = faucet_contract.functions.getCustomClaimAmount(user_address).call()
            if custom_amount <= 0:
                print(f"\u274c Custom amount is zero: {user_address}")
                raise HTTPException(status_code=400, detail="Custom claim amount is zero")
               
            print(f"\u2705 User has custom amount: {w3.from_wei(custom_amount, 'ether')} tokens")
        except HTTPException:
            raise
        except Exception as e:
            print(f"\u274c Error checking custom amount: {str(e)}")
            raise HTTPException(status_code=500, detail="Failed to verify custom claim amount")
        # Check if user already claimed
        try:
            has_claimed = faucet_contract.functions.hasClaimed(user_address).call()
            if has_claimed:
                print(f"\u274c User already claimed: {user_address}")
                raise HTTPException(status_code=400, detail="User has already claimed from this faucet")
            print(f"\u2705 User has not claimed yet: {user_address}")
        except HTTPException:
            raise
        except Exception as e:
            print(f"\u26a0\ufe0f Could not check claim status: {str(e)}")
        # Attempt to claim tokens
        try:
            print(f"\ud83d\udd04 Attempting to claim custom tokens for: {user_address}")
            tx_hash = await claim_tokens_custom(w3, faucet_address, user_address, request.divviReferralData)
            print(f"\u2705 Successfully claimed custom tokens for {user_address}, tx: {tx_hash}")
            return {"success": True, "txHash": tx_hash}
        except HTTPException as e:
            print(f"\u274c Claim failed: {str(e)}")
            raise
        except Exception as e:
            print(f"\u274c Claim error: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Failed to claim tokens: {str(e)}")
    except HTTPException as e:
        print(f"\ud83d\udeab HTTP Exception for user {request.userAddress}: {e.detail}")
        raise e
    except Exception as e:
        print(f"\ud83d\udca5 Unexpected server error for user {request.userAddress}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Unexpected error: {str(e)}")
# Secret Code Endpoints


@router.get("/secret-codes")
async def get_secret_codes():
    """Get all secret codes with enhanced metadata."""
    try:
        codes = await get_all_secret_codes()
        return {
            "success": True,
            "count": len(codes),
            "codes": codes,
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        print(f"Error in get_secret_codes: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get secret codes: {str(e)}")


@router.get("/secret-codes/valid")
async def get_all_valid_secret_codes():
    """Get only currently valid secret codes."""
    try:
        all_codes = await get_all_secret_codes()
        valid_codes = [code for code in all_codes if code["is_valid"]]
       
        return {
            "success": True,
            "count": len(valid_codes),
            "codes": valid_codes,
            "timestamp": datetime.now().isoformat()
        }
       
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get valid secret codes: {str(e)}")


@router.get("/secret-code/{faucet_address}")
async def get_secret_code_enhanced(faucet_address: str):
    """Enhanced endpoint to get secret code with full metadata."""
    try:
        code_data = await get_secret_code_from_db(faucet_address)
       
        if not code_data:
            raise HTTPException(status_code=404, detail=f"No secret code found for faucet: {faucet_address}")
       
        return {
            "success": True,
            "data": code_data,
            "timestamp": datetime.now().isoformat()
        }
       
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get secret code: {str(e)}")


@router.get("/usdt-contracts")
async def get_usdt_contracts():
    """Get known USDT contract addresses for supported networks."""
    return {
        "success": True,
        "contracts": USDT_CONTRACTS,
        "supported_chains": VALID_CHAIN_IDS,
        "note": "These are common USDT contract addresses. Always verify the correct address for your use case."
    }


@router.post("/faucet-metadata")
async def save_faucet_metadata(metadata: FaucetMetadata):
    """Save faucet description and image"""
    try:
        print(f"\
{'='*60}")
        print(f"\ud83d\udce5 Received metadata request:")
        print(f" Faucet: {metadata.faucetAddress}")
        print(f" Description: {metadata.description[:50]}..." if len(metadata.description) > 50 else f" Description: {metadata.description}")
        print(f" Image URL: {metadata.imageUrl}")
        print(f" Creator: {metadata.createdBy}")
        print(f" Chain ID: {metadata.chainId}")
        print(f"{'='*60}\
")
       
        # Validate addresses
        if not Web3.is_address(metadata.faucetAddress):
            raise HTTPException(status_code=400, detail="Invalid faucet address")
       
        if not Web3.is_address(metadata.createdBy):
            raise HTTPException(status_code=400, detail="Invalid creator address")
       
        faucet_address = Web3.to_checksum_address(metadata.faucetAddress)
        creator_address = Web3.to_checksum_address(metadata.createdBy)
       
        # Prepare data - \u2705 FIXED: Use created_by to match database column name
        data = {
            "faucet_address": faucet_address,
            "description": metadata.description,
            "image_url": metadata.imageUrl,
            "created_by": creator_address, # \u2705 Changed to created_by
            "chain_id": metadata.chainId,
            "created_at": datetime.now().isoformat(),
            "updated_at": datetime.now().isoformat()
        }
       
        print(f"\ud83d\udcdd Prepared data for Supabase:")
        print(f" {data}\
")
       
        # Insert or update
        try:
            response = supabase.table("faucet_metadata").upsert(
                data,
                on_conflict="faucet_address"
            ).execute()
           
            print(f"\u2705 Supabase response:")
            print(f" Data: {response.data}")
           
        except Exception as db_error:
            print(f"\u274c Database error: {str(db_error)}")
            import traceback
            traceback.print_exc()
            raise HTTPException(
                status_code=500,
                detail=f"Database error: {str(db_error)}"
            )
       
        if not response.data:
            print(f"\u26a0\ufe0f Warning: No data returned from upsert")
       
        print(f"\u2705 Metadata stored successfully for {faucet_address}\
")
       
        return {
            "success": True,
            "faucetAddress": faucet_address,
            "message": "Faucet metadata saved successfully"
        }
       
    except HTTPException:
        raise
    except Exception as e:
        print(f"\ud83d\udca5 Unexpected error saving faucet metadata: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=500,
            detail=f"Failed to save metadata: {str(e)}"
        )
# --- API Endpoints ---


@router.post("/register-faucet")
async def register_faucet_endpoint(request: RegisterFaucetRequest):
    """
    Registers a new faucet in the 'userfaucets' table.
    """
    try:
        print(f"\ud83d\udcdd Registering new faucet: {request.name} ({request.faucetAddress})")
        if not Web3.is_address(request.faucetAddress) or not Web3.is_address(request.ownerAddress):
            raise HTTPException(status_code=400, detail="Invalid address format")
        # --- FIX: CONVERT TO LOWERCASE FOR DB STORAGE ---
        faucet_address_lower = request.faucetAddress.lower()
        owner_address_lower = request.ownerAddress.lower()
        data = {
            "faucet_address": faucet_address_lower, # Stored as lowercase
            "owner_address": owner_address_lower,   # Stored as lowercase
            "chain_id": request.chainId,
            "faucet_type": request.faucetType,
            "name": request.name,
            "created_at": datetime.now().isoformat()
        }
        # UPDATED: Table name is now 'userfaucets'
        response = supabase.table("userfaucets").upsert(
            data, 
            on_conflict="faucet_address"
        ).execute()
        if not response.data:
            raise HTTPException(status_code=500, detail="Failed to register faucet in database")
        # For logging, we can still use checksum if desired, but DB has lowercase
        print(f"\u2705 Faucet registered in userfaucets: {faucet_address_lower}")
        
        return {
            "success": True,
            "message": "Faucet registered successfully",
            "data": response.data[0]
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"\ud83d\udca5 Error registering faucet: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")


@router.get("/user-faucets/{user_address}")
async def get_user_faucets_endpoint(user_address: str):
    """
    Fetches all faucets from 'userfaucets' for a specific user.
    """
    try:
        if not Web3.is_address(user_address):
            raise HTTPException(status_code=400, detail="Invalid user address")
        # FIX: Convert to lowercase to match the data stored by the sync script
        owner_address_lower = user_address.lower()
        # Query Supabase using the lowercase address
        response = supabase.table("userfaucets").select("*").eq(
            "owner_address", owner_address_lower
        ).order("created_at", desc=True).execute()
        faucets = response.data or []
        formatted_faucets = []
        for f in faucets:
            formatted_faucets.append({
                # Return checksummed addresses to the frontend for display consistency
                "faucetAddress": Web3.to_checksum_address(f.get("faucet_address")),
                "ownerAddress": Web3.to_checksum_address(f.get("owner_address")),
                "chainId": f.get("chain_id"),
                "faucetType": f.get("faucet_type"),
                "name": f.get("name"),
                "createdAt": f.get("created_at")
            })
        return {
            "success": True,
            "faucets": formatted_faucets,
            "count": len(formatted_faucets)
        }
    except Exception as e:
        print(f"\ud83d\udca5 Error fetching user faucets: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch faucets: {str(e)}")


@router.get("/faucet-metadata/{faucetAddress}")
async def get_faucet_metadata(faucetAddress: str):
    try:
        if not Web3.is_address(faucetAddress):
            slug_clean = faucetAddress.lower().strip()
            slug_res = supabase.table("faucet_details").select("faucet_address").eq("slug", slug_clean).limit(1).execute()
            if not slug_res.data:
                slug_res = supabase.table("faucets").select("faucet_address").eq("slug", slug_clean).limit(1).execute()
            if not slug_res.data:
                raise HTTPException(status_code=400, detail="Invalid faucet address or slug not found")
            resolved = slug_res.data[0].get("faucet_address", "")
            if not Web3.is_address(resolved):
                raise HTTPException(status_code=400, detail="Invalid faucet address")
            faucetAddress = resolved

        faucet_address = Web3.to_checksum_address(faucetAddress).lower()
       
        response = supabase.table("faucet_metadata").select("*").eq(
            "faucet_address", faucet_address
        ).execute()
       
        if response.data and len(response.data) > 0:
            return {
                "success": True,
                "faucetAddress": faucet_address,
                "description": response.data[0].get("description"),
                "imageUrl": response.data[0].get("image_url"),
                "createdBy": response.data[0].get("created_by"), # \u2705 Changed to created_by
                "chainId": response.data[0].get("chain_id"),
                "createdAt": response.data[0].get("created_at"),
                "updatedAt": response.data[0].get("updated_at")
            }
       
        return {
            "success": True,
            "faucetAddress": faucet_address,
            "description": None,
            "imageUrl": None,                                                                                                                                                               
            "message": "No metadata found for this faucet"
        }
       
    except HTTPException:
        raise
    except Exception as e:
        print(f"\ud83d\udca5 Error getting faucet metadata: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get metadata: {str(e)}")
# ============================================================
# INTERNAL QUEST AUTOMATION (Runs continuously in background)
# ============================================================
async def internal_quest_processor():
    """
    Background loop that acts as an internal countdown.
    Checks for ended quests every 60 seconds and auto-distributes rewards.
    """
    print("\u23f3 Internal Quest Processor started. Watching for ended quests...")
    while True:
        try:
            now_iso = datetime.now(timezone.utc).isoformat()
            
            # 1. Fetch quests that have ended but haven't been distributed yet
            response = supabase.table("quests")\
                .select("*")\
                .eq("is_active", True)\
                .eq("rewards_distributed", False)\
                .lt("end_date", now_iso)\
                .execute()
                
            ended_quests = response.data or []
            
            for quest in ended_quests:
                faucet_address = quest["faucet_address"]
                print(f"\ud83c\udfaf Quest Ended! Auto-processing rewards for: {faucet_address}")
                
                faucet_checksum = Web3.to_checksum_address(faucet_address)
                chain_id = quest.get("chain_id", 42220) # Default to Celo if missing
                
                w3 = await get_web3_instance(chain_id) 
                contract = w3.eth.contract(address=faucet_checksum, abi=QUEST_ABI)
                
                # 2. Get Leaderboard for this quest
                participants_res = supabase.table("quest_participants")\
                    .select("wallet_address, points")\
                    .eq("quest_address", faucet_address)\
                    .order("points", desc=True)\
                    .execute()
                    
                participants = participants_res.data or []
                
                # 3. Parse Distribution Config
                dist_config = quest.get("distribution_config", {})
                if isinstance(dist_config, str):
                    dist_config = json.loads(dist_config)
                total_winners = int(dist_config.get("totalWinners", 1))
                pool_amount = float(quest.get("reward_pool", 0))
                
                # 4. Fetch Token Decimals (for Wei conversion)
                token_address = quest.get("token_address")
                if token_address and token_address != ZeroAddress:
                    erc20 = w3.eth.contract(address=Web3.to_checksum_address(token_address), abi=ERC20_BALANCE_ABI)
                    decimals = erc20.functions.decimals().call()
                else:
                    decimals = 18
                winners = []
                amounts_int = []
                # --- Handle "Equal" Distribution ---
                if dist_config.get("model") == "equal" and len(participants) > 0:
                    actual_winners = participants[:total_winners]
                    amount_per_winner = pool_amount / len(actual_winners)
                    amount_wei = int(amount_per_winner * (10 ** decimals))
                    
                    for p in actual_winners:
                        if p["wallet_address"].lower() != quest.get("creator_address", "").lower():
                            winners.append(Web3.to_checksum_address(p["wallet_address"]))
                            amounts_int.append(amount_wei)
                            
                # --- Handle "Custom Tiers" Distribution ---
                elif dist_config.get("model") == "custom_tiers" and len(participants) > 0:
                    tiers = dist_config.get("tiers", [])
                    for p in participants:
                        if p["wallet_address"].lower() == quest.get("creator_address", "").lower():
                            continue
                        
                        rank = len(winners) + 1
                        amount_for_rank = 0
                        
                        # Find which tier this rank belongs to
                        for t in tiers:
                            if t["rankStart"] <= rank <= t["rankEnd"]:
                                amount_for_rank = float(t["amountPerUser"])
                                break
                        
                        if amount_for_rank > 0:
                            winners.append(Web3.to_checksum_address(p["wallet_address"]))
                            amounts_int.append(int(amount_for_rank * (10 ** decimals)))
                # 5. Execute Smart Contract Transaction with Backend Signer
                if len(winners) > 0:
                    print(f"\ud83d\ude80 Pushing {len(winners)} winners to blockchain...")
                    tx = build_transaction_with_standard_gas(
                        w3,
                        contract.functions.setRewardAmountsBatch(winners, amounts_int),
                        signer.address
                    )
                    signed_tx = w3.eth.account.sign_transaction(tx, signer.key)
                    tx_hash = w3.eth.send_raw_transaction(signed_tx.raw_transaction)
                    
                    await wait_for_transaction_receipt(w3, tx_hash.hex())
                    print(f"\u2705 Success! Winners logged on chain. Tx: {tx_hash.hex()}")
                else:
                    print(f"\u26a0\ufe0f No eligible winners found for {faucet_address}")
                
                # 6. Finally, update the database so this quest is never processed again
                supabase.table("quests").update({"rewards_distributed": True}).eq("faucet_address", faucet_address).execute()
        except Exception as e:
            print(f"\ud83d\udca5 Background Processor Error: {e}")
            import traceback
            traceback.print_exc()
            
        # Wait 60 seconds before checking the clock again
        await asyncio.sleep(60)
