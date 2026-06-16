"use client"

import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Loader2, Wallet, Sparkles, ExternalLink, CheckCircle2 } from "lucide-react"
import { useSolanaWallet } from "@/hooks/use-solana"

interface SolanaConnectModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /**
   * Called after a Solana wallet is successfully resolved.
   * Receives the address and whether it's embedded or external.
   */
  onConnected?: (address: string, type: "external" | "embedded") => void
}

export function SolanaConnectModal({
  open,
  onOpenChange,
  onConnected,
}: SolanaConnectModalProps) {
  const {
    connectOrSwitchSolana,
    activeSolanaAccount,
    hasExternalSolana,
    hasEmbeddedSolana,
    isEmbeddedUser,
    isLinking,
    solanaAddress,
  } = useSolanaWallet()

  const [isConnecting, setIsConnecting] = useState(false)
  const [justLinked, setJustLinked] = useState(false)

  // Watch for the wallet appearing after the linkWallet popup resolves
  useEffect(() => {
    if (justLinked && solanaAddress) {
      setJustLinked(false)
      onConnected?.(solanaAddress, hasExternalSolana ? "external" : "embedded")
      onOpenChange(false)
    }
  }, [justLinked, solanaAddress, hasExternalSolana, onConnected, onOpenChange])

  const handleConnectExternal = async () => {
    setIsConnecting(true)
    const result = await connectOrSwitchSolana()
    setIsConnecting(false)

    if (result.status === "connected") {
      onConnected?.(result.address, result.type)
      onOpenChange(false)
    } else if (result.status === "linking") {
      // Popup opened — wait for the wallet to appear via useEffect above
      setJustLinked(true)
    }
    // "cancelled" / "error" → stay open, user can try again
  }

  const handleUseEmbedded = async () => {
    setIsConnecting(true)
    const result = await connectOrSwitchSolana()
    setIsConnecting(false)

    if (result.status === "connected") {
      onConnected?.(result.address, result.type)
      onOpenChange(false)
    }
  }

  // ── For embedded users the modal should never be needed, but guard anyway ──
  if (isEmbeddedUser) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95%] sm:max-w-[440px] rounded-xl p-0 overflow-hidden">
        {/* Header band */}
        <div className="bg-gradient-to-br from-[#9945FF] to-[#14F195] p-6 pb-8">
          <div className="flex items-center gap-3 mb-3">
            <div className="h-10 w-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
              <img src="/solana.png" alt="Solana" className="h-6 w-6" onError={(e) => { (e.target as HTMLImageElement).style.display = "none" }} />
            </div>
            <div>
              <DialogTitle className="text-white text-lg font-bold leading-none">
                Connect to Solana
              </DialogTitle>
              <DialogDescription className="text-white/70 text-xs mt-0.5">
                Switch your active wallet to Solana
              </DialogDescription>
            </div>
          </div>
        </div>

        <div className="px-6 py-5 flex flex-col gap-4 -mt-4">

          {/* ── Option A: link / use external Solana wallet ─────────────────── */}
          <div
            className={`relative rounded-xl border-2 p-4 transition-all cursor-pointer group
              ${hasExternalSolana
                ? "border-[#14F195]/40 bg-[#14F195]/5 hover:border-[#14F195]/70"
                : "border-border hover:border-primary/40 hover:bg-muted/50"
              }`}
            onClick={!isConnecting ? handleConnectExternal : undefined}
          >
            {hasExternalSolana && (
              <Badge className="absolute -top-2.5 right-3 text-[10px] bg-[#14F195] text-black font-bold">
                Connected
              </Badge>
            )}

            <div className="flex items-start gap-3">
              <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-purple-500/20 to-teal-400/20 flex items-center justify-center shrink-0 mt-0.5">
                <ExternalLink className="h-4 w-4 text-purple-400" />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="font-semibold text-sm text-foreground">
                    {hasExternalSolana ? "External Solana Wallet" : "Link a Solana Wallet"}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {hasExternalSolana
                    ? `${solanaAddress?.slice(0, 6)}…${solanaAddress?.slice(-4)} — click to switch`
                    : "Connect Phantom, Solflare, Backpack, or any Solana wallet"}
                </p>
              </div>

              {isConnecting && !isLinking && (
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground shrink-0" />
              )}
              {hasExternalSolana && !isConnecting && (
                <CheckCircle2 className="h-4 w-4 text-[#14F195] shrink-0" />
              )}
              {isLinking && (
                <Loader2 className="h-4 w-4 animate-spin text-purple-400 shrink-0" />
              )}
            </div>

            {isLinking && (
              <p className="text-xs text-purple-400 mt-2 ml-12">
                Wallet picker is open — select your Solana wallet…
              </p>
            )}
          </div>

          {/* ── Option B: use embedded Solana wallet (if one exists) ─────────── */}
          {hasEmbeddedSolana && (
            <div
              className="relative rounded-xl border-2 border-border hover:border-primary/40 hover:bg-muted/50 p-4 transition-all cursor-pointer"
              onClick={!isConnecting ? handleUseEmbedded : undefined}
            >
              <div className="flex items-start gap-3">
                <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-blue-500/20 to-purple-400/20 flex items-center justify-center shrink-0 mt-0.5">
                  <Sparkles className="h-4 w-4 text-blue-400" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="font-semibold text-sm text-foreground">
                      Use Embedded Wallet
                    </span>
                    <Badge variant="secondary" className="text-[10px]">Auto-generated</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    A Solana wallet was automatically created for your account — use it without installing anything
                  </p>
                </div>

                {isConnecting && (
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground shrink-0" />
                )}
              </div>
            </div>
          )}

          {/* Divider hint when neither exists yet */}
          {!hasExternalSolana && !hasEmbeddedSolana && (
            <p className="text-xs text-center text-muted-foreground px-2">
              You'll be prompted to approve the wallet connection in a popup window.
            </p>
          )}

          <Button
            variant="ghost"
            size="sm"
            className="w-full text-muted-foreground hover:text-foreground"
            onClick={() => onOpenChange(false)}
            disabled={isConnecting || isLinking}
          >
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}