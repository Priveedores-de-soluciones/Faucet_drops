"use client"

import { useNetwork, type Network } from "@/hooks/use-network"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { ChevronDown } from "lucide-react"

export function NetworkSelector() {
  const { network, networks, setNetwork } = useNetwork()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: network?.color || "#28A0F0" }} />
          {network?.name || "Select Network"}
          <ChevronDown className="h-4 w-4 ml-1" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {networks.map((net: Network) => (
          <DropdownMenuItem
            key={net.chainId}
            onClick={() => setNetwork(net)}
            className="flex items-center gap-2 cursor-pointer"
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