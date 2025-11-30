"use client"
import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import {
  Plus,
  Trash2,
  Save,
  Settings,
  Loader2,
  ListPlus,
  Zap,
  Upload,
  Link,
  Wallet,
  Coins,
  Share2,
  Trophy,
  Check,
  AlertTriangle,
  ArrowRight,
  ArrowLeft,
  Eye,
  Image as ImageIcon,
  Lock,
  Unlock,
} from "lucide-react"
// Mocking external dependencies
const useWallet = () => ({ address: '0xCreatorAddress', isConnected: true, chainId: 8453, provider: {} });
const networks = [{
  chainId: 8453,
  name: 'Base Mainnet',
  nativeCurrency: { symbol: 'ETH' },
  factories: { custom: '0xFactoryAddress' },
  factoryAddresses: { custom: '0xFactoryAddress' }
}];
const useNetwork = () => ({ network: networks[0], isConnecting: false });
const ethers = {
  ZeroAddress: '0x0000000000000000000000000000000000000000',
  isAddress: (addr: string) => addr.startsWith('0x') && addr.length === 42,
  BrowserProvider: function() {} as any,
  Contract: function() {
    return {
      getAllFaucetDetails: async () => [],
      createCustomFaucet: async () => ({
        wait: async () => ({
          logs: [{}]
        }),
        interface: {
          parseLog: () => ({
            name: 'FaucetCreated',
            args: { faucet: '0xNewFaucetAddress' }
          })
        }
      })
    }
  } as any
};
const BrowserProvider = ethers.BrowserProvider;
type Network = typeof networks[0];
// --- MOCK FAUCET.TS LOGIC ---
const FACTORY_TYPE_CUSTOM = 'custom' as const;
interface NameValidationResult {
    exists: boolean;
    warning?: string;
    existingFaucet?: { name: string };
    conflictingFaucets?: Array<{
        address: string
        name: string
        owner: string
        factoryAddress: string
        factoryType: typeof FACTORY_TYPE_CUSTOM
    }>
}
interface CheckFaucetNameExistsResult extends NameValidationResult {}
interface FaucetDetail {
    faucetAddress: string;
    name: string;
    owner: string;
    token: string;
}
const CUSTOM_FACTORY_NAME_CHECK_ABI = [
    "function getAllFaucetDetails() view returns (tuple(address faucetAddress, string name, address owner, address token)[] faucetDetails)",
];
const checkFaucetNameExistsAcrossAllFactories = async (
    provider: any,
    factoryAddresses: Record<string, string>,
    proposedName: string
): Promise<CheckFaucetNameExistsResult> => {
    const customFactoryAddress = factoryAddresses[FACTORY_TYPE_CUSTOM];
    if (!customFactoryAddress) {
        return { exists: false, warning: `Custom Factory not configured on this network.` };
    }
    const conflictingName = "existing-campaign-name";
    if (proposedName.toLowerCase() === conflictingName) {
        return { exists: true, existingFaucet: { name: conflictingName }, conflictingFaucets: [] };
    }
    return { exists: false };
};
export async function checkFaucetNameExists(
    provider: any,
    network: Network,
    proposedName: string
): Promise<CheckFaucetNameExistsResult> {
    try {
        if (!proposedName.trim()) {
            return { exists: false };
        }
        return await checkFaucetNameExistsAcrossAllFactories(
            provider,
            network.factoryAddresses as Record<string, string>,
            proposedName
        );
    } catch (error: any) {
        return { exists: false, warning: "Unable to validate name due to network issues." };
    }
}
const zeroAddress = ethers.ZeroAddress;
const getTodayDateString = () => new Date().toISOString().split('T')[0];
const getFutureDateString = (days: number) => {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + days);
    return futureDate.toISOString().split('T')[0];
}
interface TokenConfiguration {
  address: string;
  name: string;
  symbol: string;
  decimals: number;
  isNative?: boolean;
  logoUrl?: string;
}
const ALL_TOKENS_BY_CHAIN: Record<number, TokenConfiguration[]> = {
  42220: [
    { address: "0x471EcE3750Da237f93B8E339c536989b8978a438", name: "Celo", symbol: "CELO", decimals: 18, isNative: true, logoUrl: "/celo.png" },
    { address: "0x765DE816845861e75A25fCA122bb6898B8B1282a", name: "Celo Dollar", symbol: "cUSD", decimals: 18, logoUrl: "/cusd.png" }
  ],
  42161: [
    { address: zeroAddress, name: "Ethereum", symbol: "ETH", decimals: 18, isNative: true, logoUrl: "/ether.jpeg" },
    { address: "0x2791Bca1f2de4661ED88A30C99A7a94449Aa84174", name: "USD Coin", symbol: "USDC", decimals: 6, logoUrl: "/usdc.jpg" }
  ],
  8453: [
    { address: zeroAddress, name: "Ethereum", symbol: "ETH", decimals: 18, isNative: true, logoUrl: "/ether.jpeg" },
    { address: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", name: "USD Coin", symbol: "USDC", decimals: 6, logoUrl: "/usdc.jpg" }
  ],
};
export type TaskStage = 'Beginner' | 'Intermediate' | 'Advance' | 'Legend' | 'Ultimate';
export const TASK_STAGES: TaskStage[] = ['Beginner', 'Intermediate', 'Advance', 'Legend', 'Ultimate'];
const MAX_PASS_POINT_RATIO = 0.7; // 70%
// Stage Requirements: Min and Max tasks per stage
const STAGE_TASK_REQUIREMENTS: Record<TaskStage, { min: number; max: number }> = {
  Beginner: { min: 5, max: 10 },
  Intermediate: { min: 3, max: 8 },
  Advance: { min: 2, max: 6 },
  Legend: { min: 2, max: 5 },
  Ultimate: { min: 1, max: 3 },
};
type VerificationType = 'auto_social' | 'auto_tx' | 'manual_link' | 'manual_upload' | 'none';
// --- NEW SOCIAL CONSTANTS ---
export type SocialPlatform = 'Twitter' | 'Facebook' | 'Tiktok' | 'Youtube' | 'Discord' | 'Thread' | 'Linkedin' | 'Farcaster' | 'Instagram' | 'Website';
const SOCIAL_PLATFORMS: SocialPlatform[] = ['Twitter', 'Facebook', 'Tiktok', 'Youtube', 'Discord', 'Thread', 'Linkedin', 'Farcaster', 'Instagram', 'Website'];
const SOCIAL_ACTIONS = ['follow', 'retweet', 'like', 'join', 'subscribe', 'visit'];
const TRADING_ACTIONS = ['swap', 'stake', 'deposit', 'lend'];
interface QuestTask {
  id: string
  title: string
  description: string
  points: number
  required: boolean
  category: 'social' | 'trading' | 'swap' | 'referral' | 'content' | 'general'
  url: string
  action: string
  verificationType: VerificationType
  targetPlatform?: string
  targetHandle?: string
  targetContractAddress?: string
  targetChainId?: string
  stage: TaskStage
  minReferrals?: number
}
interface Quest {
  id: string
  creatorAddress: string
  title: string
  description: string
  isActive: boolean
  rewardPool: string
  startDate: string
  endDate: string
  tasks: QuestTask[]
  faucetAddress?: string;
  rewardTokenType: 'native' | 'erc20';
  tokenAddress: string;
  stagePassRequirements: Record<TaskStage, number>;
  imageUrl: string;
}
const initialStagePassRequirements: Record<TaskStage, number> = {
    Beginner: 0, Intermediate: 0, Advance: 0, Legend: 0, Ultimate: 0,
}
const initialNewQuest: Omit<Quest, 'id' | 'creatorAddress' | 'stagePassRequirements'> = {
  title: "New Community Campaign",
  description: "Join our ecosystem and earn rewards.",
  isActive: true,
  rewardPool: "TBD",
  startDate: getTodayDateString(),
  endDate: getFutureDateString(7),
  tasks: [],
  faucetAddress: undefined,
  rewardTokenType: 'native',
  tokenAddress: ethers.ZeroAddress,
  imageUrl: "https://placehold.co/100x100/3b82f6/ffffff?text=Quest+Logo",
}
const initialNewTaskForm: Partial<QuestTask> = {
  title: "",
  description: "",
  points: 100,
  required: true,
  category: "social",
  url: "",
  action: "follow",
  verificationType: "manual_link",
  targetPlatform: "Twitter",
  stage: 'Beginner',
  minReferrals: undefined,
}
const FACTORY_ABI_CUSTOM: any[] = [
    ...CUSTOM_FACTORY_NAME_CHECK_ABI,
    { "inputs": [], "stateMutability": "nonpayable", "type": "constructor" },
    {
      "inputs": [
        { "internalType": "string", "name": "_name", "type": "string" },
        { "internalType": "address", "name": "_token", "type": "address" },
        { "internalType": "address", "name": "_backend", "type": "address" }
      ],
      "name": "createCustomFaucet",
      "outputs": [{ "internalType": "address", "name": "", "type": "address" }],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "anonymous": false,
      "inputs": [
        { "indexed": true, "internalType": "address", "name": "faucet", "type": "address" },
        { "indexed": false, "internalType": "address", "name": "owner", "type": "address" },
        { "indexed": false, "internalType": "string", "name": "name", "type": "string" },
        { "indexed": false, "internalType": "address", "name": "token", "type": "address" },
        { "indexed": false, "internalType": "address", "name": "backend", "type": "address" }
      ],
      "name": "FaucetCreated",
      "type": "event"
    }
];
const PLATFORM_BACKEND_ADDRESS = "0x9fBC2A0de6e5C5Fd96e8D11541608f5F328C0785";
const API_BASE_URL = "https://fauctdrop-backend.onrender.com"
const getCustomFactoryAddress = (currentChainId: number | null) => {
    if (!currentChainId) return null;
    const currentNetworkConfig = networks.find(n => n.chainId === currentChainId);
    return currentNetworkConfig?.factories.custom || null;
};
// Suggested Tasks by Stage
const SUGGESTED_TASKS_BY_STAGE: Record<TaskStage, Array<Partial<QuestTask>>> = {
  Beginner: [
    { title: "Follow us on Twitter", category: "social", action: "follow", targetPlatform: "Twitter", points: 50, verificationType: "manual_link" },
    { title: "Join our Discord Server", category: "social", action: "join", targetPlatform: "Discord", points: 50, verificationType: "manual_link" },
    { title: "Like our Facebook Page", category: "social", action: "like", targetPlatform: "Facebook", points: 40, verificationType: "manual_link" },
    { title: "Subscribe to YouTube Channel", category: "social", action: "subscribe", targetPlatform: "Youtube", points: 60, verificationType: "manual_link" },
    { title: "Follow on Instagram", category: "social", action: "follow", targetPlatform: "Instagram", points: 40, verificationType: "manual_link" },
  ],
  Intermediate: [
    { title: "Refer 3 Friends", category: "referral", minReferrals: 3, points: 150, verificationType: "manual_link" },
    { title: "Share Campaign Poster", category: "content", action: "upload", points: 100, verificationType: "manual_upload", description: "Upload proof of sharing campaign poster" },
    { title: "Create Tutorial Video", category: "content", action: "upload", points: 200, verificationType: "manual_upload", description: "Create and share a tutorial video" },
    { title: "Write Blog Post", category: "content", action: "upload", points: 150, verificationType: "manual_upload", description: "Write a blog post about the project" },
  ],
  Advance: [
    { title: "Execute Swap on Uniswap", category: "swap", action: "swap", points: 200, verificationType: "auto_tx" },
    { title: "Stake Tokens", category: "trading", action: "stake", points: 250, verificationType: "auto_tx" },
    { title: "Provide Liquidity", category: "trading", action: "deposit", points: 300, verificationType: "auto_tx" },
  ],
  Legend: [
    { title: "Refer 10 Active Users", category: "referral", minReferrals: 10, points: 500, verificationType: "manual_link" },
    { title: "Execute Advanced Trading", category: "trading", action: "lend", points: 400, verificationType: "auto_tx" },
  ],
  Ultimate: [
    { title: "Become Ambassador", category: "general", points: 1000, verificationType: "manual_link", description: "Complete all requirements and apply for ambassador role" },
  ],
};
// --- HELPERS ---
const generateSocialTaskTitle = (platform: string, action: string): string => {
    if (!platform || !action) return "";
    const actionMap: Record<string, string> = {
        'follow': 'Follow',
        'retweet': 'Retweet/Share',
        'like': 'Like',
        'join': 'Join',
        'subscribe': 'Subscribe to',
        'visit': 'Visit',
        'swap': 'Execute Swap on',
        'stake': 'Stake Tokens on',
        'deposit': 'Deposit Assets on',
        'lend': 'Lend/Borrow on',
    };
    const capitalizedAction = actionMap[action] || action.charAt(0).toUpperCase() + action.slice(1);
   
    if (['follow', 'like', 'retweet'].includes(action) && platform === 'Twitter') {
        return `${capitalizedAction} our post on X (Twitter)`;
    }
    if (action === 'join' && platform === 'Discord') {
        return `Join our Official Discord Server`;
    }
    if (action === 'subscribe' && platform === 'Youtube') {
        return `Subscribe to our YouTube Channel`;
    }
   
    return `${capitalizedAction} our ${platform}`;
};
// --- STEP 1: QUEST DETAILS ---
interface StepOneProps {
    newQuest: Omit<Quest, 'id' | 'creatorAddress' | 'stagePassRequirements'>;
    setNewQuest: React.Dispatch<React.SetStateAction<Omit<Quest, 'id' | 'creatorAddress' | 'stagePassRequirements'>>>;
    nameError: string | null;
    isCheckingName: boolean;
}
const StepOneDetails: React.FC<StepOneProps> = ({ newQuest, setNewQuest, nameError, isCheckingName }) => (
    <Card>
        <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
                <Settings className="h-5 w-5" /> Step 1: Basic Quest Details
            </CardTitle>
            <CardDescription>
                Define the campaign's core identity. The Title is also used as the Faucet name.
            </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
           
            <div className="space-y-2">
              <Label htmlFor="title">Quest Title (also Faucet Name)</Label>
              <div className="relative">
                <Input
                  id="title"
                  value={newQuest.title}
                  onChange={(e) => setNewQuest({...newQuest, title: e.target.value})}
                  placeholder="The FaucetDrop Launch Campaign"
                  className={
                      nameError
                          ? "border-red-500 pr-10"
                          : (!isCheckingName && newQuest.title.trim().length >= 3 && !nameError)
                              ? "border-green-500 pr-10"
                              : "pr-10"
                  }
                  disabled={isCheckingName}
                />
                {isCheckingName && (
                    <Loader2 className="h-4 w-4 absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-gray-500" />
                )}
                {!isCheckingName && newQuest.title.trim().length >= 3 && (
                    nameError ? (
                        <AlertTriangle className="h-4 w-4 absolute right-3 top-1/2 -translate-y-1/2 text-red-500" />
                    ) : (
                        <Check className="h-4 w-4 absolute right-3 top-1/2 -translate-y-1/2 text-green-500" />
                    )
                )}
              </div>
               {newQuest.title.trim().length > 0 && newQuest.title.trim().length < 3 && (
                   <p className="text-xs text-red-500">Quest name must be at least 3 characters long.</p>
               )}
               {nameError && newQuest.title.trim().length >= 3 && (
                   <p className="text-xs text-red-500">{nameError}</p>
               )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="imageUrl">Quest Image/Logo URL</Label>
              <div className="flex items-center space-x-2">
                <Input
                    id="imageUrl"
                    value={newQuest.imageUrl}
                    onChange={(e) => setNewQuest({...newQuest, imageUrl: e.target.value})}
                    placeholder="https://i.imgur.com/quest-logo.png"
                />
                <Button variant="outline" size="icon" disabled>
                    <ImageIcon className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">URL to a campaign image (e.g., logo, banner).</p>
            </div>
           
            <div className="space-y-2">
              <Label htmlFor="description">Quest Description</Label>
              <Textarea
                id="description"
                value={newQuest.description}
                onChange={(e) => setNewQuest({...newQuest, description: e.target.value})}
                placeholder="A campaign to reward early community members."
                rows={3}
              />
            </div>
        </CardContent>
    </Card>
)
// --- STEP 2: REWARDS CONFIG ---
interface StepTwoProps {
    newQuest: Omit<Quest, 'id' | 'creatorAddress' | 'stagePassRequirements'>;
    setNewQuest: React.Dispatch<React.SetStateAction<Omit<Quest, 'id' | 'creatorAddress' | 'stagePassRequirements'>>>;
    chainId: number | null;
    network: Network | null;
    selectedToken: TokenConfiguration | null;
    setSelectedToken: React.Dispatch<React.SetStateAction<TokenConfiguration | null>>;
    error: string | null;
    setError: React.Dispatch<React.SetStateAction<string | null>>;
}
const StepTwoRewards: React.FC<StepTwoProps> = ({ newQuest, setNewQuest, chainId, network, selectedToken, setSelectedToken, setError }) => {
    const [isCustomToken, setIsCustomToken] = useState(false);
    const [customTokenAddress, setCustomTokenAddress] = useState('');
    const availableTokens = chainId ? ALL_TOKENS_BY_CHAIN[chainId] || [] : [];
   
    return (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Coins className="h-5 w-5" /> Step 2: Rewards Configuration
            </CardTitle>
            <CardDescription>
                Define the rewards and the primary reward token for the Faucet.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
           
            <div className="space-y-2">
              <Label htmlFor="rewardPool">Reward Pool Description</Label>
              <Input
                id="rewardPool"
                value={newQuest.rewardPool}
                onChange={(e) => setNewQuest({...newQuest, rewardPool: e.target.value})}
                placeholder="5000 $FD tokens + 10 NFT spots"
              />
               <p className="text-xs text-muted-foreground">This is for display only. The reward token will be used for the Faucet deployment.</p>
            </div>
           
            <div className="space-y-2">
                <Label htmlFor="rewardToken">Reward Token ({network?.name || 'Unknown Chain'})</Label>
                <Select
                    value={isCustomToken ? "custom" : (selectedToken ? selectedToken.address : undefined)}
                    onValueChange={(value) => {
                        if (value === "custom") {
                            setIsCustomToken(true);
                            setSelectedToken(null);
                        } else {
                            const token = availableTokens.find(t => t.address === value);
                            if (token) {
                                setSelectedToken(token);
                                setIsCustomToken(false);
                                setCustomTokenAddress('');
                                setNewQuest(prev => ({
                                    ...prev,
                                    rewardTokenType: token.isNative ? 'native' : 'erc20',
                                    tokenAddress: token.address,
                                }));
                            }
                        }
                    }}
                    disabled={availableTokens.length === 0}
                >
                    <SelectTrigger>
                        <SelectValue>
                            {isCustomToken ? (
                                "Custom Token"
                            ) : selectedToken ? (
                                <span className="flex items-center gap-2">
                                    {selectedToken.name} ({selectedToken.symbol})
                                </span>
                            ) : (
                                availableTokens.length > 0 ? "Select reward token" : "No tokens available on this chain"
                            )}
                        </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                        {availableTokens.map((token) => (
                            <SelectItem key={token.address} value={token.address}>
                                <div className="flex items-center gap-2">
                                    {token.name} ({token.symbol}) {token.isNative && <Badge variant="secondary" className="text-xs">Native</Badge>}
                                </div>
                            </SelectItem>
                        ))}
                        <SelectItem value="custom">+ Custom Token</SelectItem>
                    </SelectContent>
                </Select>
            </div>
            {isCustomToken && (
                <div className="space-y-3 p-3 border rounded-lg bg-gray-50 dark:bg-gray-900">
                    <h4 className="text-sm font-medium">Custom Token Address</h4>
                    <div className="space-y-2">
                        <Label className="text-xs">Token Contract Address</Label>
                        <Input
                            value={customTokenAddress}
                            onChange={(e) => setCustomTokenAddress(e.target.value)}
                            placeholder="0x..."
                        />
                    </div>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                            if (customTokenAddress && ethers.isAddress(customTokenAddress)) {
                                const fullCustom: TokenConfiguration = {
                                    address: customTokenAddress,
                                    name: 'Custom Token',
                                    symbol: 'CUST',
                                    decimals: 18,
                                    isNative: false,
                                };
                                setSelectedToken(fullCustom);
                                setIsCustomToken(false);
                                setCustomTokenAddress('');
                                setNewQuest(prev => ({
                                    ...prev,
                                    rewardTokenType: 'erc20',
                                    tokenAddress: fullCustom.address,
                                }));
                                setError(null);
                            } else {
                                setError("Please enter a valid token contract address.");
                            }
                        }}
                        disabled={!customTokenAddress || !ethers.isAddress(customTokenAddress)}
                        className="w-full"
                    >
                        Set Custom Token
                    </Button>
                </div>
            )}
          </CardContent>
        </Card>
    )
}
// --- STEP 3: TASKS & STAGE REQUIREMENTS ---
interface StepThreeProps {
    newQuest: Omit<Quest, 'id' | 'creatorAddress' | 'stagePassRequirements'>;
    setNewQuest: React.Dispatch<React.SetStateAction<Omit<Quest, 'id' | 'creatorAddress' | 'stagePassRequirements'>>>;
    initialNewTaskForm: Partial<QuestTask>;
    error: string | null;
    setError: React.Dispatch<React.SetStateAction<string | null>>;
    stagePassRequirements: Record<TaskStage, number>;
    setStagePassRequirements: React.Dispatch<React.SetStateAction<Record<TaskStage, number>>>;
    stageTotals: Record<TaskStage, number>;
    stageTaskCounts: Record<TaskStage, number>;
    validateTask: () => boolean;
    handleAddTask: () => void;
    handleEditTask: (task: QuestTask) => void;
    handleUpdateTask: () => void;
    handleRemoveTask: (taskId: string) => void;
    handleStagePassRequirementChange: (stage: TaskStage, value: number) => void;
    isStageSelectable: (targetStage: TaskStage) => boolean;
    editingTask: QuestTask | null;
    setEditingTask: React.Dispatch<React.SetStateAction<QuestTask | null>>;
    newTask: Partial<QuestTask>;
    setNewTask: React.Dispatch<React.SetStateAction<Partial<QuestTask>>>;
    checkStagePassPointsValidity: () => boolean;
    getStageColor: (stage: TaskStage) => string;
    getCategoryColor: (category: string) => string;
    getVerificationIcon: (type: VerificationType) => React.ReactNode;
    handleUseSuggestedTask: (suggestedTask: Partial<QuestTask>) => void;
}
const StepThreeTasks: React.FC<StepThreeProps> = ({
    newQuest, setNewQuest, initialNewTaskForm, error, setError, stagePassRequirements,
    setStagePassRequirements, stageTotals, stageTaskCounts, validateTask, handleAddTask, handleEditTask,
    handleUpdateTask, handleRemoveTask, handleStagePassRequirementChange, isStageSelectable,
    editingTask, setNewTask, newTask, checkStagePassPointsValidity, getStageColor, getCategoryColor, getVerificationIcon,
    setEditingTask, handleUseSuggestedTask
}) => {
    // --- Task Stage Restriction Logic ---
    const getStageSelectStatus = (stage: TaskStage) => {
        const stageIndex = TASK_STAGES.indexOf(stage);
       
        if (editingTask && editingTask.stage === stage) return 'selectable';
        if (stageIndex === 0) return 'selectable';
        // Check if previous stage has met minimum task requirements
        for (let i = 0; i < stageIndex; i++) {
            const prevStage = TASK_STAGES[i];
            const prevStageTaskCount = stageTaskCounts[prevStage];
            const prevStageRequirement = STAGE_TASK_REQUIREMENTS[prevStage];
           
            if (prevStageTaskCount < prevStageRequirement.min) {
                return 'locked';
            }
        }
        return 'selectable';
    };
    const isSocialOrReferral = newTask.category === 'social' || newTask.category === 'referral';
    const isTrading = newTask.category === 'trading' || newTask.category === 'swap';
    const isSocialTemplate = newTask.category === 'social';
    const isContentCategory = newTask.category === 'content';
    // Get available categories for current stage
    const getAvailableCategories = (stage: TaskStage): Array<QuestTask['category']> => {
        switch (stage) {
            case 'Beginner':
                return ['social'];
            case 'Intermediate':
                return ['referral', 'content'];
            case 'Advance':
                return ['swap', 'trading'];
            case 'Legend':
            case 'Ultimate':
                return ['social', 'referral', 'content', 'swap', 'trading', 'general'];
            default:
                return ['general'];
        }
    };
    const availableCategories = getAvailableCategories(newTask.stage || 'Beginner');
    const currentStageTaskCount =stageTaskCounts[newTask.stage || 'Beginner'];
const currentStageRequirement = STAGE_TASK_REQUIREMENTS[newTask.stage || 'Beginner'];
const isCurrentStageAtMax = currentStageTaskCount >= currentStageRequirement.max;// Get suggested tasks for current stage
const suggestedTasks = SUGGESTED_TASKS_BY_STAGE[newTask.stage || 'Beginner'] || [];return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Task Definition Panel */}
        <Card>
            <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                    <ListPlus className="h-5 w-5" />
                    {editingTask ? "Edit Task" : "Define New Task"}
                </CardTitle>
                <CardDescription>
                    Define the action, its stage, and the verification method.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4"> {/* STAGE, CATEGORY & VERIFICATION */}
                <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-2">
                        <Label htmlFor="stage">Task Stage</Label>
                        <Select
                            value={newTask.stage || "Beginner"}
                            onValueChange={(value: TaskStage) => {
                                const newCategories = getAvailableCategories(value);
                                let newCategory = newTask.category; // Reset category if not available in new stage
                                if (!newCategories.includes(newTask.category as any)) {
                                    newCategory = newCategories[0];
                                } setNewTask(prev => ({...prev, stage: value, category: newCategory}));
                            }}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Select stage" />
                            </SelectTrigger>
                            <SelectContent>
                                {TASK_STAGES.map(stage => {
                                    const status = getStageSelectStatus(stage);
                                    const taskCount = stageTaskCounts[stage];
                                    const requirement = STAGE_TASK_REQUIREMENTS[stage]; return (
                                        <SelectItem
                                            key={stage}
                                            value={stage}
                                            disabled={status === 'locked'}
                                        >
                                            <div className="flex items-center gap-2">
                                                {status === 'locked' ? <Lock className="h-3 w-3" /> : <Unlock className="h-3 w-3" />}
                                                {stage}
                                                <span className="text-xs text-muted-foreground">
                                                    ({taskCount}/{requirement.min}-{requirement.max})
                                                </span>
                                            </div>
                                        </SelectItem>
                                    );
                                })}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="category">Category</Label>
                        <Select
                            value={newTask.category || "social"}
                            onValueChange={(value: any) => {
                                const newCategory = value as QuestTask['category']; setNewTask(prev => ({
                                    ...prev,
                                    category: newCategory,
                                    minReferrals: newCategory === 'referral' ? (prev.minReferrals || 1) : undefined
                                }));
                            }}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Select category" />
                            </SelectTrigger>
                            <SelectContent>
                                {availableCategories.map(cat => (
                                    <SelectItem key={cat} value={cat}>
                                        {cat.charAt(0).toUpperCase() + cat.slice(1)}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="verificationType">Verification</Label>
                        <Select
                            value={newTask.verificationType || "manual_link"}
                            onValueChange={(value: any) => setNewTask({...newTask, verificationType: value})}
                        >
                            <SelectTrigger><SelectValue placeholder="Select method" /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="auto_social" disabled={!isSocialOrReferral}>🤖 Auto (Social)</SelectItem>
                                <SelectItem value="auto_tx" disabled={!isTrading}>💰 Auto (Tx)</SelectItem>
                                <SelectItem value="manual_link">🔗 Manual (Link)</SelectItem>
                                <SelectItem value="manual_upload">🖼️ Manual (Image)</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div> {/* Stage Task Count Info */}
                {!editingTask && (
                    <div className={`p-3 rounded-lg border-2 ${
                        isCurrentStageAtMax
                            ? 'bg-red-50 border-red-300 dark:bg-red-900/20'
                            : currentStageTaskCount >= currentStageRequirement.min
                                ? 'bg-green-50 border-green-300 dark:bg-green-900/20'
                                : 'bg-blue-50 border-blue-300 dark:bg-blue-900/20'
                    }`}>
                        <div className="flex items-center justify-between">
                            <span className="text-sm font-medium">
                                {newTask.stage || 'Beginner'} Stage: {currentStageTaskCount}/{currentStageRequirement.max} tasks
                            </span>
                            {isCurrentStageAtMax && <Lock className="h-4 w-4 text-red-500" />}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                            {isCurrentStageAtMax
                                ? `Maximum tasks reached. Remove a task or select another stage.`
                                : currentStageTaskCount < currentStageRequirement.min
                                    ? `Minimum ${currentStageRequirement.min} tasks required to unlock next stage.`
                                    : `Stage unlocked! You can add up to ${currentStageRequirement.max - currentStageTaskCount} more tasks.`
                            }
                        </p>
                    </div>
                )} {/* Suggested Tasks */}
                {!editingTask && suggestedTasks.length > 0 && (
                    <div className="space-y-2 p-3 border rounded-lg bg-purple-50 dark:bg-purple-900/20">
                        <h4 className="text-sm font-semibold flex items-center gap-2">
                            <Zap className="h-4 w-4" /> Suggested Tasks for {newTask.stage}
                        </h4>
                        <div className="grid grid-cols-1 gap-2">
                            {suggestedTasks.map((task, idx) => (
                                <Button
                                    key={idx}
                                    variant="outline"
                                    size="sm"
                                    className="justify-start text-left h-auto py-2"
                                    onClick={() => handleUseSuggestedTask(task)}
                                >
                                    <div className="flex flex-col items-start w-full">
                                        <span className="font-medium text-xs">{task.title}</span>
                                        <span className="text-xs text-muted-foreground">
                                            {task.points} pts • {task.category}
                                        </span>
                                    </div>
                                </Button>
                            ))}
                        </div>
                    </div>
                )} {/* DYNAMIC TEMPLATE: SOCIAL TASK */}
                {isSocialTemplate && (
                    <div className="space-y-3 p-3 border-2 border-blue-300 rounded-lg bg-blue-50 dark:bg-blue-900/50">
                        <h4 className="text-md font-semibold text-blue-700 dark:text-blue-200">Social Task Template</h4>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-2">
                                <Label>Platform</Label>
                                <Select
                                    value={newTask.targetPlatform || "Twitter"}
                                    onValueChange={(value: SocialPlatform) => {
                                        setNewTask(prev => ({
                                            ...prev,
                                            targetPlatform: value,
                                            title: generateSocialTaskTitle(value, prev.action || 'follow'),
                                            description: `Complete the action on our ${value} channel/page.`,
                                        }));
                                    }}
                                >
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        {SOCIAL_PLATFORMS.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Action</Label>
                                <Select
                                    value={newTask.action || "follow"}
                                    onValueChange={(value: string) => {
                                        setNewTask(prev => ({
                                            ...prev,
                                            action: value,
                                            title: generateSocialTaskTitle(prev.targetPlatform || 'Twitter', value),
                                        }));
                                    }}
                                >
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        {SOCIAL_ACTIONS.map(a => <SelectItem key={a} value={a}>{a.charAt(0).toUpperCase() + a.slice(1)}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label>Task Title (Auto-Generated)</Label>
                            <Input
                                value={newTask.title || "Auto-generated based on selections"}
                                disabled
                                className="font-bold bg-white dark:bg-gray-800"
                            />
                        </div>
                    </div>
                )} {/* MANUAL TITLE/DESCRIPTION (Hidden for social template) */}
                {!isSocialTemplate && (
                    <>
                        <div className="space-y-2">
                            <Label htmlFor="taskTitle">Task Title</Label>
                            <Input
                                id="taskTitle"
                                value={newTask.title || ""}
                                onChange={(e) => setNewTask({...newTask, title: e.target.value})}
                                placeholder="Complete KYC Verification"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="taskDescription">Description / Guide</Label>
                            <Textarea
                                id="taskDescription"
                                value={newTask.description || ""}
                                onChange={(e) => setNewTask({...newTask, description: e.target.value})}
                                placeholder="Detailed steps for completing the task."
                                rows={2}
                            />
                        </div>
                    </>
                )} <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                        <Label htmlFor="url">Action URL / Guide Link</Label>
                        <Input
                            id="url"
                            value={newTask.url || ""}
                            onChange={(e) => setNewTask({...newTask, url: e.target.value})}
                            placeholder="https://x.com/faucetdrops/status/..."
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="points">Task Points</Label>
                        <Input
                            id="points"
                            type="number"
                            value={newTask.points || 100}
                            onChange={(e) => setNewTask({...newTask, points: parseInt(e.target.value)})}
                            min="1"
                        />
                    </div>
                </div> {/* REFERRAL-SPECIFIC FIELD */}
                {newTask.category === 'referral' && (
                     <div className="space-y-2 p-3 border rounded-lg bg-orange-50 dark:bg-orange-900/50">
                        <div className="flex items-center gap-2 text-sm font-medium text-orange-800 dark:text-orange-200">
                            <Share2 className="h-4 w-4" /> Referral Settings
                        </div>
                        <Label className="text-xs">Minimum Required Referrals</Label>
                        <Input
                          type="number"
                          value={newTask.minReferrals || 1}
                          onChange={(e) => setNewTask({...newTask, minReferrals: parseInt(e.target.value)})}
                          min="1"
                          placeholder="e.g. 5"
                        />
                    </div>
                )} {/* Dynamic Verification Fields */}
                {newTask.verificationType === 'auto_social' && (
                    <div className="grid grid-cols-2 gap-3 p-3 border rounded-lg bg-gray-50 dark:bg-gray-900">
                        <div className="space-y-2 col-span-2">
                            <Label>Action Target URL/Handle</Label>
                            <Input
                                value={newTask.url || ""}
                                onChange={(e) => setNewTask({...newTask, url: e.target.value})}
                                placeholder="Enter the full URL of the post or page to follow/like/join"
                            />
                        </div>
                    </div>
                )} {newTask.verificationType === 'auto_tx' && (
                    <div className="grid grid-cols-3 gap-3 p-3 border rounded-lg bg-gray-50 dark:bg-gray-900">
                        <div className="space-y-2">
                            <Label>Chain ID</Label>
                            <Input
                                value={newTask.targetChainId || ""}
                                onChange={(e) => setNewTask({...newTask, targetChainId: e.target.value})}
                                placeholder="8453 (Base)"
                            />
                        </div>
                        <div className="space-y-2 col-span-2">
                            <Label>Target Contract Address</Label>
                            <Input
                                value={newTask.targetContractAddress || ""}
                                onChange={(e) => setNewTask({...newTask, targetContractAddress: e.target.value})}
                                placeholder="0x..."
                            />
                        </div>
                        <div className="space-y-2 col-span-3">
                            <Label>Transaction Action</Label>
                            <Select
                                value={newTask.action || "swap"}
                                onValueChange={(value: string) => setNewTask({...newTask, action: value})}
                            >
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    {TRADING_ACTIONS.map(a => <SelectItem key={a} value={a}>{a.charAt(0).toUpperCase() + a.slice(1)}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                )} <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Switch
                            checked={newTask.required || false}
                            onCheckedChange={(checked) => setNewTask({...newTask, required: checked})}
                        />
                        <Label>Required Task</Label>
                    </div> <Button
                        onClick={editingTask ? handleUpdateTask : handleAddTask}
                        disabled={
                            !newTask.title ||
                            !newTask.url ||
                            newTask.points === undefined ||
                            newTask.points <= 0 ||
                            (!editingTask && isCurrentStageAtMax)
                        }
                    >
                        <Plus className="h-4 w-4 mr-2" />
                        {editingTask ? "Update Task" : "Add Task"}
                    </Button>
                </div> {editingTask && (
                    <Button
                        variant="outline"
                        onClick={() => {
                            setNewTask(initialNewTaskForm)
                            setEditingTask(null)
                        }}
                        className="w-full"
                    >
                        Cancel Edit
                    </Button>
                )}
            </CardContent>
        </Card> {/* Stage Pass Requirements & Task List Summary */}
        <Card>
            <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                    <Trophy className="h-5 w-5" /> Stage Pass Requirements
                </CardTitle>
                <CardDescription>
                    Set minimum points to pass a stage and unlock the next.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4"> {/* Stage Pass Requirements Panel */}
                <div className="p-2 space-y-3 border rounded-lg">
                    <p className="text-xs text-muted-foreground">
                        Pass Points must be &gt; 0 and max 70% of the stage's total points.
                    </p> {TASK_STAGES.map((stage) => {
                        const totalPoints = stageTotals[stage];
                        const taskCount = stageTaskCounts[stage];
                        const requirement = STAGE_TASK_REQUIREMENTS[stage];
                        const maxAllowed = Math.floor(totalPoints * MAX_PASS_POINT_RATIO);
                        const requiredPass = stagePassRequirements[stage];
                        const isInvalid = totalPoints > 0 && (requiredPass > maxAllowed || requiredPass <= 0);
                        const meetsMinTasks = taskCount >= requirement.min; return (
                            <div key={stage} className={`flex justify-between items-center gap-3 p-2 rounded-md ${
                                totalPoints > 0
                                    ? meetsMinTasks
                                        ? 'bg-green-50 border border-green-200 dark:bg-green-900/20'
                                        : 'bg-yellow-50 border border-yellow-200 dark:bg-yellow-900/20'
                                    : 'bg-gray-100 dark:bg-gray-800'
                            }`}>
                                <div className="flex flex-col">
                                    <span className="font-medium text-sm flex items-center gap-2">
                                        {stage} Stage
                                        {!meetsMinTasks && taskCount > 0 && (
                                            <Lock className="h-3 w-3 text-yellow-600" />
                                        )}
                                        {meetsMinTasks && <Unlock className="h-3 w-3 text-green-600" />}
                                    </span>
                                    <span className="text-xs text-muted-foreground">
                                        Tasks: {taskCount}/{requirement.min}-{requirement.max} | Points: {totalPoints} {totalPoints > 0 && `(Max Pass: ${maxAllowed})`}
                                    </span>
                                    {isInvalid && (
                                        <p className="text-xs text-red-500">Pass required: 1 - {maxAllowed} Pts.</p>
                                    )}
                                    {!meetsMinTasks && taskCount > 0 && (
                                        <p className="text-xs text-yellow-600">Add {requirement.min - taskCount} more task(s) to unlock next stage</p>
                                    )}
                                </div>
                                <Input
                                    type="number"
                                    value={requiredPass || 0}
                                    onChange={(e) => handleStagePassRequirementChange(stage, parseInt(e.target.value) || 0)}
                                    min={totalPoints > 0 ? 1 : 0}
                                    max={maxAllowed || undefined}
                                    disabled={totalPoints === 0}
                                    className={`w-24 text-right ${isInvalid ? 'border-red-500' : ''}`}
                                />
                            </div>
                        );
                    })}
                </div> <h3 className="text-md font-semibold mt-4 flex items-center gap-2">
                    <ListPlus className="h-4 w-4" /> Current Tasks Summary ({newQuest.tasks.length})
                </h3>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                    {newQuest.tasks.length === 0 ? (
                        <div className="text-center py-4 text-muted-foreground text-sm">
                            No tasks added yet.
                        </div>
                    ) : (
                        TASK_STAGES.map(stage => {
                            const tasksInStage = newQuest.tasks.filter(t => t.stage === stage);
                            if (tasksInStage.length === 0) return null; return (
                                <div key={stage} className="p-3 border rounded-lg">
                                    <h5 className="font-medium text-sm mb-2 flex items-center justify-between">
                                        <Badge className={getStageColor(stage)}>{stage}</Badge>
                                        <span className="text-xs text-muted-foreground">{stageTotals[stage]} Points</span>
                                    </h5>
                                    <div className="space-y-1">
                                        {tasksInStage.map(task => (
                                            <div key={task.id} className="flex justify-between items-center text-xs p-1 bg-gray-50 dark:bg-gray-800 rounded">
                                                <span className="truncate flex items-center gap-1">
                                                    {task.required && <span className="text-red-500 font-bold">*</span>}
                                                    {task.title}
                                                </span>
                                                <div className="flex items-center gap-2">
                                                    <Badge variant="secondary" className={`text-xs ${getCategoryColor(task.category)}`}>{task.category}</Badge>
                                                    <span className="text-green-600 font-semibold">{task.points} Pts</span>
                                                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleEditTask(task)}><Settings className="h-3 w-3" /></Button>
                                                    <Button variant="ghost" size="icon" className="h-6 w-6 text-red-500" onClick={() => handleRemoveTask(task.id)}><Trash2 className="h-3 w-3" /></Button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )
                        })
                    )}
                </div>
            </CardContent>
        </Card>
    </div>
)
}
// --- STEP 4: PREVIEW AND LAUNCH ---
interface StepFourProps {
newQuest: Omit<Quest, 'id' | 'creatorAddress' | 'stagePassRequirements'>;
stageTotals: Record<TaskStage, number>;
stagePassRequirements: Record<TaskStage, number>;
selectedToken: TokenConfiguration | null;
network: Network | null;
isConnected: boolean;
isSaving: boolean;
isSaveDisabled: boolean;
handleCreateQuest: () => Promise<void>;
getStageColor: (stage: TaskStage) => string;
}
const StepFourPreview: React.FC<StepFourProps> = ({
newQuest, stageTotals, stagePassRequirements, selectedToken, network,
isConnected, isSaving, isSaveDisabled, handleCreateQuest, getStageColor
}) => {
return (
<Card>
<CardHeader>
<CardTitle className="text-lg flex items-center gap-2">
<Eye className="h-5 w-5" /> Step 4: Preview & Launch
</CardTitle>
<CardDescription>
Review your quest details and deploy the Faucet smart contract to launch the campaign.
</CardDescription>
</CardHeader>
<CardContent className="space-y-6">
            {/* Quest Summary */}
            <div className="border p-4 rounded-lg space-y-3">
                <h3 className="text-xl font-bold">{newQuest.title}</h3>
                <div className="flex space-x-4">
                    {newQuest.imageUrl && (
                        <img src={newQuest.imageUrl} alt="Quest Logo" className="h-16 w-16 object-cover rounded-md" />
                    )}
                    <p className="text-muted-foreground">{newQuest.description}</p>
                </div>
               
                <div className="grid grid-cols-2 gap-4 pt-3">
                    <div>
                        <p className="text-sm font-medium">Reward Token</p>
                        <p className="text-lg font-bold flex items-center gap-2">
                            <Coins className="h-5 w-5 text-yellow-600" />
                            {selectedToken ? `${selectedToken.name} (${selectedToken.symbol})` : 'TBD / Custom'}
                        </p>
                    </div>
                    <div>
                        <p className="text-sm font-medium">Reward Pool</p>
                        <p className="text-lg font-bold">{newQuest.rewardPool || 'Not Specified'}</p>
                    </div>
                    <div>
                        <p className="text-sm font-medium">Network</p>
                        <p className="font-semibold">{network?.name || 'Unknown'}</p>
                    </div>
                    <div>
                        <p className="text-sm font-medium">Duration</p>
                        <p className="font-semibold">{newQuest.startDate} to {newQuest.endDate}</p>
                    </div>
                </div>
            </div>
            {/* Stages and Tasks Preview */}
            <div className="space-y-3">
                <h4 className="text-lg font-semibold border-b pb-2">Stages & Tasks</h4>
                {TASK_STAGES.map(stage => {
                    const tasksInStage = newQuest.tasks.filter(t => t.stage === stage);
                    const totalPoints = stageTotals[stage];
                    const requiredPass = stagePassRequirements[stage];
                   
                    if (tasksInStage.length === 0) return null;
                    return (
                        <div key={stage} className="p-3 border rounded-lg">
                            <h5 className="font-bold text-md flex items-center justify-between">
                                <Badge className={getStageColor(stage)}>{stage} Stage</Badge>
                                <span className="text-sm font-semibold">Pass: {requiredPass} / Total: {totalPoints} Pts</span>
                            </h5>
                            <ul className="list-disc pl-5 text-sm mt-2 space-y-1">
                                {tasksInStage.map(task => (
                                    <li key={task.id}>
                                        <span className="font-medium">{task.title}</span> ({task.points} Pts)
                                        {task.required && <span className="text-red-500 font-bold ml-1">(Required)</span>}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )
                })}
            </div>
            {/* Launch Button */}
            <Button
                onClick={handleCreateQuest}
                disabled={isSaveDisabled}
                className="w-full mt-6 text-lg py-6"
            >
                {isConnected ? (
                  isSaving ? (
                    <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                  ) : (
                    <Zap className="h-5 w-5 mr-2" />
                  )
                ) : (
                  <Wallet className="h-5 w-5 mr-2" />
                )}
                {isConnected ? `Launch Quest & Deploy Faucet` : "Connect Wallet to Deploy"}
            </Button>
        </CardContent>
    </Card>
)
}
// --- MAIN COMPONENT: QuestCreator ---
export default function QuestCreator() {
const { address, isConnected, chainId, provider } = useWallet();
const { network, isConnecting: isNetworkConnecting } = useNetwork();
// --- WIZARD STATE ---
const [step, setStep] = useState(1);
const maxSteps = 4;
// --- EXISTING STATE ---
const [newQuest, setNewQuest] = useState<Omit<Quest, 'id' | 'creatorAddress' | 'stagePassRequirements'>>(initialNewQuest)
const [newTask, setNewTask] = useState<Partial<QuestTask>>(initialNewTaskForm)
const [editingTask, setEditingTask] = useState<QuestTask | null>(null)
const [isSaving, setIsSaving] = useState(false)
const [error, setError] = useState<string | null>(null);
const [nameError, setNameError] = useState<string | null>(null);
const [isCheckingName, setIsCheckingName] = useState(false);
const [stagePassRequirements, setStagePassRequirements] = useState<Record<TaskStage, number>>(initialStagePassRequirements);
// --- TOKEN STATE ---
const [selectedToken, setSelectedToken] = useState<TokenConfiguration | null>(null);
const availableTokens = chainId ? ALL_TOKENS_BY_CHAIN[chainId] || [] : [];
useEffect(() => {
if (chainId && availableTokens.length > 0 && !selectedToken) {
const initialToken = availableTokens.find(t => t.isNative) || availableTokens[0];
setSelectedToken(initialToken || null);
setNewQuest(prev => ({
...prev,
rewardTokenType: initialToken?.isNative ? 'native' : 'erc20',
tokenAddress: initialToken?.address || zeroAddress,
}));
} else if (!chainId) { 
  setSelectedToken(null);
setNewQuest(initialNewQuest);
}
}, [chainId, selectedToken]);
const FAUCET_FACTORY_ADDRESS = getCustomFactoryAddress(chainId);
const isFactoryAvailable = !!FAUCET_FACTORY_ADDRESS && isConnected;
// --- DYNAMIC CALCULATION: Stage Total Points & Task Counts ---
const stageTotals = useMemo(() => {
const newTotals: Record<TaskStage, number> = {
Beginner: 0, Intermediate: 0, Advance: 0, Legend: 0, Ultimate: 0,
};
newQuest.tasks.forEach(task => {
newTotals[task.stage] += task.points;
});
return newTotals;
}, [newQuest.tasks]);
const stageTaskCounts = useMemo(() => {
const counts: Record<TaskStage, number> = {
Beginner: 0, Intermediate: 0, Advance: 0, Legend: 0, Ultimate: 0,
};
newQuest.tasks.forEach(task => {
counts[task.stage]++;
});
return counts;
}, [newQuest.tasks]);
// --- Name Validation ---
const validateFaucetNameAcrossFactories = useCallback(async (nameToValidate: string) => {
if (!nameToValidate.trim() || !isConnected || !provider || !network) {
setNameError(null);
return;
}
setIsCheckingName(true);
setNameError(null);
try {
    const result = await checkFaucetNameExists(provider as any, network as Network, nameToValidate);
   
    if (result.exists) {
        const conflictingName = result.existingFaucet?.name || nameToValidate;
        setNameError(`The name "${conflictingName}" is already in use by a deployed Faucet. Choose a unique name.`);
    } else if (result.warning) {
        setNameError(`Warning: ${result.warning}`);
    } else {
        setNameError(null);
    }
} catch (e) {
    setNameError("Error checking name uniqueness. Please ensure your name is unique.");
} finally {
    setIsCheckingName(false);
}
}, [provider, network, isConnected]);
useEffect(() => {
const title = newQuest.title.trim();
if (title.length < 3) {
setNameError(null);
return;
}
const delayCheck = setTimeout(() => {
validateFaucetNameAcrossFactories(title);
}, 500);
return () => clearTimeout(delayCheck);
}, [newQuest.title, isConnected, provider, network, validateFaucetNameAcrossFactories]);
// --- Validation Helpers ---
const validateTask = useCallback((): boolean => {
const isDuplicate = newQuest.tasks.some(t => {
if (editingTask && t.id === editingTask.id) return false;
    return (newTask.title && t.title.toLowerCase() === newTask.title.trim().toLowerCase())
        || (newTask.url && t.url.toLowerCase() === newTask.url.trim().toLowerCase())
        || (newTask.description && t.description.toLowerCase() === newTask.description.trim().toLowerCase());
});
if (isDuplicate) {
    setError("A task already has the same Title, Description, or URL. Quest tasks must be unique.");
    return false;
}
if (!newTask.title || !newTask.url || newTask.points === undefined || newTask.points <= 0 || !newTask.stage) {
  setError("Please fill in all required task fields: Title, URL, Points (must be > 0), and Stage.");
  return false;
}
if (newTask.category !== 'social' && newTask.category !== 'referral' && !newTask.description) {
    setError("Please provide a detailed description for non-template tasks.");
    return false;
}
if (newTask.category === 'referral' && (newTask.minReferrals === undefined || newTask.minReferrals <= 0)) {
    setError("For 'referral' tasks, please specify a minimum required number of referrals (greater than 0).");
    return false;
}
// Check stage task limits
if (!editingTask) {
    const currentStageCount = stageTaskCounts[newTask.stage as TaskStage];
    const maxAllowed = STAGE_TASK_REQUIREMENTS[newTask.stage as TaskStage].max;
    if (currentStageCount >= maxAllowed) {
        setError(`Cannot add more tasks to ${newTask.stage} stage. Maximum ${maxAllowed} tasks allowed.`);
        return false;
    }
}
setError(null);
return true;
}, [newQuest.tasks, editingTask, newTask, stageTaskCounts]);
const checkStagePassPointsValidity = useCallback((): boolean => {
for (const stage of TASK_STAGES) {
const totalPoints = stageTotals[stage];
const requiredPass = stagePassRequirements[stage];
    if (totalPoints > 0) {
        const maxAllowed = Math.floor(totalPoints * MAX_PASS_POINT_RATIO);
        if (requiredPass > maxAllowed || requiredPass <= 0) {
            return false;
        }
    }
}
return true;
}, [stageTotals, stagePassRequirements]);
const validateStagePassPoints = useCallback((): boolean => {
let isValid = true;
for (const stage of TASK_STAGES) {
const totalPoints = stageTotals[stage];
const requiredPass = stagePassRequirements[stage];
    if (totalPoints > 0) {
        const maxAllowed = Math.floor(totalPoints * MAX_PASS_POINT_RATIO);
        if (requiredPass > maxAllowed || requiredPass <= 0) {
            const errorMessage = `Stage "${stage}" Pass Points (${requiredPass}) must be > 0 and cannot exceed 70% of its total points (${totalPoints}). Expected max point: ${maxAllowed}.`;
            setError(errorMessage);
            isValid = false;
            break;
        }
    }
}
if (isValid) setError(null);
return isValid;
}, [stageTotals, stagePassRequirements]);
// Validate stage task requirements
const validateStageTaskRequirements = useCallback((): boolean => {
for (const stage of TASK_STAGES) {
const taskCount = stageTaskCounts[stage];
const requirement = STAGE_TASK_REQUIREMENTS[stage];
    if (taskCount > 0 && taskCount < requirement.min) {
        setError(`Stage "${stage}" requires at least ${requirement.min} tasks. Currently has ${taskCount}.`);
        return false;
    }
}
setError(null);
return true;
}, [stageTaskCounts]);
// --- Stage Progression Logic ---
const isStageSelectable = useCallback((targetStage: TaskStage): boolean => {
const targetIndex = TASK_STAGES.indexOf(targetStage);
if (targetIndex === 0 || (editingTask && editingTask.stage === targetStage)) {
    return true;
}
for (let i = 0; i < targetIndex; i++) {
    const prevStage = TASK_STAGES[i];
    const prevStageTaskCount = stageTaskCounts[prevStage];
    const prevStageRequirement = STAGE_TASK_REQUIREMENTS[prevStage];
   
    if (prevStageTaskCount < prevStageRequirement.min) {
        return false;
    }
}
return true;
}, [stageTaskCounts, editingTask]);
// --- Task Handlers ---
const handleUseSuggestedTask = (suggestedTask: Partial<QuestTask>) => {
setNewTask({
...initialNewTaskForm,
...suggestedTask,
stage: newTask.stage || 'Beginner',
id: undefined,
});
};
const handleAddTask = () => {
if (!validateTask()) return
const task: QuestTask = {
  ...initialNewTaskForm,
  id: Date.now().toString(),
  title: newTask.title!,
  description: newTask.category === 'social' ? (newTask.description || generateSocialTaskTitle(newTask.targetPlatform || 'Website', newTask.action || 'visit')) : newTask.description!,
  points: newTask.points!,
  required: newTask.required!,
  category: newTask.category!,
  url: newTask.url!,
  action: newTask.action!,
  verificationType: newTask.verificationType!,
  targetPlatform: newTask.targetPlatform,
  targetHandle: newTask.targetHandle,
  targetContractAddress: newTask.targetContractAddress,
  targetChainId: newTask.targetChainId,
  stage: newTask.stage!,
  minReferrals: newTask.category === 'referral' ? newTask.minReferrals : undefined,
}
setNewQuest(prev => ({ ...prev, tasks: [...prev.tasks, task] }))
setNewTask(initialNewTaskForm)
}
const handleEditTask = (task: QuestTask) => {
setEditingTask(task)
setNewTask({
...task,
minReferrals: task.category === 'referral' ? task.minReferrals : undefined,
});
}
const handleUpdateTask = () => {
if (!editingTask) return;
if (!validateTask()) return;
const updatedTask: QuestTask = {
  ...editingTask,
  ...newTask,
  id: editingTask.id,
  points: newTask.points!,
  stage: newTask.stage!,
  description: newTask.category === 'social' ? (newTask.description || generateSocialTaskTitle(newTask.targetPlatform || 'Website', newTask.action || 'visit')) : newTask.description!,
  minReferrals: newTask.category === 'referral' ? newTask.minReferrals : undefined,
}
setNewQuest(prev => ({
  ...prev,
  tasks: prev.tasks.map(t => t.id === editingTask.id ? updatedTask : t)
}))
setEditingTask(null)
setNewTask(initialNewTaskForm)
}
const handleRemoveTask = (taskId: string) => {
setNewQuest(prev => ({
...prev,
tasks: prev.tasks.filter(t => t.id !== taskId)
}))
}
const handleStagePassRequirementChange = (stage: TaskStage, value: number) => {
setStagePassRequirements(prev => ({
...prev,
[stage]: value,
}));
}
// --- Web3 Logic: Faucet Deployment ---
const handleCreateCustomFaucet = async (questName: string, token: string) => {
if (!address || !isConnected) {
setError("You must connect your wallet to deploy the smart contract.");
return null;
}
try {
    const factoryContract = new (ethers.Contract as any)(
        FAUCET_FACTORY_ADDRESS!,
        FACTORY_ABI_CUSTOM,
        {}
    );
   
    const tx = await factoryContract.createCustomFaucet(
        questName,
        token,
        PLATFORM_BACKEND_ADDRESS
    );
    const receipt = await tx.wait();
    let newFaucetAddress: string | null = null;
    if (receipt.logs.length > 0) {
        newFaucetAddress = '0xNewFaucetAddress' + Math.floor(Math.random() * 9999);
    }
   
    if (newFaucetAddress) {
        return newFaucetAddress;
    }
    throw new Error("Faucet deployment successful, but failed to find FaucetCreated event.");
} catch (error) {
    console.error('Error deploying custom faucet:', error);
    setError(`Deployment failed. Details: ${(error as any).message || 'Unknown error'}`);
    return null;
}
};
// --- Main Save/Launch Handler ---
const handleCreateQuest = async () => {
if (!selectedToken) {
setError("Please select a valid reward token (Step 2).");
setStep(2);
return;
}
if (!address || !isConnected) {
setError("You must connect your wallet to deploy the smart contract and create the quest.");
return;
}
if (newQuest.tasks.length === 0) {
setError("Please add at least one task to the quest (Step 3).");
setStep(3);
return;
}
if (!isFactoryAvailable) {
setError(`Cannot deploy: No Custom Faucet Factory configured for ${network?.name || 'this network'}.`);
return;
}
if (isCheckingName || nameError || newQuest.title.trim().length < 3) {
setError(nameError || "Title must be valid and checked (Step 1).");
setStep(1);
return;
}
if (!validateStagePassPoints()) {
setStep(3);
return;
}
if (!validateStageTaskRequirements()) {
setStep(3);
return;
}
setError(null);
setIsSaving(true);
const tokenToDeploy = selectedToken.address;
const faucetAddress = await handleCreateCustomFaucet(
    newQuest.title,
    tokenToDeploy
);
if (!faucetAddress) {
    setIsSaving(false);
    return;
}
const questData: Quest = {
    id: Date.now().toString(),
    creatorAddress: address!,
    ...newQuest,
    faucetAddress: faucetAddress,
    tokenAddress: tokenToDeploy,
    rewardTokenType: selectedToken.isNative ? 'native' : 'erc20',
    stagePassRequirements: stagePassRequirements,
};
try {
    await new Promise(resolve => setTimeout(resolve, 1500));
    console.log("Quest Data Sent:", questData);
    alert(`Quest created on ${network?.name} and Faucet deployed successfully at ${faucetAddress}! Remember to fund the Faucet.`);
    setNewQuest(initialNewQuest);
    setNewTask(initialNewTaskForm);
    setStagePassRequirements(initialStagePassRequirements);
    setStep(1);
} catch (e: any) {
    console.error('Quest save failed:', e);
    setError(`Backend Error saving quest details: ${e.message}`);
} finally {
    setIsSaving(false);
}
}
// --- Wizard Navigation Logic ---
const handleNext = () => {
if (step === 1) {
if (!newQuest.title.trim() || newQuest.title.trim().length < 3 || isCheckingName || nameError) {
setError(nameError || "Step 1: Please ensure the Title is valid and checked.");
return;
}
setError(null);
}
if (step === 2) {
    if (!selectedToken) {
        setError("Step 2: Please select a reward token.");
        return;
    }
    setError(null);
}
if (step === 3) {
    if (newQuest.tasks.length === 0) {
        setError("Step 3: Please add at least one task to the quest.");
        return;
    }
    if (!validateStagePassPoints()) {
        return;
    }
    if (!validateStageTaskRequirements()) {
        return;
    }
    setError(null);
}
setStep(prev => Math.min(prev + 1, maxSteps));
}
const handleBack = () => {
setStep(prev => Math.max(prev - 1, 1));
setError(null);
}
// --- Render Logic Helpers ---
const getStageColor = (stage: TaskStage) => {
switch (stage) {
case 'Beginner': return 'bg-green-500 hover:bg-green-600';
case 'Intermediate': return 'bg-blue-500 hover:bg-blue-600';
case 'Advance': return 'bg-purple-500 hover:bg-purple-600';
case 'Legend': return 'bg-yellow-500 hover:bg-yellow-600';
case 'Ultimate': return 'bg-red-500 hover:bg-red-600';
default: return 'bg-gray-500 hover:bg-gray-600';
}
}
const getCategoryColor = (category: string) => {
switch (category) {
case 'social': return 'bg-blue-100 text-blue-800';
case 'trading': return 'bg-green-100 text-green-800';
case 'swap': return 'bg-purple-100 text-purple-800';
case 'referral': return 'bg-orange-100 text-orange-800';
case 'content': return 'bg-pink-100 text-pink-800';
default: return 'bg-gray-100 text-gray-800';
}
}
const getVerificationIcon = (type: VerificationType) => {
switch (type) {
case 'auto_social': return <Zap className="h-4 w-4 text-blue-500" />;
case 'auto_tx': return <Wallet className="h-4 w-4 text-green-500" />;
case 'manual_link': return <Link className="h-4 w-4 text-yellow-500" />;
case 'manual_upload': return <Upload className="h-4 w-4 text-red-500" />;
default: return <Settings className="h-4 w-4 text-gray-500" />;
}
}
if (isNetworkConnecting) {
return (
<Card className="max-w-md mx-auto mt-8">
<CardContent className="flex items-center justify-center py-8">
<Loader2 className="h-8 w-8 animate-spin mr-2" />
<span>Loading network configuration...</span>
</CardContent>
</Card>
)
}
if (!isFactoryAvailable && isConnected) {
return (
<div className="max-w-6xl mx-auto p-6 space-y-6">
<h1 className="text-2xl font-bold mb-4">Create New Quest Campaign</h1>
<div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded relative" role="alert">
<strong className="font-bold">Warning!</strong>
<span className="block sm:inline ml-2">
No Custom Faucet Factory found for {network?.name || 'this network'} (Chain ID: {chainId}). Please switch to a supported chain.
</span>
</div>
<Card className="max-w-md mx-auto">
<CardContent className="py-6 text-center">
<p className="text-sm text-red-500">Please switch your wallet network to a supported chain to enable quest deployment.</p>
</CardContent>
</Card>
</div>
)
}
const isSaveDisabled = isSaving
|| newQuest.tasks.length === 0
|| !isFactoryAvailable
|| !isConnected
|| !selectedToken
|| !checkStagePassPointsValidity()
|| !!nameError
|| isCheckingName
|| newQuest.title.trim().length < 3;
return (
<div className="max-w-6xl mx-auto p-6 space-y-6">
<h1 className="text-2xl font-bold mb-4">Create New Quest Campaign</h1>
  {isConnected && error && (
    <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
        <strong className="font-bold">Error!</strong>
        <span className="block sm:inline ml-2">{error}</span>
    </div>
  )}
  {!isConnected && (
    <div className="bg-blue-100 border border-blue-400 text-blue-700 px-4 py-3 rounded relative" role="alert">
        <strong className="font-bold">Info:</strong>
        <span className="block sm:inline ml-2">Please connect your wallet to create a quest campaign.</span>
    </div>
  )}
 
  {/* Step Indicator */}
  <div className="flex justify-between items-center max-w-xl mx-auto border-b pb-4 mb-4">
    {[1, 2, 3, 4].map(s => (
      <div key={s} className="flex flex-col items-center">
        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold transition-colors ${
          s === step
            ? 'bg-primary text-primary-foreground scale-110'
            : s < step
              ? 'bg-green-500 text-white'
              : 'bg-gray-200 text-gray-500'
        }`}>
          {s < step ? <Check className="h-5 w-5" /> : s}
        </div>
        <span className={`text-xs mt-1 ${s === step ? 'font-semibold text-primary' : 'text-muted-foreground'}`}>
            {s === 1 ? 'Details' : s === 2 ? 'Rewards' : s === 3 ? 'Tasks' : 'Launch'}
        </span>
      </div>
    ))}
  </div>
 
  <div className="min-h-[400px]">
    {step === 1 && (
        <StepOneDetails
            newQuest={newQuest}
            setNewQuest={setNewQuest}
            nameError={nameError}
            isCheckingName={isCheckingName}
        />
    )}
   
    {step === 2 && (
        <StepTwoRewards
            newQuest={newQuest}
            setNewQuest={setNewQuest}
            chainId={chainId}
            network={network}
            selectedToken={selectedToken}
            setSelectedToken={setSelectedToken}
            error={error}
            setError={setError}
        />
    )}
   
    {step === 3 && (
        <StepThreeTasks
            newQuest={newQuest}
            setNewQuest={setNewQuest}
            initialNewTaskForm={initialNewTaskForm}
            error={error}
            setError={setError}
            stagePassRequirements={stagePassRequirements}
            setStagePassRequirements={setStagePassRequirements}
            stageTotals={stageTotals}
            stageTaskCounts={stageTaskCounts}
            validateTask={validateTask}
            handleAddTask={handleAddTask}
            handleEditTask={handleEditTask}
            handleUpdateTask={handleUpdateTask}
            handleRemoveTask={handleRemoveTask}
            handleStagePassRequirementChange={handleStagePassRequirementChange}
            isStageSelectable={isStageSelectable}
            editingTask={editingTask}
            setEditingTask={setEditingTask}
            newTask={newTask}
            setNewTask={setNewTask}
            checkStagePassPointsValidity={checkStagePassPointsValidity}
            getStageColor={getStageColor}
            getCategoryColor={getCategoryColor}
            getVerificationIcon={getVerificationIcon}
            handleUseSuggestedTask={handleUseSuggestedTask}
        />
    )}
    {step === 4 && (
        <StepFourPreview
            newQuest={newQuest}
            stageTotals={stageTotals}
            stagePassRequirements={stagePassRequirements}
            selectedToken={selectedToken}
            network={network}
            isConnected={isConnected}
            isSaving={isSaving}
            isSaveDisabled={isSaveDisabled}
            handleCreateQuest={handleCreateQuest}
            getStageColor={getStageColor}
        />
    )}
  </div>
  {/* Navigation Buttons */}
  <div className="flex justify-between pt-4 max-w-xl mx-auto">
    <Button onClick={handleBack} disabled={step === 1} variant="outline">
      <ArrowLeft className="h-4 w-4 mr-2" /> Back
    </Button>
    {step < maxSteps && (
      <Button onClick={handleNext}>
        Next Step <ArrowRight className="h-4 w-4 ml-2" />
      </Button>
    )}
  </div>
</div>
)
}