"use client";


import React, { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useWallet } from "@/hooks/use-wallet";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Loader2, Zap, Trophy, TrendingUp, Clock, CheckCircle2,
  Flame, BarChart3, Coins, ArrowDownToLine, ArrowUpFromLine,
  RefreshCw, AlertCircle, Lock, Unlock, ShieldCheck,
  DollarSign, Droplets, Activity, Settings2, Wallet,
  ExternalLink, Hash,ShoppingCart, Banknote 
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ethers } from "ethers";
import { REDEEM_ABI } from "@/lib/abis";
import { getGoodDollarPrice } from "@/lib/getGoodDollarPrice";

const BACKEND_URL = "https://conscious-adorne-faucetdrops-fc77a861.koyeb.app";

/** ─── Contract config ────────────────────────────────────────────────────── */
const DROPS_REDEEM_POOL_ADDRESS = "0x38Ae076A115bf79102DA9472C4c688DB078a4b13"; // ← replace
const CELO_CHAIN_ID = 42220;
const CELO_CHAIN_HEX = "0xa4ec";
const CELO_RPC = "https://forno.celo.org";

const DROPS_REDEEM_POOL_ABI = [
  // ── Read ──────────────────────────────────────────────────────────────────
  "function freeLiquidity() view returns (uint256)",
  "function poolGBalance() view returns (uint256)",
  "function poolDropsBalance() view returns (uint256)",
  "function gPriceWei() view returns (uint256)",
  "function nextStakeId() view returns (uint256)",
  "function owner() view returns (address)",
  "function resolver() view returns (address)",
  "function serviceAddress() view returns (address)",
  "function gToken() view returns (address)",
  "function dropsToken() view returns (address)",
  "function getPlayerStakes(address player) view returns (uint256[])",
  "function getStake(uint256 stakeId) view returns (tuple(address player, uint256 stakeDropsWei, uint256 stakeGWei, uint256 apy, uint256 stakedAt, uint256 maturesAt, bool capitalReleased))",
  "function previewRedeem(uint256 totalDropsWei) view returns (uint256 playerG, uint256 feeG, uint256 stakeGLocked, uint256 stakeDropsWei, uint256 poolNeeded)",
  "function previewClaim(uint256 stakeId) view returns (uint256 apyG, uint256 capitalDropsWei, bool matured)",
  // ── Write (owner) ─────────────────────────────────────────────────────────
  "function depositG(uint256 amount)",
  "function withdrawG(uint256 amount)",
  "function setGPrice(uint256 _priceWei)",
  "function setResolver(address _resolver)",
  "function setServiceAddress(address _addr)",
  "function setDropsToken(address _dropsToken)",
  // ── ERC20 approve (for depositG) ──────────────────────────────────────────
];

// Minimal ERC20 ABI for approve
const ERC20_ABI = [
  "function approve(address spender, uint256 amount) returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function balanceOf(address account) view returns (uint256)",
  "function decimals() view returns (uint8)",
];

/** ─── Admin address (case-insensitive compare) ───────────────────────────── */
const ADMIN_ADDRESS = "0x9fbc2a0de6e5c5fd96e8d11541608f5f328c0785";
async function submitDropsClaim(
  payload: { contract: string; amount: string; timestamp: number; signature: string },
  activeSigner: ethers.JsonRpcSigner | ethers.Wallet,
): Promise<string> {
  const contract = new ethers.Contract(payload.contract, REDEEM_ABI, activeSigner);
  const tx = await contract.claim(
    BigInt(payload.amount),
    BigInt(payload.timestamp),
    payload.signature as `0x${string}`,
  );
  await tx.wait();
  return tx.hash as string;
}
// ── Types ─────────────────────────────────────────────────────────────────────

interface DropsBalance {
  success: boolean;
  gameDrops: number;
  rewardDrops: number;
  tier: string;
  apyPct: number;
  rematchBadge: boolean;
  totalDuels: number;
  gamesUntilBadge: number;
  maxStake: number | null;
}

interface StakePool {
  id: string;
  drops_staked: number;
  g_value_usd: number;
  apy_pct: number;
  staked_at: string;
  matures_at: string;
  matured: boolean;
  claimed: boolean;
  claimed_at: string | null;
  g_earned: number | null;
}

interface RedeemHistory {
  id: string;
  drops_burned: number;
  g_price_usd: number;
  player_g: number;
  fee_g: number;
  staked_g: number;
  tx_hash: string | null;
  created_at: string;
}

interface MatchHistory {
  code: string;
  topic: string;
  stake_amount: number;
  token_symbol: string;
  status: string;
  winner_address: string | null;
  created_at: string;
  finished_at: string | null;
}

interface PreviewRedeem {
  dropsToRedeem: number;
  availableReward: number;
  gPriceUsd: number;
  playerG: number;
  feeG: number;
  stakedG: number;
  stakeEarnedG: number;
  apyPct: number;
  sufficient: boolean;
}

/** On-chain pool stats (read directly from contract) */
interface OnChainPoolStats {
  gBalance: string;       // formatted $G
  freeLiquidity: string;  // formatted $G
  dropsBalance: string;   // formatted DROPS
  gPriceWei: bigint;
  gPriceUsd: number;
  nextStakeId: number;
  owner: string;
  resolver: string;
  serviceAddress: string;
  gTokenAddress: string;
  dropsTokenAddress: string;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const TIER_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  Flood:    { bg: "bg-indigo-50 dark:bg-indigo-950/20", text: "text-indigo-600 dark:text-indigo-400", border: "border-indigo-200 dark:border-indigo-800" },
  Torrent:  { bg: "bg-purple-50 dark:bg-purple-950/20", text: "text-purple-600 dark:text-purple-400", border: "border-purple-200 dark:border-purple-800" },
  Downpour: { bg: "bg-blue-50 dark:bg-blue-950/20",    text: "text-blue-600 dark:text-blue-400",    border: "border-blue-200 dark:border-blue-800" },
  Drizzle:  { bg: "bg-cyan-50 dark:bg-cyan-950/20",    text: "text-cyan-600 dark:text-cyan-400",    border: "border-cyan-200 dark:border-cyan-800" },
  Droplet:  { bg: "bg-slate-50 dark:bg-slate-900/40",  text: "text-slate-600 dark:text-slate-400",  border: "border-slate-200 dark:border-slate-700" },
};

const TIERS = [
  { name: "Droplet",  minDuels: 0,   apy: 15, next: 51  },
  { name: "Drizzle",  minDuels: 51,  apy: 20, next: 151 },
  { name: "Downpour", minDuels: 151, apy: 25, next: 301 },
  { name: "Torrent",  minDuels: 301, apy: 30, next: 501 },
  { name: "Flood",    minDuels: 501, apy: 35, next: null },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(n: number, decimals = 2) {
  if (n === 0) return "0";
  if (n < 0.001) return n.toFixed(6);
  return n.toFixed(decimals);
}

function fmtBig(wei: bigint, decimals = 18, display = 4): string {
  const formatted = ethers.formatUnits(wei, decimals);
  const num = parseFloat(formatted);
  if (num === 0) return "0";
  if (num < 0.000001) return num.toExponential(2);
  return num.toFixed(display);
}

function timeUntil(iso: string): string {
  const diff = new Date(iso).getTime() - Date.now();
  if (diff <= 0) return "Matured";
  const d = Math.floor(diff / 86400000);
  const h = Math.floor((diff % 86400000) / 3600000);
  if (d > 0) return `${d}d ${h}h`;
  return `${h}h`;
}

function timeAgo(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function shortAddr(addr: string): string {
  if (!addr || addr.length < 10) return addr;
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

function celoScanTx(hash: string) {
  return `https://celoscan.io/tx/${hash}`;
}

function isAdmin(address: string) {
  return address.toLowerCase() === ADMIN_ADDRESS.toLowerCase();
}

/** Switch the connected wallet to Celo, adding it if needed */
async function ensureCeloNetwork(provider: ethers.BrowserProvider): Promise<boolean> {
  try {
    const network = await provider.getNetwork();
    if (network.chainId === BigInt(CELO_CHAIN_ID)) return true;
    await (provider as any).send("wallet_switchEthereumChain", [{ chainId: CELO_CHAIN_HEX }]);
    return true;
  } catch (switchErr: any) {
    // Chain not added
    if (switchErr.code === 4902) {
      try {
        await (provider as any).send("wallet_addEthereumChain", [{
          chainId: CELO_CHAIN_HEX,
          chainName: "Celo Mainnet",
          nativeCurrency: { name: "CELO", symbol: "CELO", decimals: 18 },
          rpcUrls: [CELO_RPC],
          blockExplorerUrls: ["https://celoscan.io"],
        }]);
        return true;
      } catch { return false; }
    }
    return false;
  }
}

// ── Component ─────────────────────────────────────────────────────────────────

interface Props {
  walletAddress: string;
}

export function ChallengeDashboardTab({ walletAddress }: Props) {
  const { toast } = useToast();
  const wallet = walletAddress.toLowerCase();
  const adminMode = isAdmin(wallet);
  const { getActiveSigner, ensureCorrectNetwork } = useWallet();
  // ── Data state ─────────────────────────────────────────────────────────────
  const [balance, setBalance] = useState<DropsBalance | null>(null);
  const [stakes, setStakes] = useState<StakePool[]>([]);
  const [history, setHistory] = useState<RedeemHistory[]>([]);
  const [matchHistory, setMatchHistory] = useState<MatchHistory[]>([]);
  const [onChainStats, setOnChainStats] = useState<OnChainPoolStats | null>(null);
  const [loadingBalance, setLoadingBalance] = useState(true);
  const [loadingStakes, setLoadingStakes] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [loadingMatches, setLoadingMatches] = useState(false);
  const [loadingOnChain, setLoadingOnChain] = useState(false);
  
  // ── Inner tab ──────────────────────────────────────────────────────────────
  type InnerTab = "overview" | "redeem" | "pools" | "history" | "buy" | "admin";
  const tabs: { key: InnerTab; label: string }[] = [
  { key: "overview", label: "Overview" },
  { key: "redeem",   label: "Redeem"   },
  { key: "pools",    label: "Pools"    },
  { key: "history",  label: "History"  },
  { key: "buy",      label: "Buy Drop"      },           // ← new
  ...(adminMode ? [{ key: "admin" as InnerTab, label: "Admin" }] : []),
];
  const [innerTab, setInnerTab] = useState<InnerTab>("overview");

  // ── Redeem form ────────────────────────────────────────────────────────────
  const [redeemAmount, setRedeemAmount] = useState("");
  const [redeemPreview, setRedeemPreview] = useState<PreviewRedeem | null>(null);
  const [redeemLoading, setRedeemLoading] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [claimingStake, setClaimingStake] = useState<string | null>(null);

  // ── Admin contract form state ──────────────────────────────────────────────
  const [depositAmount, setDepositAmount] = useState("");
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [newGPrice, setNewGPrice] = useState("");
  const [newResolver, setNewResolver] = useState("");
  const [newServiceAddress, setNewServiceAddress] = useState("");
  const [newDropsToken, setNewDropsToken] = useState("");
  const [adminActionLoading, setAdminActionLoading] = useState<string | null>(null);
  const [lastTxHash, setLastTxHash] = useState<string | null>(null);

  // ── Buy DROPS state ───────────────────────────────────────────────────────
  const [dropsToBuy, setDropsToBuy] = useState("");
  const [buyStep, setBuyStep] = useState<"input" | "deposit" | "processing" | "done">("input");
  const [gCostDisplay, setGCostDisplay] = useState<number | null>(null);
  const [buyResult, setBuyResult] = useState<{ dropsAmount: number; mintTxHash: string } | null>(null);
  const [buyLoading, setBuyLoading] = useState(false);
  const [gTxHash, setGTxHash]         = useState("");
  const [gAmount, setGAmount]         = useState("");
  const [gPriceUsd, setGPriceUsd]           = useState<number | null>(null);
  const [gPriceLoading, setGPriceLoading]   = useState(false);
  const [gPriceError, setGPriceError]       = useState<string | null>(null);
  const [gPriceFetchedAt, setGPriceFetchedAt] = useState<number | null>(null);

  const fetchGoodDollarPrice = useCallback(async () => {
  setGPriceLoading(true);
  setGPriceError(null);
  try {
    const price = await getGoodDollarPrice();
    setGPriceUsd(price);
    setGPriceFetchedAt(Date.now());
  } catch {
    setGPriceError("Could not fetch $G price. Try refreshing.");
    setGPriceUsd(null);
  } finally {
    setGPriceLoading(false);
  }
}, []);

// Fetch fresh every time user opens the buy tab
useEffect(() => {
  if (innerTab === "buy") {
    fetchGoodDollarPrice();
  }
}, [innerTab, fetchGoodDollarPrice]);

const handleCalculate = async () => {
  const drops = parseFloat(dropsToBuy);
  if (!drops || drops < 10) {
    toast({ title: "Minimum 10 DROPS", variant: "destructive" });
    return;
  }

  // Refresh price right before calculating so it's never stale
  setGPriceLoading(true);
  setGPriceError(null);
  let freshPrice: number;
  try {
    freshPrice = await getGoodDollarPrice();
    setGPriceUsd(freshPrice);
    setGPriceFetchedAt(Date.now());
  } catch {
    toast({
      title: "Could not fetch $G price",
      description: "Check your connection and try again.",
      variant: "destructive",
    });
    setGPriceLoading(false);
    return;
  } finally {
    setGPriceLoading(false);
  }

  // 100 DROPS = $1 → gCost = (drops / 100) / pricePerG
  const gCost = (drops / 100) / freshPrice;
  setGCostDisplay(gCost);
  setBuyStep("deposit");
};



  // ── Contract interaction helpers ───────────────────────────────────────────
  // ── Buy DROPS handler ─────────────────────────────────────────────────────
// Add near the top with other state
const handleConfirmDeposit = async () => {
  const drops = parseFloat(dropsToBuy);
  if (!drops || !gCostDisplay) return;

  setBuyLoading(true);
  setBuyStep("processing");
  setBuyResult(null);

  try {
    // ── Use the existing wallet hook — no direct window.ethereum access ──
    const switched = await ensureCorrectNetwork(CELO_CHAIN_ID);
    if (!switched) throw new Error("Please switch to Celo Mainnet");

    const signer = await getActiveSigner();
    if (!signer) throw new Error("No wallet connected");

    const signerAddr = await signer.getAddress();
    if (signerAddr.toLowerCase() !== wallet) {
      throw new Error(`Connect as ${walletAddress} to proceed`);
    }

    const G_TOKEN = "0x62B8B11039FcfE5aB0C56E502b1C372A3d2a9c7A";
    const gToken = new ethers.Contract(
      G_TOKEN,
      [
        "function transfer(address to, uint256 amount) returns (bool)",
        "function balanceOf(address account) view returns (uint256)",
        "function decimals() view returns (uint8)",
      ],
      signer
    );

    const decimals: number = await gToken.decimals();
    const gAmountWei = ethers.parseUnits(gCostDisplay.toFixed(6), decimals);

    const balanceOf: bigint = await gToken.balanceOf(signerAddr);
    if (balanceOf < gAmountWei) {
      const humanBalance = ethers.formatUnits(balanceOf, decimals);
      throw new Error(
        `Insufficient $G balance. You have ${parseFloat(humanBalance).toFixed(4)} $G, need ${gCostDisplay.toFixed(4)} $G`
      );
    }

    toast({ title: "⏳ Confirm $G transfer in your wallet…" });
    const tx = await gToken.transfer(DROPS_REDEEM_POOL_ADDRESS, gAmountWei);
    toast({ title: "📡 Transfer sent, waiting for confirmation…" });

    const receipt = await tx.wait();
    if (!receipt || receipt.status !== 1) {
      throw new Error("$G transfer transaction failed");
    }

    setGTxHash(tx.hash);
    toast({ title: "✅ $G transferred! Minting your DROPS…" });

    const res = await fetch(`${BACKEND_URL}/api/drops/buy`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        walletAddress:   wallet,
        dropsAmount:     drops,
        expectedGAmount: gCostDisplay,
        gTxHash:         tx.hash,
      }),
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      toast({
        title:       "Mint failed",
        description: data?.detail ?? `Transfer confirmed but minting failed — save this tx: ${tx.hash}`,
        variant:     "destructive",
      });
      setBuyStep("deposit");
      return;
    }

    setBuyResult({ dropsAmount: data.dropsMinted, mintTxHash: data.mintTxHash });
    setBuyStep("done");
    toast({ title: `✅ ${data.dropsMinted} DROPS minted!` });
    fetchBalance();

  } catch (err: any) {
    console.error("handleConfirmDeposit error:", err);
    const msg = err?.reason ?? err?.shortMessage ?? err?.message ?? "Unknown error";
    toast({ title: "Transaction failed", description: msg, variant: "destructive" });
    setBuyStep("deposit");
  } finally {
    setBuyLoading(false);
  }
};

const handleBuyReset = () => {
  setDropsToBuy("");
  setGCostDisplay(null);
  setBuyResult(null);
  setBuyStep("input");
};
  /** Get a signer-backed contract instance, ensuring Celo network */
  const getSignerContract = useCallback(async () => {
    if (typeof window === "undefined" || !window.ethereum) {
      throw new Error("No wallet detected. Please install MetaMask or a Celo-compatible wallet.");
    }
    const provider = new ethers.BrowserProvider(window.ethereum);
    const switched = await ensureCeloNetwork(provider);
    if (!switched) throw new Error("Please switch your wallet to Celo Mainnet.");
    const signer = await provider.getSigner();
    const signerAddr = await signer.getAddress();
    if (signerAddr.toLowerCase() !== wallet) {
      throw new Error(`Wallet mismatch. Connect as ${walletAddress} to perform admin actions.`);
    }
    return new ethers.Contract(DROPS_REDEEM_POOL_ADDRESS, DROPS_REDEEM_POOL_ABI, signer);
  }, [wallet, walletAddress]);

  /** Read-only contract (no wallet needed) */
  const getReadContract = useCallback(() => {
    const provider = new ethers.JsonRpcProvider(CELO_RPC);
    return new ethers.Contract(DROPS_REDEEM_POOL_ADDRESS, DROPS_REDEEM_POOL_ABI, provider);
  }, []);

  // ── Fetch helpers ──────────────────────────────────────────────────────────
  const fetchBalance = useCallback(async () => {
    setLoadingBalance(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/drops/balance/${wallet}`);
      const data = await res.json();
      if (data.success) setBalance(data);
    } catch { /* silent */ }
    finally { setLoadingBalance(false); }
  }, [wallet]);

  const fetchStakes = useCallback(async () => {
    setLoadingStakes(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/drops/stakes/${wallet}`);
      const data = await res.json();
      if (data.success) setStakes(data.stakes ?? []);
    } catch { /* silent */ }
    finally { setLoadingStakes(false); }
  }, [wallet]);

  const fetchHistory = useCallback(async () => {
    setLoadingHistory(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/drops/redeem-history/${wallet}?limit=20`);
      const data = await res.json();
      if (data.success) setHistory(data.history ?? []);
    } catch { /* silent */ }
    finally { setLoadingHistory(false); }
  }, [wallet]);

  const fetchMatches = useCallback(async () => {
    setLoadingMatches(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/challenge/${wallet}/history?limit=20`);
      const data = await res.json();
      if (data.success) setMatchHistory(data.history ?? []);
    } catch { /* silent */ }
    finally { setLoadingMatches(false); }
  }, [wallet]);

  /** Read pool stats directly from the chain — no backend needed */
  const fetchOnChainStats = useCallback(async () => {
    setLoadingOnChain(true);
    try {
      const contract = getReadContract();
      const [
        gBalRaw, freeLiqRaw, dropsBalRaw, gPriceRaw,
        nextId, ownerAddr, resolverAddr, serviceAddr,
        gTokenAddr, dropsTokenAddr,
      ] = await Promise.all([
        contract.poolGBalance(),
        contract.freeLiquidity(),
        contract.poolDropsBalance(),
        contract.gPriceWei(),
        contract.nextStakeId(),
        contract.owner(),
        contract.resolver(),
        contract.serviceAddress(),
        contract.gToken(),
        contract.dropsToken(),
      ]);

      // gPriceWei is in 1e18 scale (1 USD = 1e18 wei equivalent)
      const priceUsd = parseFloat(ethers.formatUnits(gPriceRaw, 18));

      setOnChainStats({
        gBalance: fmtBig(gBalRaw, 18, 4),
        freeLiquidity: fmtBig(freeLiqRaw, 18, 4),
        dropsBalance: fmtBig(dropsBalRaw, 18, 0),
        gPriceWei: gPriceRaw,
        gPriceUsd: priceUsd,
        nextStakeId: Number(nextId),
        owner: ownerAddr,
        resolver: resolverAddr,
        serviceAddress: serviceAddr,
        gTokenAddress: gTokenAddr,
        dropsTokenAddress: dropsTokenAddr,
      });
    } catch (err) {
      console.error("On-chain fetch error:", err);
      toast({ title: "Failed to read on-chain stats", variant: "destructive" });
    } finally {
      setLoadingOnChain(false);
    }
  }, [getReadContract, toast]);

  useEffect(() => { fetchBalance(); }, [fetchBalance]);
  useEffect(() => {
    if (innerTab === "pools") fetchStakes();
    if (innerTab === "history") { fetchHistory(); fetchMatches(); }
    if (innerTab === "admin" && adminMode) fetchOnChainStats();
  }, [innerTab, fetchStakes, fetchHistory, fetchMatches, fetchOnChainStats, adminMode]);

  // ── Redeem preview ─────────────────────────────────────────────────────────
  useEffect(() => {
    const amt = parseFloat(redeemAmount);
    if (!redeemAmount || isNaN(amt) || amt <= 0) { setRedeemPreview(null); return; }
    const timeout = setTimeout(async () => {
      setPreviewLoading(true);
      try {
        const res = await fetch(`${BACKEND_URL}/api/drops/preview-redeem?wallet=${wallet}&drops=${amt}`);
        const data = await res.json();
        if (data.success) setRedeemPreview(data);
      } catch { /* silent */ }
      finally { setPreviewLoading(false); }
    }, 600);
    return () => clearTimeout(timeout);
  }, [redeemAmount, wallet]);

  // ── Generic contract write wrapper ─────────────────────────────────────────
  /**
   * Runs a contract write, handles wallet prompts, waits for confirmation,
   * shows toasts, and refreshes on-chain stats.
   */
  const contractWrite = useCallback(async (
    actionKey: string,
    label: string,
    txFn: (contract: ethers.Contract) => Promise<ethers.ContractTransactionResponse>,
    onSuccess?: () => void,
  ) => {
    setAdminActionLoading(actionKey);
    setLastTxHash(null);
    try {
      const contract = await getSignerContract();
      toast({ title: `⏳ Confirm "${label}" in your wallet…` });
      const tx = await txFn(contract);
      toast({ title: `📡 Transaction sent`, description: `Hash: ${shortAddr(tx.hash)}` });
      setLastTxHash(tx.hash);
      const receipt = await tx.wait();
      if (receipt && receipt.status === 1) {
        toast({ title: `✅ ${label} confirmed!`, description: `Block ${receipt.blockNumber}` });
        onSuccess?.();
        fetchOnChainStats();
      } else {
        toast({ title: `❌ Transaction reverted`, variant: "destructive" });
      }
    } catch (err: any) {
      const msg = err?.reason ?? err?.shortMessage ?? err?.message ?? "Unknown error";
      toast({ title: `❌ ${label} failed`, description: msg, variant: "destructive" });
    } finally {
      setAdminActionLoading(null);
    }
  }, [getSignerContract, toast, fetchOnChainStats]);

  // ── Admin handlers (direct contract calls) ─────────────────────────────────

  const handleDeposit = () => {
    const amt = parseFloat(depositAmount);
    if (!amt || amt <= 0) return;
    contractWrite("deposit", "Deposit $G", async (contract) => {
      // First approve $G token spend
      if (!onChainStats?.gTokenAddress) throw new Error("$G token address not loaded");
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const gToken = new ethers.Contract(onChainStats.gTokenAddress, ERC20_ABI, signer);
      const amtWei = ethers.parseUnits(depositAmount, 18);

      const allowance: bigint = await gToken.allowance(walletAddress, DROPS_REDEEM_POOL_ADDRESS);
      if (allowance < amtWei) {
        toast({ title: "⏳ Approving $G spend…" });
        const approveTx = await gToken.approve(DROPS_REDEEM_POOL_ADDRESS, amtWei);
        await approveTx.wait();
        toast({ title: "✅ Approval confirmed" });
      }
      return contract.depositG(amtWei);
    }, () => setDepositAmount(""));
  };

  const handleWithdraw = () => {
    const amt = parseFloat(withdrawAmount);
    if (!amt || amt <= 0) return;
    contractWrite("withdraw", "Withdraw $G", (contract) =>
      contract.withdrawG(ethers.parseUnits(withdrawAmount, 18)),
    () => setWithdrawAmount(""));
  };

  const handleSetGPrice = () => {
    const priceUsd = parseFloat(newGPrice);
    if (!priceUsd || priceUsd <= 0) return;
    // Contract expects price in 1e18 precision (18-decimal fixed point)
    const priceWei = ethers.parseUnits(newGPrice, 18);
    contractWrite("price", "Set $G Price", (contract) =>
      contract.setGPrice(priceWei),
    () => setNewGPrice(""));
  };

  const handleSetResolver = () => {
    if (!ethers.isAddress(newResolver)) {
      toast({ title: "Invalid address", variant: "destructive" }); return;
    }
    contractWrite("resolver", "Set Resolver", (contract) =>
      contract.setResolver(newResolver),
    () => setNewResolver(""));
  };

  const handleSetServiceAddress = () => {
    if (!ethers.isAddress(newServiceAddress)) {
      toast({ title: "Invalid address", variant: "destructive" }); return;
    }
    contractWrite("service", "Set Service Address", (contract) =>
      contract.setServiceAddress(newServiceAddress),
    () => setNewServiceAddress(""));
  };

  const handleSetDropsToken = () => {
    if (!ethers.isAddress(newDropsToken)) {
      toast({ title: "Invalid address", variant: "destructive" }); return;
    }
    contractWrite("dropsToken", "Set DROPS Token", (contract) =>
      contract.setDropsToken(newDropsToken),
    () => setNewDropsToken(""));
  };

  // ── Redeem / stake handlers ────────────────────────────────────────────────

  const handleRedeem = async () => {
    const amt = parseFloat(redeemAmount);
    if (!amt || amt <= 0) return;
    if (!redeemPreview?.sufficient) {
      toast({ title: "Insufficient reward drops", variant: "destructive" });
      return;
    }
    setRedeemLoading(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/drops/redeem`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ walletAddress: wallet, dropsAmount: amt }),
      });
      const data = await res.json();
      if (data.success) {
        toast({ title: "✅ Redeemed!", description: `${fmt(data.playerG, 4)} $G sent to your wallet.` });
        setRedeemAmount(""); setRedeemPreview(null);
        fetchBalance(); fetchStakes(); fetchHistory();
      } else {
        toast({ title: "Redeem failed", description: data.detail ?? "Unknown error", variant: "destructive" });
      }
    } catch {
      toast({ title: "Network error", variant: "destructive" });
    } finally { setRedeemLoading(false); }
  };

  const handleClaimStake = async (stakeId: string) => {
    setClaimingStake(stakeId);
    try {
      const res = await fetch(`${BACKEND_URL}/api/drops/claim-stake`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ walletAddress: wallet, stakeId }),
      });
      const data = await res.json();
      if (data.success) {
        toast({ title: "✅ Stake claimed!", description: `${fmt(data.totalG, 4)} $G (${fmt(data.earnedG, 4)} earned)` });
        fetchStakes();
      } else {
        toast({ title: "Claim failed", description: data.detail ?? "Unknown error", variant: "destructive" });
      }
    } catch {
      toast({ title: "Network error", variant: "destructive" });
    } finally { setClaimingStake(null); }
  };

  // ── Derived ────────────────────────────────────────────────────────────────
  const tierStyle = TIER_COLORS[balance?.tier ?? "Droplet"] ?? TIER_COLORS.Droplet;
  const currentTierDef = TIERS.find(t => t.name === (balance?.tier ?? "Droplet")) ?? TIERS[0];
  const nextTierDef = TIERS.find(t => t.minDuels > (balance?.totalDuels ?? 0)) ?? null;
  const progressToNext = nextTierDef
    ? Math.min(100, (((balance?.totalDuels ?? 0) - currentTierDef.minDuels) / (nextTierDef.minDuels - currentTierDef.minDuels)) * 100)
    : 100;
  const wins = matchHistory.filter(m => m.winner_address?.toLowerCase() === wallet);
  const matureUnclaimedStakes = stakes.filter(s => s.matured && !s.claimed);

  
  // ── Render ─────────────────────────────────────────────────────────────────
  if (loadingBalance) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-300">

      {/* ── Inner Tabs ──────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-1 bg-muted/50 p-1 rounded-lg overflow-x-auto">
        {tabs.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setInnerTab(key)}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all whitespace-nowrap capitalize relative
              ${key === "admin" ? "text-amber-600 dark:text-amber-400" : ""}
              ${innerTab === key
                ? key === "admin"
                  ? "bg-amber-100 dark:bg-amber-900/30 shadow text-amber-700 dark:text-amber-300"
                  : "bg-background shadow text-foreground"
                : key !== "admin" ? "text-muted-foreground hover:text-foreground" : "hover:text-amber-700 dark:hover:text-amber-300"
              }`}
          >
            {key === "admin" && <ShieldCheck className="inline h-3 w-3 mr-1 -mt-0.5" />}
            {label}
            {key === "pools" && matureUnclaimedStakes.length > 0 && (
              <span className="absolute -top-1 -right-1 bg-orange-500 text-white text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center">
                {matureUnclaimedStakes.length}
              </span>
            )}
          </button>
        ))}
        <button
          onClick={() => {
            fetchBalance();
            if (innerTab === "pools") fetchStakes();
            if (innerTab === "history") { fetchHistory(); fetchMatches(); }
            if (innerTab === "admin") fetchOnChainStats();
          }}
          className="ml-auto p-1.5 rounded-md text-muted-foreground hover:text-foreground transition-colors"
        >
          <RefreshCw className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* ════════════════════════════════════════════════════════════════════
          OVERVIEW
      ════════════════════════════════════════════════════════════════════ */}
      {innerTab === "overview" && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Card className="border-primary/20 bg-primary/5">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Zap className="h-4 w-4 text-primary" />
                  <span className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Game DROPS</span>
                </div>
                <p className="text-2xl font-black text-foreground">{fmt(balance?.gameDrops ?? 0, 0)}</p>
                <p className="text-xs text-muted-foreground mt-0.5">Used for staking</p>
              </CardContent>
            </Card>
            <Card className="border-orange-200 dark:border-orange-800/50 bg-orange-50 dark:bg-orange-950/20">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Trophy className="h-4 w-4 text-orange-500" />
                  <span className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Reward DROPS</span>
                </div>
                <p className="text-2xl font-black text-foreground">{fmt(balance?.rewardDrops ?? 0, 0)}</p>
                <p className="text-xs text-muted-foreground mt-0.5">Redeemable for $G</p>
              </CardContent>
            </Card>
          </div>

          {balance && (
            <Card className={`border ${tierStyle.border} ${tierStyle.bg}`}>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Flame className={`h-4 w-4 ${tierStyle.text}`} />
                    <span className="font-black text-foreground">{balance.tier} Tier</span>
                    {adminMode && (
                      <Badge className="bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-700 font-bold text-[10px] py-0 h-4">
                        <ShieldCheck className="h-2.5 w-2.5 mr-0.5" /> Admin
                      </Badge>
                    )}
                  </div>
                  <Badge className={`${tierStyle.bg} ${tierStyle.text} ${tierStyle.border} border font-bold text-xs`}>
                    {balance.apyPct}% APY
                  </Badge>
                </div>
                {nextTierDef && (
                  <div>
                    <div className="flex justify-between text-xs text-muted-foreground mb-1">
                      <span>{balance.totalDuels} duels</span>
                      <span>{nextTierDef.minDuels} → {nextTierDef.name}</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-700 ${tierStyle.text.replace("text-", "bg-")}`}
                        style={{ width: `${progressToNext}%` }}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {nextTierDef.minDuels - balance.totalDuels} more duels to unlock {nextTierDef.name} ({nextTierDef.apy}% APY)
                    </p>
                  </div>
                )}
                {!nextTierDef && (
                  <p className="text-xs text-muted-foreground">🌊 You've reached the highest tier!</p>
                )}
              </CardContent>
            </Card>
          )}

          {balance && (
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: "Total Duels", value: balance.totalDuels, icon: BarChart3 },
                { label: "Rematch Badge", value: balance.rematchBadge ? "✅" : `${balance.gamesUntilBadge} left`, icon: Trophy },
                { label: "Max Stake", value: balance.maxStake ? `${balance.maxStake} DROPS` : "Unlimited", icon: Coins },
              ].map(({ label, value, icon: Icon }) => (
                <div key={label} className="bg-muted/40 rounded-xl p-3 border border-border text-center">
                  <Icon className="h-4 w-4 text-muted-foreground mx-auto mb-1" />
                  <p className="font-black text-sm text-foreground">{value}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{label}</p>
                </div>
              ))}
            </div>
          )}

          <div className="flex gap-3">
            <Button className="flex-1" variant="default" onClick={() => setInnerTab("redeem")} disabled={!balance || balance.rewardDrops <= 0}>
              <ArrowDownToLine className="h-4 w-4 mr-2" /> Redeem DROPS
            </Button>
            <Button className="flex-1" variant="outline" onClick={() => setInnerTab("pools")}>
              <TrendingUp className="h-4 w-4 mr-2" /> View Pools
            </Button>
          </div>

          {adminMode && (
            <Button
              variant="outline"
              className="w-full border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-900/20"
              onClick={() => setInnerTab("admin")}
            >
              <ShieldCheck className="h-4 w-4 mr-2" /> Open Admin Panel
            </Button>
          )}

          {balance && !balance.rematchBadge && (
            <div className="flex items-start gap-3 p-3 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/50">
              <AlertCircle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-bold text-amber-700 dark:text-amber-400">Pre-Badge Restrictions</p>
                <p className="text-xs text-amber-600 dark:text-amber-500 mt-0.5">
                  Play {balance.gamesUntilBadge} more game{balance.gamesUntilBadge !== 1 ? "s" : ""} to unlock the Rematch Badge.
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════
          REDEEM
      ════════════════════════════════════════════════════════════════════ */}
      {innerTab === "redeem" && (
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <ArrowDownToLine className="h-4 w-4 text-primary" />
                Redeem Reward DROPS → $G
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-3 rounded-xl bg-muted/40 border border-border">
                <span className="text-sm text-muted-foreground font-medium">Available to redeem</span>
                <span className="font-black text-foreground">{fmt(balance?.rewardDrops ?? 0, 0)} DROPS</span>
              </div>

              {balance && !balance.rematchBadge && (
                <div className="flex items-center gap-2 p-3 rounded-xl bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800/50">
                  <Lock className="h-4 w-4 text-red-500 shrink-0" />
                  <p className="text-xs text-red-600 dark:text-red-400">
                    Play 10 games before redeeming. {balance.gamesUntilBadge} remaining.
                  </p>
                </div>
              )}

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Amount to Redeem</Label>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    value={redeemAmount}
                    onChange={e => setRedeemAmount(e.target.value)}
                    placeholder="0"
                    min={1}
                    className="flex-1 font-mono font-bold text-lg h-12"
                    disabled={!balance?.rematchBadge}
                  />
                  <Button
                    variant="outline" size="sm"
                    className="h-12 px-3 text-xs font-bold"
                    onClick={() => setRedeemAmount(String(Math.floor(balance?.rewardDrops ?? 0)))}
                    disabled={!balance?.rematchBadge}
                  >
                    MAX
                  </Button>
                </div>
              </div>

              <div className="flex gap-2">
                {[10, 25, 50, 100].filter(v => (balance?.rewardDrops ?? 0) >= v).map(v => (
                  <button
                    key={v} onClick={() => setRedeemAmount(String(v))}
                    disabled={!balance?.rematchBadge}
                    className={`flex-1 py-2 rounded-xl border text-xs font-bold transition-all ${parseFloat(redeemAmount) === v ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/40"} disabled:opacity-40`}
                  >
                    {v}
                  </button>
                ))}
              </div>

              {previewLoading && (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                </div>
              )}
              {redeemPreview && !previewLoading && (
                <div className="rounded-xl border border-border bg-muted/30 p-4 space-y-2">
                  <p className="text-xs font-black text-muted-foreground uppercase tracking-wide mb-3">Breakdown</p>
                  {[
                    { label: "You receive", value: `${fmt(redeemPreview.playerG, 4)} $G`, highlight: true },
                    { label: "Fee (10%)", value: `${fmt(redeemPreview.feeG, 4)} $G` },
                    { label: `Staked (${redeemPreview.apyPct}% APY, 30d)`, value: `${fmt(redeemPreview.stakedG, 4)} $G` },
                    { label: "Projected stake yield", value: `+${fmt(redeemPreview.stakeEarnedG, 4)} $G` },
                    { label: "$G price", value: `$${fmt(redeemPreview.gPriceUsd, 4)}` },
                  ].map(({ label, value, highlight }) => (
                    <div key={label} className="flex justify-between items-center">
                      <span className="text-xs text-muted-foreground">{label}</span>
                      <span className={`text-xs font-bold ${highlight ? "text-primary" : "text-foreground"}`}>{value}</span>
                    </div>
                  ))}
                  {!redeemPreview.sufficient && (
                    <p className="text-xs text-red-500 font-bold pt-1">Insufficient reward drops.</p>
                  )}
                </div>
              )}

              <Button
                className="w-full"
                onClick={handleRedeem}
                disabled={redeemLoading || !redeemPreview || !redeemPreview.sufficient || !balance?.rematchBadge}
              >
                {redeemLoading
                  ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Redeeming…</>
                  : <><ArrowDownToLine className="h-4 w-4 mr-2" /> Redeem {redeemAmount || "0"} DROPS</>
                }
              </Button>

              <p className="text-[10px] text-center text-muted-foreground">
                Reward DROPS are burned; $G is sent to your wallet. 30-day stake vests on Celo.
              </p>
            </CardContent>
          </Card>
        </div>
      )}
      {/* ════════════════════════════════════════════════════════════════════
              BUY DROPS — send $G, receive DROPS minted to your wallet
          ════════════════════════════════════════════════════════════════════ */}
        {innerTab === "buy" && (
  <div className="space-y-4">
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <ShoppingCart className="h-4 w-4 text-primary" />
          Buy DROPS with $G
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">

        {/* ── Step indicator ── */}
        <div className="flex items-center gap-2">
          {(["input", "deposit", "processing", "done"] as const).map((s, i) => (
            <React.Fragment key={s}>
              <div className={`flex items-center gap-1.5 text-xs font-bold transition-colors
                ${buyStep === s ? "text-primary" : 
                  ["input","deposit","processing","done"].indexOf(buyStep) > i 
                    ? "text-muted-foreground" 
                    : "text-muted-foreground/40"}`}
              >
                <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black border-2 transition-all
                  ${buyStep === s 
                    ? "border-primary bg-primary text-primary-foreground" 
                    : ["input","deposit","processing","done"].indexOf(buyStep) > i
                      ? "border-muted-foreground bg-muted-foreground text-background"
                      : "border-muted-foreground/30 text-muted-foreground/40"}`}
                >
                  {["input","deposit","processing","done"].indexOf(buyStep) > i 
                    ? <CheckCircle2 className="h-3 w-3" /> 
                    : i + 1}
                </div>
                <span className="hidden sm:inline capitalize">{s === "processing" ? "Minting" : s}</span>
              </div>
              {i < 3 && <div className={`flex-1 h-px transition-colors ${["input","deposit","processing","done"].indexOf(buyStep) > i ? "bg-muted-foreground" : "bg-muted-foreground/20"}`} />}
            </React.Fragment>
          ))}
        </div>

        {/* ══════════════════════════════
            STEP 1 — Enter DROPS amount
        ══════════════════════════════ */}
        {buyStep === "input" && (
          <div className="space-y-4">
            {/* Rate card */}
<div className="p-3 rounded-xl bg-muted/40 border border-border space-y-2">
  <div className="flex items-center justify-between">
    <p className="text-xs font-bold text-foreground">Live $G Rate</p>
    <button
      onClick={fetchGoodDollarPrice}
      disabled={gPriceLoading}
      className="flex items-center gap-1 text-[10px] text-primary hover:opacity-70 transition-opacity"
    >
      <RefreshCw className={`h-3 w-3 ${gPriceLoading ? "animate-spin" : ""}`} />
      Refresh
    </button>
  </div>

  {gPriceLoading ? (
    <div className="flex items-center gap-2">
      <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
      <span className="text-xs text-muted-foreground">Fetching price…</span>
    </div>
  ) : gPriceError ? (
    <div className="flex items-center gap-2">
      <AlertCircle className="h-3.5 w-3.5 text-destructive" />
      <span className="text-xs text-destructive">{gPriceError}</span>
    </div>
  ) : gPriceUsd ? (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">1 $G</span>
        <span className="text-xs font-black text-foreground">${gPriceUsd.toFixed(6)} USD</span>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">100 DROPS</span>
        <span className="text-xs font-black text-foreground">$1.00 USD</span>
      </div>
      {gPriceFetchedAt && (
        <p className="text-[10px] text-muted-foreground/60 pt-0.5">
          Updated {Math.floor((Date.now() - gPriceFetchedAt) / 1000)}s ago · CoinGecko
        </p>
      )}
    </div>
  ) : null}
</div>

{/* Input */}
<div className="space-y-1.5">
  <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wide">
    DROPS to Buy
  </Label>
  <Input
    type="number"
    value={dropsToBuy}
    onChange={e => setDropsToBuy(e.target.value)}
    placeholder="e.g. 100"
    min="10"
    step="10"
    className="font-mono font-bold text-lg h-12"
  />
  {/* ← was onChainStats?.gPriceUsd, now gPriceUsd */}
  {dropsToBuy && parseFloat(dropsToBuy) > 0 && gPriceUsd && (
    <p className="text-xs text-muted-foreground pl-1">
      ≈ <strong className="text-foreground">
        {((parseFloat(dropsToBuy) / 100) / gPriceUsd).toFixed(4)} $G
      </strong> required
      {" · "}
      <span className="text-muted-foreground/60">
        ${(parseFloat(dropsToBuy) / 100).toFixed(2)} USD
      </span>
    </p>
  )}
</div>

{/* Quick picks — also was onChainStats?.gPriceUsd */}
<div className="flex gap-2">
  {[100, 500, 1000, 5000].map(v => (
    <button
      key={v}
      onClick={() => setDropsToBuy(String(v))}
      className={`flex-1 py-2 rounded-xl border text-xs font-bold transition-all
        ${parseFloat(dropsToBuy) === v
          ? "border-primary bg-primary/10 text-primary"
          : "border-border text-muted-foreground hover:border-primary/40"}`}
    >
      <span className="block">{v >= 1000 ? `${v / 1000}k` : v}</span>
      {gPriceUsd && (
        <span className="block text-[9px] font-normal text-muted-foreground/70 mt-0.5">
          {((v / 100) / gPriceUsd).toFixed(2)} $G
        </span>
      )}
    </button>
  ))}
</div>

<Button
  className="w-full"
  onClick={handleCalculate}
  
  disabled={!dropsToBuy || parseFloat(dropsToBuy) < 10 || gPriceLoading || !gPriceUsd}
>
  {gPriceLoading
    ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Fetching Price…</>
    : <><Coins className="h-4 w-4 mr-2" /> Calculate Cost & Continue</>
  }
</Button>

          </div>
        )}

        {/* ══════════════════════════════
            STEP 2 — Send $G to pool
        ══════════════════════════════ */}
        {/* STEP 2 — Confirm & send $G automatically */}
{buyStep === "deposit" && gCostDisplay !== null && (
  <div className="space-y-4">
    {/* Summary box */}
    <div className="rounded-xl border-2 border-primary/30 bg-primary/5 p-4 space-y-3">
      <p className="text-xs font-black text-muted-foreground uppercase tracking-wide">Order Summary</p>
      <div className="flex justify-between items-center">
        <span className="text-sm text-muted-foreground">You get</span>
        <span className="text-xl font-black text-foreground">
          {parseFloat(dropsToBuy).toLocaleString()} DROPS
        </span>
      </div>
      <div className="h-px bg-border" />
      <div className="flex justify-between items-center">
        <span className="text-sm text-muted-foreground">You send</span>
        <span className="text-xl font-black text-primary">{gCostDisplay.toFixed(6)} $G</span>
      </div>
    </div>

    <div className="flex items-start gap-2 p-3 rounded-xl bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800/50">
      <Wallet className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
      <p className="text-xs text-blue-700 dark:text-blue-400">
        Clicking below will prompt your wallet to transfer{" "}
        <strong>{gCostDisplay.toFixed(6)} $G</strong> to the pool on Celo.
        DROPS are minted automatically once the transfer confirms.
      </p>
    </div>

    <div className="flex gap-2">
      <Button variant="outline" className="flex-1" onClick={handleBuyReset} disabled={buyLoading}>
        Back
      </Button>
      <Button className="flex-1" onClick={handleConfirmDeposit} disabled={buyLoading}>
        {buyLoading
          ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Processing…</>
          : <><Zap className="h-4 w-4 mr-2" /> Send $G &amp; Mint DROPS</>
        }
      </Button>
    </div>
    <p className="text-[10px] text-center text-muted-foreground">
      You'll sign one transaction. DROPS are minted to your wallet automatically after.
    </p>
  </div>
)}

        {/* ══════════════════════════════
            STEP 3 — Processing
        ══════════════════════════════ */}
        {buyStep === "processing" && (
          <div className="flex flex-col items-center gap-4 py-8 text-center">
            <div className="w-14 h-14 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
            <div>
              <p className="font-black text-foreground">Verifying deposit…</p>
              <p className="text-xs text-muted-foreground mt-1">
                Checking on-chain for your $G transfer and minting {parseFloat(dropsToBuy).toLocaleString()} DROPS
              </p>
            </div>
          </div>
        )}

        {/* ══════════════════════════════
            STEP 4 — Done
        ══════════════════════════════ */}
        {buyStep === "done" && buyResult && (
          <div className="space-y-4">
            <div className="rounded-xl border border-green-200 dark:border-green-800/50 bg-green-50/50 dark:bg-green-950/10 p-5 space-y-3 text-center">
              <CheckCircle2 className="h-10 w-10 text-green-500 mx-auto" />
              <div>
                <p className="text-lg font-black text-green-700 dark:text-green-400">
                  {buyResult.dropsAmount.toLocaleString()} DROPS minted!
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Landed in your wallet on Celo
                </p>
              </div>
              <a
                href={`https://celoscan.io/tx/${buyResult.mintTxHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-1.5 text-[11px] font-mono text-muted-foreground hover:text-primary"
              >
                <ExternalLink className="h-3 w-3" />
                {shortAddr(buyResult.mintTxHash)}
              </a>
            </div>
            <Button variant="outline" className="w-full" onClick={handleBuyReset}>
              Buy More DROPS
            </Button>
          </div>
        )}

      </CardContent>
    </Card>
  </div>
)}
      {/* ════════════════════════════════════════════════════════════════════
          POOLS
      ════════════════════════════════════════════════════════════════════ */}
      {innerTab === "pools" && (
        <div className="space-y-3">
          {loadingStakes ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : stakes.length === 0 ? (
            <div className="text-center py-12 border border-dashed rounded-xl text-muted-foreground">
              <TrendingUp className="h-8 w-8 mx-auto mb-3 opacity-30" />
              <p className="text-sm font-medium">No stake pools yet</p>
              <p className="text-xs mt-1">Redeem reward DROPS to create your first pool.</p>
            </div>
          ) : (
            <>
              {matureUnclaimedStakes.length > 0 && (
                <div className="flex items-center gap-2 p-3 rounded-xl bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800/50">
                  <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                  <p className="text-xs text-green-700 dark:text-green-400 font-medium">
                    {matureUnclaimedStakes.length} stake{matureUnclaimedStakes.length > 1 ? "s" : ""} ready to claim!
                  </p>
                </div>
              )}
              {stakes.map(stake => {
                const isMature = stake.matured || new Date(stake.matures_at) <= new Date();
                const isClaiming = claimingStake === stake.id;
                return (
                  <Card key={stake.id} className={`${isMature && !stake.claimed ? "border-green-300 dark:border-green-700 bg-green-50/50 dark:bg-green-950/10" : ""}`}>
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {isMature && !stake.claimed ? <Unlock className="h-4 w-4 text-green-500" />
                            : stake.claimed ? <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
                            : <Lock className="h-4 w-4 text-muted-foreground" />}
                          <span className="text-sm font-bold text-foreground">{fmt(stake.drops_staked, 0)} DROPS staked</span>
                        </div>
                        <Badge variant={stake.claimed ? "secondary" : isMature ? "default" : "outline"} className="text-xs">
                          {stake.claimed ? "Claimed" : isMature ? "Ready" : timeUntil(stake.matures_at)}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-center">
                        {[
                          { label: "Value", val: `$${fmt(stake.g_value_usd, 2)}` },
                          { label: "APY",   val: `${stake.apy_pct}%`, accent: true },
                          { label: "Earned", val: stake.g_earned != null ? `${fmt(stake.g_earned, 4)} $G` : "—", green: true },
                        ].map(({ label, val, accent, green }) => (
                          <div key={label} className="bg-muted/40 rounded-lg p-2">
                            <p className="text-xs text-muted-foreground">{label}</p>
                            <p className={`text-sm font-black ${accent ? "text-primary" : green ? "text-green-600 dark:text-green-400" : ""}`}>{val}</p>
                          </div>
                        ))}
                      </div>
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Staked {timeAgo(stake.staked_at)}</span>
                        <span>Matures {timeUntil(stake.matures_at)}</span>
                      </div>
                      {isMature && !stake.claimed && (
                        <Button className="w-full" size="sm" onClick={() => handleClaimStake(stake.id)} disabled={isClaiming}>
                          {isClaiming
                            ? <><Loader2 className="h-3 w-3 mr-2 animate-spin" /> Claiming…</>
                            : <><ArrowUpFromLine className="h-3 w-3 mr-2" /> Claim $G</>
                          }
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </>
          )}
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════
          HISTORY
      ════════════════════════════════════════════════════════════════════ */}
      {innerTab === "history" && (
        <div className="space-y-4">
          {matchHistory.length > 0 && (
            <div className="grid grid-cols-4 gap-2">
              {[
                { label: "Played", val: matchHistory.length },
                { label: "Won",    val: wins.length },
                { label: "Lost",   val: matchHistory.length - wins.length },
                { label: "Win%",   val: `${matchHistory.length > 0 ? Math.round((wins.length / matchHistory.length) * 100) : 0}%` },
              ].map(s => (
                <div key={s.label} className="bg-muted/40 border border-border rounded-xl p-2 text-center">
                  <p className="font-black text-base text-foreground">{s.val}</p>
                  <p className="text-[10px] text-muted-foreground font-semibold">{s.label}</p>
                </div>
              ))}
            </div>
          )}

          <div>
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-2">Recent Matches</p>
            {loadingMatches ? (
              <div className="flex items-center justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
            ) : matchHistory.length === 0 ? (
              <div className="text-center py-8 border border-dashed rounded-xl text-muted-foreground">
                <p className="text-sm">No matches played yet.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {matchHistory.map(m => {
                  const isWin = m.winner_address?.toLowerCase() === wallet;
                  const isTie = m.status === "finished" && !m.winner_address;
                  return (
                    <div key={m.code} className={`flex items-center gap-3 p-3 rounded-xl border ${isWin ? "border-green-200 dark:border-green-800/50 bg-green-50/50 dark:bg-green-950/10" : isTie ? "border-amber-200 dark:border-amber-800/50 bg-amber-50/50 dark:bg-amber-950/10" : "border-border bg-muted/20"}`}>
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-sm font-black ${isWin ? "bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400" : isTie ? "bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400" : "bg-muted text-muted-foreground"}`}>
                        {isWin ? "W" : isTie ? "T" : "L"}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-foreground truncate">{m.topic}</p>
                        <p className="text-[10px] text-muted-foreground font-mono">#{m.code}{m.finished_at ? ` · ${timeAgo(m.finished_at)}` : ""}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className={`text-xs font-black ${isWin ? "text-green-600 dark:text-green-400" : "text-muted-foreground"}`}>
                          {isWin ? `+${m.stake_amount * 2}` : isTie ? `±${m.stake_amount}` : `-${m.stake_amount}`}
                        </p>
                        <p className="text-[10px] text-muted-foreground">{m.token_symbol}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div>
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-2">Redeem History</p>
            {loadingHistory ? (
              <div className="flex items-center justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
            ) : history.length === 0 ? (
              <div className="text-center py-6 border border-dashed rounded-xl text-muted-foreground">
                <p className="text-xs">No redemptions yet.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {history.map(h => (
                  <div key={h.id} className="flex items-center gap-3 p-3 rounded-xl border border-border bg-muted/20">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <Coins className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-foreground">{fmt(h.drops_burned, 0)} DROPS burned</p>
                      <p className="text-[10px] text-muted-foreground">{timeAgo(h.created_at)}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs font-black text-primary">+{fmt(h.player_g, 4)} $G</p>
                      {h.tx_hash && (
                        <a
                          href={celoScanTx(h.tx_hash)}
                          target="_blank" rel="noopener noreferrer"
                          className="text-[10px] text-muted-foreground hover:text-primary flex items-center gap-0.5 justify-end"
                        >
                          <Hash className="h-2.5 w-2.5" />{shortAddr(h.tx_hash)}
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
        
      {/* ════════════════════════════════════════════════════════════════════
          ADMIN — direct on-chain writes via connected wallet
      ════════════════════════════════════════════════════════════════════ */}
      {innerTab === "admin" && adminMode && (
        <div className="space-y-4">

          {/* Identity banner */}
          <div className="flex items-center gap-3 p-3 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-300 dark:border-amber-700">
            <ShieldCheck className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-black text-amber-700 dark:text-amber-300">Admin · On-Chain Mode</p>
              <p className="text-[10px] text-amber-600 dark:text-amber-500 font-mono truncate">{walletAddress}</p>
            </div>
            <a
              href={`https://celoscan.io/address/${DROPS_REDEEM_POOL_ADDRESS}`}
              target="_blank" rel="noopener noreferrer"
              className="text-[10px] text-amber-600 dark:text-amber-400 hover:text-amber-800 dark:hover:text-amber-200 flex items-center gap-1 shrink-0"
            >
              <ExternalLink className="h-3 w-3" /> Contract
            </a>
          </div>

          {/* Last tx hash */}
          {lastTxHash && (
            <a
              href={celoScanTx(lastTxHash)}
              target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-2 p-2.5 rounded-xl bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800/50 text-xs text-green-700 dark:text-green-400 hover:underline"
            >
              <Hash className="h-3.5 w-3.5 shrink-0" />
              <span className="font-mono truncate">{lastTxHash}</span>
              <ExternalLink className="h-3 w-3 shrink-0 ml-auto" />
            </a>
          )}

          {/* On-chain pool stats */}
          <Card className="border-amber-200 dark:border-amber-800/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2 text-amber-700 dark:text-amber-300">
                <Activity className="h-4 w-4" /> On-Chain Pool Stats
                <button onClick={fetchOnChainStats} className="ml-auto p-1 rounded hover:bg-amber-100 dark:hover:bg-amber-900/30 transition-colors">
                  <RefreshCw className={`h-3 w-3 ${loadingOnChain ? "animate-spin" : ""}`} />
                </button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loadingOnChain ? (
                <div className="flex items-center justify-center py-6">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : onChainStats ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { label: "$G Balance",     value: `${onChainStats.gBalance} $G`,       icon: DollarSign  },
                      { label: "Free Liquidity", value: `${onChainStats.freeLiquidity} $G`,  icon: Unlock      },
                      { label: "DROPS in Pool",  value: onChainStats.dropsBalance,            icon: Droplets    },
                      { label: "Total Stakes",   value: String(onChainStats.nextStakeId - 1), icon: TrendingUp  },
                      { label: "$G Price (USD)", value: `$${onChainStats.gPriceUsd.toFixed(6)}`, icon: BarChart3 },
                      { label: "Stake IDs",      value: `0 – ${onChainStats.nextStakeId - 1}`,  icon: Coins     },
                    ].map(({ label, value, icon: Icon }) => (
                      <div key={label} className="bg-muted/40 rounded-xl p-3 border border-border">
                        <div className="flex items-center gap-1.5 mb-1">
                          <Icon className="h-3 w-3 text-muted-foreground" />
                          <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wide">{label}</p>
                        </div>
                        <p className="text-sm font-black text-foreground">{value}</p>
                      </div>
                    ))}
                  </div>
                  {/* Contract roles */}
                  <div className="space-y-1.5 pt-1">
                    {[
                      { label: "Owner",           addr: onChainStats.owner           },
                      { label: "Resolver",         addr: onChainStats.resolver        },
                      { label: "Service Address",  addr: onChainStats.serviceAddress  },
                      { label: "$G Token",         addr: onChainStats.gTokenAddress   },
                      { label: "DROPS Token",      addr: onChainStats.dropsTokenAddress },
                    ].map(({ label, addr }) => (
                      <div key={label} className="flex items-center justify-between text-[11px] py-1 border-b border-border/50 last:border-0">
                        <span className="text-muted-foreground font-semibold">{label}</span>
                        <a
                          href={`https://celoscan.io/address/${addr}`}
                          target="_blank" rel="noopener noreferrer"
                          className="font-mono text-foreground hover:text-primary flex items-center gap-1"
                        >
                          {shortAddr(addr)} <ExternalLink className="h-2.5 w-2.5" />
                        </a>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground text-center py-4">Failed to load — check RPC connection.</p>
              )}
            </CardContent>
          </Card>

          {/* ── Deposit $G ────────────────────────────────────────────────── */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <ArrowDownToLine className="h-4 w-4 text-green-500" /> Deposit $G into Pool
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-xs text-muted-foreground">
                Approves and calls <code className="font-mono text-[10px] bg-muted px-1 rounded">depositG(amount)</code> on the contract.
                Your wallet must hold enough $G and will be prompted to approve the spend first.
              </p>
              <div className="flex gap-2">
                <Input
                  type="number"
                  value={depositAmount}
                  onChange={e => setDepositAmount(e.target.value)}
                  placeholder="Amount in $G"
                  className="flex-1 font-mono font-bold h-10"
                />
                <Button
                  size="sm"
                  className="h-10 bg-green-600 hover:bg-green-700 text-white px-4 min-w-[100px]"
                  disabled={!depositAmount || parseFloat(depositAmount) <= 0 || !!adminActionLoading}
                  onClick={handleDeposit}
                >
                  {adminActionLoading === "deposit"
                    ? <Loader2 className="h-4 w-4 animate-spin" />
                    : <><ArrowDownToLine className="h-3.5 w-3.5 mr-1.5" /> Deposit</>
                  }
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* ── Withdraw $G ───────────────────────────────────────────────── */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <ArrowUpFromLine className="h-4 w-4 text-red-500" /> Withdraw $G from Pool
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-xs text-muted-foreground">
                Calls <code className="font-mono text-[10px] bg-muted px-1 rounded">withdrawG(amount)</code>. Only free liquidity (not locked stake backing) can be withdrawn.
              </p>
              {onChainStats && (
                <div className="flex items-center justify-between p-2 rounded-lg bg-muted/40 border border-border">
                  <span className="text-xs text-muted-foreground">Max withdrawable</span>
                  <span className="text-xs font-black text-foreground">{onChainStats.freeLiquidity} $G</span>
                </div>
              )}
              <div className="flex gap-2">
                <Input
                  type="number"
                  value={withdrawAmount}
                  onChange={e => setWithdrawAmount(e.target.value)}
                  placeholder="Amount in $G"
                  className="flex-1 font-mono font-bold h-10"
                />
                <Button
                  variant="outline" size="sm"
                  className="h-10 border-red-300 dark:border-red-700 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 px-4 min-w-[100px]"
                  disabled={!withdrawAmount || parseFloat(withdrawAmount) <= 0 || !!adminActionLoading}
                  onClick={handleWithdraw}
                >
                  {adminActionLoading === "withdraw"
                    ? <Loader2 className="h-4 w-4 animate-spin" />
                    : <><ArrowUpFromLine className="h-3.5 w-3.5 mr-1.5" /> Withdraw</>
                  }
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* ── Set $G Price ──────────────────────────────────────────────── */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-blue-500" /> Update $G Price
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-xs text-muted-foreground">
                Calls <code className="font-mono text-[10px] bg-muted px-1 rounded">setGPrice(priceWei)</code>.
                Enter the price in USD — it will be converted to 1e18 wei-precision before sending.
              </p>
              {onChainStats && (
                <div className="flex items-center justify-between p-2 rounded-lg bg-muted/40 border border-border">
                  <span className="text-xs text-muted-foreground">Current price</span>
                  <span className="text-xs font-black text-foreground">${onChainStats.gPriceUsd.toFixed(6)}</span>
                </div>
              )}
              <div className="flex gap-2">
                <Input
                  type="number"
                  value={newGPrice}
                  onChange={e => setNewGPrice(e.target.value)}
                  placeholder="New price in USD (e.g. 0.001)"
                  step="0.000001"
                  className="flex-1 font-mono font-bold h-10"
                />
                <Button
                  size="sm" variant="outline"
                  className="h-10 px-4 min-w-[90px]"
                  disabled={!newGPrice || parseFloat(newGPrice) <= 0 || !!adminActionLoading}
                  onClick={handleSetGPrice}
                >
                  {adminActionLoading === "price"
                    ? <Loader2 className="h-4 w-4 animate-spin" />
                    : "Set Price"
                  }
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* ── Contract Config ───────────────────────────────────────────── */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Settings2 className="h-4 w-4 text-purple-500" /> Contract Config
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">

              {/* Resolver */}
              <div className="space-y-2">
                <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Resolver Address</Label>
                <p className="text-[10px] text-muted-foreground">
                  Calls <code className="font-mono bg-muted px-1 rounded">setResolver(address)</code>. The backend wallet allowed to call resolver-gated functions.
                </p>
                <div className="flex gap-2">
                  <Input
                    value={newResolver}
                    onChange={e => setNewResolver(e.target.value)}
                    placeholder="0x…"
                    className="flex-1 font-mono text-xs h-10"
                  />
                  <Button
                    size="sm" variant="outline"
                    className="h-10 px-4 min-w-[90px]"
                    disabled={!newResolver || !!adminActionLoading}
                    onClick={handleSetResolver}
                  >
                    {adminActionLoading === "resolver" ? <Loader2 className="h-4 w-4 animate-spin" /> : "Update"}
                  </Button>
                </div>
              </div>

              {/* Service Address */}
              <div className="space-y-2">
                <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Service (Fee) Address</Label>
                <p className="text-[10px] text-muted-foreground">
                  Calls <code className="font-mono bg-muted px-1 rounded">setServiceAddress(address)</code>. Receives the 10% fee on every redemption.
                </p>
                <div className="flex gap-2">
                  <Input
                    value={newServiceAddress}
                    onChange={e => setNewServiceAddress(e.target.value)}
                    placeholder="0x…"
                    className="flex-1 font-mono text-xs h-10"
                  />
                  <Button
                    size="sm" variant="outline"
                    className="h-10 px-4 min-w-[90px]"
                    disabled={!newServiceAddress || !!adminActionLoading}
                    onClick={handleSetServiceAddress}
                  >
                    {adminActionLoading === "service" ? <Loader2 className="h-4 w-4 animate-spin" /> : "Update"}
                  </Button>
                </div>
              </div>

              {/* DROPS Token */}
              <div className="space-y-2">
                <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wide">DROPS Token Address</Label>
                <p className="text-[10px] text-muted-foreground">
                  Calls <code className="font-mono bg-muted px-1 rounded">setDropsToken(address)</code>. Updates the DROPS ERC20 contract reference.
                </p>
                <div className="flex gap-2">
                  <Input
                    value={newDropsToken}
                    onChange={e => setNewDropsToken(e.target.value)}
                    placeholder="0x…"
                    className="flex-1 font-mono text-xs h-10"
                  />
                  <Button
                    size="sm" variant="outline"
                    className="h-10 px-4 min-w-[90px]"
                    disabled={!newDropsToken || !!adminActionLoading}
                    onClick={handleSetDropsToken}
                  >
                    {adminActionLoading === "dropsToken" ? <Loader2 className="h-4 w-4 animate-spin" /> : "Update"}
                  </Button>
                </div>
              </div>

            </CardContent>
          </Card>

          {/* Contract address info */}
          <div className="rounded-xl border border-dashed border-muted-foreground/30 p-4 space-y-2">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
              <Wallet className="h-3.5 w-3.5" /> Contract
            </p>
            <a
              href={`https://celoscan.io/address/${DROPS_REDEEM_POOL_ADDRESS}`}
              target="_blank" rel="noopener noreferrer"
              className="font-mono text-xs text-foreground hover:text-primary flex items-center gap-1.5 break-all"
            >
              {DROPS_REDEEM_POOL_ADDRESS} <ExternalLink className="h-3 w-3 shrink-0" />
            </a>
            <p className="text-[10px] text-muted-foreground">
              All admin actions are signed by your connected wallet and sent directly to the contract on Celo Mainnet.
              The page will prompt you to switch networks if needed.
            </p>
          </div>

        </div>
      )}
    </div>
  );
}