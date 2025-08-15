"use client"

import { useEffect, useState } from "react";
import { useWallet } from "@/hooks/use-wallet";
import { useNetwork } from "@/hooks/use-network";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Search } from "lucide-react";
import Link from "next/link";
import { getFaucetsForNetwork } from "@/lib/faucet";

interface NetworkGridProps {
  className?: string;
}

export function NetworkGrid({ className = "" }: NetworkGridProps) {
  const { chainId } = useWallet();
  const { networks } = useNetwork();
  const { toast } = useToast();
  
  const [networkStatus, setNetworkStatus] = useState<
    Record<string, { loading: boolean; error: string | null }>
  >({});
  const [faucetCounts, setFaucetCounts] = useState<Record<string, number>>({});
  const [activeFaucetCounts, setActiveFaucetCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    const initialStatus: Record<string, { loading: boolean; error: string | null }> = {};
    const initialFaucetCounts: Record<string, number> = {};
    const initialActiveFaucetCounts: Record<string, number> = {};
    
    networks.forEach((network) => {
      initialStatus[network.name] = { loading: true, error: null };
      initialFaucetCounts[network.name] = 0;
      initialActiveFaucetCounts[network.name] = 0;
    });
    
    setNetworkStatus(initialStatus);
    setFaucetCounts(initialFaucetCounts);
    setActiveFaucetCounts(initialActiveFaucetCounts);

    const loadFaucetCounts = async () => {
      const updatedStatus = { ...initialStatus };
      const updatedCounts = { ...initialFaucetCounts };
      const updatedActiveCounts = { ...initialActiveFaucetCounts };

      await Promise.all(
        networks.map(async (network) => {
          try {
            updatedStatus[network.name].loading = true;
            const faucets = await getFaucetsForNetwork(network);
            
            const sortedFaucets = faucets.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
            const activeFaucets = faucets.filter(faucet => faucet.isActive !== false);
            
            updatedCounts[network.name] = sortedFaucets.length;
            updatedActiveCounts[network.name] = activeFaucets.length;
            updatedStatus[network.name] = { loading: false, error: null };
          } catch (error) {
            console.error(`Error loading faucets for ${network.name}:`, error);
            updatedStatus[network.name] = {
              loading: false,
              error: `Failed to load faucets`,
            };
            updatedCounts[network.name] = 0;
            updatedActiveCounts[network.name] = 0;
          }
        })
      );

      setNetworkStatus(updatedStatus);
      setFaucetCounts(updatedCounts);
      setActiveFaucetCounts(updatedActiveCounts);
    };

    if (networks.length > 0) {
      loadFaucetCounts();
    }
  }, [networks, toast]);

  // Find the network matching the current chainId
  const currentNetwork = networks.find(network => network.chainId === chainId);

  return (
    <div className={`space-y-4 ${className}`}>
      {currentNetwork ? (
        <Link href={`/network/${currentNetwork.chainId}`}>
          <Card className="overflow-hidden cursor-pointer hover:shadow-md transition-shadow w-full">
            <CardHeader className="pb-2 px-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm flex items-center gap-2">
                  <span
                    className="h-3 w-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: currentNetwork.color }}
                  ></span>
                  <span className="truncate">{currentNetwork.name}</span>
                </CardTitle>
                {networkStatus[currentNetwork.name]?.loading ? (
                  <span className="text-[10px] bg-blue-500/20 text-blue-600 dark:text-blue-400 px-1.5 py-0.5 rounded-full flex-shrink-0">
                    Loading
                  </span>
                ) : networkStatus[currentNetwork.name]?.error ? (
                  <span className="text-[10px] bg-amber-500/20 text-amber-600 dark:text-amber-400 px-1.5 py-0.5 rounded-full flex-shrink-0">
                    Issue
                  </span>
                ) : (
                  <span className="text-[10px] bg-green-500/20 text-green-600 dark:text-green-400 px-1.5 py-0.5 rounded-full flex-shrink-0">
                    Online
                  </span>
                )}
              </div>
            </CardHeader>
            <CardContent className="text-xs px-4 pb-3">
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Total:</span>
                  <span className="font-medium">
                    {faucetCounts[currentNetwork.name] || 0}
                  </span>
                </div>
                <div className="pt-1">
                  <span className="text-[10px] bg-blue-500/20 text-blue-600 dark:text-blue-400 px-1.5 py-0.5 rounded-full">
                    Connected
                  </span>
                </div>
              </div>
               Click to view faucets for {currentNetwork.name}
            </CardContent>
          </Card>
         
        </Link>
      ) : (
        <Card className="p-8 text-center">
          <div className="space-y-3">
            <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mx-auto">
              <Search className="h-6 w-6 text-muted-foreground" />
            </div>
            <div>
              <h3 className="text-sm font-medium mb-1">
                No faucet for your current network
              </h3>
              <p className="text-xs text-muted-foreground">
                Your wallet is not connected to a supported network
              </p>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}