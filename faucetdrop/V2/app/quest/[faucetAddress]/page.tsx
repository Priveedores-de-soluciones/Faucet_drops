"use client";
import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { 
  Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  Loader2, ExternalLink, CheckCircle2, Clock, 
  Trophy, Shield, Save, Edit2, X, Upload, Lock, ImageIcon, UserCircle, AlertTriangle, Coins, Sparkles, Gift, ZoomIn, Wallet
} from 'lucide-react';
import { useWallet } from '@/hooks/use-wallet';
import { useToast } from "@/hooks/use-toast";
import { Contract, BrowserProvider, parseEther } from 'ethers';

// Import the Header component
import { Header } from "@/components/header"; 

import { FAUCET_ABI_CUSTOM } from '@/lib/abis';
const API_BASE_URL = "https://fauctdrop-backend.onrender.com";

// ============= TYPES =============
interface QuestTask {
    id: string;
    title: string;
    description: string;
    points: number;
    category: string;
    verificationType: 'manual_link' | 'manual_upload';
    url: string;
    stage: string;
    required: boolean;
}

interface UserProgress {
    totalPoints: number;
    stagePoints: { [key: string]: number };
    completedTasks: string[];
    currentStage: string;
    submissions: any[];
}

interface LeaderboardEntry {
    rank: number;
    walletAddress: string;
    username: string;
    avatarUrl?: string;
    points: number;
    completedTasks: number;
}

interface UserProfile {
    wallet_address: string;
    username: string | null;
    avatar_url?: string;
}

// ============= COMPONENT =============
export default function QuestDetailsPage() {
    const params = useParams();
    const router = useRouter();
    const { address: userWalletAddress, provider: walletProvider } = useWallet(); 
    const { toast } = useToast();

    // Helper: Extract Address from Slug
    const rawSlug = (params.addresss || params.faucetAddress) as string | undefined;
    const faucetAddress = useMemo(() => {
        if (!rawSlug) return undefined;
        const addressPattern = /(0x[a-fA-F0-9]{40})/i;
        const match = rawSlug.match(addressPattern);
        return match ? match[1] : (/^0x[a-fA-F0-9]{40}$/i.test(rawSlug) ? rawSlug : undefined);
    }, [rawSlug]);

    // ============= STATE =============
    const [questData, setQuestData] = useState<any | null>(null);
    const [userProgress, setUserProgress] = useState<UserProgress>({
        totalPoints: 0,
        stagePoints: {},
        completedTasks: [],
        currentStage: 'Beginner',
        submissions: []
    });
    const [pendingSubmissions, setPendingSubmissions] = useState<any[]>([]);
    const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
    
    // User Profile State
    const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
    const [isProfileLoading, setIsProfileLoading] = useState(true);
    const [hasUsername, setHasUsername] = useState(false);

    // UI States
    const [isLoading, setIsLoading] = useState(true);
    const [isEditing, setIsEditing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isFunding, setIsFunding] = useState(false);
    const [isClaiming, setIsClaiming] = useState(false);
    
    // IMAGE PREVIEW STATE
    const [previewImage, setPreviewImage] = useState<string | null>(null);

    // Submission Modal
    const [showSubmitModal, setShowSubmitModal] = useState(false);
    const [selectedTask, setSelectedTask] = useState<QuestTask | null>(null);
    const [submissionData, setSubmissionData] = useState({ proofUrl: '', notes: '', file: null as File | null });
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Admin Fund Modal State
    const [showFundModal, setShowFundModal] = useState(false);
    const [fundAmount, setFundAmount] = useState<string>("");

    // Admin Edit Form
    const [editForm, setEditForm] = useState({
        title: "",
        description: "",
        rewardPool: "",
        imageUrl: "",
        isActive: true
    });

    const isCreator = userWalletAddress && questData && 
        questData.creatorAddress.toLowerCase() === userWalletAddress.toLowerCase();

    const stages = ['Beginner', 'Intermediate', 'Advance', 'Legend', 'Ultimate'];

    // ============= FUNDING CALCULATION LOGIC =============
    const rewardPoolAmount = parseFloat(questData?.rewardPool || "0");
    const platformFeePercentage = 0.05; // 5%
    const requiredFee = rewardPoolAmount * platformFeePercentage;
    const totalRequired = rewardPoolAmount + requiredFee;

    const isValidFundingAmount = useMemo(() => {
        const input = parseFloat(fundAmount || "0");
        return Math.abs(input - totalRequired) < 0.0001;
    }, [fundAmount, totalRequired]);

    // ============= CLAIM WINDOW LOGIC =============
    const claimStatus = useMemo(() => {
        if (!questData || !questData.endDate) return { isActive: false, message: "Not started" };
        
        const endDate = new Date(questData.endDate);
        const claimWindowEnd = new Date(endDate.getTime() + (questData.claimWindowHours || 168) * 60 * 60 * 1000);
        const now = new Date();

        if (now < endDate) return { isActive: false, message: "Quest active" };
        if (now > claimWindowEnd) return { isActive: false, message: "Claim ended" };
        return { isActive: true, message: "Claim Live" };
    }, [questData]);

    // ============= 1. CHECK USER PROFILE =============
    useEffect(() => {
        if (!userWalletAddress) {
            setIsProfileLoading(false);
            return;
        }

        const checkProfile = async () => {
            try {
                const res = await fetch(`${API_BASE_URL}/api/profile/${userWalletAddress}`);
                const data = await res.json();
                
                if (data.success && data.profile) {
                    setUserProfile(data.profile);
                    setHasUsername(!!data.profile.username);
                } else {
                    setUserProfile(null);
                    setHasUsername(false);
                }
            } catch (error) {
                console.error("Profile check failed", error);
            } finally {
                setIsProfileLoading(false);
            }
        };

        checkProfile();
    }, [userWalletAddress]);

    // ============= 2. LOAD QUEST DATA =============
    useEffect(() => {
        if (!faucetAddress) return;

        const loadAllData = async () => {
            setIsLoading(true);
            try {
                const questRes = await fetch(`${API_BASE_URL}/api/quests/${faucetAddress}`);
                const questJson = await questRes.json();
                
                if (questJson.success) {
                    setQuestData(questJson.quest);
                    setEditForm({
                        title: questJson.quest.title,
                        description: questJson.quest.description,
                        rewardPool: questJson.quest.rewardPool,
                        imageUrl: questJson.quest.imageUrl || "",
                        isActive: questJson.quest.isActive
                    });
                } else {
                    throw new Error("Failed to load quest");
                }

                const lbRes = await fetch(`${API_BASE_URL}/api/quests/${faucetAddress}/leaderboard`);
                const lbJson = await lbRes.json();
                if (lbJson.success) setLeaderboard(lbJson.leaderboard);

            } catch (error) {
                console.error(error);
                toast({ title: "Error", description: "Could not load quest data", variant: "destructive" });
            } finally {
                setIsLoading(false);
            }
        };

        loadAllData();
    }, [faucetAddress, toast]);

    // ============= 3. LOAD USER PROGRESS =============
    useEffect(() => {
        if (!faucetAddress || !userWalletAddress || !hasUsername) return;

        const fetchUserSpecifics = async () => {
            try {
                const progRes = await fetch(`${API_BASE_URL}/api/quests/${faucetAddress}/progress/${userWalletAddress}`);
                const progJson = await progRes.json();
                if (progJson.success) setUserProgress(progJson.progress);

                if (isCreator) {
                    const pendingRes = await fetch(`${API_BASE_URL}/api/quests/${faucetAddress}/submissions/pending`);
                    const pendingJson = await pendingRes.json();
                    
                    if (pendingJson.success) {
                        const rawSubmissions = pendingJson.submissions;
                        
                        const enrichedSubmissions = await Promise.all(rawSubmissions.map(async (sub: any) => {
                            const relatedTask = questData?.tasks?.find((t:any) => t.id === sub.taskId);
                            const taskPoints = relatedTask ? relatedTask.points : 0;

                            try {
                                const profileRes = await fetch(`${API_BASE_URL}/api/profile/${sub.walletAddress}`);
                                const profileJson = await profileRes.json();
                                return {
                                    ...sub,
                                    taskPoints, 
                                    username: profileJson.success && profileJson.profile ? profileJson.profile.username : "Unknown User",
                                    avatarUrl: profileJson.success && profileJson.profile ? profileJson.profile.avatar_url : null
                                };
                            } catch {
                                return { ...sub, taskPoints, username: "Unknown User", avatarUrl: null };
                            }
                        }));
                        
                        setPendingSubmissions(enrichedSubmissions);
                    }
                }
            } catch (error) {
                console.error("Failed to load user specific data", error);
            }
        };

        fetchUserSpecifics();
    }, [faucetAddress, userWalletAddress, isCreator, hasUsername, questData]);


    // ============= HANDLERS =============
    
    const handleSaveDetails = async () => {
        setIsSaving(true);
        try {
            const response = await fetch(`${API_BASE_URL}/api/quests/${faucetAddress}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(editForm)
            });
            const result = await response.json();
            if (result.success) {
                setQuestData((prev: any) => ({ ...prev, ...editForm }));
                setIsEditing(false);
                toast({ title: "Success", description: "Quest details updated." });
            }
        } catch (error) {
            toast({ title: "Error", description: "Failed to save changes.", variant: "destructive" });
        } finally {
            setIsSaving(false);
        }
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        
        if (file.size > 2 * 1024 * 1024) { 
            toast({ title: "File too large", description: "Image must be under 2MB", variant: "destructive" });
            e.target.value = "";
            return;
        }

        const img = new Image();
        img.src = URL.createObjectURL(file);
        img.onload = () => {
            if (img.width > 2048 || img.height > 2048) {
                toast({ 
                    title: "Resolution too high", 
                    description: `Image is ${img.width}x${img.height}. Max allowed is 2048x2048.`, 
                    variant: "destructive" 
                });
                e.target.value = "";
                setSubmissionData(prev => ({ ...prev, file: null }));
            } else {
                setSubmissionData(prev => ({ ...prev, file }));
            }
        };
    };

    const handleSubmitTask = async () => {
        if (!selectedTask || !userWalletAddress) return;
        setIsSubmitting(true);

        try {
            const formData = new FormData();
            formData.append('walletAddress', userWalletAddress);
            formData.append('taskId', selectedTask.id);
            formData.append('submissionType', selectedTask.verificationType);
            formData.append('notes', submissionData.notes);
            
            if (submissionData.proofUrl) formData.append('submittedData', submissionData.proofUrl);
            if (submissionData.file) formData.append('file', submissionData.file);

            const response = await fetch(`${API_BASE_URL}/api/quests/${faucetAddress}/submissions`, {
                method: 'POST',
                body: formData
            });
            
            const result = await response.json();
            if (result.success) {
                toast({ title: "Submitted!", description: "Your task is under review." });
                setShowSubmitModal(false);
                setSubmissionData({ proofUrl: '', notes: '', file: null });
                
                setUserProgress(prev => ({
                    ...prev,
                    submissions: [...prev.submissions, { taskId: selectedTask.id, status: 'pending' }]
                }));
            } else {
                throw new Error(result.detail || "Submission failed");
            }
        } catch (error: any) {
            toast({ title: "Error", description: error.message, variant: "destructive" });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleReviewSubmission = async (submissionId: string, status: 'approved' | 'rejected') => {
        try {
            const response = await fetch(`${API_BASE_URL}/api/quests/${faucetAddress}/submissions/${submissionId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status })
            });
            const result = await response.json();
            if (result.success) {
                setPendingSubmissions(prev => prev.filter(s => s.submissionId !== submissionId));
                toast({ 
                    title: status === 'approved' ? "Task Approved" : "Task Rejected", 
                    description: `User has been notified.`,
                    className: status === 'approved' ? "bg-green-600 text-white" : "bg-red-600 text-white" 
                });
            }
        } catch (error) {
            toast({ title: "Error", description: "Action failed.", variant: "destructive" });
        }
    };

    const handleClaimReward = async () => {
        if (!walletProvider || !faucetAddress) return;
        setIsClaiming(true);
        try {
            const provider = walletProvider as BrowserProvider;
            const signer = await provider.getSigner();
            const faucetContract = new Contract(faucetAddress, FAUCET_ABI_CUSTOM, signer);
            
            const tx = await faucetContract.claimReward();
            await tx.wait();
            
            toast({ title: "Success!", description: "Rewards claimed successfully!" });
        } catch (e: any) {
            console.error(e);
            toast({ title: "Claim Failed", description: e.message || "Transaction failed", variant: "destructive" });
        } finally {
            setIsClaiming(false);
        }
    };

    const handleFundQuest = async () => {
        if (!walletProvider || !faucetAddress) {
            toast({ title: "Error", description: "Wallet not connected or invalid address", variant: "destructive" });
            return;
        }

        setIsFunding(true);
        try {
            const provider = walletProvider as BrowserProvider;
            const signer = await provider.getSigner();
            const userAddress = await signer.getAddress();
            
            const baseAmountWei = parseEther(rewardPoolAmount.toString());
            const feeWei = (baseAmountWei * 5n) / 100n;
            const totalAmountWei = baseAmountWei + feeWei;

            const tokenAddress = questData.tokenAddress; 
            
            if (!tokenAddress) {
                throw new Error("Token address not found in quest data");
            }

            const ERC20_ABI = [
                "function approve(address spender, uint256 amount) public returns (bool)",
                "function balanceOf(address account) public view returns (uint256)",
                "function allowance(address owner, address spender) public view returns (uint256)"
            ];

            const tokenContract = new Contract(tokenAddress, ERC20_ABI, signer);
            const userBalance = await tokenContract.balanceOf(userAddress);

            if (userBalance < totalAmountWei) {
                throw new Error("Insufficient token balance.");
            }

            const currentAllowance = await tokenContract.allowance(userAddress, faucetAddress);

            if (currentAllowance < totalAmountWei) {
                toast({ title: "Approval Required", description: "Approving token transfer..." });
                const approveTx = await tokenContract.approve(faucetAddress, totalAmountWei);
                await approveTx.wait();
                toast({ title: "Approved", description: "Token approval confirmed. Processing funding..." });
            }

            const faucetContract = new Contract(faucetAddress, FAUCET_ABI_CUSTOM, signer);
            const tx = await faucetContract.fund(baseAmountWei);
            await tx.wait();

            toast({ title: "Success!", description: `Quest funded with ${Number(baseAmountWei) / 1e18} tokens!` });
            
            setQuestData((prev: any) => ({ ...prev, isFunded: true }));
            setShowFundModal(false);

        } catch (error: any) {
            console.error("Funding Error:", error);
            toast({ title: "Funding Failed", description: error.reason || error.message, variant: "destructive" });
        } finally {
            setIsFunding(false);
        }
    };

    const getTaskStatus = (task: QuestTask) => {
        if (userProgress.completedTasks.includes(task.id)) return 'completed';
        const pending = userProgress.submissions.find(s => s.taskId === task.id && s.status === 'pending');
        if (pending) return 'pending';
        
        const stageIndex = stages.indexOf(task.stage);
        const userStageIndex = stages.indexOf(userProgress.currentStage);
        if (stageIndex > userStageIndex) return 'locked';
        
        return 'available';
    };

    // ============= RENDER STATES =============

    if (isLoading || isProfileLoading) {
        return (
            <div className="flex flex-col min-h-screen">
                <Header pageTitle="Loading..." />
                <div className="flex-1 flex flex-col items-center justify-center space-y-4">
                    <Loader2 className="h-10 w-10 animate-spin text-primary" />
                    <p className="text-muted-foreground animate-pulse">Loading Quest...</p>
                </div>
            </div>
        );
    }

    // --- 1. ENFORCE WALLET CONNECTION ---
    if (!userWalletAddress) {
        return (
            <div className="flex flex-col min-h-screen">
                <Header pageTitle={questData?.title || "Quest Details"} />
                <div className="flex-1 flex items-center justify-center p-4">
                    <Card className="w-full max-w-md shadow-2xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 relative overflow-hidden text-center">
                        <CardHeader className="pb-2 pt-8">
                            <div className="mx-auto bg-slate-100 dark:bg-slate-900 p-4 rounded-full mb-4 w-fit ring-1 ring-slate-200 dark:ring-slate-800">
                                <Wallet className="h-10 w-10 text-slate-600 dark:text-slate-400" />
                            </div>
                            <CardTitle className="text-xl font-bold text-slate-900 dark:text-slate-100">
                                Connect Wallet
                            </CardTitle>
                            <CardDescription className="text-base mt-2 mx-auto leading-relaxed">
                                Please connect your wallet to view this Quest and participate.
                            </CardDescription>
                        </CardHeader>
                        <CardFooter className="pt-4 flex justify-center pb-8">
                           {/* The Header Connect button handles connection, but we can instruct user here */}
                           <p className="text-sm text-muted-foreground">Use the Connect button in the header.</p>
                        </CardFooter>
                    </Card>
                </div>
            </div>
        );
    }

    // --- 2. ENFORCE USERNAME ---
    if (!hasUsername) {
        return (
            <div className="flex flex-col min-h-screen">
                <Header pageTitle={questData?.title || "Profile Setup"} />
                <div className="flex-1 flex items-center justify-center p-4">
                    <Card className="w-full max-w-md shadow-2xl border-orange-100 dark:border-orange-900/50 bg-white dark:bg-slate-950 relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-orange-400 to-red-500" />
                        <CardHeader className="text-center pb-2 pt-8">
                            <div className="mx-auto bg-orange-50 dark:bg-orange-900/20 p-4 rounded-full mb-4 w-fit ring-1 ring-orange-100 dark:ring-orange-800">
                                <UserCircle className="h-10 w-10 text-orange-600 dark:text-orange-500" />
                            </div>
                            <CardTitle className="text-xl font-bold text-slate-900 dark:text-slate-100">
                                Profile Setup Required
                            </CardTitle>
                            <CardDescription className="text-base mt-2 max-w-xs mx-auto leading-relaxed">
                                To participate in Quests and earn rewards, you must set a unique <strong>Username</strong>.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6 pt-4">
                            <Button 
                                size="lg" 
                                className="w-full bg-orange-600 hover:bg-orange-700 text-white font-bold h-12" 
                                onClick={() => {
                                    const routeParam = userProfile?.username || userWalletAddress;
                                    if (routeParam) {
                                        router.push(`/dashboard/${routeParam}`);
                                    }
                                }}
                            >
                                Update Profile Details
                            </Button>
                        </CardContent>
                    </Card>
                </div>
            </div>
        );
    }

    if (!questData) return (
        <div className="flex flex-col min-h-screen">
             <Header pageTitle="Not Found" />
             <div className="p-10 text-center">Quest not found.</div>
        </div>
    );

    const currentStageData = questData.stagePassRequirements || {};
    const pointsForCurrentStage = userProgress.stagePoints[userProgress.currentStage] || 0;
    const requiredForCurrent = currentStageData[userProgress.currentStage] || 100;
    const progressPercent = Math.min((pointsForCurrentStage / requiredForCurrent) * 100, 100);
    const tokenSymbol = questData.tokenSymbol || (questData.rewardTokenType === 'native' ? 'ETH' : 'Tokens');

    // Filter Leaderboard Data (Owner & 0 Points Excluded)
    const filteredLeaderboard = leaderboard.filter(entry => 
        entry.walletAddress.toLowerCase() !== questData.creatorAddress.toLowerCase() &&
        entry.points > 0
    );

    return (
        <div className="min-h-screen bg-background flex flex-col">
            <Header pageTitle={questData.title} />
            
            <div className="max-w-7xl mx-auto w-full p-4 sm:p-6 space-y-8 pb-20">
                
                {/* ============= HERO SECTION ============= */}
                <div className="relative rounded-xl overflow-hidden bg-slate-900 border border-slate-800 shadow-2xl min-h-[300px]">
                    <div className="absolute inset-0 z-0">
                        <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-900/90 to-transparent" />
                        {editForm.imageUrl || questData.imageUrl ? (
                            <img src={editForm.imageUrl || questData.imageUrl} alt="Background" className="w-full h-full object-cover opacity-30 blur-sm scale-105" />
                        ) : null}
                    </div>

                    <div className="relative z-10 p-6 md:p-10 flex flex-col md:flex-row gap-8 items-start h-full">
                        {/* Main Image */}
                        <div className="w-full md:w-64 h-64 shrink-0 rounded-lg overflow-hidden border-2 border-slate-700/50 shadow-xl bg-slate-950 flex items-center justify-center group relative">
                            {isEditing ? (
                                <div className="absolute inset-0 z-20 bg-black/80 flex flex-col items-center justify-center p-4">
                                    <ImageIcon className="h-8 w-8 text-slate-400 mb-2" />
                                    <Input className="bg-black/50 border-slate-600 text-white h-8 text-xs w-full" value={editForm.imageUrl} placeholder="Image URL..." onChange={(e) => setEditForm({...editForm, imageUrl: e.target.value})}/>
                                </div>
                            ) : (
                                <img src={questData.imageUrl} alt="Quest Cover" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                            )}
                        </div>

                        {/* Text Content */}
                        <div className="flex-1 w-full space-y-6">
                            <div className="flex justify-between items-start">
                                <div className="space-y-2 w-full">
                                    <div className="flex flex-col gap-2">
                                        {isEditing ? (
                                            <div className="flex items-center gap-4 w-full">
                                                <Input value={editForm.title} onChange={(e) => setEditForm({...editForm, title: e.target.value})} className="text-3xl font-bold bg-white/10 border-white/20 text-white h-auto py-2" />
                                                <div className="flex items-center gap-2 bg-black/40 px-3 py-2 rounded-lg border border-white/10">
                                                    <Label className="text-white whitespace-nowrap">Active</Label>
                                                    <Switch checked={editForm.isActive} onCheckedChange={(c) => setEditForm({...editForm, isActive: c})} />
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-3 flex-wrap">
                                                <h1 className="text-3xl md:text-4xl font-bold text-white tracking-tight">{questData.title}</h1>
                                                <Badge variant="secondary" className="bg-purple-100 text-purple-700 border-purple-200 flex items-center gap-1 shadow-sm h-6 px-3">
                                                    <Sparkles className="h-3 w-3" /> Beta Phase
                                                </Badge>
                                                <Badge variant={questData.isActive ? "default" : "destructive"} className="h-6 px-3">
                                                    {questData.isActive ? "Live" : "Paused"}
                                                </Badge>
                                                {questData.isFunded && (
                                                    <Badge className="bg-green-500 hover:bg-green-600 h-6 px-3">Funded</Badge>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                    
                                    {isEditing ? (
                                        <Textarea value={editForm.description} onChange={(e) => setEditForm({...editForm, description: e.target.value})} className="bg-white/10 border-white/20 text-slate-200 min-h-[100px]" />
                                    ) : (
                                        <p className="text-slate-300 text-lg leading-relaxed max-w-2xl">
                                            {questData.description}
                                        </p>
                                    )}
                                </div>

                                {/* Creator Controls */}
                                {isCreator && (
                                    <div className="hidden md:block pl-4 space-y-2">
                                        {isEditing ? (
                                            <div className="flex gap-2 flex-col">
                                                <Button size="sm" className="bg-green-600 hover:bg-green-500 w-full" onClick={handleSaveDetails} disabled={isSaving}>
                                                    {isSaving ? <Loader2 className="w-4 h-4 animate-spin"/> : <Save className="w-4 h-4 mr-2"/>} Save
                                                </Button>
                                                <Button variant="outline" size="sm" onClick={() => setIsEditing(false)} disabled={isSaving} className="w-full text-black bg-white/80 hover:bg-white">
                                                    <X className="w-4 h-4 mr-2"/> Cancel
                                                </Button>
                                            </div>
                                        ) : (
                                            <>
                                                <Button variant="secondary" size="sm" className="w-full" onClick={() => setIsEditing(true)}>
                                                    <Edit2 className="w-4 h-4 mr-2"/> Edit
                                                </Button>
                                                {!questData.isFunded && (
                                                    <Button size="sm" onClick={() => { setFundAmount(""); setShowFundModal(true); }} className="w-full bg-green-600 hover:bg-green-700 text-white">
                                                        <Coins className="mr-2 h-4 w-4" /> Fund Quest
                                                    </Button>
                                                )}
                                            </>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Stats Row */}
                            <div className="flex flex-wrap gap-4 pt-4">
                                <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-lg px-5 py-3 flex items-center gap-4 min-w-[160px]">
                                    <div className="p-2 bg-yellow-500/20 rounded-full text-yellow-400">
                                        <Trophy className="h-6 w-6" />
                                    </div>
                                    <div>
                                        <div className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Reward Pool</div>
                                        {isEditing ? (
                                            <Input value={editForm.rewardPool} onChange={(e) => setEditForm({...editForm, rewardPool: e.target.value})} className="h-6 bg-transparent border-b border-white/30 rounded-none text-white font-bold p-0 focus-visible:ring-0 focus-visible:border-white" />
                                        ) : (
                                            <div className="text-xl font-bold text-white">{questData.rewardPool} {tokenSymbol}</div>
                                        )}
                                    </div>
                                </div>

                                <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-lg px-5 py-3 flex items-center gap-4 min-w-[160px]">
                                    <div className="p-2 bg-blue-500/20 rounded-full text-blue-400">
                                        <Shield className="h-6 w-6" />
                                    </div>
                                    <div>
                                        <div className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Your Rank</div>
                                        <div className="text-xl font-bold text-white">{userProgress.currentStage}</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* ============= PROGRESS BAR ============= */}
                {!isCreator && (
                    <Card className="border-none bg-slate-50 dark:bg-slate-900/50 shadow-sm">
                        <CardContent className="p-6">
                            <div className="flex justify-between items-end mb-3">
                                <div>
                                    <h3 className="font-bold text-lg flex items-center gap-2">
                                        Your Progress
                                        <Badge variant="outline" className="text-primary border-primary bg-primary/5">{userProgress.currentStage}</Badge>
                                    </h3>
                                    <p className="text-sm text-muted-foreground mt-1">
                                        Earn <strong>{Math.max(0, requiredForCurrent - pointsForCurrentStage)}</strong> more points to level up.
                                    </p>
                                </div>
                                <div className="text-right">
                                    <div className="text-3xl font-black text-primary">{userProgress.totalPoints}</div>
                                    <div className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Total Points</div>
                                </div>
                            </div>
                            <Progress value={progressPercent} className="h-4 rounded-full" />
                        </CardContent>
                    </Card>
                )}

                {/* ============= TABS ============= */}
                <Tabs defaultValue="tasks" className="w-full">
                    <div className="flex items-center justify-between border-b mb-8 overflow-x-auto">
                        <TabsList className="bg-transparent h-auto p-0 gap-8 w-full justify-start">
                            <TabsTrigger value="tasks" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-primary pb-3 px-1 text-base font-medium">Tasks</TabsTrigger>
                            <TabsTrigger value="leaderboard" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-primary pb-3 px-1 text-base font-medium">Leaderboard</TabsTrigger>
                            {isCreator && (
                                <TabsTrigger value="admin" className="rounded-none border-b-2 border-transparent data-[state=active]:border-yellow-500 data-[state=active]:text-yellow-600 pb-3 px-1 text-base font-medium flex items-center gap-2">
                                    <Shield className="h-4 w-4" /> Admin
                                    {pendingSubmissions.length > 0 && <Badge className="bg-yellow-500 text-black h-5 w-5 p-0 flex items-center justify-center rounded-full text-xs">{pendingSubmissions.length}</Badge>}
                                </TabsTrigger>
                            )}
                        </TabsList>
                    </div>

                    {/* --- TASKS CONTENT --- */}
                    <TabsContent value="tasks" className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        {stages.map((stage) => {
                            const stageTasks = questData.tasks.filter((t: any) => t.stage === stage) || [];
                            if (stageTasks.length === 0) return null;
                            const isLockedStage = stages.indexOf(stage) > stages.indexOf(userProgress.currentStage);

                            return (
                                <div key={stage} className={`space-y-4 ${isLockedStage ? 'opacity-50 grayscale pointer-events-none' : ''}`}>
                                    <div className="flex items-center gap-4">
                                        <Badge variant="outline" className={`px-4 py-1 text-sm font-bold uppercase tracking-wide ${isLockedStage ? 'border-slate-300 text-slate-400' : 'border-primary/50 text-primary bg-primary/5'}`}>{stage}</Badge>
                                        <div className="h-px bg-border flex-1" />
                                        {isLockedStage && <Lock className="h-4 w-4 text-muted-foreground" />}
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                                        {stageTasks.map((task: any) => {
                                            const status = getTaskStatus(task);
                                            const isLocked = status === 'locked';
                                            
                                            return (
                                                <Card key={task.id} className={`group relative overflow-hidden transition-all duration-300 h-full flex flex-col ${isLocked ? 'bg-slate-100 dark:bg-slate-900 border-dashed' : 'hover:shadow-lg hover:-translate-y-1 bg-white dark:bg-slate-950'} ${status === 'completed' ? 'border-green-500/30 bg-green-50/20' : ''} ${status === 'pending' ? 'border-orange-500/30 bg-orange-50/20' : ''}`}>
                                                    <CardContent className="p-5 flex flex-col h-full">
                                                        <div className="flex justify-between items-start mb-4">
                                                            <div className={`p-2 rounded-lg ${isLocked ? 'bg-slate-200 dark:bg-slate-800' : 'bg-primary/10 text-primary'}`}>
                                                                {isLocked ? <Lock className="h-5 w-5" /> : <Trophy className="h-5 w-5" />}
                                                            </div>
                                                            <Badge variant={status === 'completed' ? 'default' : 'secondary'} className={status === 'completed' ? 'bg-green-600' : ''}>{task.points} PTS</Badge>
                                                        </div>
                                                        
                                                        <div className="mb-6 flex-1">
                                                            <h3 className="font-bold text-lg mb-2 group-hover:text-primary transition-colors">{task.title}</h3>
                                                            <p className="text-sm text-muted-foreground line-clamp-3">{task.description}</p>
                                                        </div>

                                                        <div className="mt-auto pt-4 border-t flex items-center justify-between">
                                                            {task.url && !isLocked && status !== 'completed' ? (
                                                                <a href={task.url} target="_blank" rel="noopener noreferrer" className="z-10 relative">
                                                                    <Button variant="outline" size="sm" className="h-8 text-xs gap-1 hover:bg-blue-50 text-blue-600 hover:text-blue-600 border-blue-200">
                                                                        <ExternalLink className="h-3 w-3"/> Open Link
                                                                    </Button>
                                                                </a>
                                                            ) : (
                                                                <div className="text-xs font-medium text-muted-foreground flex items-center gap-1 uppercase tracking-wider">
                                                                    {task.verificationType === 'manual_link' ? <ExternalLink className="h-3 w-3"/> : <Upload className="h-3 w-3"/>}
                                                                    {task.verificationType === 'manual_link' ? 'Link' : 'Upload'}
                                                                </div>
                                                            )}

                                                            {status === 'completed' ? (
                                                                <div className="flex items-center text-green-600 text-sm font-bold"><CheckCircle2 className="h-4 w-4 mr-1" /> Done</div>
                                                            ) : status === 'pending' ? (
                                                                <div className="flex items-center text-orange-600 text-sm font-bold"><Clock className="h-4 w-4 mr-1" /> Reviewing</div>
                                                            ) : isLocked ? (
                                                                <span className="text-sm text-muted-foreground">Locked</span>
                                                            ) : (
                                                                !isCreator ? (
                                                                    <Button size="sm" onClick={() => { setSelectedTask(task); setShowSubmitModal(true); }} className="bg-slate-900 text-white hover:bg-primary dark:bg-slate-100 dark:text-black">Submit Task</Button>
                                                                ) : (
                                                                    <span className="text-xs font-medium text-muted-foreground bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded">Preview Mode</span>
                                                                )
                                                            )}
                                                        </div>
                                                    </CardContent>
                                                    {!isLocked && status === 'available' && <div className="absolute bottom-0 left-0 w-full h-1 bg-primary transform scale-x-0 group-hover:scale-x-100 transition-transform origin-left" />}
                                                </Card>
                                            );
                                        })}
                                    </div>
                                </div>
                            );
                        })}
                    </TabsContent>

                    {/* --- LEADERBOARD CONTENT --- */}
                    <TabsContent value="leaderboard">
                        <Card className="border-slate-200 dark:border-slate-800">
                            <CardHeader>
                                <CardTitle className="flex justify-between items-center">
                                    Top Contributors
                                    {claimStatus.isActive && (
                                        <Badge className="bg-green-600 animate-pulse"><Gift className="h-3 w-3 mr-1"/> Claim Active</Badge>
                                    )}
                                </CardTitle>
                                <CardDescription>Ranked by total points earned in this quest</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <Table>
                                    <TableHeader>
                                        <TableRow className="hover:bg-transparent">
                                            <TableHead className="w-[80px]">Rank</TableHead>
                                            <TableHead>Participant</TableHead>
                                            <TableHead className="text-right">Tasks Done</TableHead>
                                            <TableHead className="text-right">Points</TableHead>
                                            {/* Show Action Column if Claiming is Active */}
                                            {claimStatus.isActive && <TableHead className="text-right">Action</TableHead>}
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {filteredLeaderboard.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={claimStatus.isActive ? 5 : 4} className="text-center py-10 text-muted-foreground">No participants yet. Be the first to join!</TableCell>
                                            </TableRow>
                                        ) : (
                                            filteredLeaderboard.map((entry) => (
                                                <TableRow key={entry.walletAddress} className={entry.walletAddress === userWalletAddress ? "bg-primary/5 hover:bg-primary/10" : ""}>
                                                    <TableCell className="font-medium text-lg">
                                                        {entry.rank === 1 && "🥇"}{entry.rank === 2 && "🥈"}{entry.rank === 3 && "🥉"}{entry.rank > 3 && <span className="text-muted-foreground">#{entry.rank}</span>}
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="flex items-center gap-3">
                                                            <Avatar className="h-9 w-9 border border-slate-200 dark:border-slate-700">
                                                                <AvatarImage src={entry.avatarUrl} alt={entry.username} className="object-cover" />
                                                                <AvatarFallback className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-bold">
                                                                    {entry.username ? entry.username.substring(0, 2).toUpperCase() : "??"}
                                                                </AvatarFallback>
                                                            </Avatar>
                                                            <div className="flex flex-col">
                                                                <span className="font-semibold text-sm flex items-center gap-2">
                                                                    {entry.username}
                                                                    {entry.walletAddress === userWalletAddress && <Badge variant="outline" className="text-[10px] h-4 px-1 py-0 border-primary text-primary">You</Badge>}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="text-right text-muted-foreground font-mono">{entry.completedTasks}</TableCell>
                                                    <TableCell className="text-right font-bold text-primary text-lg">{entry.points}</TableCell>
                                                    
                                                    {/* CLAIM BUTTON LOGIC */}
                                                    {claimStatus.isActive && (
                                                        <TableCell className="text-right">
                                                            {/* Only show Claim button for the Logged In User who is a Winner */}
                                                            {entry.walletAddress.toLowerCase() === userWalletAddress?.toLowerCase() && (
                                                                // Logic check: Is user rank within total winners allowed?
                                                                entry.rank <= (questData.distributionConfig?.totalWinners || 100) ? (
                                                                    <Button size="sm" onClick={handleClaimReward} disabled={isClaiming} className="bg-green-600 hover:bg-green-700 text-white">
                                                                        {isClaiming ? <Loader2 className="h-3 w-3 animate-spin"/> : "Claim Reward"}
                                                                    </Button>
                                                                ) : (
                                                                    <span className="text-xs text-muted-foreground">Not Eligible</span>
                                                                )
                                                            )}
                                                        </TableCell>
                                                    )}
                                                </TableRow>
                                            ))
                                        )}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* --- ADMIN CONTENT --- */}
                    {isCreator && (
                        <TabsContent value="admin" className="space-y-6">
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                <Card className="border-slate-200 dark:border-slate-800">
                                    <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Pending Review</CardTitle></CardHeader>
                                    <CardContent><div className="text-3xl font-bold text-orange-600">{pendingSubmissions.length}</div></CardContent>
                                </Card>
                                <Card className="border-slate-200 dark:border-slate-800">
                                    <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Total Participants</CardTitle></CardHeader>
                                    <CardContent><div className="text-3xl font-bold">{filteredLeaderboard.length}</div></CardContent>
                                </Card>
                                <Card className="border-slate-200 dark:border-slate-800">
                                    <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Quest Status</CardTitle></CardHeader>
                                    <CardContent>
                                        <Badge className="text-sm" variant={questData.isActive ? "default" : "destructive"}>{questData.isActive ? "Active" : "Inactive"}</Badge>
                                        {questData.isFunded && <Badge className="ml-2 bg-green-500 text-white">Funded</Badge>}
                                    </CardContent>
                                </Card>
                            </div>

                            <Card className="border-orange-200 dark:border-orange-900 bg-white dark:bg-slate-950 shadow-sm">
                                <CardHeader className="bg-orange-50 dark:bg-orange-950/20 border-b border-orange-100 dark:border-orange-900">
                                    <CardTitle className="text-orange-800 dark:text-orange-400 flex items-center gap-2"><Shield className="h-5 w-5"/> Submission Review Queue</CardTitle>
                                </CardHeader>
                                <CardContent className="p-6">
                                    {pendingSubmissions.length === 0 ? (
                                        <div className="text-center py-12 text-muted-foreground flex flex-col items-center"><CheckCircle2 className="h-12 w-12 mb-3 text-green-500 opacity-30" /><p>All caught up! No pending submissions.</p></div>
                                    ) : (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {pendingSubmissions.map((sub: any) => (
                                                <Card key={sub.submissionId} className="overflow-hidden border shadow-sm dark:border-slate-800">
                                                    <div className="p-4 bg-slate-50 dark:bg-slate-900 border-b dark:border-slate-800 flex justify-between items-center">
                                                        <div className="flex flex-col">
                                                            <span className="font-semibold text-sm truncate pr-2 max-w-[150px]">{sub.taskTitle}</span>
                                                            {/* ADMIN POINTS BADGE */}
                                                            <Badge variant="outline" className="w-fit text-[10px] mt-1 bg-blue-50 text-blue-700 border-blue-200">{sub.taskPoints || 0} Points</Badge>
                                                        </div>
                                                        <div className="flex items-center gap-2 bg-white dark:bg-slate-950 px-3 py-1 rounded-full border dark:border-slate-700">
                                                            <Avatar className="h-5 w-5"><AvatarImage src={sub.avatarUrl} /><AvatarFallback className="text-[10px] text-slate-500 dark:text-slate-400">{sub.username ? sub.username.substring(0,2).toUpperCase() : "??"}</AvatarFallback></Avatar>
                                                            <span className="text-xs font-medium text-slate-700 dark:text-slate-300">{sub.username}</span>
                                                        </div>
                                                    </div>
                                                    <div className="p-4 space-y-4">
                                                        <div className="bg-slate-100 dark:bg-slate-900 p-3 rounded text-sm break-all">
                                                            {sub.submittedData ? (
                                                                // INTELLIGENT LINK/IMAGE PREVIEW FOR ADMIN
                                                                sub.submittedData.match(/\.(jpeg|jpg|gif|png)$/) != null || sub.submittedData.includes('supabase') ? (
                                                                    <div className="flex flex-col gap-2 cursor-pointer" onClick={() => setPreviewImage(sub.submittedData)}>
                                                                        <div className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                                                                            <ImageIcon className="h-3 w-3"/> Image Proof (Click to Zoom)
                                                                        </div>
                                                                        <div className="relative group">
                                                                            <img src={sub.submittedData} alt="Proof" className="w-full h-32 object-cover rounded border transition-opacity group-hover:opacity-90" />
                                                                            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 bg-black/20 transition-opacity rounded">
                                                                                <ZoomIn className="text-white h-8 w-8 drop-shadow-md" />
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                ) : (
                                                                    <a href={sub.submittedData} target="_blank" className="text-blue-600 hover:underline flex items-center gap-1 font-medium">
                                                                        {sub.submittedData.startsWith('http') ? "Visit Link" : sub.submittedData} <ExternalLink size={14}/>
                                                                    </a>
                                                                )
                                                            ) : (
                                                                <span className="text-muted-foreground italic">No submission data provided</span>
                                                            )}
                                                        </div>
                                                        {sub.notes && <div className="text-xs text-muted-foreground bg-white dark:bg-slate-800 p-2 rounded border dark:border-slate-700 italic">"{sub.notes}"</div>}
                                                        <div className="flex gap-3 pt-2">
                                                            <Button className="flex-1 bg-green-600 hover:bg-green-700 h-9" onClick={() => handleReviewSubmission(sub.submissionId, 'approved')}>Approve</Button>
                                                            <Button variant="destructive" className="flex-1 h-9" onClick={() => handleReviewSubmission(sub.submissionId, 'rejected')}>Reject</Button>
                                                        </div>
                                                    </div>
                                                </Card>
                                            ))}
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </TabsContent>
                    )}
                </Tabs>

                {/* ============= IMAGE PREVIEW MODAL ============= */}
                {previewImage && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 animate-in fade-in duration-200" onClick={() => setPreviewImage(null)}>
                        <div className="relative max-w-4xl max-h-[90vh] w-full flex items-center justify-center">
                            <Button 
                                className="absolute -top-12 right-0 rounded-full bg-white/10 hover:bg-white/20 text-white border-0 h-10 w-10 p-0"
                                onClick={(e) => { e.stopPropagation(); setPreviewImage(null); }}
                            >
                                <X className="h-6 w-6" />
                            </Button>
                            <img 
                                src={previewImage} 
                                alt="Full Proof Preview" 
                                className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl" 
                                onClick={(e) => e.stopPropagation()} 
                            />
                        </div>
                    </div>
                )}

                {/* ============= SUBMISSION MODAL ============= */}
                {showSubmitModal && selectedTask && (
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
                        <Card className="w-full max-w-lg shadow-2xl scale-100 animate-in zoom-in-95 duration-200 border-0 dark:bg-slate-900">
                            <CardHeader className="bg-slate-50 dark:bg-slate-950 border-b dark:border-slate-800 pb-4">
                                <CardTitle className="text-xl">Submit Task</CardTitle>
                                <CardDescription className="text-base text-slate-600 dark:text-slate-400 font-medium">{selectedTask.title}</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6 pt-6">
                                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-100 dark:border-blue-800 text-sm text-blue-800 dark:text-blue-300 flex gap-3">
                                    <div className="mt-0.5"><AlertTriangle className="h-4 w-4"/></div>
                                    <div>{selectedTask.description}</div>
                                </div>

                                {selectedTask.verificationType === 'manual_link' ? (
                                    <div className="space-y-2">
                                        <Label>Proof Link (Tweet, Post, etc.)</Label>
                                        <Input placeholder="https://twitter.com/..." value={submissionData.proofUrl} onChange={e => setSubmissionData({...submissionData, proofUrl: e.target.value})} className="h-11 dark:bg-slate-950"/>
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        <Label>Upload Screenshot Proof</Label>
                                        <div className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl p-8 flex flex-col items-center justify-center text-center hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer relative bg-slate-50/50 dark:bg-slate-900">
                                            <Input type="file" accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer h-full" onChange={handleFileSelect} />
                                            <Upload className="h-10 w-10 text-slate-400 mb-3" />
                                            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">Click to upload image</p>
                                            <p className="text-xs text-muted-foreground mt-1">Max 2MB. 2048x2048px max.</p>
                                            {submissionData.file && <div className="mt-4 px-3 py-1 bg-green-100 text-green-700 text-xs font-bold rounded-full flex items-center"><CheckCircle2 className="h-3 w-3 mr-1" /> {submissionData.file.name}</div>}
                                        </div>
                                    </div>
                                )}

                                <div className="space-y-2">
                                    <Label>Notes (Optional)</Label>
                                    <Textarea placeholder="Add any extra details for the reviewer..." value={submissionData.notes} onChange={e => setSubmissionData({...submissionData, notes: e.target.value})} className="resize-none dark:bg-slate-950" rows={3}/>
                                </div>
                            </CardContent>
                            <CardFooter className="flex justify-end gap-3 border-t dark:border-slate-800 pt-4 bg-slate-50 dark:bg-slate-950 rounded-b-xl">
                                <Button variant="outline" onClick={() => setShowSubmitModal(false)}>Cancel</Button>
                                <Button onClick={handleSubmitTask} disabled={isSubmitting || (!submissionData.proofUrl && !submissionData.file)} className="bg-slate-900 text-white hover:bg-slate-800 dark:bg-white dark:text-black dark:hover:bg-slate-200">
                                    {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null} Submit for Review
                                </Button>
                            </CardFooter>
                        </Card>
                    </div>
                )}

                {/* ============= FUNDING MODAL ============= */}
                {showFundModal && (
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                        <Card className="w-full max-w-md shadow-2xl">
                            <CardHeader>
                                <CardTitle>Fund Reward Pool</CardTitle>
                                <CardDescription>Deposit tokens to activate this quest.<br/>Includes <strong>5% Platform Fee</strong>.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="bg-slate-100 dark:bg-slate-800 p-4 rounded-lg space-y-2 text-sm">
                                    <div className="flex justify-between"><span>Reward Pool Goal:</span><span className="font-bold">{rewardPoolAmount}</span></div>
                                    <div className="flex justify-between text-muted-foreground"><span>Platform Fee (5%):</span><span>+ {requiredFee.toFixed(4)}</span></div>
                                    <div className="border-t pt-2 mt-2 flex justify-between text-lg font-bold text-primary"><span>Total Required:</span><span>{totalRequired.toFixed(4)}</span></div>
                                </div>
                                <div className="space-y-2">
                                    <Label>Enter Deposit Amount (Total)</Label>
                                    <Input type="number" placeholder="0.00" value={totalRequired.toFixed(4)} onChange={(e) => setFundAmount(e.target.value)} className={isValidFundingAmount ? "border-green-500" : "border-red-500"}/>
                                    {!isValidFundingAmount && fundAmount && <p className="text-xs text-red-500">Amount must be exactly {totalRequired.toFixed(4)}</p>}
                                </div>
                            </CardContent>
                            <CardFooter className="flex justify-end gap-3">
                                <Button variant="outline" onClick={() => setShowFundModal(false)} disabled={isFunding}>Cancel</Button>
                                <Button onClick={handleFundQuest} disabled={!isValidFundingAmount || isFunding} className="bg-green-600 hover:bg-green-700 text-white">
                                    {isFunding ? <Loader2 className="h-4 w-4 animate-spin mr-2"/> : null} {isFunding ? "Processing..." : "Confirm & Deposit"}
                                </Button>
                            </CardFooter>
                        </Card>
                    </div>
                )}
            </div>
        </div>
    );
}