"use client"

import { useState, useEffect, useRef } from "react"
import { createPortal } from "react-dom"
import {
  Loader2, CheckCircle2, AlertTriangle, X,
  KeyRound, BookKey, Wallet, ArrowRight, ExternalLink,
} from "lucide-react"
import { useWallet, API_BASE } from "@/components/wallet-provider"
import { usePrivy, useWallets, useExportWallet, useLoginWithOAuth } from "@privy-io/react-auth"
import { toast } from "sonner"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Step = "intro" | "export-prompt" | "paste" | "importing" | "done" | "error"

export interface PrivyImportModalProps {
  onDismiss?: () => void
  onComplete?: (result: { evmAddress?: string; solanaAddress?: string; stellarAddress?: string }) => void
}

// ---------------------------------------------------------------------------
// Provider map
// ---------------------------------------------------------------------------

const PROVIDER_MAP: Record<string, "google" | "twitter" | "discord" | "github"> = {
  google:  "google",
  twitter: "twitter",
  discord: "discord",
  github:  "github",
}

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

function clearImportSessionKey(address?: string | null) {
  if (typeof window === "undefined") return
  if (address) {
    sessionStorage.removeItem(`privy_import_dismissed_${address}`)
  } else {
    Object.keys(sessionStorage)
      .filter(k => k.startsWith("privy_import_dismissed_"))
      .forEach(k => sessionStorage.removeItem(k))
  }
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function PrivyImportModal({ onDismiss, onComplete }: PrivyImportModalProps) {
  // ── Always read session live — never destructure token/address at top level
  //    to avoid stale-closure bugs when a different user logs in mid-flow.
  const { session, isConnected, clearLegacy } = useWallet()

  // Derive everything from live `session` so we never hold stale references
  const legacyFound     = session?.legacyFound      ?? false
  const legacyEvmAddr   = session?.legacyEvmAddress ?? null
  const legacySolAddr   = session?.legacySolAddress ?? null
  const socialProvider  = session?.provider ?? "google"
  const privyProvider   = PROVIDER_MAP[socialProvider]
  const needsSeedImport = session?.needsSeedImport ?? false

  // ── Privy hooks ──────────────────────────────────────────────────────────
  const { ready, authenticated, user } = usePrivy()
  const { wallets }      = useWallets()
  const { exportWallet } = useExportWallet()
  const { initOAuth, state: oauthState } = useLoginWithOAuth({
    onError: () => {
      setAutoLoginAttempted(true)
      setAutoLoginFailed(true)
    },
  })

  // ── Local state ──────────────────────────────────────────────────────────
  const [open,               setOpen]               = useState(false)
  const [step,               setStep]               = useState<Step>("intro")
  const [mnemonic,           setMnemonic]           = useState("")
  const [exporting,          setExporting]          = useState(false)
  const [errorMsg,           setErrorMsg]           = useState("")
  const [resultEvm,          setResultEvm]          = useState("")
  const [resultSolana,       setResultSolana]       = useState("")
  const [resultStellar,      setResultStellar]      = useState("")
  const [autoLoginAttempted, setAutoLoginAttempted] = useState(false)
  const [autoLoginFailed,    setAutoLoginFailed]    = useState(false)
  const [mounted,            setMounted]            = useState(false)
  const [justExported,       setJustExported]       = useState(false)

  const attemptedRef      = useRef(false)
  const textareaRef       = useRef<HTMLTextAreaElement>(null)
  // Track the address that was active when the modal opened so we can detect
  // a mid-flow account switch and reset cleanly.
  const mountedAddressRef = useRef<string | null>(null)

  const embeddedWallet = wallets.find(w => w.walletClientType === "privy")
  const addressMatches =
    !!embeddedWallet && !!legacyEvmAddr &&
    embeddedWallet.address.toLowerCase() === legacyEvmAddr.toLowerCase()

  // ── Mount ────────────────────────────────────────────────────────────────
  useEffect(() => setMounted(true), [])

  // ── Auto-open ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isConnected || !legacyFound || !session?.address) return
    const key = `privy_import_dismissed_${session.address}`
    if (sessionStorage.getItem(key)) return
    const t = setTimeout(() => {
      mountedAddressRef.current = session.address   // record who opened it
      setOpen(true)
    }, 1500)
    return () => clearTimeout(t)
  }, [isConnected, legacyFound, session?.address])

  // ── CRITICAL: reset modal when a different account logs in mid-flow ──────
  useEffect(() => {
    if (!session?.address) return
    if (mountedAddressRef.current === null) return  // modal hasn't opened yet

    if (mountedAddressRef.current !== session.address) {
      // A different user took over — wipe all state and close silently
      setOpen(false)
      setStep("intro")
      setMnemonic("")
      setErrorMsg("")
      setResultEvm("")
      setResultSolana("")
      setResultStellar("")
      setJustExported(false)
      setAutoLoginAttempted(false)
      setAutoLoginFailed(false)
      attemptedRef.current = false
      mountedAddressRef.current = session.address
    }
  }, [session?.address])

  // ── Auto-focus textarea whenever paste step is active ───────────────────
  useEffect(() => {
    if (step === "paste") {
      const t = setTimeout(() => textareaRef.current?.focus(), 80)
      return () => clearTimeout(t)
    }
  }, [step])

  // ── Auto-trigger Privy OAuth on export-prompt ────────────────────────────
  useEffect(() => {
    if (!open || step !== "export-prompt") return
    if (!ready || authenticated) return
    if (attemptedRef.current) return
    if (!privyProvider) {
      setAutoLoginAttempted(true)
      setAutoLoginFailed(true)
      return
    }
    attemptedRef.current = true
    initOAuth({ provider: privyProvider }).catch((err: any) => {
      const msg = err?.message ?? ""
      setAutoLoginAttempted(true)
      if (!msg.includes("cancel") && !msg.includes("closed")) setAutoLoginFailed(true)
    })
  }, [open, step, ready, authenticated, privyProvider, initOAuth])

  useEffect(() => {
    if (oauthState.status === "done" || oauthState.status === "error") {
      setAutoLoginAttempted(true)
      if (oauthState.status === "error") setAutoLoginFailed(true)
    }
  }, [oauthState.status])

  // ── Helpers ──────────────────────────────────────────────────────────────
  const dismiss = () => {
    setOpen(false)
    if (session?.address) {
      sessionStorage.setItem(`privy_import_dismissed_${session.address}`, "1")
    }
    clearLegacy()
    onDismiss?.()
  }

  const handleExport = async () => {
    if (!embeddedWallet) {
      toast.error("No embedded wallet found on this account.")
      return
    }
    setExporting(true)
    try {
      await exportWallet({ address: embeddedWallet.address })
    } catch (err: any) {
      const msg = err?.message ?? ""
      if (!msg.includes("closed") && !msg.includes("cancel")) {
        toast.error(msg || "Export failed — paste your phrase manually below.")
      }
    } finally {
      setExporting(false)
      setJustExported(true)
      setStep("paste")
    }
  }

  const retryAutoLogin = () => {
    if (!privyProvider) return
    setAutoLoginFailed(false)
    setAutoLoginAttempted(false)
    attemptedRef.current = false
    initOAuth({ provider: privyProvider }).catch(() => {
      setAutoLoginAttempted(true)
      setAutoLoginFailed(true)
    })
  }

  const handleImport = async () => {
    // ── Read token and address live from session at call time —
    //    never from a stale closure captured at render.
    const currentToken   = session?.token
    const currentAddress = session?.address

    if (!currentToken || !currentAddress) {
      setErrorMsg("Session expired — please log in again before importing.")
      setStep("error")
      return
    }

    const value = mnemonic.trim()
    const words = value.split(/\s+/).filter(Boolean)

    if (words.length !== 12 && words.length !== 24) {
      setErrorMsg("Seed phrase must be 12 or 24 words.")
      return
    }

    setStep("importing")
    setErrorMsg("")

    try {
      const res = await fetch(`${API_BASE}/wallet/import-privy-seed`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization:  `Bearer ${currentToken}`,   // live token, not stale
        },
        body: JSON.stringify({ mnemonic: value.toLowerCase() }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.detail ?? "Import failed")

      setMnemonic("")
      clearImportSessionKey(currentAddress)

      setResultEvm(data.evm_address ?? "")
      setResultSolana(data.solana_address ?? "")
      setResultStellar(data.stellar_address ?? "")
      setStep("done")

      clearLegacy()
      toast.success("Wallet imported successfully!")
      onComplete?.({
        evmAddress:    data.evm_address,
        solanaAddress: data.solana_address,
        stellarAddress: data.stellar_address,
      })
      window.dispatchEvent(new CustomEvent("privyImportComplete", { detail: data }))
    } catch (err: any) {
      setMnemonic("")
      clearImportSessionKey(currentAddress)
      setErrorMsg(err.message || "Import failed — check the seed phrase and try again.")
      setStep("error")
    }
  }

  const wordCount = mnemonic.trim().split(/\s+/).filter(Boolean).length

  if (!open || !mounted) return null

  // ── Styles (system color tokens) ─────────────────────────────────────────
  const S = {
    overlay: {
      background:     "rgba(0,0,0,0.6)",
      backdropFilter: "blur(8px)",
    } as React.CSSProperties,
    card: {
      background: "var(--background, #09090b)",
      border:     "1px solid var(--border, rgba(255,255,255,0.08))",
      boxShadow:  "0 24px 64px rgba(0,0,0,0.5)",
      color:      "var(--foreground, #fafafa)",
    } as React.CSSProperties,
    iconRing: {
      background: "var(--muted, rgba(255,255,255,0.06))",
      border:     "1px solid var(--border, rgba(255,255,255,0.1))",
    } as React.CSSProperties,
    btnPrimary: {
      background: "var(--primary, #fafafa)",
      color:      "var(--primary-foreground, #09090b)",
    } as React.CSSProperties,
    btnGhost: {
      background: "var(--muted, rgba(255,255,255,0.05))",
      border:     "1px solid var(--border, rgba(255,255,255,0.08))",
      color:      "var(--muted-foreground, rgba(255,255,255,0.4))",
    } as React.CSSProperties,
    input: {
      background: "var(--muted, rgba(255,255,255,0.04))",
      border:     "1px solid var(--border, rgba(255,255,255,0.1))",
      color:      "var(--foreground, #fafafa)",
    } as React.CSSProperties,
    chip: {
      background: "var(--muted, rgba(255,255,255,0.06))",
      border:     "1px solid var(--border, rgba(255,255,255,0.08))",
    } as React.CSSProperties,
    success:  { color: "var(--chart-2, #22c55e)" }                      as React.CSSProperties,
    warning:  { color: "var(--chart-4, #f59e0b)" }                      as React.CSSProperties,
    danger:   { color: "var(--destructive, #ef4444)" }                   as React.CSSProperties,
    muted:    { color: "var(--muted-foreground, rgba(255,255,255,0.45))" } as React.CSSProperties,
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[999] flex items-center justify-center p-4"
      style={S.overlay}
      onClick={e => { if (e.target === e.currentTarget) dismiss() }}
    >
      <div
        className="relative w-full max-w-[400px] rounded-2xl overflow-hidden"
        style={S.card}
      >
        {/* Close button — hidden during importing or when import is mandatory */}
        {step !== "importing" && !needsSeedImport && (
          <button
            onClick={dismiss}
            className="absolute top-4 right-4 z-10 h-8 w-8 rounded-full flex items-center justify-center transition-colors"
            style={{ color: "var(--muted-foreground, rgba(255,255,255,0.35))" }}
            onMouseOver={e => (e.currentTarget.style.background = "var(--muted, rgba(255,255,255,0.08))")}
            onMouseOut={e =>  (e.currentTarget.style.background = "transparent")}
          >
            <X className="h-4 w-4" />
          </button>
        )}

        <div className="p-6">

          {/* ── Intro ──────────────────────────────────────────────────── */}
          {step === "intro" && (
            <>
              <div className="mb-6 text-center">
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3"
                  style={S.iconRing}
                >
                  <Wallet size={20} style={S.muted} />
                </div>
                <h2 className="text-base font-semibold" style={{ color: "var(--foreground, #fafafa)" }}>
                  Legacy wallet found
                </h2>
                <p className="text-xs mt-2 leading-relaxed" style={S.muted}>
                  {needsSeedImport
                    ? "Your address is linked but needs a seed phrase to activate. Without it you can't sign transactions."
                    : `Your ${socialProvider} account was previously linked to a Privy embedded wallet.`}
                </p>
              </div>

              {(legacyEvmAddr || legacySolAddr) && (
                <div className="mb-5 rounded-xl p-3 space-y-2" style={S.chip}>
                  <p
                    className="text-[10px] font-semibold uppercase tracking-wider mb-2"
                    style={S.muted}
                  >
                    Legacy addresses
                  </p>
                  {legacyEvmAddr && <AddressRow label="EVM"    addr={legacyEvmAddr} chipStyle={S.chip} />}
                  {legacySolAddr && <AddressRow label="Solana" addr={legacySolAddr} chipStyle={S.chip} />}
                </div>
              )}

              <p className="text-xs leading-relaxed mb-6" style={S.muted}>
                Import to keep the same addresses with full self-custody.
                Your seed phrase is encrypted in transit and never stored in plain text.
              </p>

              <Btn primary style={S.btnPrimary} onClick={() => setStep("export-prompt")}>
                Import wallet <ArrowRight size={14} />
              </Btn>
              {!needsSeedImport && (
                <Btn style={S.btnGhost} className="mt-2" onClick={dismiss}>
                  Skip for now
                </Btn>
              )}
            </>
          )}

          {/* ── Export prompt ─────────────────────────────────────────── */}
          {step === "export-prompt" && (
            <>
              <div className="mb-5 text-center">
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3"
                  style={S.iconRing}
                >
                  <BookKey size={20} style={S.muted} />
                </div>
                <h2 className="text-base font-semibold" style={{ color: "var(--foreground, #fafafa)" }}>
                  Export your seed phrase
                </h2>
                <p className="text-xs mt-1" style={S.muted}>
                  Open your old Privy wallet, copy the phrase, then come back here.
                </p>
              </div>

              <ol className="space-y-3 mb-5">
                {[
                  `Sign in with ${socialProvider} (done automatically below)`,
                  `In the Privy dialog, click "Copy Phrase"`,
                  "Close the dialog — we'll show the paste field immediately",
                ].map((text, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <span
                      className="w-5 h-5 rounded-full text-[10px] flex items-center justify-center shrink-0 mt-0.5 font-medium"
                      style={{ ...S.chip, ...S.muted }}
                    >
                      {i + 1}
                    </span>
                    <span className="text-xs leading-relaxed" style={S.muted}>{text}</span>
                  </li>
                ))}
              </ol>

              {/* Privy auth state card */}
              <div className="rounded-xl p-4 mb-4" style={S.chip}>
                {!ready || oauthState.status === "loading" ? (
                  <div className="flex items-center gap-2 text-xs" style={S.muted}>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Signing in with {socialProvider}…
                  </div>
                ) : !authenticated ? (
                  autoLoginFailed ? (
                    <div className="space-y-2">
                      <p className="text-xs" style={S.muted}>
                        Couldn't sign in automatically with {socialProvider}.
                      </p>
                      {privyProvider ? (
                        <Btn style={S.btnGhost} onClick={retryAutoLogin}>
                          <KeyRound size={13} /> Retry sign-in
                        </Btn>
                      ) : (
                        <p className="text-xs" style={S.muted}>
                          {socialProvider} isn't supported for automatic export.
                          Contact support to recover your wallet.
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-xs" style={S.muted}>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Connecting…
                    </div>
                  )
                ) : !embeddedWallet ? (
                  <p className="text-xs" style={S.muted}>
                    Signed in{user?.email?.address ? ` as ${user.email.address}` : ""}, but
                    no embedded wallet was found on this account.
                  </p>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs" style={S.muted}>Embedded wallet found</span>
                      <AddressChip addr={embeddedWallet.address} chipStyle={S.chip} />
                    </div>

                    {legacyEvmAddr && (
                      addressMatches ? (
                        <p className="text-[11px] flex items-center gap-1" style={S.success}>
                          <CheckCircle2 size={12} /> Address matches
                        </p>
                      ) : (
                        <p className="text-[11px] flex items-center gap-1" style={S.warning}>
                          <AlertTriangle size={12} />
                          Doesn't match expected ({legacyEvmAddr.slice(0, 6)}…{legacyEvmAddr.slice(-4)})
                        </p>
                      )
                    )}

                    <Btn
                      primary
                      style={S.btnPrimary}
                      disabled={exporting}
                      onClick={handleExport}
                    >
                      {exporting
                        ? <><Loader2 size={14} className="animate-spin" /> Opening…</>
                        : <><ExternalLink size={14} /> Export seed phrase</>}
                    </Btn>
                  </div>
                )}
              </div>

              {/* Skip-to-paste for users who already have it copied */}
              <button
                className="w-full py-2 text-xs transition-opacity hover:opacity-100 opacity-40"
                style={S.muted}
                onClick={() => setStep("paste")}
              >
                Click to Paste Seed phrase
              </button>
              <button
                className="w-full py-1 text-xs transition-opacity hover:opacity-60 opacity-25"
                style={S.muted}
                onClick={() => setStep("intro")}
              >
                ← Back
              </button>
            </>
          )}

          {/* ── Paste ─────────────────────────────────────────────────── */}
          {step === "paste" && (
            <>
              <div className="mb-4 flex items-center gap-3">
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
                  style={S.iconRing}
                >
                  <BookKey size={16} style={S.muted} />
                </div>
                <div>
                  <p className="text-sm font-semibold" style={{ color: "var(--foreground, #fafafa)" }}>
                    Paste your seed phrase
                  </p>
                  <p className="text-[11px]" style={S.muted}>12 or 24 words, separated by spaces</p>
                </div>
              </div>

              {/* Banner shown only when arriving here right after export */}
              {justExported && (
                <div
                  className="flex items-center gap-2 rounded-lg px-3 py-2 mb-3 text-[11px]"
                  style={{ ...S.chip, ...S.success }}
                >
                  <CheckCircle2 size={13} className="shrink-0" />
                  Privy closed — paste your copied phrase below
                </div>
              )}

              <textarea
                ref={textareaRef}
                value={mnemonic}
                onChange={e => setMnemonic(e.target.value)}
                placeholder="word1 word2 word3 … word12"
                rows={4}
                className="w-full px-3 py-2.5 rounded-xl text-xs font-mono resize-none mb-2 focus:outline-none transition-colors"
                style={{
                  ...S.input,
                  boxShadow: mnemonic ? "0 0 0 1px var(--ring, rgba(255,255,255,0.2))" : undefined,
                }}
                autoComplete="off"
                autoCorrect="off"
                spellCheck={false}
              />

              <div className="flex items-center justify-between mb-4">
                <p
                  className="text-[11px]"
                  style={wordCount >= 12 ? S.success : S.muted}
                >
                  {wordCount} / 12 words {wordCount >= 12 && "✓"}
                </p>
                <p className="flex items-center gap-1 text-[11px]" style={S.warning}>
                  <AlertTriangle size={11} />
                  Never share this phrase elsewhere
                </p>
              </div>

              {errorMsg && (
                <p className="text-xs mb-3" style={S.danger}>{errorMsg}</p>
              )}

              <Btn
                primary
                style={S.btnPrimary}
                disabled={wordCount < 12}
                onClick={handleImport}
              >
                Import wallet
              </Btn>
              <button
                className="w-full mt-2 py-2 text-xs transition-opacity hover:opacity-60 opacity-30"
                style={S.muted}
                onClick={() => { setJustExported(false); setStep("export-prompt") }}
              >
                ← Back
              </button>
            </>
          )}

          {/* ── Importing ─────────────────────────────────────────────── */}
          {step === "importing" && (
            <div className="text-center py-10">
              <Loader2 className="animate-spin mx-auto mb-4" size={32} style={S.muted} />
              <p className="text-sm" style={{ color: "var(--foreground, #fafafa)" }}>Importing your wallet…</p>
              <p className="text-xs mt-2" style={S.muted}>Deriving EVM · Solana · Stellar</p>
            </div>
          )}

          {/* ── Done ──────────────────────────────────────────────────── */}
          {step === "done" && (
            <div className="text-center py-4">
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3"
                style={S.iconRing}
              >
                <CheckCircle2 size={22} style={S.success} />
              </div>
              <p className="text-base font-semibold mb-1" style={{ color: "var(--foreground, #fafafa)" }}>
                Wallet imported
              </p>
              <p className="text-xs mb-5" style={S.muted}>
                You now have full self-custody of your addresses.
              </p>

              <div className="space-y-2 text-left mb-6">
                {resultEvm     && <AddressResult label="EVM"     addr={resultEvm}     chipStyle={S.chip} />}
                {resultSolana  && <AddressResult label="Solana"  addr={resultSolana}  chipStyle={S.chip} />}
                {resultStellar && <AddressResult label="Stellar" addr={resultStellar} chipStyle={S.chip} />}
              </div>

              <Btn style={S.btnGhost} onClick={() => { setOpen(false); onDismiss?.() }}>
                Done
              </Btn>
            </div>
          )}

          {/* ── Error ─────────────────────────────────────────────────── */}
          {step === "error" && (
            <div className="text-center py-6">
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3"
                style={S.iconRing}
              >
                <AlertTriangle size={22} style={S.danger} />
              </div>
              <p className="text-sm mb-6 leading-relaxed px-2" style={S.danger}>{errorMsg}</p>
              <Btn style={S.btnGhost} onClick={() => { setStep("paste"); setErrorMsg("") }}>
                Try again
              </Btn>
            </div>
          )}

        </div>
      </div>
    </div>,
    document.body,
  )
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function Btn({
  children,
  onClick,
  disabled,
  primary,
  style,
  className = "",
}: {
  children:  React.ReactNode
  onClick?:  () => void
  disabled?: boolean
  primary?:  boolean
  style:     React.CSSProperties
  className?: string
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`w-full py-2.5 rounded-xl text-sm font-medium flex items-center justify-center gap-2 transition-opacity ${disabled ? "opacity-40 cursor-not-allowed" : "hover:opacity-90"} ${className}`}
      style={style}
    >
      {children}
    </button>
  )
}

function AddressChip({ addr, chipStyle }: { addr: string; chipStyle: React.CSSProperties }) {
  return (
    <span
      className="text-[10px] font-mono px-2 py-0.5 rounded"
      style={{ ...chipStyle, color: "var(--foreground, #fafafa)" }}
    >
      {addr.slice(0, 6)}…{addr.slice(-4)}
    </span>
  )
}

function AddressRow({
  label,
  addr,
  chipStyle,
}: {
  label:     string
  addr:      string
  chipStyle: React.CSSProperties
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs" style={{ color: "var(--muted-foreground, rgba(255,255,255,0.4))" }}>
        {label}
      </span>
      <AddressChip addr={addr} chipStyle={chipStyle} />
    </div>
  )
}

function AddressResult({
  label,
  addr,
  chipStyle,
}: {
  label:     string
  addr:      string
  chipStyle: React.CSSProperties
}) {
  return (
    <div className="px-3 py-2.5 rounded-xl" style={chipStyle}>
      <p
        className="text-[10px] mb-1 uppercase tracking-wider font-medium"
        style={{ color: "var(--muted-foreground, rgba(255,255,255,0.35))" }}
      >
        {label}
      </p>
      <p
        className="text-xs font-mono break-all"
        style={{ color: "var(--foreground, #fafafa)" }}
      >
        {addr}
      </p>
    </div>
  )
}