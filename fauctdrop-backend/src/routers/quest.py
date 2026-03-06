"""
routers/quest.py — Quest Management & Actions endpoints.

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
    VerificationResult, VerificationRule, VerifyMessageCountRequest,
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

router = APIRouter(tags=["Quest Management"])

@router.post("/api/quests/{faucet_address}/verify-onchain", tags=["Quest Verifications"])
async def verify_onchain_task(faucet_address: str, req: OnchainVerifyRequest):
    """
    Verifies on-chain actions like token holding, tx counts, and contract interactions.
    Supports verifying a DIFFERENT address than the main connected wallet.
    """
    try:
        # 1. Fetch Task Details
        quest_res = supabase.table("quests").select("tasks").eq("faucet_address", faucet_address).execute()
        if not quest_res.data:
            raise HTTPException(status_code=404, detail="Quest not found")
            
        tasks = quest_res.data[0].get("tasks", [])
        task = next((t for t in tasks if t["id"] == req.taskId), None)
        if not task:
            raise HTTPException(status_code=404, detail="Task not found")
        action = task.get("action")
        target_address = Web3.to_checksum_address(req.targetAddress)
        w3 = await get_web3_instance(req.chainId)
        
        is_verified = False
        message = ""
        # ----------------------------------------------------
        # SCENARIO 1: HOLD TOKEN (ERC20 or Native)
        # ----------------------------------------------------
        if action == "hold_token":
            min_amount = float(task.get("minAmount", 0))
            contract_addr = task.get("targetContractAddress")
            
            if not contract_addr or contract_addr == Web3.to_checksum_address("0x0000000000000000000000000000000000000000"):
                # Check Native Balance (ETH/CELO)
                balance_wei = w3.eth.get_balance(target_address)
                balance = balance_wei / (10 ** 18)
            else:
                # Check ERC20 Balance
                token_contract = w3.eth.contract(address=Web3.to_checksum_address(contract_addr), abi=ERC20_ABI)
                balance_wei = token_contract.functions.balanceOf(target_address).call()
                decimals = token_contract.functions.decimals().call()
                balance = balance_wei / (10 ** decimals)
            is_verified = balance >= min_amount
            message = f"Wallet holds {balance} tokens (Requires {min_amount})"
        # ----------------------------------------------------
        # SCENARIO 2: HOLD NFT (ERC721)
        # ----------------------------------------------------
        elif action == "hold_nft":
            contract_addr = Web3.to_checksum_address(task.get("targetContractAddress"))
            nft_contract = w3.eth.contract(address=contract_addr, abi=ERC721_ABI)
            balance = nft_contract.functions.balanceOf(target_address).call()
            
            is_verified = balance > 0
            message = f"Wallet holds {balance} NFTs from collection."
        # ----------------------------------------------------
        # SCENARIO 3: TRANSACTION COUNT
        # ----------------------------------------------------
        elif action == "tx_count":
            min_tx = int(task.get("minTxCount", 1))
            tx_count = w3.eth.get_transaction_count(target_address)
            
            is_verified = tx_count >= min_tx
            message = f"Wallet has {tx_count} transactions (Requires {min_tx})"
        # ----------------------------------------------------
        # SCENARIO 4: TIMEBOUND INTERACTION / WALLET AGE
        # ----------------------------------------------------
        elif action in ["timebound_interaction", "wallet_age"]:
            
            # Fetch the dynamic URL and API key based on the connected chain
            explorer_api_url, api_key = get_explorer_config(req.chainId)
            
            async with aiohttp.ClientSession() as session:
                url = f"{explorer_api_url}?module=account&action=txlist&address={target_address}&startblock=0&endblock=99999999&page=1&offset=1000&sort=asc&apikey={api_key}"
                async with session.get(url) as resp:
                    data = await resp.json()
                    txs = data.get("result", [])
                    
                    if type(txs) != list: txs = []
            if action == "wallet_age":
                min_days = int(task.get("minDays", 30))
                if len(txs) == 0:
                    is_verified = False
                    message = "Wallet has no transaction history."
                else:
                    first_tx_time = int(txs[0]["timeStamp"])
                    days_old = (datetime.now().timestamp() - first_tx_time) / 86400
                    is_verified = days_old >= min_days
                    message = f"Wallet is {int(days_old)} days old (Requires {min_days})"
                    
            elif action == "timebound_interaction":
                target_contract = task.get("targetContractAddress", "").lower()
                start_time = int(datetime.fromisoformat(task.get("startDate").replace('Z', '+00:00')).timestamp()) if task.get("startDate") else 0
                end_time = int(datetime.fromisoformat(task.get("endDate").replace('Z', '+00:00')).timestamp()) if task.get("endDate") else 9999999999
                
                interacted = False
                for tx in txs:
                    tx_time = int(tx["timeStamp"])
                    if tx["to"].lower() == target_contract and start_time <= tx_time <= end_time:
                        interacted = True
                        break
                
                is_verified = interacted
                message = "Contract interaction found within time window." if interacted else "No valid interaction found in timeframe."
        else:
            raise HTTPException(status_code=400, detail="Unknown on-chain action")
        # ----------------------------------------------------
        # PROCESS RESULT
        # ----------------------------------------------------
        if is_verified:
            # 1. Update submission to Approved
            supabase.table("quest_submissions").update({"status": "approved", "notes": f"Verified via Address: {target_address}"}).eq("id", req.submissionId).execute()
            
            # 2. Add points to user's main wallet progress
            prog_res = supabase.table("quest_participants").select("points, completed_tasks").eq("quest_address", faucet_address).eq("wallet_address", req.mainWallet).execute()
            if prog_res.data:
                curr_points = prog_res.data[0]["points"]
                completed = prog_res.data[0].get("completed_tasks", [])
                
                if req.taskId not in completed:
                    completed.append(req.taskId)
                    new_points = curr_points + int(task["points"])
                    supabase.table("quest_participants").update({
                        "points": new_points,
                        "completed_tasks": completed
                    }).eq("quest_address", faucet_address).eq("wallet_address", req.mainWallet).execute()
            return {"verified": True, "message": "On-chain data verified successfully!", "details": message}
        else:
            # Reject submission
            supabase.table("quest_submissions").update({"status": "rejected", "notes": message}).eq("id", req.submissionId).execute()
            return {"verified": False, "message": "Verification failed", "reason": message}
    except Exception as e:
        print(f"Onchain Verify Error: {e}")
        return {"verified": False, "message": "Blockchain check failed", "reason": str(e)}
# \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
# 1. INDIVIDUAL VERIFIERS
# \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
async def verify_hold_token(wallet: str, chain: str, task: Dict) -> bool:
    """Verifies Native or ERC20 Token Balance"""
    print("\ud83d\udc49 Entering 'hold_token' logic...")
    w3 = get_w3(chain)
    wallet_cs = Web3.to_checksum_address(wallet)
    contract_address = task.get("targetContractAddress")
    min_amount = float(task.get("minAmount", 0))
    if not contract_address or contract_address.lower() == "native":
        print("   Checking NATIVE token balance...")
        balance_wei = w3.eth.get_balance(wallet_cs)
        balance = float(w3.from_wei(balance_wei, "ether"))
    else:
        print(f"   Checking ERC20 token balance for {contract_address}...")
        ca = Web3.to_checksum_address(contract_address)
        contract = w3.eth.contract(address=ca, abi=ERC20_ABI)
        balance_raw = contract.functions.balanceOf(wallet_cs).call()
        
        # Safely get decimals, default to 18 if not found
        try:
            decimals = contract.functions.decimals().call()
        except:
            decimals = 18
        balance = balance_raw / (10 ** decimals)
    print(f"   \u2705 Calculated Balance: {balance} | Required: {min_amount}")
    return float(balance) >= min_amount
async def verify_hold_nft(wallet: str, chain: str, task: Dict) -> bool:
    """Verifies ERC721 NFT Ownership"""
    print("\ud83d\udc49 Entering 'hold_nft' logic...")
    w3 = get_w3(chain)
    wallet_cs = Web3.to_checksum_address(wallet)
    contract_address = task.get("targetContractAddress")
    if not contract_address:
        print("   \u274c Error: No contract address provided for NFT check.")
        return False
    ca = Web3.to_checksum_address(contract_address)
    contract = w3.eth.contract(address=ca, abi=ERC721_ABI)
    balance = contract.functions.balanceOf(wallet_cs).call()
    print(f"   \u2705 NFT Balance Found: {balance} | Required: > 0")
    return balance > 0
async def verify_tx_count(wallet: str, chain: str, task: Dict) -> bool:
    """Verifies Total Transactions sent by the wallet (Nonce)"""
    print("\ud83d\udc49 Entering 'tx_count' logic...")
    w3 = get_w3(chain)
    wallet_cs = Web3.to_checksum_address(wallet)
    min_tx = int(task.get("minTxCount", 1))
    count = w3.eth.get_transaction_count(wallet_cs)
    print(f"   \u2705 On-Chain Nonce (Tx Count): {count} | Required: {min_tx}")
    return count >= min_tx
async def verify_wallet_age(wallet: str, chain: str, task: Dict) -> bool:
    """Verifies how old the wallet is (First Tx Date)"""
    print("\ud83d\udc49 Entering 'wallet_age' logic...")
    wallet_cs = Web3.to_checksum_address(wallet)
    min_days = int(task.get("minDays", 30))
    print(f"   Min Days Required: {min_days}")
    # 1. Try Alchemy API First
    client = alchemy_clients.get(chain)
    if client:
        try:
            res = client.core.get_asset_transfers(
                from_block="0x0",
                to_block="latest",
                from_address=wallet_cs,
                category=["external", "internal"],
                max_count=1,
                order="asc"
            )
            transfers_list = res.transfers if hasattr(res, 'transfers') else res.get('transfers', [])
            
            if transfers_list and len(transfers_list) > 0:
                first_tx = transfers_list[0]
                if hasattr(first_tx, 'metadata') and first_tx.metadata:
                    first_tx_ts = first_tx.metadata.block_timestamp
                else:
                    block_num = first_tx.block_num if hasattr(first_tx, 'block_num') else None
                    w3 = get_w3(chain)
                    block = w3.eth.get_block(block_num)
                    first_tx_ts = datetime.fromtimestamp(block['timestamp'], tz=timezone.utc).isoformat()
                
                oldest_dt = datetime.fromisoformat(first_tx_ts.replace("Z", "+00:00"))
                age_days = (datetime.now(timezone.utc) - oldest_dt).days
                print(f"   \u2705 Alchemy Wallet Age: {age_days} days")
                return age_days >= min_days
        except Exception as alchemy_error:
            print(f"   \u26a0\ufe0f Alchemy method failed: {alchemy_error}")
    # 2. Fallback: Binary Search via standard Web3 RPC
    print("   Using Web3 fallback method...")
    w3 = get_w3(chain)
    current_block = w3.eth.block_number
    scan_interval = max(1, current_block // 100) 
    oldest_block_with_tx = None
    
    for block_num in range(0, current_block, scan_interval):
        try:
            tx_count = w3.eth.get_transaction_count(wallet_cs, block_num)
            if tx_count > 0:
                oldest_block_with_tx = block_num
                break
        except:
            continue
    
    if not oldest_block_with_tx:
        print("   \u274c No transactions found (New wallet)")
        return False
    
    block = w3.eth.get_block(oldest_block_with_tx)
    oldest_dt = datetime.fromtimestamp(block['timestamp'], tz=timezone.utc)
    age_days = (datetime.now(timezone.utc) - oldest_dt).days
    
    print(f"   \u2705 Web3 Wallet Age: {age_days} days")
    return age_days >= min_days
async def verify_timebound_interaction(wallet: str, chain: str, task: Dict) -> bool:
    """Verifies if a wallet interacted with a contract within a specific date range."""
    print("\
\ud83d\udc49 Entering 'timebound_interaction' logic...")
    
    contract_address = task.get("targetContractAddress")
    start_date_str = task.get("startDate") 
    end_date_str = task.get("endDate")
    if not contract_address or not start_date_str or not end_date_str:
        print("   \u274c Missing required parameters: contract address, startDate, or endDate.")
        return False
    wallet_cs = Web3.to_checksum_address(wallet)
    contract_cs = Web3.to_checksum_address(contract_address)
    # Parse the target timeframe into timezone-aware datetimes
    start_dt = datetime.fromisoformat(start_date_str.replace("Z", "+00:00"))
    end_dt = datetime.fromisoformat(end_date_str.replace("Z", "+00:00"))
    
    print(f"   \u23f0 Required Window: {start_dt} to {end_dt} (UTC)")
    # 1. Try Alchemy API First
    client = alchemy_clients.get(chain)
    if client:
        print(f"   \ud83d\udd0d Using Alchemy API for {chain}...")
        page_key = None
        while True:
            try:
                res = client.core.get_asset_transfers(
                    from_block="0x0",
                    to_block="latest",
                    from_address=wallet_cs,
                    to_address=contract_cs,
                    category=["external", "erc20"],
                    with_metadata=True,
                    max_count=1000,
                    page_key=page_key
                )
                
                transfers_list = res.transfers if hasattr(res, 'transfers') else res.get('transfers', [])
                
                for tx in transfers_list:
                    meta = tx.metadata if hasattr(tx, 'metadata') else tx.get("metadata", {})
                    tx_ts_str = meta.block_timestamp if hasattr(meta, 'block_timestamp') else meta.get("blockTimestamp")
                    
                    if tx_ts_str:
                        tx_dt = datetime.fromisoformat(tx_ts_str.replace("Z", "+00:00"))
                        if start_dt <= tx_dt <= end_dt:
                            print(f"   \u2705 Interaction found via Alchemy at {tx_dt}")
                            return True
                page_key = res.page_key if hasattr(res, 'page_key') else res.get("pageKey")
                if not page_key:
                    break
            except Exception as e:
                print(f"   \u26a0\ufe0f Alchemy query failed: {e}. Falling back to Explorer API...")
                break
    # 2. Fallback: Block Explorer API (Etherscan V2 & Blockscout)
    print(f"   \ud83d\udd0d Using Block Explorer API fallback for {chain}...")
    
    chain_name = chain.value if hasattr(chain, 'value') else str(chain)
    etherscan_api_key = os.getenv("ETHERSCAN_API_KEY", "")
    
    # Etherscan V2 uses chain IDs to target the right network
    etherscan_v2_chains = {
        "ethereum": 1,
        "celo": 42220,
        "base": 8453,
        "arbitrum": 42161,
        "bnb": 56,
      
    }
    
    endpoints = []
    
    # Build V2 endpoints if it's an Etherscan-supported chain
    if chain_name in etherscan_v2_chains:
        if not etherscan_api_key:
            print("   \u274c ETHERSCAN_API_KEY not found in .env. Required for V2 Explorer API.")
            return False
            
        chain_id = etherscan_v2_chains[chain_name]
        base_v2_url = f"https://api.etherscan.io/v2/api?chainid={chain_id}"
        
        endpoints = [
            f"{base_v2_url}&module=account&action=txlist&address={wallet_cs}&startblock=0&endblock=99999999&page=1&offset=50&sort=desc&apikey={etherscan_api_key}",
            f"{base_v2_url}&module=account&action=tokentx&address={wallet_cs}&startblock=0&endblock=99999999&page=1&offset=50&sort=desc&apikey={etherscan_api_key}"
        ]
        
    # Blockscout fallback for Lisk
    elif chain_name == "lisk":
        endpoints = [
            f"https://blockscout.lisk.com/api?module=account&action=txlist&address={wallet_cs}&page=1&offset=50&sort=desc",
            f"https://blockscout.lisk.com/api?module=account&action=tokentx&address={wallet_cs}&page=1&offset=50&sort=desc"
        ]
    else:
        print(f"   \u274c No Explorer API mapped for {chain_name}.")
        return False
    # Execute Explorer Fetch
    import httpx
    try:
        async with httpx.AsyncClient(timeout=15.0) as http_client:
            found_contract_but_wrong_time = False
            for url in endpoints:
                print(f"   \ud83d\udce1 Pinging Explorer API...")
                resp = await http_client.get(url)
                data = resp.json()
                
                if data.get("status") == "1" and isinstance(data.get("result"), list):
                    txs = data["result"]
                    print(f"   \ud83d\udcca Fetched {len(txs)} transactions from Explorer.")
                    
                    for tx in txs:
                        tx_to = tx.get("to", "")
                        
                        # Check if 'to' address matches our target contract
                        if tx_to and tx_to.lower() == contract_cs.lower():
                            tx_ts = int(tx.get("timeStamp", 0))
                            tx_dt = datetime.fromtimestamp(tx_ts, tz=timezone.utc)
                            
                            if start_dt <= tx_dt <= end_dt:
                                print(f"   \u2705 VALID MATCH: Interaction found at {tx_dt} (TxHash: {tx.get('hash')})")
                                return True
                            else:
                                found_contract_but_wrong_time = True
                                print(f"   \u26a0\ufe0f Time Mismatch: Found interaction at {tx_dt}, but required window is {start_dt} to {end_dt}")
                else:
                    print(f"   \u274c Explorer Error/Empty: {data.get('message')} - {data.get('result')}")
            
            if not found_contract_but_wrong_time:
                print(f"   \u274c Checked recent transactions. None were sent to {contract_cs}.")
                print(f"      (Hint: Ensure the user interacted directly with {contract_cs} and not a Router/Proxy).")
    except Exception as e:
        print(f"   \u274c Explorer API query failed entirely: {e}")
    print("   \u274c Verification Failed.")
    return False
# \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
# 2. VERIFIER MAP
# \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
# Matches the `action` string from your frontend UI configuration
VERIFIER_MAP = {
    "hold_token": verify_hold_token,
    "hold_nft": verify_hold_nft,
    "tx_count": verify_tx_count,
    "wallet_age": verify_wallet_age,
    "timebound_interaction": verify_timebound_interaction,
}
# \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
# 3. MAIN ROUTER / EXECUTOR
# \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
async def run_onchain_verification(wallet: str, chain: str, task: Dict) -> bool:
    """
    Routes the verification request to the correct mapped function.
    """
    action = task.get("action")
    wallet_cs = Web3.to_checksum_address(wallet)
    
    print(f"\
--- \ud83d\udd75\ufe0f STARTING VERIFICATION ---")
    print(f"\ud83d\udd39 Wallet: {wallet_cs}")
    print(f"\ud83d\udd39 Chain: {chain}")
    print(f"\ud83d\udd39 Action: {action}")
    try:
        # Get the right verifier from the map based on the task action
        verifier_func = VERIFIER_MAP.get(action)
        
        if not verifier_func:
            print(f"\u274c Unknown action type: {action}")
            return False
        # Execute the specific logic
        return await verifier_func(wallet, chain, task)
    except Exception as e:
        print(f"\u274c CRITICAL VERIFICATION ERROR: {e}")
        traceback.print_exc()
        return False
async def get_quest_context(faucet_address: str):
    """
    Fetches the Stage Requirements and Task List from the DB to verify points and stages.
    """
    try:
        # 1. Fetch Stage Requirements from 'quests' table
        quest_response = supabase.table("quests").select("stage_pass_requirements").eq("faucet_address", faucet_address).execute()
        if not quest_response.data:
            return None, None
            
        stage_reqs = quest_response.data[0].get("stage_pass_requirements", {})
        # Handle case where it might be stored as a JSON string
        if isinstance(stage_reqs, str):
            stage_reqs = json.loads(stage_reqs)
        # 2. Fetch Tasks from 'faucet_tasks' table
        tasks_response = supabase.table("faucet_tasks").select("tasks").eq("faucet_address", faucet_address).execute()
        tasks = tasks_response.data[0].get("tasks", []) if tasks_response.data else []
        return stage_reqs, tasks
    except Exception as e:
        print(f"Error fetching quest context: {e}")
        return None, None
def get_stage_totals(tasks: List[Dict]) -> Dict[str, int]:
    """
    Sum all NON-SYSTEM task points per stage.
    System tasks (daily check-in, referral, x-share) are excluded
    because they have variable/unlimited point values.
    """
    import math
    totals: Dict[str, int] = {}
    
    SYSTEM_TASK_IDS = {"sys_daily", "sys_referral", "sys_share_x"}
    
    for task in tasks:
        task_id = task.get("id", "")
        
        # Skip system tasks \u2014 they have no fixed point ceiling
        if task.get("isSystem") or task_id in SYSTEM_TASK_IDS or str(task_id).startswith("sys_"):
            continue
        
        stage = task.get("stage", "Beginner")
        try:
            pts = int(task.get("points", 0))
        except (ValueError, TypeError):
            pts = 0
        
        totals[stage] = totals.get(stage, 0) + pts
    
    return totals
def get_active_stages(tasks: List[Dict]) -> List[str]:
    """
    Returns only stages that have at least one task, in canonical order.
    e.g. if tasks exist in Beginner + Intermediate + Ultimate only,
    returns ["Beginner", "Intermediate", "Ultimate"] \u2014 skips Advance and Legend.
    """
    ALL_STAGES = ["Beginner", "Intermediate", "Advance", "Legend", "Ultimate"]
    stage_totals = get_stage_totals(tasks)
    return [s for s in ALL_STAGES if stage_totals.get(s, 0) > 0]
def calculate_current_stage(stage_points: Dict[str, int], tasks: List[Dict]) -> str:
    """
    Returns the stage the user is currently IN.
    
    Logic:
    - Only looks at active stages (stages that have tasks).
    - Unlock threshold for a stage = ceil(total stage points * 70%)
    - User is IN stage X if they haven't yet earned the threshold for X.
    - If user has passed every active stage, they stay on the last one.
    """
    import math
    active_stages = get_active_stages(tasks)
    if not active_stages:
        return "Beginner"
    stage_totals = get_stage_totals(tasks)
    for stage in active_stages:
        total = stage_totals.get(stage, 0)
        if total <= 0:
            continue
        threshold = math.ceil(total * 0.70)
        earned = stage_points.get(stage, 0)
        if earned < threshold:
            # User hasn't passed this stage yet \u2014 they are HERE
            return stage
    # Passed every active stage
    return active_stages[-1]
async def get_analytics_data(self, key: str) -> Optional[Any]:
        """Get analytics data from Supabase"""
        try:
            response = supabase.table("analytics_cache").select("*").eq("key", key).execute()
           
            if not response.data or len(response.data) == 0:
                return None
               
            record = response.data[0]
            data = json.loads(record["data"])
           
            return {
                "data": data,
                "updated_at": record["updated_at"]
            }
           
        except Exception as e:
            print(f"\u274c Error getting analytics data for {key}: {str(e)}")
            return None
async def get_token_info(self, token_address: str, provider: Web3, chain_id: int, is_ether: bool) -> Dict[str, Any]:
        """Get token information"""
        chain_config = CHAIN_CONFIGS.get(chain_id, {})
       
        if is_ether:
            return {
                "symbol": chain_config.get("nativeCurrency", {}).get("symbol", "ETH"),
                "decimals": chain_config.get("nativeCurrency", {}).get("decimals", 18)
            }
        try:
            token_contract = provider.eth.contract(address=token_address, abi=ERC20_ABI)
            symbol = token_contract.functions.symbol().call()
            decimals = token_contract.functions.decimals().call()
           
            return {
                "symbol": symbol or "TOKEN",
                "decimals": int(decimals) or 18
            }
        except Exception as e:
            print(f"Error fetching token info for {token_address}: {str(e)}")
            return {"symbol": "TOKEN", "decimals": 18}
        
async def process_auto_approval(submission_id: str, faucet_address: str, wallet_address: str):
    """
    Robustly handles point distribution.
    FIXES:
    1. Creates user_progress row if it doesn't exist (Fixes 'Reset on Refresh').
    2. Persists the task ID correctly to the database.
    """
    try:
        # 1. Normalize Addresses (Checksum)
        faucet_checksum = Web3.to_checksum_address(faucet_address)
        wallet_checksum = Web3.to_checksum_address(wallet_address)
        # 2. Get Submission Info
        sub_res = supabase.table("submissions").select("*")\
            .eq("submission_id", submission_id)\
            .execute()
        if not sub_res.data:
            print(f"\u274c Submission {submission_id} not found \u2014 check column name (id vs submission_id)")
            return  
        
        submission = sub_res.data[0]
        task_id = submission['task_id']
        
        # 3. Update Submission Status to Approved
        verification_note = "Verified by System"
        if submission.get('submission_type') == "none":
            verification_note = "Instant Reward"
        supabase.table("submissions").update({
            "status": "approved", 
            "reviewed_at": datetime.utcnow().isoformat(),
            "notes": verification_note
        }).eq("submission_id", submission_id).execute()
        # 4. Fetch Task Details (Points & Stage)
        stage_reqs, tasks = await get_quest_context(faucet_checksum)
        task = next((t for t in tasks if t['id'] == task_id), None)
        
        if not task:
            print(f"\u26a0\ufe0f Task {task_id} not found in quest context.")
            return
        points_to_add = int(task.get('points', 0))
        task_stage = task.get('stage', 'Beginner')
        # 5. FETCH OR INITIALIZE User Progress
        prog_res = supabase.table("user_progress").select("*").eq("wallet_address", wallet_checksum).eq("faucet_address", faucet_checksum).execute()
        
        curr_prog = None
        
        if not prog_res.data:
            # ROW MISSING: Create it now
            print(f"\ud83c\udd95 Creating new progress row for {wallet_checksum}")
            new_profile = {
                "wallet_address": wallet_checksum,
                "faucet_address": faucet_checksum,
                "total_points": 0,
                "stage_points": {"Beginner": 0, "Intermediate": 0, "Advance": 0, "Legend": 0, "Ultimate": 0},
                "completed_tasks": [],
                "current_stage": "Beginner",
                "updated_at": datetime.now().isoformat()
            }
            # Insert and get the new row back
            insert_res = supabase.table("user_progress").insert(new_profile).execute()
            if insert_res.data:
                curr_prog = insert_res.data[0]
        else:
            curr_prog = prog_res.data[0]
        if not curr_prog:
            print("\u274c Failed to initialize user progress row.")
            return
        # 6. UPDATE POINTS & SAVE TASK ID
        current_completed_tasks = curr_prog.get('completed_tasks') or []
        
        # Only process if not already done
        if task_id not in current_completed_tasks:
            # A. Add ID
            current_completed_tasks.append(task_id)
            
            # B. Calc Points
            new_total = (curr_prog.get('total_points') or 0) + points_to_add
            current_stage_points = curr_prog.get('stage_points') or {}
            
            # Ensure keys exist
            for s in ["Beginner", "Intermediate", "Advance", "Legend", "Ultimate"]:
                if s not in current_stage_points: current_stage_points[s] = 0
            current_stage_points[task_stage] += points_to_add
            new_stage_name = calculate_current_stage(current_stage_points, tasks)
            # C. Save to DB
            update_res = supabase.table("user_progress").update({
                "total_points": new_total,
                "stage_points": current_stage_points,
                "completed_tasks": current_completed_tasks, # <--- THIS PERSISTS THE 'DONE' STATE
                "current_stage": new_stage_name,
                "updated_at": datetime.now().isoformat()
            }).eq("wallet_address", wallet_checksum).eq("faucet_address", faucet_checksum).execute()
            print(f"\u2705 Points Saved: {points_to_add}. Task {task_id} marked done.")
            # 7. Sync Leaderboard
            part_res = supabase.table("quest_participants").select("points").eq("quest_address", faucet_checksum).eq("wallet_address", wallet_checksum).execute()
            if part_res.data:
                current_lb_points = part_res.data[0].get('points', 0)
                supabase.table("quest_participants").update({
                    "points": current_lb_points + points_to_add
                }).eq("quest_address", faucet_checksum).eq("wallet_address", wallet_checksum).execute()
    except Exception as e:
        print(f"\u274c Auto-processing failed: {str(e)}")
        import traceback
        traceback.print_exc()
def generate_slug(name: str):
    if not name:
        return "faucet"
    # Create a URL-friendly slug
    slug = name.lower().strip()
    slug = re.sub(r'[^\w\s-]', '', slug)
    slug = re.sub(r'[\s_-]+', '-', slug)
    return slug

SYSTEM_TASK_REGISTRY = {
    "sys_daily":    {"id": "sys_daily",    "title": "Daily Check-in",  "points": 100,  "stage": "Beginner", "isSystem": True},
    "sys_referral": {"id": "sys_referral", "title": "Refer a Friend",  "points": 200,  "stage": "Beginner", "isSystem": True},
    "sys_share_x":  {"id": "sys_share_x",  "title": "Share on X",      "points": 100,  "stage": "Beginner", "isSystem": True},
}

def _is_system_task(task: dict) -> bool:
    task_id = task.get("id", "")
    return task.get("isSystem", False) or task_id in SYSTEM_TASK_REGISTRY or str(task_id).startswith("sys_")
async def get_all_faucets_from_network(self, network: Dict) -> List[Dict]:
        """Fetch all faucets from a single network"""
        try:
            print(f"\ud83d\udd04 Fetching faucets from {network['name']}...")
           
            w3 = Web3(Web3.HTTPProvider(network['rpcUrl']))
            if not w3.is_connected():
                raise Exception(f"Failed to connect to {network['name']}")
           
            all_faucets = []
           
            for factory_address in network.get('factoryAddresses', []):
                try:
                    if not Web3.is_address(factory_address):
                        continue
                       
                    factory_contract = w3.eth.contract(
                        address=factory_address,
                        abi=FACTORY_ABI
                    )
                   
                    # Check if contract exists
                    code = w3.eth.get_code(factory_address)
                    if code == "0x":
                        continue
                       
                    # Get all faucets
                    faucets = factory_contract.functions.getAllFaucets().call()
                   
                    for faucet_address in faucets:
                        try:
                            # Get faucet name
                            faucet_contract = w3.eth.contract(
                                address=faucet_address,
                                abi=FAUCET_ABI
                            )
                           
                            try:
                                name = faucet_contract.functions.name().call()
                            except:
                                name = f"Faucet {faucet_address[:6]}...{faucet_address[-4:]}"
                           
                            all_faucets.append({
                                "address": faucet_address,
                                "name": name,
                                "networkName": network['name'],
                                "chainId": network['chainId'],
                                "factoryAddress": factory_address
                            })
                           
                        except Exception as e:
                            print(f"\u26a0\ufe0f Error processing faucet {faucet_address}: {str(e)}")
                            continue
                       
                    print(f"\u2705 Got {len(faucets)} faucets from factory {factory_address}")
                   
                except Exception as e:
                    print(f"\u26a0\ufe0f Error with factory {factory_address}: {str(e)}")
                    continue
           
            print(f"\ud83d\udcca Total faucets from {network['name']}: {len(all_faucets)}")
            return all_faucets
           
        except Exception as e:
            print(f"\u274c Error fetching faucets from {network['name']}: {str(e)}")
            return []
async def get_all_transactions_from_network(self, network: Dict) -> List[Dict]:
        """Fetch all transactions from a single network"""
        try:
            print(f"\ud83d\udd04 Fetching transactions from {network['name']}...")
           
            w3 = Web3(Web3.HTTPProvider(network['rpcUrl']))
            if not w3.is_connected():
                raise Exception(f"Failed to connect to {network['name']}")
           
            all_transactions = []
           
            for factory_address in network.get('factoryAddresses', []):
                try:
                    if not Web3.is_address(factory_address):
                        continue
                       
                    factory_contract = w3.eth.contract(
                        address=factory_address,
                        abi=FACTORY_ABI
                    )
                   
                    # Check if contract exists
                    code = w3.eth.get_code(factory_address)
                    if code == "0x":
                        continue
                       
                    # Get all transactions
                    transactions = factory_contract.functions.getAllTransactions().call()
                   
                    for tx in transactions:
                        # Get token info if needed
                        token_info = {"symbol": "ETH", "decimals": 18}
                        if not tx[4]: # if not isEther
                            try:
                                faucet_contract = w3.eth.contract(
                                    address=tx[0],
                                    abi=FAUCET_ABI
                                )
                                try:
                                    token_address = faucet_contract.functions.token().call()
                                except:
                                    token_address = faucet_contract.functions.tokenAddress().call()
                               
                                token_info = await self.get_token_info(token_address, w3, network['chainId'], False)
                            except:
                                pass
                           
                        all_transactions.append({
                            "faucetAddress": tx[0],
                            "transactionType": tx[1],
                            "initiator": tx[2],
                            "amount": str(tx[3]),
                            "isEther": tx[4],
                            "timestamp": int(tx[5]),
                            "networkName": network['name'],
                            "chainId": network['chainId'],
                            "factoryAddress": factory_address,
                            "tokenSymbol": token_info["symbol"],
                            "tokenDecimals": token_info["decimals"]
                        })
                   
                    print(f"\u2705 Got {len(transactions)} transactions from factory {factory_address}")
                   
                except Exception as e:
                    print(f"\u26a0\ufe0f Error with factory {factory_address}: {str(e)}")
                    continue
           
            print(f"\ud83d\udcca Total transactions from {network['name']}: {len(all_transactions)}")
            return all_transactions
           
        except Exception as e:
            print(f"\u274c Error fetching transactions from {network['name']}: {str(e)}")
            return []
def get_quest_data(faucet_address: str):
        """
        In a real app, you fetch this from a 'quests' table.
        For now, we return the hardcoded structure you used in the frontend,
        or you can store this JSON in Supabase.
        """
        # ... logic to fetch quest details ...
        # This is a placeholder for the static quest data structure
        return {
            "stagePassRequirements": {
                "Beginner": 100, "Intermediate": 300, "Advance": 600, "Legend": 1000, "Ultimate": 2000
            },
            "tasks": [
                {"id": "t1", "title": "Follow Twitter", "points": 50, "stage": "Beginner", "verificationType": "manual_link"},
                # ... other tasks
            ]
        }
def process_faucets_for_chart(self, faucets_data: List[Dict]) -> List[Dict]:
        """Process faucets data for chart display"""
        try:
            network_counts = {}
           
            for faucet in faucets_data:
                network = faucet.get('networkName', 'Unknown')
                network_counts[network] = network_counts.get(network, 0) + 1
           
            chart_data = []
            for network, count in network_counts.items():
                chart_data.append({
                    "network": network,
                    "faucets": count
                })
           
            # Sort by count descending
            chart_data.sort(key=lambda x: x['faucets'], reverse=True)
           
            return chart_data
           
        except Exception as e:
            print(f"Error processing faucets for chart: {str(e)}")
            return []
def process_users_for_chart(self, claims_data: List[Dict]) -> Dict[str, Any]:
        """Process users data for chart display with additional projected users"""
        try:
            unique_users = set()
            user_first_claim_date = {}
            new_users_by_date = {}
           
            # Process all claims to find first claim date for each user
            for claim in claims_data:
                claimer = claim.get('initiator') or claim.get('claimer')
                if claimer and isinstance(claimer, str) and claimer.startswith('0x'):
                    claimer_lower = claimer.lower()
                    unique_users.add(claimer_lower)
                   
                    # Convert timestamp to date
                    timestamp = claim.get('timestamp', 0)
                    date = datetime.fromtimestamp(timestamp).strftime('%Y-%m-%d')
                   
                    # Track the first date this user made a claim
                    if claimer_lower not in user_first_claim_date or date < user_first_claim_date[claimer_lower]:
                        user_first_claim_date[claimer_lower] = date
           
            # Group users by their first claim date
            for user, first_date in user_first_claim_date.items():
                if first_date not in new_users_by_date:
                    new_users_by_date[first_date] = set()
                new_users_by_date[first_date].add(user)
           
            # Add projected users distribution (500 users from May 22 - June 20, 2025)
            additional_users = 500
            start_date = datetime(2025, 5, 22)
            end_date = datetime(2025, 6, 20)
           
            # Calculate the number of days in the range
            days_diff = (end_date - start_date).days + 1 # +1 to include both start and end dates
           
            # Calculate users per day (distribute evenly)
            users_per_day = additional_users // days_diff
            remainder_users = additional_users % days_diff
           
            print(f"\ud83d\ude80 Adding {additional_users} projected users across {days_diff} days ({users_per_day} per day + {remainder_users} remainder)")
           
            # Create synthetic users and distribute them
            current_date = start_date
            total_added_users = 0
           
            for day_index in range(days_diff):
                date_str = current_date.strftime('%Y-%m-%d')
               
                # Calculate additional users for this day
                additional_for_this_day = users_per_day
                if day_index < remainder_users:
                    additional_for_this_day += 1
               
                # Create synthetic user addresses for this day
                if additional_for_this_day > 0:
                    if date_str not in new_users_by_date:
                        new_users_by_date[date_str] = set()
                   
                    # Generate synthetic user addresses (for tracking purposes)
                    for i in range(additional_for_this_day):
                        # Create a deterministic but unique synthetic address
                        synthetic_user = f"0x{'synthetic' + str(total_added_users + i).zfill(32)}"[:42]
                        new_users_by_date[date_str].add(synthetic_user.lower())
                        unique_users.add(synthetic_user.lower())
                       
                    total_added_users += additional_for_this_day
                    print(f"\ud83d\udcc5 {date_str}: Added {additional_for_this_day} projected users")
                   
                current_date += timedelta(days=1)
           
            print(f"\u2705 Total projected users added: {total_added_users}")
           
            # Convert to chart data format and sort by date
            sorted_dates = sorted(new_users_by_date.keys())
           
            cumulative_users = 0
            chart_data = []
           
            for date in sorted_dates:
                new_users_count = len(new_users_by_date[date])
                cumulative_users += new_users_count
               
                chart_data.append({
                    "date": date,
                    "newUsers": new_users_count,
                    "cumulativeUsers": cumulative_users
                })
           
            return {
                "chartData": chart_data,
                "totalUniqueUsers": len(unique_users),
                "totalClaims": len(claims_data),
                "users": list(unique_users), # Add this for compatibility
                "projectedUsersAdded": total_added_users,
                "projectionPeriod": f"{start_date.strftime('%Y-%m-%d')} to {end_date.strftime('%Y-%m-%d')}"
            }
           
        except Exception as e:
            print(f"Error processing users for chart: {str(e)}")
            return {
                "chartData": [],
                "totalUniqueUsers": 0,
                "totalClaims": 0,
                "users": [],
                "projectedUsersAdded": 0,
                "projectionPeriod": "none"
            }
           
def process_claims_for_chart(self, claims_data: List[Dict], faucet_names: Dict[str, str] = None) -> Dict[str, Any]:
        """Process claims data for chart display"""
        try:
            if faucet_names is None:
                faucet_names = {}
               
            claims_by_faucet = {}
            total_claims = len(claims_data)
           
       
            for claim in claims_data:
                faucet_address = claim.get('faucetAddress', '').lower()
                network_name = claim.get('networkName', 'Unknown')
               
                if faucet_address not in claims_by_faucet:
                    claims_by_faucet[faucet_address] = {
                        'claims': 0,
                        'network': network_name,
                        'chainId': claim.get('chainId', 0),
                        'totalAmount': 0,
                        'tokenSymbol': claim.get('tokenSymbol', 'ETH'),
                        'tokenDecimals': claim.get('tokenDecimals', 18),
                        'latestTimestamp': 0
                    }
               
                claims_by_faucet[faucet_address]['claims'] += 1
               
                # Add amount if available
                amount = claim.get('amount', 0)
                if isinstance(amount, str) and amount.isdigit():
                    claims_by_faucet[faucet_address]['totalAmount'] += int(amount)
               
                # Update latest timestamp
                timestamp = claim.get('timestamp', 0)
                if timestamp > claims_by_faucet[faucet_address]['latestTimestamp']:
                    claims_by_faucet[faucet_address]['latestTimestamp'] = timestamp
           
            # Create faucet rankings
            faucet_rankings = []
            sorted_faucets = sorted(
                claims_by_faucet.items(),
                key=lambda x: x[1]['latestTimestamp'],
                reverse=True
            )
           
            for rank, (faucet_address, data) in enumerate(sorted_faucets, 1):
                faucet_name = faucet_names.get(faucet_address, f"Faucet {faucet_address[:6]}...{faucet_address[-4:]}")
               
                # Format total amount
                decimals = data['tokenDecimals']
                total_amount = data['totalAmount'] / (10 ** decimals)
                total_amount_str = f"{total_amount:.4f} {data['tokenSymbol']}"
               
                faucet_rankings.append({
                    "rank": rank,
                    "faucetAddress": faucet_address,
                    "faucetName": faucet_name,
                    "network": data['network'],
                    "chainId": data['chainId'],
                    "totalClaims": data['claims'],
                    "latestClaimTime": data['latestTimestamp'],
                    "totalAmount": total_amount_str
                })
           
            # Create chart data (top 10 for pie chart)
            sorted_by_claims = sorted(
                claims_by_faucet.items(),
                key=lambda x: x[1]['claims'],
                reverse=True
            )
           
            top_10_faucets = sorted_by_claims[:10]
            other_faucets = sorted_by_claims[10:]
            other_total_claims = sum(data['claims'] for _, data in other_faucets)
           
            # Generate colors
            colors = []
            for i in range(len(top_10_faucets) + (1 if other_total_claims > 0 else 0)):
                hue = (i * 137.508) % 360
                colors.append(f"hsl({hue}, 70%, 60%)")
           
            chart_data = []
            for i, (faucet_address, data) in enumerate(top_10_faucets):
                faucet_name = faucet_names.get(faucet_address, f"Faucet {faucet_address[:6]}...{faucet_address[-4:]}")
                chart_data.append({
                    "name": faucet_name,
                    "value": data['claims'],
                    "color": colors[i],
                    "faucetAddress": faucet_address
                })
           
            if other_total_claims > 0:
                chart_data.append({
                    "name": f"Others ({len(other_faucets)} faucets)",
                    "value": other_total_claims,
                    "color": colors[len(top_10_faucets)],
                    "faucetAddress": "others"
                })
           
            return {
                "chartData": chart_data,
                "faucetRankings": faucet_rankings,
                "totalClaims": total_claims,
                "totalFaucets": len(claims_by_faucet)
            }
           
        except Exception as e:
            print(f"Error processing claims for chart: {str(e)}")
            return {"chartData": [], "faucetRankings": [], "totalClaims": 0, "totalFaucets": 0}
def process_transactions_for_chart(self, transactions_data: List[Dict]) -> Dict[str, Any]:
        """Process transactions data for chart display"""
        try:
            network_stats = {}
            total_transactions = len(transactions_data)
           
            # Network colors
            network_colors = {
                "Celo": "#35D07F",
                "Lisk": "#0D4477",
                "Base": "#0052FF",
                "Arbitrum": "#28A0F0",
                "Ethereum": "#627EEA",
                "Polygon": "#8247E5",
                "Optimism": "#FF0420"
            }
           
            # Process transactions by network
            for tx in transactions_data:
                network_name = tx.get('networkName', 'Unknown')
                chain_id = tx.get('chainId', 0)
               
                if network_name not in network_stats:
                    network_stats[network_name] = {
                        "name": network_name,
                        "chainId": chain_id,
                        "totalTransactions": 0,
                        "color": network_colors.get(network_name, "#6B7280"),
                        "factoryAddresses": [],
                        "rpcUrl": ""
                    }
               
                network_stats[network_name]["totalTransactions"] += 1
               
                # Add factory address if not already present
                factory_address = tx.get('factoryAddress')
                if factory_address and factory_address not in network_stats[network_name]["factoryAddresses"]:
                    network_stats[network_name]["factoryAddresses"].append(factory_address)
           
            # Convert to list and sort by transaction count
            network_stats_list = list(network_stats.values())
            network_stats_list.sort(key=lambda x: x["totalTransactions"], reverse=True)
           
            return {
                "networkStats": network_stats_list,
                "totalTransactions": total_transactions
            }
           
        except Exception as e:
            print(f"Error processing transactions for chart: {str(e)}")
            return {"networkStats": [], "totalTransactions": 0}
async def fetch_faucet_names(self, faucets_data: List[Dict]) -> Dict[str, str]:
        """Fetch faucet names for addresses"""
        try:
            faucet_names = {}
           
            for faucet_data in faucets_data:
                address = faucet_data.get('address', '').lower()
                name = faucet_data.get('name', '')
               
                if address and name:
                    faucet_names[address] = name
           
            return faucet_names
           
        except Exception as e:
            print(f"Error fetching faucet names: {str(e)}")
            return {}
def verify_signature(address: str, message: str, signature: str) -> bool:
    """Recover the signer address from the signature to verify authenticity."""
    try:
        # Create the precise message structure expected by EIP-191
        encoded_message = encode_defunct(text=message)
        recovered_address = Account.recover_message(encoded_message, signature=signature)
        
        return recovered_address.lower() == address.lower()
    except Exception as e:
        print(f"Signature verification failed: {e}")
        return False
# Image upload endpoint using Supabase Storage


@router.post("/api/quests", tags=["Quest Management"])
async def save_quest(request: Quest):
    """
    Saves the Quest configuration to the database.
    Handles image_url and stage_pass_requirements fields using Supabase.
    """
    try:
        if not Web3.is_address(request.creatorAddress) or not Web3.is_address(request.faucetAddress):
            raise HTTPException(status_code=400, detail="Invalid address format for creator or faucet.")
        
        faucet_address_cs = Web3.to_checksum_address(request.faucetAddress)
        
        quest_data = request.dict()
        
        # 1. Extract and separate complex fields
        tasks_to_store = quest_data.pop("tasks")
        stage_reqs_to_store = quest_data.pop("stagePassRequirements")
        # 2. Map remaining fields to snake_case column names for the 'quests' table
        quest_data_db = {
            "faucet_address": faucet_address_cs,
            "creator_address": quest_data.pop("creatorAddress"),
            "title": quest_data.pop("title"),
            "description": quest_data.pop("description"),
            "is_active": quest_data.pop("isActive"),
            "reward_pool": quest_data.pop("rewardPool"),
            "start_date": quest_data.pop("startDate"),
            "end_date": quest_data.pop("endDate"),
            "reward_token_type": quest_data.pop("rewardTokenType"),
            "token_address": quest_data.pop("tokenAddress"),
            "token_symbol": quest_data.pop("tokenSymbol", None),
            # New/Updated fields:
            "image_url": quest_data.pop("imageUrl"), 
            "stage_pass_requirements": stage_reqs_to_store, # Stored as JSON/Dict
            
            "created_at": datetime.now().isoformat(),
            "updated_at": datetime.now().isoformat()
        }
        # 3. Store main quest data in the 'quests' table
        response = supabase.table("quests").upsert(
            quest_data_db,
            on_conflict="faucet_address"
        ).execute()
        if not response.data:
            raise HTTPException(status_code=500, detail="Failed to save core quest metadata to Supabase.")
        
        # 4. Store tasks data in the 'faucet_tasks' table
        await store_faucet_tasks(faucet_address_cs, tasks_to_store, quest_data_db["creator_address"])
        
        print(f"\u2705 Saved Quest: '{request.title}'. Faucet: {faucet_address_cs}")
        
        return {
            "success": True,
            "message": "Quest and Faucet metadata saved successfully.",
            "faucetAddress": faucet_address_cs
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"\ud83d\udca5 Error saving quest: {str(e)}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed to save quest: {str(e)}")
# --- GET QUEST BY ADDRESS (Updated to fetch new fields) ---


@router.get("/api/quests/{faucetAddress}", tags=["Quest Management"])
async def get_quest_by_address(faucetAddress: str):
    """
    Fetch a single quest by faucet address OR draft ID.
    Handles strict address validation bypass for drafts and rehydrates tasks.
    """
    try:
        print(f"\ud83d\udd0d Fetching quest details for: {faucetAddress}")
        
        # 1. VALIDATE ADDRESS/ID
        if Web3.is_address(faucetAddress):
            faucet_address = Web3.to_checksum_address(faucetAddress)
        else:
            faucet_address = faucetAddress # It's a Draft ID (e.g. "draft-uuid...")
        # 2. FETCH CORE METADATA
        response = supabase.table("quests").select("*").eq("faucet_address", faucet_address).execute()
        if not response.data:
            raise HTTPException(status_code=404, detail=f"Quest not found")
        
        quest_row = response.data[0]
        participants_count_res = supabase.table("quest_participants")\
            .select("wallet_address", count="exact")\
            .eq("quest_address", faucet_address)\
            .execute()
        
        total_participants = participants_count_res.count if hasattr(participants_count_res, 'count') else 0
        
        # 3. FETCH TASKS FROM faucet_tasks TABLE
        # We query the separate table where tasks are stored during draft/creation
        tasks = []
        try:
            tasks_res = supabase.table("faucet_tasks").select("tasks").eq(
                "faucet_address", faucet_address
            ).execute()
            
            if tasks_res.data and len(tasks_res.data) > 0:
                # Extract the 'tasks' column from the first row found
                tasks = tasks_res.data[0].get("tasks", [])
                print(f"\u2705 Successfully rehydrated {len(tasks)} tasks for {faucet_address}")
            else:
                print(f"\u26a0\ufe0f No tasks found in faucet_tasks for {faucet_address}")
        except Exception as task_err:
            print(f"\u26a0\ufe0f Error fetching tasks for {faucet_address}: {str(task_err)}")
            # Don't fail the whole request if tasks fail, just return empty list
            tasks = []
        
        # 4. PARSE DATES SAFELY
        def parse_iso_date(date_str):
            if not date_str:
                return None
            try:
                # Handle Z or +00:00 offsets
                clean_date = date_str.replace('Z', '+00:00')
                return datetime.fromisoformat(clean_date).strftime('%Y-%m-%d')
            except Exception:
                return None
        start_date = parse_iso_date(quest_row.get("start_date"))
        end_date = parse_iso_date(quest_row.get("end_date"))
        # 5. PARSE JSON FIELDS
        # Supabase usually returns dicts, but if it's stored as a string, we parse it
        def ensure_dict(field_data):
            if isinstance(field_data, str):
                try:
                    return json.loads(field_data)
                except:
                    return {}
            return field_data or {}
        stage_reqs = ensure_dict(quest_row.get("stage_pass_requirements"))
        dist_config = ensure_dict(quest_row.get("distribution_config"))
        # 6. ASSEMBLE FINAL DATA
        quest_data = {
            "faucetAddress": faucet_address,
            "title": quest_row.get("title"),
            "totalParticipants": total_participants,
            "description": quest_row.get("description"),
            "isActive": quest_row.get("is_active", False),
            "isDraft": quest_row.get("is_draft", False),
            "rewardPool": quest_row.get("reward_pool"),
            "creatorAddress": quest_row.get("creator_address"),
            "startDate": start_date,
            "endDate": end_date,
            "tasks": tasks,  # <--- FIXED: Now populated from faucet_tasks
            "tokenSymbol": quest_row.get("token_symbol"),
            "imageUrl": quest_row.get("image_url"),
            "stagePassRequirements": stage_reqs,
            "distributionConfig": dist_config,
            "tokenAddress": quest_row.get("token_address"),
            "rewardTokenType": quest_row.get("reward_token_type")
        }
        
        return {"success": True, "quest": quest_data}
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"\u274c Critical Error fetching quest: {str(e)}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/api/quests/by-slug/{slug}", tags=["Quest Management"])
async def get_quest_by_slug(slug: str):
    """
    Fetch a single quest using its unique slug identifier.
    Used for frontend dynamic routing.
    """
    try:
        print(f"\ud83d\udd0d Fetching quest details for slug: {slug}")
        
        # 1. FETCH CORE METADATA BY SLUG
        # Ensure your Supabase 'quests' table has a 'slug' column
        response = supabase.table("quests").select("*").eq("slug", slug).execute()
        
        if not response.data:
            raise HTTPException(status_code=404, detail="Quest not found")
        
        quest_row = response.data[0]
        # We need the actual address to fetch participants and tasks
        faucet_address = quest_row.get("faucet_address")
        # 2. FETCH PARTICIPANT COUNT
        participants_count_res = supabase.table("quest_participants")\
            .select("wallet_address", count="exact")\
            .eq("quest_address", faucet_address)\
            .execute()
        
        total_participants = participants_count_res.count if hasattr(participants_count_res, 'count') else 0
        
        # 3. REHYDRATE TASKS
        tasks = []
        try:
            tasks_res = supabase.table("faucet_tasks").select("tasks").eq(
                "faucet_address", faucet_address
            ).execute()
            
            if tasks_res.data:
                tasks = tasks_res.data[0].get("tasks", [])
        except Exception as task_err:
            print(f"\u26a0\ufe0f Task rehydration failed for {slug}: {str(task_err)}")
        
        # 4. DATE PARSING HELPER
        def parse_iso_date(date_str):
            if not date_str: return None
            try:
                clean_date = date_str.replace('Z', '+00:00')
                return datetime.fromisoformat(clean_date).strftime('%Y-%m-%d')
            except: return None
        # 5. ASSEMBLE DATA (Matches your QuestOverview Interface)
        quest_data = {
            "faucetAddress": faucet_address,
            "slug": quest_row.get("slug"),
            "title": quest_row.get("title"),
            "totalParticipants": total_participants,
            "description": quest_row.get("description"),
            "isActive": quest_row.get("is_active", False),
            "rewardPool": quest_row.get("reward_pool"),
            "creatorAddress": quest_row.get("creator_address"),
            "startDate": parse_iso_date(quest_row.get("start_date")),
            "endDate": parse_iso_date(quest_row.get("end_date")),
            "tasks": tasks,
            "tokenSymbol": quest_row.get("token_symbol"),
            "imageUrl": quest_row.get("image_url"),
            "tokenAddress": quest_row.get("token_address")
        }
        
        return {"success": True, "quest": quest_data}
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"\u274c Error fetching quest by slug: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/api/quests", tags=["Quest Management"])
async def get_all_quests():
    try:
        print("\ud83d\udd0d Fetching all quests from Supabase...")
        
        # 1. Fetch all quests metadata
        response = supabase.table("quests").select("*").execute()
        
        if not response.data:
            return {"success": True, "quests": [], "message": "No quests found"}
        
        quests_list = []
        
        for quest_row in response.data:
            try:
                faucet_address = quest_row.get("faucet_address")
                
                # 2. Fetch tasks count 
                tasks_res = supabase.table("faucet_tasks").select("tasks").eq(
                    "faucet_address", faucet_address
                ).execute()
                
                tasks_count = 0
                if tasks_res.data:
                    tasks_array = tasks_res.data[0].get("tasks", [])
                    tasks_count = len(tasks_array) if tasks_array else 0
                    
                # 3. Fetch participants count
                p_res = supabase.table("quest_participants").select(
                    "wallet_address", count="exact"
                ).eq("quest_address", faucet_address).execute()
                participants_count = p_res.count if hasattr(p_res, 'count') else 0
                    
                # 4. SAFE DATE PARSING
                def format_date(raw_date):
                    if not raw_date: return None
                    try:
                        return datetime.fromisoformat(raw_date.replace('Z', '+00:00')).strftime('%Y-%m-%d')
                    except: return None
                # 5. ASSEMBLE DATA (Crucial: Includes 'slug')
                quest_data = {
                    "faucetAddress": faucet_address,
                    "slug": quest_row.get("slug") or faucet_address, # Fallback to address if slug is missing
                    "title": quest_row.get("title"),
                    "description": quest_row.get("description"),
                    "isActive": quest_row.get("is_active", False),
                    "isDraft": quest_row.get("is_draft", False),
                    "rewardPool": quest_row.get("reward_pool"),
                    "creatorAddress": quest_row.get("creator_address"),
                    "startDate": format_date(quest_row.get("start_date")),
                    "endDate": format_date(quest_row.get("end_date")),
                    "tasksCount": tasks_count,
                    "totalParticipants": participants_count, # Matches frontend interface
                    "imageUrl": quest_row.get("image_url"),
                    "tokenSymbol": quest_row.get("token_symbol")
                }
                
                quests_list.append(quest_data)
                
            except Exception as e:
                print(f"\u26a0\ufe0f Error processing quest {faucet_address}: {str(e)}")
                continue
        
        # 6. RETURN THE CONSTRUCTED LIST (Outside the loop!)
        return {
            "success": True, 
            "quests": quests_list, 
            "count": len(quests_list)
        }
        
    except Exception as e:
        print(f"\u274c Error fetching quests: {str(e)}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))
    
async def finalize_rewards(request: FinalizeRewardsRequest):
    # Mocking success for demo, actual implementation requires Web3 interaction
    if len(request.winners) != len(request.amounts):
        raise HTTPException(status_code=400, detail="Winners and amounts lists must be of the same length.")
   
    print(f"MOCK: Successfully set custom claim amounts for {len(request.winners)} winners.")
       
    return {
        "success": True,
        "message": f"Successfully set custom claim amounts for {len(request.winners)} winners. Users can now claim (MOCK TX).",
        "txHash": "0xMOCKTXHASH",
        "faucetAddress": request.faucetAddress
    }


@router.post("/api/quests/draft", tags=["Quest Management"])
async def save_quest_draft(draft: QuestDraft):
    try:
        if not Web3.is_address(draft.creatorAddress):
            raise HTTPException(status_code=400, detail="Invalid creator address")
        faucet_address_val = draft.faucetAddress
        creator_address_cs = Web3.to_checksum_address(draft.creatorAddress)
        # Resolve token symbol from whichever field arrived
        resolved_symbol = draft.get_token_symbol()
        # Debug log so you can confirm the value in Render logs
        print(f"\ud83d\udcdd token_symbol resolved  : {resolved_symbol}")
        print(f"   draft.token_symbol     : {draft.token_symbol}")
        print(f"   draft.tokenSymbol      : {draft.tokenSymbol}")
        # Generate slug
        base_slug = generate_slug(draft.title)
        quest_slug = f"{base_slug}-{str(uuid.uuid4())[:4]}"
        draft_data_db = {
            "faucet_address":    faucet_address_val,
            "creator_address":   creator_address_cs,
            "title":             draft.title,
            "slug":              quest_slug,
            "description":       draft.description,
            "image_url":         draft.imageUrl,
            "reward_pool":       draft.rewardPool,
            "reward_token_type": draft.rewardTokenType,
            "token_address":     draft.tokenAddress,
            "token_symbol":      resolved_symbol,       # \u2190 always populated now
            "distribution_config": draft.distributionConfig,
            "is_draft":          True,
            "updated_at":        datetime.now().isoformat()
        }
        print(f"\ud83d\udce6 Saving draft to DB: {draft_data_db}")
        response = supabase.table("quests").upsert(
            draft_data_db, on_conflict="faucet_address"
        ).execute()
        if not response.data:
            raise HTTPException(status_code=500, detail="Failed to save draft to database")
        # Save tasks if present
        if draft.tasks:
            tasks_db = {
                "faucet_address": faucet_address_val,
                "created_by":     creator_address_cs,
                "tasks": [
                    t.dict() if hasattr(t, "dict") else t
                    for t in draft.tasks
                ],
                "updated_at": datetime.now().isoformat()
            }
            supabase.table("faucet_tasks").upsert(
                tasks_db, on_conflict="faucet_address"
            ).execute()
        print(f"\u2705 Draft saved successfully. slug={quest_slug}, token_symbol={resolved_symbol}")
        return {
            "success":      True,
            "faucetAddress": faucet_address_val,
            "slug":          quest_slug,
            "message":       "Draft saved successfully"
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"\u274c Error saving draft: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed to save draft: {str(e)}")


@router.delete("/api/quests/draft/{draftId}", tags=["Quest Management"])
async def delete_quest_draft(draftId: str):
    """
    Deletes a quest draft and its associated tasks from the database.
    """
    try:
        print(f"\ud83d\uddd1\ufe0f Deleting draft: {draftId}")
        
        # 1. Delete from Quests table
        # We assume the draftId IS the faucet_address in the DB for drafts
        response_q = supabase.table("quests").delete().eq("faucet_address", draftId).execute()
        
        # 2. Delete from Faucet Tasks table (clean up associated tasks)
        response_t = supabase.table("faucet_tasks").delete().eq("faucet_address", draftId).execute()
        
        # Check if anything was actually deleted (Optional, but good for debugging)
        # Note: supabase delete returns the deleted rows in .data
        if not response_q.data and not response_t.data:
             print("\u26a0\ufe0f Draft not found or already deleted.")
             # We still return success so the frontend updates the UI
        
        return {"success": True, "message": "Draft deleted successfully"}
        
    except Exception as e:
        print(f"\u274c Error deleting draft: {str(e)}")
        # Log stack trace for deeper debugging if needed
        # traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))
# --- FINALIZE QUEST (Phase 2) ---


@router.post("/api/quests/finalize", tags=["Quest Management"])
async def finalize_quest(finalize: QuestFinalize):
    try:
        print(f"\ud83d\ude80 Finalizing Quest. Real Address: {finalize.faucetAddress}")
        if not Web3.is_address(finalize.faucetAddress):
            raise HTTPException(status_code=400, detail="Invalid faucet address")
        real_address_cs = Web3.to_checksum_address(finalize.faucetAddress)
        
        # 1. FETCH DATA FROM DRAFT
        draft_data = {}
        existing_slug = None
        
        if finalize.draftId:
            draft_res = supabase.table("quests").select("*").eq("faucet_address", finalize.draftId).execute()
            if draft_res.data:
                draft_data = draft_res.data[0]
                existing_slug = draft_data.get("slug")
        # 2. DETERMINE FINAL CREATOR
        final_creator = finalize.creatorAddress or draft_data.get("creator_address")
        if not final_creator:
            raise HTTPException(status_code=400, detail="Creator address is missing.")
        final_creator = Web3.to_checksum_address(final_creator)
        # Helper: Safe Dict Converter
        def to_dict(obj):
            if hasattr(obj, 'model_dump'): return obj.model_dump()
            if hasattr(obj, 'dict'): return obj.dict()
            return obj 
        # 3. PREPARE DATA
        stage_reqs = to_dict(finalize.stagePassRequirements)
        clean_tasks = [to_dict(t) for t in finalize.tasks]
        # 4. DELETE DRAFT BEFORE UPSERT
        if finalize.draftId and finalize.draftId.lower() != finalize.faucetAddress.lower():
            supabase.table("quests").delete().eq("faucet_address", finalize.draftId).execute()
            supabase.table("faucet_tasks").delete().eq("faucet_address", finalize.draftId).execute()
        # 5. UPSERT QUESTS TABLE (CRITICAL FIX FOR TOKEN SYMBOL)
        
        # 5. UPSERT QUESTS TABLE
        final_quest_data = {
            "faucet_address": real_address_cs,
            "creator_address": final_creator,
            "title": finalize.title or draft_data.get("title"),
            "slug": existing_slug or generate_slug(finalize.title or "quest"),
            "description": finalize.description or draft_data.get("description"),
            "image_url": finalize.imageUrl or draft_data.get("image_url"),
            
            # \ud83d\udc47 THIS IS THE FIX: Grab them from the payload, or fallback to the draft
            "reward_pool": finalize.rewardPool or draft_data.get("reward_pool"),
            "reward_token_type": finalize.rewardTokenType or draft_data.get("reward_token_type"),
            "token_address": finalize.tokenAddress or draft_data.get("token_address"),
            "token_symbol": finalize.tokenSymbol or draft_data.get("token_symbol"), 
            "distribution_config": finalize.distributionConfig or draft_data.get("distribution_config"), # <-- ADDED!
            "chain_id": finalize.chainId,
            "rewards_distributed": False,
            "start_date": finalize.startDate,
            "end_date": finalize.endDate,
            "claim_window_hours": finalize.claimWindowHours,
            "stage_pass_requirements": stage_reqs,
            "enforce_stage_rules": finalize.enforceStageRules,
            "is_draft": False,
            "is_active": True,
            "updated_at": datetime.now().isoformat()
        }
        supabase.table("quests").upsert(final_quest_data, on_conflict="faucet_address").execute()
        # 6. UPSERT FAUCET_TASKS TABLE
        tasks_data = {
            "faucet_address": real_address_cs,
            "created_by": final_creator,
            "tasks": clean_tasks,
            "updated_at": datetime.now().isoformat()
        }
        supabase.table("faucet_tasks").upsert(tasks_data, on_conflict="faucet_address").execute()
        # RETURN THE REAL SLUG FOR FRONTEND ROUTING
        return {
            "success": True, 
            "message": "Quest finalized and live!", 
            "slug": final_quest_data["slug"]
        }
    except Exception as e:
        print(f"\u274c Error finalizing quest: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/api/quests/{faucet_address}/participant/{wallet_address}", tags=["Quest Actions"])
async def get_quest_participant(faucet_address: str, wallet_address: str):
    """
    Checks if a user is already a participant in the quest and returns their data.
    """
    try:
        if not Web3.is_address(faucet_address) or not Web3.is_address(wallet_address):
            raise HTTPException(status_code=400, detail="Invalid address format")
        faucet_checksum = Web3.to_checksum_address(faucet_address)
        wallet_checksum = Web3.to_checksum_address(wallet_address)
        # Fetch participant data
        res = supabase.table("quest_participants")\
            .select("*")\
            .eq("quest_address", faucet_checksum)\
            .eq("wallet_address", wallet_checksum)\
            .execute()
        if res.data and len(res.data) > 0:
            return {"success": True, "participant": res.data[0]}
        else:
            return {"success": False, "message": "User has not joined this quest", "participant": None}
            
    except Exception as e:
        print(f"Error fetching participant: {e}")
        raise HTTPException(status_code=500, detail=str(e))
# --- OPTIONAL: List drafts for user ---


@router.get("/api/quests/drafts/{creator_address}", tags=["Quest Management"])
async def get_user_drafts(creator_address: str):
    try:
        if not Web3.is_address(creator_address):
            raise HTTPException(status_code=400, detail="Invalid address")
        creator_cs = Web3.to_checksum_address(creator_address)
        response = supabase.table("quests").select("*").eq(
            "creator_address", creator_cs
        ).eq("is_draft", True).execute()
        return {"success": True, "drafts": response.data or []}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
def generate_unique_referral_id():
    """Generates a short, URL-friendly unique ID."""
    return shortuuid.ShortUUID().random(length=8)   
# This is the endpoint the WalletConnectButton calls


@router.post("/api/quests/{faucet_address}/join", tags=["Quest Actions"])
async def join_quest(faucet_address: str, payload: JoinQuestRequest):
    try:
        faucet_address_cs = Web3.to_checksum_address(faucet_address)
        user_address_cs = Web3.to_checksum_address(payload.walletAddress)
        # 1. Fetch Quest Creator
        quest_res = supabase.table("quests").select("creator_address").eq("faucet_address", faucet_address_cs).execute()
        creator_address = quest_res.data[0].get("creator_address", "").lower() if quest_res.data else ""
        # 2. Check if user already joined
        existing_user = supabase.table("quest_participants").select("*").eq("quest_address", faucet_address_cs).eq("wallet_address", user_address_cs).execute()
        if existing_user.data:
            return {"success": True, "message": "User already joined", "participant": existing_user.data[0]}
        # 3. Handle Referral Logic (EXCLUDE ADMIN)
        if payload.referralCode:
            referrer_res = supabase.table("quest_participants").select("wallet_address, points, referral_count").eq("quest_address", faucet_address_cs).eq("referral_id", payload.referralCode).execute()
            
            if referrer_res.data:
                referrer = referrer_res.data[0]
                if referrer.get('wallet_address', '').lower() != creator_address:
                    new_points = (referrer.get('points') or 0) + 10
                    new_count = (referrer.get('referral_count') or 0) + 1
                    supabase.table("quest_participants").update({"points": new_points, "referral_count": new_count}).eq("quest_address", faucet_address_cs).eq("referral_id", payload.referralCode).execute()
        # 4. Create record
        new_ref_id = generate_unique_referral_id()
        new_participant = {
            "quest_address": faucet_address_cs,
            "wallet_address": user_address_cs,
            "referral_id": new_ref_id,
            "points": 0,
            "referral_count": 0,
            "joined_at": datetime.now(timezone.utc).isoformat()
        }
        supabase.table("quest_participants").insert(new_participant).execute()
        return {"success": True, "message": "Successfully joined quest", "participant": new_participant}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/api/quests/{faucet_address}/checkin", tags=["Quest Actions"])
async def daily_checkin(faucet_address: str, payload: CheckInRequest):
    try:
        if not Web3.is_address(faucet_address) or not Web3.is_address(payload.walletAddress):
            raise HTTPException(status_code=400, detail="Invalid address format")
        faucet_address_cs = Web3.to_checksum_address(faucet_address)
        user_address_cs = Web3.to_checksum_address(payload.walletAddress)
        # 1. SECURITY: Ensure Admin/Creator is not checking in
        quest_check = supabase.table("quests").select("creator_address").eq("faucet_address", faucet_address_cs).execute()
        if quest_check.data and quest_check.data[0]['creator_address'].lower() == user_address_cs.lower():
            raise HTTPException(status_code=403, detail="Admins cannot earn points or check in.")
        # 2. Fetch User Data
        user_res = supabase.table("quest_participants")\
            .select("*")\
            .eq("quest_address", faucet_address_cs)\
            .eq("wallet_address", user_address_cs)\
            .execute()
        if not user_res.data:
            raise HTTPException(status_code=404, detail="User not registered in this quest.")
        user = user_res.data[0]
        last_checkin = user.get("last_checkin_at")
        
        # 3. Verify Cooldown (24 Hours)
        now = datetime.now(timezone.utc)
        if last_checkin:
            last_checkin_dt = dateutil.parser.isoparse(last_checkin)
            last_checkin_dt = last_checkin_dt.replace(tzinfo=timezone.utc) if last_checkin_dt.tzinfo is None else last_checkin_dt.astimezone(timezone.utc)
            
            next_available = last_checkin_dt + timedelta(hours=24)
            if now < next_available:
                remaining = next_available - now
                hours, remainder = divmod(remaining.seconds, 3600)
                minutes, _ = divmod(remainder, 60)
                return {"success": False, "message": f"Cooldown active. Try again in {hours}h {minutes}m."}
        # 4. Award Points
        new_points = (user.get("points") or 0) + 10
        supabase.table("quest_participants").update({
            "points": new_points,
            "last_checkin_at": now.isoformat()
        }).eq("quest_address", faucet_address_cs).eq("wallet_address", user_address_cs).execute()
        # 5. Log Submission
        supabase.table("submissions").upsert({
            "faucet_address": faucet_address_cs,
            "wallet_address": user_address_cs,
            "task_id": "sys_daily",
            "task_title": "Daily Check-in",
            "status": "approved",
            "submitted_data": "Daily Check-in"
        }).execute()
        return {"success": True, "message": "Daily check-in successful! +10 Points", "newPoints": new_points}
    except HTTPException: raise
    except Exception as e:
        print(f"\u274c Error during check-in: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
     
# API Endpoints for Claims and Tasks


@router.delete("/api/quests/{faucet_address}/submissions/{submission_id}")
async def cancel_submission(faucet_address: str, submission_id: str):
    """
    Called by the frontend when an auto-verification fails.
    Removes the stuck record so the user can retry cleanly.
    """
    try:
        faucet_checksum = Web3.to_checksum_address(faucet_address)
        result = (
            supabase.table("submissions")          # \u2705 correct table
            .delete()
            .eq("submission_id", submission_id)    # \u2705 correct PK column
            .eq("faucet_address", faucet_checksum)
            .in_("status", ["pending", "auto_verifying"])  # \u2705 catches both states
            .execute()
        )
        deleted = len(result.data) if result.data else 0
        if deleted == 0:
            # Already approved/rejected \u2014 don't error, just report
            return {"success": True, "deleted": 0, "note": "Submission not found or already processed"}
        return {"success": True, "deleted": deleted}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
# \u2705 NOT indented inside cancel_submission \u2014 this is a top-level route


@router.get("/api/quests/{faucet_address}/submissions/pending")
async def get_pending_submissions_endpoint(faucet_address: str):
    """
    Returns submissions needing admin review.
    Includes both 'pending' (manual) and 'auto_verifying' (stuck/failed auto) records.
    """
    try:
        faucet_checksum = Web3.to_checksum_address(faucet_address)
        response = (
            supabase.table("submissions")
            .select("*")
            .eq("faucet_address", faucet_checksum)
            .in_("status", ["pending", "auto_verifying"])   # \u2705 both states
            .order("submitted_at", desc=True)
            .execute()
        )
        formatted = [
            {
                "submissionId": s["submission_id"],
                "walletAddress": s["wallet_address"],
                "taskId": s["task_id"],
                "taskTitle": s["task_title"],
                "submittedData": s["submitted_data"],
                "notes": s["notes"],
                "submittedAt": s["submitted_at"],
                "status": s["status"],               # expose so admin can see if it's stuck auto
                "submissionType": s.get("submission_type"),
            }
            for s in response.data
        ]
        return {"success": True, "submissions": formatted, "count": len(formatted)}
    except Exception as e:
        print(e)
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/api/quests/{faucet_address}")
async def update_quest_details(
    faucet_address: str, 
    update: QuestUpdate
):
    """
    Update Quest Details (Admin Only)
    """
    try:
        # 1. Verify Quest Exists
        # (In production, also verify the request comes from the creator)
        
        # 2. Prepare Update Data
        # We only update fields that are not None
        update_data = {k: v for k, v in update.dict().items() if v is not None}
        
        if not update_data:
            return {"success": False, "message": "No data provided"}
        # 3. Update in Supabase
        # Assuming you have a 'quests' table. 
        # If using the mock structure from previous steps, we just return success.
        # REAL DB CALL EXAMPLE:
        # response = supabase.table("quests").update(update_data).eq("faucet_address", faucet_address).execute()
        
        return {
            "success": True, 
            "message": "Quest updated successfully",
            "updatedFields": update_data
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/api/quests/{faucet_address}/progress/{wallet_address}")
async def get_user_progress(faucet_address: str, wallet_address: str):
    try:
        import math
        faucet_checksum = Web3.to_checksum_address(faucet_address)
        wallet_checksum = Web3.to_checksum_address(wallet_address)
        # 1. Fetch or create user_progress row
        response = supabase.table("user_progress") \
            .select("*") \
            .eq("wallet_address", wallet_checksum) \
            .eq("faucet_address", faucet_checksum) \
            .execute()
        if not response.data:
            new_profile = {
                "wallet_address": wallet_checksum,
                "faucet_address": faucet_checksum,
                "total_points": 0,
                "stage_points": {
                    "Beginner": 0, "Intermediate": 0,
                    "Advance": 0, "Legend": 0, "Ultimate": 0
                },
                "completed_tasks": [],
                "current_stage": "Beginner"
            }
            insert_res = supabase.table("user_progress").insert(new_profile).execute()
            user_data = insert_res.data[0] if insert_res.data else new_profile
        else:
            user_data = response.data[0]
        if not user_data:
            raise HTTPException(status_code=500, detail="Failed to retrieve or create user progress")
        # 2. Fetch tasks \u2014 needed to calculate stage totals and thresholds
        tasks_res = supabase.table("faucet_tasks") \
            .select("tasks") \
            .eq("faucet_address", faucet_checksum) \
            .execute()
        tasks = []
        if tasks_res.data:
            tasks = tasks_res.data[0].get("tasks") or []
        # 3. Ensure all stage_points keys exist
        stage_points = user_data.get("stage_points") or {}
        for s in ["Beginner", "Intermediate", "Advance", "Legend", "Ultimate"]:
            if s not in stage_points:
                stage_points[s] = 0
        # 4. Derive active stages and totals from tasks
        active_stages = get_active_stages(tasks)   # only stages with tasks
        stage_totals  = get_stage_totals(tasks)    # total pts per stage
        # 5. Self-heal: recalculate correct stage and fix DB if wrong
        calculated_stage = calculate_current_stage(stage_points, tasks)
        db_stage = user_data.get("current_stage", "Beginner")
        if calculated_stage != db_stage:
            print(f"\ud83d\udd27 Self-heal stage: {db_stage} \u2192 {calculated_stage}")
            supabase.table("user_progress").update({
                "current_stage": calculated_stage,
                "stage_points":  stage_points,
            }).eq("wallet_address", wallet_checksum) \
              .eq("faucet_address", faucet_checksum) \
              .execute()
            user_data["current_stage"] = calculated_stage
            user_data["stage_points"]  = stage_points
        current_stage = user_data["current_stage"]
        # 6. Build per-stage metadata for the frontend
        # Frontend uses this to render progress bars, badges, and lock states
        stages_meta = {}
        for i, stage in enumerate(active_stages):
            total     = stage_totals.get(stage, 0)
            threshold = math.ceil(total * 0.70) if total > 0 else 0
            earned    = stage_points.get(stage, 0)
            is_unlocked = earned >= threshold if threshold > 0 else False
            stages_meta[stage] = {
                "stageTotal":      total,       # total pts available in this stage
                "unlockThreshold": threshold,   # 70% \u2014 what user needs to advance
                "userEarned":      earned,      # what user has earned in this stage
                "isUnlocked":      is_unlocked, # True = stage passed, show badge
                "isCurrent":       stage == current_stage,
                "stageIndex":      i,
                "isLastStage":     i == len(active_stages) - 1,
            }
        # 7. Current stage convenience fields
        current_meta      = stages_meta.get(current_stage, {})
        current_earned    = current_meta.get("userEarned", 0)
        current_threshold = current_meta.get("unlockThreshold", 0)
        current_total     = current_meta.get("stageTotal", 0)
        # 8. Fetch submissions
        subs_response = supabase.table("submissions") \
            .select("*") \
            .eq("wallet_address", wallet_checksum) \
            .eq("faucet_address", faucet_checksum) \
            .execute()
        submissions_data = subs_response.data or []
        # 9. Build and return response
        formatted_progress = {
            # Existing fields (keep for backward compatibility)
            "totalPoints":    user_data["total_points"],
            "stagePoints":    stage_points,
            "currentStage":   current_stage,
            "completedTasks": user_data.get("completed_tasks") or [],
            # New fields \u2014 frontend uses these for progress bars
            "activeStages":            active_stages,   # e.g. ["Beginner","Intermediate","Ultimate"]
            "stageTotals":             stage_totals,    # total pts per stage
            "stagesMeta":              stages_meta,     # full breakdown per stage
            "currentStageEarned":      current_earned,
            "currentStageTotal":       current_total,
            "currentStageThreshold":   current_threshold,  # 70% of currentStageTotal
            "submissions": [
                {
                    "submissionId":  s["submission_id"],
                    "taskId":        s["task_id"],
                    "taskTitle":     s["task_title"],
                    "status":        s["status"],
                    "submittedData": s["submitted_data"],
                    "submittedAt":   s["submitted_at"],
                    "notes":         s["notes"],
                }
                for s in submissions_data
            ],
        }
        return {"success": True, "progress": formatted_progress}
    except Exception as e:
        print(f"Error getting progress: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/api/quests/{faucet_address}/submissions")
async def submit_task(
    faucet_address: str,
    walletAddress: str = Form(...),
    taskId: str = Form(...),
    submittedData: str = Form(None),
    notes: str = Form(""),
    submissionType: str = Form(...),
    file: Optional[UploadFile] = File(None)
):
    try:
        faucet_checksum = Web3.to_checksum_address(faucet_address)
        wallet_checksum = Web3.to_checksum_address(walletAddress)
        
        # 1. Fetch Task Details FIRST
        _, tasks_list = await get_quest_context(faucet_checksum)
        target_task = next((t for t in tasks_list if t['id'] == taskId), None)
        
        # Fallback for system tasks
        if not target_task:
            if taskId == "sys_daily":
                target_task = {"id": "sys_daily", "action": "checkin", "title": "Daily Check-in"}
            elif taskId == "sys_share_x":
                target_task = {"id": "sys_share_x", "action": "share_quest", "title": "Share Quest"}
            elif taskId == "sys_referral":
                target_task = {"id": "sys_referral", "action": "refer", "title": "Referral"}
            else:
                raise HTTPException(status_code=404, detail="Task configuration not found")
        # 2. CLEAN UP SUBMITTED DATA (The user's Link/TxHash)
        clean_submitted_data = submittedData if submittedData not in ["undefined", "null", "None"] else ""
        
        # Prevent saving the Task Reference URL as the user's proof by mistake
        if clean_submitted_data and target_task.get("url"):
            if clean_submitted_data.strip().lower() == target_task.get("url").strip().lower():
                clean_submitted_data = ""
        # 3. Handle File Uploads & Combined Submissions
        verification_note = notes
        final_data_link = clean_submitted_data 
        
        if file:
            file_ext = file.filename.split(".")[-1]
            file_path = f"{faucet_checksum}/{wallet_checksum}/{uuid.uuid4()}.{file_ext}"
            file_content = await file.read()
            supabase.storage.from_("quest-proofs").upload(
                file_path, file_content, {"content-type": file.content_type}
            )
            image_url = supabase.storage.from_("quest-proofs").get_public_url(file_path)
            
            # SMART ROUTING: Save both the Image AND the Link/TxHash!
            if clean_submitted_data and clean_submitted_data.strip():
                if notes:
                    verification_note = f"User Proof Link: {clean_submitted_data}\
\
User Notes: {notes}"
                else:
                    verification_note = f"User Proof Link: {clean_submitted_data}"
            
            final_data_link = image_url
        # 4. VERIFICATION LOGIC SWITCH
        initial_status = "pending"
        # Case A: Instant Tasks
        if submissionType == "none":
            initial_status = "approved"
            verification_note = "Instant Reward (No Verification Required)"
        # Case B: On-Chain Verification Engine 
        elif submissionType == "onchain":
            f_meta = supabase.table("userfaucets").select("chain_id").eq("faucet_address", faucet_address.lower()).execute()
            raw_chain_id = f_meta.data[0]['chain_id'] if f_meta.data else 42220 
            chain_map = {
                1: Chain.ethereum, 8453: Chain.base, 42161: Chain.arbitrum,
                 42220: Chain.celo, 56: Chain.bnb, 1135: Chain.lisk
            }
            target_chain_enum = chain_map.get(raw_chain_id, Chain.celo)
            print(f"\ud83d\udd75\ufe0f Verifying On-Chain: {target_task.get('action')} on {target_chain_enum}")
            passed = await run_onchain_verification(wallet_checksum, target_chain_enum, target_task)
            if passed:
                initial_status = "approved"
                verification_note = "Verified On-Chain Successfully"
                final_data_link = "On-Chain Verified"
            else:
                return {
                    "success": False, 
                    "message": "Verification failed. Requirements not met (check balance, timeframe, or transaction history)."
                }
        # Case C: Bot Auto Verifications
        elif submissionType in ["auto_social", "system_x_share", "auto_tx"]:
            initial_status = "auto_verifying"
            verification_note = "Awaiting automatic bot verification..."
        existing = (
            supabase.table("submissions")
            .select("submission_id, status")
            .eq("faucet_address", faucet_checksum)
            .eq("wallet_address", wallet_checksum)
            .eq("task_id", taskId)
            .in_("status", ["pending", "auto_verifying"])
            .execute()
        )
        if existing.data:
            return {
                "success": False,
                "message": "You already have a pending submission for this task. Please wait or cancel it first."
            }
        # 5. DB INSERT & POINT AWARD
        submission_entry = {
            "faucet_address": faucet_checksum,
            "wallet_address": wallet_checksum,
            "task_id": taskId,
            "task_title": target_task.get('title', 'Task Submission'),
            "submitted_data": final_data_link or "No proof attached",
            "notes": verification_note,
            "submission_type": submissionType,
            "status": initial_status,
            "submitted_at": datetime.utcnow().isoformat()
        }
        
        res = supabase.table("submissions").insert(submission_entry).execute()
        
        # IF APPROVED, TRIGGER POINTS IMMEDIATELY
        if initial_status == "approved" and res.data:
            await process_auto_approval(
                res.data[0]['submission_id'], 
                faucet_checksum, 
                wallet_checksum
            )
        return {
            "success": True, 
            "message": "Verified! Points added." if initial_status == "approved" else "Checking requirements...", 
            "submissionId": res.data[0]['submission_id'] if res.data else None
        }
    except Exception as e:
        print(f"Submission error: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))
# --- 1. VERIFY GROUP/CHANNEL MEMBERSHIP ---
class VerifyTelegramRequest(BaseModel):
    wallet_address: str
    chat_id: str # The @username of the channel or the numeric ID of the group


@router.post("/api/quests/verify/telegram-join")
async def verify_telegram_join(req: VerifyTelegramRequest):
    try:
        # 1. Get the user's numeric Telegram ID from Supabase
        user_res = supabase.table("user_profiles").select("telegram_user_id").eq("wallet_address", req.wallet_address.lower()).execute()
        
        if not user_res.data or not user_res.data[0].get("telegram_user_id"):
            return {"verified": False, "message": "Telegram account not linked properly."}
            
        telegram_user_id = user_res.data[0]["telegram_user_id"]
        # 2. Ask Telegram if the user is in the chat
        async with httpx.AsyncClient() as client:
            res = await client.get(f"{TELEGRAM_API_URL}/getChatMember", params={
                "chat_id": req.chat_id,
                "user_id": telegram_user_id
            })
            data = res.json()
        if data.get("ok"):
            status = data["result"]["status"]
            # 'left' and 'kicked' mean they are not in the group
            if status not in ["left", "kicked"]:
                return {"verified": True, "message": "User is in the group/channel!"}
        
        return {"verified": False, "message": "User has not joined the group/channel."}
    except Exception as e:
        print(f"Telegram Verification Error: {e}")
        return {"verified": False, "message": "Internal verification error."}
# --- 2. WEBHOOK TO TRACK MESSAGES LIVE ---


@router.post("/api/quests/verify/telegram-messages")
async def verify_message_count(req: VerifyMessageCountRequest):
    try:
        user_res = supabase.table("user_profiles").select("telegram_user_id").eq("wallet_address", req.wallet_address.lower()).execute()
        
        if not user_res.data or not user_res.data[0].get("telegram_user_id"):
            return {"verified": False, "message": "Telegram not linked."}
            
        telegram_user_id = user_res.data[0]["telegram_user_id"]
        # Check the count in our database
        count_res = supabase.table("telegram_message_counts")\
            .select("message_count")\
            .eq("telegram_user_id", telegram_user_id)\
            .eq("chat_id", req.chat_id)\
            .execute()
        if count_res.data:
            current_count = count_res.data[0]["message_count"]
            if current_count >= req.required_count:
                return {"verified": True, "current_count": current_count}
            else:
                return {"verified": False, "current_count": current_count, "message": f"Only {current_count}/{req.required_count} messages sent."}
        
        return {"verified": False, "current_count": 0, "message": "No messages found in this group."}
    except Exception as e:
        return {"verified": False, "message": "Internal error."}


@router.post("/api/quests/verify-bot-admin")
async def verify_bot_admin(req: dict):
    """
    Checks if the FaucetDrops bot is an admin in the requested chat.
    Expected payload: {"chat_id": "@GroupUsername"}
    """
    chat_id = req.get("chat_id")
    if not chat_id:
        return {"is_admin": False, "message": "Missing chat_id"}
        
    # Standardize format (must start with @ for public chats)
    if not chat_id.startswith("@") and not chat_id.startswith("-100"):
        chat_id = f"@{chat_id}"
    try:
        # Extract the Bot's own numeric ID from its token
        bot_id = TELEGRAM_BOT_TOKEN.split(":")[0]
        
        async with httpx.AsyncClient() as client:
            # Check the bot's own status in that specific chat
            res = await client.get(f"{TELEGRAM_API_URL}/getChatMember", params={
                "chat_id": chat_id,
                "user_id": bot_id
            })
            data = res.json()
        if not data.get("ok"):
            # Telegram returns 400 if the bot hasn't been added or the chat doesn't exist
            error_msg = data.get("description", "Unknown Telegram error")
            return {"is_admin": False, "message": f"Cannot find chat or bot is not inside. ({error_msg})"}
        status = data["result"]["status"]
        
        # 'administrator' or 'creator' means it has the rights we need
        if status in ["administrator", "creator"]:
            return {"is_admin": True, "message": "Bot is an admin!"}
        else:
            return {"is_admin": False, "message": "Bot is in the chat, but is NOT an admin."}
    except Exception as e:
        print(f"Bot Admin Verify Error: {e}")
        return {"is_admin": False, "message": "Internal server error connecting to Telegram."}


@router.put("/api/quests/{faucet_address}/submissions/{submission_id}")
async def update_submission(
    faucet_address: str,
    submission_id: str,
    update: SubmissionUpdate
):
    try:
        faucet_checksum = Web3.to_checksum_address(faucet_address)
        # 1. Update status in 'submissions' table
        now = datetime.utcnow().isoformat()
        sub_update = supabase.table("submissions").update({
            "status": update.status, 
            "reviewed_at": now
        }).eq("submission_id", submission_id).execute()
        if not sub_update.data:
            raise HTTPException(status_code=404, detail="Submission not found")
        
        submission = sub_update.data[0]
        wallet_checksum = submission['wallet_address']
        task_id = submission['task_id']
        # 2. Logic for Approval
        if update.status == "approved":
            # A. Fetch Context (Requirements and Task Data)
            stage_reqs, tasks = await get_quest_context(faucet_checksum)
            
            # Find the specific task to get points and stage
            task = next((t for t in tasks if t['id'] == task_id), None)
            
            # --- FALLBACK FOR SYSTEM TASKS ---
            if not task and task_id in SYSTEM_TASK_REGISTRY:
                task = SYSTEM_TASK_REGISTRY[task_id]
            # ---------------------------------
            if task:
                points_to_add = int(task.get('points', 0))
                task_stage = task.get('stage', 'Beginner')
                # B. Fetch Current User Progress
                prog_res = supabase.table("user_progress")\
                    .select("*")\
                    .eq("wallet_address", wallet_checksum)\
                    .eq("faucet_address", faucet_checksum)\
                    .execute()
                
                if not prog_res.data:
                    # Create progress row if missing (edge case)
                    new_profile = {
                        "wallet_address": wallet_checksum,
                        "faucet_address": faucet_checksum,
                        "total_points": 0,
                        "stage_points": {"Beginner": 0, "Intermediate": 0, "Advance": 0, "Legend": 0, "Ultimate": 0},
                        "completed_tasks": [],
                        "current_stage": "Beginner"
                    }
                    prog_res = supabase.table("user_progress").insert(new_profile).execute()
                
                if prog_res.data:
                    curr_prog = prog_res.data[0]
                    
                    # C. Calculate New Values
                    # Update Total Points
                    new_total = curr_prog['total_points'] + points_to_add
                    
                    # Update Stage Points (JSONB)
                    current_stage_points = curr_prog['stage_points'] or {}
                    if task_stage not in current_stage_points:
                        current_stage_points[task_stage] = 0
                    current_stage_points[task_stage] += points_to_add
                    
                    # Update Completed Tasks (Array)
                    completed_list = curr_prog['completed_tasks'] or []
                    if task_id not in completed_list:
                        completed_list.append(task_id)
                    # Calculate New Stage Level
                    new_stage_name = calculate_current_stage(current_stage_points, tasks) if stage_reqs else curr_prog['current_stage']
                    # D. Commit Updates to DB
                    supabase.table("user_progress").update({
                        "total_points": new_total,
                        "stage_points": current_stage_points,
                        "completed_tasks": completed_list,
                        "current_stage": new_stage_name
                    }).eq("wallet_address", wallet_checksum).eq("faucet_address", faucet_checksum).execute()
                    # E. Sync Leaderboard
                    part_res = supabase.table("quest_participants").select("points").eq("quest_address", faucet_checksum).eq("wallet_address", wallet_checksum).execute()
                    if part_res.data:
                        current_lb_points = part_res.data[0].get('points', 0)
                        supabase.table("quest_participants").update({
                            "points": current_lb_points + points_to_add
                        }).eq("quest_address", faucet_checksum).eq("wallet_address", wallet_checksum).execute()
        return {"success": True, "message": f"Submission {update.status}"}
    except Exception as e:
        print(f"Update submission error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/api/quests/{faucet_address}/submissions/pending")
async def get_pending_submissions_endpoint(faucet_address: str):
    try:
        faucet_checksum = Web3.to_checksum_address(faucet_address)
        
        # Query submissions where status is 'pending'
        response = supabase.table("submissions")\
            .select("*")\
            .eq("faucet_address", faucet_checksum)\
            .eq("status", "pending")\
            .order("submitted_at", desc=True)\
            .execute()
        
        formatted = [
            {
                "submissionId": s['submission_id'],
                "walletAddress": s['wallet_address'],
                "taskId": s['task_id'],
                "taskTitle": s['task_title'],
                "submittedData": s['submitted_data'],
                "notes": s['notes'],
                "submittedAt": s['submitted_at']
            } for s in response.data
        ]
        return {"success": True, "submissions": formatted, "count": len(formatted)}
    except Exception as e:
        print(e)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/api/quests/{faucet_address}/leaderboard")
async def get_leaderboard_endpoint(faucet_address: str):
    try:
        faucet_checksum = Web3.to_checksum_address(faucet_address)
        # 1. Fetch Quest Metadata to identify the Creator
        quest_res = supabase.table("quests").select("creator_address").eq("faucet_address", faucet_checksum).execute()
        creator_address = quest_res.data[0].get("creator_address", "").lower() if quest_res.data else ""
        # 2. Primary Fetch: Get live points, explicitly EXCLUDING the creator
        participants_query = supabase.table("quest_participants")\
            .select("wallet_address, points")\
            .eq("quest_address", faucet_checksum)
        
        if creator_address:
            # PostgreSQL is case-sensitive, ensure we exclude variants
            participants_query = participants_query.neq("wallet_address", creator_address)\
                                                   .neq("wallet_address", Web3.to_checksum_address(creator_address))
        participants_response = participants_query.order("points", desc=True).limit(50).execute()
        
        participants_data = participants_response.data or []
        if not participants_data:
            return {"success": True, "leaderboard": []}
        # FIX: Ensure all addresses are lowercase for consistent matching with profile table
        wallet_addresses_lower = [row['wallet_address'].lower() for row in participants_data]
        # 3. Parallel Fetch: Profiles using lowercase addresses
        profiles_res = supabase.table("user_profiles")\
            .select("wallet_address, username, avatar_url")\
            .in_("wallet_address", wallet_addresses_lower)\
            .execute()
            
        progress_res = supabase.table("user_progress")\
            .select("wallet_address, completed_tasks")\
            .in_("wallet_address", wallet_addresses_lower)\
            .eq("faucet_address", faucet_checksum)\
            .execute()
        # 4. Create maps for quick lookup (store keys as lowercase)
        profiles_map = {p['wallet_address'].lower(): p for p in profiles_res.data}
        progress_map = {pr['wallet_address'].lower(): pr for pr in progress_res.data}
        # 5. Final Merge
        leaderboard = []
        for i, row in enumerate(participants_data):
            wallet = row['wallet_address']
            wallet_l = wallet.lower() 
            
            profile = profiles_map.get(wallet_l, {})
            progress = progress_map.get(wallet_l, {})
            
            username = profile.get('username') or f"{wallet[:6]}...{wallet[-4:]}"
            
            leaderboard.append({
                "rank": i + 1,
                "walletAddress": wallet,
                "username": username,
                "avatarUrl": profile.get('avatar_url'), 
                "points": row['points'],
                "completedTasks": len(progress.get('completed_tasks') or [])
            })
            
        return {"success": True, "leaderboard": leaderboard}
    
    except Exception as e:
        print(f"Leaderboard error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.patch("/api/quests/{faucet_address}/meta", tags=["Quest Management"])
async def update_quest_meta(faucet_address: str, payload: QuestMetaUpdate):
    """
    Update quest title and/or image URL.
    Reward pool and token details are intentionally NOT editable here.
    Only the quest creator (or an admin) may call this.
    """
    try:
        if not Web3.is_address(faucet_address) or not Web3.is_address(payload.adminAddress):
            raise HTTPException(status_code=400, detail="Invalid address format")
        faucet_cs = Web3.to_checksum_address(faucet_address)
        admin_cs  = Web3.to_checksum_address(payload.adminAddress)
        # 1. Verify caller is the quest creator
        quest_res = supabase.table("quests").select("creator_address").eq(
            "faucet_address", faucet_cs
        ).execute()
        if not quest_res.data:
            raise HTTPException(status_code=404, detail="Quest not found")
        creator = quest_res.data[0]["creator_address"]
        if creator.lower() != admin_cs.lower():
            raise HTTPException(status_code=403, detail="Only the quest creator can edit meta")
        # 2. Build update dict \u2014 only allowed fields
        update_data: dict = {"updated_at": datetime.now().isoformat()}
        
        if payload.title is not None:
            title = payload.title.strip()
            if len(title) < 3:
                raise HTTPException(status_code=400, detail="Title must be at least 3 characters")
            update_data["title"] = title
            
        if payload.imageUrl is not None:
            update_data["image_url"] = payload.imageUrl
        # \ud83d\udc47 ADD THESE TWO BLOCKS \ud83d\udc47
        if payload.distributionConfig is not None:
            update_data["distribution_config"] = payload.distributionConfig
            
        if payload.rewardPool is not None:
            update_data["reward_pool"] = payload.rewardPool
        if len(update_data) == 1:  # only updated_at \u2192 nothing to change
            return {"success": True, "message": "No changes requested"}
        # 3. Persist to DB
        res = supabase.table("quests").update(update_data).eq(
            "faucet_address", faucet_cs
        ).execute()
        # 3. Persist
        res = supabase.table("quests").update(update_data).eq(
            "faucet_address", faucet_cs
        ).execute()
        if not res.data:
            raise HTTPException(status_code=500, detail="Update failed")
        print(f"\u2705 Quest meta updated for {faucet_cs}: {list(update_data.keys())}")
        return {"success": True, "message": "Quest metadata updated", "updated": update_data}
    except HTTPException:
        raise
    except Exception as e:
        print(f"\ud83d\udca5 update_quest_meta error: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@router.patch("/api/quests/{faucet_address}/tasks", tags=["Quest Management"])
async def update_quest_tasks(faucet_address: str, payload: QuestTasksUpdate):
    """
    Replace the user-defined (non-system) tasks for a quest.
    \u2022 System tasks (id starts with 'sys_' or isSystem=True) already stored in
      the DB are automatically preserved and re-appended after the update.
    \u2022 Caller must be the quest creator.
    \u2022 Points must be positive integers.
    \u2022 Stage must be one of: Beginner, Intermediate, Advance, Legend, Ultimate.
    """
    VALID_STAGES = {"Beginner", "Intermediate", "Advance", "Legend", "Ultimate"}
    try:
        if not Web3.is_address(faucet_address) or not Web3.is_address(payload.adminAddress):
            raise HTTPException(status_code=400, detail="Invalid address format")
        faucet_cs = Web3.to_checksum_address(faucet_address)
        admin_cs  = Web3.to_checksum_address(payload.adminAddress)
        # 1. Auth check
        quest_res = supabase.table("quests").select("creator_address").eq(
            "faucet_address", faucet_cs
        ).execute()
        if not quest_res.data:
            raise HTTPException(status_code=404, detail="Quest not found")
        creator = quest_res.data[0]["creator_address"]
        if creator.lower() != admin_cs.lower():
            raise HTTPException(status_code=403, detail="Only the quest creator can edit tasks")
        # 2. Validate incoming tasks
        incoming_tasks = []
        for t in payload.tasks:
            task_dict = t.dict()
            # Block system task IDs from being submitted via this route
            if _is_system_task(task_dict):
                raise HTTPException(
                    status_code=400,
                    detail=f"System task '{t.id}' cannot be edited via this endpoint"
                )
            # Validate stage
            if t.stage not in VALID_STAGES:
                raise HTTPException(
                    status_code=400,
                    detail=f"Invalid stage '{t.stage}' for task '{t.id}'"
                )
            # Validate points
            try:
                pts = int(t.points)
                if pts < 0:
                    raise ValueError
                task_dict["points"] = pts
            except (ValueError, TypeError):
                raise HTTPException(
                    status_code=400,
                    detail=f"Points must be a non-negative integer for task '{t.id}'"
                )
            incoming_tasks.append(task_dict)
        # 3. Fetch current tasks to preserve system tasks
        existing_res = supabase.table("faucet_tasks").select("tasks").eq(
            "faucet_address", faucet_cs
        ).execute()
        system_tasks = []
        if existing_res.data:
            all_existing = existing_res.data[0].get("tasks") or []
            system_tasks = [t for t in all_existing if _is_system_task(t)]
        # 4. Merge: system tasks first, then user tasks
        merged_tasks = system_tasks + incoming_tasks
        # 5. Upsert faucet_tasks
        upsert_payload = {
            "faucet_address": faucet_cs,
            "tasks": merged_tasks,
            "created_by": admin_cs,
            "updated_at": datetime.now().isoformat(),
        }
        res = supabase.table("faucet_tasks").upsert(
            upsert_payload, on_conflict="faucet_address"
        ).execute()
        if not res.data:
            raise HTTPException(status_code=500, detail="Task update failed")
        print(
            f"\u2705 Tasks updated for {faucet_cs}: "
            f"{len(system_tasks)} system + {len(incoming_tasks)} user tasks"
        )
        return {
            "success": True,
            "message": f"Tasks updated ({len(incoming_tasks)} user tasks, {len(system_tasks)} system tasks preserved)",
            "totalTasks": len(merged_tasks),
            "systemTasksPreserved": len(system_tasks),
            "userTasksCount": len(incoming_tasks),
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"\ud83d\udca5 update_quest_tasks error: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/api/quests/{faucet_address}/tasks/editable", tags=["Quest Management"])
async def get_editable_tasks(faucet_address: str, adminAddress: str):
    """
    Returns only the user-editable (non-system) tasks for the admin panel.
    System tasks are excluded from the response.
    """
    try:
        if not Web3.is_address(faucet_address) or not Web3.is_address(adminAddress):
            raise HTTPException(status_code=400, detail="Invalid address format")
        faucet_cs = Web3.to_checksum_address(faucet_address)
        admin_cs  = Web3.to_checksum_address(adminAddress)
        # Auth check
        quest_res = supabase.table("quests").select("creator_address").eq(
            "faucet_address", faucet_cs
        ).execute()
        if not quest_res.data:
            raise HTTPException(status_code=404, detail="Quest not found")
        creator = quest_res.data[0]["creator_address"]
        if creator.lower() != admin_cs.lower():
            raise HTTPException(status_code=403, detail="Access denied")
        # Fetch tasks
        tasks_res = supabase.table("faucet_tasks").select("tasks").eq(
            "faucet_address", faucet_cs
        ).execute()
        all_tasks = []
        if tasks_res.data:
            all_tasks = tasks_res.data[0].get("tasks") or []
        user_tasks   = [t for t in all_tasks if not _is_system_task(t)]
        system_tasks = [t for t in all_tasks if _is_system_task(t)]
        return {
            "success": True,
            "userTasks": user_tasks,
            "systemTasksCount": len(system_tasks),
            "totalTasks": len(all_tasks),
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
# ============================================================
# TELEGRAM AUTO-VERIFICATION ENGINE
# ============================================================
import httpx
from fastapi import BackgroundTasks
TELEGRAM_BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN")
TELEGRAM_API = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}"

async def check_tag_via_oembed(tweet_url: str, required_tag: str) -> dict:
    """Checks if a tweet URL contains the required tag/mention via oEmbed."""
    import httpx, re
    try:
        oembed_url = f"https://publish.twitter.com/oembed?url={tweet_url}"
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(oembed_url)
        if resp.status_code != 200:
            return {"success": False, "message": "Could not fetch tweet. Make sure it is public."}
        html = resp.json().get("html", "")
        tag_clean = required_tag.strip().lower().lstrip("#@")
        if tag_clean.lower() in html.lower():
            return {"success": True, "message": f"Tag {required_tag} found in tweet."}
        return {"success": False, "message": f"Required tag {required_tag} not found in your post."}
    except Exception as e:
        return {"success": False, "message": f"Verification error: {str(e)}"}
# ---- HELPER: Extract Chat ID from URL ----
def extract_telegram_chat_id(url: str) -> str:
    """
    Extracts the username/handle from a Telegram link.
    Supports: t.me/mychannel, t.me/+inviteHash, @mychannel
    """
    import re
    # Handle invite links (private groups) \u2014 can't check membership, return None
    if "/+" in url or "joinchat" in url:
        return None  # Private group \u2014 can't auto-verify
    
    match = re.search(r't\.me/([a-zA-Z0-9_]+)', url)
    if match:
        return f"@{match.group(1)}"
    
    # Already a handle
    if url.startswith("@"):
        return url
    
    return None
# ---- CORE: Check if user is member of a chat ----
async def check_telegram_membership(
    chat_id: str,           # e.g. "@mychannel" or numeric chat ID
    telegram_user_id: str   # User's Telegram numeric ID
) -> dict:
    """
    Uses getChatMember API to verify if user is in a group/channel.
    Bot must be an admin of the target chat.
    """
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.post(
                f"{TELEGRAM_API}/getChatMember",
                json={
                    "chat_id": chat_id,
                    "user_id": int(telegram_user_id)
                }
            )
            data = resp.json()
            
            if not data.get("ok"):
                error_desc = data.get("description", "Unknown error")
                
                # Bot is not admin in the chat
                if "bot is not a member" in error_desc or "CHAT_ADMIN_REQUIRED" in error_desc:
                    return {
                        "success": False,
                        "verified": False,
                        "reason": "bot_not_admin",
                        "message": "Bot is not an admin in this chat. Ask the channel owner to add @YourQuestBot as admin."
                    }
                
                # User not found
                if "user not found" in error_desc or "USER_ID_INVALID" in error_desc:
                    return {
                        "success": False,
                        "verified": False,
                        "reason": "user_not_found",
                        "message": "Could not find your Telegram account. Make sure your Telegram ID is linked in your profile."
                    }
                
                return {
                    "success": False,
                    "verified": False,
                    "reason": "api_error",
                    "message": error_desc
                }
            
            member = data.get("result", {})
            status = member.get("status")
            
            # Valid member statuses
            is_member = status in ["member", "administrator", "creator", "restricted"]
            # Excluded: "left", "kicked", "banned"
            
            return {
                "success": True,
                "verified": is_member,
                "status": status,
                "reason": "verified" if is_member else "not_member",
                "message": "Membership confirmed!" if is_member else f"User has not joined. Status: {status}"
            }
            
    except Exception as e:
        print(f"\u274c Telegram API Error: {e}")
        return {
            "success": False,
            "verified": False,
            "reason": "exception",
            "message": str(e)
        }
# ---- VERIFY BOT IS ADMIN IN CHAT ----
async def verify_bot_is_admin(chat_id: str) -> dict:
    """
    Checks if our bot has admin rights in the target channel/group.
    Called when admin sets up the task to validate configuration.
    """
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            # Get bot's own info first
            me_resp = await client.get(f"{TELEGRAM_API}/getMe")
            me_data = me_resp.json()
            if not me_data.get("ok"):
                return {"is_admin": False, "message": "Could not fetch bot info"}
            
            bot_id = me_data["result"]["id"]
            bot_username = me_data["result"]["username"]
            
            # Check bot's membership in the chat
            member_resp = await client.post(
                f"{TELEGRAM_API}/getChatMember",
                json={"chat_id": chat_id, "user_id": bot_id}
            )
            member_data = member_resp.json()
            
            if not member_data.get("ok"):
                return {
                    "is_admin": False,
                    "bot_username": bot_username,
                    "message": f"Bot @{bot_username} is not in this chat or chat doesn't exist."
                }
            
            status = member_data["result"].get("status")
            is_admin = status in ["administrator", "creator"]
            
            return {
                "is_admin": is_admin,
                "bot_username": bot_username,
                "status": status,
                "message": f"Bot @{bot_username} is {'an admin \u2705' if is_admin else 'NOT an admin \u274c'} in this chat."
            }
            
    except Exception as e:
        return {"is_admin": False, "message": str(e)}
# ---- MAIN: Telegram Task Verification Endpoint ----
class TelegramVerifyRequest(BaseModel):
    submissionId: str
    faucetAddress: str
    walletAddress: str
    taskUrl: str        # The Telegram channel/group link (from task.url)
    taskAction: str     # "join", "subscribe", etc.
