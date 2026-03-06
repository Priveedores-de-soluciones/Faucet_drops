"""
routers/utility.py — Utility & Debug endpoints.

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
from routers.quest import process_auto_approval
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

router = APIRouter(tags=["Utility"])

@router.get("/deleted-faucets", tags=["Utility"])
async def get_deleted_faucets_endpoint():
    """
    Returns a list of all faucet addresses marked as permanently deleted in the database.
    (This is typically used for auditing or filtering on the frontend.)
    """
    try:
        # NOTE: Implement proper authentication/authorization here if this endpoint should be restricted
        # For security, you should check if the requester is an admin or platform owner.
        
        deleted_faucets = await get_all_deleted_faucets()
        
        # Extract just the addresses for simplicity in this endpoint
        deleted_addresses = [record['faucet_address'] for record in deleted_faucets]
        
        return {
            "success": True,
            "count": len(deleted_addresses),
            "deletedAddresses": deleted_addresses,
            "message": "Successfully retrieved list of deleted faucet addresses."
        }
        
    except Exception as e:
        print(f"\ud83d\udca5 Error in get_deleted_faucets_endpoint: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to retrieve deleted faucet list: {str(e)}")
        
# Optional: Endpoint to delete an image


@router.get("/health")
async def health_check():
    # Using timezone-aware UTC is the current best practice
    return {
        "status": "ok", 
        "timestamp": datetime.now(timezone.utc).isoformat()
    }


@router.get("/chain-info/{chain_id}")
async def get_chain_info_endpoint(chain_id: int):
    """Get chain-specific information."""
    try:
        chain_info = get_chain_info(chain_id)
        return {
            "success": True,
            "chain_id": chain_id,
            "network_name": chain_info["name"],
            "native_token": chain_info["native_token"]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
# Debug endpoints


@router.get("/debug/chain-info/{chain_id}")
async def debug_chain_info(chain_id: int):
    """Debug endpoint to check basic chain information."""
    try:
        chain_info = get_chain_info(chain_id)
        w3 = await get_web3_instance(chain_id)
       
        return {
            "success": True,
            "chain_id": chain_id,
            "network_name": chain_info["name"],
            "native_token": chain_info["native_token"],
            "current_gas_price": w3.eth.gas_price,
            "signer_balance": {
                "wei": w3.eth.get_balance(signer.address),
                "formatted": w3.from_wei(w3.eth.get_balance(signer.address), 'ether')
            },
            "balance_sufficient": w3.eth.get_balance(signer.address) >= w3.to_wei(0.001, 'ether')
        }
       
    except Exception as e:
        return {"success": False, "error": str(e)}


@router.get("/debug/supported-chains")
async def get_supported_chains():
    """Debug endpoint to see which chains are supported."""
    return {
        "success": True,
        "valid_chain_ids": VALID_CHAIN_IDS,
        "chain_info": CHAIN_INFO,
        "total_supported": len(VALID_CHAIN_IDS)
    }
# Additional utility functions for the complete backend
async def check_whitelist_status(w3: Web3, faucet_address: str, user_address: str) -> bool:
    faucet_contract = w3.eth.contract(address=faucet_address, abi=FAUCET_ABI)
    for _ in range(5):
        try:
            return faucet_contract.functions.isWhitelisted(user_address).call()
        except (ContractLogicError, ValueError) as e:
            print(f"Retry checking whitelist status: {str(e)}")
            await asyncio.sleep(2)
    raise HTTPException(status_code=500, detail="Failed to check whitelist status after retries")
async def check_pause_status(w3: Web3, faucet_address: str) -> bool:
    faucet_contract = w3.eth.contract(address=faucet_address, abi=FAUCET_ABI)
    try:
        return faucet_contract.functions.paused().call()
    except (ContractLogicError, ValueError) as e:
        print(f"Error checking pause status: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to check faucet status")
async def check_user_is_authorized_for_faucet(w3: Web3, faucet_address: str, user_address: str) -> bool:
    """
    Check if user is owner, admin, or backend address for the faucet.
    """
    try:
        faucet_contract = w3.eth.contract(address=faucet_address, abi=FAUCET_ABI)
       
        # Check if user is owner
        try:
            owner = faucet_contract.functions.owner().call()
            if owner.lower() == user_address.lower():
                print(f"\u2705 User {user_address} is owner of faucet {faucet_address}")
                return True
        except Exception as e:
            print(f"\u26a0\ufe0f Could not check owner: {str(e)}")
       
        # Check if user is admin
        try:
            is_admin = faucet_contract.functions.isAdmin(user_address).call()
            if is_admin:
                print(f"\u2705 User {user_address} is admin of faucet {faucet_address}")
                return True
        except Exception as e:
            print(f"\u26a0\ufe0f Could not check admin: {str(e)}")
       
        # Check if user is backend
        try:
            backend = faucet_contract.functions.BACKEND().call()
            if backend.lower() == user_address.lower():
                print(f"\u2705 User {user_address} is backend of faucet {faucet_address}")
                return True
        except Exception as e:
            print(f"\u26a0\ufe0f Could not check backend: {str(e)}")
       
        print(f"\u274c User {user_address} is not authorized for faucet {faucet_address}")
        return False
       
    except Exception as e:
        print(f"\u274c Error checking authorization: {str(e)}")
        return False
# Task Management Functions
async def store_faucet_tasks(faucet_address: str, tasks: List[Dict], user_address: str):
    """Store tasks for ANY faucet type in Supabase."""
    try:
        if not Web3.is_address(faucet_address):
            raise HTTPException(status_code=400, detail=f"Invalid faucet address: {faucet_address}")
       
        checksum_faucet_address = Web3.to_checksum_address(faucet_address)
        checksum_user_address = Web3.to_checksum_address(user_address)
       
        data = {
            "faucet_address": checksum_faucet_address,
            "tasks": tasks,
            "created_by": checksum_user_address,
            "created_at": datetime.now().isoformat(),
            "updated_at": datetime.now().isoformat()
        }
       
        # Upsert: replace existing tasks or create new ones
        response = supabase.table("faucet_tasks").upsert(
            data,
            on_conflict="faucet_address" # Replace if faucet already has tasks
        ).execute()
       
        if not response.data:
            raise HTTPException(status_code=500, detail="Failed to store faucet tasks")
           
        print(f"\u2705 Stored {len(tasks)} tasks for faucet {checksum_faucet_address}")
        print(f"\ud83d\udcdd Task types: {[task.get('platform', 'general') for task in tasks[:5]]}") # Show first 5 platforms
       
        return response.data[0]
       
    except HTTPException:
        raise
    except Exception as e:
        print(f"\ud83d\udca5 Database error in store_faucet_tasks: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
async def get_faucet_tasks(faucet_address: str) -> Optional[Dict]:
    """Get tasks for a faucet from Supabase."""
    try:
        if not Web3.is_address(faucet_address):
            raise HTTPException(status_code=400, detail=f"Invalid faucet address: {faucet_address}")
       
        checksum_faucet_address = Web3.to_checksum_address(faucet_address)
       
        response = supabase.table("faucet_tasks").select("*").eq(
            "faucet_address", checksum_faucet_address
        ).execute()
       
        if response.data and len(response.data) > 0:
            return response.data[0]
       
        return None
       
    except HTTPException:
        raise
    except Exception as e:
        print(f"Database error in get_faucet_tasks: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
async def whitelist_user(w3: Web3, faucet_address: str, user_address: str) -> str:
    try:
        chain_info = get_chain_info(w3.eth.chain_id)
       
        faucet_contract = w3.eth.contract(address=faucet_address, abi=FAUCET_ABI)
       
        # Check balance with simplified requirements
        balance_ok, balance_error = check_sufficient_balance(w3, signer.address)
        if not balance_ok:
            raise HTTPException(status_code=400, detail=balance_error)
       
        # Build transaction with standard gas
        tx = build_transaction_with_standard_gas(
            w3,
            faucet_contract.functions.setWhitelist(user_address, True),
            signer.address
        )
       
        # Sign and send
        signed_tx = w3.eth.account.sign_transaction(tx, signer.key)
        tx_hash = w3.eth.send_raw_transaction(signed_tx.raw_transaction)
        receipt = await wait_for_transaction_receipt(w3, tx_hash.hex())
       
        if receipt.get('status', 0) != 1:
            raise HTTPException(status_code=400, detail=f"Whitelist transaction failed: {tx_hash.hex()}")
       
        print(f"\u2705 Whitelist successful on {chain_info['name']}: {tx_hash.hex()}")
        return tx_hash.hex()
       
    except HTTPException as e:
        raise e
    except Exception as e:
        print(f"ERROR in whitelist_user: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
# Enhanced Secret Code Database Functions
async def get_secret_code_from_db(faucet_address: str) -> Optional[Dict[str, Any]]:
    """
    Get secret code from database for a specific faucet address.
    """
    try:
        if not Web3.is_address(faucet_address):
            raise HTTPException(status_code=400, detail=f"Invalid faucet address: {faucet_address}")
       
        # Convert to checksum address for consistency
        checksum_address = Web3.to_checksum_address(faucet_address)
       
        response = supabase.table("secret_codes").select("*").eq("faucet_address", checksum_address).execute()
       
        if not response.data or len(response.data) == 0:
            return None
       
        record = response.data[0]
        current_time = int(datetime.now().timestamp())
       
        return {
            "faucet_address": record["faucet_address"],
            "secret_code": record["secret_code"],
            "start_time": record["start_time"],
            "end_time": record["end_time"],
            "is_valid": record["start_time"] <= current_time <= record["end_time"],
            "is_expired": current_time > record["end_time"],
            "is_future": current_time < record["start_time"],
            "created_at": record.get("created_at"),
            "time_remaining": max(0, record["end_time"] - current_time) if current_time <= record["end_time"] else 0
        }
       
    except HTTPException:
        raise
    except Exception as e:
        print(f"Database error in get_secret_code_from_db: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
async def get_valid_secret_code(faucet_address: str) -> Optional[str]:
    """
    Get only the secret code string if it's currently valid.
    """
    try:
        code_data = await get_secret_code_from_db(faucet_address)
       
        if code_data and code_data["is_valid"]:
            return code_data["secret_code"]
           
        return None
       
    except Exception as e:
        print(f"Error getting valid secret code: {str(e)}")
        return None
async def get_all_secret_codes() -> list:
    """
    Get all secret codes from database with their validity status.
    """
    try:
        response = supabase.table("secret_codes").select("*").order("created_at", desc=True).execute()
       
        if not response.data:
            return []
       
        current_time = int(datetime.now().timestamp())
        codes = []
       
        for row in response.data:
            codes.append({
                "faucet_address": row["faucet_address"],
                "secret_code": row["secret_code"],
                "start_time": row["start_time"],
                "end_time": row["end_time"],
                "is_valid": row["start_time"] <= current_time <= row["end_time"],
                "is_expired": current_time > row["end_time"],
                "is_future": current_time < row["start_time"],
                "created_at": row.get("created_at"),
                "time_remaining": max(0, row["end_time"] - current_time) if current_time <= row["end_time"] else 0
            })
       
        return codes
       
    except Exception as e:
        print(f"Database error in get_all_secret_codes: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
# --- NEW FAUCET DELETION UTILITIES ---
async def get_all_deleted_faucets() -> List[Dict]:
    """
    Retrieves all deleted faucet records from the 'deleted_faucets' table.
    """
    try:
        print("\ud83d\udd0d Retrieving all deleted faucet addresses from Supabase...")
        
        # Select all columns, ordered by most recently deleted
        response = supabase.table("deleted_faucets").select("*").order("deleted_at", desc=True).execute()
        
        deleted_records = response.data or []
        
        print(f"\u2705 Found {len(deleted_records)} deleted faucet records.")
        return deleted_records
        
    except Exception as e:
        print(f"\ud83d\udca5 Database error in get_all_deleted_faucets: {str(e)}")
        # Log the error and return an empty list gracefully
        return []
    
async def record_deleted_faucet(faucet_address: str, deleted_by: str, chain_id: int):
    """
    Records a faucet address in the 'deleted_faucets' table in Supabase 
    AFTER the on-chain transaction succeeded.
    """
    try:
        if not Web3.is_address(faucet_address) or not Web3.is_address(deleted_by):
            raise ValueError("Invalid address format for faucet or deleter.")
        
        checksum_faucet_address = Web3.to_checksum_address(faucet_address)
        checksum_deleted_by = Web3.to_checksum_address(deleted_by)
        
        data = {
            "faucet_address": checksum_faucet_address,
            "deleted_by": checksum_deleted_by,
            "chain_id": chain_id,
            "deleted_at": datetime.now().isoformat()
        }
        
        # Insert the record. Assumes the "deleted_faucets" table has been created in Supabase.
        response = supabase.table("deleted_faucets").upsert(data, on_conflict="faucet_address").execute()
        
        if not response.data:
            raise Exception("Failed to record deleted faucet in Supabase.")
        
        print(f"\u2705 Recorded deleted faucet {checksum_faucet_address} by {checksum_deleted_by}")
        return response.data[0]
        
    except Exception as e:
        print(f"\ud83d\udca5 Database error in record_deleted_faucet: {str(e)}")
        raise
async def is_faucet_permanently_deleted(faucet_address: str) -> bool:
    """
    Checks if a faucet is marked as permanently deleted in the Supabase table.
    """
    try:
        if not Web3.is_address(faucet_address):
            return False
            
        checksum_faucet_address = Web3.to_checksum_address(faucet_address)
        
        response = supabase.table("deleted_faucets").select("faucet_address").eq(
            "faucet_address", checksum_faucet_address
        ).execute()
        
        return len(response.data) > 0
        
    except Exception as e:
        print(f"\u26a0\ufe0f Error checking deletion status in DB: {str(e)}")
        return False    
async def check_secret_code_status(faucet_address: str, secret_code: str) -> Dict[str, Any]:
    """
    Check if a provided secret code matches and is valid for a faucet.
    """
    try:
        code_data = await get_secret_code_from_db(faucet_address)
       
        if not code_data:
            return {
                "valid": False,
                "reason": "No secret code found for this faucet",
                "code_exists": False
            }
       
        code_matches = code_data["secret_code"] == secret_code
        time_valid = code_data["is_valid"]
       
        result = {
            "valid": code_matches and time_valid,
            "code_exists": True,
            "code_matches": code_matches,
            "time_valid": time_valid,
            "is_expired": code_data["is_expired"],
            "is_future": code_data["is_future"],
            "time_remaining": code_data["time_remaining"]
        }
       
        if not code_matches:
            result["reason"] = "Secret code does not match"
        elif not time_valid:
            if code_data["is_expired"]:
                result["reason"] = "Secret code has expired"
            elif code_data["is_future"]:
                result["reason"] = "Secret code is not yet active"
            else:
                result["reason"] = "Secret code is not currently valid"
        else:
            result["reason"] = "Valid"
           
        return result
       
    except Exception as e:
        print(f"Error checking secret code status: {str(e)}")
        return {
            "valid": False,
            "reason": f"Error checking code: {str(e)}",
            "code_exists": False
        }
async def generate_secret_code() -> str:
    """Generate a 6-character alphanumeric secret code."""
    characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
    return ''.join(secrets.choice(characters) for _ in range(6))
async def store_secret_code(faucet_address: str, secret_code: str, start_time: int, end_time: int):
    """Store the secret code in Supabase."""
    try:
        data = {
            "faucet_address": faucet_address,
            "secret_code": secret_code,
            "start_time": start_time,
            "end_time": end_time
        }
        response = supabase.table("secret_codes").upsert(data, on_conflict="faucet_address").execute()
        if not response.data:
            raise HTTPException(status_code=500, detail="Failed to store secret code in Supabase")
    except Exception as e:
        print(f"Supabase error in store_secret_code: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Supabase error: {str(e)}")
# Updated verify_secret_code function using the new helper
async def verify_secret_code(faucet_address: str, secret_code: str) -> bool:
    """Verify the secret code against Supabase."""
    try:
        status = await check_secret_code_status(faucet_address, secret_code)
        return status["valid"]
    except Exception as e:
        print(f"Error in verify_secret_code: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
async def save_admin_popup_preference(user_address: str, faucet_address: str, dont_show_again: bool):
    """Save the admin popup preference to Supabase."""
    try:
        if not Web3.is_address(user_address) or not Web3.is_address(faucet_address):
            raise HTTPException(status_code=400, detail="Invalid address format")
       
        # Convert to checksum addresses for consistency
        checksum_user_address = Web3.to_checksum_address(user_address)
        checksum_faucet_address = Web3.to_checksum_address(faucet_address)
       
        data = {
            "user_address": checksum_user_address,
            "faucet_address": checksum_faucet_address,
            "dont_show_admin_popup": dont_show_again,
            "updated_at": datetime.now().isoformat()
        }
       
        # Upsert: insert or update if combination already exists
        response = supabase.table("admin_popup_preferences").upsert(
            data,
            on_conflict="user_address,faucet_address"
        ).execute()
       
        if not response.data:
            raise HTTPException(status_code=500, detail="Failed to save admin popup preference")
           
        return response.data[0]
       
    except HTTPException:
        raise
    except Exception as e:
        print(f"Database error in save_admin_popup_preference: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
async def get_admin_popup_preference(user_address: str, faucet_address: str) -> bool:
    """Get the admin popup preference from Supabase. Returns False if not found."""
    try:
        if not Web3.is_address(user_address) or not Web3.is_address(faucet_address):
            return False
       
        # Convert to checksum addresses for consistency
        checksum_user_address = Web3.to_checksum_address(user_address)
        checksum_faucet_address = Web3.to_checksum_address(faucet_address)
       
        response = supabase.table("admin_popup_preferences").select("dont_show_admin_popup").eq(
            "user_address", checksum_user_address
        ).eq(
            "faucet_address", checksum_faucet_address
        ).execute()
       
        if response.data and len(response.data) > 0:
            return response.data[0]["dont_show_admin_popup"]
       
        # Default to False (show popup) if no preference found
        return False
       
    except Exception as e:
        print(f"Database error in get_admin_popup_preference: {str(e)}")
        # Return False on error so popup still shows
        return False
async def get_user_all_popup_preferences(user_address: str) -> list:
    """Get all admin popup preferences for a specific user."""
    try:
        if not Web3.is_address(user_address):
            raise HTTPException(status_code=400, detail="Invalid user address format")
       
        checksum_user_address = Web3.to_checksum_address(user_address)
       
        response = supabase.table("admin_popup_preferences").select("*").eq(
            "user_address", checksum_user_address
        ).execute()
       
        return response.data or []
       
    except HTTPException:
        raise
    except Exception as e:
        print(f"Database error in get_user_all_popup_preferences: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
async def claim_tokens_no_code(w3: Web3, faucet_address: str, user_address: str, divvi_data: Optional[str] = None) -> str:
    try:
        chain_info = get_chain_info(w3.eth.chain_id)
       
        # Check if paused
        is_paused = await check_pause_status(w3, faucet_address)
        if is_paused:
            raise HTTPException(status_code=400, detail="Faucet is paused")
        # Check balance
        balance_ok, balance_error = check_sufficient_balance(w3, signer.address)
        if not balance_ok:
            raise HTTPException(status_code=400, detail=balance_error)
        faucet_contract = w3.eth.contract(address=faucet_address, abi=FAUCET_ABI)
       
        # Build transaction with standard gas
        tx = build_transaction_with_standard_gas(
            w3,
            faucet_contract.functions.claim([user_address]),
            signer.address
        )
       
        # Handle Divvi referral data
        if divvi_data:
            print(f"Adding Divvi referral data: {divvi_data[:50]}...")
           
            if isinstance(divvi_data, str) and divvi_data.startswith('0x'):
                try:
                    divvi_bytes = bytes.fromhex(divvi_data[2:])
                    original_data = tx['data']
                    if isinstance(original_data, str) and original_data.startswith('0x'):
                        original_bytes = bytes.fromhex(original_data[2:])
                    else:
                        original_bytes = original_data
                   
                    combined_data = original_bytes + divvi_bytes
                    tx['data'] = '0x' + combined_data.hex()
                   
                    print(f"Successfully appended Divvi data. Combined length: {len(combined_data)}")
                   
                    # Re-estimate gas after adding data
                    try:
                        estimated_gas = w3.eth.estimate_gas(tx)
                        tx['gas'] = int(estimated_gas * 1.15) # 15% buffer for Divvi data
                        print(f"\u26fd Updated gas limit after Divvi data: {tx['gas']}")
                    except Exception as e:
                        print(f"\u26a0\ufe0f Gas re-estimation failed: {str(e)}, keeping original gas limit")
                   
                except Exception as e:
                    print(f"Failed to process Divvi data: {str(e)}")
       
        # Sign and send transaction
        signed_tx = w3.eth.account.sign_transaction(tx, signer.key)
        tx_hash = w3.eth.send_raw_transaction(signed_tx.raw_transaction)
        receipt = await wait_for_transaction_receipt(w3, tx_hash.hex())
       
        if receipt.get('status', 0) != 1:
            try:
                w3.eth.call(tx, block_identifier=receipt['blockNumber'])
            except Exception as revert_error:
                raise HTTPException(status_code=400, detail=f"Claim failed: {str(revert_error)}")
       
        print(f"\u2705 Claim no-code successful on {chain_info['name']}: {tx_hash.hex()}")
        return tx_hash.hex()
       
    except HTTPException as e:
        raise e
    except Exception as e:
        print(f"ERROR in claim_tokens_no_code: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to claim tokens: {str(e)}")
async def claim_tokens(w3: Web3, faucet_address: str, user_address: str, secret_code: str, divvi_data: Optional[str] = None) -> str:
    try:
        chain_info = get_chain_info(w3.eth.chain_id)
       
        # Validate secret code first
        is_valid_code = await verify_secret_code(faucet_address, secret_code)
        if not is_valid_code:
            raise HTTPException(status_code=403, detail="Invalid or expired secret code")
        # Check if paused
        is_paused = await check_pause_status(w3, faucet_address)
        if is_paused:
            raise HTTPException(status_code=400, detail="Faucet is paused")
        # Check balance
        balance_ok, balance_error = check_sufficient_balance(w3, signer.address)
        if not balance_ok:
            raise HTTPException(status_code=400, detail=balance_error)
        faucet_contract = w3.eth.contract(address=faucet_address, abi=FAUCET_ABI)
       
        # Build transaction with standard gas
        tx = build_transaction_with_standard_gas(
            w3,
            faucet_contract.functions.claim([user_address]),
            signer.address
        )
       
        # Handle Divvi referral data
        if divvi_data:
            print(f"Adding Divvi referral data: {divvi_data[:50]}...")
           
            if isinstance(divvi_data, str) and divvi_data.startswith('0x'):
                try:
                    divvi_bytes = bytes.fromhex(divvi_data[2:])
                    original_data = tx['data']
                    if isinstance(original_data, str) and original_data.startswith('0x'):
                        original_bytes = bytes.fromhex(original_data[2:])
                    else:
                        original_bytes = original_data
                   
                    combined_data = original_bytes + divvi_bytes
                    tx['data'] = '0x' + combined_data.hex()
                   
                    print(f"Successfully appended Divvi data. Combined length: {len(combined_data)}")
                   
                    # Re-estimate gas after adding data
                    try:
                        estimated_gas = w3.eth.estimate_gas(tx)
                        tx['gas'] = int(estimated_gas * 1.15) # 15% buffer for Divvi data
                        print(f"\u26fd Updated gas limit after Divvi data: {tx['gas']}")
                    except Exception as e:
                        print(f"\u26a0\ufe0f Gas re-estimation failed: {str(e)}, keeping original gas limit")
                   
                except Exception as e:
                    print(f"Failed to process Divvi data: {str(e)}")
       
        # Sign and send transaction
        signed_tx = w3.eth.account.sign_transaction(tx, signer.key)
        tx_hash = w3.eth.send_raw_transaction(signed_tx.raw_transaction)
        receipt = await wait_for_transaction_receipt(w3, tx_hash.hex())
       
        if receipt.get('status', 0) != 1:
            try:
                w3.eth.call(tx, block_identifier=receipt['blockNumber'])
            except Exception as revert_error:
                raise HTTPException(status_code=400, detail=f"Claim failed: {str(revert_error)}")
       
        print(f"\u2705 Claim successful on {chain_info['name']}: {tx_hash.hex()}")
        return tx_hash.hex()
       
    except HTTPException as e:
        raise e
    except Exception as e:
        print(f"ERROR in claim_tokens: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to claim tokens: {str(e)}")
   
async def claim_tokens_custom(w3: Web3, faucet_address: str, user_address: str, divvi_data: Optional[str] = None) -> str:
    try:
        chain_info = get_chain_info(w3.eth.chain_id)
       
        # Check if paused
        is_paused = await check_pause_status(w3, faucet_address)
        if is_paused:
            raise HTTPException(status_code=400, detail="Faucet is paused")
        faucet_contract = w3.eth.contract(address=faucet_address, abi=FAUCET_ABI)
       
        # Check custom amount
        try:
            has_custom_amount = faucet_contract.functions.hasCustomClaimAmount(user_address).call()
            if not has_custom_amount:
                raise HTTPException(status_code=400, detail="No custom claim amount set for this address")
           
            custom_amount = faucet_contract.functions.getCustomClaimAmount(user_address).call()
            if custom_amount <= 0:
                raise HTTPException(status_code=400, detail="Custom claim amount is zero")
               
            print(f"User {user_address} has custom claim amount: {custom_amount}")
        except HTTPException:
            raise
        except Exception as e:
            print(f"Error checking custom claim amount: {str(e)}")
            raise HTTPException(status_code=500, detail="Failed to check custom claim amount")
       
        # Check if already claimed
        try:
            has_claimed = faucet_contract.functions.hasClaimed(user_address).call()
            if has_claimed:
                raise HTTPException(status_code=400, detail="User has already claimed from this faucet")
        except HTTPException:
            raise
        except Exception as e:
            print(f"Error checking claim status: {str(e)}")
        # Check balance
        balance_ok, balance_error = check_sufficient_balance(w3, signer.address)
        if not balance_ok:
            raise HTTPException(status_code=400, detail=balance_error)
        # Build transaction with standard gas
        tx = build_transaction_with_standard_gas(
            w3,
            faucet_contract.functions.claim([user_address]),
            signer.address
        )
       
        # Handle Divvi referral data
        if divvi_data:
            print(f"Adding Divvi referral data: {divvi_data[:50]}...")
           
            if isinstance(divvi_data, str) and divvi_data.startswith('0x'):
                try:
                    divvi_bytes = bytes.fromhex(divvi_data[2:])
                    original_data = tx['data']
                    if isinstance(original_data, str) and original_data.startswith('0x'):
                        original_bytes = bytes.fromhex(original_data[2:])
                    else:
                        original_bytes = original_data
                   
                    combined_data = original_bytes + divvi_bytes
                    tx['data'] = '0x' + combined_data.hex()
                   
                    print(f"Successfully appended Divvi data. Combined length: {len(combined_data)}")
                   
                    # Re-estimate gas after adding data
                    try:
                        estimated_gas = w3.eth.estimate_gas(tx)
                        tx['gas'] = int(estimated_gas * 1.15) # 15% buffer for Divvi data
                        print(f"\u26fd Updated gas limit after Divvi data: {tx['gas']}")
                    except Exception as e:
                        print(f"\u26a0\ufe0f Gas re-estimation failed: {str(e)}, keeping original gas limit")
                   
                except Exception as e:
                    print(f"Failed to process Divvi data: {str(e)}")
       
        # Sign and send transaction
        signed_tx = w3.eth.account.sign_transaction(tx, signer.key)
        tx_hash = w3.eth.send_raw_transaction(signed_tx.raw_transaction)
        receipt = await wait_for_transaction_receipt(w3, tx_hash.hex())
       
        if receipt.get('status', 0) != 1:
            try:
                w3.eth.call(tx, block_identifier=receipt['blockNumber'])
            except Exception as revert_error:
                raise HTTPException(status_code=400, detail=f"Claim failed: {str(revert_error)}")
       
        print(f"\u2705 Custom claim successful on {chain_info['name']}: {tx_hash.hex()}")
        return tx_hash.hex()
       
    except HTTPException as e:
        raise e
    except Exception as e:
        print(f"ERROR in claim_tokens_custom: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to claim tokens: {str(e)}")
# Enhanced set_claim_parameters function for ALL faucet types
# Updated set_claim_parameters function to APPEND tasks instead of overwriting
async def set_claim_parameters(faucetAddress: str, start_time: int, end_time: int, tasks: Optional[List[Dict]] = None) -> str:
    try:
        # 1. Generate secret code for dropcode faucets (still needed for dropcode)
        secret_code = await generate_secret_code()
        await store_secret_code(faucetAddress, secret_code, start_time, end_time)
        
        # 2. Handle Task Merging
        if tasks:
            print(f"\ud83d\udcdd Processing tasks for faucet {faucetAddress}")
            
            # A. Fetch Existing Tasks first
            existing_tasks = []
            try:
                existing_data = await get_faucet_tasks(faucetAddress)
                if existing_data and "tasks" in existing_data:
                    existing_tasks = existing_data["tasks"]
                    print(f"found {len(existing_tasks)} existing tasks.")
            except Exception as e:
                print(f"No existing tasks found or DB error: {e}")
            # B. Combine Existing + New Tasks
            # Note: This simply appends. If you want to prevent duplicates, 
            # you would need to filter by URL or ID here.
            combined_tasks = existing_tasks + tasks
            
            # C. Store the Combined List (Use backend signer as creator for set-claim-parameters calls)
            await store_faucet_tasks(faucetAddress, combined_tasks, signer.address)
            print(f"\u2705 Successfully stored {len(combined_tasks)} total tasks (appended) for faucet {faucetAddress}")
        
        print(f"\ud83d\udd10 Generated secret code for {faucetAddress}: {secret_code}")
        return secret_code
        
    except HTTPException as e:
        raise e
    except Exception as e:
        print(f"ERROR in set_claim_parameters: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to set parameters: {str(e)}")
# Helper function to check if user is platform owner
async def check_platform_owner_authorization(user_address: str) -> bool:
    """Check if user address is the platform owner"""
    return user_address.lower() == PLATFORM_OWNER.lower()
async def store_droplist_config(config: DroplistConfig, tasks: List[DroplistTask], user_address: str):
    """Store droplist configuration in Supabase"""
    try:
        # Convert tasks to storage format
        tasks_data = [task.dict() for task in tasks]
       
        data = {
            "platform_owner": user_address,
            "config": config.dict(),
            "tasks": tasks_data,
            "created_at": datetime.now().isoformat(),
            "updated_at": datetime.now().isoformat()
        }
       
        # Upsert configuration (replace if exists)
        response = supabase.table("droplist_config").upsert(
            data,
            on_conflict="platform_owner"
        ).execute()
       
        if not response.data:
            raise HTTPException(status_code=500, detail="Failed to store droplist config")
           
        print(f"\u2705 Stored droplist config with {len(tasks)} tasks for owner {user_address}")
        return response.data[0]
       
    except Exception as e:
        print(f"\ud83d\udca5 Database error in store_droplist_config: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
async def get_droplist_config() -> Optional[Dict]:
    """Get current droplist configuration"""
    try:
        response = supabase.table("droplist_config").select("*").eq(
            "platform_owner", PLATFORM_OWNER
        ).execute()
       
        if response.data and len(response.data) > 0:
            return response.data[0]
       
        return None
       
    except Exception as e:
        print(f"Database error in get_droplist_config: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
async def store_user_profile(profile: UserProfile):
    """Store or update user profile in Supabase"""
    try:
        data = {
            "wallet_address": profile.walletAddress,
            "x_accounts": profile.xAccounts,
            "completed_tasks": profile.completedTasks,
            "droplist_status": profile.droplistStatus,
            "updated_at": datetime.now().isoformat()
        }
       
        response = supabase.table("droplist_users").upsert(
            data,
            on_conflict="wallet_address"
        ).execute()
       
        if not response.data:
            raise HTTPException(status_code=500, detail="Failed to store user profile")
           
        return response.data[0]
       
    except Exception as e:
        print(f"Database error in store_user_profile: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
async def get_user_profile(wallet_address: str) -> Optional[UserProfile]:
    """Get user profile from Supabase"""
    try:
        if not Web3.is_address(wallet_address):
            return None
           
        checksum_address = Web3.to_checksum_address(wallet_address)
       
        response = supabase.table("droplist_users").select("*").eq(
            "wallet_address", checksum_address
        ).execute()
       
        if response.data and len(response.data) > 0:
            data = response.data[0]
            return UserProfile(
                walletAddress=data["wallet_address"],
                xAccounts=data.get("x_accounts", []),
                completedTasks=data.get("completed_tasks", []),
                droplistStatus=data.get("droplist_status", "pending")
            )
       
        return None
       
    except Exception as e:
        print(f"Database error in get_user_profile: {str(e)}")
        return None
    
async def generate_new_drop_code_only(faucet_address: str) -> str:
    """
    Generate a new drop code and update it in the database with smart timing logic.
    If existing code is expired, make new code active immediately.
    If existing code is still valid, preserve the timing.
    """
    try:
        current_time = int(datetime.now().timestamp())
       
        # Get existing secret code data to check timing
        existing_code_data = await get_secret_code_from_db(faucet_address)
       
        if existing_code_data:
            old_start_time = existing_code_data["start_time"]
            old_end_time = existing_code_data["end_time"]
            is_expired = existing_code_data["is_expired"]
            is_future = existing_code_data["is_future"]
           
            print(f"\ud83d\udcc5 Existing timing: start={old_start_time}, end={old_end_time}, expired={is_expired}, future={is_future}")
           
            if is_expired:
                # Old code is expired - make new code active immediately for 30 days
                start_time = current_time
                end_time = current_time + (30 * 24 * 60 * 60) # 30 days from now
                print(f"\ud83d\udd04 Old code expired, making new code active immediately until {datetime.fromtimestamp(end_time)}")
            elif is_future:
                # Old code hasn't started yet - preserve start time but extend end time if needed
                start_time = old_start_time
                # Ensure at least 7 days from start time
                min_end_time = old_start_time + (7 * 24 * 60 * 60)
                end_time = max(old_end_time, min_end_time)
                print(f"\u23f3 Old code is future, preserving start time {old_start_time}, end time set to {end_time}")
            else:
                # Old code is currently valid - preserve existing timing
                start_time = old_start_time
                end_time = old_end_time
                print(f"\u2705 Old code is valid, preserving existing timing")
        else:
            # No existing code - set new timing (active immediately for 30 days)
            start_time = current_time
            end_time = current_time + (30 * 24 * 60 * 60) # 30 days from now
            print(f"\ud83c\udd95 No existing code, setting new timing: start={start_time}, end={end_time}")
       
        # Generate new secret code
        new_secret_code = await generate_secret_code()
       
        # Store the new code with smart timing
        await store_secret_code(faucet_address, new_secret_code, start_time, end_time)
       
        # Verify the new code is properly stored and valid
        verification = await get_secret_code_from_db(faucet_address)
        if verification:
            print(f"\u2705 New code verification: valid={verification['is_valid']}, expired={verification['is_expired']}")
       
        print(f"\u2705 Generated new drop code for {faucet_address}: {new_secret_code}")
        print(f"\u23f0 Active period: {datetime.fromtimestamp(start_time)} to {datetime.fromtimestamp(end_time)}")
       
        return new_secret_code
       
    except HTTPException as e:
        raise e
    except Exception as e:
        print(f"ERROR in generate_new_drop_code_only: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to generate new drop code: {str(e)}")


@router.get("/debug/drop-code-status/{faucetAddress}")
async def debug_drop_code_status(faucetAddress: str):
    """Debug endpoint to check current drop code status."""
    try:
        if not Web3.is_address(faucetAddress):
            raise HTTPException(status_code=400, detail="Invalid faucet address format")
       
        faucet_address = Web3.to_checksum_address(faucetAddress)
        code_data = await get_secret_code_from_db(faucet_address)
       
        if not code_data:
            return {
                "success": False,
                "faucetAddress": faucet_address,
                "message": "No drop code found for this faucet"
            }
       
        return {
            "success": True,
            "faucetAddress": faucet_address,
            "hasCode": True,
            "isValid": code_data["is_valid"],
            "isExpired": code_data["is_expired"],
            "isFuture": code_data["is_future"],
            "timeRemaining": code_data["time_remaining"],
            "startTime": code_data["start_time"],
            "endTime": code_data["end_time"],
            "createdAt": code_data.get("created_at"),
            "code": code_data["secret_code"][:2] + "****" # Partially hidden for security
        }
       
    except Exception as e:
        return {
            "success": False,
            "error": str(e),
            "faucetAddress": faucetAddress
        }


@router.post("/get-secret-code-for-admin")
async def get_secret_code_for_admin_endpoint(request: GetSecretCodeForAdminRequest):
    """Get secret code for authorized users (owner, admin, backend)."""
    try:
        print(f"Admin secret code request: user={request.userAddress}, faucet={request.faucetAddress}")
       
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
       
        # Check if user is authorized
        is_authorized = await check_user_is_authorized_for_faucet(w3, faucet_address, user_address)
        if not is_authorized:
            raise HTTPException(
                status_code=403,
                detail="Access denied. User must be owner, admin, or backend address."
            )
       
        # Get secret code data
        code_data = await get_secret_code_from_db(faucet_address)
       
        if not code_data:
            raise HTTPException(
                status_code=404,
                detail=f"No secret code found for faucet: {faucet_address}"
            )
       
        print(f"\u2705 Authorized admin access: {user_address} accessing secret code for {faucet_address}")
       
        return {
            "success": True,
            "faucetAddress": faucet_address,
            "userAddress": user_address,
            "secretCode": code_data["secret_code"],
            "startTime": code_data["start_time"],
            "endTime": code_data["end_time"],
            "isValid": code_data["is_valid"],
            "isExpired": code_data["is_expired"],
            "isFuture": code_data["is_future"],
            "timeRemaining": code_data["time_remaining"],
            "createdAt": code_data["created_at"]
        }
       
    except HTTPException as e:
        raise e
    except Exception as e:
        print(f"Error in get_secret_code_for_admin: {str(e)}")


@router.post("/admin/verify-task")
async def admin_verify_task(submission_id: str, action: str): # action = "approve" or "reject"
    if action == "approve":
        # 1. Update task_completions status to 'verified'
        # 2. Trigger the point addition logic to the user's total profile
        supabase.table("task_completions").update({"status": "verified"}).eq("id", submission_id).execute()
        return {"status": "success", "message": "Points awarded"}
    else:
        # Mark as rejected so the user can try again
        supabase.table("task_completions").update({"status": "rejected"}).eq("id", submission_id).execute()
        return {"status": "rejected", "message": "Proof denied"}


@router.get("/get-secret-code")
async def get_secret_code(request: GetSecretCodeRequest):
    """Legacy endpoint for backward compatibility."""
    try:
        if not Web3.is_address(request.faucetAddress):
            raise HTTPException(status_code=400, detail=f"Invalid faucetAddress: {request.faucetAddress}")
       
        faucet_address = Web3.to_checksum_address(request.faucetAddress)
        code_data = await get_secret_code_from_db(faucet_address)
       
        if not code_data:
            raise HTTPException(status_code=404, detail=f"No secret code found for faucet address: {faucet_address}")
       
        return {
            "faucetAddress": faucet_address,
            "secretCode": code_data["secret_code"],
            "startTime": code_data["start_time"],
            "endTime": code_data["end_time"],
            "isValid": code_data["is_valid"],
            "createdAt": code_data["created_at"]
        }
    except HTTPException as e:
        raise e
    except Exception as e:
        print(f"Error in get_secret_code: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to retrieve secret code: {str(e)}")
# USDT Functions and Endpoints (keeping existing USDT functionality)


@router.post("/api/admin/approve-submission")
async def admin_approve_submission(req: ApprovalRequest):
    """
    Called by the external Verifier Service when a task is passed.
    """
    # In production, check for a shared SECRET_KEY header here for security!
    
    if req.status == "approved":
        # 1. Fetch submission details
        sub_res = supabase.table("submissions").select("*").eq("submission_id", req.submissionId).execute()
        if not sub_res.data:
            return {"success": False, "message": "Submission not found"}
            
        sub = sub_res.data[0]
        
        # 2. Call your existing auto-approval logic
        await process_auto_approval(
            req.submissionId, 
            sub['faucet_address'], 
            sub['wallet_address']
        )
        
        return {"success": True}
    
    return {"success": False}
