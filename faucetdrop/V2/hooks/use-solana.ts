"use client"

import { useCallback, useState } from "react"
import { usePrivy, useWallets } from "@privy-io/react-auth"
import { toast } from "sonner"

export const SOLANA_CHAIN_IDS = new Set([
  101,            // Solana Mainnet (Privy / legacy)
  102,            // Solana Devnet  (Privy)
  103,            // Solana Testnet (Privy)
  900,            // used by some indexers
  1399811149,    // Solana Mainnet (newer numeric id)
])

export type SolanaConnectResult =
  | { status: "connected"; address: string; type: "external" | "embedded" }
  | { status: "linking" }   // linkWallet popup opened — caller should re-check on next render
  | { status: "cancelled" } // user dismissed the popup
  | { status: "error"; message: string }

export function useSolanaWallet() {
  const { user, linkWallet } = usePrivy()
  const { wallets } = useWallets()

  const [isLinking, setIsLinking] = useState(false)

  const linkedAccounts = user?.linkedAccounts ?? []
  const linkedWallets  = linkedAccounts.filter((a) => a.type === "wallet")

  // ── Embedded vs external detection ─────────────────────────────────────
  // "embedded user" = signed in via social/email, no external EVM wallet
  const hasExternalEvm = linkedWallets.some(
    (w: any) => w.chainType === "ethereum" && w.walletClientType !== "privy"
  )
  const isEmbeddedUser = !hasExternalEvm

  // ── Solana wallet resolution (external wins over embedded) ──────────────
  const linkedSolanaWallets = linkedWallets.filter(
    (w: any) => w.chainType === "solana"
  )

  const externalSolana = linkedSolanaWallets.find(
    (w: any) => w.walletClientType !== "privy"
  ) as any | undefined

  const embeddedSolana = linkedSolanaWallets.find(
    (w: any) => w.walletClientType === "privy"
  ) as any | undefined

  // External always wins when both exist
  const activeSolanaAccount = externalSolana ?? embeddedSolana ?? null

  // Live wallet object (has .sendTransaction, .signMessage, etc.)
  const activeSolanaWallet =
    wallets.find(
      (w) =>
        w.address === activeSolanaAccount?.address &&
        // @ts-ignore – chainType exists on Privy wallet objects
        (w.chainType === "solana" || SOLANA_CHAIN_IDS.has(Number(w.chainId)))
    ) ?? null

  // ── Core: connect or switch to Solana ───────────────────────────────────
  /**
   * Unified entry-point called from the network selector (or anywhere) when
   * the user wants to switch to a Solana network.
   *
   * Behaviour matrix:
   * ┌──────────────────────────────┬──────────────────────────────────────────┐
   * │ User type                    │ Action                                   │
   * ├──────────────────────────────┼──────────────────────────────────────────┤
   * │ Has external Solana wallet   │ Use it immediately, no popup             │
   * │ Embedded user (social login) │ Use embedded Solana wallet silently      │
   * │ External EVM, no Solana yet  │ Open linkWallet popup for Solana         │
   * └──────────────────────────────┴──────────────────────────────────────────┘
   */
  const connectOrSwitchSolana = useCallback(async (): Promise<SolanaConnectResult> => {
    // ── Case 1: already has an external Solana wallet ──────────────────────
    if (externalSolana?.address) {
      toast.success(
        `Switched to Solana — ${externalSolana.address.slice(0, 4)}…${externalSolana.address.slice(-4)}`
      )
      return { status: "connected", address: externalSolana.address, type: "external" }
    }

    // ── Case 2: embedded-only user → always use embedded Solana silently ───
    if (isEmbeddedUser) {
      if (embeddedSolana?.address) {
        toast.success("Switched to Solana — using your embedded wallet")
        return { status: "connected", address: embeddedSolana.address, type: "embedded" }
      }
      // Embedded Solana should always exist for social-login users;
      // if missing it hasn't hydrated yet — caller should retry.
      toast.info("Loading your Solana wallet, please try again in a moment…")
      return { status: "error", message: "Embedded Solana wallet not yet available" }
    }

    // ── Case 3: external EVM user with no Solana wallet yet ─────────────────
    // (they need to link one — show the Privy wallet picker)
    if (embeddedSolana?.address) {
      // They have an embedded Solana from an earlier social login attempt
      toast.success("Switched to Solana — using your embedded wallet")
      return { status: "connected", address: embeddedSolana.address, type: "embedded" }
    }

    // No Solana wallet at all → open linkWallet popup
    setIsLinking(true)
    try {
      await linkWallet()
      // Privy will re-render with the new wallet; caller checks activeSolanaAccount
      return { status: "linking" }
    } catch (err: any) {
      const msg = (err?.message ?? "").toLowerCase()
      if (msg.includes("closed") || msg.includes("cancelled") || msg.includes("popup")) {
        return { status: "cancelled" }
      }
      toast.error("Could not connect Solana wallet")
      return { status: "error", message: err?.message ?? "Unknown error" }
    } finally {
      setIsLinking(false)
    }
  }, [externalSolana, embeddedSolana, isEmbeddedUser, linkWallet])

  // ── Legacy alias kept for backward compat ───────────────────────────────
  const switchToSolana = useCallback(async (): Promise<string | null> => {
    const result = await connectOrSwitchSolana()
    return result.status === "connected" ? result.address : null
  }, [connectOrSwitchSolana])

  return {
    /** The winning Solana linked-account object (external > embedded > null) */
    activeSolanaAccount,
    /** The live Privy Wallet object (has sendTransaction, signMessage, etc.) */
    activeSolanaWallet,
    /** Convenience: just the address string */
    solanaAddress: activeSolanaAccount?.address ?? null,
    /** True when using an externally-linked Solana wallet (e.g. Phantom) */
    hasExternalSolana: !!externalSolana,
    /** True when only the Privy-embedded Solana wallet exists */
    hasEmbeddedSolana: !!embeddedSolana && !externalSolana,
    /** True when the user has NO external EVM wallet (social/email login) */
    isEmbeddedUser,
    /** True while the linkWallet popup is open */
    isLinking,
    /** Unified connect-or-switch — use this from network selector / wallet provider */
    connectOrSwitchSolana,
    /** Legacy alias */
    switchToSolana,
    /** Raw Privy linkWallet */
    linkWallet,
  }
}