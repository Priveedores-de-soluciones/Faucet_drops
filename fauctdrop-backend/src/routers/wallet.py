"""
routers/wallet.py — Wallet Balances & Transactions endpoints.

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

router = APIRouter(tags=["Wallet"])

@router.get("/api/wallet/balances/{chain_id}/{wallet_address}")
async def get_wallet_balances(chain_id: int, wallet_address: str):
    """
    Fetch all token balances for a wallet on a specific chain.
    Returns both native and ERC20 token balances for ALL configured tokens.
    """
    try:
        if not Web3.is_address(wallet_address):
            raise HTTPException(status_code=400, detail="Invalid wallet address")
        
        wallet_checksum = Web3.to_checksum_address(wallet_address)
        
        # Get Web3 instance for the chain
        w3 = await get_web3_instance(chain_id)
        
        balances = []
        
        # Get native token balance
        try:
            native_balance = w3.eth.get_balance(wallet_checksum)
            balances.append({
                "token_address": "0x0000000000000000000000000000000000000000",
                "balance": str(native_balance),
                "is_native": True
            })
        except Exception as e:
            print(f"Error fetching native balance: {e}")
            # Still add native token with 0 balance
            balances.append({
                "token_address": "0x0000000000000000000000000000000000000000",
                "balance": "0",
                "is_native": True
            })
        
        # Get ERC20 token balances based on chain - RETURN ALL TOKENS
        token_addresses = get_token_addresses_for_chain(chain_id)
        
        for token_address in token_addresses:
            try:
                token_contract = w3.eth.contract(
                    address=Web3.to_checksum_address(token_address),
                    abi=ERC20_BALANCE_ABI
                )
                
                balance = token_contract.functions.balanceOf(wallet_checksum).call()
                
                # CHANGED: Return ALL tokens, not just ones with balance > 0
                balances.append({
                    "token_address": token_address,
                    "balance": str(balance),
                    "is_native": False
                })
                    
            except Exception as e:
                print(f"Error fetching balance for {token_address}: {e}")
                # Add token with 0 balance on error
                balances.append({
                    "token_address": token_address,
                    "balance": "0",
                    "is_native": False
                })
        
        return {
            "success": True,
            "chain_id": chain_id,
            "wallet_address": wallet_checksum,
            "balances": balances
        }
        
    except Exception as e:
        print(f"Error fetching wallet balances: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/api/wallet/balance/{chain_id}/{token_address}/{wallet_address}")
async def get_token_balance(chain_id: int, token_address: str, wallet_address: str):
    """
    Fetch balance for a specific token.
    Use '0x0000000000000000000000000000000000000000' for native token.
    """
    try:
        if not Web3.is_address(wallet_address):
            raise HTTPException(status_code=400, detail="Invalid wallet address")
        
        wallet_checksum = Web3.to_checksum_address(wallet_address)
        w3 = await get_web3_instance(chain_id)
        
        # Check if native token
        if token_address.lower() == "0x0000000000000000000000000000000000000000":
            balance = w3.eth.get_balance(wallet_checksum)
            return {
                "success": True,
                "balance": str(balance),
                "is_native": True
            }
        
        # ERC20 token
        token_checksum = Web3.to_checksum_address(token_address)
        token_contract = w3.eth.contract(
            address=token_checksum,
            abi=ERC20_BALANCE_ABI
        )
        
        balance = token_contract.functions.balanceOf(wallet_checksum).call()
        decimals = token_contract.functions.decimals().call()
        symbol = token_contract.functions.symbol().call()
        
        return {
            "success": True,
            "balance": str(balance),
            "decimals": decimals,
            "symbol": symbol,
            "is_native": False
        }
        
    except Exception as e:
        print(f"Error fetching token balance: {e}")
        raise HTTPException(status_code=500, detail=str(e))
def get_token_addresses_for_chain(chain_id: int) -> List[str]:
    """
    Return list of token addresses to check for each chain.
    These should match your NETWORK_TOKENS config in the frontend.
    """
    token_map = {
        42220: [  # Celo
            "0x765DE816845861e75A25fCA122bb6898B8B1282a",  # cUSD
            "0x48065fbBE25f71C9282ddf5e1cD6D6A887483D5e",  # USDT
            "0xD8763CBa276a3738E6DE85b4b3bF5FDed6D6cA73",  # cEUR
            "0xcebA9300f2b948710d2653dD7B07f33A8B32118C",  # USDC
            "0x639A647fbe20b6c8ac19E48E2de44ea792c62c5C",  # cREAL
            "0xE2702Bd97ee33c88c8f6f92DA3B733608aa76F71",  # cNGN
            "0x32A9FE697a32135BFd313a6Ac28792DaE4D9979d",  # cKES
            "0x4f604735c1cf31399c6e711d5962b2b3e0225ad3",  # USDGLO
            "0x62b8b11039fcfe5ab0c56e502b1c372a3d2a9c7a",  # G$
        ],
        1135: [  # Lisk
            "0xac485391EB2d7D88253a7F1eF18C37f4242D1A24",  # LSK
            "0x05D032ac25d322df992303dCa074EE7392C117b9",  # USDT
            "0xF242275d3a6527d877f2c927a82D9b057609cc71",  # USDC.e
        ],
        42161: [  # Arbitrum
            "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",  # USDC
            "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9",  # USDT
            "0x912CE59144191C1204E64559FE8253a0e49E6548",  # ARB
        ],
        8453: [  # Base
            "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",  # USDC
            "0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2",  # USDT
            "0x4ed4E862860beD51a9570b96d89aF5E1B0Efefed",  # DEGEN
        ],
         56: [  # BSC (Binance Smart Chain)
       "0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d",  # USDC
       "0x55d398326f99059fF775485246999027B3197955",  # USDT
       "0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56",  # BUSD
   ]
    }
    
    return token_map.get(chain_id, [])


@router.post("/api/wallet/send-transaction")
async def send_wallet_transaction(
    wallet_address: str,
    to_address: str,
    amount: str,
    chain_id: int,
    token_address: str = None
):
    """
    Send a transaction from the embedded wallet.
    Note: This endpoint should be called from the frontend with Privy's sendTransaction.
    The backend can verify and log the transaction.
    """
    try:
        if not Web3.is_address(wallet_address) or not Web3.is_address(to_address):
            raise HTTPException(status_code=400, detail="Invalid address")
        
        # Log the transaction attempt
        print(f"Transaction request: {wallet_address} -> {to_address}, amount: {amount}")
        
        # In production, you might want to:
        # 1. Verify the user owns the wallet
        # 2. Check balance before attempting
        # 3. Log the transaction to your database
        # 4. Implement rate limiting
        
        return {
            "success": True,
            "message": "Transaction should be sent via Privy SDK on frontend",
            "details": {
                "from": wallet_address,
                "to": to_address,
                "amount": amount,
                "token": token_address or "native"
            }
        }
        
    except Exception as e:
        print(f"Transaction error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
# Optional: Price fetching endpoint


@router.get("/api/wallet/token-prices")
async def get_token_prices(symbols: str):
    """
    Fetch USD prices for tokens.
    symbols: comma-separated list like "CELO,cUSD,USDT"
    
    In production, integrate with CoinGecko, CoinMarketCap, or similar API
    """
    try:
        symbol_list = symbols.split(",")
        
        # TODO: Integrate with real price API
        # Example: CoinGecko API
        # https://api.coingecko.com/api/v3/simple/price?ids=celo,usd-coin&vs_currencies=usd
        
        prices = {}
        for symbol in symbol_list:
            prices[symbol] = "1.00"  # Mock price
        
        return {
            "success": True,
            "prices": prices,
            "timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
# Helper function to get Web3 instance (add this if not present)
async def get_web3_instance(chain_id: int):
    """
    Get Web3 instance for the specified chain.
    Add your RPC endpoints here.
    """
    rpc_urls = {
        42220: "https://forno.celo.org",  # Celo
        1135: "https://rpc.api.lisk.com",  # Lisk
        42161: "https://arb1.arbitrum.io/rpc",  # Arbitrum
        8453: "https://mainnet.base.org",  # Base
        56: "https://bsc-dataseed1.binance.org",
    }
    
    rpc_url = rpc_urls.get(chain_id)
    if not rpc_url:
        raise HTTPException(status_code=400, detail=f"Unsupported chain ID: {chain_id}")
    
    return Web3(Web3.HTTPProvider(rpc_url))
