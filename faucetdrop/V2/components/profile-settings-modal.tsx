"use client"
import { useState, useEffect, useCallback, useRef } from "react"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useWallet, openOAuthPopup, type SocialProvider } from "@/components/wallet-provider"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import {
  Loader2, Save, Upload, Check, Edit2, RefreshCw,
  CheckCircle2, Link as LinkIcon, Wallet, Copy, ExternalLink, X,
} from "lucide-react"
import { toast } from "sonner"

const API_BASE_URL  = "https://identical-vivi-faucetdrops-41e9c56b.koyeb.app"

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface UserProfile {
  wallet_address: string
  username:       string
  bio:            string
  avatar_url:     string
}

interface DetectedChainWallet {
  name:     string
  icon:     string
  provider: any
}

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const GENERATED_SEEDS = [
  "Jerry","John","Aneka","Zack","Molly","Bear","Crypto","Whale","Pepe",
  "Satoshi","Vitalik","Gwei","HODL","WAGMI","Doge","Shiba","Solana",
  "Ether","Bitcoin","Chain","Block","DeFi","NFT","Alpha","Beta",
  "Neon","Cyber","Pixel","Glitch","Retro","Vapor","Synth","Wave",
  "Pulse","Echo","Flux","Spark","Glow","Shine","Shadow","Light",
]

const PROVIDER_META: Record<string, { label: string; icon: string }> = {
  google:    { label: "Google",      icon: "🔵" },
  twitter:   { label: "X (Twitter)", icon: "🐦" },
  github:    { label: "GitHub",      icon: "🐙" },
  discord:   { label: "Discord",     icon: "💜" },
  farcaster: { label: "Farcaster",   icon: "🟣" },
  passkey:   { label: "Passkey",     icon: "🔑" },
}

const CHAIN_META: Record<string, {
  label:        string
  badge:        string
  explorerBase: string
}> = {
  evm: {
    label:        "EVM",
    badge:        "EVM",
    explorerBase: "https://celoscan.io/address/",
  },
  solana: {
    label:        "Solana",
    badge:        "SOL",
    explorerBase: "https://solscan.io/account/",
  },
  stellar: {
    label:        "Stellar",
    badge:        "XLM",
    explorerBase: "https://stellar.expert/explorer/public/account/",
  },
}

// ─────────────────────────────────────────────────────────────────────────────
// Wallet detection
// ─────────────────────────────────────────────────────────────────────────────

function detectSolanaWallets(): DetectedChainWallet[] {
  if (typeof window === "undefined") return []
  const wallets: DetectedChainWallet[] = []
  const w = window as any

  // Standard window.solana (Phantom, Brave, many others register here)
  if (w.solana?.isPhantom)    wallets.push({ name: "Phantom",  icon: "👻", provider: w.solana })
  if (w.backpack?.isBackpack) wallets.push({ name: "Backpack", icon: "🎒", provider: w.backpack })
  if (w.solflare?.isSolflare) wallets.push({ name: "Solflare", icon: "🌟", provider: w.solflare })
  if (w.glow?.isGlow)         wallets.push({ name: "Glow",     icon: "✨", provider: w.glow })
  if (w.exodus?.solana)       wallets.push({ name: "Exodus",   icon: "🚀", provider: w.exodus.solana })

  // Catch-all: generic window.solana not matched above
  if (w.solana && wallets.length === 0) {
    wallets.push({ name: "Browser Wallet", icon: "🌐", provider: w.solana })
  }

  return wallets
}

function detectStellarWallets(): DetectedChainWallet[] {
  if (typeof window === "undefined") return []
  const wallets: DetectedChainWallet[] = []
  const w = window as any

  if (w.freighter)                wallets.push({ name: "Freighter", icon: "🚀", provider: { type: "freighter" } })
  if (w.lobstr?.stellar)          wallets.push({ name: "Lobstr",    icon: "🦞", provider: { type: "lobstr",    raw: w.lobstr } })
  if (w.rabet?.stellar)           wallets.push({ name: "Rabet",     icon: "🐇", provider: { type: "rabet",     raw: w.rabet } })
  if (w.xbull?.stellar)           wallets.push({ name: "xBull",     icon: "🐂", provider: { type: "xbull",     raw: w.xbull } })

  return wallets
}

// ─────────────────────────────────────────────────────────────────────────────
// Sign helpers
// ─────────────────────────────────────────────────────────────────────────────

async function signWithSolana(
  provider: any,
  message:  string,
): Promise<{ address: string; signature: string }> {
  // Connect if needed
  if (!provider.isConnected) await provider.connect()
  const pubkey   = provider.publicKey?.toString()
  if (!pubkey) throw new Error("No public key — connect your wallet first")

  const encoded  = new TextEncoder().encode(message)
  const { signature } = await provider.signMessage(encoded, "utf8")

  // signature is Uint8Array — encode to base58
  const base58   = await uint8ArrayToBase58(signature)
  return { address: pubkey, signature: base58 }
}

async function signWithStellar(
  provider: { type: string; raw?: any },
  message:  string,
): Promise<{ address: string; signature: string }> {
  if (provider.type === "freighter") {
    const freighterApi = await import("@stellar/freighter-api")

    const addressResult = await freighterApi.getAddress()
    const address = "address" in addressResult ? addressResult.address : (addressResult as any).address
    if (!address) throw new Error("Freighter not connected")

    const signResult = await freighterApi.signMessage(message, { address })

    // SignMessageV4Response has `signature`, SignMessageV3Response has `signedMessage`
    let signature: string
    if ("signature" in signResult && signResult.signature) {
      signature = signResult.signature
    } else if ("signedMessage" in signResult && (signResult as any).signedMessage) {
      signature = (signResult as any).signedMessage
    } else {
      throw new Error("Freighter returned no signature")
    }

    return { address, signature }
  }

  throw new Error(`${provider.type} signing not yet supported — use Freighter`)
}


// base58 encoding without a heavy dep — use dynamic import of bs58 if available,
// else fall back to a lightweight pure-JS impl bundled below
async function uint8ArrayToBase58(bytes: Uint8Array): Promise<string> {
  try {
    const bs58 = await import("bs58")
    return bs58.default.encode(bytes)
  } catch {
    // Inline fallback (standard Bitcoin base58 alphabet)
    const ALPHABET = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz"
    let   carry    = BigInt(0)
    for (const b of bytes) carry = carry * 256n + BigInt(b)
    let   result   = ""
    while (carry > 0n) { result = ALPHABET[Number(carry % 58n)] + result; carry /= 58n }
    for (const b of bytes) { if (b !== 0) break; result = "1" + result }
    return result
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Wallet picker sheet (inline, no extra modal dep needed)
// ─────────────────────────────────────────────────────────────────────────────

function WalletPicker({
  wallets,
  chain,
  onPick,
  onCancel,
}: {
  wallets:  DetectedChainWallet[]
  chain:    string
  onPick:   (w: DetectedChainWallet) => void
  onCancel: () => void
}) {
  return (
    <div className="flex flex-col gap-2 p-3 border rounded-lg bg-muted/40 mt-1">
      <div className="flex items-center justify-between mb-1">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          Choose a {CHAIN_META[chain]?.label} wallet
        </p>
        <button onClick={onCancel} className="text-muted-foreground hover:text-foreground">
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
      {wallets.map(w => (
        <button
          key={w.name}
          onClick={() => onPick(w)}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg border bg-card hover:bg-accent/60 transition-colors text-left"
        >
          <span className="text-xl">{w.icon}</span>
          <span className="text-sm font-medium">{w.name}</span>
        </button>
      ))}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Address row — handles read-only (embedded) and link flow (external)
// ─────────────────────────────────────────────────────────────────────────────

function WalletAddressRow({
  chain,
  address,
  onLink,
}: {
  chain:   string
  address: string | null | undefined
  /** If provided, row supports linking a new address for this chain */
  onLink?: (chain: string, addr: string, sig: string, msg: string) => Promise<void>
}) {
  const meta = CHAIN_META[chain]

  type LinkStep = "idle" | "picking" | "signing" | "done"

  const [step,    setStep]    = useState<LinkStep>("idle")
  const [wallets, setWallets] = useState<DetectedChainWallet[]>([])
  const [errMsg,  setErrMsg]  = useState<string | null>(null)

  const copy = (text: string) => {
    navigator.clipboard.writeText(text)
    toast.success(`${meta.label} address copied`)
  }

  const handleLinkClick = () => {
    setErrMsg(null)
    const detected = chain === "solana" ? detectSolanaWallets() : detectStellarWallets()
    if (detected.length === 0) {
      setErrMsg(`No ${meta.label} wallet detected. Install Phantom, Backpack, or Solflare for Solana; Freighter for Stellar.`)
      return
    }
    if (detected.length === 1) {
      // Skip picker, go straight to signing
      handlePick(detected[0])
    } else {
      setWallets(detected)
      setStep("picking")
    }
  }

  const handlePick = async (wallet: DetectedChainWallet) => {
    setStep("signing")
    setErrMsg(null)
    try {
      const message = `Link ${meta.label} wallet to FaucetDrops\nTimestamp: ${Date.now()}`
      const { address: walletAddr, signature } = chain === "solana"
        ? await signWithSolana(wallet.provider, message)
        : await signWithStellar(wallet.provider, message)

      await onLink!(chain, walletAddr, signature, message)
      setStep("done")
    } catch (err: any) {
      const msg = err?.message ?? "Signing failed"
      if (!msg.toLowerCase().includes("cancel") && !msg.toLowerCase().includes("reject")) {
        setErrMsg(msg)
      }
      setStep("idle")
    }
  }

  const displayAddr = address
  const short       = displayAddr
    ? `${displayAddr.slice(0, 6)}…${displayAddr.slice(-4)}`
    : null

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between p-3 border rounded-lg bg-card/50">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold">{meta.label}</span>
          <Badge variant="secondary" className="text-[10px]">{meta.badge}</Badge>
        </div>

        <div className="flex items-center gap-1.5">
          {short ? (
            <>
              <span className="text-xs text-muted-foreground font-mono">{short}</span>
              <button onClick={() => copy(displayAddr!)} className="text-muted-foreground hover:text-foreground p-1 rounded">
                <Copy className="h-3 w-3" />
              </button>
              <a href={`${meta.explorerBase}${displayAddr}`} target="_blank" rel="noopener noreferrer"
                className="text-muted-foreground hover:text-foreground p-1 rounded">
                <ExternalLink className="h-3 w-3" />
              </a>
              {onLink && (
                <Button size="sm" variant="ghost"
                  className="h-7 px-2 text-xs text-muted-foreground hover:text-primary"
                  onClick={handleLinkClick} disabled={step === "signing"}>
                  {step === "signing"
                    ? <Loader2 className="h-3 w-3 animate-spin" />
                    : <Edit2 className="h-3 w-3" />}
                </Button>
              )}
            </>
          ) : onLink ? (
            <Button size="sm" variant="outline" className="h-7 text-xs gap-1"
              onClick={handleLinkClick} disabled={step === "signing"}>
              {step === "signing"
                ? <><Loader2 className="h-3 w-3 animate-spin" /> Signing…</>
                : "Link wallet"}
            </Button>
          ) : (
            <span className="text-xs text-muted-foreground">Not available</span>
          )}
        </div>
      </div>

      {/* Wallet picker (shown when multiple wallets detected) */}
      {step === "picking" && (
        <WalletPicker
          wallets={wallets}
          chain={chain}
          onPick={handlePick}
          onCancel={() => setStep("idle")}
        />
      )}

      {/* Signing status */}
      {step === "signing" && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/40 border text-xs text-muted-foreground">
          <Loader2 className="h-3 w-3 animate-spin shrink-0" />
          Waiting for wallet signature — check your wallet extension…
        </div>
      )}

      {/* Error */}
      {errMsg && (
        <p className="text-xs text-red-500 px-1">{errMsg}</p>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// OAuth popup (unchanged)
// ─────────────────────────────────────────────────────────────────────────────

function useOAuthPopup(apiBase: string) {
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  useEffect(() => () => { if (pollRef.current) clearInterval(pollRef.current) }, [])

  const openPopup = useCallback((provider: string): Promise<string> => {
    return new Promise((resolve, reject) => {
      const state = crypto.randomUUID()
      const popup = window.open(
        `${apiBase}/api/auth/${provider}?client_state=${state}`,
        `${provider}_oauth`,
        "width=520,height=640,left=400,top=100",
      )
      if (!popup) { reject(new Error("Popup blocked — allow popups and try again")); return }

      pollRef.current = setInterval(async () => {
        try {
          const res  = await fetch(`${apiBase}/api/auth/session?state=${state}`)
          if (!res.ok) return
          const data = await res.json()
          if (data.status === "pending") return
          clearInterval(pollRef.current!)
          popup.close()
          if (data.status === "done") resolve(data.credential)
          else reject(new Error("OAuth cancelled"))
        } catch { /* keep polling */ }
      }, 1000)

      setTimeout(() => { clearInterval(pollRef.current!); popup?.close(); reject(new Error("OAuth timed out")) }, 180_000)
    })
  }, [apiBase])

  return { openPopup }
}

// ─────────────────────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────────────────────

export function ProfileSettingsModal() {
  const {
    address, isConnected, signer, session,
    linkSocial, walletType, solanaAddress, stellarAddress,
  } = useWallet()

  const router        = useRouter()
  const walletApiBase = process.env.NEXT_PUBLIC_API_URL ?? "https://thoughtful-carmencita-faucetdrops-02a54589.koyeb.app"
  const { openPopup } = useOAuthPopup(walletApiBase)

  const [isOpen,          setIsOpen]          = useState(false)
  const [loading,         setLoading]         = useState(false)
  const [saving,          setSaving]          = useState(false)
  const [uploading,       setUploading]       = useState(false)
  const [usernameError,   setUsernameError]   = useState<string | null>(null)
  const [seedOffset,      setSeedOffset]      = useState(0)
  const [linkingProvider, setLinkingProvider] = useState<string | null>(null)
  const [embeddedSolAddr, setEmbeddedSolAddr] = useState<string | null | undefined>(undefined)
  const [embeddedXlmAddr, setEmbeddedXlmAddr] = useState<string | null | undefined>(undefined)

  // External wallet non-EVM addresses (fetched from DB on open)
  const [extSolAddr, setExtSolAddr] = useState<string | null>(null)
  const [extXlmAddr, setExtXlmAddr] = useState<string | null>(null)

  const [formData, setFormData] = useState<UserProfile>({
    wallet_address: "",
    username:       "",
    bio:            "",
    avatar_url:     "",
  })

  const isEmbedded   = walletType === "embedded"
  const effectiveSol = isEmbedded ? (solanaAddress  ?? null) : extSolAddr

  const effectiveXlm = isEmbedded
  ? (embeddedXlmAddr !== undefined ? embeddedXlmAddr : (stellarAddress ?? undefined))
  : extXlmAddr

// Replace fetchChainAddresses:
const fetchChainAddresses = useCallback(async () => {
  if (!session?.token) return
  try {
    const res  = await fetch(`${walletApiBase}/wallet/addresses`, {
      headers: { Authorization: `Bearer ${session.token}` },
    })
    if (!res.ok) return
    const data = await res.json()

    if (isEmbedded) {
      setEmbeddedSolAddr(data.solana  ?? null)
      setEmbeddedXlmAddr(data.stellar ?? null)
    } else {
      setExtSolAddr(data.solana  ?? null)
      setExtXlmAddr(data.stellar ?? null)
    }
  } catch { /* non-fatal */ }
}, [session?.token, isEmbedded, walletApiBase])
  // ── Fetch FaucetDrops profile ────────────────────────────────────────
  const fetchProfile = useCallback(async (signal?: AbortSignal) => {
    if (!address) return
    setLoading(true)
    try {
      const res  = await fetch(`${API_BASE_URL}/api/profile/${address}`, { signal })
      if (signal?.aborted) return
      const data = await res.json()
      setFormData({
        wallet_address: address,
        username:       data.profile?.username   || "",
        bio:            data.profile?.bio        || "",
        avatar_url:     data.profile?.avatar_url || "",
      })
    } catch (err: any) {
      if (err.name === "AbortError") return
    } finally {
      if (!signal?.aborted) setLoading(false)
    }
  }, [address])

useEffect(() => {
  if (!isOpen) {
    setEmbeddedSolAddr(undefined)
    setEmbeddedXlmAddr(undefined)
    setExtSolAddr(null)
    setExtXlmAddr(null)
    setUnlinkedOverride(null)
  }
}, [isOpen])
  useEffect(() => {
    if (!isOpen || !address) return
    const controller = new AbortController()
    fetchProfile(controller.signal)
    fetchChainAddresses()
    return () => controller.abort()
  }, [isOpen, address, fetchProfile, fetchChainAddresses])

  // ── Link external address (after signature) ──────────────────────────
  const handleLinkAddress = async (
    chain:     string,
    addr:      string,
    signature: string,
    message:   string,
  ) => {
    if (!session?.token) throw new Error("Not authenticated")
    const res = await fetch(`${walletApiBase}/wallet/link-external-address`, {
      method:  "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization:  `Bearer ${session.token}`,
      },
      body: JSON.stringify({ chain, address: addr, signature, message }),
    })
    if (!res.ok) {
      const err = await res.json()
      throw new Error(err.detail || "Failed to link address")
    }
    // Update local state immediately
    if (chain === "solana")  setExtSolAddr(addr)
    if (chain === "stellar") setExtXlmAddr(addr)
    toast.success(`${CHAIN_META[chain].label} wallet verified and linked!`)
  }

  // ── Social linking ───────────────────────────────────────────────────
  const [unlinkedOverride, setUnlinkedOverride] = useState<SocialProvider[] | null>(null)

  const handleLinkSocial = async (provider: SocialProvider) => {
    setLinkingProvider(provider)
    try {
      const credential = await openOAuthPopup(walletApiBase, provider, () => setLinkingProvider(null))
      await linkSocial(provider, credential)
      setUnlinkedOverride(null)
    } catch (err: any) {
      if (err.message === "cancelled") return
      if (err.message !== "OAuth timed out") toast.error(err.message || `Failed to connect ${provider}`)
    } finally {
      setLinkingProvider(null)
    }
  }

  const handleUnlinkSocial = async (provider: SocialProvider) => {
    if (!session?.token) return toast.error("Not authenticated")
    const effective = new Set(unlinkedOverride ?? session?.linkedSocials ?? [])
    if (effective.size <= 1) return toast.error("Can't remove your only login method")
    setLinkingProvider(provider)
    try {
      const res = await fetch(`${walletApiBase}/wallet/unlink-social`, {
        method:  "DELETE",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.token}` },
        body: JSON.stringify({ provider }),
      })
      if (!res.ok) throw new Error((await res.json()).detail || "Unlink failed")
      const data = await res.json()
      toast.success(`${PROVIDER_META[provider]?.label ?? provider} disconnected`)
      window.dispatchEvent(new CustomEvent("socialUnlinked", { detail: data.linked_socials }))
    } catch (err: any) {
      toast.error(err.message || `Failed to disconnect ${provider}`)
    } finally {
      setLinkingProvider(null)
    }
  }

  useEffect(() => {
    const handler = (e: any) => setUnlinkedOverride(e.detail)
    window.addEventListener("socialUnlinked", handler)
    return () => window.removeEventListener("socialUnlinked", handler)
  }, [])
  useEffect(() => { if (!isOpen) setUnlinkedOverride(null) }, [isOpen])

  const effectiveLinked = new Set(unlinkedOverride ?? session?.linkedSocials ?? [])

  // ── Username check ───────────────────────────────────────────────────
  const checkUsernameUniqueness = async (value: string) => {
    if (!value?.trim() || !address) return true
    try {
      const res  = await fetch(`${API_BASE_URL}/api/profile/check-availability`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ field: "username", value: value.trim(), current_wallet: address.toLowerCase() }),
      })
      const data = await res.json()
      if (!data.available) { setUsernameError(data.message); return false }
      setUsernameError(null); return true
    } catch { return true }
  }

  // ── Save profile ─────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!isConnected || !address || !signer) return toast.error("Wallet not connected")
    setSaving(true)
    const valid = await checkUsernameUniqueness(formData.username || "")
    if (!valid) { setSaving(false); return }
    try {
      const nonce     = Math.floor(Math.random() * 1_000_000).toString()
      const message   = `Update Profile\nWallet: ${address}\nNonce: ${nonce}`
      const signature = await signer.signMessage(message)
      const res = await fetch(`${API_BASE_URL}/api/profile/update`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          wallet_address: address,
          username: formData.username, bio: formData.bio,
          avatar_url: formData.avatar_url, signature, message, nonce,
        }),
      })
      if (!res.ok) throw new Error("Update failed")
      toast.success("Profile saved!")
      setIsOpen(false)
      window.dispatchEvent(new Event("profileUpdated"))
      if (formData.username) router.push(`/dashboard/${formData.username}`)
    } catch {
      toast.error("Could not save profile")
    } finally {
      setSaving(false)
    }
  }

  // ── File upload ──────────────────────────────────────────────────────
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const body = new FormData()
      body.append("file", file)
      const res  = await fetch(`${API_BASE_URL}/upload-image`, { method: "POST", body })
      const data = await res.json()
      if (data.success) { setFormData(prev => ({ ...prev, avatar_url: data.imageUrl })); toast.success("Image uploaded") }
      else throw new Error(data.message)
    } catch (err: any) {
      toast.error(`Upload failed: ${err.message}`)
    } finally {
      setUploading(false)
    }
  }

  const currentSeeds = GENERATED_SEEDS.slice(seedOffset, seedOffset + 8)

  // ── Social row ───────────────────────────────────────────────────────
  const SocialRow = ({ provider }: { provider: SocialProvider }) => {
    const linked = effectiveLinked.has(provider)
    const busy   = linkingProvider === provider
    const meta   = PROVIDER_META[provider] ?? { label: provider, icon: "🔗" }
    return (
      <div className="flex items-center justify-between p-3 border rounded-lg bg-card/50 hover:bg-card/80 transition-colors">
        <div className="flex items-center gap-2">
          <span className="text-lg">{meta.icon}</span>
          <div className="flex flex-col gap-0.5">
            <span className="text-sm font-semibold">{meta.label}</span>
            <span className="text-xs">
              {linked
                ? <span className="text-green-600 flex items-center gap-1 font-medium"><CheckCircle2 className="h-3 w-3" /> Connected</span>
                : <span className="text-muted-foreground">Not connected</span>}
            </span>
          </div>
        </div>
        {linked ? (
          <Button size="sm" variant="ghost" type="button" disabled={busy || !!linkingProvider}
            className="text-red-500 hover:text-red-600 hover:bg-red-50 shrink-0"
            onClick={() => handleUnlinkSocial(provider)}>
            {busy && <Loader2 className="h-3 w-3 animate-spin mr-1" />}
            {busy ? "Removing…" : "Disconnect"}
          </Button>
        ) : (
          <Button size="sm" variant="outline" type="button" disabled={busy || !!linkingProvider}
            className="shrink-0" onClick={() => handleLinkSocial(provider)}>
            {busy && <Loader2 className="h-3 w-3 animate-spin mr-1" />}
            {busy ? "Connecting…" : "Connect"}
          </Button>
        )}
      </div>
    )
  }

  // ── Render ───────────────────────────────────────────────────────────
  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full bg-background shadow-sm hover:bg-muted">
          <Edit2 className="h-4 w-4" />
        </Button>
      </DialogTrigger>

      <DialogContent className="w-[95%] sm:max-w-[600px] max-h-[90vh] rounded-lg flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-0 shrink-0">
          <DialogTitle>Edit Profile</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 pb-2">
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="flex flex-col gap-6 py-4">

              {/* Avatar */}
              <div className="flex flex-col items-center gap-4 w-full">
                <Avatar className="h-24 w-24 border-2 border-primary/20">
                  <AvatarImage src={formData.avatar_url} className="object-cover" />
                  <AvatarFallback className="text-2xl font-bold">{formData.username?.[0] || "?"}</AvatarFallback>
                </Avatar>
                <Tabs defaultValue="generate" className="w-full max-w-sm">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="upload">Upload</TabsTrigger>
                    <TabsTrigger value="generate">Choose Avatar</TabsTrigger>
                  </TabsList>
                  <TabsContent value="upload" className="pt-4">
                    <div className="flex flex-col items-center justify-center border-2 border-dashed rounded-lg p-6 hover:bg-accent/50 transition-colors cursor-pointer relative bg-muted/20">
                      <input type="file" accept="image/*" onChange={handleFileUpload}
                        className="absolute inset-0 opacity-0 cursor-pointer" disabled={uploading} />
                      {uploading ? <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /> : <Upload className="h-8 w-8 text-muted-foreground mb-2" />}
                      <p className="text-xs text-muted-foreground text-center">
                        {uploading ? "Uploading…" : "Tap to upload (max 5 MB)"}
                      </p>
                    </div>
                  </TabsContent>
                  <TabsContent value="generate" className="pt-4">
                    <div className="grid grid-cols-4 gap-3">
                      {currentSeeds.map((seed, idx) => {
                        const url        = `https://api.dicebear.com/9.x/notionists/svg?seed=${seed}`
                        const isSelected = formData.avatar_url === url
                        return (
                          <div key={`${seed}-${idx}`}
                            onClick={() => setFormData(prev => ({ ...prev, avatar_url: url }))}
                            className={`relative aspect-square rounded-full cursor-pointer overflow-hidden border-2 transition-all hover:scale-105 ${
                              isSelected ? "border-primary ring-2 ring-primary/20" : "border-transparent bg-muted"
                            }`}>
                            <img src={url} alt={seed} className="w-full h-full" />
                            {isSelected && (
                              <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                                <Check className="h-5 w-5 text-white" />
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                    <Button variant="ghost" size="sm"
                      onClick={() => setSeedOffset(p => (p + 8) % GENERATED_SEEDS.length)}
                      className="w-full mt-4 text-muted-foreground hover:text-primary gap-2">
                      <RefreshCw className="h-3 w-3" /> Shuffle
                    </Button>
                  </TabsContent>
                </Tabs>
              </div>

              {/* Username + Bio */}
              <div className="grid gap-4">
                <div className="grid grid-cols-1 sm:grid-cols-4 items-start gap-2">
                  <Label className="sm:text-right pt-2">Username</Label>
                  <div className="col-span-3">
                    <Input
                      value={formData.username}
                      onChange={e => { setFormData(p => ({ ...p, username: e.target.value })); setUsernameError(null) }}
                      onBlur={() => checkUsernameUniqueness(formData.username)}
                      className={usernameError ? "border-red-500" : ""}
                    />
                    {usernameError
                      ? <p className="text-xs text-red-500 mt-1">{usernameError}</p>
                      : formData.username && (
                          <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                            <CheckCircle2 className="h-3 w-3" /> Available
                          </p>
                        )}
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-4 items-start gap-2">
                  <Label className="sm:text-right pt-2">Bio</Label>
                  <Textarea value={formData.bio}
                    onChange={e => setFormData(p => ({ ...p, bio: e.target.value }))}
                    className="col-span-3" placeholder="Tell us about yourself…" />
                </div>
              </div>

              {/* Linked Wallets */}
              <div className="border-t pt-6">
                <h4 className="mb-3 text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                  <Wallet className="h-3 w-3" /> Linked Wallets
                </h4>
                <div className="grid gap-3">
                  {address && <WalletAddressRow chain="evm" address={address} />}

                  <WalletAddressRow
                    chain="solana"
                    address={effectiveSol}
                    onLink={!isEmbedded ? handleLinkAddress : undefined}
                  />
                  <WalletAddressRow
                    chain="stellar"
                    address={effectiveXlm}
                    onLink={!isEmbedded ? handleLinkAddress : undefined}
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-3 px-1">
                  {isEmbedded
                    ? "All addresses are derived from your seed phrase."
                    : "Link your Solana and Stellar wallets to receive multi-chain rewards."}
                </p>
              </div>

              {/* Verified Connections */}
              <div className="border-t pt-6">
                <h4 className="mb-4 text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                  <LinkIcon className="h-3 w-3" /> Verified Connections
                </h4>
                <div className="grid gap-3">
                  <SocialRow provider="google"    />
                  <SocialRow provider="twitter"   />
                  <SocialRow provider="github"    />
                  <SocialRow provider="discord"   />
                  <SocialRow provider="farcaster" />
                </div>
                <p className="text-xs text-muted-foreground mt-3">
                  Linked accounts let you sign in from any device and always land on the same wallet.
                </p>
              </div>

            </div>
          )}
        </div>

        <div className="shrink-0 px-6 pt-2 pb-6 border-t bg-background">
          <Button onClick={handleSave} disabled={saving || loading || !!usernameError} className="w-full">
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            {saving ? "Saving…" : "Save Profile"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}