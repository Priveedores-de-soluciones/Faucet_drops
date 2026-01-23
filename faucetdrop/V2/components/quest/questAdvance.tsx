"use client"

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation' // <--- 1. IMPORT ROUTER
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
    LayoutList, GripVertical, Percent, ShieldAlert, CalendarClock, Users
} from "lucide-react"
import { useWallet } from "@/hooks/use-wallet"
import { BrowserProvider } from 'ethers'
import { createQuestReward, type Network } from "@/lib/faucet"
import { ZeroAddress } from 'ethers'

const networks: Network[] = [
    {
        name: "Celo", symbol: "CELO", chainId: BigInt(42220), rpcUrl: "https://forno.celo.org", blockExplorer: "https://celoscan.io", color: "#35D07F", logoUrl: "/celo.png", iconUrl: "/celo.png",
        factoryAddresses: ["0x17cFed7fEce35a9A71D60Fbb5CA52237103A21FB", "0x8cA5975Ded3B2f93E188c05dD6eb16d89b14aeA5"],
        factories: { quest: "0x8cA5975Ded3B2f93E188c05dD6eb16d89b14aeA5" }, tokenAddress: "0x471EcE3750Da237f93B8E339c536989b8978a438", nativeCurrency: { name: "Celo", symbol: "CELO", decimals: 18 }, isTestnet: false,
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
    }
]
// ==== CONSTANTS & TYPES ====
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

export type VerificationType = 'auto_social' | 'auto_tx' | 'manual_link' | 'manual_upload' | 'system_referral' | 'system_daily' | 'none'

export type SocialPlatform = 'Twitter' | 'Facebook' | 'Tiktok' | 'Youtube' | 'Discord' | 'Thread' | 'Linkedin' | 'Farcaster' | 'Instagram' | 'Website'
const SOCIAL_PLATFORMS: SocialPlatform[] = ['Twitter', 'Facebook', 'Tiktok', 'Youtube', 'Discord', 'Thread', 'Linkedin', 'Farcaster', 'Instagram', 'Website']
const SOCIAL_ACTIONS = ['follow', 'retweet', 'like', 'join', 'subscribe', 'visit']

export interface QuestTask {
    id: string
    title: string
    description: string
    points: number | string
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

// Suggested tasks
const SUGGESTED_TASKS_BY_STAGE: Record<TaskStage, Array<Partial<QuestTask>>> = {
    Beginner: [
        { title: "Visit our Website", category: "social", action: "visit", targetPlatform: "Website", points: 30, verificationType: "manual_link" },
        { title: "Follow us on Twitter", category: "social", action: "follow", targetPlatform: "Twitter", points: 50, verificationType: "manual_link" },
        { title: "Join our Discord Server", category: "social", action: "join", targetPlatform: "Discord", points: 50, verificationType: "manual_link" },
    ],
    Intermediate: [
        { title: "Refer 3 Friends", category: "referral", minReferrals: 3, points: 150, verificationType: "manual_link" },
        { title: "Create Tutorial Video", category: "content", action: "upload", points: 200, verificationType: "manual_upload", description: "Upload video file AND share link" },
    ],
    Advance: [
        { title: "Execute Swap", category: "swap", action: "swap", points: 200, verificationType: "auto_tx" },
    ],
    Legend: [
        { title: "Refer 10 Active Users", category: "referral", minReferrals: 10, points: 500, verificationType: "manual_link" },
    ],
    Ultimate: [
        { title: "Become Ambassador", category: "general", points: 1000, verificationType: "manual_link", description: "Complete all requirements and apply for ambassador role" },
    ],
}

const generateSocialTaskTitle = (platform: string | undefined, action: string | undefined): string => {
    if (!platform || !action) return ""
    const actionMap: Record<string, string> = {
        follow: 'Follow', retweet: 'Retweet/Share', like: 'Like', join: 'Join', subscribe: 'Subscribe to', visit: 'Visit',
    }
    const capitalizedAction = actionMap[action] || action.charAt(0).toUpperCase() + action.slice(1)
    return `${capitalizedAction} our ${platform}`
}

interface Phase2Props {
    newQuest: any
    setNewQuest: React.Dispatch<React.SetStateAction<any>>
    stagePassRequirements: StagePassRequirements
    setStagePassRequirements: React.Dispatch<React.SetStateAction<StagePassRequirements>>
    stageTotals: Record<TaskStage, number>
    stageTaskCounts: Record<TaskStage, number>
    initialNewTaskForm: Partial<QuestTask>
    validateTask: () => boolean
    handleAddTask: (task: QuestTask) => void
    handleEditTask: (task: QuestTask) => void
    handleUpdateTask: () => void
    handleRemoveTask: (taskId: string) => void
    handleStagePassRequirementChange: (stage: TaskStage, value: number) => void
    getStageColor: (stage: TaskStage) => string
    getCategoryColor: (category: string) => string
    getVerificationIcon: (type: VerificationType) => React.ReactNode
    handleUseSuggestedTask: (suggestedTask: Partial<QuestTask>) => void
    isFinalizing: boolean
    setError: React.Dispatch<React.SetStateAction<string | null>>
    handleFinalize: (finalAddress?: string) => Promise<void>
}
const BACKEND_WALLET_ADDRESS = "0x9fBC2A0de6e5C5Fd96e8D11541608f5F328C0785"
// ==== SYSTEM TASKS DEFINITION ====
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
    handleUseSuggestedTask,
    isFinalizing,
    setError,
    handleFinalize
}: Phase2Props) {
    const { isConnected, chainId } = useWallet()
    const router = useRouter() // <--- 2. INITIALIZE ROUTER
    const [newTask, setNewTask] = useState<Partial<QuestTask>>(initialNewTaskForm)
    const [editingTask, setEditingTask] = useState<QuestTask | null>(null)
    const [isDeploying, setIsDeploying] = useState(false)

    useEffect(() => {
        setNewTask(initialNewTaskForm)
    }, [initialNewTaskForm])

    // ✅ INJECT SYSTEM TASKS AUTOMATICALLY
    useEffect(() => {
        setNewQuest((prev: any) => {
            const existingIds = new Set(prev.tasks.map((t: QuestTask) => t.id));
            const tasksToAdd = SYSTEM_TASKS.filter(st => !existingIds.has(st.id));

            if (tasksToAdd.length > 0) {
                return {
                    ...prev,
                    tasks: [...prev.tasks, ...tasksToAdd]
                };
            }
            return prev;
        });
    }, [setNewQuest]);

    // ✅ AUTO-CALCULATE 70% REQUIREMENT
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

    // ==== DEPLOYMENT LOGIC ====
    const handleDeployAndFinalize = async () => {
        setIsDeploying(true)
        setError(null)
        try {
            if (!isConnected) throw new Error("Wallet not connected")
            
            const hasReferral = newQuest.tasks.some((t: QuestTask) => t.id === 'sys_referral');
            const hasCheckin = newQuest.tasks.some((t: QuestTask) => t.id === 'sys_daily');
            
            if (!hasReferral || !hasCheckin) {
                throw new Error("System tasks (Referral/Daily) are missing. Please refresh.");
            }

            const currentNetwork = networks.find(n => n.chainId === BigInt(chainId || 0))
            // IMPORTANT: Check for 'quest' factory, not 'custom'
            if (!currentNetwork || !currentNetwork.factories?.quest) {
                throw new Error("Unsupported network or missing Quest Factory address")
            }

            // Convert Date Strings to Unix Timestamps
            const startDate = new Date(`${newQuest.startDate}T${newQuest.startTime}:00`).getTime() / 1000;
            const endDate = new Date(`${newQuest.endDate}T${newQuest.endTime}:00`).getTime() / 1000;
            const claimWindow = parseInt(newQuest.claimWindowHours || "168");

            const provider = new BrowserProvider((window as any).ethereum)
            
            // 🚀 CALLING THE NEW CONTRACT FUNCTION
            // Ensure createCustomFaucet (or createQuestReward) in lib/faucet.ts 
            // accepts these new parameters!
            
            const deployedAddress = await createQuestReward(
            provider,
            currentNetwork.factories.quest!, 
            newQuest.title.trim(),
            newQuest.tokenAddress,
            endDate,       // 5. Quest End Time
            claimWindow,   // 6. Claim Window Hours
            BACKEND_WALLET_ADDRESS // <--- 7. NEW: The missing argument
);

            setNewQuest((prev: any) => ({ ...prev, faucetAddress: deployedAddress }))
            
            // Wait for backend finalization
            await handleFinalize(deployedAddress)

            // <--- UPDATED ROUTING LOGIC --->
            const slug = newQuest.title
                .toLowerCase()
                .trim()
                .replace(/[^a-z0-9]+/g, '-')
                .replace(/^-+|-+$/g, '');

            const targetUrl = slug 
                ? `/quest/${slug}-${deployedAddress}` 
                : `/quest/${deployedAddress}`;

            router.push(targetUrl); 

        } catch (e: any) {
            console.error(e)
            setError(e.message || "Deployment failed")
            setIsDeploying(false) 
        } 
    }

    // Logic extracted from StepThreeTasks
    const isSocialOrReferral = newTask.category === 'social' || newTask.category === 'referral'
    const isTrading = newTask.category === 'trading' || newTask.category === 'swap'
    const isSocialTemplate = newTask.category === 'social'
    const availableCategories = ['social', 'trading', 'swap', 'referral', 'content', 'general']
    const suggestedTasks = SUGGESTED_TASKS_BY_STAGE[newTask.stage || 'Beginner'] || []

    const handleUseSuggestedTaskInternal = (suggestion: Partial<QuestTask>) => {
        setNewTask(prev => ({
            ...prev,
            ...suggestion,
            stage: suggestion.stage || prev.stage
        }))
    }

    const isStageUnlocked = (targetStage: TaskStage): boolean => {
        if (!enforceRules) return true;
        if (editingTask && editingTask.stage === targetStage) return true;
        const targetIndex = TASK_STAGES.indexOf(targetStage);
        if (targetIndex === 0) return true;
        for (let i = 0; i < targetIndex; i++) {
            const prevStage = TASK_STAGES[i];
            const prevCount = stageTaskCounts[prevStage];
            const minRequired = STAGE_TASK_REQUIREMENTS[prevStage].min;
            if (prevCount < minRequired) return false;
        }
        return true;
    }

    const currentStage = newTask.stage || 'Beginner';
    const currentStageReq = STAGE_TASK_REQUIREMENTS[currentStage];
    const currentStageCount = stageTaskCounts[currentStage];
    const isAtMax = enforceRules && currentStageCount >= currentStageReq.max;

    return (
        <div className="space-y-10 max-w-7xl mx-auto py-8 px-4">
            
            {/* Step 3: Timing */}
            <Card className="border-border/50 shadow-sm bg-card">
                <CardHeader className="pb-4">
                    <CardTitle className="text-xl flex items-center gap-2">
                        <Clock className="h-5 w-5 text-blue-500" /> Campaign Timing
                    </CardTitle>
                    <CardDescription>
                        Define the start, end, and claim duration for your quest.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <Label className="flex items-center gap-2 text-muted-foreground">
                                Start Date & Time
                            </Label>
                            <div className="flex gap-2">
                                <Input type="date" className="bg-background/50" value={newQuest.startDate || ""} onChange={(e) => setNewQuest((prev: any) => ({ ...prev, startDate: e.target.value }))} />
                                <Input type="time" className="bg-background/50" value={newQuest.startTime || ""} onChange={(e) => setNewQuest((prev: any) => ({ ...prev, startTime: e.target.value }))} />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label className="flex items-center gap-2 text-muted-foreground">
                                End Date & Time
                            </Label>
                            <div className="flex gap-2">
                                <Input type="date" className="bg-background/50" value={newQuest.endDate || ""} onChange={(e) => setNewQuest((prev: any) => ({ ...prev, endDate: e.target.value }))} />
                                <Input type="time" className="bg-background/50" value={newQuest.endTime || ""} onChange={(e) => setNewQuest((prev: any) => ({ ...prev, endTime: e.target.value }))} />
                            </div>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label className="text-muted-foreground">Claim Window (hours after end)</Label>
                        <div className="flex items-center gap-4">
                            <Input
                                type="number"
                                min="1"
                                className="max-w-[200px] bg-background/50"
                                placeholder="168"
                                value={newQuest.claimWindowHours || ""}
                                onChange={(e) => setNewQuest((prev: any) => ({ ...prev, claimWindowHours: e.target.value }))}
                            />
                            <span className="text-xs text-muted-foreground">
                                Typically 168 hours (7 days)
                            </span>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Step 3: Tasks */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* LEFT: Task Form (Takes 7 columns) */}
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
                            {/* Rules Toggle */}
                            <div className="flex items-start gap-3 p-3 border rounded-lg bg-muted/40">
                                <Switch
                                    className="mt-1"
                                    checked={enforceRules}
                                    onCheckedChange={(checked) => setNewQuest((prev: any) => ({ ...prev, enforceStageRules: checked }))}
                                />
                                <div>
                                    <Label className="font-semibold text-sm">Strict Progression Mode</Label>
                                    <p className="text-xs text-muted-foreground">
                                        {enforceRules
                                            ? "Enforces minimum tasks per stage before unlocking the next."
                                            : "Free mode: Add tasks to any stage in any order."}
                                    </p>
                                </div>
                            </div>

                            {/* Dropdowns */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label className="text-xs font-medium uppercase text-muted-foreground">Target Stage</Label>
                                    <Select
                                        value={newTask.stage || "Beginner"}
                                        onValueChange={(v: TaskStage) => setNewTask(prev => ({ ...prev, stage: v }))}
                                        disabled={!!editingTask?.isSystem}
                                    >
                                        <SelectTrigger className="bg-background"><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            {TASK_STAGES.map(stage => {
                                                const unlocked = isStageUnlocked(stage)
                                                return (
                                                    <SelectItem key={stage} value={stage} disabled={enforceRules && !unlocked}>
                                                        <div className="flex items-center gap-2">
                                                            {enforceRules && !unlocked ? <Lock className="h-3 w-3 text-muted-foreground" /> : null}
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
                                    <Select
                                        value={newTask.category}
                                        onValueChange={(v: any) => setNewTask(prev => ({ ...prev, category: v, minReferrals: undefined }))}
                                        disabled={!!editingTask?.isSystem}
                                    >
                                        <SelectTrigger className="bg-background"><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            {availableCategories.map(cat => <SelectItem key={cat} value={cat}>{cat.charAt(0).toUpperCase() + cat.slice(1)}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            {/* Quick Add Suggestions */}
                            {suggestedTasks.length > 0 && !editingTask && (
                                <div className="space-y-2">
                                    <Label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                                        <Zap className="h-3 w-3 text-yellow-500" /> Quick Add for {newTask.stage}
                                    </Label>
                                    <div className="flex flex-wrap gap-2">
                                        {suggestedTasks.map((suggestion, i) => (
                                            <Button
                                                key={i}
                                                variant="secondary"
                                                size="sm"
                                                className="text-xs h-7 bg-muted/50 hover:bg-muted"
                                                onClick={() => handleUseSuggestedTaskInternal(suggestion)}
                                            >
                                                <Plus className="h-3 w-3 mr-1" />
                                                {suggestion.title}
                                            </Button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div className="space-y-2">
                                <Label className="text-xs font-medium uppercase text-muted-foreground">Task Details</Label>
                                {isSocialTemplate ? (
                                    <div className="p-3 border border-blue-500/20 rounded-lg bg-blue-500/10 space-y-3">
                                        <div className="grid grid-cols-2 gap-3">
                                            <div className="space-y-1">
                                                <Label className="text-xs text-blue-400">Platform</Label>
                                                <Select
                                                    value={newTask.targetPlatform}
                                                    onValueChange={(v: SocialPlatform) => setNewTask(prev => ({
                                                        ...prev, targetPlatform: v,
                                                        title: prev.action ? generateSocialTaskTitle(v, prev.action) : prev.title
                                                    }))}
                                                >
                                                    <SelectTrigger className="h-8 bg-background border-blue-500/30"><SelectValue placeholder="Select" /></SelectTrigger>
                                                    <SelectContent>{SOCIAL_PLATFORMS.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                                                </Select>
                                            </div>
                                            <div className="space-y-1">
                                                <Label className="text-xs text-blue-400">Action</Label>
                                                <Select
                                                    value={newTask.action}
                                                    onValueChange={(v) => setNewTask(prev => ({
                                                        ...prev, action: v,
                                                        title: prev.targetPlatform ? generateSocialTaskTitle(prev.targetPlatform, v) : prev.title
                                                    }))}
                                                >
                                                    <SelectTrigger className="h-8 bg-background border-blue-500/30"><SelectValue placeholder="Select" /></SelectTrigger>
                                                    <SelectContent>{SOCIAL_ACTIONS.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}</SelectContent>
                                                </Select>
                                            </div>
                                        </div>
                                        <Input value={newTask.title || ""} disabled className="h-8 bg-background/50 border-blue-500/30 text-sm font-medium" />
                                    </div>
                                ) : (
                                    <Input
                                        className="bg-background"
                                        placeholder="Task Title (e.g., Join Telegram Group)"
                                        value={newTask.title || ""}
                                        onChange={(e) => setNewTask(prev => ({ ...prev, title: e.target.value }))}
                                        disabled={!!editingTask?.isSystem}
                                    />
                                )}
                            </div>

                            {/* Points & URL Row */}
                            <div className="grid grid-cols-3 gap-4">
                                <div className="space-y-2">
                                    <Label className="text-xs font-medium uppercase text-muted-foreground">Points</Label>
                                    <Input
                                        type="number"
                                        className="bg-background"
                                        value={newTask.points ?? ""}
                                        onChange={(e) => setNewTask(prev => ({ ...prev, points: e.target.value }))}
                                        disabled={!!editingTask?.isSystem}
                                    />
                                </div>
                                <div className="col-span-2 space-y-2">
                                    <Label className="text-xs font-medium uppercase text-muted-foreground">Action URL (Optional)</Label>
                                    <Input
                                        className="bg-background"
                                        placeholder="https://..."
                                        value={newTask.url ?? ""}
                                        onChange={(e) => setNewTask(prev => ({ ...prev, url: e.target.value }))}
                                        disabled={!!editingTask?.isSystem}
                                    />
                                </div>
                            </div>

                            {/* Verification Select */}
                            <div className="space-y-2">
                                <Label className="text-xs font-medium uppercase text-muted-foreground">Verification Method</Label>
                                <Select 
                                    value={newTask.verificationType || "manual_link"} 
                                    onValueChange={(v: VerificationType) => setNewTask(prev => ({ ...prev, verificationType: v }))}
                                    disabled={!!editingTask?.isSystem}
                                >
                                    <SelectTrigger className="bg-background"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="auto_social" disabled={!isSocialOrReferral}>Auto (Social API)</SelectItem>
                                        <SelectItem value="auto_tx" disabled={!isTrading}>Auto (Blockchain Tx)</SelectItem>
                                        <SelectItem value="manual_link">Manual (Link Only)</SelectItem>
                                        <SelectItem value="manual_upload">Manual Review (Image & Link Required)</SelectItem>
                                        <SelectItem value="system_referral" disabled>System Referral (Auto)</SelectItem>
                                        <SelectItem value="system_daily" disabled>System Daily Check-in (Auto)</SelectItem>
                                        <SelectItem value="none">None (Click to Complete)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Add Button */}
                            <div className="pt-2 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Switch 
                                        id="req" 
                                        checked={newTask.required} 
                                        onCheckedChange={(c) => setNewTask(prev => ({ ...prev, required: c }))} 
                                        disabled={!!editingTask?.isSystem}
                                    />
                                    <Label htmlFor="req" className="text-sm text-muted-foreground">Mandatory Task</Label>
                                </div>
                                <div className="flex gap-2">
                                    {editingTask && <Button variant="ghost" onClick={() => { setEditingTask(null); setNewTask(initialNewTaskForm); }}>Cancel</Button>}
                                    {editingTask?.isSystem ? (
                                        <div className="flex items-center gap-2 text-xs text-yellow-600 bg-yellow-500/10 px-3 py-2 rounded">
                                            <ShieldAlert className="h-4 w-4" /> System tasks cannot be edited.
                                        </div>
                                    ) : (
                                        <Button
                                            onClick={editingTask ? () => { handleUpdateTask(); setEditingTask(null); setNewTask(initialNewTaskForm); } : () => { handleAddTask(newTask as QuestTask); setNewTask(initialNewTaskForm); }}
                                            disabled={!newTask.title || !newTask.points || (enforceRules && !editingTask && isAtMax)}
                                        >
                                            {editingTask ? "Save Changes" : <><Plus className="mr-2 h-4 w-4" /> Add Task</>}
                                        </Button>
                                    )}
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* RIGHT: Stage Tree & List */}
                <div className="lg:col-span-5 flex flex-col h-full gap-6">
                    <Card className="flex-1 border-border/50 shadow-sm bg-card flex flex-col">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-lg flex items-center justify-between">
                                <span className="flex items-center gap-2"><Trophy className="h-5 w-5 text-yellow-500" /> Stages</span>
                                <Badge variant="outline" className="font-normal">{newQuest.tasks.length} Tasks Total</Badge>
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
                                                    <h4 className={`text-sm font-semibold ${isLocked ? 'text-muted-foreground' : 'text-foreground'}`}>
                                                        {stage}
                                                    </h4>
                                                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
                                                        {count} Tasks • {totalPoints} Pts
                                                    </p>
                                                </div>
                                                {isLocked ? <Lock className="h-4 w-4 text-muted-foreground/50" /> : <Unlock className="h-4 w-4 text-green-500" />}
                                            </div>

                                            <div className="flex items-center justify-between mt-2 pt-2 border-t border-border/50">
                                                <Label className="text-[10px] whitespace-nowrap text-muted-foreground flex items-center gap-1">
                                                    <Percent className="h-3 w-3" /> Pass Requirement (70%)
                                                </Label>
                                                <div className="flex items-center gap-2">
                                                    <Badge variant="outline" className="font-mono text-xs bg-muted/30">
                                                        {reqPass} Pts
                                                    </Badge>
                                                    <Lock className="h-3 w-3 text-muted-foreground/40" />
                                                </div>
                                            </div>
                                        </div>

                                        <div className="space-y-1.5">
                                            {stageTasks.map((t: QuestTask) => (
                                                <div key={t.id} className={`group flex items-center justify-between p-2 rounded border transition-all ${t.isSystem ? 'bg-blue-50/50 border-blue-100 dark:bg-blue-900/10 dark:border-blue-900/30' : 'bg-muted/20 hover:bg-muted/40 border-transparent hover:border-border/50'}`}>
                                                    <div className="flex items-center gap-2 overflow-hidden">
                                                        {t.isSystem ? (
                                                            t.isRecurring ? <CalendarClock className="h-3 w-3 text-blue-500" /> : <Users className="h-3 w-3 text-blue-500" />
                                                        ) : (
                                                            <GripVertical className="h-3 w-3 text-muted-foreground/30" />
                                                        )}
                                                        <span className={`text-xs truncate text-foreground/90 ${t.required ? 'font-medium' : ''}`}>
                                                            {t.title}
                                                        </span>
                                                        {t.required && <Badge variant="destructive" className="h-1.5 w-1.5 rounded-full p-0" />}
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-[10px] font-mono text-muted-foreground">{t.points}</span>
                                                        <div className="opacity-0 group-hover:opacity-100 flex gap-1 transition-opacity">
                                                            {t.isSystem ? (
                                                                <Lock className="h-3 w-3 text-muted-foreground" />
                                                            ) : (
                                                                <>
                                                                    <Button size="icon" variant="ghost" className="h-5 w-5" onClick={() => { setEditingTask(t); setNewTask(t); }}>
                                                                        <Settings className="h-3 w-3 text-muted-foreground" />
                                                                    </Button>
                                                                    <Button size="icon" variant="ghost" className="h-5 w-5 hover:bg-red-500/10 text-destructive" onClick={() => handleRemoveTask(t.id)}>
                                                                        <Trash2 className="h-3 w-3" />
                                                                    </Button>
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

            <div className="flex justify-center pt-8 border-t border-border/50">
                <Button size="lg" className="w-full sm:w-auto min-w-[200px]" onClick={handleDeployAndFinalize} disabled={isFinalizing || isDeploying || newQuest.tasks.length === 0}>
                    {isDeploying ? (
                        <>
                            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                            Creating Quest...
                        </>
                    ) : isFinalizing ? (
                        "Saving to Server..."
                    ) : (
                        <>
                            <Rocket className="mr-2 h-5 w-5" />
                            Create & Finalize Quest
                        </>
                    )}
                </Button>
            </div>
        </div>
    )
}