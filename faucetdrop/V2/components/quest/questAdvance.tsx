"use client"

import React, { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import {
  Clock, Trash2, Loader2, Rocket,
  Plus, Zap, Lock, Unlock, Trophy, Settings,
  LayoutList, GripVertical, Percent, ShieldAlert, CalendarClock, Users, AlertTriangle,
  Link as LinkIcon, Code, CalendarDays, CheckCircle2, MessageSquareText,
  ShieldCheck,
  XIcon,
  Send
} from "lucide-react"
import { useWallet } from "@/hooks/use-wallet"
import { BrowserProvider, ZeroAddress } from 'ethers'
import { createQuestReward, type Network } from "@/lib/faucet"
import { toast } from 'sonner'

const API_BASE_URL = "https://fauctdrop-backend.onrender.com"
const BACKEND_WALLET_ADDRESS = "0x9fBC2A0de6e5C5Fd96e8D11541608f5F328C0785"

// =========================================================
// TYPES & CONSTANTS
// =========================================================

export type TaskStage = 'Beginner' | 'Intermediate' | 'Advance' | 'Legend' | 'Ultimate'
export const TASK_STAGES: TaskStage[] = ['Beginner', 'Intermediate', 'Advance', 'Legend', 'Ultimate']

const FIXED_PASS_RATIO = 0.7
const STAGE_TASK_REQUIREMENTS: Record<TaskStage, { min: number; max: number }> = {
  Beginner: { min: 2, max: 10 },
  Intermediate: { min: 3, max: 8 },
  Advance: { min: 2, max: 6 },
  Legend: { min: 2, max: 5 },
  Ultimate: { min: 1, max: 3 },
}

// 1. Updated Verification Type to include 'onchain'
export type VerificationType = 
  | 'auto_social' 
  | 'auto_tx' 
  | 'onchain' // New backend engine type
  | 'manual_link' 
  | 'manual_upload' 
  | 'system_referral' 
  | 'system_daily' 
  | 'none' 
  | 'system_x_share'

export type SocialPlatform = 'Twitter' | 'Facebook' | 'Tiktok' | 'Youtube' | 'Discord' | 'Thread' | 'Linkedin' | 'Farcaster' | 'Instagram' | 'Website' | 'Telegram'
const SOCIAL_PLATFORMS: SocialPlatform[] = ['Twitter', 'Facebook', 'Telegram','Tiktok', 'Youtube', 'Discord', 'Thread', 'Linkedin', 'Farcaster', 'Instagram', 'Website']
const SOCIAL_ACTIONS = ['follow', 'like & retweet', 'join', 'subscribe', 'visit', 'comment', 'quote']
const getAvailableActions = (platform: string) => {
  switch (platform) {
    case 'Twitter': return ['follow', 'like & retweet', 'quote', 'comment'];
    case 'Discord': return ['join', 'role']; // Added 'role'
    case 'Telegram': return ['join', 'message_count']; // Added 'message_count'
    case 'Youtube': return ['subscribe', 'watch'];
    case 'Website': return ['visit'];
    default: return ['follow', 'join', 'visit', 'like'];
  }
}
// 2. New Onchain Actions Definition for Dropdown
const ONCHAIN_ACTIONS = [
  { value: 'hold_token', label: 'Hold Token Balance' },
  { value: 'hold_nft', label: 'Hold NFT' },
  { value: 'wallet_age', label: 'Wallet Age Check' },
  { value: 'tx_count', label: 'Transaction Count Check' }
]

export interface QuestTask {
  id: string
  title: string
  description: string
  points: number | string
  required: boolean
  category: 'social' | 'trading' | 'swap' | 'referral' | 'content' | 'general'
  url: string
  action: string
  // Onchain specific fields
  minTxCount?: number | string
  minDays?: number | string
  minDurationHours?: number | string
  minAmount?: number | string
  targetContractAddress?: string
  
  verificationType: VerificationType
  targetPlatform?: string
  targetHandle?: string
  targetChainId?: string
  stage: TaskStage
  minReferrals?: number | string
  isSystem?: boolean
  isRecurring?: boolean
  recurrenceInterval?: number
}

export interface StagePassRequirements {
  Beginner: number
  Intermediate: number
  Advance: number
  Legend: number
  Ultimate: number
}

const networks: Network[] = [
  {
    name: "Celo", symbol: "CELO", chainId: BigInt(42220), rpcUrl: "https://forno.celo.org", blockExplorer: "https://celoscan.io", color: "#35D07F", logoUrl: "/celo.png", iconUrl: "/celo.png",
    factoryAddresses: ["0x17cFed7fEce35a9A71D60Fbb5CA52237103A21FB", "0x8cA5975Ded3B2f93E188c05dD6eb16d89b14aeA5"],
    factories: { quest: "0xdC9b027B6453560ce8C4390E0B609b343a8eBd62" }, tokenAddress: "0x471EcE3750Da237f93B8E339c536989b8978a438", nativeCurrency: { name: "Celo", symbol: "CELO", decimals: 18 }, isTestnet: false,
  },
  {
    name: "Lisk", symbol: "LSK", chainId: BigInt(1135), rpcUrl: "https://rpc.api.lisk.com", blockExplorer: "https://blockscout.lisk.com", explorerUrl: "https://blockscout.lisk.com", color: "#0D4477", logoUrl: "/lsk.png", iconUrl: "/lsk.png",
    factoryAddresses: ["0x21E855A5f0E6cF8d0CfE8780eb18e818950dafb7"],
    factories: { quest: "0x21E855A5f0E6cF8d0CfE8780eb18e818950dafb7" }, tokenAddress: ZeroAddress, nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 }, isTestnet: false,
  },
  {
    name: "Arbitrum", symbol: "ARB", chainId: BigInt(42161), rpcUrl: "https://arb1.arbitrum.io/rpc", blockExplorer: "https://arbiscan.io", explorerUrl: "https://arbiscan.io", color: "#28A0F0", logoUrl: "/arb.jpeg", iconUrl: "/arb.jpeg",
    factoryAddresses: ["0x9D6f441b31FBa22700bb3217229eb89b13FB49de"],
    factories: { quest: "0x9D6f441b31FBa22700bb3217229eb89b13FB49de" }, tokenAddress: ZeroAddress, nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 }, isTestnet: false,
  },
  {
    name: "Base", symbol: "BASE", chainId: BigInt(8453), rpcUrl: "https://base.publicnode.com", blockExplorer: "https://basescan.org", explorerUrl: "https://basescan.org", color: "#0052FF", logoUrl: "/base.png", iconUrl: "/base.png",
    factoryAddresses: ["0x587b840140321DD8002111282748acAdaa8fA206"],
    factories: { quest: "0x587b840140321DD8002111282748acAdaa8fA206" }, tokenAddress: ZeroAddress, nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 }, isTestnet: false,
  },
    {
    name: "Bnb", symbol: "BNB", chainId: BigInt(56), rpcUrl: "https://binance.llamarpc.com", blockExplorer: "https://bscscan.com", explorerUrl: "https://bscscan.com", color: "#F3BA2F", 
    logoUrl: "/bnb.svg", iconUrl: "/bnb.svg", factoryAddresses: [""], factories: { quest: "" },    tokenAddress: ZeroAddress, nativeCurrency: { name: "BNB", symbol: "BNB", decimals: 18 },  isTestnet: false,
},
{
    name: "Avalanche", symbol: "AVAX", chainId: BigInt(43114), rpcUrl: "https://api.avax.network/ext/bc/C/rpc", blockExplorer: "https://snowtrace.io", explorerUrl: "https://snowtrace.io", color: "#E84142",
    logoUrl: "/avax.svg", iconUrl: "/avax.svg", factoryAddresses: [""], factories: { quest: "" },    tokenAddress: ZeroAddress, nativeCurrency: { name: "AVAX", symbol: "AVAX", decimals: 18 },  isTestnet: false,
}

]

const SYSTEM_TASKS: QuestTask[] = [
  {
    id: 'sys_referral',
    title: 'Refer Friends',
    description: 'Share your unique referral link to earn points.',
    points: 10,
    required: false,
    category: 'referral',
    url: '',
    action: 'refer',
    verificationType: 'system_referral',
    stage: 'Beginner',
    isSystem: true,
    minReferrals: 1
  },
  {
    id: 'sys_daily',
    title: 'Daily Check-in',
    description: 'Return every 24 hours to claim free points.',
    points: 10,
    required: false,
    category: 'general',
    url: '',
    action: 'checkin',
    verificationType: 'system_daily',
    stage: 'Beginner',
    isSystem: true,
    isRecurring: true,
    recurrenceInterval: 24
  }
]

// 3. Updated Suggested Tasks (including Onchain examples)
const SUGGESTED_TASKS_BY_STAGE: Record<TaskStage, Array<Partial<QuestTask>>> = {
  Beginner: [
    {
      title: "Visit Project Homepage",
      description: "Check out our official website to learn more about the project.",
      category: "social",
      action: "visit",
      targetPlatform: "Website",
      points: 30,
      verificationType: "none",
    },
    {
      title: "Follow us on X (Twitter)",
      description: "Follow our official X account for updates and announcements.",
      category: "social",
      action: "follow",
      targetPlatform: "Twitter",
      points: 50,
      verificationType: "auto_social",
    },
    {
      title: "Quote Quest on X",
      description: "Quote our post tweet and tag {@handle} to earn points.",
      category: "social",
      action: "quote",
      targetPlatform: "Twitter",
      points: 20,
      verificationType: "auto_social",
    },
     {
      title: "Like & Retweet on X",
      description: "Like & Retweet our post on X.",
      category: "social",
      action: "like & retweet",
      targetPlatform: "Twitter",
      points: 20,
      verificationType: "auto_social",
    },
    {
      title: "Join our Discord Server",
      description: "Become part of the community on Discord.",
      category: "social",
      action: "join",
      targetPlatform: "Discord",
      points: 50,
      verificationType: "auto_social",
    },
    {
      title: "Join Telegram Group",
      description: "Join our Telegram channel for real-time updates.",
      category: "social",
      action: "join",
      targetPlatform: "Telegram",
      points: 40,
      verificationType: "manual_upload",
    },
    {
      title: "Watch Intro Video",
      description: "Watch our short introduction video (2–3 minutes).",
      category: "content",
      action: "watch",
      points: 30,
      verificationType: "none",
    },
  ],

  Intermediate: [
    {
      title: "Follow us on Instagram",
      description: "Follow our Instagram for visuals and community highlights.",
      category: "social",
      action: "follow",
      targetPlatform: "Instagram",
      points: 40,
      verificationType: "manual_upload",
    },
    { 
      title: "Attain 'Verified' Discord Role", 
      description: "Get the Verified role in our server.", 
      category: "social", 
      action: "role", 
      targetPlatform: "Discord", 
      points: 80, 
      verificationType: "auto_social", 
      targetHandle: "1234567890" 
    },
    {
       title: "Send 2 Messages in Telegram", 
       description: "Be active and send 2 messages in the main chat.", 
       category: "social", 
       action: "message_count", 
       targetPlatform: "Telegram", 
       points: 60, 
       verificationType: "auto_social", 
       minTxCount: 2 
      },
    {
      title: "Subscribe to YouTube Channel",
      description: "Subscribe to our YouTube channel and turn on notifications.",
      category: "social",
      action: "subscribe",
      targetPlatform: "Youtube",
      points: 60,
      verificationType: "manual_upload",
    },
    {
      title: "Hold at least 0.01 ETH / native token",
      description: "Hold a small amount of the chain's native token in your wallet.",
      category: "trading",
      action: "hold_token", // Mapped to Onchain Action
      points: 80,
      verificationType: "onchain", // Mapped to Onchain Type
      minAmount: "0.01",
      targetChainId: "any",
    },
    {
      title: "Make 1 Swap on DEX",
      description: "Execute at least one swap on a decentralized exchange.",
      category: "swap",
      action: "swap",
      points: 120,
      verificationType: "manual_link",
    },
    {
      title: "Bridge at least 0.005 ETH",
      description: "Use a bridge to move at least 0.005 ETH/native across chains.",
      category: "trading",
      action: "bridge",
      points: 150,
      verificationType: "manual_link",
      minAmount: "0.005",
    },
  ],

  Advance: [
    {
      title: "Provide Liquidity ($50+ value)",
      description: "Add liquidity to any pool with at least $50 equivalent value.",
      category: "trading",
      action: "add_liquidity",
      points: 250,
      verificationType: "manual_link",
      minAmount: "50",
    },
    {
      title: "Stake Tokens in a Pool",
      description: "Stake any amount of tokens in an official staking contract.",
      category: "trading",
      action: "stake",
      points: 300,
      verificationType: "manual_link",
    },
    {
      title: "Hold an NFT from our Collection",
      description: "Own at least 1 NFT from the official collection.",
      category: "trading",
      action: "hold_nft", // Mapped to Onchain Action
      points: 200,
      verificationType: "onchain", // Mapped to Onchain Type
      targetContractAddress: "0x...your-nft-collection...",
    },
    {
      title: "Make 3+ On-chain Transactions",
      description: "Complete at least 3 transactions on the target chain.",
      category: "trading",
      action: "tx_count", // Mapped to Onchain Action
      points: 180,
      verificationType: "onchain", // Mapped to Onchain Type
      minTxCount: 3,
    },
  ],

  Legend: [
    {
      title: "Provide Liquidity for 7+ days",
      description: "Add liquidity and maintain position for at least 7 days.",
      category: "trading",
      action: "provide_liquidity_duration",
      points: 500,
      verificationType: "manual_link",
      minDurationHours: 168,
    },
    {
      title: "Cross-chain Bridge (2+ chains)",
      description: "Bridge assets between at least two different chains.",
      category: "trading",
      action: "bridge",
      points: 600,
      verificationType: "manual_link",
    },
    {
      title: "Claim Staking Rewards",
      description: "Claim rewards from any staking pool or farm.",
      category: "trading",
      action: "claim_rewards",
      points: 450,
      verificationType: "manual_link",
    },
    {
      title: "Interact with our Smart Contract",
      description: "Send at least one transaction to our main contract.",
      category: "trading",
      action: "interact_contract",
      points: 350,
      verificationType: "manual_link",
      targetContractAddress: "0x...your-contract...",
    },
  ],

  Ultimate: [
    {
      title: "High Volume Trader ($10,000+ traded)",
      description: "Execute swaps with a cumulative value of $10k or more.",
      category: "swap",
      action: "swap",
      points: 1500,
      verificationType: "manual_link",
      minAmount: "10000",
    },
    {
      title: "Become an Ambassador",
      category: "general",
      action: "apply",
      points: 1000,
      verificationType: "manual_upload",
      description: "Upload proof of Ambassador role assignment.",
    },
    {
      title: "Wallet Age > 90 days + 50+ tx",
      description: "Have an aged wallet with significant on-chain history.",
      category: "trading",
      action: "wallet_age", // Mapped to Onchain Action
      points: 1200,
      verificationType: "onchain", // Mapped to Onchain Type
      minDays: 90,
      minTxCount: 50,
    },
  ],
}


type QuestFormState = {
  title: string;
  description: string;
  imageUrl: string;
  rewardPool: string;
  rewardTokenType?: 'native' | 'erc20';
  tokenAddress?: string;
  distributionConfig: any;
  faucetAddress?: string;
  tasks: QuestTask[];
  startDate?: string;
  startTime?: string;
  endDate?: string;
  endTime?: string;
  claimWindowHours?: string;
  enforceStageRules?: boolean;
};

interface Phase2Props {
  newQuest: any
  setNewQuest: React.Dispatch<React.SetStateAction<any>>
  stagePassRequirements: StagePassRequirements
  setStagePassRequirements: React.Dispatch<React.SetStateAction<StagePassRequirements>>
  stageTotals: Record<TaskStage, number>
  stageTaskCounts: Record<TaskStage, number>
  initialNewTaskForm: Partial<QuestTask>
  validateTask: () => boolean
  handleAddTask: (task: QuestTask) => Promise<void>
  handleUpdateTask: (task: QuestTask) => Promise<void>
  handleRemoveTask: (taskId: string) => Promise<void>
  handleUseSuggestedTask: (suggestedTask: Partial<QuestTask>) => void
  isFinalizing: boolean
  setError: React.Dispatch<React.SetStateAction<string | null>>
}

// =========================================================
// COMPONENT
// =========================================================

export default function Phase2TimingTasksFinalize({
  newQuest,
  setNewQuest,
  stagePassRequirements,
  setStagePassRequirements,
  stageTotals,
  stageTaskCounts,
  initialNewTaskForm,
  handleAddTask,
  handleUpdateTask,
  handleRemoveTask,
  isFinalizing,
  setError,
}: Phase2Props) {
  const { isConnected, chainId, address } = useWallet()
  const router = useRouter()
  const [newTask, setNewTask] = useState<Partial<QuestTask>>(initialNewTaskForm)
  const [editingTask, setEditingTask] = useState<QuestTask | null>(null)
  const [isDeploying, setIsDeploying] = useState(false)
  // Add this state inside your component
const [telegramBotStatus, setTelegramBotStatus] = useState<{
  checking: boolean;
  is_admin: boolean | null;
  bot_username: string;
  message: string;
}>({ checking: false, is_admin: null, bot_username: "", message: "" });


  useEffect(() => {
    setNewTask(initialNewTaskForm)
  }, [initialNewTaskForm])

  // Inject system tasks automatically
  useEffect(() => {
    setNewQuest((prev: any) => {
      const existingIds = new Set(prev.tasks.map((t: QuestTask) => t.id))
      const tasksToAdd = SYSTEM_TASKS.filter(st => !existingIds.has(st.id))
      if (tasksToAdd.length > 0) {
        return {
          ...prev,
          tasks: [...prev.tasks, ...tasksToAdd]
        }
      }
      return prev
    })
  }, [setNewQuest])

  // Auto-calculate 70% pass requirements
  useEffect(() => {
    setStagePassRequirements(prev => {
      const next = { ...prev }
      let hasChanged = false
      TASK_STAGES.forEach(stage => {
        const total = stageTotals[stage] || 0
        const required = total > 0 ? Math.floor(total * FIXED_PASS_RATIO) : 0
        if (next[stage] !== required) {
          next[stage] = required
          hasChanged = true
        }
      })
      return hasChanged ? next : prev
    })
  }, [stageTotals, setStagePassRequirements])

  const enforceRules = newQuest.enforceStageRules ?? false

  // =========================================================
  // LOGIC HELPERS
  // =========================================================
  // Auto-appends https:// if missing and removes trailing slashes
const normalizeUrl = (url: string): string => {
  if (!url) return ""
  let cleanUrl = url.trim()
  if (!/^https?:\/\//i.test(cleanUrl)) {
    cleanUrl = `https://${cleanUrl}`
  }
  return cleanUrl.replace(/\/+$/, "")
}

// Extracts the username from common social URLs
const extractHandleFromUrl = (url: string): string | null => {
  const twitterMatch = url.match(/(?:x\.com|twitter\.com)\/([a-zA-Z0-9_]{1,15})/i)
  if (twitterMatch) return twitterMatch[1]

  const telegramMatch = url.match(/(?:t\.me|telegram\.me)\/([a-zA-Z0-9_]+)/i)
  if (telegramMatch) return telegramMatch[1]

  const instagramMatch = url.match(/instagram\.com\/([a-zA-Z0-9._]+)/i)
  if (instagramMatch) return instagramMatch[1]

  return null
}
  // 1. Is this task using the Onchain Engine?
  const isOnchainVerification = newTask.verificationType === 'onchain'
  
  // 2. Is this a Social Template (API verified)?
  const isSocialTemplate = newTask.category === 'social'
  
  const availableCategories = ['social', 'trading', 'swap', 'referral', 'content', 'general']
  const suggestedTasks = SUGGESTED_TASKS_BY_STAGE[newTask.stage || 'Beginner'] || []
  const generateSocialTaskTitle = (platform: string, action: string): string => {
    if (!platform || !action) return ""
    if (action === 'role') return `Attain Role in ${platform}`
    if (action === 'message_count') return `Send Messages in ${platform}`
    return `${action.charAt(0).toUpperCase() + action.slice(1)} our ${platform}`
  }

  const getSocialInputLabel = () => {
    const platform = newTask.targetPlatform || "" 
    if (['Discord', 'Telegram'].includes(platform)) return "Server/Group Invite Link"
    if (['Youtube', 'Instagram', 'Tiktok', 'Website'].includes(platform)) return "Profile / Content URL"
    return "Target Profile/Post URL"
  }
  const showContractInput = ['hold_token', 'hold_nft'].includes(newTask.action || '')
  const showAmountInput = ['hold_token'].includes(newTask.action || '')
  const showDaysInput = ['wallet_age'].includes(newTask.action || '')
  const showTxCountInput = ['tx_count'].includes(newTask.action || '')

  // Timing Validation
  const timingErrors = useMemo(() => {
    const errors: string[] = []
    const now = new Date()
    if (newQuest.startDate && newQuest.startTime) {
      const start = new Date(`${newQuest.startDate}T${newQuest.startTime}`)
      if (start < now) errors.push("Start time must be in the future.")
    }
    if (newQuest.endDate && newQuest.endTime) {
      const end = new Date(`${newQuest.endDate}T${newQuest.endTime}`)
      if (end <= now) errors.push("End time must be in the future.")
      if (newQuest.startDate && newQuest.startTime) {
        const start = new Date(`${newQuest.startDate}T${newQuest.startTime}`)
        if (end <= start) errors.push("End time must be after start time.")
      }
    } else {
      errors.push("End date and time are required.")
    }
    return errors
  }, [newQuest.startDate, newQuest.startTime, newQuest.endDate, newQuest.endTime])

  const hasUserTask = useMemo(() => newQuest.tasks.some((t: QuestTask) => !t.isSystem), [newQuest.tasks])
  const canFinalize = useMemo(() => timingErrors.length === 0 && hasUserTask && !isDeploying && !isFinalizing, [timingErrors, hasUserTask, isDeploying, isFinalizing])

  // =========================================================
  // HANDLERS
  // =========================================================

  const handleUseSuggestedTaskInternal = (suggestion: Partial<QuestTask>) => {
    let updated = { ...suggestion }

    // Auto-set targetChainId for Onchain tasks
    if (suggestion.verificationType === 'onchain') {
      updated.targetChainId = chainId?.toString() || "8453"
    }

    // Auto-fix URL for Twitter Quotes
    if (suggestion.action === 'quote' && suggestion.targetPlatform === 'Twitter') {
      updated.url = "https://x.com/FaucetDrops"
    }

    setNewTask(prev => ({
      ...prev,
      ...updated,
      stage: updated.stage || prev.stage || 'Beginner',
    }))
  }
  // Add this function
const checkTelegramBotAdmin = async (channelUrl: string) => {
  if (!channelUrl || !channelUrl.includes("t.me")) return;
  
  setTelegramBotStatus(prev => ({ ...prev, checking: true }));
  
  try {
    const res = await fetch(`${API_BASE_URL}/api/bot/check-telegram-admin`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ channelUrl })
    });
    const data = await res.json();
    setTelegramBotStatus({
      checking: false,
      is_admin: data.is_admin,
      bot_username: data.bot_username || "",
      message: data.message || ""
    });
  } catch {
    setTelegramBotStatus({ checking: false, is_admin: false, bot_username: "", message: "Check failed" });
  }
};
 const handleDeployAndFinalize = async () => {
    const now = new Date();
    const startTime = new Date(`${newQuest.startDate}T${newQuest.startTime}`);
    if (startTime < now) {
        toast.error("Start time must be in the future.");
        return;
    }

    setIsDeploying(true);
    setError(null);

    try {
        if (!isConnected) throw new Error("Please connect your wallet first.");

        // 1. Save Draft
        const draftPayload = {
            creatorAddress: address,
            title: newQuest.title.trim(),
            description: newQuest.description,
            imageUrl: newQuest.imageUrl,
            rewardPool: newQuest.rewardPool,
            rewardTokenType: newQuest.rewardTokenType,
            tokenAddress: newQuest.tokenAddress,
            // Ensure tokenSymbol is sent to draft
            tokenSymbol: newQuest.tokenSymbol, 
            distributionConfig: newQuest.distributionConfig,
            faucetAddress: newQuest.faucetAddress,
            tasks: newQuest.tasks
        };

        const draftRes = await fetch(`${API_BASE_URL}/api/quests/draft`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(draftPayload)
        });
        const draftJson = await draftRes.json();
        const activeDraftId = draftJson.faucetAddress || newQuest.faucetAddress;

        // 2. Deploy Contract
        const currentNetwork = networks.find(n => Number(n.chainId) === Number(chainId));
        const targetFactory = currentNetwork?.factories?.quest;
        if (!targetFactory) throw new Error("Quest Factory not found for this network.");

        const hoursInt = parseInt(newQuest.claimWindowHours || "168", 10);
        const nowInSeconds = Math.floor(Date.now() / 1000);
        const questEndTime = nowInSeconds + hoursInt * 3600;

        const provider = new BrowserProvider((window as any).ethereum);
        const deployedAddress = await createQuestReward(
            provider,
            targetFactory,
            newQuest.title.trim(),
            newQuest.tokenAddress,
            questEndTime,
            hoursInt,
            BACKEND_WALLET_ADDRESS
        );

        // 3. Finalize
        // We generate a local slug as fallback, but we will prefer the server-side slug
        const baseSlug = newQuest.title.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
        const localSlug = `${baseSlug}-${deployedAddress.slice(-4).toLowerCase()}`;

        const finalizePayload = {
            faucetAddress: deployedAddress,
            draftId: activeDraftId,
            slug: localSlug,
            creatorAddress: address,
            title: newQuest.title.trim(),
            description: newQuest.description,
            imageUrl: newQuest.imageUrl,
            startDate: newQuest.startDate,
            endDate: newQuest.endDate,
            claimWindowHours: hoursInt,
            tasks: newQuest.tasks,
            stagePassRequirements,
            enforceStageRules: newQuest.enforceStageRules ?? false
        };

        const res = await fetch(`${API_BASE_URL}/api/quests/finalize`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(finalizePayload)
        });

        if (!res.ok) throw new Error("Finalization failed.");
        
        const finalizeResult = await res.json();

        toast.success("Quest published successfully!");
        
        // REDIRECT using the slug from database response
        if (finalizeResult.slug) {
            router.push(`/quest/${finalizeResult.slug}`);
        } else {
            router.push(`/quest/${deployedAddress}`);
        }
    } catch (e: any) {
        console.error("Deployment Error:", e);
        toast.error(e.message || "Deployment failed");
        setIsDeploying(false);
    }
};

  const isStageUnlocked = (targetStage: TaskStage): boolean => {
    if (!enforceRules) return true
    if (editingTask && editingTask.stage === targetStage) return true
    const targetIndex = TASK_STAGES.indexOf(targetStage)
    if (targetIndex === 0) return true
    for (let i = 0; i < targetIndex; i++) {
      const prevStage = TASK_STAGES[i]
      const prevCount = stageTaskCounts[prevStage]
      const minRequired = STAGE_TASK_REQUIREMENTS[prevStage].min
      if (prevCount < minRequired) return false
    }
    return true
  }

  const currentStage = newTask.stage || 'Beginner'
  const currentStageReq = STAGE_TASK_REQUIREMENTS[currentStage]
  const currentStageCount = stageTaskCounts[currentStage]
  const isAtMax = enforceRules && currentStageCount >= currentStageReq.max

  // =========================================================
  // RENDER
  // =========================================================

  return (
    <div className="space-y-10 max-w-7xl mx-auto py-8 px-4">
      
      {/* 1. Timing Configuration */}
      <Card className="border-border/50 shadow-sm bg-card">
        <CardHeader className="pb-4">
          <CardTitle className="text-xl flex items-center gap-2">
            <Clock className="h-5 w-5 text-blue-500" /> Campaign Timing
          </CardTitle>
          <CardDescription>Define start/end times and claim duration.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label>Start Date & Time</Label>
              <div className="flex gap-2">
                <Input type="date" className="bg-background/50" value={newQuest.startDate || ""} onChange={e => setNewQuest((p:any) => ({...p, startDate: e.target.value}))} />
                <Input type="time" className="bg-background/50" value={newQuest.startTime || ""} onChange={e => setNewQuest((p:any) => ({...p, startTime: e.target.value}))} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>End Date & Time</Label>
              <div className="flex gap-2">
                <Input type="date" className="bg-background/50" value={newQuest.endDate || ""} onChange={e => setNewQuest((p:any) => ({...p, endDate: e.target.value}))} />
                <Input type="time" className="bg-background/50" value={newQuest.endTime || ""} onChange={e => setNewQuest((p:any) => ({...p, endTime: e.target.value}))} />
              </div>
            </div>
          </div>
          {timingErrors.length > 0 && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-center gap-2 text-red-600 dark:text-red-400 text-sm">
              <AlertTriangle className="h-4 w-4" />
              <ul>{timingErrors.map((err, i) => <li key={i}>{err}</li>)}</ul>
            </div>
          )}
          <div className="space-y-2">
            <Label className="text-muted-foreground">Claim Window (hours after end)</Label>
            <div className="flex items-center gap-4">
              <Input type="number" className="w-32 bg-background/50" value={newQuest.claimWindowHours || "168"} onChange={e => setNewQuest((p:any) => ({...p, claimWindowHours: e.target.value}))} />
              <span className="text-xs text-muted-foreground">Typically 168 hours (7 days)</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 2. Tasks Management */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* LEFT: Task Form */}
        <div className="lg:col-span-7 space-y-6">
          <Card className="border-border/50 shadow-sm bg-card h-full">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <LayoutList className="h-5 w-5 text-primary" />
                {editingTask ? "Edit Task" : "Add New Task"}
              </CardTitle>
              <CardDescription>Configure task details and validation.</CardDescription>
            </CardHeader>

            <CardContent className="space-y-5">
              {/* Strict Mode */}
              <div className="flex items-start gap-3 p-3 border rounded-lg bg-muted/40">
                <Switch className="mt-1" checked={enforceRules} onCheckedChange={(c) => setNewQuest((p:any) => ({ ...p, enforceStageRules: c }))} />
                <div>
                  <Label className="font-semibold text-sm">Strict Progression Mode</Label>
                  <p className="text-xs text-muted-foreground">Enforces minimum tasks per stage before unlocking next.</p>
                </div>
              </div>

              {/* Stage & Category */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs font-medium uppercase text-muted-foreground">Target Stage</Label>
                  <Select value={newTask.stage || "Beginner"} onValueChange={(v: TaskStage) => setNewTask(p => ({ ...p, stage: v }))} disabled={!!editingTask?.isSystem}>
                    <SelectTrigger className="bg-background"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {TASK_STAGES.map(stage => {
                        const unlocked = isStageUnlocked(stage)
                        return (
                          <SelectItem key={stage} value={stage} disabled={enforceRules && !unlocked}>
                            <div className="flex items-center gap-2">
                              {enforceRules && !unlocked ? <Lock className="h-3 w-3 text-muted-foreground"/> : null}
                              <span>{stage}</span>
                            </div>
                          </SelectItem>
                        )
                      })}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-medium uppercase text-muted-foreground">Category</Label>
                  <Select value={newTask.category} onValueChange={(v:any) => setNewTask(p => ({ ...p, category: v }))} disabled={!!editingTask?.isSystem}>
                    <SelectTrigger className="bg-background"><SelectValue /></SelectTrigger>
                    <SelectContent>{availableCategories.map(c => <SelectItem key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>

              {/* Quick Add */}
              {!editingTask && (
                <div className="space-y-2">
                  <Label className="text-xs font-medium text-muted-foreground flex items-center gap-1"><Zap className="h-3 w-3 text-yellow-500"/> Quick Add</Label>
                  <div className="flex flex-wrap gap-2">
                    {(SUGGESTED_TASKS_BY_STAGE[newTask.stage || 'Beginner'] || []).map((s, i) => (
                      <Button key={i} variant="secondary" size="sm" className="text-xs h-7 bg-muted/50 hover:bg-muted" onClick={() => handleUseSuggestedTaskInternal(s)}>
                        <Plus className="h-3 w-3 mr-1" />{s.title}
                      </Button>
                    ))}
                  </div>
                </div>
              )}

              
              {/* Task Configuration */}
                <div className="space-y-2">
                  <Label className="text-xs font-medium uppercase text-muted-foreground">Task Details</Label>
                  {isSocialTemplate ? (
                    <div className="p-3 border border-blue-500/20 rounded-lg bg-blue-500/10 space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <Label className="text-xs text-blue-400">Platform</Label>
                          <Select value={newTask.targetPlatform} onValueChange={(v:any) => setNewTask(p => ({ ...p, targetPlatform: v, title: generateSocialTaskTitle(v, p.action || '') }))}>
                            <SelectTrigger className="h-8 bg-background border-blue-500/30"><SelectValue /></SelectTrigger>
                            <SelectContent>{SOCIAL_PLATFORMS.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                          </Select>
                        </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-blue-400">Action</Label>
                        <Select value={newTask.action} onValueChange={(v:any) => setNewTask(p => ({ ...p, action: v, title: generateSocialTaskTitle(p.targetPlatform || '', v) }))}>
                          <SelectTrigger className="h-8 bg-background border-blue-500/30"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {getAvailableActions(newTask.targetPlatform || 'Twitter').map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      </div>
                      {/* CHANGED: Removed 'disabled' and added 'onChange' */}
                      <Input 
                        value={newTask.title || ""} 
                        onChange={(e) => setNewTask(p => ({ ...p, title: e.target.value }))}
                        className="h-8 bg-background/50 border-blue-500/30 text-sm font-medium" 
                      />
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <Input className="bg-background" placeholder="Task Title (e.g., Hold 100 USDC)" value={newTask.title || ""} onChange={e => setNewTask(p => ({ ...p, title: e.target.value }))} disabled={!!editingTask?.isSystem} />
                      
                      {/* Onchain Action Selector */}
                      {isOnchainVerification && (
                        <div className="p-3 bg-purple-500/5 border border-purple-500/20 rounded-lg space-y-2">
                          <Label className="text-xs text-purple-600 font-bold flex items-center gap-2"><Zap className="h-3 w-3"/> On-Chain Requirement</Label>
                          <Select value={newTask.action} onValueChange={(v) => setNewTask(p => ({ ...p, action: v }))}>
                            <SelectTrigger className="bg-background border-purple-500/30"><SelectValue placeholder="Select Requirement Type" /></SelectTrigger>
                            <SelectContent>
                              {ONCHAIN_ACTIONS.map(a => <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                    </div>
                  )}
                </div>

              {/* Dynamic Inputs */}
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label className="text-xs font-medium uppercase text-muted-foreground">Points</Label>
                  <Input type="number" className="bg-background" value={newTask.points ?? ""} onChange={e => setNewTask((p:any) => ({ ...p, points: e.target.value }))} disabled={!!editingTask?.isSystem} />
                </div>

                {/* --- FIX START: SOCIAL INPUTS --- */}
                {isSocialTemplate && (
                  <div className="space-y-4">
                    {/* Primary Link Input */}
                    <div className="space-y-2">
                      <Label className="text-xs font-medium uppercase text-muted-foreground flex gap-1 items-center">
                        <LinkIcon className="h-3 w-3"/> {getSocialInputLabel()}
                      </Label>
                      <Input 
                        className="bg-background" 
                        placeholder="https://..."
                        value={newTask.url || ""} 
                        onChange={e => setNewTask((p: any) => ({ ...p, url: e.target.value }))} 
                        onBlur={() => {
                          if (newTask.url && newTask.url.includes('.')) {
                            setNewTask((p: any) => ({ ...p, url: normalizeUrl(p.url) }))
                          }
                        }}
                      />
                    </div>

                    {/* Discord Role ID Field */}
                    {newTask.targetPlatform === 'Discord' && newTask.action === 'role' && (
                       <div className="space-y-2 p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-lg">
                        <Label className="text-xs font-bold text-indigo-500 flex items-center gap-1">
                          <ShieldCheck className="h-3 w-3"/> Required Role ID
                        </Label>
                        <Input 
                          className="bg-background" 
                          placeholder="e.g. 104239849202392"
                          value={newTask.targetHandle || ""} 
                          onChange={e => setNewTask((p: any) => ({ ...p, targetHandle: e.target.value }))} 
                        />
                        <p className="text-[10px] text-muted-foreground">Enable Developer Mode in Discord, right-click the Role in server settings, and select "Copy Role ID".</p>
                      </div>
                    )}

                    {/* Telegram Message Count Field */}
                    {newTask.targetPlatform === 'Telegram' && newTask.action === 'message_count' && (
                       <div className="space-y-2 p-3 bg-sky-500/10 border border-sky-500/20 rounded-lg">
                        <Label className="text-xs font-bold text-sky-600 flex items-center gap-1">
                          <MessageSquareText className="h-3 w-3"/> Required Message Count
                        </Label>
                        <Input 
                          type="number"
                          className="bg-background" 
                          placeholder="e.g. 10"
                          value={newTask.minTxCount || ""} 
                          onChange={e => setNewTask((p: any) => ({ ...p, minTxCount: e.target.value }))} 
                        />
                        <p className="text-[10px] text-muted-foreground">Users must send this many messages in the group to pass.</p>
                      </div>
                    )}

                    {/* Twitter Handle Override / General Handle Input */}
                    {newTask.targetPlatform === 'Twitter' && ['quote', 'comment'].includes(newTask.action || '') && (
                      <div className="space-y-2">
                        <Label className="text-xs font-medium uppercase text-muted-foreground">Target Tag/Handle</Label>
                        <Input 
                          className="bg-background" 
                          placeholder="@FaucetDrops"
                          value={newTask.targetHandle || ""} 
                          onChange={e => setNewTask((p: any) => ({ ...p, targetHandle: e.target.value.replace('@', '') }))} 
                        />
                      </div>
                    )}
                  </div>
                )}
                {/* Show Telegram Bot Admin checker when platform is Telegram */}
                {/* Telegram Bot Checker UI */}
                {newTask.targetPlatform === 'Telegram' && newTask.verificationType === 'auto_social' && (
                  <div className={`mt-3 p-4 rounded-lg border text-sm transition-colors col-span-full ${
                    telegramBotStatus.is_admin === true
                      ? "bg-green-50 border-green-200 text-green-800 dark:bg-green-900/20 dark:border-green-800"
                      : telegramBotStatus.is_admin === false
                      ? "bg-orange-50 border-orange-200 text-orange-800 dark:bg-orange-900/20 dark:border-orange-800"
                      : "bg-sky-50 border-sky-200 text-sky-800 dark:bg-sky-900/20 dark:border-sky-800"
                  }`}>
                    {telegramBotStatus.is_admin === true ? (
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-5 w-5 text-green-600" />
                        <span><strong>✅ Bot is admin.</strong> Auto-verification is fully enabled!</span>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="flex items-start gap-3">
                          {telegramBotStatus.is_admin === false ? (
                            <AlertTriangle className="h-5 w-5 text-orange-600 shrink-0 mt-0.5" />
                          ) : (
                            <ShieldCheck className="h-5 w-5 text-sky-600 shrink-0 mt-0.5" />
                          )}
                          <div>
                            <strong className="block mb-1 text-base">
                              {telegramBotStatus.is_admin === false 
                                ? "Bot is not an admin yet!" 
                                : "Action Required: Add Bot to Telegram"}
                            </strong>
                            To enable auto-verification, you must add our bot to your channel/group as an administrator.
                            <ol className="mt-2 space-y-1 list-decimal list-inside text-xs opacity-90">
                              <li>Open your Telegram channel/group settings</li>
                              <li>Go to <strong>Admins → Add Admin</strong></li>
                              <li>Search for <strong>@{telegramBotStatus.bot_username || "FaucetDropsauth_bot"}</strong></li>
                              <li>Grant it at least "Read Messages" permission</li>
                            </ol>
                            {telegramBotStatus.is_admin === false && (
                              <p className="mt-2 text-xs font-semibold text-orange-600 dark:text-orange-400">
                                Without this, submissions will go to manual review.
                              </p>
                            )}
                          </div>
                        </div>
            
                        {/* Embedded Buttons */}
                        <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-black/5 dark:border-white/10">
                          {/* Opens Telegram deep-link to add the bot directly to a group */}
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="text-xs h-8 bg-white dark:bg-slate-900"
                            onClick={() => window.open(`https://t.me/${telegramBotStatus.bot_username || "FaucetDropsauth_bot"}?startgroup=true`, "_blank")}
                          >
                            <Plus className="h-3 w-3 mr-2" /> Add Bot to Group
                          </Button>
            
                          <Button
                            type="button"
                            size="sm"
                            className={`text-xs h-8 ${
                              telegramBotStatus.is_admin === false 
                                ? "bg-orange-600 hover:bg-orange-700 text-white" 
                                : "bg-sky-600 hover:bg-sky-700 text-white"
                            }`}
                            onClick={() => checkTelegramBotAdmin(newTask.url || "")}
                            disabled={telegramBotStatus.checking || !newTask.url}
                          >
                            {telegramBotStatus.checking ? (
                              <Loader2 className="h-3 w-3 mr-2 animate-spin" />
                            ) : (
                              <Send className="h-3 w-3 mr-2" />
                            )}
                            {telegramBotStatus.is_admin === false ? "Check Status Again" : "Verify Bot Status"}
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Conditional Fields based on Action */}
                {showContractInput && (
                  <div className="space-y-2">
                    <Label className="text-xs font-medium uppercase text-muted-foreground flex gap-1 items-center"><Code className="h-3 w-3"/> Contract Address</Label>
                    <Input className="bg-background font-mono" placeholder="0x... (Empty for Native)" value={newTask.targetContractAddress ?? ""} onChange={e => setNewTask(p => ({ ...p, targetContractAddress: e.target.value }))} />
                  </div>
                )}
                {showAmountInput && (
                  <div className="space-y-2">
                    <Label className="text-xs font-medium uppercase text-muted-foreground">Min Amount</Label>
                    <Input type="number" className="bg-background" placeholder="e.g. 100" value={newTask.minAmount ?? ""} onChange={e => setNewTask(p => ({ ...p, minAmount: e.target.value }))} />
                  </div>
                )}
                {showDaysInput && (
                  <div className="space-y-2">
                    <Label className="text-xs font-medium uppercase text-muted-foreground">Min Wallet Age (Days)</Label>
                    <Input type="number" className="bg-background" placeholder="e.g. 30" value={newTask.minDays ?? ""} onChange={e => setNewTask(p => ({ ...p, minDays: e.target.value }))} />
                  </div>
                )}
                {showTxCountInput && (
                  <div className="space-y-2">
                    <Label className="text-xs font-medium uppercase text-muted-foreground">Min Transactions</Label>
                    <Input type="number" className="bg-background" placeholder="e.g. 50" value={newTask.minTxCount ?? ""} onChange={e => setNewTask(p => ({ ...p, minTxCount: e.target.value }))} />
                  </div>
                )}

                {!isOnchainVerification && !isSocialTemplate && (
                  <div className="space-y-2">
                    <Label className="text-xs font-medium uppercase text-muted-foreground">Reference URL</Label>
                    <Input className="bg-background" placeholder="https://..." value={newTask.url ?? ""} onChange={e => setNewTask(p => ({ ...p, url: e.target.value }))} disabled={!!editingTask?.isSystem} />
                  </div>
                )}
              </div>

              {/* Verification Method */}
              <div className="space-y-2">
                <Label className="text-xs font-medium uppercase text-muted-foreground flex justify-between">
                  Verification Method
                  {newTask.verificationType === 'none' && <Badge className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20 text-[10px]">Auto-complete</Badge>}
                </Label>
                <Select 
                  value={newTask.verificationType || "manual_link"} 
                  onValueChange={(v: VerificationType) => setNewTask(p => ({ 
                    ...p, 
                    verificationType: v,
                    action: v === 'onchain' && !p.action ? 'hold_token' : p.action 
                  }))}
                  disabled={!!editingTask?.isSystem}
                >
                  <SelectTrigger className="bg-background"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="manual_link">Manual Link Submission</SelectItem>
                    <SelectItem value="manual_upload">Manual Proof Upload</SelectItem>
                    <SelectItem value="auto_social" disabled={!['social','referral'].includes(newTask.category || '')}>API Auto-Verify (Socials)</SelectItem>
                    {/* NEW OPTION */}
                    <SelectItem value="onchain" className="font-bold text-purple-600">⚡ On-Chain Verification Engine</SelectItem>
                    <SelectItem value="none">Instant Reward (Auto-Complete)</SelectItem>
                  </SelectContent>
                </Select>
                {isOnchainVerification && (
                  <p className="text-[10px] text-purple-600 mt-1 flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3"/> Automatic check on {networks.find(n => n.chainId.toString() === chainId?.toString())?.name || "Current Chain"}.
                  </p>
                )}
              </div>

              {/* Action Buttons */}
              <div className="pt-4 flex items-center justify-end gap-3 border-t">
                {editingTask && <Button variant="ghost" onClick={() => { setEditingTask(null); setNewTask(initialNewTaskForm) }}>Cancel</Button>}
                {editingTask?.isSystem ? (
                  <div className="text-xs text-yellow-600 bg-yellow-50 px-3 py-1 rounded">System tasks are read-only</div>
                ) : (
                  <Button 
                    onClick={async () => {
                      // CLONE the current task to modify it before saving
                      let t = { ...newTask } as QuestTask

                      // 1. Force URL normalization one last time
                      if (t.url && t.url.includes('.')) {
                        t.url = normalizeUrl(t.url)
                      }

                      // 2. Ensure Handle is present for 'quote' or 'tag' related actions
                      if (t.targetPlatform === 'Twitter' && (t.action === 'quote' || t.action === 'comment')) {
                        if (!t.targetHandle) {
                            toast.error("A target handle is required for tag verification.")
                            return
                        }
                      }

                      // ==========================================
                      // 🟢 NEW: Discord & Telegram Validations 🟢
                      // ==========================================
                      if (t.targetPlatform === 'Discord' && t.action === 'role' && !t.targetHandle) {
                        toast.error("Role ID is required for Discord Role verification.");
                        return;
                      }

                      if (t.targetPlatform === 'Telegram' && t.action === 'message_count' && (!t.minTxCount || Number(t.minTxCount) < 1)) {
                        toast.error("A valid message count threshold is required.");
                        return;
                      }
                      // ==========================================

                      // Standard Validation
                      if (!t.title || !t.points) return;
                      
                      try {
                        if (editingTask) {
                          await handleUpdateTask(t)
                          toast.success("Task updated")
                        } else {
                          await handleAddTask(t)
                          toast.success("Task added")
                        }
                      } catch { toast.error("Failed to save task") }
                      finally { setEditingTask(null); setNewTask(initialNewTaskForm) }
                    }}
                    disabled={
                      !newTask.title || 
                      !newTask.points || 
                      (enforceRules && !editingTask && isAtMax) ||
                      (showContractInput && !newTask.targetContractAddress?.trim() && newTask.action !== 'hold_token')
                    }
                  >
                    {editingTask ? "Save Changes" : <><Plus className="mr-2 h-4 w-4" /> Add Task</>}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* RIGHT: Stages */}
        <div className="lg:col-span-5 flex flex-col h-full gap-6">
          <Card className="flex-1 border-border/50 shadow-sm bg-card flex flex-col">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center justify-between">
                <span className="flex items-center gap-2"><Trophy className="h-5 w-5 text-yellow-500"/> Stages</span>
                <Badge variant="outline">{newQuest.tasks.length} Tasks</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto pr-1 space-y-6">
              {TASK_STAGES.map((stage, index) => {
                const totalPoints = stageTotals[stage] || 0
                const count = stageTaskCounts[stage] || 0
                const reqPass = stagePassRequirements[stage]
                const isLocked = enforceRules && count < STAGE_TASK_REQUIREMENTS[stage].min
                const stageTasks = newQuest.tasks.filter((t: QuestTask) => t.stage === stage)

                return (
                  <div key={stage} className={`relative pl-4 ${index !== TASK_STAGES.length - 1 ? 'border-l-2 border-muted pb-6' : ''}`}>
                    <div className={`absolute -left-[9px] top-0 h-4 w-4 rounded-full border-2 bg-background ${isLocked ? 'border-muted' : 'border-primary'}`} />
                    
                    <div className={`mb-3 p-3 rounded-lg border ${isLocked ? 'bg-muted/30 border-muted' : 'bg-card dark:bg-slate-900 border-border shadow-sm'}`}>
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h4 className={`text-sm font-semibold ${isLocked ? 'text-muted-foreground' : 'text-foreground'}`}>{stage}</h4>
                          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{count} Tasks • {totalPoints} Pts</p>
                        </div>
                        {isLocked ? <Lock className="h-4 w-4 text-muted-foreground/50"/> : <Unlock className="h-4 w-4 text-green-500"/>}
                      </div>
                      <div className="flex items-center justify-between mt-2 pt-2 border-t border-border/50">
                        <Label className="text-[10px] whitespace-nowrap text-muted-foreground flex items-center gap-1"><Percent className="h-3 w-3"/> Pass Req (70%)</Label>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="font-mono text-xs bg-muted/30">{reqPass} Pts</Badge>
                          <Lock className="h-3 w-3 text-muted-foreground/40" />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      {stageTasks.map((t: QuestTask) => (
                        <div key={t.id} className={`group flex items-center justify-between p-2 rounded border transition-all ${t.isSystem ? 'bg-blue-50/50 border-blue-100 dark:bg-blue-900/10' : 'bg-muted/20 hover:bg-muted/40'}`}>
                          <div className="flex items-center gap-2 overflow-hidden">
                            {t.isSystem ? (t.isRecurring ? <CalendarClock className="h-3 w-3 text-blue-500"/> : <Users className="h-3 w-3 text-blue-500"/>) : <GripVertical className="h-3 w-3 text-muted-foreground/30"/>}
                            <span className={`text-xs truncate text-foreground/90 ${t.required ? 'font-medium' : ''}`}>{t.title}</span>
                            {t.required && <Badge variant="destructive" className="h-1.5 w-1.5 rounded-full p-0" />}
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-mono text-muted-foreground">{t.points}</span>
                            <div className="opacity-0 group-hover:opacity-100 flex gap-1 transition-opacity">
                              {!t.isSystem && (
                                <>
                                  <Button size="icon" variant="ghost" className="h-5 w-5" onClick={() => { setEditingTask(t); setNewTask(t) }}><Settings className="h-3 w-3 text-muted-foreground"/></Button>
                                  <Button size="icon" variant="ghost" className="h-5 w-5 hover:bg-red-500/10 text-destructive" onClick={async () => await handleRemoveTask(t.id)}><Trash2 className="h-3 w-3"/></Button>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* 3. Finalize Button */}
      <div className="flex justify-center pt-8 border-t border-border/50">
        <Button size="lg" className="w-full sm:w-auto min-w-[200px]" onClick={handleDeployAndFinalize} disabled={!canFinalize}>
          {!hasUserTask ? "Add at least 1 quest task" : timingErrors.length > 0 ? "Fix timing errors" : isDeploying ? "Creating Quest..." : "Create & Finalize Quest"}
        </Button>
      </div>
    </div>
  )
}