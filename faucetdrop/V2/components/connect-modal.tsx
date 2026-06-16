"use client"

import { useState, useEffect, useCallback } from "react"
import { createPortal } from "react-dom"
import { useWallet, type SocialProvider, API_BASE } from "./wallet-provider"
import { X, Loader2, ChevronRight, Shield, Fingerprint } from "lucide-react"
import { cn } from "@/lib/utils"

// ─────────────────────────────────────────────────────────────────────────────
// Social providers config
// ─────────────────────────────────────────────────────────────────────────────

const SOCIALS: { id: SocialProvider; label: string; icon: string; color: string; bg: string }[] = [
  { id: "google",    label: "Google",    icon: "G",  color: "#EA4335", bg: "rgba(234,67,53,0.08)"  },
  { id: "twitter",   label: "Twitter/X", icon: "𝕏",  color: "#000000", bg: "rgba(0,0,0,0.06)"     },
  { id: "github",    label: "GitHub",    icon: "⌥",  color: "#c9c9c9", bg: "rgba(255,255,255,0.10)" },
  { id: "discord",   label: "Discord",   icon: "⌨",  color: "#5865F2", bg: "rgba(88,101,242,0.08)" },
  { id: "telegram",  label: "Telegram",  icon: "✈",  color: "#2AABEE", bg: "rgba(42,171,238,0.08)" },
  { id: "farcaster", label: "Farcaster", icon: "⬡",  color: "#8B5CF6", bg: "rgba(139,92,246,0.08)" },
]

// ─────────────────────────────────────────────────────────────────────────────

interface ConnectModalProps {
  onSuccess?: () => void
}

export function ConnectModal({ onSuccess }: ConnectModalProps) {
  const {
    showModal, setShowModal,
    detectedWallets, connectExternalWallet, connectSocial,
    isConnecting,
  } = useWallet()

  const [tab,       setTab]       = useState<"social" | "wallet">("social")
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [mounted,   setMounted]   = useState(false)

  useEffect(() => setMounted(true), [])

  // ── Social login ──────────────────────────────────────────────────────────
  const handleSocial = useCallback((providerId: SocialProvider) => {
    if (providerId === "passkey") { handlePasskey(); return }

    setLoadingId(providerId)

    const state = crypto.randomUUID()
    const w = window.open(
      `${API_BASE}/api/auth/${providerId}?client_state=${state}`,
      "oauth",
      "width=500,height=700,left=200,top=100",
    )

    if (!w) {
      setLoadingId(null)
      return
    }

    let settled = false

    const settle = (cancelled = false) => {
      if (settled) return
      settled = true
      clearInterval(pollId)
      if (cancelled) setLoadingId(null)
    }

    // Single interval: always check session first, then check closed.
    // This avoids the race where window.close() fires and we mistake it
    // for a user cancellation before the session poll resolves.
    const pollId = setInterval(async () => {
      // ── 1. Always try the session endpoint first ──────────────────────
      try {
        const res  = await fetch(`${API_BASE}/api/auth/session?state=${state}`)
        if (res.ok) {
          const data = await res.json()
          if (data.status === "done") {
            // Success — popup already closed itself via window.close()
            settle(false)
            setLoadingId(null)
            try { w.close() } catch {}
            await connectSocial(data.provider as SocialProvider, data.credential)
            onSuccess?.()
            return
          }
        }
      } catch {
        // Network hiccup — keep polling
      }

      // ── 2. Only treat closed popup as cancellation if session is still
      //       pending (i.e. we didn't just succeed above) ─────────────────
      try {
        if (w.closed) settle(true)   // user manually closed without completing OAuth
      } catch {
        // Cross-origin frame check can throw — ignore
      }
    }, 800)

    // Safety timeout: 3 minutes
    setTimeout(() => {
      try { w.close() } catch {}
      settle(true)
    }, 180_000)
  }, [connectSocial, onSuccess])

  // ── Passkey ───────────────────────────────────────────────────────────────
  const handlePasskey = useCallback(async () => {
    setLoadingId("passkey")
    try {
      const credential = await navigator.credentials.create({
        publicKey: {
          challenge:  crypto.getRandomValues(new Uint8Array(32)),
          rp:         { name: "FaucetDrops" },
          user:       {
            id:          crypto.getRandomValues(new Uint8Array(16)),
            name:        "user",
            displayName: "User",
          },
          pubKeyCredParams: [{ alg: -7, type: "public-key" }],
          authenticatorSelection: {
            authenticatorAttachment: "platform",
            userVerification:        "required",
          },
        },
      }) as PublicKeyCredential
      await connectSocial("passkey", credential.id)
      onSuccess?.()
    } catch {
      // User cancelled or not supported
    } finally {
      setLoadingId(null)
    }
  }, [connectSocial, onSuccess])

  // ── External wallet ───────────────────────────────────────────────────────
  const handleExternalWallet = useCallback(async (wallet: typeof detectedWallets[number]) => {
    setLoadingId(wallet.name)
    try {
      await connectExternalWallet(wallet)
      onSuccess?.()
    } finally {
      setLoadingId(null)
    }
  }, [connectExternalWallet, onSuccess])

  if (!showModal || !mounted) return null

  return createPortal(
    <div
      className="fixed inset-0 z-[999] flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.65)", backdropFilter: "blur(6px)" }}
      onClick={e => { if (e.target === e.currentTarget) setShowModal(false) }}
    >
      <div
        className="relative w-full max-w-[400px] overflow-hidden rounded-2xl"
        style={{
          background:  "var(--modal-bg, #0f0f13)",
          border:      "1px solid rgba(255,255,255,0.07)",
          boxShadow:   "0 32px 80px rgba(0,0,0,0.6)",
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4">
          <div>
            <h2 className="text-base font-semibold text-white tracking-tight">Connect</h2>
            <p className="text-xs text-white/40 mt-0.5">Sign in or connect your wallet</p>
          </div>
          <button
            onClick={() => setShowModal(false)}
            className="h-8 w-8 rounded-full flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10 transition-all"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Tab switcher */}
        <div className="px-6 mb-4">
          <div className="flex rounded-xl p-1" style={{ background: "rgba(255,255,255,0.05)" }}>
            {(["social", "wallet"] as const).map(t => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={cn(
                  "flex-1 text-xs font-medium py-2 rounded-lg transition-all capitalize",
                  tab === t ? "bg-white/10 text-white" : "text-white/40 hover:text-white/70",
                )}
              >
                {t === "social" ? "Social Login" : "Browser Wallet"}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="px-6 pb-6 space-y-2">
          {tab === "social" ? (
            <>
              {SOCIALS.map(s => (
                <SocialButton
                  key={s.id}
                  label={s.label}
                  icon={s.icon}
                  color={s.color}
                  bg={s.bg}
                  loading={loadingId === s.id}
                  disabled={!!loadingId}
                  onClick={() => handleSocial(s.id)}
                />
              ))}

              {/* Passkey */}
              <button
                onClick={handlePasskey}
                disabled={!!loadingId}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all",
                  "text-white/80 hover:text-white",
                  "border border-white/10 hover:border-white/20 hover:bg-white/5",
                  loadingId === "passkey" && "opacity-60 pointer-events-none",
                )}
              >
                <span
                  className="h-8 w-8 rounded-lg flex items-center justify-center text-lg"
                  style={{ background: "rgba(255,255,255,0.06)" }}
                >
                  {loadingId === "passkey"
                    ? <Loader2 className="h-4 w-4 animate-spin" />
                    : <Fingerprint className="h-4 w-4" />}
                </span>
                <span className="flex-1 text-left">Passkey</span>
                <ChevronRight className="h-4 w-4 opacity-30" />
              </button>
            </>
          ) : (
            <>
              {detectedWallets.length === 0 ? (
                <div className="text-center py-8">
                  <div className="text-3xl mb-3">🔍</div>
                  <p className="text-sm text-white/50">No wallets detected</p>
                  <p className="text-xs text-white/30 mt-1">Install MetaMask or another browser wallet</p>
                </div>
              ) : (
                detectedWallets.map(w => (
                  <button
                    key={w.name}
                    onClick={() => handleExternalWallet(w)}
                    disabled={!!loadingId}
                    className={cn(
                      "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all",
                      "text-white/80 hover:text-white",
                      "border border-white/10 hover:border-white/20 hover:bg-white/5",
                      loadingId === w.name && "opacity-60 pointer-events-none",
                    )}
                  >
                    <span
                      className="h-8 w-8 rounded-lg flex items-center justify-center text-xl"
                      style={{ background: "rgba(255,255,255,0.06)" }}
                    >
                      {loadingId === w.name ? <Loader2 className="h-4 w-4 animate-spin" /> : w.icon}
                    </span>
                    <span className="flex-1 text-left">{w.name}</span>
                    <ChevronRight className="h-4 w-4 opacity-30" />
                  </button>
                ))
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 pb-5 flex items-center gap-2">
          <Shield className="h-3 w-3 text-white/20 shrink-0" />
          <p className="text-[11px] text-white/25 leading-tight">
            Social logins create a self-custodial wallet. Your encrypted seed phrase is stored securely.
          </p>
        </div>
      </div>
    </div>,
    document.body,
  )
}

// ─────────────────────────────────────────────────────────────────────────────

function SocialButton({
  label, icon, color, bg, loading, disabled, onClick,
}: {
  label: string; icon: string; color: string; bg: string
  loading: boolean; disabled: boolean; onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all",
        "border hover:scale-[1.01] active:scale-[0.99]",
        loading || disabled ? "opacity-60 pointer-events-none" : "cursor-pointer",
      )}
      style={{ color, borderColor: color + "30", background: bg }}
    >
      <span
        className="h-8 w-8 rounded-lg flex items-center justify-center text-base font-bold"
        style={{ background: color + "18" }}
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : icon}
      </span>
      <span className="flex-1 text-left" style={{ color: "rgba(255,255,255,0.85)" }}>
        Continue with {label}
      </span>
      <ChevronRight className="h-4 w-4 opacity-30" />
    </button>
  )
}