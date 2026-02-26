"use client"

import React, { useState, useMemo, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Header } from "@/components/header"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { toast } from 'sonner'
import { Sparkles, ShieldAlert, ChevronLeft, CheckCircle2, ArrowRight, LayoutDashboard, Loader2 } from "lucide-react"

import Phase1QuestDetailsRewards, { 
    type QuestData, 
    type TokenConfiguration 
} from '@/components/quest/questBasic'

import Phase2TimingTasksFinalize, { 
    type TaskStage, 
    type QuestTask, 
    type VerificationType 
} from '@/components/quest/questAdvance'

import { useWallet } from "@/hooks/use-wallet"

interface UserProfile {
    wallet_address: string;
    username: string | null;
    avatar_url?: string;
}

const API_BASE_URL = "https://fauctdrop-backend.onrender.com"

// Helper to decode errors
const getUserFriendlyError = (error: any): string => {
    if (!error) return "An unexpected error occurred.";
    
    // Convert error to string for checking
    const msg = (typeof error === 'string' ? error : error.message || JSON.stringify(error)).toLowerCase();

    // 1. User Rejection
    if (msg.includes("rejected") || msg.includes("4001") || msg.includes("denied")) {
        return "Transaction cancelled. You declined the wallet request.";
    }

    // 2. Gas / Funds Issues
    if (msg.includes("insufficient funds") || msg.includes("exceeds balance")) {
        return "Insufficient funds. You don't have enough ETH/Native Token for gas fees.";
    }
    if (msg.includes("intrinsic gas too low") || msg.includes("gas limit")) {
        return "Gas estimation failed. The network might be busy or the transaction is complex.";
    }

    // 3. Network / Connection
    if (msg.includes("network") || msg.includes("disconnected") || msg.includes("provider")) {
        return "Connection lost. Please check your internet or wallet network.";
    }

    // 4. Contract Logic
    if (msg.includes("execution reverted")) {
        return "Transaction failed on-chain. The contract rejected the request.";
    }

    // 5. Fallback: Return the raw message if it's short, otherwise generic
    return msg.length < 100 ? error.message || error : "Something went wrong. Please try again.";
};
// ==== 1. DEFINE SYSTEM TASKS HERE (Moved from Phase 2) ====
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
    id: 'sys_share_quest_x',
    title: 'Share Quest on X',
    description: 'Share this quest page on X with @FaucetDrops and your referral link to earn points.',
    points: 20,
    required: false,
    category: 'social',
    url: '',                           // ← intentionally empty
    action: 'share_quest',             // ← new distinct action
    verificationType: 'manual_link',
    stage: 'Beginner',
    isSystem: true,
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

// Extended Interface
interface FullQuestState extends QuestData {
    tasks: QuestTask[]
    startDate?: string
    startTime?: string
    endDate?: string
    endTime?: string
    claimWindowHours?: string
    enforceStageRules?: boolean
}

// Initial State
const initialNewQuest: FullQuestState = {
    title: "",
    description: "",
    imageUrl: "https://placehold.co/1280x1280/3b82f6/ffffff?text=Quest+Logo",
    rewardPool: "",
    distributionConfig: { model: 'equal', totalWinners: 100, tiers: [] },
    tasks: [], // Starts empty, but Effect below will fill it
    startDate: "",
    startTime: "",
    endDate: "",
    endTime: "",
    claimWindowHours: "168",
    enforceStageRules: false
}

const initialNewTaskForm: Partial<QuestTask> = {
    stage: 'Beginner',
    category: 'social',
    verificationType: 'manual_link',
    points: 10,
    required: false
}

const initialStagePassRequirements = {
    Beginner: 0, Intermediate: 0, Advance: 0, Legend: 0, Ultimate: 0
}

function QuestCreatorContent() {
    const { isConnected, address } = useWallet()
    const router = useRouter()
    const searchParams = useSearchParams()
    
    // Check if we are editing a draft
    const draftId = searchParams.get('draftId')

    // ✅ State Definitions (All inside the function)
    const [userProfile, setUserProfile] = useState<UserProfile | null>(null); // <--- FIXED
    const [isLoadingDraft, setIsLoadingDraft] = useState(false)
    const [phase, setPhase] = useState(1)
    const [error, setError] = useState<string | null>(null)
    const [newQuest, setNewQuest] = useState<FullQuestState>(initialNewQuest)
    
    // Phase 1 State
    const [selectedToken, setSelectedToken] = useState<TokenConfiguration | null>(null)
    const [nameError, setNameError] = useState<string | null>(null)
    const [isCheckingName, setIsCheckingName] = useState(false)
    const [isUploadingImage, setIsUploadingImage] = useState(false)
    const [uploadImageError, setUploadImageError] = useState<string | null>(null)
    const [isSavingDraft, setIsSavingDraft] = useState(false)

    // Phase 2 State
    const [stagePassRequirements, setStagePassRequirements] = useState(initialStagePassRequirements)
    const [isFinalizing, setIsFinalizing] = useState(false)
    const [showDraftSuccessModal, setShowDraftSuccessModal] = useState(false)

    // Add this EFFECT to fetch the profile
    useEffect(() => {
        if (!address) return;

        const fetchProfile = async () => {
            try {
                // Replace this URL with your actual API endpoint for user profiles
                const res = await fetch(`${API_BASE_URL}/api/users/${address}`);
                if (res.ok) {
                    const data = await res.json();
                    setUserProfile(data); // <--- This updates the state!
                }
            } catch (e) {
                console.error("Failed to fetch user profile", e);
            }
        };

        fetchProfile();
    }, [address]);

    // Error Handling Effect
    useEffect(() => {
        if (error) {
            const friendlyMsg = getUserFriendlyError(error);
            toast.error(friendlyMsg);
            setError(null);
        }
    }, [error]);

    // ==== 2. INJECT SYSTEM TASKS ON MOUNT ====
    // This ensures they exist for Phase 1 Drafts AND Phase 2
    useEffect(() => {
        setNewQuest((prev) => {
            const currentTasks = prev.tasks || [];
            const existingIds = new Set(currentTasks.map((t) => t.id));
            
            // Only add system tasks if they are missing (prevents duplicates)
            const tasksToAdd = SYSTEM_TASKS.filter(st => !existingIds.has(st.id));

            if (tasksToAdd.length > 0) {
                return {
                    ...prev,
                    tasks: [...currentTasks, ...tasksToAdd]
                };
            }
            return prev;
        });
    }, []); 

    // --- EFFECT: Load Draft if draftId exists ---
   useEffect(() => {
        if (!draftId) return

        const fetchDraft = async () => {
            setIsLoadingDraft(true)
            try {
                const res = await fetch(`${API_BASE_URL}/api/quests/${draftId}`)
                const data = await res.json()

                if (data.success && data.quest) {
                    const q = data.quest
                    
                    const titleVal = q.title || ""
                    const descVal = q.description || ""
                    let imageVal = q.imageUrl || q.image_url || initialNewQuest.imageUrl
                    if (imageVal.startsWith('blob:')) imageVal = initialNewQuest.imageUrl 

                    const rewardPoolVal = q.rewardPool || q.reward_pool || ""
                    const startDateVal = q.startDate || q.start_date || ""
                    const endDateVal = q.endDate || q.end_date || ""
                    const claimWindowVal = q.claimWindowHours || q.claim_window_hours || "168"
                    const rulesVal = q.enforceStageRules || q.enforce_stage_rules || false
                    const tokenAddrVal = q.tokenAddress || q.token_address
                    const stageReqsVal = q.stagePassRequirements || q.stage_pass_requirements
                    const distConfigVal = q.distributionConfig || q.distribution_config || initialNewQuest.distributionConfig

                    // Ensure fetched tasks are merged with system tasks logic
                    const fetchedTasks = q.tasks || []
                    
                    // Create a Set of existing IDs to prevent duplicates
                    const existingIds = new Set(fetchedTasks.map((t: QuestTask) => t.id));
                    
                    // Find which system tasks are missing from the DB data
                    const missingSystemTasks = SYSTEM_TASKS.filter(st => !existingIds.has(st.id));
                    
                    // Combine them
                    const mergedTasks = [...fetchedTasks, ...missingSystemTasks];

                    setNewQuest({
                        title: titleVal,
                        description: descVal,
                        imageUrl: imageVal,
                        rewardPool: String(rewardPoolVal),
                        distributionConfig: distConfigVal,
                        tasks: mergedTasks, 
                        startDate: startDateVal,
                        startTime: "", 
                        endDate: endDateVal,
                        endTime: "",
                        claimWindowHours: String(claimWindowVal),
                        enforceStageRules: rulesVal,
                        faucetAddress: draftId, 
                        rewardTokenType: 'erc20', 
                        tokenAddress: tokenAddrVal
                    })

                    if (stageReqsVal) setStagePassRequirements(stageReqsVal)

                    if (tokenAddrVal) {
                         setSelectedToken({
                            address: tokenAddrVal,
                            name: "Token", 
                            symbol: "ERC20", 
                            decimals: 18
                         })
                    }

                    toast.success("Draft loaded successfully")
                    
                    if (titleVal) {
                        setPhase(2)
                    }

                } else {
                    toast.error("Draft not found")
                }
            } catch (e) {
                console.error("Error loading draft", e)
            } finally {
                setIsLoadingDraft(false)
            }
        }

        fetchDraft()
    }, [draftId])
    // Add this function inside QuestCreatorContent
const saveDraftProgress = async (quest: any) => {
    if (!quest.faucetAddress || !address) return;

    try {
        const payload = {
            creatorAddress: address,
            faucetAddress: quest.faucetAddress,
            title: quest.title?.trim() || "",
            description: quest.description || "",
            imageUrl: quest.imageUrl || "",
            rewardPool: quest.rewardPool || "",
            rewardTokenType: quest.rewardTokenType,
            tokenAddress: quest.tokenAddress,
            distributionConfig: quest.distributionConfig,
            tasks: quest.tasks,
            // You can add more fields here later (startDate, endDate, etc.)
        };

        const res = await fetch(`${API_BASE_URL}/api/quests/draft`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });

        if (!res.ok) {
            console.error("Auto-save failed", await res.text());
        }
    } catch (e) {
        console.error("Auto-save error:", e);
    }
};

// Updated task handlers (make them async and auto-save)
const handleAddTask = async (task: QuestTask) => {
    if (!task?.title) return;

    const newTaskWithId: QuestTask = {
        ...task,
        id: crypto.randomUUID(),
        points: Number(task.points || 0),
    };

    const updatedQuest = {
        ...newQuest,
        tasks: [...newQuest.tasks, newTaskWithId],
    };

    setNewQuest(updatedQuest);

    if (newQuest.faucetAddress) {
        await saveDraftProgress(updatedQuest);
    }
};

const handleUpdateTask = async (updatedTask: QuestTask) => {
    if (!updatedTask?.id) return; // safety check

    const updatedTasks = newQuest.tasks.map((t) =>
        t.id === updatedTask.id
            ? { ...updatedTask, points: Number(updatedTask.points || 0) }
            : t
    );

    const updatedQuest = {
        ...newQuest,
        tasks: updatedTasks,
    };

    setNewQuest(updatedQuest);

    if (newQuest.faucetAddress) {
        await saveDraftProgress(updatedQuest);
    }
};

const handleRemoveTask = async (taskId: string) => {
    const updatedQuest = {
        ...newQuest,
        tasks: newQuest.tasks.filter((t) => t.id !== taskId),
    };

    setNewQuest(updatedQuest);

    if (newQuest.faucetAddress) {
        await saveDraftProgress(updatedQuest);
    }
};
    const stageTotals = useMemo(() => {
        const totals = { Beginner: 0, Intermediate: 0, Advance: 0, Legend: 0, Ultimate: 0 }
        newQuest.tasks.forEach(task => {
            if (task.stage && totals[task.stage as TaskStage] !== undefined) {
                totals[task.stage as TaskStage] += Number(task.points) || 0
            }
        })
        return totals
    }, [newQuest.tasks])

    const stageTaskCounts = useMemo(() => {
        const counts = { Beginner: 0, Intermediate: 0, Advance: 0, Legend: 0, Ultimate: 0 }
        newQuest.tasks.forEach(task => {
            if (task.stage && counts[task.stage as TaskStage] !== undefined) {
                counts[task.stage as TaskStage]++
            }
        })
        return counts
    }, [newQuest.tasks])

    const handleImageUpload = async (file: File) => {
        setIsUploadingImage(true);
        setUploadImageError(null); 

        try {
            const formData = new FormData();
            formData.append("file", file);

            const response = await fetch(`${API_BASE_URL}/api/upload-image`, {
                method: "POST",
                body: formData,
            });

            if (!response.ok) {
                const errData = await response.json();
                throw new Error(errData.detail || "Upload failed");
            }

            const data = await response.json();

            if (data.success && data.url) {
                setNewQuest(prev => ({ ...prev, imageUrl: data.url }));
                toast.success("Image uploaded successfully");
            } else {
                throw new Error("Invalid response from server");
            }

        } catch (error: any) {
            console.error("Upload error:", error);
            setUploadImageError(error.message || "Failed to upload image");
            toast.error("Failed to upload image");
        } finally {
            setIsUploadingImage(false);
        }
    }

    const handleDraftSaved = (faucetAddress: string) => {
        setNewQuest(prev => ({ ...prev, faucetAddress }))
        setShowDraftSuccessModal(true)
    }

    const handleContinueToTasks = () => {
        setShowDraftSuccessModal(false)
        setPhase(2)
        window.scrollTo(0, 0)
    }

    const handleContinueLater = () => {
        setShowDraftSuccessModal(false)
        router.push('/dashboard/{username?}') 
    }

    const handleEditTask = (task: QuestTask) => { }
    const validateTask = () => true
    const handleUseSuggestedTask = (t: any) => { }
    const handleStagePassRequirementChange = (stage: TaskStage, val: number) => {
        setStagePassRequirements(prev => ({...prev, [stage]: val}))
    }
    const getStageColor = (s: TaskStage) => 'bg-gray-100'
    const getCategoryColor = (c: string) => 'text-blue-500'
    const getVerificationIcon = (t: VerificationType) => <CheckCircle2 className="h-4 w-4" />

    // ==== 3. SIMPLIFIED HANDLE FINALIZE ====
    // Since Phase 2 handles the API Call internally (via handleDeployAndFinalize),
    // this function is mostly a placeholder or can be used for redirection if needed.
    const handleFinalize = async (deployedAddress?: string) => {
        // If your Phase2 component calls this AFTER success, just redirect.
        // We do NOT need to fetch here if Phase2 component is doing the fetching.
        if(deployedAddress) {
             router.push('/dashboard')
        }
    }

    if (!isConnected) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-4">
                <ShieldAlert className="h-16 w-16 text-gray-400" />
                <h2 className="text-2xl font-bold">Wallet Disconnected</h2>
                <p className="text-muted-foreground">Please connect your wallet to create a quest campaign.</p>
            </div>
        )
    }

    if (isLoadingDraft) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
                <Loader2 className="h-12 w-12 animate-spin text-blue-500" />
                <p className="text-muted-foreground">Loading draft...</p>
            </div>
        )
    }

    return (
        <div className="max-w-6xl mx-auto px-4 py-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
                <div>
                    <h1 className="text-3xl font-bold flex items-center gap-2">
                        {draftId ? "Edit Quest Draft" : "Create Quest Campaign"}
                        <Badge variant="secondary" className="text-sm"><Sparkles className="h-3 w-3 mr-1" /> Beta</Badge>
                    </h1>
                    <p className="text-muted-foreground mt-1">
                        {phase === 1 ? "Step 1: Set up campaign details and token rewards" : "Step 2: Configure tasks, stages and timeline"}
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <div className={`h-2 w-12 rounded-full ${phase >= 1 ? 'bg-blue-600' : 'bg-gray-200'}`} />
                    <div className={`h-2 w-12 rounded-full ${phase >= 2 ? 'bg-blue-600' : 'bg-gray-200'}`} />
                </div>
            </div>

            

            {phase === 1 && (
                <Phase1QuestDetailsRewards<FullQuestState>
                    newQuest={newQuest}
                    setNewQuest={setNewQuest}
                    selectedToken={selectedToken}
                    setSelectedToken={setSelectedToken}
                    nameError={nameError}
                    setNameError={setNameError}
                    isCheckingName={isCheckingName}
                    setIsCheckingName={setIsCheckingName}
                    isUploadingImage={isUploadingImage}
                    setIsUploadingImage={setIsUploadingImage}
                    uploadImageError={uploadImageError}
                    setUploadImageError={setUploadImageError}
                    handleImageUpload={handleImageUpload}
                    onDraftSaved={handleDraftSaved}
                    isSavingDraft={isSavingDraft}
                    setIsSavingDraft={setIsSavingDraft}
                    setError={setError}
                />
            )}

            {phase === 2 && (
                <div>
                    <Button 
                        variant="ghost" 
                        className="mb-4" 
                        onClick={() => setPhase(1)}
                    >
                        <ChevronLeft className="h-4 w-4 mr-2" /> Back to Details
                    </Button>
                    <Phase2TimingTasksFinalize
                        newQuest={newQuest}
                        setNewQuest={setNewQuest}
                        stagePassRequirements={stagePassRequirements}
                        setStagePassRequirements={setStagePassRequirements}
                        stageTotals={stageTotals}
                        stageTaskCounts={stageTaskCounts}
                        initialNewTaskForm={initialNewTaskForm}
                        validateTask={validateTask}
                        handleAddTask={handleAddTask}
                        handleUpdateTask={handleUpdateTask}
                        handleRemoveTask={handleRemoveTask}
                        saveDraftProgress={saveDraftProgress}
                        handleStagePassRequirementChange={handleStagePassRequirementChange}
                        getStageColor={getStageColor}
                        getCategoryColor={getCategoryColor}
                        getVerificationIcon={getVerificationIcon}
                        handleUseSuggestedTask={handleUseSuggestedTask}
                        isFinalizing={isFinalizing}
                        setError={setError}
                        handleFinalize={handleFinalize}
                    />
                </div>
            )}

            {/* SUCCESS MODAL POPUP */}
            {showDraftSuccessModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-2xl max-w-md w-full p-6 relative">
                        <div className="flex flex-col items-center text-center space-y-4">
                            <div className="h-16 w-16 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-500 rounded-full flex items-center justify-center mb-2">
                                <CheckCircle2 className="h-8 w-8" />
                            </div>
                            
                            <div>
                                <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">Draft Saved Successfully!</h3>
                                <p className="text-muted-foreground mt-2 text-sm">
                                    Your quest basics are saved. Would you like to proceed to configure Tasks & Timing now, or finish later?
                                </p>
                            </div>

                            <div className="grid grid-cols-1 w-full gap-3 mt-4">
                                <Button 
                                    size="lg" 
                                    onClick={handleContinueToTasks} 
                                    className="w-full bg-blue-600 hover:bg-blue-700 text-white shadow-md group"
                                >
                                    Continue to Add Tasks
                                    <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                                </Button>
                                
                               <Button size="lg"
                                    // Customize styling to match your theme if needed
                                    className="w-full bg-orange-600 hover:bg-orange-700 text-white font-bold h-12" 
                                    onClick={() => {
                                        // 1. Priority: Try Username first, then fallback to Wallet Address
                                        const routeParam = userProfile?.username || address;
                                        
                                        // 2. Only navigate if we have a valid identifier
                                        if (routeParam) {
                                            setShowDraftSuccessModal(false); // Close the modal first
                                            router.push(`/dashboard/${routeParam}`);
                                        } else {
                                            // Fallback for disconnected state
                                            router.push('/dashboard');
                                        }
                                    }}
                                >
                                    Continue Later (Dashboard)
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

// Export the page wrapped in Suspense for Next.js App Router compatibility
export default function QuestCreatorPage() {
    return (
        <div className="min-h-screen pb-20 relative">
            <Header pageTitle="Quest Creator" />
            <Suspense fallback={<div className="p-10 text-center">Loading...</div>}>
                <QuestCreatorContent />
            </Suspense>
        </div>
    )
}