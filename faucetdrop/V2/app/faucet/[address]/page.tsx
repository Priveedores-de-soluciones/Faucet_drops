"use client"

import type React from "react"
import { useEffect, useState, useCallback } from "react"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import { toast } from "sonner"
import { useWallet } from "@/hooks/use-wallet"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Header } from "@/components/header"
import { isWhitelisted, getAllAdmins } from "@/lib/faucet"
import { formatUnits, type BrowserProvider, JsonRpcProvider } from "ethers"
import { Checkbox } from "@/components/ui/checkbox"
import { claimViaBackend, claimNoCodeViaBackend, claimCustomViaBackend } from "@/lib/backend-service"
import { useNetwork } from "@/hooks/use-network"
import LoadingPage from "@/components/loading"
import FaucetAdminView from "@/components/faucetView/FaucetAdminView"
import FaucetUserView from "@/components/faucetView/FaucetUserView"
import {
  Dialog, DialogContent, DialogDescription,
  DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import {
  resolveFaucetParam, getFaucetByAddress,
  type FaucetDetailRow, buildFaucetSlug,
} from "@/lib/faucet-slug"

// ── Solana imports ──────────────────────────────────────────────────────────
import { useSolanaWallet } from "@/hooks/use-solana"
import { SOLANA_CHAIN_ID } from "@/hooks/use-network"
import {
  getFaucetClaimStatus,
  getWhitelistEntry,
  isFaucetAdmin,
  getFaucetState,
  type FaucetStateData,
} from "@/lib/solana"
import { createSolanaConnection, withFallback, isSolanaAddress } from "@/lib/solana-connection"
import { PublicKey } from "@solana/web3.js"

// ── Constants ────────────────────────────────────────────────────────────────

type FaucetType = "dropcode" | "droplist" | "custom"

interface SocialMediaLink {
  platform: string
  url: string
  handle: string
  action: string
}

const DEFAULT_FAUCET_IMAGE = "/default.jpeg"
const FACTORY_OWNER_ADDRESS = "0x9fBC2A0de6e5C5Fd96e8D11541608f5F328C0785"
const FIXED_TWEET_PREFIX = "I just dripped {amount} {token} from @FaucetDrops on {network}."
const DEFAULT_X_POST_TEMPLATE = "Drip created by {@yourhandle} for {#the_hashtag}."
const CONSTANT_X_POST = "I just dripped {amount} {token} from @FaucetDrops on {network}.Verify Drop 💧: {explorer}"

// ── Helpers ──────────────────────────────────────────────────────────────────

const getDefaultFaucetDescription = (networkName: string, ownerAddress: string) =>
  `This is a faucet on ${networkName} by ${ownerAddress.slice(0, 6)}...${ownerAddress.slice(-4)}`

function rowToFaucetDetails(row: FaucetDetailRow) {
  return {
    name: row.faucet_name,
    owner: row.owner_address,
    token: row.token_address,
    tokenSymbol: row.token_symbol,
    tokenDecimals: row.token_decimals,
    isEther: row.is_ether,
    balance: BigInt(row.balance ?? "0"),
    claimAmount: BigInt(row.claim_amount ?? "0"),
    startTime: row.start_time ? BigInt(row.start_time) : null,
    endTime: row.end_time ? BigInt(row.end_time) : null,
    isClaimActive: row.is_claim_active,
    isPaused: row.is_paused,
    backendMode: row.use_backend,
    hasClaimed: false,
    description: row.description,
    imageUrl: row.image_url || DEFAULT_FAUCET_IMAGE,
    factoryType: row.factory_type,
    customXPostTemplate: "",
    _supabaseRow: row,
  }
}

// ── Remote helpers ────────────────────────────────────────────────────────────

/**
 * Checks isClaimActive on-chain. Branches on Solana vs EVM.
 * Returns null on failure so callers fall back to DB value.
 */
async function checkIsClaimActiveOnchain(
  provider: any,
  faucetAddress: string,
  chainId?: number
): Promise<boolean | null> {
  // ── Solana branch ──────────────────────────────────────────────────────────
  if (chainId === SOLANA_CHAIN_ID) {
    try {
      const state = await withFallback((conn) => getFaucetState(conn, faucetAddress))
      const now = Math.floor(Date.now() / 1000)
      return !state.paused && !state.deleted && now >= state.startTime && now <= state.endTime
    } catch {
      return null
    }
  }

  // ── EVM branch ────────────────────────────────────────────────────────────
  try {
    const { Contract } = await import("ethers")
    const abi = ["function isClaimActive() view returns (bool)"]
    const contract = new Contract(faucetAddress, abi, provider)
    return await contract.isClaimActive()
  } catch {
    return null
  }
}

/**
 * Checks whether userAddress is an admin of the faucet.
 * Branches on Solana vs EVM.
 */
async function checkIsAdmin(
  provider: any,
  faucetAddress: string,
  userAddress: string,
  type: FaucetType,
  chainId?: number
): Promise<boolean> {
  if (userAddress.toLowerCase() === FACTORY_OWNER_ADDRESS.toLowerCase()) return true

  // ── Solana branch ──────────────────────────────────────────────────────────
  if (chainId === SOLANA_CHAIN_ID) {
    try {
      return await withFallback((conn) => isFaucetAdmin(conn, faucetAddress, userAddress))
    } catch {
      return false
    }
  }

  // ── EVM branch ────────────────────────────────────────────────────────────
  try {
    const { Contract } = await import("ethers")
    const abiMap: Record<FaucetType, () => Promise<any[]>> = {
      dropcode: () => import("@/lib/abis").then((m) => m.FAUCET_ABI_DROPCODE),
      droplist: () => import("@/lib/abis").then((m) => m.FAUCET_ABI_DROPLIST),
      custom: () => import("@/lib/abis").then((m) => m.FAUCET_ABI_CUSTOM),
    }
    const abi = await abiMap[type]()
    const contract = new Contract(faucetAddress, abi, provider)
    return await contract.isAdmin(userAddress)
  } catch {
    return false
  }
}

/**
 * Checks whether a user has claimed from a faucet.
 * Branches on Solana vs EVM.
 */
async function checkHasClaimed(
  provider: JsonRpcProvider,
  faucetAddress: string,
  userAddress: string,
  faucetType: FaucetType,
  chainId?: number
): Promise<boolean> {
  // ── Solana branch ──────────────────────────────────────────────────────────
  if (chainId === SOLANA_CHAIN_ID) {
    try {
      const status = await withFallback((conn) =>
        getFaucetClaimStatus(conn, faucetAddress, userAddress)
      )
      return status.claimed
    } catch {
      return false
    }
  }

  // ── EVM branch ────────────────────────────────────────────────────────────
  try {
    const { Contract } = await import("ethers")
    const abiStub = [{
      inputs: [{ internalType: "address", name: "", type: "address" }],
      name: "hasClaimed",
      outputs: [{ internalType: "bool", name: "", type: "bool" }],
      stateMutability: "view",
      type: "function",
    }]
    const contract = new Contract(faucetAddress, abiStub, provider)
    return await contract.hasClaimed(userAddress)
  } catch {
    return false
  }
}

/**
 * Gets custom claim amount for a user. Solana uses whitelistEntry.customAmount,
 * EVM uses the existing contract call.
 */
async function getUserCustomClaimAmount(
  provider: any,
  userAddress: string,
  faucetAddress: string,
  tokenDecimals: number,
  chainId?: number
): Promise<{ amount: bigint; hasCustom: boolean }> {
  // ── Solana branch ──────────────────────────────────────────────────────────
  if (chainId === SOLANA_CHAIN_ID) {
    try {
      const entry = await withFallback((conn) =>
        getWhitelistEntry(conn, faucetAddress, userAddress)
      )
      // On Solana, faucetType=2 (custom) stores custom amounts in whitelist entry
      if (entry.isWhitelisted && entry.customAmount > BigInt(0)) {
        return { amount: entry.customAmount, hasCustom: true }
      }
      return { amount: BigInt(0), hasCustom: false }
    } catch {
      return { amount: BigInt(0), hasCustom: false }
    }
  }

  // ── EVM branch ────────────────────────────────────────────────────────────
  try {
    const { FAUCET_ABI_CUSTOM } = await import("@/lib/abis")
    const { Contract } = await import("ethers")
    const contract = new Contract(faucetAddress, FAUCET_ABI_CUSTOM, provider)
    const hasCustom = await contract.hasCustomClaimAmount(userAddress)
    if (hasCustom) {
      const amount = await contract.getCustomClaimAmount(userAddress)
      return { amount, hasCustom: true }
    }
    return { amount: BigInt(0), hasCustom: false }
  } catch {
    return { amount: BigInt(0), hasCustom: false }
  }
}

/**
 * Checks whitelist status for a user. Solana uses getWhitelistEntry PDA,
 * EVM uses the existing isWhitelisted helper.
 */
async function checkIsWhitelisted(
  provider: any,
  faucetAddress: string,
  userAddress: string,
  faucetType: FaucetType,
  chainId?: number
): Promise<boolean> {
  // ── Solana branch ──────────────────────────────────────────────────────────
  if (chainId === SOLANA_CHAIN_ID) {
    try {
      const entry = await withFallback((conn) =>
        getWhitelistEntry(conn, faucetAddress, userAddress)
      )
      return entry.isWhitelisted
    } catch {
      return false
    }
  }

  // ── EVM branch ────────────────────────────────────────────────────────────
  try {
    return await isWhitelisted(provider, faucetAddress, userAddress, faucetType)
  } catch {
    return false
  }
}

/**
 * Fetches the on-chain faucet balance. Solana uses getFaucetState.vaultBalance,
 * EVM reads the token/native balance directly.
 */
async function fetchFaucetBalance(
  faucetAddress: string,
  chainId?: number
): Promise<bigint | null> {
  if (chainId === SOLANA_CHAIN_ID) {
    try {
      const state = await withFallback((conn) => getFaucetState(conn, faucetAddress))
      return state.vaultBalance
    } catch {
      return null
    }
  }
  // EVM: balance is synced into Supabase by the backend — no on-chain call needed here
  return null
}

// ── Social / backend helpers (unchanged from original) ──────────────────────

async function loadSocialMediaLinks(faucetAddress: string): Promise<SocialMediaLink[]> {
  try {
    const res = await fetch(`https://identical-vivi-faucetdrops-41e9c56b.koyeb.app/faucet-tasks/${faucetAddress}`)
    if (!res.ok) return []
    const result = await res.json()
    if (!Array.isArray(result.tasks)) return []
    return result.tasks.map((t: any) => ({
      platform: t.platform || "link",
      url: t.url,
      handle: t.handle,
      action: t.action || "check",
    }))
  } catch {
    return []
  }
}

async function loadCustomXPostTemplate(faucetAddress: string): Promise<string> {
  try {
    const res = await fetch(`https://identical-vivi-faucetdrops-41e9c56b.koyeb.app/faucet-x-template/${faucetAddress}`)
    if (!res.ok) return DEFAULT_X_POST_TEMPLATE
    const result = await res.json()
    return result.template || DEFAULT_X_POST_TEMPLATE
  } catch {
    return DEFAULT_X_POST_TEMPLATE
  }
}

async function saveAdminPopupPreference(
  userAddr: string, faucetAddr: string, dontShow: boolean
) {
  try {
    const res = await fetch("https://identical-vivi-faucetdrops-41e9c56b.koyeb.app/admin-popup-preference", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userAddress: userAddr, faucetAddress: faucetAddr, dontShowAgain: dontShow,
      }),
    })
    return res.ok ? (await res.json()).success : false
  } catch { return false }
}

async function getAdminPopupPreference(
  userAddr: string, faucetAddr: string
): Promise<boolean> {
  try {
    const res = await fetch(
      `https://identical-vivi-faucetdrops-41e9c56b.koyeb.app/admin-popup-preference?userAddress=${encodeURIComponent(userAddr)}&faucetAddress=${encodeURIComponent(faucetAddr)}`
    )
    return res.ok ? (await res.json()).dontShowAgain ?? false : false
  } catch { return false }
}

const triggerForceSync = async (addressToSync: string) => {
  try {
    const res = await fetch(
      `https://xeric-gwendolen-faucetdrops-4f72016d.koyeb.app/force-sync-faucet/${addressToSync}`,
      { method: "POST" }
    )
    const data = await res.json()
    if (!data.success) console.warn("Force sync issue:", data.error)
  } catch (err) {
    console.error("Network error during force sync:", err)
  }
}

// ── Main component ────────────────────────────────────────────────────────────

export default function FaucetDetails() {
  const { address: rawParam } = useParams<{ address: string }>()
  const searchParams = useSearchParams()
  const networkId = searchParams.get("networkId")
  const [hasAutoSynced, setHasAutoSynced] = useState(false)
  const router = useRouter()
  const { address, chainId, isConnected, provider } = useWallet()
  const { networks } = useNetwork()

  // ── Solana wallet hook ─────────────────────────────────────────────────────
  const { activeSolanaAccount, solanaAddress } = useSolanaWallet()

  // ── Core state ─────────────────────────────────────────────────────────────
  const [faucetRow, setFaucetRow] = useState<FaucetDetailRow | null>(null)
  const [faucetDetails, setFaucetDetails] = useState<any>(null)
  const [faucetType, setFaucetType] = useState<FaucetType | null>(null)
  const [faucetAddress, setFaucetAddress] = useState<string>("")
  const [loading, setLoading] = useState(true)
  const [selectedNetwork, setSelectedNetwork] = useState<any>(null)

  // ── User state ─────────────────────────────────────────────────────────────
  const [userIsAdmin, setUserIsAdmin] = useState(false)
  const [hasClaimed, setHasClaimed] = useState(false)
  const [userIsWhitelisted, setUserIsWhitelisted] = useState(false)
  const [userCustomClaimAmount, setUserCustomClaimAmount] = useState<bigint>(BigInt(0))
  const [hasCustomAmount, setHasCustomAmount] = useState(false)
  const [secretCode, setSecretCode] = useState("")
  const [usernames, setUsernames] = useState<Record<string, string>>({})
  const [verificationStates, setVerificationStates] = useState<Record<string, boolean>>({})
  const [isVerifying, setIsVerifying] = useState(false)
  const [showFollowDialog, setShowFollowDialog] = useState(false)
  const [showVerificationDialog, setShowVerificationDialog] = useState(false)
  const [showClaimPopup, setShowClaimPopup] = useState(false)
  const [txHash, setTxHash] = useState<string | null>(null)
  const [hasAttemptedVerification, setHasAttemptedVerification] = useState(false)

  // ── Admin state ────────────────────────────────────────────────────────────
  const [adminList, setAdminList] = useState<string[]>([])
  const [backendMode, setBackendMode] = useState(true)
  const [tokenSymbol, setTokenSymbol] = useState("ETH")
  const [tokenDecimals, setTokenDecimals] = useState(18)
  const [faucetMetadata, setFaucetMetadata] = useState<{ description?: string; imageUrl?: string }>({})
  const [customXPostTemplate, setCustomXPostTemplate] = useState(DEFAULT_X_POST_TEMPLATE)
  const [dynamicTasks, setDynamicTasks] = useState<SocialMediaLink[]>([])
  const [transactions, setTransactions] = useState<any[]>([])
  const [showAdminPopup, setShowAdminPopup] = useState(false)
  const [dontShowAdminPopupAgain, setDontShowAdminPopupAgain] = useState(false)
  const [newSocialLinks, setNewSocialLinks] = useState<SocialMediaLink[]>([])
  const [claimAmount, setClaimAmount] = useState("0")
  const [startTime, setStartTime] = useState("")
  const [endTime, setEndTime] = useState("")

  // ── Derived ────────────────────────────────────────────────────────────────
  const isSolanaNetwork = selectedNetwork?.chainId === SOLANA_CHAIN_ID

  /**
   * The active user address: Solana pubkey string when on Solana,
   * EVM address otherwise.
   */
  const activeAddress = isSolanaNetwork ? solanaAddress : address

  const isOwner =
    activeAddress &&
    faucetDetails?.owner &&
    activeAddress.toLowerCase() === faucetDetails.owner.toLowerCase()

  const isBackendAddress =
    address && address.toLowerCase() === FACTORY_OWNER_ADDRESS.toLowerCase()

  const canAccessAdminControls = isOwner || userIsAdmin || isBackendAddress

  const getTaskKey = (task: SocialMediaLink) => task.platform
  const isSecretCodeValid = secretCode.length === 6 && /^[A-Z0-9]{6}$/.test(secretCode)
  const allAccountsVerified =
    dynamicTasks.length === 0
      ? true
      : dynamicTasks.every((t) => verificationStates[getTaskKey(t)])

  // ── Network check ──────────────────────────────────────────────────────────

  const checkNetwork = useCallback(
    (skipToast = false): boolean => {
      // Solana: verify the Solana wallet is connected
      if (isSolanaNetwork) {
        if (!solanaAddress) {
          if (!skipToast) toast.warning("Solana wallet not connected.")
          return false
        }
        return true
      }

      // EVM
      if (!chainId) {
        if (!skipToast) toast.warning("Network not detected. Please ensure your wallet is connected.")
        return false
      }
      const targetId = faucetRow?.chain_id ?? Number(networkId)
      if (targetId && targetId !== chainId) {
        if (!skipToast) toast.warning("Wrong Network — switch to the correct network.")
        return false
      }
      return true
    },
    [chainId, networkId, faucetRow, isSolanaNetwork, solanaAddress]
  )

  // ── Load user-specific on-chain data ──────────────────────────────────────

  const loadUserSpecificData = useCallback(
    async (row: FaucetDetailRow, type: FaucetType, net: any) => {
      // Determine which address to use
      const userAddr = net?.chainId === SOLANA_CHAIN_ID ? solanaAddress : address
      if (!userAddr || !net) return

      const netChainId: number = net.chainId

      try {
        // ── Solana path ────────────────────────────────────────────────────
        if (netChainId === SOLANA_CHAIN_ID) {
          // hasClaimed
          const claimed = await withFallback((conn) =>
            getFaucetClaimStatus(conn, row.faucet_address, userAddr)
          ).then((s) => s.claimed).catch(() => false)
          setHasClaimed(claimed)

          // whitelist / custom amount
          if (type === "droplist" || type === "custom") {
            const entry = await withFallback((conn) =>
              getWhitelistEntry(conn, row.faucet_address, userAddr)
            ).catch(() => ({ isWhitelisted: false, customAmount: BigInt(0) }))

            if (type === "droplist") {
              setUserIsWhitelisted(entry.isWhitelisted)
            }
            if (type === "custom") {
              const hasCustom = entry.isWhitelisted && entry.customAmount > BigInt(0)
              setUserCustomClaimAmount(entry.customAmount)
              setHasCustomAmount(hasCustom)
            }
          }

          // isAdmin
          const isAdmin = await withFallback((conn) =>
            isFaucetAdmin(conn, row.faucet_address, userAddr)
          ).catch(() => false)
          setUserIsAdmin(isAdmin)

          // admin popup
          if (isAdmin || userAddr.toLowerCase() === row.owner_address.toLowerCase()) {
            const dontShow = await getAdminPopupPreference(userAddr, row.faucet_address)
            if (!dontShow) setShowAdminPopup(true)
          }

          // Solana has no getAllAdmins equivalent exposed via SDK —
          // just set owner in list for now.
          const all: string[] = []
          if (row.owner_address) all.push(row.owner_address)
          setAdminList(all)
          return
        }

        // ── EVM path ───────────────────────────────────────────────────────
        const safeRpc = Array.isArray(net.rpcUrl) ? net.rpcUrl[0] : net.rpcUrl
        const p = new JsonRpcProvider(safeRpc)

        const claimed = await checkHasClaimed(p, row.faucet_address, userAddr, type, netChainId)
        setHasClaimed(claimed)

        if (type === "droplist") {
          const wl = await checkIsWhitelisted(p, row.faucet_address, userAddr, type, netChainId)
          setUserIsWhitelisted(wl)
        }
        if (type === "custom") {
          const ci = await getUserCustomClaimAmount(
            p, userAddr, row.faucet_address, row.token_decimals, netChainId
          )
          setUserCustomClaimAmount(ci.amount)
          setHasCustomAmount(ci.hasCustom)
        }

        const isAdmin = await checkIsAdmin(p, row.faucet_address, userAddr, type, netChainId)
        setUserIsAdmin(isAdmin)

        if (isAdmin || userAddr.toLowerCase() === row.owner_address.toLowerCase()) {
          const dontShow = await getAdminPopupPreference(userAddr, row.faucet_address)
          if (!dontShow) setShowAdminPopup(true)
        }

        const admins = await getAllAdmins(p, row.faucet_address, type)
        const all = [...admins]
        if (row.owner_address && !all.some((a) => a.toLowerCase() === row.owner_address.toLowerCase()))
          all.unshift(row.owner_address)
        if (!all.some((a) => a.toLowerCase() === FACTORY_OWNER_ADDRESS.toLowerCase()))
          all.push(FACTORY_OWNER_ADDRESS)
        setAdminList(all)
      } catch (err) {
        console.warn("loadUserSpecificData error:", err)
      }
    },
    [address, solanaAddress]
  )

  // ── Resolve faucet from URL param ──────────────────────────────────────────

  const resolveAndLoad = useCallback(async () => {
    if (!rawParam) { setLoading(false); return }

    setLoading(true)
    try {
      let row: FaucetDetailRow | null = null
      const MAX_ATTEMPTS = 5
      for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
        if (attempt > 0) await new Promise((r) => setTimeout(r, 800 * attempt))
        row = await resolveFaucetParam(rawParam, networkId ? Number(networkId) : undefined)
        if (row) break
      }

      if (row) {
        const canonicalSlug = row.slug || buildFaucetSlug(row.faucet_name, row.faucet_address)
        if (rawParam !== canonicalSlug) {
          router.replace(`/faucet/${canonicalSlug}${networkId ? `?networkId=${networkId}` : ""}`)
        }

        setFaucetRow(row)
        setFaucetAddress(row.faucet_address)

        const rawType = (row.factory_type || "").toLowerCase()
        const isDropCode = rawType === "dropcode" || (rawType === "open" && row.use_backend === true)
        const normalizedType: FaucetType = isDropCode
          ? "dropcode"
          : rawType === "droplist"
          ? "droplist"
          : "custom"
        const actualBackendMode = isDropCode ? true : (row.use_backend ?? false)

        setFaucetType(normalizedType)
        setBackendMode(actualBackendMode)

        const details = rowToFaucetDetails(row)
        details.backendMode = actualBackendMode

        const net = networks.find((n) => n.chainId === row!.chain_id) ?? null
        setSelectedNetwork(net)

        // Live isClaimActive (branched internally)
        if (net) {
          try {
            const safeRpc = Array.isArray(net.rpcUrl) ? net.rpcUrl[0] : net.rpcUrl
            const p = net.chainId === SOLANA_CHAIN_ID ? null : new JsonRpcProvider(safeRpc)
            const liveStatus = await checkIsClaimActiveOnchain(p, row.faucet_address, net.chainId)
            if (liveStatus !== null) details.isClaimActive = liveStatus
          } catch {
            console.warn("Failed to fetch live isClaimActive, using DB value.")
          }
        }

        // Live vault balance for Solana (Supabase sync may lag)
        if (net?.chainId === SOLANA_CHAIN_ID) {
          const bal = await fetchFaucetBalance(row.faucet_address, net.chainId)
          if (bal !== null) details.balance = bal
        }

        const [template, tasks] = await Promise.all([
          loadCustomXPostTemplate(row.faucet_address),
          loadSocialMediaLinks(row.faucet_address),
        ])

        setFaucetDetails({ ...details, customXPostTemplate: template })
        setTokenSymbol(row.token_symbol)
        setTokenDecimals(row.token_decimals)
        setCustomXPostTemplate(template || DEFAULT_X_POST_TEMPLATE)
        setFaucetMetadata({
          description:
            row.description || getDefaultFaucetDescription(row.network_name, row.owner_address),
          imageUrl: row.image_url || "/default.jpeg",
        })
        setDynamicTasks(tasks)
        setSelectedNetwork(net)
        await loadUserSpecificData(row, normalizedType, net)

        // Skip force-sync for Solana (it's on-chain, no backend DB to sync)
        if (net?.chainId !== SOLANA_CHAIN_ID) {
          triggerForceSync(row.faucet_address)
        }
      } else {
        toast.error("Faucet not found.")
        router.push("/faucet")
      }
    } catch (err) {
      console.error("resolveAndLoad failed:", err)
      toast.error("Error loading faucet details.")
    } finally {
      setLoading(false)
    }
  }, [rawParam, networkId, networks, address, solanaAddress, router, loadUserSpecificData])

  // ── Refresh faucet details ─────────────────────────────────────────────────

  const refreshFaucetDetails = useCallback(async () => {
    if (!faucetAddress || !selectedNetwork) return
    try {
      if (selectedNetwork.chainId !== SOLANA_CHAIN_ID) {
        await triggerForceSync(faucetAddress)
      }

      const row = await getFaucetByAddress(faucetAddress, selectedNetwork.chainId)
      if (!row) return

      setFaucetRow(row)

      const rawType = (row.factory_type || "").toLowerCase()
      const isDropCode = rawType === "dropcode" || (rawType === "open" && row.use_backend === true)
      const actualBackendMode = isDropCode ? true : (row.use_backend ?? false)
      const normalizedType: FaucetType = isDropCode
        ? "dropcode"
        : rawType === "droplist"
        ? "droplist"
        : "custom"

      const details = rowToFaucetDetails(row)
      details.backendMode = actualBackendMode

      // Live isClaimActive
      try {
        const safeRpc = Array.isArray(selectedNetwork.rpcUrl)
          ? selectedNetwork.rpcUrl[0]
          : selectedNetwork.rpcUrl
        const p =
          selectedNetwork.chainId === SOLANA_CHAIN_ID ? null : new JsonRpcProvider(safeRpc)
        const liveStatus = await checkIsClaimActiveOnchain(
          p, faucetAddress, selectedNetwork.chainId
        )
        if (liveStatus !== null) details.isClaimActive = liveStatus
      } catch {
        console.warn("Failed to fetch live isClaimActive, using DB value.")
      }

      // Live vault balance for Solana
      if (selectedNetwork.chainId === SOLANA_CHAIN_ID) {
        const bal = await fetchFaucetBalance(faucetAddress, selectedNetwork.chainId)
        if (bal !== null) details.balance = bal
      }

      const template = await loadCustomXPostTemplate(faucetAddress)
      setCustomXPostTemplate(template)
      setFaucetDetails({ ...details, customXPostTemplate: template })
      setTokenSymbol(row.token_symbol)
      setTokenDecimals(row.token_decimals)
      setBackendMode(actualBackendMode)
      setFaucetType(normalizedType)
      setFaucetMetadata({
        description:
          row.description ||
          getDefaultFaucetDescription(row.network_name, row.owner_address),
        imageUrl: row.image_url || "/default.jpeg",
      })
      if (row.claim_amount)
        setClaimAmount(formatUnits(BigInt(row.claim_amount), row.token_decimals))
      if (row.start_time)
        setStartTime(new Date(row.start_time * 1000).toISOString().slice(0, 16))
      if (row.end_time)
        setEndTime(new Date(row.end_time * 1000).toISOString().slice(0, 16))

      await loadUserSpecificData(row, normalizedType, selectedNetwork)
    } catch (err) {
      console.warn("refreshFaucetDetails error:", err)
    }
  }, [faucetAddress, selectedNetwork, loadUserSpecificData])

  // ── Effects ────────────────────────────────────────────────────────────────

  useEffect(() => { resolveAndLoad() }, [rawParam, networkId])

  // Auto-sync when start time is reached
  useEffect(() => {
    if (!faucetDetails || faucetDetails.isClaimActive || hasAutoSynced) return
    const startTimeMs = Number(faucetDetails.startTime) * 1000
    if (startTimeMs === 0) return

    const timer = setInterval(() => {
      if (Date.now() >= startTimeMs) {
        setHasAutoSynced(true)
        clearInterval(timer)
        refreshFaucetDetails()
      }
    }, 1000)

    return () => clearInterval(timer)
  }, [faucetDetails, hasAutoSynced, refreshFaucetDetails])

  // Open claim popup once txHash is set
  useEffect(() => {
    if (txHash) setShowClaimPopup(true)
  }, [txHash])

  // ── Claim handler ──────────────────────────────────────────────────────────

  async function handleBackendClaim(): Promise<void> {
    if (!activeAddress || !faucetDetails) {
      toast.warning("Wallet not connected")
      return
    }
    if (!checkNetwork()) return
    if (faucetType === "dropcode" && backendMode && !isSecretCodeValid) {
      toast.error("Invalid Drop code — 6 alphanumeric characters required")
      return
    }
    if (faucetType === "droplist" && !userIsWhitelisted) {
      toast.error("Not Drop-listed")
      return
    }
    if (faucetType === "custom" && !hasCustomAmount) {
      toast.error("No Custom Allocation")
      return
    }
    if (!allAccountsVerified) {
      toast.error("Please complete all required tasks first")
      return
    }

    try {
      setIsVerifying(true)

      // ── Solana claim path ────────────────────────────────────────────────
      if (isSolanaNetwork) {
        if (!solanaAddress) {
          toast.error("Solana wallet not connected")
          return
        }

        // Your FastAPI backend holds the backend keypair and calls claimFaucet
        // on-chain. The frontend just sends the participant address + faucet address.
        const payload: Record<string, any> = {
          faucetAddress,
          participant: solanaAddress,
          faucetType,
        }
        if (faucetType === "dropcode" && backendMode) {
          payload.secretCode = secretCode
        }

        const res = await fetch("https://identical-vivi-faucetdrops-41e9c56b.koyeb.app/solana/claim", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        })

        if (!res.ok) {
          const err = await res.json().catch(() => ({}))
          throw new Error(err.detail || err.message || `HTTP ${res.status}`)
        }

        const result = await res.json()

        setTxHash(result.txHash ?? result.tx ?? null)

        const claimedAmt =
          faucetType === "custom" && hasCustomAmount
            ? formatUnits(userCustomClaimAmount, tokenDecimals)
            : faucetDetails.claimAmount
            ? formatUnits(faucetDetails.claimAmount, tokenDecimals)
            : "tokens"

        toast.success(`You have dripped ${claimedAmt} ${tokenSymbol}.`)
        setSecretCode("")
        await refreshFaucetDetails()
        return
      }

      // ── EVM claim path ───────────────────────────────────────────────────
      if (!isConnected) {
        toast.warning("EVM wallet not connected")
        return
      }

      const prov = provider as BrowserProvider
      let result: any

      if (faucetType === "custom") {
        result = await claimCustomViaBackend(activeAddress, faucetAddress, prov)
      } else if (faucetType === "dropcode" && backendMode) {
        result = await claimViaBackend(activeAddress, faucetAddress, prov, secretCode)
      } else {
        result = await claimNoCodeViaBackend(activeAddress, faucetAddress, prov)
      }

      setTxHash(result.txHash)

      const claimedAmt =
        faucetType === "custom" && hasCustomAmount
          ? formatUnits(userCustomClaimAmount, tokenDecimals)
          : faucetDetails.claimAmount
          ? formatUnits(faucetDetails.claimAmount, tokenDecimals)
          : "tokens"

      toast.success(`You have dripped ${claimedAmt} ${tokenSymbol}.`)
      setSecretCode("")
      await refreshFaucetDetails()
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setIsVerifying(false)
    }
  }

  // ── X post content ────────────────────────────────────────────────────────

  const generateXPostContent = (amount: string): string => {
    const isEmpty = !customXPostTemplate?.trim()
    const isDefault = customXPostTemplate === DEFAULT_X_POST_TEMPLATE
    const template =
      isEmpty || isDefault
        ? CONSTANT_X_POST
        : `${FIXED_TWEET_PREFIX} ${customXPostTemplate}`

    let baseUrl = Array.isArray(selectedNetwork?.blockExplorerUrls)
      ? selectedNetwork.blockExplorerUrls[0]
      : selectedNetwork?.blockExplorerUrls
    if (baseUrl?.endsWith("/")) baseUrl = baseUrl.slice(0, -1)

    // For Solana, the tx link goes to Solscan (or whatever the network's explorer is)
    const explorerLink = txHash && baseUrl ? `${baseUrl}/tx/${txHash}` : ""

    return template
      .replace(/\{amount\}/g, amount)
      .replace(/\{token\}/g, tokenSymbol)
      .replace(/\{network\}/g, selectedNetwork?.name || "the network")
      .replace(/\{faucet\}/g, faucetDetails?.name || "this faucet")
      .replace(/\{explorer\}/g, explorerLink)
      .replace(/\{@handle\}/g, "")
      .replace(/\{#hashtag\}/g, "")
      .trim()
  }

  // ── Verification handler ───────────────────────────────────────────────────

  const handleVerifyAllTasks = async (): Promise<void> => {
    const allFilled = dynamicTasks.every(
      (t) => usernames[getTaskKey(t)]?.trim().length > 0
    )
    if (!allFilled) {
      toast.error("Please enter usernames for all required tasks.")
      return
    }

    setIsVerifying(true)
    setShowVerificationDialog(true)

    setTimeout(() => {
      if (!hasAttemptedVerification) {
        setIsVerifying(false)
        setShowVerificationDialog(false)
        setHasAttemptedVerification(true)
        toast.error("Can't verify. Please complete the tasks and try again.")
      } else {
        const next: Record<string, boolean> = {}
        dynamicTasks.forEach((t) => { next[getTaskKey(t)] = true })
        setVerificationStates(next)
        setIsVerifying(false)
        toast.success("All tasks verified!")
        setTimeout(() => {
          setShowVerificationDialog(false)
          setShowFollowDialog(false)
        }, 2000)
      }
    }, 3000)
  }

  // ── Admin popup ────────────────────────────────────────────────────────────

  const handleCloseAdminPopup = async (): Promise<void> => {
    if (dontShowAdminPopupAgain && faucetAddress && activeAddress) {
      const saved = await saveAdminPopupPreference(activeAddress, faucetAddress, true)
      if (saved) toast.success("Preference saved.")
    }
    setShowAdminPopup(false)
    setDontShowAdminPopupAgain(false)
  }

  const handleFollowAll = (): void => {
    if (dynamicTasks.length === 0) {
      toast.error("This faucet does not require social media verification.")
      return
    }
    setShowFollowDialog(true)
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  if (loading) return <LoadingPage />

  if (!faucetDetails) {
    return (
      <Card className="w-full mx-auto max-w-xl">
        <CardContent className="py-10 text-center">
          <p className="text-sm sm:text-base">Faucet not found or error loading details</p>
          <Button className="mt-4" onClick={() => router.push("/")}>
            Return to Home
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <main className="min-h-screen bg-background">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <div className="flex flex-col gap-6 sm:gap-8 max-w-3xl sm:max-w-4xl mx-auto">
          <Header pageTitle="Faucet Details" />

          {canAccessAdminControls ? (
            <FaucetAdminView
              faucetAddress={faucetAddress}
              faucetDetails={faucetDetails}
              faucetType={faucetType}
              tokenSymbol={tokenSymbol}
              tokenDecimals={tokenDecimals}
              selectedNetwork={selectedNetwork}
              adminList={adminList}
              isOwner={!!isOwner}
              backendMode={backendMode}
              canAccessAdminControls={!!canAccessAdminControls}
              loadFaucetDetails={refreshFaucetDetails}
              checkNetwork={checkNetwork}
              dynamicTasks={dynamicTasks}
              newSocialLinks={newSocialLinks}
              setNewSocialLinks={setNewSocialLinks}
              customXPostTemplate={customXPostTemplate}
              setCustomXPostTemplate={setCustomXPostTemplate}
              setTransactions={setTransactions}
              transactions={transactions}
              address={activeAddress}
              chainId={isSolanaNetwork ? SOLANA_CHAIN_ID : chainId}
              provider={provider}
              router={router}
              faucetMetadata={faucetMetadata}
            />
          ) : (
            <FaucetUserView
              faucetAddress={faucetAddress}
              faucetDetails={faucetDetails}
              faucetType={faucetType}
              tokenSymbol={tokenSymbol}
              tokenDecimals={tokenDecimals}
              selectedNetwork={selectedNetwork}
              address={activeAddress}
              isConnected={isSolanaNetwork ? !!solanaAddress : isConnected}
              hasClaimed={hasClaimed}
              userIsWhitelisted={userIsWhitelisted}
              hasCustomAmount={hasCustomAmount}
              userCustomClaimAmount={userCustomClaimAmount}
              dynamicTasks={dynamicTasks}
              allAccountsVerified={allAccountsVerified}
              secretCode={secretCode}
              setSecretCode={setSecretCode}
              usernames={usernames}
              setUsernames={setUsernames}
              verificationStates={verificationStates}
              setVerificationStates={setVerificationStates}
              isVerifying={isVerifying}
              faucetMetadata={faucetMetadata}
              customXPostTemplate={customXPostTemplate}
              handleBackendClaim={handleBackendClaim}
              handleFollowAll={handleFollowAll}
              generateXPostContent={generateXPostContent}
              txHash={txHash}
              showFollowDialog={showFollowDialog}
              setShowFollowDialog={setShowFollowDialog}
              showVerificationDialog={showVerificationDialog}
              setShowVerificationDialog={setShowVerificationDialog}
              showClaimPopup={showClaimPopup}
              setShowClaimPopup={setShowClaimPopup}
              handleVerifyAllTasks={handleVerifyAllTasks}
            />
          )}
        </div>
      </div>

      <Dialog open={showAdminPopup} onOpenChange={setShowAdminPopup}>
        <DialogContent className="w-11/12 max-w-[95vw] sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-xl">Admin Controls Guide</DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">
              Learn how to manage your {faucetType || "unknown"} faucet as an admin.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <h3 className="text-sm sm:text-base font-semibold">Admin Privileges</h3>
              <p className="text-xs sm:text-sm text-muted-foreground">
                As an admin, you can manage this {faucetType || "unknown"} faucet:
              </p>
              <ul className="list-disc pl-5 text-xs sm:text-sm text-muted-foreground space-y-1">
                <li><strong>Fund/Withdraw:</strong> Manage faucet balance.</li>
                <li><strong>Parameters:</strong> Set claim amount, timing, and tasks.</li>
                {faucetType === "droplist" && <li><strong>Drop-list:</strong> Add or remove addresses.</li>}
                {faucetType === "custom" && <li><strong>Custom:</strong> Upload CSV for custom allocations.</li>}
                <li><strong>Admin Power:</strong> Manage admins and reset claims.</li>
                <li><strong>Activity Log:</strong> View transaction history.</li>
              </ul>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="dont-show-again"
                checked={dontShowAdminPopupAgain}
                onCheckedChange={(c) => setDontShowAdminPopupAgain(c === true)}
              />
              <Label htmlFor="dont-show-again" className="text-xs sm:text-sm">
                Don't show this again for this faucet
              </Label>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleCloseAdminPopup} className="text-xs sm:text-sm w-full">
              Got It
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  )
}