import React, { useState, useEffect, useCallback } from "react";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Upload,
  Coins,
  Users,
  FileUp,
  RotateCcw,
  History,
  Edit,
  Trash2,
  Key,
  Copy,
  Clock,
  ExternalLink,
  Download,
  Eye,
  Link,
  CheckCircle,
  Share2,
  Zap,
  Menu,
  AlertCircle,
  Activity,
  Plus,
  X,
} from "lucide-react";
import { formatUnits, parseUnits, type BrowserProvider } from "ethers";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CustomClaimUploader } from "@/components/customClaim";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import FaucetUserView from "./FaucetUserView";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  setWhitelistBatch,
  setCustomClaimAmountsBatch,
  resetAllClaims,
  fundFaucet,
  withdrawTokens,
  setClaimParameters,
  addAdmin,
  removeAdmin,
  getFaucetTransactionHistory,
  updateFaucetName,
  deleteFaucet,
} from "@/lib/faucet";
import { retrieveSecretCode, getSecretCodeForAdmin } from "@/lib/backend-service";
import { TokenBalance } from "../token-balance";
import { QRCodeShareDialog } from "../qrcode";
import { cn } from "@/lib/utils";

// ── Solana imports ────────────────────────────────────────────────────────────
import { SOLANA_CHAIN_ID } from "@/hooks/use-network";
import { createSolanaConnection } from "@/lib/solana-connection";
import {
  fundFaucet as solanaFundFaucet,
  withdrawFaucet as solanaWithdrawFaucet,
  updateFaucetConfig as solanaUpdateFaucetConfig,
  updateFaucetName as solanaUpdateFaucetName,
  deleteFaucet as solanaDeleteFaucet,
  addFaucetAdmin as solanaAddFaucetAdmin,
  removeFaucetAdmin as solanaRemoveFaucetAdmin,
  batchAddToWhitelist,
  batchRemoveFromWhitelist,
} from "@/lib/solana";
import { Connection, PublicKey } from "@solana/web3.js";

type FaucetType = "dropcode" | "droplist" | "custom";
const FACTORY_OWNER_ADDRESS = "0x9fBC2A0de6e5C5Fd96e8D11541608f5F328C0785";
const FIXED_TWEET_PREFIX = "I just dripped {amount} {token} from @FaucetDrops on {network}.";

const PLATFORM_BASE_URLS: Record<string, string> = {
  "𝕏": "https://x.com/",
  "telegram": "https://t.me/",
  "discord": "https://discord.gg/",
  "youtube": "https://youtube.com/@",
  "instagram": "https://instagram.com/",
  "tiktok": "https://tiktok.com/@",
  "facebook": "https://facebook.com/",
};

interface SocialMediaLink {
  platform: string;
  url: string;
  handle: string;
  action: string;
}

interface FaucetAdminViewProps {
  faucetAddress: string;
  faucetDetails: any;
  faucetType: FaucetType | null;
  tokenSymbol: string;
  tokenDecimals: number;
  selectedNetwork: any;
  adminList: string[];
  isOwner: boolean;
  backendMode: boolean;
  canAccessAdminControls: boolean;
  loadFaucetDetails: () => Promise<void>;
  checkNetwork: (skipToast?: boolean) => boolean;
  dynamicTasks: SocialMediaLink[];
  newSocialLinks: SocialMediaLink[];
  setNewSocialLinks: React.Dispatch<React.SetStateAction<SocialMediaLink[]>>;
  customXPostTemplate: string;
  setCustomXPostTemplate: React.Dispatch<React.SetStateAction<string>>;
  setTransactions: React.Dispatch<React.SetStateAction<any[]>>;
  transactions: any[];
  address: string | null;
  chainId: number | null;
  provider: any;
  router: any;
  faucetMetadata: {
    description?: string;
    imageUrl?: string;
  };
  /** The live Privy Solana wallet object (has signTransaction etc.) */
  activeSolanaWallet?: any;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

const isSolana = (chainId: number | null) => chainId === SOLANA_CHAIN_ID;

/** Convert decimal string → integer (as number) for Solana BN calls */
function toSolanaUnits(amount: string, decimals: number): number {
  return Math.round(parseFloat(amount) * 10 ** decimals);
}

/** Fetch transaction signatures + basic metadata from the Solana RPC */
async function loadSolanaTransactionHistory(
  faucetAddress: string,
  network: any,
  limit = 50
): Promise<any[]> {
  try {
    const rpc = Array.isArray(network.rpcUrl) ? network.rpcUrl[0] : network.rpcUrl;
    const connection = new Connection(rpc, "confirmed");
    const pubkey = new PublicKey(faucetAddress);

    const sigs = await connection.getSignaturesForAddress(pubkey, { limit });
    if (!sigs.length) return [];

    // Fetch full transactions in parallel (batch of 10 to avoid rate limits)
    const BATCH = 10;
    const txList: any[] = [];

    for (let i = 0; i < sigs.length; i += BATCH) {
      const batch = sigs.slice(i, i + BATCH);
      const parsed = await Promise.allSettled(
        batch.map((s) =>
          connection.getParsedTransaction(s.signature, {
            maxSupportedTransactionVersion: 0,
          })
        )
      );

      batch.forEach((sig, idx) => {
        const result = parsed[idx];
        if (result.status === "fulfilled" && result.value) {
          const tx = result.value;
          const meta = tx.meta;
          const blockTime = tx.blockTime ?? 0;

          // Heuristic: derive event type from log messages
          const logs: string[] = meta?.logMessages ?? [];
          let transactionType = "Event";
          if (logs.some((l) => l.includes("claim_faucet") || l.includes("ClaimFaucet")))
            transactionType = "Claim";
          else if (logs.some((l) => l.includes("fund_faucet") || l.includes("FundFaucet")))
            transactionType = "Fund";
          else if (logs.some((l) => l.includes("withdraw_faucet") || l.includes("WithdrawFaucet")))
            transactionType = "Withdraw";
          else if (logs.some((l) => l.includes("reset_faucet_claim") || l.includes("ResetFaucetClaim")))
            transactionType = "Reset";
          else if (logs.some((l) => l.includes("add_to_whitelist") || l.includes("AddToWhitelist")))
            transactionType = "Whitelist";

          // Best-effort signer: first account key
          const accounts = tx.transaction.message.accountKeys;
          const initiator = accounts[0]?.pubkey?.toString() ?? "";

          // Best-effort amount: first pre→post SOL balance delta (absolute)
          let amount = BigInt(0);
          if (meta?.preBalances && meta?.postBalances) {
            const delta = Math.abs(
              (meta.postBalances[0] ?? 0) - (meta.preBalances[0] ?? 0)
            );
            amount = BigInt(delta);
          }

          txList.push({
            txHash: sig.signature,
            transactionHash: sig.signature,
            transactionType,
            initiator,
            amount,
            timestamp: blockTime,
            isEther: true, // SOL native
          });
        }
      });
    }

    return txList.sort((a, b) => b.timestamp - a.timestamp);
  } catch (err) {
    console.error("[Solana] loadSolanaTransactionHistory error:", err);
    return [];
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components (unchanged from original)
// ─────────────────────────────────────────────────────────────────────────────

const getActionText = (platform: string): string => {
  switch (platform.toLowerCase()) {
    case "telegram": return "Join";
    case "discord": return "Join";
    case "𝕏":
    case "x": return "Follow";
    default: return "Follow";
  }
};

const getPlatformIcon = (platform: string): string => {
  switch (platform.toLowerCase()) {
    case "telegram": return "";
    case "discord": return "";
    case "𝕏":
    case "x": return "𝕏";
    default: return "";
  }
};

const getCurrentDateTime = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const hours = String(now.getHours()).padStart(2, "0");
  const minutes = String(now.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day}T${hours}:${minutes}`;
};

const StatCard = ({
  icon: Icon,
  label,
  value,
  sub,
  accent = false,
}: {
  icon: React.ElementType;
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  accent?: boolean;
}) => (
  <div
    className={cn(
      "relative flex flex-col gap-1 rounded-xl p-4 border transition-all duration-200 hover:shadow-sm",
      accent ? "border-primary/20 bg-primary/5" : "bg-muted/30 border-border/60"
    )}
  >
    <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
      <Icon className="h-3.5 w-3.5" />
      {label}
    </div>
    <div className="text-xl font-bold tracking-tight truncate">{value}</div>
    {sub && <div className="text-xs text-muted-foreground truncate">{sub}</div>}
  </div>
);

const Section = ({
  icon: Icon,
  title,
  children,
  className,
}: {
  icon: React.ElementType;
  title: string;
  children: React.ReactNode;
  className?: string;
}) => (
  <div className={cn("rounded-xl border bg-card shadow-sm", className)}>
    <div className="flex items-center gap-2 px-5 py-3.5 border-b bg-muted/20 rounded-t-xl">
      <div className="flex items-center justify-center h-7 w-7 rounded-lg bg-primary/10">
        <Icon className="h-4 w-4 text-primary" />
      </div>
      <h3 className="text-sm font-semibold">{title}</h3>
    </div>
    <div className="p-5">{children}</div>
  </div>
);

const Spinner = () => (
  <div className="h-4 w-4 rounded-full border-2 border-current border-t-transparent animate-spin" />
);

// ─────────────────────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────────────────────

const FaucetAdminView: React.FC<FaucetAdminViewProps> = ({
  faucetAddress,
  faucetDetails,
  faucetType,
  tokenSymbol,
  tokenDecimals,
  selectedNetwork,
  adminList,
  isOwner,
  backendMode,
  loadFaucetDetails,
  checkNetwork,
  dynamicTasks,
  newSocialLinks,
  setNewSocialLinks,
  customXPostTemplate,
  setCustomXPostTemplate,
  transactions,
  setTransactions,
  address,
  chainId,
  provider,
  router,
  faucetMetadata,
  activeSolanaWallet,
}) => {
  // ── Derived ────────────────────────────────────────────────────────────────
  const onSolana = isSolana(chainId);

  // ── UI States ──────────────────────────────────────────────────────────────
  const [showPreviewDialog, setShowPreviewDialog] = useState(false);
  const [activeTab, setActiveTab] = useState("fund");
  const [showFundPopup, setShowFundPopup] = useState(false);
  const [showEditNameDialog, setShowEditNameDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showAddAdminDialog, setShowAddAdminDialog] = useState(false);
  const [showCurrentSecretDialog, setShowCurrentSecretDialog] = useState(false);
  const [showNewCodeDialog, setShowNewCodeDialog] = useState(false);
  const [showQRDialog, setShowQRDialog] = useState(false);
  const [currentTime, setCurrentTime] = useState(Date.now());
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);

  // ── Form States ────────────────────────────────────────────────────────────
  const [fundAmount, setFundAmount] = useState("");
  const [adjustedFundAmount, setAdjustedFundAmount] = useState("");
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [claimAmount, setClaimAmount] = useState(
    faucetDetails?.claimAmount ? formatUnits(faucetDetails.claimAmount, tokenDecimals) : "0"
  );
  const [startTime, setStartTime] = useState(
    faucetDetails?.startTime
      ? new Date(Number(faucetDetails.startTime) * 1000).toISOString().slice(0, 16)
      : ""
  );
  const [endTime, setEndTime] = useState(
    faucetDetails?.endTime
      ? new Date(Number(faucetDetails.endTime) * 1000).toISOString().slice(0, 16)
      : ""
  );
  const [startTimeError, setStartTimeError] = useState("");
  const [whitelistAddresses, setWhitelistAddresses] = useState("");
  const [isWhitelistEnabled, setIsWhitelistEnabled] = useState(true);
  const [newFaucetName, setNewFaucetName] = useState(faucetDetails?.name || "");
  const [newAdminAddress, setNewAdminAddress] = useState("");
  const [currentSecretCode, setCurrentSecretCode] = useState("");
  const [newlyGeneratedCode, setNewlyGeneratedCode] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [isAddingAdmin, setIsAddingAdmin] = useState(true);

  // ── Loading States ─────────────────────────────────────────────────────────
  const [isFunding, setIsFunding] = useState(false);
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const [isUpdatingParameters, setIsUpdatingParameters] = useState(false);
  const [isUpdatingWhitelist, setIsUpdatingWhitelist] = useState(false);
  const [isResettingClaims, setIsResettingClaims] = useState(false);
  const [isUpdatingName, setIsUpdatingName] = useState(false);
  const [isDeletingFaucet, setIsDeletingFaucet] = useState(false);
  const [isManagingAdmin, setIsManagingAdmin] = useState(false);
  const [isRetrievingSecret, setIsRetrievingSecret] = useState(false);
  const [isGeneratingNewCode, setIsGeneratingNewCode] = useState(false);

  // ── Ticker ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  // ── Derived ────────────────────────────────────────────────────────────────
  const shouldShowWhitelistTab = faucetType === "droplist";
  const shouldShowCustomTab = faucetType === "custom";
  const shouldShowSecretCodeButton = faucetType === "dropcode" && backendMode;
  const isOwnerOrAdmin =
    isOwner ||
    adminList.some((a) => address && a.toLowerCase() === address.toLowerCase());

  const calculateFee = (amount: string) => {
    try {
      const feePercent = faucetType === "droplist" || faucetType === "custom" ? 5 : 3;
      const feeDivisor = BigInt(100 - feePercent);
      const parsedAmount = parseUnits(amount, tokenDecimals);
      const fee = (parsedAmount * BigInt(feePercent)) / BigInt(100);
      const netAmount = parsedAmount - fee;
      const recommendedInput = (parsedAmount * BigInt(100)) / feeDivisor;
      return {
        fee: formatUnits(fee, tokenDecimals),
        netAmount: formatUnits(netAmount, tokenDecimals),
        recommendedInput: Number(formatUnits(recommendedInput, tokenDecimals)).toFixed(3),
        feePercent,
      };
    } catch {
      return { fee: "0", netAmount: "0", recommendedInput: "0", feePercent: 3 };
    }
  };

  const { fee, netAmount, recommendedInput, feePercent } = calculateFee(fundAmount);

  const validateStartTime = (value: string): boolean => {
    if (!value) { setStartTimeError(""); return false; }
    const now = new Date();
    const selectedTime = new Date(value);
    if (selectedTime <= now) {
      setStartTimeError("Start time must be ahead of current time");
      return false;
    }
    setStartTimeError("");
    return true;
  };

  const handleStartTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setStartTime(e.target.value);
    validateStartTime(e.target.value);
  };

  // ── Activity log ───────────────────────────────────────────────────────────

  const loadTransactionHistory = useCallback(async () => {
    if (!selectedNetwork || !faucetAddress) return;
    setIsHistoryLoading(true);

    try {
      if (onSolana) {
        // ── Solana: fetch from RPC ───────────────────────────────────────────
        const txs = await loadSolanaTransactionHistory(faucetAddress, selectedNetwork);
        setTransactions(txs);
      } else {
        // ── EVM: existing logic ─────────────────────────────────────────────
        const { JsonRpcProvider } = await import("ethers");
        const safeRpc = Array.isArray(selectedNetwork.rpcUrl)
          ? selectedNetwork.rpcUrl[0]
          : selectedNetwork.rpcUrl;
        const rpcProvider = new JsonRpcProvider(safeRpc);
        const txs = await getFaucetTransactionHistory(
          rpcProvider as any,
          faucetAddress,
          selectedNetwork,
          faucetType || undefined,
          address ?? undefined
        );
        setTransactions(txs.sort((a, b) => b.timestamp - a.timestamp));
      }
    } catch (error: any) {
      toast.error(`Failed to load Activity Log: ${error.message}`);
    } finally {
      setIsHistoryLoading(false);
    }
  }, [faucetAddress, selectedNetwork, faucetType, setTransactions, address, onSolana]);

  useEffect(() => {
    if (activeTab === "history" && selectedNetwork) loadTransactionHistory();
  }, [activeTab, selectedNetwork, loadTransactionHistory]);

  useEffect(() => {
    if (faucetDetails) {
      if (faucetType !== "custom" && faucetDetails.claimAmount)
        setClaimAmount(formatUnits(faucetDetails.claimAmount, tokenDecimals));
      if (faucetDetails.startTime)
        setStartTime(new Date(Number(faucetDetails.startTime) * 1000).toISOString().slice(0, 16));
      if (faucetDetails.endTime)
        setEndTime(new Date(Number(faucetDetails.endTime) * 1000).toISOString().slice(0, 16));
      if (faucetDetails.name) setNewFaucetName(faucetDetails.name);
    }
  }, [faucetDetails, faucetType, tokenDecimals]);

  // ── Social Links ───────────────────────────────────────────────────────────
  const addNewSocialLink = () => {
    const defaultPlatform = "𝕏";
    setNewSocialLinks([
      ...newSocialLinks,
      { platform: defaultPlatform, url: PLATFORM_BASE_URLS[defaultPlatform], handle: "", action: "follow" },
    ]);
  };

  const removeNewSocialLink = (index: number) =>
    setNewSocialLinks(newSocialLinks.filter((_, i) => i !== index));

  const updateNewSocialLink = (index: number, field: keyof SocialMediaLink, value: string) => {
    const updated = [...newSocialLinks];
    const link = updated[index];
    const cleanHandle = (h: string) => h.replace(/^@/, "");

    if (field === "platform") {
      link.platform = value;
      const base = PLATFORM_BASE_URLS[value] || "";
      link.url = link.handle ? `${base}${cleanHandle(link.handle)}` : base;
    } else if (field === "handle") {
      const oldClean = cleanHandle(link.handle);
      const newClean = cleanHandle(value);
      const base = PLATFORM_BASE_URLS[link.platform] || "";
      link.handle = value;
      if (link.url === base || link.url === `${base}${oldClean}`)
        link.url = `${base}${newClean}`;
    } else {
      (link as any)[field] = value;
    }
    setNewSocialLinks(updated);
  };

  // ──────────────────────────────────────────────────────────────────────────
  // HANDLERS
  // ──────────────────────────────────────────────────────────────────────────

  // ── Update Faucet Name ─────────────────────────────────────────────────────
  const handleUpdateFaucetName = async () => {
    if (!address || !newFaucetName.trim() || !checkNetwork()) return;

    try {
      setIsUpdatingName(true);

      if (onSolana) {
        if (!activeSolanaWallet) throw new Error("Solana wallet not connected");
        const conn = createSolanaConnection();
        await solanaUpdateFaucetName(conn, activeSolanaWallet, faucetAddress, newFaucetName);
      } else {
        if (!chainId) { toast.error("No chain selected"); return; }
        await updateFaucetName(
          faucetAddress,
          newFaucetName,
          BigInt(chainId),
          BigInt(Number(selectedNetwork.chainId)),
          faucetType || undefined
        );
      }

      toast.success("Faucet name updated");
      setShowEditNameDialog(false);
      await loadFaucetDetails();
    } catch (err: any) {
      toast.error(err.message || "Failed to update faucet name");
    } finally {
      setIsUpdatingName(false);
    }
  };

  // ── Delete Faucet ──────────────────────────────────────────────────────────
  const handleDeleteFaucet = async () => {
    if (!address || !checkNetwork()) return;

    try {
      setIsDeletingFaucet(true);

      if (onSolana) {
        if (!activeSolanaWallet) throw new Error("Solana wallet not connected");
        const conn = createSolanaConnection();
        await solanaDeleteFaucet(conn, activeSolanaWallet, faucetAddress);
      } else {
        if (!chainId) { toast.error("No chain selected"); return; }
        await deleteFaucet(
          
          faucetAddress,
          BigInt(chainId),
          BigInt(Number(selectedNetwork.chainId)),
          faucetType || undefined
        );
      }

      // Always clean up backend metadata
      try {
        await fetch("https://identical-vivi-faucetdrops-41e9c56b.koyeb.app/delete-faucet-metadata", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            faucetAddress,
            userAddress: address,
            chainId: onSolana ? SOLANA_CHAIN_ID : Number(chainId),
          }),
        });
      } catch {}

      toast.success("Faucet deleted successfully");
      setShowDeleteDialog(false);
      router.push("/");
    } catch (err: any) {
      toast.error(err.message || "Failed to delete faucet");
    } finally {
      setIsDeletingFaucet(false);
    }
  };

  // ── Fund ───────────────────────────────────────────────────────────────────
  const handleFund = async () => {
    if (!checkNetwork()) return;
    setAdjustedFundAmount(fundAmount);
    setShowFundPopup(true);
  };

  const confirmFund = async () => {
    if (!address || !adjustedFundAmount) return;

    try {
      setIsFunding(true);

      if (onSolana) {
        if (!activeSolanaWallet) throw new Error("Solana wallet not connected");
        const conn = createSolanaConnection();
        const amount = toSolanaUnits(adjustedFundAmount, tokenDecimals);
        await solanaFundFaucet(conn, activeSolanaWallet, faucetAddress, amount);
      } else {
      if (!chainId) { toast.error("No chain selected"); return; }
      const amount = parseUnits(adjustedFundAmount, tokenDecimals);
      await fundFaucet(
          faucetAddress,
          amount,
          faucetDetails.isEther,
          BigInt(chainId),
          BigInt(Number(selectedNetwork.chainId)),
          faucetType || undefined
        );
      }

      toast.success("Faucet funded successfully");
      setFundAmount("");
      setShowFundPopup(false);
      await loadFaucetDetails();
      await loadTransactionHistory();
    } catch (err: any) {
      toast.error(err.message || "Failed to fund faucet");
    } finally {
      setIsFunding(false);
    }
  };

  // ── Withdraw ───────────────────────────────────────────────────────────────
  const handleWithdraw = async () => {
    if (!address || !withdrawAmount || !checkNetwork()) return;

    try {
      setIsWithdrawing(true);

      if (onSolana) {
        if (!activeSolanaWallet) throw new Error("Solana wallet not connected");
        const conn = createSolanaConnection();
        const amount = toSolanaUnits(withdrawAmount, tokenDecimals);
        await solanaWithdrawFaucet(conn, activeSolanaWallet, faucetAddress, amount);
      } else {
        if (!chainId) { toast.error("No chain selected"); return; }
        await withdrawTokens(
          
          faucetAddress,
          parseUnits(withdrawAmount, tokenDecimals),
          BigInt(chainId),
          BigInt(Number(selectedNetwork.chainId)),
          faucetType || undefined
        );
      }

      toast.success("Tokens withdrawn successfully");
      setWithdrawAmount("");
      await loadFaucetDetails();
      await loadTransactionHistory();
    } catch (err: any) {
      toast.error(err.message || "Failed to withdraw tokens");
    } finally {
      setIsWithdrawing(false);
    }
  };

  // ── Update Parameters ──────────────────────────────────────────────────────
  const handleUpdateClaimParameters = async () => {
    if (!address || !checkNetwork()) return;

    const hasTaskChanges = newSocialLinks.length > 0;
    const isTemplateChanged = customXPostTemplate !== faucetDetails.customXPostTemplate;
    const currentClaimAmountStr =
      faucetType !== "custom"
        ? formatUnits(faucetDetails.claimAmount, tokenDecimals)
        : "0";
    const currentStartTimeStr = faucetDetails.startTime
      ? new Date(Number(faucetDetails.startTime) * 1000).toISOString().slice(0, 16)
      : "";
    const currentEndTimeStr = faucetDetails.endTime
      ? new Date(Number(faucetDetails.endTime) * 1000).toISOString().slice(0, 16)
      : "";
    const hasBlockchainChanges =
      (faucetType !== "custom" && claimAmount !== currentClaimAmountStr) ||
      startTime !== currentStartTimeStr ||
      endTime !== currentEndTimeStr;

    if (!hasTaskChanges && !hasBlockchainChanges && !isTemplateChanged) {
      toast.warning("No changes made");
      return;
    }

    try {
      setIsUpdatingParameters(true);
      const results: string[] = [];

      // 1. X post template (backend-stored for both chains)
      if (isTemplateChanged) {
        const res = await fetch("https://identical-vivi-faucetdrops-41e9c56b.koyeb.app/faucet-x-template", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            faucetAddress,
            template: customXPostTemplate,
            userAddress: address,
            chainId: onSolana ? SOLANA_CHAIN_ID : Number(chainId),
          }),
        });
        if (!res.ok) throw new Error("Failed to save X post template");
        results.push("share post template");
      }

      // 2. Social tasks (backend-stored for both chains)
      if (hasTaskChanges) {
        const formattedTasks = newSocialLinks
          .filter((link) => link.url.trim() && link.handle.trim())
          .map((link) => ({
            title: `${link.action.charAt(0).toUpperCase() + link.action.slice(1)} on ${link.platform}`,
            description: `${link.action.charAt(0).toUpperCase() + link.action.slice(1)} ${link.handle} on ${link.platform}`,
            platform: link.platform,
            handle: link.handle,
            url: link.url.trim(),
            action: link.action,
            required: true,
          }));

        if (formattedTasks.length > 0) {
          const taskRes = await fetch("https://identical-vivi-faucetdrops-41e9c56b.koyeb.app/add-faucet-tasks", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              faucetAddress,
              tasks: formattedTasks,
              userAddress: address,
              chainId: onSolana ? SOLANA_CHAIN_ID : Number(chainId),
            }),
          });
          if (!taskRes.ok) throw new Error("Failed to save social tasks");
          results.push("social tasks");
        } else {
          toast.warning("No valid tasks — make sure handle and URL are filled in.");
        }
      }

      // 3. On-chain parameter update (Solana vs EVM)
      if (hasBlockchainChanges) {
        const startTimestamp = Math.floor(new Date(startTime).getTime() / 1000);
        const endTimestamp = Math.floor(new Date(endTime).getTime() / 1000);

        if (onSolana) {
          if (!activeSolanaWallet) throw new Error("Solana wallet not connected");
          const conn = createSolanaConnection();
          const newAmount =
            faucetType === "custom"
              ? 0
              : toSolanaUnits(claimAmount, tokenDecimals);
          await solanaUpdateFaucetConfig(
            conn,
            activeSolanaWallet,
            faucetAddress,
            newAmount,
            startTimestamp,
            endTimestamp
          );
        } else {
          if (!chainId) { toast.error("No chain selected"); return; }
          const claimAmountBN =
            faucetType === "custom" ? BigInt(0) : parseUnits(claimAmount, tokenDecimals);
          await setClaimParameters(
            
            faucetAddress,
            claimAmountBN,
            startTimestamp,
            endTimestamp,
            BigInt(chainId),
            BigInt(Number(selectedNetwork.chainId)),
            faucetType || undefined
          );

          // Sync to backend DB for EVM
          await fetch("https://identical-vivi-faucetdrops-41e9c56b.koyeb.app/set-claim-parameters", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              faucetAddress,
              claimAmount: (faucetType === "custom" ? BigInt(0) : parseUnits(claimAmount, tokenDecimals)).toString(),
              startTime: startTimestamp,
              endTime: endTimestamp,
              chainId: Number(chainId),
            }),
          });
        }

        results.push("drip parameters");

        // Auto-generate new drop code for dropcode faucets
        if (faucetType === "dropcode") {
          try {
            const codeEndpoint = onSolana
              ? "https://identical-vivi-faucetdrops-41e9c56b.koyeb.app/solana/generate-new-drop-code"
              : "https://identical-vivi-faucetdrops-41e9c56b.koyeb.app/generate-new-drop-code";
            const codeRes = await fetch(codeEndpoint, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                faucetAddress,
                userAddress: address,
                chainId: onSolana ? SOLANA_CHAIN_ID : Number(chainId),
              }),
            });
            if (codeRes.ok) {
              const result = await codeRes.json();
              setNewlyGeneratedCode(result.secretCode);
              setShowNewCodeDialog(true);
            } else {
              toast.warning("Parameters saved, but failed to auto-generate a new drop code.");
            }
          } catch {
            toast.warning("Parameters saved, but failed to auto-generate a new drop code.");
          }
        }
      }

      if (results.length > 0) {
        toast.success(`Successfully updated: ${results.join(", ")}.`);
      }

      setNewSocialLinks([]);
      await loadFaucetDetails();
    } catch (err: any) {
      toast.error(`Failed to save changes: ${err.message}`);
    } finally {
      setIsUpdatingParameters(false);
    }
  };

  // ── Whitelist ──────────────────────────────────────────────────────────────
  const handleUpdateWhitelist = async () => {
    if (!address || !whitelistAddresses.trim() || !checkNetwork()) return;

    try {
      setIsUpdatingWhitelist(true);
      const addresses = whitelistAddresses
        .split(/[\n,]/)
        .map((a) => a.trim())
        .filter(Boolean);
      if (!addresses.length) return;

      if (onSolana) {
        if (!activeSolanaWallet) throw new Error("Solana wallet not connected");
        const conn = createSolanaConnection();

        if (isWhitelistEnabled) {
          // Add with customAmount=0 (use faucet default)
          const entries = addresses.map((userAddress) => ({ userAddress, customAmount: 0 }));
          await batchAddToWhitelist(conn, activeSolanaWallet, faucetAddress, entries);
        } else {
          await batchRemoveFromWhitelist(conn, activeSolanaWallet, faucetAddress, addresses);
        }
      } else {
        if (!chainId) { toast.error("No chain selected"); return; }
        await setWhitelistBatch(
          
          faucetAddress,
          addresses,
          isWhitelistEnabled,
          BigInt(chainId),
          BigInt(Number(selectedNetwork.chainId)),
          faucetType || undefined
        );
      }

      toast.success("Drop-list updated successfully");
      setWhitelistAddresses("");
      await loadFaucetDetails();
      await loadTransactionHistory();
    } catch (err: any) {
      toast.error(err.message || "Failed to update Drop-list");
    } finally {
      setIsUpdatingWhitelist(false);
    }
  };

  // ── Custom claim amounts ───────────────────────────────────────────────────
  const handleCustomClaimAmounts = async (
    addresses: string[],
    amounts: bigint[]
  ) => {
    if (!address || !checkNetwork()) return;

    if (onSolana) {
      if (!activeSolanaWallet) throw new Error("Solana wallet not connected");
      const conn = createSolanaConnection();
      // Convert bigint amounts back to number for Anchor BN
      const entries = addresses.map((userAddress, i) => ({
        userAddress,
        customAmount: Number(amounts[i]),
      }));
      await batchAddToWhitelist(conn, activeSolanaWallet, faucetAddress, entries);
    } else {
      if (!chainId) { toast.error("No chain selected"); return; }
      await setCustomClaimAmountsBatch(
        
        faucetAddress,
        addresses,
        amounts,
        BigInt(chainId),
        BigInt(Number(selectedNetwork.chainId)),
        faucetType || undefined
      );
    }
  };

  // ── Reset Claims ───────────────────────────────────────────────────────────
  const handleResetAllClaims = async () => {
    if (!address || !checkNetwork()) return;

    try {
      setIsResettingClaims(true);

      if (onSolana) {
        if (!activeSolanaWallet) throw new Error("Solana wallet not connected");
        // Solana batch-reset: we need the list of claimers.
        // For now, call the backend which has the claimer list from its DB.
        const res = await fetch("https://identical-vivi-faucetdrops-41e9c56b.koyeb.app/solana/reset-all-claims", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            faucetAddress,
            userAddress: address,
            chainId: SOLANA_CHAIN_ID,
          }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.detail || "Failed to reset claims");
        }
      } else {
        if (!chainId) { toast.error("No chain selected"); return; }
        await resetAllClaims(
          
          faucetAddress,
          BigInt(chainId),
          BigInt(Number(selectedNetwork.chainId)),
          faucetType || undefined
        );
      }

      toast.success("All claims reset successfully");
      await loadFaucetDetails();
      await loadTransactionHistory();
    } catch (err: any) {
      toast.error(err.message || "Failed to reset all claims");
    } finally {
      setIsResettingClaims(false);
    }
  };

  // ── Admin Management ───────────────────────────────────────────────────────
  const checkAdminStatus = (inputAddress: string) => {
    if (!inputAddress.trim()) { setIsAddingAdmin(true); return; }
    setIsAddingAdmin(!adminList.some((a) => a.toLowerCase() === inputAddress.toLowerCase()));
  };

  const handleManageAdmin = async () => {
    if (!address || !newAdminAddress.trim() || !checkNetwork()) return;
    if (
      newAdminAddress.toLowerCase() === faucetDetails?.owner.toLowerCase() ||
      (!onSolana && newAdminAddress.toLowerCase() === FACTORY_OWNER_ADDRESS.toLowerCase())
    ) {
      toast.error("Cannot add/remove the owner as admin");
      return;
    }

    try {
      setIsManagingAdmin(true);

      if (onSolana) {
        if (!activeSolanaWallet) throw new Error("Solana wallet not connected");
        const conn = createSolanaConnection();

        if (isAddingAdmin) {
          await solanaAddFaucetAdmin(conn, activeSolanaWallet, faucetAddress, newAdminAddress);
          toast.success(`${newAdminAddress} added as admin`);
        } else {
          await solanaRemoveFaucetAdmin(conn, activeSolanaWallet, faucetAddress, newAdminAddress);
          toast.success(`${newAdminAddress} removed from admins`);
        }
      } else {
        if (!chainId) { toast.error("No chain selected"); return; }
        if (isAddingAdmin) {
          await addAdmin(
            
            faucetAddress,
            newAdminAddress,
            BigInt(chainId),
            BigInt(Number(selectedNetwork.chainId)),
            faucetType || undefined
          );
          toast.success(`${newAdminAddress} added as admin`);
        } else {
          await removeAdmin(
            
            faucetAddress,
            newAdminAddress,
            BigInt(chainId),
            BigInt(Number(selectedNetwork.chainId)),
            faucetType || undefined
          );
          toast.success(`${newAdminAddress} removed from admins`);
        }
      }

      setNewAdminAddress("");
      setShowAddAdminDialog(false);
      await loadFaucetDetails();
    } catch (err: any) {
      toast.error(err.message || "Failed to manage admin");
    } finally {
      setIsManagingAdmin(false);
    }
  };

  // ── Secret Code ────────────────────────────────────────────────────────────
  const handleRetrieveSecretCode = async () => {
    if (faucetType !== "dropcode" || !faucetAddress || !address) return;

    try {
      setIsRetrievingSecret(true);

      if (onSolana) {
        const res = await fetch(
          `https://identical-vivi-faucetdrops-41e9c56b.koyeb.app/solana/get-drop-code?faucetAddress=${encodeURIComponent(faucetAddress)}&userAddress=${encodeURIComponent(address)}&chainId=${SOLANA_CHAIN_ID}`
        );
        if (!res.ok) throw new Error("Failed to retrieve drop code");
        const data = await res.json();
        if (!data.secretCode) throw new Error("No code returned");
        setCurrentSecretCode(data.secretCode);
      } else {
        if (!chainId) return;
        const data = await getSecretCodeForAdmin(address, faucetAddress, chainId);
        if (!data.secretCode) throw new Error("No code returned");
        setCurrentSecretCode(data.secretCode);
      }

      setShowCurrentSecretDialog(true);
      toast.success("Drop code retrieved");
    } catch (err: any) {
      toast.error(err.message || "Failed to retrieve drop code.");
    } finally {
      setIsRetrievingSecret(false);
    }
  };

  const handleGenerateNewDropCode = async () => {
    if (!faucetType || !faucetAddress || !address) return;
    if (!isOwnerOrAdmin) {
      toast.error("Only owner or admins can generate a new drop code");
      return;
    }

    try {
      setIsGeneratingNewCode(true);

      const endpoint = onSolana
        ? "https://identical-vivi-faucetdrops-41e9c56b.koyeb.app/solana/generate-new-drop-code"
        : "https://identical-vivi-faucetdrops-41e9c56b.koyeb.app/generate-new-drop-code";

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          faucetAddress,
          userAddress: address,
          chainId: onSolana ? SOLANA_CHAIN_ID : Number(chainId),
        }),
      });
      if (!res.ok) {
        const e = await res.json();
        throw new Error(e.detail);
      }
      const { secretCode } = await res.json();
      setNewlyGeneratedCode(secretCode);
      setShowNewCodeDialog(true);
      toast.success("New drop code generated");
    } catch (err: any) {
      toast.error(err.message || "Failed to generate new drop code");
    } finally {
      setIsGeneratingNewCode(false);
    }
  };

  // ── Misc helpers ───────────────────────────────────────────────────────────
  const handleCopyLink = async (type: "web" | "farcaster") => {
    try {
      const url =
        type === "web"
          ? window.location.origin + "/faucet/" + faucetAddress
          : `https://farcaster.xyz/miniapps/x8wlGgdqylmp/FaucetDrops?startapp/faucet=${faucetAddress}`;
      await navigator.clipboard.writeText(url);
      toast.success("Link copied to clipboard");
    } catch {
      toast.error("Failed to copy link");
    }
  };

  const handleCopySecretCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      toast.success("Drop code copied!");
      setShowNewCodeDialog(false);
    } catch {
      toast.error("Failed to copy");
    }
  };

  const getTxExplorerUrl = (txHash: string) => {
    const explorer =
      selectedNetwork?.blockExplorerUrls ||
      selectedNetwork?.blockExplorerUrl ||
      selectedNetwork?.explorer;
    if (!explorer || !txHash) return null;
    // Solana explorers use /tx/ too (Solscan, Solana Explorer)
    return `${String(explorer).replace(/\/$/, "")}/tx/${txHash}`;
  };

  const getEventBadgeVariant = (
    type: string
  ): "default" | "secondary" | "destructive" | "outline" => {
    const t = type?.toLowerCase();
    if (t === "claim" || t === "drip") return "default";
    if (t === "fund" || t === "deposit") return "secondary";
    if (t === "withdraw") return "destructive";
    return "outline";
  };

  const getEventColor = (type: string) => {
    const t = type?.toLowerCase();
    if (t === "claim" || t === "drip") return "text-green-600 dark:text-green-400";
    if (t === "fund" || t === "deposit") return "text-blue-600 dark:text-blue-400";
    if (t === "withdraw") return "text-red-500 dark:text-red-400";
    if (t === "reset") return "text-amber-500";
    return "text-muted-foreground";
  };

  const getEstimatedLength = () => {
    const estimate = customXPostTemplate
      .replace(/\{amount\}/g, "00.00")
      .replace(/\{token\}/g, "TOKEN")
      .replace(/\{network\}/g, "NetworkName")
      .replace(/\{explorer\}/g, "https://explorer.com/tx/0x...");
    return FIXED_TWEET_PREFIX.length + 1 + estimate.length;
  };

  const charCount = getEstimatedLength();
  const isOverLimit = charCount > 280;

  const totalPages = Math.ceil(transactions.length / 10);
  const startIndex = (currentPage - 1) * 10;
  const currentTransactions = transactions.slice(startIndex, startIndex + 10);
  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) setCurrentPage(page);
  };

  const getTokenName = (isEther: boolean) =>
    !isEther ? tokenSymbol : selectedNetwork?.nativeCurrency?.symbol || "ETH";

  const combinedPreviewTasks = [
    ...dynamicTasks.map((t) => ({ ...t, status: "Current" })),
    ...newSocialLinks.filter((l) => l.handle.trim()).map((t) => ({ ...t, status: "New" })),
  ];

  const simulatedFaucetDetails = {
    ...faucetDetails,
    name: newFaucetName || faucetDetails.name,
    claimAmount:
      faucetType === "custom"
        ? BigInt(0)
        : (() => {
            try { return parseUnits(claimAmount || "0", tokenDecimals); }
            catch { return BigInt(0); }
          })(),
    isClaimActive:
      new Date(endTime).getTime() > Date.now() &&
      new Date(startTime).getTime() <= Date.now(),
    faucetMetadata: {
      description:
        faucetMetadata?.description ||
        faucetDetails?.faucetMetadata?.description ||
        `Preview of ${newFaucetName} Faucet`,
      imageUrl:
        faucetMetadata?.imageUrl ||
        faucetDetails?.faucetMetadata?.imageUrl ||
        "/default.jpeg",
    },
  };

  const renderCountdown = (
    timestamp: number,
    prefix: string,
    startTimeMs?: number
  ): string => {
    if (timestamp === 0) return "N/A";
    if (prefix === "End" && startTimeMs && startTimeMs > currentTime) {
      const duration = timestamp * 1000 - startTimeMs;
      const d = Math.floor(duration / 86400000);
      const h = Math.floor((duration % 86400000) / 3600000);
      const m = Math.floor((duration % 3600000) / 60000);
      return `${d}d ${h}h ${m}m (Duration)`;
    }
    const diff = timestamp * 1000 - currentTime;
    if (diff <= 0) return prefix === "Start" ? "Active" : "Ended";
    const days = Math.floor(diff / 86400000);
    const hours = Math.floor((diff % 86400000) / 3600000);
    const mins = Math.floor((diff % 3600000) / 60000);
    const secs = Math.floor((diff % 60000) / 1000);
    return `${days}d ${hours}h ${mins}m ${secs}s`;
  };

  const adminTabs = [
    { value: "fund", label: "Fund", icon: Upload },
    { value: "parameters", label: "Parameters", icon: Coins },
    ...(shouldShowWhitelistTab ? [{ value: "whitelist", label: "Drop-list", icon: Users }] : []),
    ...(shouldShowCustomTab ? [{ value: "custom", label: "Custom", icon: FileUp }] : []),
    { value: "admin-power", label: "Admin Power", icon: RotateCcw },
    { value: "history", label: "Activity Log", icon: History },
  ];

  const colCount = adminTabs.length;

  // ── Solana wallet guard banner ─────────────────────────────────────────────
  const SolanaWalletMissing = onSolana && !activeSolanaWallet && (
    <div className="flex items-start gap-2 rounded-lg border border-amber-300/50 bg-amber-50 dark:bg-amber-950/20 px-4 py-3 text-xs text-amber-700 dark:text-amber-400 mb-4">
      <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
      <span>
        Solana wallet not detected. Connect your Solana wallet to execute admin actions.
      </span>
    </div>
  );

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <Card className="w-full mx-auto overflow-hidden">
      {/* ── Header ── */}
      <CardHeader className="px-5 sm:px-6 pb-4 border-b bg-muted/10">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
          <div>
            <CardTitle className="text-lg sm:text-xl font-semibold">Admin Controls</CardTitle>
            <CardDescription className="text-xs mt-0.5 flex items-center gap-1.5">
              Manage your{" "}
              <span className="font-medium capitalize text-foreground/70">{faucetType || "unknown"}</span>{" "}
              faucet — settings, parameters, and activity.
              {onSolana && (
                <Badge
                  className="text-[10px] px-1.5 py-0 ml-1"
                  style={{ backgroundColor: selectedNetwork?.color ?? "#14F195", color: "#000" }}
                >
                  Solana
                </Badge>
              )}
            </CardDescription>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs gap-1.5"
              onClick={() => setShowQRDialog(true)}
            >
              <Share2 className="h-3.5 w-3.5" /> Share
            </Button>
            <Button
              onClick={() => setShowPreviewDialog(true)}
              variant="secondary"
              size="sm"
              className="h-8 text-xs gap-1.5"
            >
              <Eye className="h-3.5 w-3.5" /> Preview
            </Button>
          </div>
        </div>

        {isOwner && (
          <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-dashed mt-3">
            <span className="text-xs text-muted-foreground mr-1">Owner actions:</span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowEditNameDialog(true)}
              className="h-7 text-xs gap-1"
            >
              <Edit className="h-3 w-3" /> Edit Name
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setShowDeleteDialog(true)}
              className="h-7 text-xs gap-1"
            >
              <Trash2 className="h-3 w-3" /> Delete Faucet
            </Button>
          </div>
        )}
      </CardHeader>

      {/* ── Stats ── */}
      <CardContent className="px-5 sm:px-6 py-4 border-b">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard
            icon={Zap}
            label="Current Balance"
            value={
              <>
                {faucetDetails.balance ? formatUnits(faucetDetails.balance, tokenDecimals) : "0"}{" "}
                <span className="text-base font-medium text-muted-foreground">{tokenSymbol}</span>
              </>
            }
            accent
          />
          <StatCard
            icon={Coins}
            label="Drip Amount"
            value={
              faucetType === "custom" ? (
                <span className="text-muted-foreground text-base">Custom</span>
              ) : (
                <>
                  {faucetDetails.claimAmount
                    ? formatUnits(faucetDetails.claimAmount, tokenDecimals)
                    : "0"}{" "}
                  <span className="text-base font-medium text-muted-foreground">{tokenSymbol}</span>
                </>
              )
            }
          />
          <StatCard
            icon={Activity}
            label="Live Status"
            value={
              faucetDetails.isClaimActive ? (
                <Badge className="bg-green-500 hover:bg-green-500 text-white text-xs font-semibold px-2">
                  ● Active
                </Badge>
              ) : (
                <Badge variant="destructive" className="text-xs font-semibold px-2">
                  ● Inactive
                </Badge>
              )
            }
          />
          <StatCard
            icon={Clock}
            label="Ends In"
            value={
              <span className="text-sm font-mono">
                {faucetDetails.isClaimActive && Number(faucetDetails.endTime) > 0
                  ? renderCountdown(Number(faucetDetails.endTime), "End")
                  : "—"}
              </span>
            }
          />
        </div>

        <div className="mt-3">
          <TokenBalance
            tokenAddress={faucetDetails.token}
            tokenSymbol={tokenSymbol}
            tokenDecimals={tokenDecimals}
            isNativeToken={faucetDetails.isEther}
            networkChainId={selectedNetwork?.chainId}
          />
        </div>
      </CardContent>

      {/* ── Tabs ── */}
      <CardContent className="px-5 sm:px-6 pt-5 pb-6">
        {SolanaWalletMissing}

        <Tabs defaultValue="fund" value={activeTab} onValueChange={setActiveTab}>
          {/* Mobile dropdown */}
          <div className="md:hidden mb-4">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="w-full justify-between h-10 text-sm">
                  <span className="flex items-center gap-2">
                    {(() => {
                      const tab = adminTabs.find((t) => t.value === activeTab);
                      return tab ? (
                        <>
                          <tab.icon className="h-4 w-4" />
                          {tab.label}
                        </>
                      ) : (
                        "Menu"
                      );
                    })()}
                  </span>
                  <Menu className="h-4 w-4 text-muted-foreground" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56">
                {adminTabs.map((tab) => (
                  <DropdownMenuItem
                    key={tab.value}
                    onClick={() => setActiveTab(tab.value)}
                    className={cn("gap-2", activeTab === tab.value && "bg-muted font-medium")}
                  >
                    <tab.icon className="h-4 w-4" /> {tab.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Desktop tab list */}
          <TabsList
            className={cn(
              "hidden md:grid gap-1 w-full h-auto p-1 rounded-xl",
              `grid-cols-${colCount}`
            )}
          >
            {adminTabs.map((tab) => (
              <TabsTrigger
                key={tab.value}
                value={tab.value}
                className="flex items-center gap-1.5 text-xs py-2 rounded-lg data-[state=active]:shadow-sm"
              >
                <tab.icon className="h-3.5 w-3.5" />
                <span className="hidden lg:inline">{tab.label}</span>
                <span className="lg:hidden">{tab.label.split(" ")[0]}</span>
              </TabsTrigger>
            ))}
          </TabsList>

          {/* ── Fund Tab ── */}
          <TabsContent value="fund" className="space-y-4 mt-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Section icon={Upload} title="Fund Faucet">
                <div className="space-y-3">
                  <Label className="text-xs text-muted-foreground">Amount to deposit</Label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="0.0"
                      value={fundAmount}
                      onChange={(e) => setFundAmount(e.target.value)}
                      className="text-sm"
                    />
                    <Button
                      onClick={handleFund}
                      disabled={isFunding || !fundAmount || (onSolana && !activeSolanaWallet)}
                      className="shrink-0"
                    >
                      {isFunding ? <Spinner /> : <Upload className="h-4 w-4" />}
                      <span className="ml-1.5 text-xs">Fund</span>
                    </Button>
                  </div>
                  {/* EVM-only fee display (Solana fees are handled on-chain automatically) */}
                  {!onSolana && fundAmount && (
                    <div className="rounded-lg bg-muted/40 p-3 text-xs space-y-1 border border-dashed">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Platform fee ({feePercent}%)</span>
                        <span className="font-mono">{fee} {tokenSymbol}</span>
                      </div>
                      <div className="flex justify-between font-medium">
                        <span className="text-muted-foreground">Net to faucet</span>
                        <span className="font-mono">{netAmount} {tokenSymbol}</span>
                      </div>
                      <p className="text-blue-500 pt-1">
                        Tip: deposit {recommendedInput} {tokenSymbol} to net exactly {fundAmount}
                      </p>
                    </div>
                  )}
                  {onSolana && fundAmount && (
                    <p className="text-xs text-muted-foreground bg-muted/30 rounded-lg px-3 py-2">
                      Fees (1% backend + 2% platform) are deducted automatically on-chain.
                    </p>
                  )}
                </div>
              </Section>

              <Section icon={Download} title="Withdraw Tokens">
                <div className="space-y-3">
                  <Label className="text-xs text-muted-foreground">Amount to withdraw</Label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="0.0"
                      value={withdrawAmount}
                      onChange={(e) => setWithdrawAmount(e.target.value)}
                      className="text-sm"
                    />
                    <Button
                      onClick={handleWithdraw}
                      disabled={isWithdrawing || !withdrawAmount || (onSolana && !activeSolanaWallet)}
                      variant="outline"
                      className="shrink-0"
                    >
                      {isWithdrawing ? <Spinner /> : <Download className="h-4 w-4" />}
                      <span className="ml-1.5 text-xs">Withdraw</span>
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {onSolana
                      ? "Only callable after the claim period ends."
                      : `Withdraw available ${tokenSymbol} from the faucet balance.`}
                  </p>
                </div>
              </Section>
            </div>
          </TabsContent>

          {/* ── Parameters Tab ── */}
          <TabsContent value="parameters" className="space-y-4 mt-5">
            <Section icon={Coins} title="Drip & Timing Parameters">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {faucetType !== "custom" && (
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">Drip Amount ({tokenSymbol})</Label>
                    <Input
                      placeholder="0.0"
                      value={claimAmount}
                      onChange={(e) => setClaimAmount(e.target.value)}
                      className="text-sm"
                    />
                    <p className="text-xs text-muted-foreground">Per-user amount per claim.</p>
                  </div>
                )}
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Start Time</Label>
                  <Input
                    type="datetime-local"
                    value={startTime}
                    min={getCurrentDateTime()}
                    onChange={handleStartTimeChange}
                    className={cn("text-sm", startTimeError && "border-destructive")}
                  />
                  {startTimeError && (
                    <p className="text-xs text-destructive flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" /> {startTimeError}
                    </p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">End Time</Label>
                  <Input
                    type="datetime-local"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="text-sm"
                  />
                </div>
              </div>
            </Section>

            {/* Social Tasks — identical for both chains */}
            <Section icon={Link} title="Required Social Tasks">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">
                    Users must complete these before claiming.
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addNewSocialLink}
                    className="h-7 text-xs gap-1"
                  >
                    <Plus className="h-3 w-3" /> Add Task
                  </Button>
                </div>

                {dynamicTasks.length > 0 && (
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Saved ({dynamicTasks.length})
                    </Label>
                    {dynamicTasks.map((task, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between px-3 py-2 bg-muted/40 rounded-lg text-xs border border-border/50"
                      >
                        <span className="truncate">
                          {getPlatformIcon(task.platform)} {getActionText(task.platform)}{" "}
                          {task.handle}
                        </span>
                        <Badge variant="secondary" className="text-[10px] ml-2 shrink-0">
                          {task.platform}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}

                {newSocialLinks.length > 0 && (
                  <div className="space-y-3">
                    <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      New Tasks ({newSocialLinks.length})
                    </Label>
                    {newSocialLinks.map((link, index) => (
                      <div key={index} className="border rounded-xl p-4 space-y-3 bg-muted/20">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold">Task {index + 1}</span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeNewSocialLink(index)}
                            className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                          >
                            <X className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div className="space-y-1">
                            <Label className="text-xs">Platform</Label>
                            <Select
                              value={link.platform}
                              onValueChange={(v) => updateNewSocialLink(index, "platform", v)}
                            >
                              <SelectTrigger className="h-8 text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="𝕏">Twitter / 𝕏</SelectItem>
                                <SelectItem value="telegram">Telegram</SelectItem>
                                <SelectItem value="discord">Discord</SelectItem>
                                <SelectItem value="youtube">YouTube</SelectItem>
                                <SelectItem value="instagram">Instagram</SelectItem>
                                <SelectItem value="tiktok">TikTok</SelectItem>
                                <SelectItem value="facebook">Facebook</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Action</Label>
                            <Select
                              value={link.action}
                              onValueChange={(v) => updateNewSocialLink(index, "action", v)}
                            >
                              <SelectTrigger className="h-8 text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="follow">Follow</SelectItem>
                                <SelectItem value="subscribe">Subscribe</SelectItem>
                                <SelectItem value="join">Join</SelectItem>
                                <SelectItem value="like">Like</SelectItem>
                                <SelectItem value="retweet">Retweet</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Handle / Username</Label>
                          <Input
                            placeholder="@username"
                            value={link.handle}
                            onChange={(e) => updateNewSocialLink(index, "handle", e.target.value)}
                            className="h-8 text-xs"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">URL</Label>
                          <Input
                            placeholder="https://..."
                            value={link.url}
                            onChange={(e) => updateNewSocialLink(index, "url", e.target.value)}
                            className="h-8 text-xs font-mono text-muted-foreground"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </Section>

            {/* Share Post */}
            <Section icon={Share2} title="Custom Share Post">
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Customize the message users share after claiming.
                  </p>
                  <Badge
                    variant={isOverLimit ? "destructive" : "secondary"}
                    className="text-[10px] shrink-0 tabular-nums"
                  >
                    {charCount} / 280
                  </Badge>
                </div>
                <Textarea
                  placeholder='e.g. Thanks for the tokens! {@handle} {#hashtag}'
                  value={customXPostTemplate}
                  onChange={(e) => setCustomXPostTemplate(e.target.value)}
                  rows={4}
                  className={cn(
                    "text-sm font-mono resize-none transition-colors",
                    isOverLimit && "border-destructive focus-visible:ring-destructive"
                  )}
                />
                {isOverLimit && (
                  <p className="text-xs text-destructive flex items-center gap-1">
                    <AlertCircle className="h-3.5 w-3.5" />
                    Post may be truncated on 𝕏 (over 280 chars)
                  </p>
                )}
              </div>
            </Section>

            <Button
              onClick={handleUpdateClaimParameters}
              className="w-full"
              disabled={isUpdatingParameters || (onSolana && !activeSolanaWallet)}
            >
              {isUpdatingParameters ? (
                <span className="flex items-center gap-2">
                  <Spinner /> Saving changes…
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4" /> Save & Update Parameters
                </span>
              )}
            </Button>
          </TabsContent>

          {/* ── Whitelist Tab ── */}
          {shouldShowWhitelistTab && (
            <TabsContent value="whitelist" className="space-y-4 mt-5">
              <Section icon={Users} title="Manage Drop-list">
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border border-dashed">
                    <div>
                      <p className="text-sm font-medium">
                        {isWhitelistEnabled ? "Add Addresses" : "Remove Addresses"}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Toggle to switch between adding and removing
                      </p>
                    </div>
                    <Switch
                      checked={isWhitelistEnabled}
                      onCheckedChange={setIsWhitelistEnabled}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">
                      Addresses (one per line or comma-separated)
                    </Label>
                    <Textarea
                      value={whitelistAddresses}
                      onChange={(e) => setWhitelistAddresses(e.target.value)}
                      rows={6}
                      placeholder={
                        onSolana
                          ? "SolanaAddress1...\nSolanaAddress2...\nSolanaAddress3..."
                          : "0xABC...\n0xDEF...\n0x123..."
                      }
                      className="text-sm font-mono"
                    />
                  </div>
                  <Button
                    onClick={handleUpdateWhitelist}
                    className="w-full"
                    disabled={isUpdatingWhitelist || (onSolana && !activeSolanaWallet)}
                  >
                    {isUpdatingWhitelist ? (
                      <span className="flex items-center gap-2">
                        <Spinner /> Updating…
                      </span>
                    ) : (
                      "Update Drop-list"
                    )}
                  </Button>
                </div>
              </Section>
            </TabsContent>
          )}

          {/* ── Custom Tab ── */}
          {shouldShowCustomTab && (
            <TabsContent value="custom" className="space-y-4 mt-5">
              <Section icon={FileUp} title="Upload Custom Claim Amounts">
                <CustomClaimUploader
                  tokenSymbol={tokenSymbol}
                  tokenDecimals={tokenDecimals}
                  onDataParsed={async (addresses, amounts) => {
                    if (!address || !checkNetwork()) return;
                    try {
                      await handleCustomClaimAmounts(addresses, amounts);
                      toast.success("Custom claim amounts set successfully");
                      await loadFaucetDetails();
                      await loadTransactionHistory();
                    } catch (err: any) {
                      toast.error(err.message || "Failed to set custom claim amounts.");
                    }
                  }}
                  onCancel={() => {}}
                />
              </Section>
            </TabsContent>
          )}

          {/* ── Admin Power Tab ── */}
          <TabsContent value="admin-power" className="space-y-4 mt-5">
            {/* Secret Code */}
            {shouldShowSecretCodeButton && (
              <Section icon={Key} title="Drop Code Management">
                <div className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Button
                      onClick={handleRetrieveSecretCode}
                      variant="outline"
                      className="h-10 text-sm gap-2"
                      disabled={isRetrievingSecret}
                    >
                      {isRetrievingSecret ? <Spinner /> : <Key className="h-4 w-4" />}
                      Get Current Code
                    </Button>
                    <Button
                      onClick={handleGenerateNewDropCode}
                      variant="outline"
                      className="h-10 text-sm gap-2"
                      disabled={isGeneratingNewCode}
                    >
                      {isGeneratingNewCode ? <Spinner /> : <RotateCcw className="h-4 w-4" />}
                      Generate New Code
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground bg-amber-50 dark:bg-amber-950/20 border border-amber-200/50 dark:border-amber-800/30 rounded-lg px-3 py-2 flex items-start gap-1.5">
                    <AlertCircle className="h-3.5 w-3.5 text-amber-500 mt-0.5 shrink-0" />
                    Generating a new code immediately invalidates the previous one.
                  </p>
                </div>
              </Section>
            )}

            {/* Admin List */}
            <Section icon={Users} title="Admin List">
              <div className="space-y-4">
                <div className="space-y-2">
                  {adminList
                    .filter(
                      (admin) =>
                        onSolana ||
                        admin.toLowerCase() !== FACTORY_OWNER_ADDRESS.toLowerCase()
                    )
                    .map((admin) => (
                      <div
                        key={admin}
                        className="flex items-center justify-between px-3 py-2.5 rounded-lg bg-muted/40 border border-border/50"
                      >
                        <span className="font-mono text-xs truncate">{admin}</span>
                        <Badge
                          variant={
                            admin.toLowerCase() === faucetDetails?.owner.toLowerCase()
                              ? "secondary"
                              : "outline"
                          }
                          className="text-[10px] ml-2 shrink-0"
                        >
                          {admin.toLowerCase() === faucetDetails?.owner.toLowerCase()
                            ? "Owner"
                            : "Admin"}
                        </Badge>
                      </div>
                    ))}
                </div>

                {isOwner && (
                  <div className="space-y-2 pt-3 border-t">
                    <Label className="text-xs font-medium">
                      {isAddingAdmin ? "Add New Admin" : "Remove Admin"}
                    </Label>
                    <div className="flex gap-2">
                      <Input
                        placeholder={onSolana ? "Solana address..." : "0x..."}
                        value={newAdminAddress}
                        onChange={(e) => {
                          setNewAdminAddress(e.target.value);
                          checkAdminStatus(e.target.value);
                        }}
                        className="text-sm font-mono"
                      />
                      <Button
                        onClick={() => setShowAddAdminDialog(true)}
                        disabled={
                          isManagingAdmin ||
                          !newAdminAddress.trim() ||
                          (onSolana && !activeSolanaWallet)
                        }
                        variant={isAddingAdmin ? "default" : "destructive"}
                        className="shrink-0 text-xs"
                      >
                        {isManagingAdmin ? <Spinner /> : isAddingAdmin ? "Add" : "Remove"}
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Owner address cannot be modified here.
                    </p>
                  </div>
                )}
              </div>
            </Section>

            {/* Reset Claims */}
            <Section icon={RotateCcw} title="Reset Claims">
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Wipe the claim history for all users, allowing everyone to claim again.
                </p>
                {onSolana && (
                  <p className="text-xs text-muted-foreground bg-muted/30 rounded-lg px-3 py-2">
                    On Solana, resets are processed via the backend which holds the claimer list.
                  </p>
                )}
                <Button
                  onClick={handleResetAllClaims}
                  variant="destructive"
                  className="gap-2"
                  disabled={isResettingClaims || (onSolana && !activeSolanaWallet)}
                >
                  {isResettingClaims ? (
                    <span className="flex items-center gap-2">
                      <Spinner /> Resetting…
                    </span>
                  ) : (
                    <>
                      <RotateCcw className="h-4 w-4" /> Reset All Claims
                    </>
                  )}
                </Button>
              </div>
            </Section>
          </TabsContent>

          {/* ── Activity Log Tab ── */}
          <TabsContent value="history" className="space-y-4 mt-5">
            <Section icon={History} title="Onchain Activity Log">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">
                    {onSolana
                      ? "Live events fetched from Solana RPC."
                      : "Live onchain events from the faucet contract."}
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs gap-1.5"
                    onClick={loadTransactionHistory}
                    disabled={isHistoryLoading}
                  >
                    {isHistoryLoading ? <Spinner /> : <RotateCcw className="h-3 w-3" />}
                    {isHistoryLoading ? "Refreshing..." : "Refresh"}
                  </Button>
                </div>

                {isHistoryLoading ? (
                  <div className="text-center py-12">
                    <div className="inline-flex items-center justify-center h-14 w-14 rounded-full bg-muted/50 mb-3">
                      <div className="h-6 w-6 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                    </div>
                    <p className="text-sm font-medium text-muted-foreground">
                      Loading activity log…
                    </p>
                    <p className="text-xs text-muted-foreground/60 mt-1">
                      {onSolana
                        ? "Fetching signatures from Solana RPC"
                        : "Fetching the latest events from the blockchain"}
                    </p>
                  </div>
                ) : transactions.length > 0 ? (
                  <>
                    <div className="overflow-x-auto rounded-lg border border-border/60">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-muted/30 hover:bg-muted/30">
                            <TableHead className="text-xs font-semibold w-[90px]">Event</TableHead>
                            <TableHead className="text-xs font-semibold">Address</TableHead>
                            <TableHead className="text-xs font-semibold text-right">Amount</TableHead>
                            <TableHead className="text-xs font-semibold hidden sm:table-cell">
                              Date
                            </TableHead>
                            <TableHead className="text-xs font-semibold text-right w-[60px]">
                              Tx
                            </TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {currentTransactions.map((tx, index) => {
                            const explorerUrl = getTxExplorerUrl(
                              tx.txHash || tx.transactionHash
                            );
                            return (
                              <TableRow
                                key={`${tx.txHash || tx.transactionHash || tx.timestamp}-${index}`}
                                className="hover:bg-muted/20 transition-colors"
                              >
                                <TableCell className="text-xs py-2.5">
                                  <Badge
                                    variant={getEventBadgeVariant(tx.transactionType)}
                                    className={`text-[10px] font-semibold capitalize px-2 ${
                                      tx.transactionType?.toLowerCase() === "claim" ||
                                      tx.transactionType?.toLowerCase() === "drip"
                                        ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-800"
                                        : tx.transactionType?.toLowerCase() === "fund" ||
                                          tx.transactionType?.toLowerCase() === "deposit"
                                        ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800"
                                        : tx.transactionType?.toLowerCase() === "withdraw"
                                        ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800"
                                        : ""
                                    }`}
                                  >
                                    {tx.transactionType || "Event"}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-xs font-mono text-muted-foreground py-2.5">
                                  <span
                                    className="cursor-pointer hover:text-foreground transition-colors"
                                    onClick={() =>
                                      navigator.clipboard
                                        .writeText(tx.initiator)
                                        .then(() => toast.success("Address copied"))
                                    }
                                    title={tx.initiator}
                                  >
                                    {tx.initiator.slice(0, 6)}…{tx.initiator.slice(-4)}
                                  </span>
                                </TableCell>
                                <TableCell className="text-xs font-mono text-right py-2.5">
                                  <span className={getEventColor(tx.transactionType)}>
                                    {tx.transactionType?.toLowerCase() === "withdraw" ? "−" : "+"}
                                    {formatUnits(tx.amount, tokenDecimals)}
                                  </span>
                                  <span className="text-muted-foreground ml-1">
                                    {getTokenName(tx.isEther)}
                                  </span>
                                </TableCell>
                                <TableCell className="text-xs text-muted-foreground hidden sm:table-cell py-2.5 whitespace-nowrap">
                                  {new Date(tx.timestamp * 1000).toLocaleString(undefined, {
                                    month: "short",
                                    day: "numeric",
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })}
                                </TableCell>
                                <TableCell className="text-right py-2.5">
                                  {explorerUrl ? (
                                    <a
                                      href={explorerUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="inline-flex items-center justify-center h-6 w-6 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                                      title="View on explorer"
                                    >
                                      <ExternalLink className="h-3 w-3" />
                                    </a>
                                  ) : (
                                    <span className="text-muted-foreground/30 text-[10px]">—</span>
                                  )}
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>

                    {totalPages > 1 && (
                      <div className="flex items-center justify-between pt-1">
                        <span className="text-xs text-muted-foreground">
                          Showing {startIndex + 1}–
                          {Math.min(startIndex + 10, transactions.length)} of{" "}
                          {transactions.length}
                        </span>
                        <div className="flex gap-1">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handlePageChange(currentPage - 1)}
                            disabled={currentPage === 1}
                            className="h-7 text-xs"
                          >
                            Prev
                          </Button>
                          {Array.from(
                            { length: Math.min(totalPages, 5) },
                            (_, i) => {
                              const page =
                                totalPages <= 5
                                  ? i + 1
                                  : Math.max(1, currentPage - 2) + i;
                              if (page > totalPages) return null;
                              return (
                                <Button
                                  key={page}
                                  variant={currentPage === page ? "default" : "outline"}
                                  size="sm"
                                  onClick={() => handlePageChange(page)}
                                  className="h-7 w-7 text-xs p-0"
                                >
                                  {page}
                                </Button>
                              );
                            }
                          )}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handlePageChange(currentPage + 1)}
                            disabled={currentPage === totalPages}
                            className="h-7 text-xs"
                          >
                            Next
                          </Button>
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-center py-12">
                    <div className="inline-flex items-center justify-center h-14 w-14 rounded-full bg-muted/50 mb-3">
                      <Activity className="h-6 w-6 text-muted-foreground/50" />
                    </div>
                    <p className="text-sm font-medium text-muted-foreground">
                      No onchain events found
                    </p>
                    <p className="text-xs text-muted-foreground/60 mt-1">
                      Events appear here once users interact with the faucet
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-3 h-7 text-xs gap-1.5"
                      onClick={loadTransactionHistory}
                    >
                      <RotateCcw className="h-3 w-3" /> Try Refreshing
                    </Button>
                  </div>
                )}
              </div>
            </Section>
          </TabsContent>
        </Tabs>
      </CardContent>

      {/* ══════════════════════ DIALOGS ══════════════════════ */}

      {/* Preview */}
      <Dialog open={showPreviewDialog} onOpenChange={setShowPreviewDialog}>
        <DialogContent className="w-[95vw] max-w-xl max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-blue-600">
              <Eye className="h-5 w-5" /> User View Preview
            </DialogTitle>
            <DialogDescription>
              Preview uses the latest saved and unsaved parameter values.
            </DialogDescription>
            {combinedPreviewTasks.length > 0 && (
              <div className="mt-3 p-3 bg-muted rounded-lg space-y-1.5 text-left">
                <p className="text-xs font-semibold flex items-center gap-1">
                  <CheckCircle className="h-3.5 w-3.5 text-green-600" />
                  {combinedPreviewTasks.length} task
                  {combinedPreviewTasks.length !== 1 ? "s" : ""} configured
                </p>
                <ul className="text-xs text-muted-foreground space-y-0.5 pl-5 list-disc">
                  {combinedPreviewTasks.map((task, i) => (
                    <li key={i}>
                      {task.platform}: {getActionText(task.platform)} {task.handle}
                      <Badge variant="outline" className="text-[9px] ml-1">
                        {task.status}
                      </Badge>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </DialogHeader>
          <div className="py-4 border-t">
            <FaucetUserView
              faucetAddress={faucetAddress}
              faucetDetails={simulatedFaucetDetails}
              faucetType={faucetType}
              tokenSymbol={tokenSymbol}
              tokenDecimals={tokenDecimals}
              selectedNetwork={selectedNetwork}
              address={null}
              isConnected={false}
              hasClaimed={false}
              userIsWhitelisted={faucetType === "droplist"}
              hasCustomAmount={faucetType === "custom"}
              userCustomClaimAmount={parseUnits("100", tokenDecimals)}
              dynamicTasks={combinedPreviewTasks}
              allAccountsVerified={false}
              secretCode=""
              setSecretCode={() => {}}
              usernames={{}}
              setUsernames={() => {}}
              verificationStates={{}}
              setVerificationStates={() => {}}
              isVerifying={false}
              faucetMetadata={simulatedFaucetDetails.faucetMetadata}
              customXPostTemplate={customXPostTemplate}
              handleBackendClaim={() => {
                toast.warning("Preview Mode: Claim disabled.");
                return Promise.resolve();
              }}
              handleFollowAll={() => toast.warning("Preview Mode: Follow disabled.")}
              generateXPostContent={(a) => `Preview: ${a} ${tokenSymbol}`}
              txHash={null}
              showFollowDialog={false}
              setShowFollowDialog={() => {}}
              showVerificationDialog={false}
              setShowVerificationDialog={() => {}}
              showClaimPopup={false}
              setShowClaimPopup={() => {}}
              handleVerifyAllTasks={() => Promise.resolve()}
            />
          </div>
          <DialogFooter>
            <Button onClick={() => setShowPreviewDialog(false)}>Close Preview</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Fund Confirmation */}
      <Dialog open={showFundPopup} onOpenChange={setShowFundPopup}>
        <DialogContent className="w-[95vw] max-w-md">
          <DialogHeader>
            <DialogTitle>Confirm Funding</DialogTitle>
            <DialogDescription>Review the funding details before proceeding.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Amount to Fund</Label>
              <Input
                value={adjustedFundAmount}
                onChange={(e) => setAdjustedFundAmount(e.target.value)}
                className="text-sm"
              />
            </div>
            {!onSolana && (
              <div className="rounded-lg bg-muted/40 border border-dashed p-3 text-xs space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Platform fee ({feePercent}%)</span>
                  <span className="font-mono">{fee} {tokenSymbol}</span>
                </div>
                <div className="flex justify-between font-medium">
                  <span className="text-muted-foreground">Net to faucet</span>
                  <span className="font-mono">{netAmount} {tokenSymbol}</span>
                </div>
                <p className="text-blue-500 pt-1">
                  Tip: deposit {recommendedInput} {tokenSymbol} to net exactly {fundAmount}
                </p>
              </div>
            )}
            {onSolana && (
              <p className="text-xs text-muted-foreground bg-muted/30 rounded-lg px-3 py-2">
                Fees are handled on-chain automatically (1% backend + 2% platform).
              </p>
            )}
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowFundPopup(false)}>
              Cancel
            </Button>
            <Button onClick={confirmFund} disabled={isFunding}>
              {isFunding ? (
                <span className="flex items-center gap-2">
                  <Spinner /> Confirming…
                </span>
              ) : (
                "Confirm Fund"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Name */}
      <Dialog open={showEditNameDialog} onOpenChange={setShowEditNameDialog}>
        <DialogContent className="w-[95vw] max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Faucet Name</DialogTitle>
            <DialogDescription>Enter a new display name for your faucet.</DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5 py-2">
            <Label className="text-xs">New Name</Label>
            <Input
              value={newFaucetName}
              onChange={(e) => setNewFaucetName(e.target.value)}
              placeholder="My Awesome Faucet"
              className="text-sm"
            />
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setShowEditNameDialog(false);
                if (faucetDetails?.name) setNewFaucetName(faucetDetails.name);
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpdateFaucetName}
              disabled={isUpdatingName || !newFaucetName.trim() || (onSolana && !activeSolanaWallet)}
            >
              {isUpdatingName ? (
                <span className="flex items-center gap-2">
                  <Spinner /> Updating…
                </span>
              ) : (
                "Update Name"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="w-[95vw] max-w-md">
          <DialogHeader>
            <DialogTitle className="text-destructive">Delete Faucet</DialogTitle>
            <DialogDescription>
              This action is <strong>irreversible</strong>. The faucet and all associated data
              will be permanently removed.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteFaucet}
              disabled={isDeletingFaucet || (onSolana && !activeSolanaWallet)}
            >
              {isDeletingFaucet ? (
                <span className="flex items-center gap-2">
                  <Spinner /> Deleting…
                </span>
              ) : (
                "Yes, Delete Faucet"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add/Remove Admin */}
      <Dialog open={showAddAdminDialog} onOpenChange={setShowAddAdminDialog}>
        <DialogContent className="w-[95vw] max-w-md">
          <DialogHeader>
            <DialogTitle>{isAddingAdmin ? "Add Admin" : "Remove Admin"}</DialogTitle>
            <DialogDescription>
              {isAddingAdmin
                ? "Grant admin privileges to this address."
                : "Revoke admin privileges from this address."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5 py-2">
            <Label className="text-xs">Admin Address</Label>
            <Input
              value={newAdminAddress}
              onChange={(e) => {
                setNewAdminAddress(e.target.value);
                checkAdminStatus(e.target.value);
              }}
              placeholder={onSolana ? "Solana address..." : "0x..."}
              className="text-sm font-mono"
            />
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowAddAdminDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleManageAdmin}
              disabled={isManagingAdmin || !newAdminAddress.trim() || (onSolana && !activeSolanaWallet)}
              variant={isAddingAdmin ? "default" : "destructive"}
            >
              {isManagingAdmin ? (
                <span className="flex items-center gap-2">
                  <Spinner /> {isAddingAdmin ? "Adding…" : "Removing…"}
                </span>
              ) : isAddingAdmin ? (
                "Add Admin"
              ) : (
                "Remove Admin"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Current Secret Code */}
      <Dialog open={showCurrentSecretDialog} onOpenChange={setShowCurrentSecretDialog}>
        <DialogContent className="w-[95vw] max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Key className="h-4 w-4" /> Current Drop Code
            </DialogTitle>
            <DialogDescription>
              Share this code with your users to enable claiming.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 flex justify-center">
            <div className="text-2xl font-mono font-bold tracking-widest bg-muted rounded-xl px-8 py-5 border select-all">
              {currentSecretCode}
            </div>
          </div>
          <DialogFooter>
            <Button
              onClick={() => handleCopySecretCode(currentSecretCode)}
              className="w-full gap-2"
            >
              <Copy className="h-4 w-4" /> Copy Code
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New Code */}
      <Dialog
        open={showNewCodeDialog}
        onOpenChange={(open) => {
          setShowNewCodeDialog(open);
          if (!open) loadFaucetDetails();
        }}
      >
        <DialogContent className="w-[95vw] max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-600" /> New Drop Code Generated
            </DialogTitle>
            <DialogDescription>
              Previous code is now invalid. Share this new code with your users.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 flex justify-center">
            <div className="text-2xl font-mono font-bold tracking-widest bg-muted rounded-xl px-8 py-5 border select-all break-all text-center">
              {newlyGeneratedCode}
            </div>
          </div>
          <DialogFooter>
            <Button
              onClick={() => handleCopySecretCode(newlyGeneratedCode)}
              className="w-full gap-2"
            >
              <Copy className="h-4 w-4" /> Copy & Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* QR Code Share */}
      <QRCodeShareDialog
        open={showQRDialog}
        onOpenChange={setShowQRDialog}
        faucetAddress={faucetAddress}
        faucetDetails={faucetDetails}
        faucetMetadata={faucetMetadata}
        selectedNetwork={selectedNetwork}
        tokenSymbol={tokenSymbol}
      />
    </Card>
  );
};

export default FaucetAdminView;