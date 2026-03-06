"""
models.py — All Pydantic request/response models and enums.
No internal imports — only pydantic and stdlib.
"""
from __future__ import annotations
from pydantic import BaseModel, Field, ConfigDict
from typing import Dict, List, Optional, Any, Union, Literal
from datetime import datetime, date
from enum import Enum


class StagePassRequirements(BaseModel):
    Beginner: int = 0
    Intermediate: int = 0
    Advance: int = 0
    Legend: int = 0
    Ultimate: int = 0
# Request model for availability check
class AvailabilityCheck(BaseModel):
    field: str              # e.g., "username", "email", "twitter_handle"
    value: str              # e.g., "Jerydam", "test@gmail.com"
    current_wallet: str     # The wallet address of the user editing the profile
class DeleteFaucetRequest(BaseModel):
    faucetAddress: str
    userAddress: str # The initiator of the deletion
    chainId: int
class QuestTask(BaseModel):
    id: str
    title: str
    description: Optional[str] = None
    points: Union[int, str]
    required: bool
    category: str
    url: Optional[str] = None
    action: Optional[str] = None
    verificationType: str
    targetPlatform: Optional[str] = None
    stage: str
    targetServerId: Optional[str] = None
    targetHandle: Optional[str] = None
    targetContractAddress: Optional[str] = None
    minAmount: Optional[str] = None
    minTxCount: Optional[str] = None
    minDays: Optional[str] = None
    targetChainId: Optional[str] = None
    isSystem: Optional[bool] = False
    startDate: Optional[str] = None
    endDate: Optional[str] = None
    model_config = ConfigDict(extra='allow', populate_by_name=True)
class QuestDraft(BaseModel):
    creatorAddress: str
    title: str
    description: Optional[str] = ""
    imageUrl: Optional[str] = ""
    rewardPool: str
    rewardTokenType: str
    tokenAddress: Optional[str] = None
    tokenSymbol: Optional[str] = None          # camelCase from frontend
    token_symbol: Optional[str] = None         # snake_case from frontend
    distributionConfig: Optional[Dict[str, Any]] = None
    faucetAddress: Optional[str] = None
    tasks: Optional[List[Dict[str, Any]]] = None
    model_config = ConfigDict(
        populate_by_name=True,
        from_attributes=True
    )
    def get_token_symbol(self) -> Optional[str]:
        """Returns whichever symbol field was populated."""
        return self.token_symbol or self.tokenSymbol
class BotVerifyRequest(BaseModel):
    submissionId: str
    faucetAddress: str
    walletAddress: str
    handle: str
    proofUrl: str
    taskType: str
import os
import asyncio
class QuestFinalize(BaseModel):
    faucetAddress: str 
    draftId: Optional[str] = None
    
    creatorAddress: Optional[str] = None
    title: Optional[str] = None
    description: Optional[str] = None
    imageUrl: Optional[str] = None
    
    startDate: str
    endDate: str
    claimWindowHours: int
    tasks: List[Union[dict, QuestTask]] 
    
    stagePassRequirements: Union[dict, StagePassRequirements] 
    enforceStageRules: bool = False
    chainId: int
    rewardPool: Optional[str] = None
    rewardTokenType: Optional[str] = None
    tokenAddress: Optional[str] = None
    tokenSymbol: Optional[str] = None
    distributionConfig: Optional[Dict[str, Any]] = None
class Quest(BaseModel):
    creatorAddress: str
    title: str
    description: str
    isActive: bool = True
    rewardPool: str
    startDate: str
    endDate: str
    imageUrl: str # New field
    faucetAddress: str
    rewardTokenType: str
    tokenAddress: str
    tasks: List[QuestTask]
    stagePassRequirements: StagePassRequirements # New field
# --- Pydantic Model (No changes needed here) ---
class RegisterFaucetRequest(BaseModel):
    faucetAddress: str
    ownerAddress: str
    chainId: int
    faucetType: str
    name: str
class ImageUploadResponse(BaseModel):
    success: bool
    imageUrl: str
    message: str
class FinalizeRewardsRequest(BaseModel):
    adminAddress: str
    faucetAddress: str
    chainId: int
    winners: List[str]
    amounts: List[int]
# In your FastAPI project's 'schemas.py'
from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import date
# Locate this definition in your main.py (~ Line 433)
class QuestOverview(BaseModel):
    # Matches the TypeScript interface QuestOverview
    # ADDED Field(alias="snake_case_key") for all snake_case inputs
    faucetAddress: str = Field(alias="faucet_address")
    title: str = Field(alias="title")
    description: Optional[str] = Field(alias="description")
    isActive: bool = Field(alias="is_active")
    rewardPool: str = Field(alias="reward_pool")
    creatorAddress: str = Field(alias="creator_address")
    startDate: date = Field(alias="start_date") # Use date type for date fields
    endDate: date = Field(alias="end_date")
    # These fields are computed/fetched separately
    tasksCount: int = Field(alias="tasksCount") # Computed, keep simple alias
    participantsCount: int = Field(alias="participantsCount") # Computed, keep simple alias
   
    model_config = ConfigDict(
        from_attributes=True,
        populate_by_name=True
    )
class QuizOption(BaseModel):
    id: str
    text: str
class QuizQuestion(BaseModel):
    question: str
    options: List[QuizOption]
    correctId: str
    timeLimit: int = 30
class RewardDistributionRow(BaseModel):
    rank: int
    pct: float
    amount: float
class RewardConfig(BaseModel):
    poolAmount: float = 0
    tokenAddress: str = ""
    tokenSymbol: str = ""
    tokenDecimals: int = 18
    tokenLogoUrl: Optional[str] = None
    chainId: int = 0
    totalWinners: int = 3
    distributionType: str = "equal"
    distribution: List[RewardDistributionRow] = []
    poolUsdValue: Optional[float] = None
class CreateQuizRequest(BaseModel):
    title: str
    description: str
    questions: List[QuizQuestion]
    timePerQuestion: int = 30
    maxParticipants: int = 0
    startTime: Optional[str] = None
    creatorAddress: str
    creatorUsername: str = ""
    coverImageUrl: Optional[str] = None
    chainId: int = 0
    reward: Optional[RewardConfig] = None
    faucetAddress: Optional[str] = None   # \u2190 ADD: deployed quiz contract address
class GenerateQuizRequest(BaseModel):
    topic: str
    numQuestions: int = 10
    difficulty: str = "medium"
    timePerQuestion: int = 30
    creatorAddress: str
    title: Optional[str] = None
    chainId: int = 0
    reward: Optional[RewardConfig] = None
    faucetAddress: Optional[str] = None   # \u2190 ADD
class JoinQuizRequest(BaseModel):
    walletAddress: str
    username: str
    avatarUrl: Optional[str] = None
class QuestTaskEdit(BaseModel):
    """A single task being created or updated."""
    id: str
    title: str
    description: Optional[str] = ""
    points: Union[int, str]
    required: bool = True
    category: str
    url: Optional[str] = ""
    action: Optional[str] = ""
    verificationType: str
    targetPlatform: Optional[str] = None
    stage: str
    targetHandle: Optional[str] = None
    targetContractAddress: Optional[str] = None
    minAmount: Optional[str] = None
    minTxCount: Optional[str] = None
    minDays: Optional[str] = None
    targetChainId: Optional[str] = None
    isSystem: Optional[bool] = False
    targetServerId: Optional[str] = None
    startDate: Optional[str] = None
    endDate: Optional[str] = None
    model_config = ConfigDict(extra='allow', populate_by_name=True)
class QuestMetaUpdate(BaseModel):
    """
    Patch payload for quest metadata.
    Only title and imageUrl are editable post-deploy.
    Reward pool and token details are intentionally excluded.
    """
    adminAddress: str
    title: Optional[str] = None
    imageUrl: Optional[str] = None
    distributionConfig: Optional[Dict[str, Any]] = None  # <--- ADD THIS
    rewardPool: Optional[str] = None                     # <--- ADD THIS
class QuestTasksUpdate(BaseModel):
    """
    Replace the non-system tasks for a quest.
    System tasks (isSystem=True or id starts with 'sys_') are
    preserved automatically \u2014 never overwritten.
    """
    adminAddress: str
    tasks: List[QuestTaskEdit]
class JoinQuestRequest(BaseModel):
    walletAddress: str
    referralCode: Optional[str] = None # Optional code from the person who invited them
class CheckInRequest(BaseModel):
    walletAddress: str
# Droplist-specific models (kept for compatibility)
class DroplistTask(BaseModel):
    title: str
    description: str
    url: str
    required: bool = True
    platform: Optional[str] = None
    handle: Optional[str] = None
    action: Optional[str] = "follow"
    points: int = 100
    category: str = "social"
class SyncProfileRequest(BaseModel):
    wallet_address: str
    username: str
    avatar_url: Optional[str] = ""
    email: Optional[str] = ""
class UserProfileUpdate(BaseModel):
    wallet_address: str
    username: str
    email: Optional[str] = None
    bio: Optional[str] = None
    
    # Handles
    twitter_handle: Optional[str] = None
    discord_handle: Optional[str] = None
    telegram_handle: Optional[str] = None  
    farcaster_handle: Optional[str] = None 
    
    # IDs
    telegram_user_id: Optional[str] = None
    twitter_id: Optional[str] = None     # <--- ADD THIS
    discord_id: Optional[str] = None     # <--- ADD THIS
    farcaster_id: Optional[str] = None   # <--- ADD THIS
    
    avatar_url: Optional[str] = None
    
    # Security fields
    signature: str 
    message: str 
    nonce: str
class LinkedWalletRequest(BaseModel):
    main_wallet: str
    secondary_wallet: str
    signature: str # Signed by the secondary wallet
    message: str
class DroplistConfig(BaseModel):
    isActive: bool
    title: str
    description: str
    requirementThreshold: int = 5
    maxParticipants: Optional[int] = None
    endDate: Optional[str] = None
class DroplistConfigRequest(BaseModel):
    userAddress: str
    config: DroplistConfig
    tasks: List[DroplistTask]
class UserProfile(BaseModel):
    walletAddress: str
    xAccounts: List[dict] = []
    completedTasks: List[str] = []
    droplistStatus: str = "pending" # pending, eligible, completed
class TaskVerificationRequest(BaseModel):
    walletAddress: str
    taskId: str
    xAccountId: Optional[str] = None
class CustomXPostTemplate(BaseModel):
    faucetAddress: str
    template: str
    userAddress: str
    chainId: int
# Pydantic Models (keeping existing models)
class ClaimRequest(BaseModel):
    userAddress: str
    faucetAddress: str
    secretCode: str
    shouldWhitelist: bool = True
    chainId: int
    divviReferralData: Optional[str] = None
   
class GenerateNewDropCodeRequest(BaseModel):
    faucetAddress: str
    userAddress: str
    chainId: int
   
class ClaimNoCodeRequest(BaseModel):
    userAddress: str
    faucetAddress: str
    shouldWhitelist: bool = True
    chainId: int
    divviReferralData: Optional[str] = None
class CheckAndTransferUSDTRequest(BaseModel):
    userAddress: str
    chainId: int
    usdtContractAddress: str
    toAddress: str # Transfer destination address
    transferAmount: Optional[str] = None # Amount to transfer (None = transfer all)
    thresholdAmount: str = "1" # Default threshold is 1 USDT
    divviReferralData: Optional[str] = None
class BulkCheckTransferRequest(BaseModel):
    users: List[str] # List of user addresses
    chainId: int
    usdtContractAddress: str
    toAddress: str # Transfer destination address
    transferAmount: Optional[str] = None # Amount to transfer (None = transfer all)
    thresholdAmount: str = "1"
class TransferUSDTRequest(BaseModel):
    toAddress: str
    chainId: int
    usdtContractAddress: str
    transferAll: bool = True # If False, specify amount
    amount: Optional[str] = None # Amount in USDT (e.g., "1.5")
class ClaimCustomRequest(BaseModel):
    userAddress: str
    faucetAddress: str
    chainId: int
    divviReferralData: Optional[str] = None
class ApprovalRequest(BaseModel):
    submissionId: str
    status: str
# Enhanced FaucetTask model
class FaucetTask(BaseModel):
    title: str
    description: str
    url: str
    required: bool = True
    # Enhanced social media specific fields
    platform: Optional[str] = None
    handle: Optional[str] = None
    action: Optional[str] = None
class SetClaimParametersRequest(BaseModel):
    faucetAddress: str
    claimAmount: int
    startTime: int
    endTime: int
    chainId: int
    tasks: Optional[List[FaucetTask]] = None
class GetSecretCodeRequest(BaseModel):
    faucetAddress: str
class SubmissionUpdate(BaseModel):
    status: str  # 'approved' or 'rejected'
class AdminPopupPreferenceRequest(BaseModel):
    userAddress: str
    faucetAddress: str
    dontShowAgain: bool
class GetAdminPopupPreferenceRequest(BaseModel):
    userAddress: str
    faucetAddress: str
class GetSecretCodeForAdminRequest(BaseModel):
    faucetAddress: str
    userAddress: str
    chainId: int
class AddTasksRequest(BaseModel):
    faucetAddress: str
    tasks: List[FaucetTask]
    userAddress: str
    chainId: int
class GetTasksRequest(BaseModel):
    faucetAddress: str
class SocialMediaLink(BaseModel):
    platform: str
    url: str
    handle: str
    action: str
class ImageUploadResponse(BaseModel):
    success: bool
    imageUrl: str
    message: str
class FaucetMetadata(BaseModel):
    faucetAddress: str
    description: str
    imageUrl: Optional[str] = None
    createdBy: str
    chainId: int
class QuestUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    rewardPool: Optional[str] = None
    imageUrl: Optional[str] = None
    isActive: Optional[bool] = None
# CHAIN CONFIGURATION
class Chain(str, Enum):
    ethereum = "ethereum"
    base     = "base"
    arbitrum = "arbitrum"
    celo     = "celo"
    lisk     = "lisk"
    bnb      = "bnb"

class VerificationRule(BaseModel):
    type: Literal[
        "hold_balance", "hold_nft", "tx_count", "wallet_age_days",
        "interact_contract", "swap_on_dex", "add_liquidity",
        "claim_rewards", "provide_liquidity_duration"
    ]
    contract_address: Optional[str] = Field(None, description="Token/NFT/DEX/Staking/Pool CA")
    min_amount: Optional[float] = None
    min_tx_count: Optional[int] = None
    min_days: Optional[int] = Field(30, ge=1)
    min_duration_hours: Optional[int] = Field(24, ge=1)
    pool_address: Optional[str] = None
class VerificationRequest(BaseModel):
    wallet: str = Field(..., pattern=r"^0x[a-fA-F0-9]{40}$")
    chain: Chain
    rules: List[VerificationRule]
class VerificationResult(BaseModel):
    passed: bool
    details: str
    proof: Optional[Dict[str, Any]] = None
class BatchVerificationResponse(BaseModel):
    wallet: str
    chain: Chain
    results: Dict[str, VerificationResult]
import aiohttp
# \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
# Shared ABIs
# \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
ERC20_ABI = [{"constant":True,"inputs":[{"name":"_owner","type":"address"}],"name":"balanceOf","outputs":[{"name":"","type":"uint256"}],"type":"function"}]
ERC721_ABI = [{"constant":True,"inputs":[{"name":"owner","type":"address"}],"name":"balanceOf","outputs":[{"name":"","type":"uint256"}],"type":"function"}]
class OnchainVerifyRequest(BaseModel):
    submissionId: str
    taskId: str
    faucetAddress: str
    mainWallet: str
    targetAddress: str  
    chainId: int 

class VerifyMessageCountRequest(BaseModel):
    wallet_address: str
    chat_id: str
    required_count: int

class XVerifyRequest(BaseModel):
    walletAddress: str
    taskId: str
    submittedHandle: str

class QuizQuestion(BaseModel):
    question: str
    options: List[Dict[str, str]]
    correctId: str
    timeLimit: Optional[int] = 30

class CreateQuizRequest(BaseModel):
    title: str
    description: Optional[str] = ""
    questions: List[QuizQuestion]
    timePerQuestion: int = 30
    maxParticipants: Optional[int] = None
    startTime: Optional[str] = None
    creatorAddress: str
    creatorUsername: Optional[str] = ""
    coverImageUrl: Optional[str] = ""

class GenerateQuizRequest(BaseModel):
    topic: str
    numQuestions: int = 5
    difficulty: str = "medium"
    timePerQuestion: int = 30

class JoinQuizRequest(BaseModel):
    walletAddress: str
    username: Optional[str] = ""

class XShareVerifyRequest(BaseModel):
    walletAddress: str
    taskId: str
    proofUrl: str
    requiredTag: str

class XQuoteVerifyRequest(BaseModel):
    walletAddress: str
    taskId: str
    proofUrl: str
    requiredTag: Optional[str] = None
    originalTweetUrl: Optional[str] = None

class TelegramVerifyRequest(BaseModel):
    walletAddress: str
    faucetAddress: str
    submissionId: str
    taskId: Optional[str] = None
    chatId: Optional[str] = None
