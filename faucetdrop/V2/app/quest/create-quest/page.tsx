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

const API_BASE_URL = "https://fauctdrop-backend.onrender.com";

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
    tasks: [],
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
                    
                    // MAPPING (Handle snake_case from DB)
                    const titleVal = q.title || ""
                    const descVal = q.description || ""
                    let imageVal = q.imageUrl || q.image_url || initialNewQuest.imageUrl
                    if (imageVal.startsWith('blob:')) imageVal = initialNewQuest.imageUrl // Reset bad blobs

                    const rewardPoolVal = q.rewardPool || q.reward_pool || ""
                    const startDateVal = q.startDate || q.start_date || ""
                    const endDateVal = q.endDate || q.end_date || ""
                    const claimWindowVal = q.claimWindowHours || q.claim_window_hours || "168"
                    const rulesVal = q.enforceStageRules || q.enforce_stage_rules || false
                    const tokenAddrVal = q.tokenAddress || q.token_address
                    const stageReqsVal = q.stagePassRequirements || q.stage_pass_requirements
                    const distConfigVal = q.distributionConfig || q.distribution_config || initialNewQuest.distributionConfig

                    // 1. Populate State
                    setNewQuest({
                        title: titleVal,
                        description: descVal,
                        imageUrl: imageVal,
                        rewardPool: String(rewardPoolVal),
                        distributionConfig: distConfigVal,
                        tasks: q.tasks || [],
                        startDate: startDateVal,
                        startTime: "", 
                        endDate: endDateVal,
                        endTime: "",
                        claimWindowHours: String(claimWindowVal),
                        enforceStageRules: rulesVal,
                        faucetAddress: draftId, // IMPORTANT: Keep draftId here so finalize knows it
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

                    toast.success("Draft loaded")
                    
                    // --- FORCE PHASE 2 SWITCH ---
                    // If we successfully loaded a title, we go to Phase 2.
                    if (titleVal) {
                        setPhase(2)
                    }
                    // ----------------------------

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
        setUploadImageError(null); // Reset error state

        try {
            // 1. Create FormData
            const formData = new FormData();
            formData.append("file", file);

            // 2. Send to Backend
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
                // 3. Save the REAL Public URL
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
        router.push('/dashboard') 
    }

    const handleAddTask = (task: QuestTask) => { 
        if (!task || !task.title) return 
        
        const strictTask: QuestTask = {
            ...task,
            id: crypto.randomUUID(),
            points: Number(task.points)
        }
        
        setNewQuest(prev => ({ ...prev, tasks: [...prev.tasks, strictTask] }))
        toast.success("Task added")
    }

    const handleRemoveTask = (taskId: string) => {
        setNewQuest(prev => ({ ...prev, tasks: prev.tasks.filter(t => t.id !== taskId) }))
    }
    
    const handleUpdateTask = () => { }
    const handleEditTask = (task: QuestTask) => { }
    const validateTask = () => true
    const handleUseSuggestedTask = (t: any) => { }
    const handleStagePassRequirementChange = (stage: TaskStage, val: number) => {
        setStagePassRequirements(prev => ({...prev, [stage]: val}))
    }
    const getStageColor = (s: TaskStage) => 'bg-gray-100'
    const getCategoryColor = (c: string) => 'text-blue-500'
    const getVerificationIcon = (t: VerificationType) => <CheckCircle2 className="h-4 w-4" />

    const handleFinalize = async (deployedAddress?: string) => {
        // NOTE: Phase2 component passes the deployedAddress when calling this
        if (!newQuest.startDate || !newQuest.endDate) {
            setError("Please select start and end dates.")
            return
        }
        setIsFinalizing(true)
        try {
            const payload = {
                faucetAddress: deployedAddress || newQuest.faucetAddress, // Real Address
                draftId: draftId, // Pass the draftId from URL so backend can fetch data
                creatorAddress: address,
                // title/desc etc are now OPTIONAL in backend, but we can send them if we have them
                title: newQuest.title, 
                startDate: `${newQuest.startDate}T${newQuest.startTime || '00:00'}:00Z`,
                endDate: `${newQuest.endDate}T${newQuest.endTime || '23:59'}:00Z`,
                claimWindowHours: parseInt(newQuest.claimWindowHours || "168"),
                tasks: newQuest.tasks,
                stagePassRequirements,
                enforceStageRules: newQuest.enforceStageRules
            }
            const res = await fetch(`${API_BASE_URL}/api/quests/finalize`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            })
            if (!res.ok) throw new Error(await res.text())
            toast.success("Quest Campaign Finalized & Launched!")
            router.push('/dashboard')
        } catch(e: any) { 
            setError(e.message || "Failed to finalize") 
        } finally { 
            setIsFinalizing(false) 
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

            {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg mb-6 flex items-center gap-2">
                    <ShieldAlert className="h-5 w-5" />
                    {error}
                </div>
            )}

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
                        handleEditTask={handleEditTask}
                        handleUpdateTask={handleUpdateTask}
                        handleRemoveTask={handleRemoveTask}
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
                                
                                <Button 
                                    variant="outline" 
                                    size="lg" 
                                    onClick={handleContinueLater}
                                    className="w-full hover:bg-gray-100 dark:hover:bg-gray-800"
                                >
                                    <LayoutDashboard className="mr-2 h-4 w-4 text-muted-foreground" />
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