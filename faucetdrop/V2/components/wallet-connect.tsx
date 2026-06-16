"use client"

import Link from "next/link"
import { useState, useEffect, useRef } from "react"
import { useWallet } from "./wallet-provider"
import { ConnectModal } from "./connect-modal"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuGroup,
  DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { LayoutDashboard, LogOut, Wallet, ShoppingBag, ChevronDown, Link2 } from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { usePathname } from "next/navigation"

// ─────────────────────────────────────────────────────────────────────────────

const ADMIN_ADDRESSES = [
  "0x9fBC2A0de6e5C5Fd96e8D11541608f5F328C0785",
].map(a => a.toLowerCase())

interface Props { className?: string }

export function WalletConnectButton({ className }: Props) {
  const API_BASE = "https://identical-vivi-faucetdrops-41e9c56b.koyeb.app"
  const {
    address, isConnected, isConnecting, walletType,
    session, disconnect, setShowModal,
  } = useWallet()
  const pathname = usePathname()

  const [dbUsername,  setDbUsername]  = useState<string | null>(null)
  const [dbAvatarUrl, setDbAvatarUrl] = useState<string | null>(null)
  const [loading,     setLoading]     = useState(false)
  const hasSyncedRef = useRef(false)

  const isStorePage = pathname?.startsWith("/store")
  const isAdmin     = !!address && ADMIN_ADDRESSES.includes(address.toLowerCase())

  // ── Fetch / sync profile ──────────────────────────────────────────────────
  useEffect(() => {
    if (!isConnected || !address) {
      setDbUsername(null); setDbAvatarUrl(null)
      hasSyncedRef.current = false
      return
    }
    let mounted = true
    setLoading(true)

    ;(async () => {
      try {
        const res = await fetch(`${API_BASE}/api/users/${address.toLowerCase()}`)
        if (res.ok) {
          const data = await res.json()
          const profile = data.profile ?? (data.username ? data : null)
          if (profile?.username && profile.username !== "New User") {
            if (mounted) {
              setDbUsername(profile.username)
              setDbAvatarUrl(profile.avatar_url ?? profile.avatarUrl ?? "")
              return
            }
          }
        }
        if (!hasSyncedRef.current) {
          hasSyncedRef.current = true
          const syncRes = await fetch(`${API_BASE}/api/profile/sync`, {
            method:  "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              wallet_address: address,
              username: `user_${address.slice(-4)}`,
              avatar_url: "",
              email: "",
            }),
          })
          const syncData = await syncRes.json()
          if (syncData.success && syncData.profile && mounted) {
            setDbUsername(syncData.profile.username)
            setDbAvatarUrl(syncData.profile.avatar_url)
            window.dispatchEvent(new CustomEvent("profileUpdated", {
              detail: { username: syncData.profile.username, avatarUrl: syncData.profile.avatar_url },
            }))
          }
        }
      } catch (e) {
        console.error("Profile sync error", e)
      } finally {
        if (mounted) setLoading(false)
      }
    })()

    return () => { mounted = false }
  }, [address, isConnected])

  // Listen for profile updates from elsewhere
  useEffect(() => {
    const handler = (e: CustomEvent) => {
      const { username, avatarUrl } = e.detail ?? {}
      if (username) setDbUsername(username)
      if (avatarUrl) setDbAvatarUrl(avatarUrl)
    }
    window.addEventListener("profileUpdated" as any, handler)
    return () => window.removeEventListener("profileUpdated" as any, handler)
  }, [])

  // ── Provider badge label ──────────────────────────────────────────────────
  const providerLabel = walletType === "external"
    ? (session?.provider ?? "Wallet")
    : (session?.provider
        ? session.provider.charAt(0).toUpperCase() + session.provider.slice(1)
        : "Embedded")

  const displayName   = dbUsername || "Anonymous"
  const displayAvatar = dbAvatarUrl || ""
  const dashboardLink = dbUsername
    ? `/dashboard/${dbUsername}`
    : `/dashboard/${address?.toLowerCase() ?? ""}`

  // ── Render ────────────────────────────────────────────────────────────────
  if (isConnecting) {
    return (
      <Button size="sm" disabled variant="outline"
        className={cn("text-xs font-bold uppercase tracking-widest px-6 opacity-50 border-border", className)}>
        Connecting…
      </Button>
    )
  }

  if (!isConnected) {
    return (
      <>
        <Button
          onClick={() => setShowModal(true)}
          size="sm" variant="default"
          className={cn("text-xs font-bold uppercase tracking-widest px-6 shadow-md hover:scale-105 transition-all", className)}
        >
          Get Started
        </Button>
        <ConnectModal />
      </>
    )
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline" size="sm"
            className={cn(
              "flex items-center gap-2 p-1 sm:pr-3 border-primary/20 hover:bg-primary/5 transition-all rounded-full h-9",
              className
            )}
          >
            <div className="relative">
              <Avatar className="h-7 w-7 border border-background shadow-sm">
                <AvatarImage src={displayAvatar} className="object-cover" />
                <AvatarFallback className="bg-primary/10 text-primary text-[10px]">
                  {loading
                    ? <span className="animate-pulse">…</span>
                    : displayName.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              {/* Provider badge */}
              {walletType === "external" ? (
              <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 bg-blue-500 rounded-full border border-background flex items-center justify-center">
                <Wallet className="h-2 w-2 text-white" />
              </div>
            ) : walletType === "embedded" ? (
              <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 bg-emerald-500 rounded-full border border-background flex items-center justify-center">
                <Wallet className="h-2 w-2 text-white" />
              </div>
            ) : null}
            </div>
            <span className="hidden sm:block text-xs font-medium max-w-[100px] truncate">
              {loading ? "…" : displayName}
            </span>
            <ChevronDown className="hidden sm:block h-3 w-3 opacity-50" />
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end" className="w-56 z-[200]" sideOffset={8}>
          <DropdownMenuLabel className="font-normal">
            <div className="flex flex-col space-y-1">
              <p className="text-sm font-medium leading-none truncate">{displayName}</p>
              {address && (
                <div className="flex items-center gap-1 flex-wrap">
                  <p className="text-xs leading-none text-muted-foreground font-mono">
                    {address.slice(0, 6)}…{address.slice(-4)}
                  </p>
                  <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded">
                    {providerLabel}
                  </span>
                </div>
              )}
              {/* Linked socials */}
              {(session?.linkedSocials?.length ?? 0) > 0 && (
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  Linked: {session!.linkedSocials!.join(", ")}
                </p>
              )}
            </div>
          </DropdownMenuLabel>

          <DropdownMenuSeparator />

          <DropdownMenuGroup>
            {isStorePage ? (
              isAdmin ? (
                <DropdownMenuItem asChild>
                  <Link href="/store/admin" className="cursor-pointer flex items-center gap-2">
                    <LayoutDashboard className="h-4 w-4" /><span>Admin</span>
                  </Link>
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem asChild>
                  <Link href="/store/orders" className="cursor-pointer flex items-center gap-2">
                    <ShoppingBag className="h-4 w-4" /><span>My Orders</span>
                  </Link>
                </DropdownMenuItem>
              )
            ) : (
              <DropdownMenuItem asChild>
                <Link
                  href={dashboardLink}
                  className={cn(
                    "cursor-pointer flex items-center gap-2",
                    (loading || !dbUsername) && "pointer-events-none opacity-50"
                  )}
                >
                  <LayoutDashboard className="h-4 w-4" />
                  <span>{loading ? "Loading…" : dbUsername ? "Profile" : "Dashboard"}</span>
                </Link>
              </DropdownMenuItem>
            )}

            {address && (
              <DropdownMenuItem
                onClick={() => { navigator.clipboard.writeText(address); toast.success("Address copied!") }}
                className="cursor-pointer flex items-center gap-2"
              >
                <Wallet className="h-4 w-4" /><span>Copy Address</span>
              </DropdownMenuItem>
            )}

            {/* Link additional social — only available for embedded wallets */}
            
              <DropdownMenuItem
                onClick={() => setShowModal(true)}
                className="cursor-pointer flex items-center gap-2"
              >
                <Link2 className="h-4 w-4" /><span>Link Account</span>
              </DropdownMenuItem>
            
          </DropdownMenuGroup>

          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={disconnect}
            className="cursor-pointer flex items-center gap-2 text-red-600 focus:text-red-600 focus:bg-red-50"
          >
            <LogOut className="h-4 w-4" /><span>Disconnect</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Modal is always mounted when connected (for link social flow) */}
      <ConnectModal />
    </>
  )
}