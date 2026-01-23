"use client"

import Link from "next/link"
import { useState, useEffect } from "react"
import { useAppKit, useAppKitAccount } from '@reown/appkit/react'
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { 
  Wallet, 
  LayoutDashboard, 
  LogOut, 
  User2,
  Copy, 
  ChevronDown,
  ExternalLink,
  Sparkles
} from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useToast } from "@/hooks/use-toast"

// Backend URL
const API_BASE_URL = "https://fauctdrop-backend.onrender.com"; 

export function WalletConnectButton() {
  const { open } = useAppKit()
  const { address, isConnected } = useAppKitAccount()
  const { toast } = useToast()

  const [username, setUsername] = useState<string>("Anonymous")
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
  if (isConnected && address) {
    // 1. Initial fetch when wallet connects
    fetchProfile();

    // 2. Listen for the "signal" from the Modal
    const handleUpdate = () => {
      console.log("Profile update signal received! Re-fetching...");
      fetchProfile();
    };

    window.addEventListener("profileUpdated", handleUpdate);
    return () => window.removeEventListener("profileUpdated", handleUpdate);
  } else {
    setUsername("Anonymous");
    setAvatarUrl(null);
  }
}, [address, isConnected]);
 
  const fetchProfile = async () => {
  if (!address) return;
  setLoading(true);
  try {
    // Add the timestamp to bust cache on refresh
    const res = await fetch(`${API_BASE_URL}/api/profile/${address.toLowerCase()}?t=${Date.now()}`);
    const data = await res.json();
    
    if (data.success && data.profile && data.profile.username) {
      setUsername(data.profile.username);
      setAvatarUrl(data.profile.avatar_url || null);
    } else {
      // Keep it Anonymous if no profile record exists in DB
      setUsername("Anonymous");
      setAvatarUrl(null);
    }
  } catch (error) {
    console.error("Profile fetch error", error);
    setUsername("Anonymous");
  } finally {
    setLoading(false);
  }
};

  if (!isConnected || !address) {
    return (
      <Button onClick={() => open()} size="sm" className="flex items-center gap-2 font-semibold">
        <Wallet className="h-4 w-4" />
        Connect Wallet
      </Button>
    )
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="outline" 
          size="sm"
          className="flex items-center gap-2 pl-1 pr-3 border-primary/20 hover:bg-primary/5 transition-all rounded-full h-9 relative"
        >
          {/* Christmas Cap Overlay - Using standard Santa Hat Emoji positioned as a cap */}
          <div className="relative">
            {/* <span className="absolute -top-[14px] -left-[6px] text-[20px] z-20 pointer-events-none -rotate-[15deg] drop-shadow-sm"
                role="img" 
                aria-label="Christmas Cap"
            >
                ❄️
            </span> */}
            <Avatar className="h-7 w-7 border border-background shadow-sm">
              <AvatarImage src={avatarUrl || ""} className="object-cover" />
              <AvatarFallback className="bg-primary/10 text-primary text-[10px]">
                {username.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
          </div>

          <span className="text-xs sm:text-sm font-medium max-w-[100px] truncate">
            {loading ? "..." : username}
          </span>
          <ChevronDown className="h-3 w-3 opacity-50" />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{username}</p>
            <p className="text-xs leading-none text-muted-foreground font-mono">
              {address.slice(0, 6)}...{address.slice(-4)}
            </p>
          </div>
        </DropdownMenuLabel>
        
        <DropdownMenuSeparator />
        
        <DropdownMenuGroup>
          <DropdownMenuItem asChild>
            <Link 
            href={`/dashboard/${username === 'Anonymous' ? address.toLowerCase() : username}`} 
            className="cursor-pointer flex items-center gap-2"> 
            <LayoutDashboard className="h-4 w-4" />
            <span>Dashboard</span>
          </Link>
          </DropdownMenuItem>

          <DropdownMenuItem onClick={() => {
            navigator.clipboard.writeText(address);
            toast({ title: "Copied!", description: "Address on clipboard" });
          }} className="cursor-pointer flex items-center gap-2">
            <Copy className="h-4 w-4" />
            <span>Copy Address</span>
          </DropdownMenuItem>
        </DropdownMenuGroup>
      
        <DropdownMenuSeparator />

        <DropdownMenuItem onClick={() => open()} className="cursor-pointer flex items-center gap-2">
          <ExternalLink className="h-4 w-4" />
          <span>Wallet Settings</span>
        </DropdownMenuItem>

        <DropdownMenuItem onClick={() => open({ view: 'Account' })} className="cursor-pointer flex items-center gap-2 text-red-600 focus:text-red-600 focus:bg-red-50">
          <LogOut className="h-4 w-4" />
          <span>Disconnect</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}