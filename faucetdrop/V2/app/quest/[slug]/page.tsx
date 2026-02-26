"use client";
import React, { useState, useEffect, useMemo } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { QUEST_ABI } from "@/lib/abis";
import { claimNoCodeViaBackend } from "@/lib/backend-service";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Loader2,
  ExternalLink,
  CheckCircle2,
  Clock,
  Trophy,
  Shield,
  Save,
  Edit2,
  X,
  Upload,
  Lock,
  ImageIcon,
  UserCircle,
  AlertTriangle,
  Coins,
  Sparkles,
  Gift,
  ZoomIn,
  Wallet,
  Copy,
  CalendarClock,
  Users,
  Twitter,
  Play,
  Link,
  Zap,
  MessageCircle,
  Send,
  UserPlus,
  LogIn,
  ArrowLeftRight,
  Rocket,
} from "lucide-react";
import { toast } from "sonner";
import { useWallet } from "@/hooks/use-wallet";
import { Contract, BrowserProvider, parseEther } from "ethers";
import { Header } from "@/components/header";
import { FAUCET_ABI_CUSTOM } from "@/lib/abis";

const API_BASE_URL = "https://fauctdrop-backend.onrender.com"; // <-- REPLACE WITH ACTUAL BACKEND URL

// ============= TYPES =============
export type VerificationType =
  | "auto_social"
  | "auto_tx"
  | "manual_link"
  | "manual_upload"
  | "system_referral"
  | "system_daily"
  | "none"
  | "onchain";

interface QuestTask {
  id: string;
  title: string;
  description: string;
  targetHandle?: string;
  points: number; // or string | number, depending on your DB
  category: string;
  targetContractAddress?: string; // Make this optional (?)
  verificationType: VerificationType;
  url: string;
  stage: string;
  required: boolean;
  action: string;
  isSystem?: boolean;
  targetPlatform?: string;
  // --- ADD THESE NEW FIELDS ---
  minAmount?: string | number;
  minTxCount?: string | number;
  minDays?: string | number;
  targetChainId?: string;
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
  username: string | null;
  avatarUrl?: string | null;
  points: number;
  completedTasks: number;
}

interface UserProfile {
  wallet_address: string;
  username: string | null;
  avatar_url?: string;
  twitter_handle?: string;
}

interface ParticipantData {
  referral_id: string;
  referral_count: number;
  last_checkin_at: string | null;
  points: number;
}
// ============= COMPONENT =============
export default function QuestDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const refCode = searchParams.get("ref");
  const { address: userWalletAddress, provider: walletProvider } = useWallet();

  // Helper: Extract Address from Slug
  const rawSlug = (params.addresss || params.faucetAddress) as
    | string
    | undefined;
  

  // ============= STATE =============
  const [questData, setQuestData] = useState<any | null>(null);
  const [faucetAddress, setFaucetAddress] = useState<string | undefined>(undefined);
  
  const [userProgress, setUserProgress] = useState<UserProgress>({
    totalPoints: 0,
    stagePoints: {},
    completedTasks: [],
    currentStage: "Beginner",
    submissions: [],
  });
  const [pendingSubmissions, setPendingSubmissions] = useState<any[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [hasOpenedLink, setHasOpenedLink] = useState<Record<string, boolean>>({});
  // Participant data for referrals & check-in
  const [participantData, setParticipantData] = useState<ParticipantData | null>(
    null
  );
  const [isJoining, setIsJoining] = useState(false);
  const [isCheckingIn, setIsCheckingIn] = useState(false);

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
  const [submissionData, setSubmissionData] = useState({
    proofUrl: "",
    notes: "",
    file: null as File | null,
  });
  const [submittingTaskId, setSubmittingTaskId] = useState<string | null>(null);

  // Admin Fund Modal State
  const [showFundModal, setShowFundModal] = useState(false);
  const [fundAmount, setFundAmount] = useState<string>("");

  // Admin Edit Form
  const [editForm, setEditForm] = useState({
    title: "",
    description: "",
    rewardPool: "",
    imageUrl: "",
    isActive: true,
  });

  const isCreator =
    userWalletAddress &&
    questData &&
    questData.creatorAddress.toLowerCase() === userWalletAddress.toLowerCase();

  const stages = ["Beginner", "Intermediate", "Advance", "Legend", "Ultimate"];
useEffect(() => {
    // Correctly access the slug from params
    const slug = params.slug as string;
    if (!slug) return;

    const loadQuestBySlug = async () => {
      setIsLoading(true);
      try {
        // 1. Fetch from your NEW slug-based endpoint
        const response = await fetch(`${API_BASE_URL}/api/quests/by-slug/${slug}`);
        const json = await response.json();

        if (json.success && json.quest) {
          setQuestData(json.quest);
          // Set the internal faucetAddress state from the DB result
          setFaucetAddress(json.quest.faucetAddress);
          
          // Sync edit form
          setEditForm({
            title: json.quest.title,
            description: json.quest.description,
            rewardPool: json.quest.rewardPool,
            imageUrl: json.quest.imageUrl || "",
            isActive: json.quest.isActive,
          });
        } else {
          toast.error("Quest not found");
        }
      } catch (error) {
        console.error("Fetch error:", error);
        toast.error("Failed to load quest details");
      } finally {
        setIsLoading(false);
      }
    };

    loadQuestBySlug();
  }, [params.slug]);
  useEffect(() => {
    // Only run these once we have the faucetAddress from the slug lookup
    if (!faucetAddress) return;

    const loadLiveStats = async () => {
      try {
        const lbRes = await fetch(`${API_BASE_URL}/api/quests/${faucetAddress}/leaderboard`);
        const lbJson = await lbRes.json();
        if (lbJson.success) setLeaderboard(lbJson.leaderboard);
      } catch (e) {
        console.error("Leaderboard fetch failed", e);
      }
    };

    loadLiveStats();
  }, [faucetAddress]);

  useEffect(() => {
    if (!faucetAddress || !userWalletAddress || !hasUsername) return;
    
    const fetchUserSpecifics = async () => {
      try {
        const progRes = await fetch(`${API_BASE_URL}/api/quests/${faucetAddress}/progress/${userWalletAddress}`);
        const progJson = await progRes.json();
        if (progJson.success) setUserProgress(progJson.progress);
        
        // Handle admin rehydration if applicable
        if (isCreator) {
          const pendingRes = await fetch(`${API_BASE_URL}/api/quests/${faucetAddress}/submissions/pending`);
          const pendingJson = await pendingRes.json();
          // ... (rest of your pending submissions mapping logic)
        }
      } catch (e) {
        console.error("Progress fetch failed", e);
      }
    };

    fetchUserSpecifics();
  }, [faucetAddress, userWalletAddress, hasUsername, isCreator]);
  // ============= TOKEN SYMBOL LOGIC =============
  const tokenSymbol = questData?.tokenSymbol || "Tokens";

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
    const claimWindowEnd = new Date(
      endDate.getTime() + (questData.claimWindowHours || 168) * 60 * 60 * 1000
    );
    const now = new Date();

    if (now < endDate) return { isActive: false, message: "Quest active" };
    if (now > claimWindowEnd) return { isActive: false, message: "Claim ended" };
    return { isActive: true, message: "Claim Live" };
  }, [questData]);

  const allParticipants = leaderboard.filter(
    (entry) =>
      entry.walletAddress.toLowerCase() !== questData?.creatorAddress.toLowerCase()
  );

  // Add them together instead of picking one
const totalPoints = participantData?.points || 0;

  // ============= HELPER FUNCTIONS =============
  const loadUserProgress = async () => {
  if (!faucetAddress || !userWalletAddress) return;
  try {
    const res = await fetch(
  `${API_BASE_URL}/api/quests/${faucetAddress}/progress/${userWalletAddress}?t=${Date.now()}`,
  { cache: "no-store", credentials: "include" } // if using auth
);

    const json = await res.json();
    if (json.success) {
      setUserProgress(json.progress); // This is what triggers the UI update
    }
  } catch (e) {
    console.error("Reload failed", e);
  }
};

  const handleXShareAction = (task: QuestTask) => {
    const targetHandle = "@FaucetDrops";
    // Constructing the message with the user's referral link
    const referralLink = `${window.location.origin}${window.location.pathname}?ref=${participantData?.referral_id}`;
    
    const message = `I am participating in a quest on ${targetHandle}. Join me and earn rewards here: ${referralLink}`;
    
    const xIntentUrl = `https://x.com/intent/tweet?text=${encodeURIComponent(message)}`;
    window.open(xIntentUrl, "_blank");
};
  const handleJoin = async () => {
    if (!userWalletAddress || !faucetAddress) return;
    setIsJoining(true);
    try {
      const payload = {
        walletAddress: userWalletAddress,
        referralCode: refCode || null,
      };
      const res = await fetch(`${API_BASE_URL}/api/quests/${faucetAddress}/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (json.success) {
        // Always prefer the full participant object if returned
        if (json.participant) {
          setParticipantData(json.participant);
        } else if (json.referralId) {
          // Fallback for "already joined" case where only referralId is returned
          setParticipantData((prev) =>
            prev
              ? {
                  ...prev,
                  referral_id: json.referralId,
                }
              : {
                  referral_id: json.referralId,
                  referral_count: 0,
                  last_checkin_at: null,
                  points: 0,
                }
          );
        }

        toast.success("Successfully joined the Quest!");
        if (refCode) toast.success("Referral Bonus applied if code was valid.");

        // Always reload full progress to ensure points/referral count are up-to-date
        await loadUserProgress();
      } else {
        toast.error(json.message || "Join failed");
      }
    } catch (e: any) {
      toast.error(e.message || "Join failed");
    } finally {
      setIsJoining(false);
    }
  };

  const handleDailyCheckin = async () => {
    if (!userWalletAddress || !faucetAddress || isCreator) return;
    setIsCheckingIn(true);
    try {
      const payload = { walletAddress: userWalletAddress };
      const res = await fetch(`${API_BASE_URL}/api/quests/${faucetAddress}/checkin`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (json.success) {
        toast.success("Check-in successful! +10 points awarded.");
        // Use returned full participant data if available
        if (json.participant) {
          setParticipantData(json.participant);
        } else {
          // Fallback: manual increment
          setParticipantData((prev) =>
            prev
              ? {
                  ...prev,
                  last_checkin_at: new Date().toISOString(),
                  points: (prev.points || 0) + 10,
                }
              : null
          );
        }
        await loadUserProgress(); // Always reload full progress
      } else {
        toast.error(json.message || "Cannot check in yet");
      }
    } catch (e: any) {
      toast.error("Check-in failed");
    } finally {
      setIsCheckingIn(false);
    }
  };

  const getCheckinStatus = () => {
    if (!participantData?.last_checkin_at)
      return { canCheckin: true, message: "Check in now for +10 points!" };
    const last = new Date(participantData.last_checkin_at);
    const next = new Date(last.getTime() + 24 * 60 * 60 * 1000);
    const now = new Date();
    if (now >= next) return { canCheckin: true, message: "Available now!" };
    const remainingMs = next.getTime() - now.getTime();
    const hours = Math.floor(remainingMs / (1000 * 60 * 60));
    const minutes = Math.floor((remainingMs % (1000 * 60 * 60)) / (1000 * 60));
    return { canCheckin: false, message: `Next check-in in ${hours}h ${minutes}m` };
  };

  // Auto-join / load participant data when eligible
  useEffect(() => {
    if (!hasUsername || !userWalletAddress || !faucetAddress || participantData) return;
    handleJoin(); // Safe — handles existing join too
  }, [hasUsername, userWalletAddress, faucetAddress]);

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

  // WORKER 1: Fetch the global data once
  useEffect(() => {
    if (!faucetAddress) return;

    const loadGlobalData = async () => {
      setIsLoading(true);
      try {
        const questRes = await fetch(`${API_BASE_URL}/api/quests/${faucetAddress}`);
        const questJson = await questRes.json();
        if (questJson.success) {
          setQuestData(questJson.quest);
        }

        const lbRes = await fetch(
          `${API_BASE_URL}/api/quests/${faucetAddress}/leaderboard`
        );
        const lbJson = await lbRes.json();
        if (lbJson.success) {
          setLeaderboard(lbJson.leaderboard);
        }
      } catch (error) {
        console.error("Leaderboard fetch failed", error);
      } finally {
        setIsLoading(false);
      }
    };
    loadGlobalData();
  }, [faucetAddress]); // No more participantData here! The loop is broken.

  // 1. Precise Timing Logic
  const questTiming = useMemo(() => {
    if (!questData || !questData.startDate || !questData.endDate) {
      return { isLive: false, notStartedYet: true, isEnded: false };
    }
    const now = new Date();
    const start = new Date(questData.startDate);
    const end = new Date(questData.endDate);

    return {
      isLive: now >= start && now <= end && questData.isActive,
      notStartedYet: now < start,
      isEnded: now > end,
      isPaused: !questData.isActive,
    };
  }, [questData]);

  // 2. Leaderboard Filter (Hides Admin completely)
const displayLeaderboard = useMemo(() => {
  let list = [...leaderboard];

  if (userWalletAddress && participantData && !isCreator) {
    const myWalletLower = userWalletAddress.toLowerCase();

    // Always build fresh "me" entry from **current** state
    const myLatestEntry = {
      rank: 0,
      walletAddress: userWalletAddress,
      username: userProfile?.username || "You",
      avatarUrl: userProfile?.avatar_url || null,
      points: participantData.points || 0,
      // ─── Use current (fresh) userProgress here ───
      completedTasks: userProgress?.completedTasks?.length || 0,
    };

    const myIndex = list.findIndex(e => e.walletAddress.toLowerCase() === myWalletLower);

    if (myIndex !== -1) {
      // Merge: keep server rank/points if available, but force completedTasks from local
      list[myIndex] = {
        ...list[myIndex],
        ...myLatestEntry,
        // Preserve server rank if it exists
        rank: list[myIndex].rank || 0,
      };
    } else {
      // Not in top list yet → add at bottom
      list.push(myLatestEntry);
    }
  }

  // Final filter (hide creator) + sort + assign ranks
  return list
    .filter(entry => {
      const entryWallet = entry.walletAddress.toLowerCase();
      const creatorWallet = questData?.creatorAddress?.toLowerCase();
      return entryWallet !== creatorWallet;
    })
    .sort((a, b) => b.points - a.points)
    .map((entry, idx) => ({ ...entry, rank: idx + 1 }));

}, [
  leaderboard,           // when server leaderboard updates
  participantData,       // when referral/check-in updates points
  userProgress,          // ← critical: when completedTasks changes
  userWalletAddress,
  userProfile,
  questData,
  isCreator
]);

  // ============= 3. LOAD USER PROGRESS =============
  useEffect(() => {
    if (!faucetAddress || !userWalletAddress || !hasUsername) return;
    const fetchUserSpecifics = async () => {
      try {
        const progRes = await fetch(
          `${API_BASE_URL}/api/quests/${faucetAddress}/progress/${userWalletAddress}`
        );
        const progJson = await progRes.json();
        if (progJson.success) setUserProgress(progJson.progress);
        if (isCreator) {
          const pendingRes = await fetch(
            `${API_BASE_URL}/api/quests/${faucetAddress}/submissions/pending`
          );
          const pendingJson = await pendingRes.json();

          if (pendingJson.success) {
            const rawSubmissions = pendingJson.submissions;

            const enrichedSubmissions = await Promise.all(
              rawSubmissions.map(async (sub: any) => {
                const relatedTask = questData?.tasks?.find((t: any) => t.id === sub.taskId);
                const taskPoints = relatedTask ? relatedTask.points : 0;
                try {
                  const profileRes = await fetch(`${API_BASE_URL}/api/profile/${sub.walletAddress}`);
                  const profileJson = await profileRes.json();
                  return {
                    ...sub,
                    taskPoints,
                    username: profileJson.success && profileJson.profile ? profileJson.profile.username : "Unknown User",
                    avatarUrl: profileJson.success && profileJson.profile ? profileJson.profile.avatar_url : null,
                  };
                } catch {
                  return { ...sub, taskPoints, username: "Unknown User", avatarUrl: null };
                }
              })
            );

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
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm),
      });
      const result = await response.json();
      if (result.success) {
        setQuestData((prev: any) => ({ ...prev, ...editForm }));
        setIsEditing(false);
        toast.success("Quest details updated.");
      }
    } catch (error) {
      toast.error("Failed to save changes.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      toast.error("File size exceeds 2MB limit.");
      e.target.value = "";
      return;
    }
    const img = new Image();
    img.src = URL.createObjectURL(file);
    img.onload = () => {
      if (img.width > 2048 || img.height > 2048) {
        toast.error("Image dimensions exceed 2048x2048px limit.");
        e.target.value = "";
        setSubmissionData((prev) => ({ ...prev, file: null }));
      } else {
        setSubmissionData((prev) => ({ ...prev, file }));
      }
    };
  };

const handleSubmitTask = async () => {
  if (!selectedTask || !userWalletAddress) return;
  setSubmittingTaskId(selectedTask.id);

  // Helper: cancel a submission so the task goes back to "available"
  const cancelSubmission = async (submissionId: string) => {
    try {
      await fetch(
        `${API_BASE_URL}/api/quests/${faucetAddress}/submissions/${submissionId}`,
        { method: "DELETE" }
      );
    } catch {
      // Best-effort — even if this fails the user can reload
    }
    await loadUserProgress(); // Re-render task as "available"
  };

  try {
    const formData = new FormData();
    formData.append("walletAddress", userWalletAddress);
    formData.append("taskId", selectedTask.id);
    formData.append("submissionType", selectedTask.verificationType);

    const finalProofUrl =
      selectedTask.action === "quote" || selectedTask.verificationType === "manual_link"
        ? submissionData.proofUrl
        : selectedTask.url;

    formData.append("submittedData", finalProofUrl || "");

    // Create the submission record
    const response = await fetch(
      `${API_BASE_URL}/api/quests/${faucetAddress}/submissions`,
      { method: "POST", body: formData }
    );
    const result = await response.json();
    if (!result.success) throw new Error(result.message || "Failed to submit task");

    const submissionId = result.submissionId;

    // ─────────────────────────────────────────────────────────
    // CASE 1: TELEGRAM AUTO-VERIFY
    // ─────────────────────────────────────────────────────────
    if (
      selectedTask.verificationType === "auto_social" &&
      selectedTask.targetPlatform === "Telegram"
    ) {
      const verifyRes = await fetch(`${API_BASE_URL}/api/bot/verify-telegram`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          submissionId,
          faucetAddress,
          walletAddress: userWalletAddress,
          taskUrl: selectedTask.url,
          taskAction: selectedTask.action,
        }),
      });
      const verifyJson = await verifyRes.json();

      if (verifyJson.verified) {
        toast.success("✅ Telegram membership verified! Points awarded.");
        // Refresh and close
        await loadUserProgress();
        const lbRes = await fetch(`${API_BASE_URL}/api/quests/${faucetAddress}/leaderboard`);
        const lbJson = await lbRes.json();
        if (lbJson.success) setLeaderboard(lbJson.leaderboard);
        setShowSubmitModal(false);
        setSubmissionData({ proofUrl: "", notes: "", file: null });
      } else {
        // Verification failed — cancel submission so task stays retryable
        await cancelSubmission(submissionId);

        if (verifyJson.reason === "telegram_not_linked") {
          toast.error("⚠️ Connect your Telegram in Profile Settings first.", {
            action: {
              label: "Open Profile",
              onClick: () => router.push(`/dashboard/${userWalletAddress}`),
            },
          });
        } else if (verifyJson.reason === "not_member") {
          toast.error("❌ You are not a member of this channel yet. Join first then try again.");
        } else if (verifyJson.reason === "bot_not_admin") {
          toast.error("❌ Bot verification unavailable for this channel. Contact the quest creator.");
        } else {
          toast.error("❌ " + (verifyJson.message || "Verification failed. Please try again."));
        }
      }

    // ─────────────────────────────────────────────────────────
    // CASE 2: TWITTER / DISCORD AUTO-VERIFY
    // ─────────────────────────────────────────────────────────
    } else if (selectedTask.verificationType === "auto_social") {
      const verifyRes = await fetch(`${API_BASE_URL}/api/bot/verify-social`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          submissionId,
          faucetAddress,
          walletAddress: userWalletAddress,
          handle: userProfile?.twitter_handle || userProfile?.username || "",
          proofUrl: finalProofUrl,
          taskType: selectedTask.action,
        }),
      });
      const verifyJson = await verifyRes.json();

      if (verifyJson.verified) {
        toast.success("✅ Task verified! Points added.");
        await loadUserProgress();
        const lbRes = await fetch(`${API_BASE_URL}/api/quests/${faucetAddress}/leaderboard`);
        const lbJson = await lbRes.json();
        if (lbJson.success) setLeaderboard(lbJson.leaderboard);
        setShowSubmitModal(false);
        setSubmissionData({ proofUrl: "", notes: "", file: null });
      } else {
        // Verification failed — cancel so user can retry
        await cancelSubmission(submissionId);
        toast.error("❌ " + (verifyJson.message || "Verification failed. Complete the action then try again."));
      }

    // ─────────────────────────────────────────────────────────
    // CASE 3: NO VERIFICATION (Watch / Visit)
    // ─────────────────────────────────────────────────────────
    } else if (selectedTask.verificationType === "none") {
      toast.success("✅ Task completed! Points added.");
      await loadUserProgress();
      const lbRes = await fetch(`${API_BASE_URL}/api/quests/${faucetAddress}/leaderboard`);
      const lbJson = await lbRes.json();
      if (lbJson.success) setLeaderboard(lbJson.leaderboard);
      setShowSubmitModal(false);
      setSubmissionData({ proofUrl: "", notes: "", file: null });

    // ─────────────────────────────────────────────────────────
    // CASE 4: MANUAL / UPLOAD / AUTO_TX / ONCHAIN
    // ─────────────────────────────────────────────────────────
    } else {
      toast.info("📋 Task submitted for manual review.");
      await loadUserProgress();
      setShowSubmitModal(false);
      setSubmissionData({ proofUrl: "", notes: "", file: null });
    }

  } catch (error: any) {
    toast.error(error.message || "An error occurred. Please try again.");
  } finally {
    setSubmittingTaskId(null);
  }
};


  const handleReviewSubmission = async (submissionId: string, status: "approved" | "rejected") => {
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/quests/${faucetAddress}/submissions/${submissionId}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status }),
        }
      );
      const result = await response.json();
      if (result.success) {
        setPendingSubmissions((prev) => prev.filter((s) => s.submissionId !== submissionId));
        toast.success(`Submission ${status}`);
      }
    } catch (error) {
      toast.error("Action failed.");
    }
  };

  
  // Inside QuestDetailsPage component...

// 1. IMPROVED FUNDING LOGIC
const handleFundQuest = async () => {
  if (!walletProvider || !faucetAddress) {
    toast.error("Wallet not connected.");
    return;
  }
  setIsFunding(true);
  try {
    const provider = walletProvider as BrowserProvider;
    const signer = await provider.getSigner();
    const userAddress = await signer.getAddress();

    // Use rewardPool from DB as the base
    const baseAmountWei = parseEther(rewardPoolAmount.toString());
    // Contract calculates 5% Backend and 2% Vault fee internally during 'fund'
    // Total needed from user: base + (base * 0.07)
    const totalAmountWei = baseAmountWei + (baseAmountWei * 7n) / 100n;

    const tokenAddress = questData.tokenAddress;

    // Check Balance & Allowance
    const ERC20_ABI = [
      "function approve(address s, uint256 a) public returns (bool)",
      "function balanceOf(address a) public view returns (uint256)",
      "function allowance(address o, address s) public view returns (uint256)",
    ];
    
    const tokenContract = new Contract(tokenAddress, ERC20_ABI, signer);
    const balance = await tokenContract.balanceOf(userAddress);
    
    if (balance < totalAmountWei) throw new Error("Insufficient token balance for prize + fees.");

    const currentAllowance = await tokenContract.allowance(userAddress, faucetAddress);
    if (currentAllowance < totalAmountWei) {
      toast.info("Approving tokens...");
      const appTx = await tokenContract.approve(faucetAddress, totalAmountWei);
      await appTx.wait();
    }

    // Call 'fund' on QUEST_ABI
    const questContract = new Contract(faucetAddress, QUEST_ABI, signer);
    const tx = await questContract.fund(baseAmountWei);
    toast.info("Funding transaction sent...");
    await tx.wait();

    // Notify Backend that it's funded so it updates the database
    await fetch(`${API_BASE_URL}/api/quests/${faucetAddress}/set-funded`, { method: 'POST' });

    toast.success("Quest funded and activated!");
    setQuestData((prev: any) => ({ ...prev, isFunded: true }));
    setShowFundModal(false);
  } catch (error: any) {
    console.error(error);
    toast.error(error.reason || error.message || "Funding failed");
  } finally {
    setIsFunding(false);
  }
};

// 2. CONNECTED CLAIM VIA BACKEND
const handleClaimReward = async () => {
  if (!walletProvider || !userWalletAddress || !faucetAddress) return;
  setIsClaiming(true);
  try {
    const provider = walletProvider as BrowserProvider;
    
    // Using your provided claimNoCodeViaBackend function logic
    const result = await claimNoCodeViaBackend(
      userWalletAddress,
      faucetAddress,
      provider
    );

    if (result.success) {
      toast.success("Reward distributed successfully!");
      // Optionally reload progress to show 'Claimed' status
      await loadUserProgress();
    }
  } catch (e: any) {
    console.error(e);
    toast.error(e.message || "Claim process failed");
  } finally {
    setIsClaiming(false);
  }
};

// 3. QUEST STATUS GUARDS (Computed)
const questStatusGuard = useMemo(() => {
    const now = new Date();
    const start = questData?.startDate ? new Date(questData.startDate) : null;
    
    if (!questData?.isFunded) {
        return { 
            blocked: true, 
            title: "Quest Unfunded", 
            desc: "The creator has not funded the reward pool yet." 
        };
    }
    if (start && now < start) {
        return { 
            blocked: true, 
            title: "Coming Soon", 
            desc: `This quest starts on ${start.toLocaleDateString()} at ${start.toLocaleTimeString()}.` 
        };
    }
    return { blocked: false };
}, [questData]);

 const getTaskStatus = (task: QuestTask) => {
  if (!participantData) return "locked";

  // 1. Get the Task ID safely
  const currentTaskId = task.id || (task as any)._id;

  // CRITICAL FIX: If the task has no ID, stop immediately.
  // This prevents the "undefined === undefined" global bug.
  if (!currentTaskId) return "available"; 

  // 2. Check Completed
  if (userProgress.completedTasks.includes(currentTaskId)) return "completed";

  // 3. Check Pending
  const pending = userProgress.submissions?.find((s) => {
    const submissionTaskId = s.taskId || s.task_id; // Handle DB naming differences
    
    // CRITICAL FIX: If submission has no ID, it cannot match anything.
    if (!submissionTaskId) return false;

    return String(submissionTaskId) === String(currentTaskId) && s.status === "pending";
  });

  if (pending) return "pending";

  // 4. Check Locking
  const stageIndex = stages.indexOf(task.stage);
  const userStageIndex = stages.indexOf(userProgress.currentStage);
  if (stageIndex > userStageIndex) return "locked";

  return "available";
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

  if (!userWalletAddress) {
    return (
      <div className="flex flex-col min-h-screen">
        <Header pageTitle={questData?.title || "Quest Details"} />
        <div className="flex-1 flex items-center justify-center p-4">
          <Card className="w-full max-w-md shadow-2xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 relative overflow-hidden text-center">
            <CardHeader className="pb-2 pt-8">
              <div className="mx-auto bg-slate-100 dark:bg-slate-900 p-4 rounded-full mb-4 w-fit ring-1 ring-slate-200 dark:ring-slate-800">
                {/* Changed from Wallet to Rocket. Make sure to update your lucide-react imports! */}
                <Rocket className="h-10 w-10 text-slate-600 dark:text-slate-400" />
              </div>
              <CardTitle className="text-xl font-bold text-slate-900 dark:text-slate-100">
                Ready to Start?
              </CardTitle>
              <CardDescription className="text-base mt-2 mx-auto leading-relaxed">
                Sign in or create an account to view this Quest and participate.
              </CardDescription>
            </CardHeader>
            <CardFooter className="pt-4 flex justify-center pb-8">
              <p className="text-sm text-muted-foreground">
                Click the "Get Started" button in the header.
              </p>
            </CardFooter>
          </Card>
        </div>
      </div>
    );
  }
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

  if (!questData)
    return (
      <div className="flex flex-col min-h-screen">
        <Header pageTitle="Not Found" />
        <div className="p-10 text-center">Quest not found.</div>
      </div>
    );

  const currentStageData = questData.stagePassRequirements || {};
  const pointsForCurrentStage = userProgress.stagePoints[userProgress.currentStage] || 0;
  const requiredForCurrent = currentStageData[userProgress.currentStage] || 100;
const progressPercent = Math.min((totalPoints / requiredForCurrent) * 100, 100);

  const filteredLeaderboard = leaderboard.filter(
    (entry) =>
      entry.walletAddress.toLowerCase() !== questData.creatorAddress.toLowerCase() &&
      entry.points > 0
  );

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header pageTitle={questData.title} />

      <div className="max-w-7xl mx-auto w-full p-4 sm:p-6 space-y-8 pb-20 relative">
        {/* ============= HERO SECTION ============= */}
        <div className="relative rounded-xl overflow-hidden bg-slate-900 border border-slate-800 shadow-2xl min-h-[300px]">
          <div className="absolute inset-0 z-0">
            <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-900/90 to-transparent" />
            {editForm.imageUrl || questData.imageUrl ? (
              <img
                src={editForm.imageUrl || questData.imageUrl}
                alt="Background"
                className="w-full h-full object-cover opacity-30 blur-sm scale-105"
              />
            ) : null}
          </div>

          <div className="relative z-10 p-6 md:p-10 flex flex-col md:flex-row gap-8 items-start h-full">
            {/* Main Image */}
            <div className="w-full md:w-64 h-64 shrink-0 rounded-lg overflow-hidden border-2 border-slate-700/50 shadow-xl bg-slate-950 flex items-center justify-center group relative">
              {isEditing ? (
                <div className="absolute inset-0 z-20 bg-black/80 flex flex-col items-center justify-center p-4">
                  <ImageIcon className="h-8 w-8 text-slate-400 mb-2" />
                  <Input
                    className="bg-black/50 border-slate-600 text-white h-8 text-xs w-full"
                    value={editForm.imageUrl}
                    placeholder="Image URL..."
                    onChange={(e) => setEditForm({ ...editForm, imageUrl: e.target.value })}
                  />
                </div>
              ) : (
                <img
                  src={questData.imageUrl}
                  alt="Quest Cover"
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                />
              )}
            </div>

            {/* Text Content */}
            <div className="flex-1 w-full space-y-6">
              <div className="flex justify-between items-start">
                <div className="space-y-2 w-full">
                  <div className="flex flex-col gap-2">
                    {isEditing ? (
                      <div className="flex items-center gap-4 w-full">
                        <Input
                          value={editForm.title}
                          onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                          className="text-3xl font-bold bg-white/10 border-white/20 text-white h-auto py-2"
                        />
                        <div className="flex items-center gap-2 bg-black/40 px-3 py-2 rounded-lg border border-white/10">
                          <Label className="text-white whitespace-nowrap">Active</Label>
                          <Switch checked={editForm.isActive} onCheckedChange={(c) => setEditForm({ ...editForm, isActive: c })} />
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
                    <Textarea
                      value={editForm.description}
                      onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                      className="bg-white/10 border-white/20 text-slate-200 min-h-[100px]"
                    />
                  ) : (
                    <p className="text-slate-300 text-lg leading-relaxed max-w-2xl">{questData.description}</p>
                  )}
                </div>

                {/* Creator Controls */}
                {isCreator && (
                  <div className="hidden md:block pl-4 space-y-2">
                    {isEditing ? (
                      <div className="flex gap-2 flex-col">
                        <Button size="sm" className="bg-green-600 hover:bg-green-500 w-full" onClick={handleSaveDetails} disabled={isSaving}>
                          {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4 mr-2" />} Save
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => setIsEditing(false)} disabled={isSaving} className="w-full text-black bg-white/80 hover:bg-white">
                          <X className="w-4 h-4 mr-2" /> Cancel
                        </Button>
                      </div>
                    ) : (
                      <>
                        <Button variant="secondary" size="sm" className="w-full" onClick={() => setIsEditing(true)}>
                          <Edit2 className="w-4 h-4 mr-2" /> Edit
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

              {/* Stats Row + Join Button */}
              <div className="flex flex-col sm:flex-row flex-wrap gap-4 pt-4 items-end">
                <div className="flex flex-wrap gap-4">
                  <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-lg px-5 py-3 flex items-center gap-4 min-w-[160px]">
                    <div className="p-2 bg-yellow-500/20 rounded-full text-yellow-400">
                      <Trophy className="h-6 w-6" />
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Reward Pool</div>
                      {isEditing ? (
                        <Input value={editForm.rewardPool} onChange={(e) => setEditForm({ ...editForm, rewardPool: e.target.value })} className="h-6 bg-transparent border-b border-white/30 rounded-none text-white font-bold p-0 focus-visible:ring-0 focus-visible:border-white" />
                      ) : (
                        <div className="text-xl font-bold text-white">{questData.rewardPool} {tokenSymbol}</div>
                      )}
                    </div>
                  </div>
                  <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-lg px-5 py-3 flex items-center gap-4 min-w-[160px]">
                    <div className="p-2 bg-green-500/20 rounded-full text-green-400">
                      <Users className="h-6 w-6" />
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Participants</div>
                      <div className="text-xl font-bold text-white">{questData.totalParticipants || 0}</div>
                    </div>
                  </div>

                  {/* NEW: Copy Quest Link Button */}
                  <Button
                    variant="outline"
                    size="lg"
                    className="bg-white/5 border-white/10 text-white hover:bg-white/10 h-auto py-3 px-6"
                    onClick={() => {
                      const link = window.location.href.split("?")[0]; // Clean link without ref codes
                      navigator.clipboard.writeText(link);
                      toast.success("Quest link copied to clipboard!");
                    }}
                  >
                    <Copy className="mr-2 h-5 w-5" />
                    Copy Quest Link
                  </Button>
                  <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-lg px-5 py-3 flex items-center gap-4 min-w-[160px]">
                    <div className="p-2 bg-blue-500/20 rounded-full text-blue-400">
                      <Shield className="h-6 w-6" />
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Your Stage</div>
                      <div className="text-xl font-bold text-white">{participantData ? userProgress.currentStage : "Not Joined"}</div>
                    </div>
                  </div>
                </div>

                {/* Join Button in Hero */}
                {!participantData && (
                  <Button size="lg" onClick={handleJoin} disabled={isJoining} className="min-w-[200px]">
                    {isJoining ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : null}
                    {isJoining ? "Joining..." : "Join Quest to Participate"}
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ============= PROGRESS BAR (only if joined) ============= */}
        {!isCreator && participantData && (
          <Card className="border-none bg-slate-50 dark:bg-slate-900/50 shadow-sm">
            <CardContent className="p-6">
              <div className="flex justify-between items-end mb-3">
                <div>
                  <h3 className="font-bold text-lg flex items-center gap-2">
                    Your Progress
                    <Badge variant="outline" className="text-primary border-primary bg-primary/5">{userProgress.currentStage}</Badge>
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Earn <strong>{Math.max(0, requiredForCurrent - totalPoints)}</strong> more points to level up.
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-3xl font-black text-primary">{totalPoints}</div>
                  <div className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Total Points</div>
                </div>
              </div>
              <Progress value={progressPercent} className="h-4 rounded-full" />
            </CardContent>
          </Card>
        )}

       
       {/* ============= GLOBAL STATUS OVERLAY ============= */}
          

        {/* ============= TABS (with overlay blocking interaction if not joined) ============= */}
        <div className="relative">
          {/* Interaction blocker for tabs/content when not joined */}
          {!participantData && <div className="absolute inset-0 z-40 pointer-events-auto cursor-not-allowed" />}

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
                  <div key={stage} className={`space-y-4 ${isLockedStage || !participantData ? "opacity-50" : ""}`}>
                    <div className="flex items-center gap-4">
                      <Badge variant="outline" className={`px-4 py-1 text-sm font-bold uppercase tracking-wide ${isLockedStage || !participantData ? "border-slate-300 text-slate-400" : "border-primary/50 text-primary bg-primary/5"}`}>{stage}</Badge>
                      <div className="h-px bg-border flex-1" />
                      {(isLockedStage || !participantData) && <Lock className="h-4 w-4 text-muted-foreground" />}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                      {stageTasks.map((task: any) => {
                        if (task.id === "sys_daily") {
                          const checkinStatus = getCheckinStatus();
                          return (
                            <Card key={task.id} className={`group relative overflow-hidden transition-all duration-300 h-full flex flex-col ${!participantData ? "opacity-50" : ""}`}>
                              <CardContent className="p-5 flex flex-col h-full">
                                <div className="flex justify-between items-start mb-4">
                                  <div className="p-2 rounded-lg bg-primary/10 text-primary">
                                    <CalendarClock className="h-5 w-5" />
                                  </div>
                                  <Badge variant="secondary">+10 PTS</Badge>
                                </div>
                                <h3 className="font-bold text-lg mb-2">{task.title}</h3>
                                <p className="text-sm text-muted-foreground flex-1">{task.description}</p>
                                <div className="mt-4 pt-4 border-t">
                                  {participantData && !isCreator ? (
                                    checkinStatus.canCheckin ? (
                                      <Button
                                        onClick={handleDailyCheckin}
                                        disabled={isCheckingIn || !checkinStatus.canCheckin || !questTiming.isLive}
                                        className="w-full"
                                      >
                                        {isCheckingIn ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                        {questTiming.notStartedYet ? "Check-in Locked" : "Check In Now +10 pts"}
                                      </Button>
                                    ) : (
                                      <div className="text-center space-y-2">
                                        <p className="text-sm font-medium text-green-600">✓ Checked in today!</p>
                                        <p className="text-xs text-muted-foreground">{checkinStatus.message}</p>
                                      </div>
                                    )
                                  ) : (
                                    <div className="text-center text-muted-foreground">
                                      {isCreator ? "Creators cannot check in" : "Join quest to check in"}
                                    </div>
                                  )}
                                </div>
                              </CardContent>
                            </Card>
                          );
                        }

                        if (task.id === "sys_referral") {
                          if (!participantData) return null;
                          const refCount = participantData.referral_count || 0;
                          const referralLink = `${window.location.origin}${window.location.pathname}?ref=${participantData.referral_id}`;

                          return (
                            <Card key={task.id} className="group relative overflow-hidden transition-all duration-300 h-full flex flex-col">
                              <CardContent className="p-5 flex flex-col h-full">
                                <div className="flex justify-between items-start mb-4">
                                  <div className="p-2 rounded-lg bg-primary/10 text-primary">
                                    <Users className="h-5 w-5" />
                                  </div>
                                  <Badge variant="secondary">+10 PTS each</Badge>
                                </div>
                                <h3 className="font-bold text-lg mb-2">{task.title}</h3>
                                <p className="text-sm text-muted-foreground flex-1">{task.description}</p>
                                <div className="mt-4 space-y-4">
                                  <div>
                                    <Label className="text-xs">Your Referral Link</Label>
                                    <div className="flex gap-2 mt-1">
                                      <Input value={referralLink} readOnly className="font-mono text-xs" />
                                      <Button size="sm" onClick={() => {
                                        navigator.clipboard.writeText(referralLink);
                                        toast.success("Referral link copied to clipboard");
                                      }}>
                                        <Copy className="h-4 w-4" />
                                      </Button>
                                    </div>
                                  </div>
                                  <p className="text-sm font-medium">
                                    You have <span className="text-primary font-bold">{refCount}</span> successful referrals
                                    {" "}(+<span className="text-primary font-bold">{refCount * 10}</span> points)
                                  </p>
                                </div>
                              </CardContent>
                            </Card>
                          );
                        }

                        const status = getTaskStatus(task);
                        const isLocked = status === "locked";

                        return (
                          <Card key={task.id} className={`group relative overflow-hidden transition-all duration-300 h-full flex flex-col ${isLocked || !participantData ? "opacity-50" : "hover:shadow-lg hover:-translate-y-1 bg-white dark:bg-slate-950"} ${status === "completed" ? "border-green-500/30 bg-green-50/20" : ""} ${status === "pending" ? "border-orange-500/30 bg-orange-50/20" : ""}`}>
                            <CardContent className="p-5 flex flex-col h-full">
                              <div className="flex justify-between items-start mb-4">
                                <div className={`p-2 rounded-lg ${isLocked || !participantData ? "bg-slate-200 dark:bg-slate-800" : "bg-primary/10 text-primary"}`}>
                                  {isLocked || !participantData ? <Lock className="h-5 w-5" /> : <Trophy className="h-5 w-5" />}
                                </div>
                                <Badge variant={status === "completed" ? "default" : "secondary"} className={status === "completed" ? "bg-green-600" : ""}>{task.points} PTS</Badge>
                              </div>

                              <div className="mb-6 flex-1">
                                <h3 className="font-bold text-lg mb-2 group-hover:text-primary transition-colors">{task.title}</h3>
                                <p className="text-sm text-muted-foreground line-clamp-3">{task.description}</p>
                              </div>

                              <div className="mt-auto pt-4 border-t flex items-center justify-between">
                                {/* Verification Badge */}
                                <div className="text-[10px] font-bold text-muted-foreground flex items-center gap-1 uppercase tracking-wider">
                                   {task.verificationType === "auto_social" && <Sparkles className="h-3 w-3 text-blue-500" />}
                                   {task.verificationType === "auto_tx" && <Shield className="h-3 w-3 text-green-500" />}
                                   {task.verificationType === "onchain" && <Zap className="h-3 w-3 text-purple-500" />}
                                   {task.verificationType === "manual_link" && <ExternalLink className="h-3 w-3" />}
                                   {task.verificationType.replace("manual_", "").replace("auto_", "")}
                                </div>

                                {/* Find the button section inside your task mapping loop */}
                                {status === "completed" ? (
                                  <Button
                                    size="sm"
                                    disabled
                                    className="bg-green-100 text-green-700 border-green-200 cursor-default hover:bg-green-100"
                                  >
                                    <CheckCircle2 className="h-4 w-4 mr-1" />
                                    Done
                                  </Button>
                                ) : status === "pending" ? (
                                  <div className="flex items-center text-orange-600 text-sm font-bold">
                                    <Clock className="h-4 w-4 mr-1" /> 
                                    Reviewing
                                  </div>
                                ) : isLocked || !participantData ? (
                                  <span className="text-sm text-muted-foreground">
                                    {!participantData ? "Join Required" : "Locked"}
                                  </span>
                                ) : (
                                  !isCreator ? (
                                    <Button
                                      size="sm"
                                      onClick={() => {
                                        setSelectedTask(task);
                                        setShowSubmitModal(true);
                                      }}
                                      disabled={!participantData || !questTiming.isLive || status !== "available"}
                                      className="bg-slate-900 text-white hover:bg-primary dark:bg-slate-100 dark:text-black"
                                    >
                                      {questTiming.notStartedYet ? "Starts Soon" : "Open Task"}
                                    </Button>
                                  ) : (
                                    <span className="text-xs font-medium text-muted-foreground bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded">
                                      Preview Mode
                                    </span>
                                  )
                                )}
                              </div>
                            </CardContent>
                            {(!isLocked && status === "available" && participantData) && <div className="absolute bottom-0 left-0 w-full h-1 bg-primary transform scale-x-0 group-hover:scale-x-100 transition-transform origin-left" />}
                          </Card>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </TabsContent>

            {/* Leaderboard and Admin tabs remain the same */}
            <TabsContent value="leaderboard">
              <Card className="border-slate-200 dark:border-slate-800">
                <CardHeader>
                  <CardTitle className="flex justify-between items-center">
                    Top Contributors
                    {claimStatus.isActive && (
                      <Badge className="bg-green-600 animate-pulse"><Gift className="h-3 w-3 mr-1" /> Claim Active</Badge>
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
                        {claimStatus.isActive && <TableHead className="text-right">Action</TableHead>}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredLeaderboard.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={claimStatus.isActive ? 5 : 4} className="text-center py-10 text-muted-foreground">No participants yet. Be the first to join!</TableCell>
                        </TableRow>
                      ) : (
                        displayLeaderboard.map((entry) => (
                          <TableRow key={entry.walletAddress} className={entry.walletAddress === userWalletAddress ? "bg-primary/5 hover:bg-primary/10" : ""}>
                            <TableCell className="font-medium text-lg">
                              {entry.rank === 1 && "🥇"}{entry.rank === 2 && "🥈"}{entry.rank === 3 && "🥉"}{entry.rank > 3 && <span className="text-muted-foreground">#{entry.rank}</span>}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <Avatar className="h-9 w-9 border border-slate-200 dark:border-slate-700">
                                  <AvatarImage src={entry.avatarUrl || undefined} alt={entry.username || ""} className="object-cover" />
                                  <AvatarFallback className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-bold">
                                    {entry.username ? entry.username.substring(0, 2).toUpperCase() : entry.walletAddress.slice(0, 4)}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="flex flex-col">
                                  <span className="font-semibold text-sm flex items-center gap-2">
                                    {entry.username || entry.walletAddress.slice(0, 6) + "..." + entry.walletAddress.slice(-4)}
                                    {entry.walletAddress === userWalletAddress && <Badge variant="outline" className="text-[10px] h-4 px-1 py-0 border-primary text-primary">You</Badge>}
                                  </span>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="text-right text-muted-foreground font-mono">{entry.completedTasks}</TableCell>
                            <TableCell className="text-right font-bold text-primary text-lg">{entry.points}</TableCell>

                            {claimStatus.isActive && (
                              <TableCell className="text-right">
                                {entry.walletAddress.toLowerCase() === userWalletAddress?.toLowerCase() && (
                                  entry.rank <= (questData.distributionConfig?.totalWinners || 100) ? (
                                    <Button size="sm" onClick={handleClaimReward} disabled={isClaiming} className="bg-green-600 hover:bg-green-700 text-white">
                                      {isClaiming ? <Loader2 className="h-3 w-3 animate-spin" /> : "Claim Reward"}
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

            {isCreator && (
              <TabsContent value="admin" className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <Card className="border-slate-200 dark:border-slate-800">
                    <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Pending Review</CardTitle></CardHeader>
                    <CardContent><div className="text-3xl font-bold text-orange-600">{pendingSubmissions.length}</div></CardContent>
                  </Card>
                  <Card className="border-slate-200 dark:border-slate-800">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground">Total Participants</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold">{allParticipants.length}</div>
                    </CardContent>
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
                    <CardTitle className="text-orange-800 dark:text-orange-400 flex items-center gap-2"><Shield className="h-5 w-5" /> Submission Review Queue</CardTitle>
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
                                <Badge variant="outline" className="w-fit text-[10px] mt-1 bg-blue-50 text-blue-700 border-blue-200">{sub.taskPoints || 0} Points</Badge>
                              </div>
                              <div className="flex items-center gap-2 bg-white dark:bg-slate-950 px-3 py-1 rounded-full border dark:border-slate-700">
                                <Avatar className="h-5 w-5"><AvatarImage src={sub.avatarUrl} /><AvatarFallback className="text-[10px] text-slate-500 dark:text-slate-400">{sub.username ? sub.username.substring(0, 2).toUpperCase() : "??"}</AvatarFallback></Avatar>
                                <span className="text-xs font-medium text-slate-700 dark:text-slate-300">{sub.username}</span>
                              </div>
                            </div>
                            <div className="p-4 space-y-4">
                              <div className="bg-slate-100 dark:bg-slate-900 p-3 rounded text-sm break-all">
                                {sub.submittedData ? (
                                  sub.submittedData.match(/\.(jpeg|jpg|gif|png)$/) != null || sub.submittedData.includes("supabase") ? (
                                    <div className="flex flex-col gap-2 cursor-pointer" onClick={() => setPreviewImage(sub.submittedData)}>
                                      <div className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                                        <ImageIcon className="h-3 w-3" /> Image Proof (Click to Zoom)
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
                                      {sub.submittedData.startsWith("http") ? "Visit Link" : sub.submittedData} <ExternalLink size={14} />
                                    </a>
                                  )
                                ) : (
                                  <span className="text-muted-foreground italic">No submission data provided</span>
                                )}
                              </div>
                              {sub.notes && <div className="text-xs text-muted-foreground bg-white dark:bg-slate-800 p-2 rounded border dark:border-slate-700 italic">"{sub.notes}"</div>}
                              <div className="flex gap-3 pt-2">
                                <Button className="flex-1 bg-green-600 hover:bg-green-700 h-9" onClick={() => handleReviewSubmission(sub.submissionId, "approved")}>Approve</Button>
                                <Button variant="destructive" className="flex-1 h-9" onClick={() => handleReviewSubmission(sub.submissionId, "rejected")}>Reject</Button>
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
        </div>

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
            {/* ============= SUBMISSION MODAL (UPDATED) ============= */}
        {showSubmitModal && selectedTask && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200 overflow-y-auto">
            <Card className="w-full max-w-lg shadow-2xl border-0 dark:bg-slate-900 animate-in zoom-in-95 duration-200 my-8 max-h-[90vh] flex flex-col">
              <CardHeader className="bg-slate-50 dark:bg-slate-950 border-b dark:border-slate-800 pb-5 relative flex-shrink-0">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="absolute right-4 top-4 h-8 w-8 rounded-full" 
                  onClick={() => setShowSubmitModal(false)}
                >
                  <X className="h-5 w-5" />
                </Button>
                <CardTitle className="text-xl pr-10">{selectedTask.title}</CardTitle>
                <CardDescription className="text-base font-medium mt-1">
                  {selectedTask.description}
                </CardDescription>
              </CardHeader>

               <CardContent className="pt-6 space-y-6 overflow-y-auto flex-1">
                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-100 dark:border-blue-800 text-sm text-blue-800 dark:text-blue-300 flex gap-3">
                  <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                  <div>{selectedTask.description}</div>
                </div>
                {(selectedTask.verificationType === "auto_social" || selectedTask.verificationType === "manual_link") && (
                <div className="space-y-6">
    
                {/* --- 1. THE "DO TASK" BUTTON --- */}
                {selectedTask.url && (
                  <div className="p-6 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-col items-center justify-center text-center space-y-4">
                    <div className="h-12 w-12 bg-white dark:bg-slate-800 rounded-full flex items-center justify-center shadow-sm text-2xl">
                      {/* Simple Icon Mapping based on platform/action */}
                      {selectedTask.targetPlatform === 'Twitter' || selectedTask.url.includes('twitter') || selectedTask.url.includes('x.com') ?<svg 
                        viewBox="0 0 24 24" 
                        aria-hidden="true" 
                        className="h-6 w-6 text-black dark:text-white" // Changed from text-blue-400
                        fill="currentColor"
                      >
                        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                      </svg>:
                        selectedTask.targetPlatform === 'Discord' || selectedTask.url.includes('discord') ? <MessageCircle className="h-6 w-6 text-indigo-500" /> :
                        selectedTask.targetPlatform === 'Telegram' || selectedTask.url.includes('t.me') ? <Send className="h-6 w-6 text-sky-500" /> :
                        <ExternalLink className="h-6 w-6 text-slate-500" />
                      }
                    </div>
                    
                    <div>
                      <h4 className="font-semibold text-base">Step 1: Perform Action</h4>
                      <p className="text-sm text-muted-foreground">
                        Click the button below to {selectedTask.action.replace('_', ' ')} on {selectedTask.targetPlatform || "the external site"}.
                      </p>
                    </div>

                    <Button 
                      size="lg" 
                      className="w-full max-w-xs gap-2 font-bold"
                      variant={selectedTask.verificationType === 'auto_social' ? "default" : "outline"}
                      onClick={() => window.open(selectedTask.url, "_blank")}
                    >
                      {selectedTask.action === 'follow' && <UserPlus className="h-4 w-4" />}
                      {selectedTask.action === 'join' && <LogIn className="h-4 w-4" />}
                      {selectedTask.action === 'swap' && <ArrowLeftRight className="h-4 w-4" />}
                      
                      {/* Dynamic Label */}
                      {selectedTask.action.toUpperCase()} {selectedTask.targetPlatform ? selectedTask.targetPlatform.toUpperCase() : "NOW"}
                      <ExternalLink className="h-4 w-4 opacity-50" />
                    </Button>
                  </div>
                )}

                {/* --- 2. THE INPUT FIELD (Step 2) --- */}
                
                {/* CASE A: Tasks that require a Link Proof (Retweet, Quote, Manual Link) */}
                { (selectedTask.verificationType === 'manual_link' || 
                  ['quote', 'tweet', 'retweet', 'comment', 'share'].includes(selectedTask.action)
                  ) && (
                  <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="bg-background">Step 2</Badge>
                      <Label className="font-semibold">Submit Proof URL</Label>
                    </div>
                    
                    <Input
                      placeholder={selectedTask.targetPlatform === 'Twitter' ? "https://x.com/username/status/..." : "https://..."}
                      value={submissionData.proofUrl}
                      onChange={(e) => setSubmissionData(prev => ({ ...prev, proofUrl: e.target.value.trim() }))}
                      className="h-11 font-mono text-sm"
                    />
                    <p className="text-xs text-muted-foreground">
                      {selectedTask.verificationType === 'auto_social' 
                        ? "Paste the link to your post/tweet/comment so our bot can verify it." 
                        : "Paste the link (transaction, blog post, etc) proving you completed the task."}
                    </p>
                  </div>
                )}

                {/* CASE B: Tasks that verify automatically (Follow, Join) - No Input Needed */}
                { selectedTask.verificationType === 'auto_social' && 
                  ['follow', 'join', 'subscribe', 'like'].includes(selectedTask.action) && (
                  <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 p-4 rounded-lg flex gap-3">
                    <Sparkles className="h-5 w-5 text-blue-500 shrink-0" />
                    <div className="text-sm text-blue-800 dark:text-blue-300">
                      <strong>No link required.</strong><br/>
                      Once you have completed the action above, click "Verify & Submit". Our system will check your social connection automatically.
                    </div>
                  </div>
                )}

                  </div>
                )}
                {/* --- ON-CHAIN VERIFICATION UI --- */}
                {selectedTask.verificationType === "onchain" && (
                    <div className="text-center space-y-4">
                        <div className="mx-auto w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center">
                            <Zap className="h-8 w-8 text-purple-600" />
                        </div>
                        <h4 className="text-lg font-semibold">Wallet Check Required</h4>
                        <p className="text-muted-foreground text-sm">
                            We will scan your connected wallet on the blockchain to verify this task.
                        </p>
                        
                        <Button 
                          size="lg" 
                          className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold h-12"
                          onClick={handleSubmitTask}
                          disabled={submittingTaskId === selectedTask?.id} // Changed
                        >
                          {submittingTaskId === selectedTask?.id ? (
                            <><Loader2 className="mr-2 h-4 w-4 animate-spin"/> Verifying...</>
                          ) : (
                            "Verify Wallet Status"
                          )}
                        </Button>
                    </div>
                )}  

                {/* ────────────────────────────────────────────────
                    1. SYSTEM SHARE ON X (manual review)
                ──────────────────────────────────────────────── */}
                {(selectedTask.id === "sys_share_x" || selectedTask.action === "share_quest") && (
                  <div className="space-y-6">
                    <div className="p-6 bg-gradient-to-br from-amber-50 to-yellow-50 dark:from-amber-950/40 dark:to-yellow-950/30 rounded-xl border border-amber-200 dark:border-amber-800 text-center">
                      <div className="mx-auto w-16 h-16 bg-white dark:bg-slate-800 rounded-full flex items-center justify-center mb-4 shadow-md">
                        <svg 
                          viewBox="0 0 24 24" 
                          aria-hidden="true" 
                          className="h-6 w-6 text-black dark:text-white" // Changed from text-blue-400
                          fill="currentColor"
                        >
                          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                        </svg>
                      </div>
                      <h4 className="text-lg font-semibold mb-3">Share this Quest on X</h4>
                      <p className="text-sm text-muted-foreground mb-5">
                        Post about this quest including @FaucetDrops and your referral link
                      </p>

                      <Button
                        size="lg"
                        className="bg-[#1DA1F2] hover:bg-[#0c8cdf] text-white w-full mb-5"
                        onClick={() => {
                          if (!participantData?.referral_id) {
                            toast.error("Referral link not available – please join first");
                            return;
                          }
                          const cleanUrl = window.location.href.split("?")[0];
                          const refLink = `${cleanUrl}?ref=${participantData.referral_id}`;
                          const text = `I'm participating in this awesome quest on @FaucetDrops!\nJoin me here: ${refLink}`;
                          window.open(
                            `https://x.com/intent/tweet?text=${encodeURIComponent(text)}`,
                            "_blank",
                            "noopener,noreferrer"
                          );
                        }}
                      >
                        <svg 
                          viewBox="0 0 24 24" 
                          aria-hidden="true" 
                          className="h-6 w-6 text-black dark:text-white" // Changed from text-blue-400
                          fill="currentColor"
                        >
                          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                        </svg>
                        Compose & Post on X
                      </Button>

                      <p className="text-xs text-amber-700 dark:text-amber-300">
                        Make sure your tweet contains @FaucetDrops and the referral link
                      </p>
                    </div>

                    <div className="space-y-3">
                      <Label className="text-sm font-medium flex items-center gap-2">
                        <Link className="h-4 w-4" />
                        Paste link to your tweet (required)
                      </Label>
                      <Input
                        placeholder="https://x.com/yourusername/status/..."
                        value={submissionData.proofUrl}
                        onChange={(e) =>
                          setSubmissionData((prev) => ({ ...prev, proofUrl: e.target.value.trim() }))
                        }
                        className="font-mono text-sm focus-visible:ring-amber-500"
                      />
                      <p className="text-xs text-muted-foreground italic">
                        This link will be reviewed manually.
                      </p>
                    </div>
                  </div>
                )}

                {/* ────────────────────────────────────────────────
                    2. WATCH VIDEO – preview + mark done
                ──────────────────────────────────────────────── */}
               
                {selectedTask.action === "watch" && selectedTask.verificationType === "none" && (
                  <div className="space-y-6">
                    <div className="rounded-xl overflow-hidden border bg-black aspect-video relative shadow-lg">
                      {(selectedTask.url.includes("youtube.com") || selectedTask.url.includes("youtu.be")) ? (
                        <iframe
                          width="100%"
                          height="100%"
                          src={
                            selectedTask.url
                              .replace("watch?v=", "embed/")
                              .replace("youtu.be/", "www.youtube.com/embed/")
                              .split("&")[0]
                          }
                          title="Introduction Video"
                          frameBorder="0"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                        />
                      ) : (
                        <div className="absolute inset-0 flex flex-col items-center justify-center text-white/70 bg-gradient-to-b from-black/60 to-black/90">
                          <Play className="h-16 w-16 opacity-70 mb-4" />
                          <p className="text-lg font-medium">Video preview not available</p>
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col sm:flex-row gap-4">
                    <Button
                      className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold h-12"
                      onClick={async () => {
                        window.open(selectedTask.url, "_blank", "noopener,noreferrer");
                        await handleSubmitTask(); 
                      }}
                      disabled={submittingTaskId === selectedTask?.id} // Changed
                    >
                      {submittingTaskId === selectedTask?.id ? (
                        <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Claiming...</>
                      ) : (
                        "Watch Video & Claim Points"
                      )}
                    </Button>
                    </div>
                  </div>
                )}

                {/* ────────────────────────────────────────────────
                    VISIT PAGE – Instant Reward
                ──────────────────────────────────────────────── */}
                {selectedTask.action === "visit" && selectedTask.verificationType === "none" && (
                  <div className="space-y-6 text-center">
                    <div className="p-10 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 rounded-2xl border border-blue-100 dark:border-blue-900/50">
                      <ExternalLink className="mx-auto h-14 w-14 text-blue-500 mb-5 opacity-90" />
                      <h4 className="text-xl font-semibold mb-3">Visit Project Website</h4>
                      <p className="text-muted-foreground mb-8 max-w-sm mx-auto">
                        Opening the website will automatically add <strong>{selectedTask.points} points</strong> to your profile.
                      </p>

                     <Button
                        size="lg"
                        className="bg-blue-600 hover:bg-blue-700 text-white px-12 h-14 font-bold text-lg shadow-lg"
                        onClick={async () => {
                          window.open(selectedTask.url, "_blank", "noopener,noreferrer");
                          await handleSubmitTask(); 
                        }}
                        disabled={submittingTaskId === selectedTask?.id} // Changed
                      >
                        {submittingTaskId === selectedTask?.id ? (
                          <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Verifying...</>
                        ) : (
                          "Visit Website & Get Points"
                        )}
                      </Button>
                    </div>
                  </div>
                )}

                {/* ────────────────────────────────────────────────
                    4. MANUAL TRADING / ON-CHAIN TASKS
                ──────────────────────────────────────────────── */}
                {selectedTask.category === "trading" && selectedTask.verificationType !== "auto_tx" && (
                  <div className="space-y-6">
                    <div className="space-y-4 p-5 bg-slate-50 dark:bg-slate-950/50 rounded-xl border">
                      {/* Tx Hash */}
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">Transaction Hash (required)</Label>
                        <Input
                          placeholder="0x1234567890abcdef..."
                          value={submissionData.proofUrl}
                          onChange={(e) =>
                            setSubmissionData((prev) => ({ ...prev, proofUrl: e.target.value.trim() }))
                          }
                          className="font-mono text-sm focus-visible:ring-green-500"
                        />
                      </div>

                      {/* Screenshot upload */}
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">Upload Proof / Screenshot (optional but recommended)</Label>
                        <div className="border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-lg p-6 text-center hover:bg-slate-100 dark:hover:bg-slate-900/50 transition-colors">
                          <Input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            id="tx-proof-upload"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                if (file.size > 5 * 1024 * 1024) {
                                  toast.error("File too large (max 5MB)");
                                  return;
                                }
                                setSubmissionData((prev) => ({ ...prev, file }));
                              }
                            }}
                          />
                          <label htmlFor="tx-proof-upload" className="cursor-pointer block">
                            <Upload className="mx-auto h-10 w-10 text-slate-400 mb-3" />
                            <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                              Click or drag image here
                            </p>
                            {submissionData.file && (
                              <p className="text-xs text-green-600 mt-2 font-medium">
                                {submissionData.file.name}
                              </p>
                            )}
                          </label>
                        </div>
                      </div>
                    </div>

                    {selectedTask.targetContractAddress && (
                      <div className="text-xs bg-slate-100 dark:bg-slate-900 p-3 rounded border font-mono break-all">
                        <span className="font-semibold">Target contract:</span>{" "}
                        {selectedTask.targetContractAddress.slice(0, 6)}...{selectedTask.targetContractAddress.slice(-4)}
                      </div>
                    )}
                  </div>
                )}

                {/* ────────────────────────────────────────────────
                    5. AUTO TX (unchanged – keep your original)
                ──────────────────────────────────────────────── */}
                {selectedTask.verificationType === "auto_tx" && (
                  <div className="space-y-4 animate-in slide-in-from-top-2">
                    <div className="space-y-2">
                      <Label className="text-sm font-semibold">Transaction Hash (TxHash)</Label>
                      <Input
                        placeholder="0x..."
                        value={submissionData.proofUrl}
                        onChange={(e) => setSubmissionData({ ...submissionData, proofUrl: e.target.value })}
                        className="h-11 font-mono text-xs"
                      />
                    </div>
                    <div className="flex items-center gap-2 p-2 bg-green-500/10 rounded-lg border border-green-500/20">
                      <Shield className="h-3 w-3 text-green-600" />
                      <p className="text-[10px] text-green-700 dark:text-green-400 font-medium">
                        Automatic on-chain verification will check this hash.
                      </p>
                    </div>
                    <Button
                      className="w-full h-11 bg-slate-900 text-white"
                      onClick={handleSubmitTask}
                      disabled={!submissionData.proofUrl || submittingTaskId === selectedTask?.id} // Changed
                    >
                      {submittingTaskId === selectedTask?.id ? (
                        <Loader2 className="animate-spin mr-2 h-4 w-4" />
                      ) : (
                        "Verify Transaction"
                      )}
                    </Button>
                  </div>
                )}

                {/* ────────────────────────────────────────────────
                    6. MANUAL UPLOAD (unchanged – keep your original)
                ──────────────────────────────────────────────── */}
                {selectedTask.verificationType === "manual_upload" && (
                  <div className="space-y-4 animate-in slide-in-from-top-2">
                    <div className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl p-8 flex flex-col items-center justify-center relative bg-slate-50/50 dark:bg-slate-900">
                      <Input
                        type="file"
                        accept="image/*"
                        className="absolute inset-0 opacity-0 cursor-pointer h-full"
                        onChange={handleFileSelect}
                      />
                      <Upload className="h-8 w-8 text-slate-400 mb-2" />
                      <p className="text-sm font-semibold">Click to upload screenshot</p>
                      {submissionData.file && <Badge className="mt-2 bg-green-500">{submissionData.file.name}</Badge>}
                    </div>
                   <Button
                    className="w-full h-11"
                    onClick={handleSubmitTask}
                    disabled={!submissionData.file || submittingTaskId === selectedTask?.id} // Changed
                  >
                    {submittingTaskId === selectedTask?.id ? (
                      <Loader2 className="animate-spin mr-2 h-4 w-4" />
                    ) : (
                      "Submit for Review"
                    )}
                  </Button>
                  </div>
                )}

                {/* ────────────────────────────────────────────────
                    SHARED NOTES (shown for most manual tasks)
                ──────────────────────────────────────────────── */}
                {selectedTask.verificationType !== "none" && (
                  <div className="space-y-2">
                    <Label className="text-xs font-medium uppercase text-muted-foreground">
                      Notes (Optional)
                    </Label>
                    <Textarea
                      placeholder="Add any extra details or comments..."
                      value={submissionData.notes}
                      onChange={(e) => setSubmissionData({ ...submissionData, notes: e.target.value })}
                      className="resize-none dark:bg-slate-950 min-h-[80px]"
                      rows={3}
                    />
                  </div>
                )}
              </CardContent>

              {/* Footer with Submit / Cancel */}
                    <CardFooter className="justify-between border-t p-5 dark:border-slate-800 flex-shrink-0">
                      <Button variant="outline" onClick={() => setShowSubmitModal(false)}>
                        Cancel
                      </Button>

                      {selectedTask.verificationType !== "none" && (
                        <Button
                          onClick={handleSubmitTask}
                          disabled={
                            submittingTaskId === selectedTask?.id ||
                            (selectedTask.verificationType === "manual_link" && !submissionData.proofUrl) ||
                            (selectedTask.verificationType === "auto_social" && 
                              ['quote', 'tweet', 'comment'].includes(selectedTask.action) && 
                              !submissionData.proofUrl) ||
                            (selectedTask.category === "trading" && 
                              selectedTask.verificationType !== "auto_tx" && 
                              selectedTask.verificationType !== "onchain" &&
                              !submissionData.proofUrl)
                          }
                          className="bg-primary hover:bg-primary/90 min-w-[160px]"
                        >
                          {submittingTaskId === selectedTask?.id ? (
                            <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Verifying...</>
                          ) : (
                            selectedTask.verificationType === 'auto_social' ? "Verify & Submit" : "Submit Task"
                          )}
                        </Button>
                      )}
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
                  <Input type="number" placeholder="0.00" value={totalRequired.toFixed(4)} onChange={(e) => setFundAmount(e.target.value)} className={isValidFundingAmount ? "border-green-500" : "border-red-500"} />
                  {!isValidFundingAmount && fundAmount && <p className="text-xs text-red-500">Amount must be exactly {totalRequired.toFixed(4)}</p>}
                </div>
              </CardContent>
              <CardFooter className="flex justify-end gap-3">
                <Button variant="outline" onClick={() => setShowFundModal(false)} disabled={isFunding}>Cancel</Button>
                <Button onClick={handleFundQuest} disabled={!isValidFundingAmount || isFunding} className="bg-green-600 hover:bg-green-700 text-white">
                  {isFunding ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null} {isFunding ? "Processing..." : "Confirm & Deposit"}
                </Button>
              </CardFooter>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}