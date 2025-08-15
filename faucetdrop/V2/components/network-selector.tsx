"use client"

import { useNetwork, type Network } from "@/hooks/use-network"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { ChevronDown, Network as NetworkIcon } from "lucide-react"

export function NetworkSelector() {
  const { network, networks, setNetwork, isSwitchingNetwork, currentChainId } = useNetwork()
  const isWalletAvailable = typeof window !== "undefined" && window.ethereum

  // Find the network name for the current chain ID, if available
  const currentNetwork = networks.find((net) => net.chainId === currentChainId)
  const displayText = isSwitchingNetwork
    ? "Switching..."
    : network
    ? network.name
    : isWalletAvailable
    ? currentNetwork
      ? currentNetwork.name
      : currentChainId
      ? `Unknown Chain (ID: ${currentChainId})`
      : "Select Network"
    : "No Wallet Detected"

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="flex items-center gap-2" disabled={!isWalletAvailable || isSwitchingNetwork}>
          
          {displayText}
          <ChevronDown className="h-4 w-4 ml-1" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {networks.map((net: Network) => (
          <DropdownMenuItem
            key={net.chainId}
            onClick={() => setNetwork(net)}
            className="flex items-center gap-2 cursor-pointer"
            disabled={!isWalletAvailable || isSwitchingNetwork}
          >
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: net.color }} />
            {net.name}
            {network?.chainId === net.chainId && (
              <span className="ml-auto text-xs bg-green-500/20 text-green-600 dark:text-green-400 px-2 py-0.5 rounded-full">
                Active
              </span>
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}