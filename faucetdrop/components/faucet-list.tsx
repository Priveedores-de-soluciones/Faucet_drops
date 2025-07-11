"use client"

import { useEffect, useState } from "react";
import { useNetwork } from "@/hooks/use-network";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Coins, ChevronDown, ChevronUp } from "lucide-react";
import { formatUnits, Contract, JsonRpcProvider } from "ethers";
import { getAllClaimsForAllNetworks } from "@/lib/faucet";

// You'll need to define the faucet ABI with the name methods
const FAUCET_ABI = [
  // Common name methods - add more as needed
  "function name() view returns (string)",
  "function getName() view returns (string)",
  "function faucetName() view returns (string)",
  // Add other common faucet methods if needed
];

export function FaucetList() {
  const { networks } = useNetwork();
  const { toast } = useToast();
  
  // Define the claim type based on what getAllClaimsForAllNetworks returns
  type ClaimType = {
    claimer: string;
    faucet: string;
    amount: bigint;
    txHash: `0x${string}`;
    networkName: string;
    timestamp: number;
    chainId: number | bigint; // Handle both types
    tokenSymbol: string;
    tokenDecimals: number;
    isEther: boolean;
  };

  const [claims, setClaims] = useState<ClaimType[]>([]);
  const [loadingClaims, setLoadingClaims] = useState(true);
  const [page, setPage] = useState(1);
  const [isExpanded, setIsExpanded] = useState(false);
  const [faucetNames, setFaucetNames] = useState<Record<string, string>>({});
  const [isMobile, setIsMobile] = useState(false);
  
  // Dynamic claims per page based on screen size
  const claimsPerPage = isMobile ? 5 : 10;

  useEffect(() => {
    // Check if screen is mobile size
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 640); // sm breakpoint in Tailwind
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    const loadClaims = async () => {
      setLoadingClaims(true);
      try {
        const fetchedClaims = await getAllClaimsForAllNetworks(networks);
        console.log("Fetched drops:", fetchedClaims);
        setClaims(fetchedClaims);
        setPage(1);
        
        // Fetch faucet names for all unique faucet addresses
        await fetchFaucetNames(fetchedClaims);
        
        console.log("Total pages:", Math.ceil(fetchedClaims.length / claimsPerPage));
      } catch (error) {
        console.error("Error loading drops:", error);
        toast({
          title: "Failed to load drops",
          description: "Please try again later.",
          variant: "destructive",
        });
      } finally {
        setLoadingClaims(false);
      }
    };

    const fetchFaucetNames = async (claimsData: ClaimType[]) => {
      const faucetAddresses = [...new Set(claimsData.map(claim => claim.faucet))];
      const namePromises = faucetAddresses.map(async (faucetAddress) => {
        try {
          // Find the network for this faucet from the claims
          const claim = claimsData.find(c => c.faucet === faucetAddress);
          if (!claim) return null;
          
          // Convert chainId to number for comparison
          const chainId = typeof claim.chainId === 'bigint' ? Number(claim.chainId) : claim.chainId;
          const network = networks.find(n => n.chainId === chainId);
          if (!network) return null;
          
          // Create provider using JsonRpcProvider
          const provider = new JsonRpcProvider(network.rpcUrl);
          
          // Create contract instance for the FAUCET itself, not the factory
          const faucetContract = new Contract(faucetAddress, FAUCET_ABI, provider);
          
          // Try different common name methods
          let faucetName: string;
          try {
            // Try the most common method first
            faucetName = await faucetContract.name();
          } catch (error) {
            try {
              faucetName = await faucetContract.getName();
            } catch (error2) {
              try {
                faucetName = await faucetContract.faucetName();
              } catch (error3) {
                console.log(`No name method found for faucet ${faucetAddress} on ${network.name}`);
                return null;
              }
            }
          }
          
          return { address: faucetAddress, name: faucetName };
        } catch (error) {
          console.log(`Error fetching name for faucet ${faucetAddress}:`, error);
          return null;
        }
      });
      
      const results = await Promise.all(namePromises);
      const nameMap: Record<string, string> = {};
      
      results.forEach(result => {
        if (result && result.name) {
          nameMap[result.address] = result.name;
        }
      });
      
      setFaucetNames(nameMap);
    };

    if (networks.length > 0) {
      loadClaims();
    }
  }, [networks, toast]);

  // Recalculate pagination when mobile state changes
  useEffect(() => {
    setPage(1); // Reset to first page when switching between mobile/desktop
  }, [isMobile]);

  const totalPages = Math.ceil(claims.length / claimsPerPage);
  const paginatedClaims = claims.slice((page - 1) * claimsPerPage, page * claimsPerPage);

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg sm:text-xl">Recent Drops</CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center gap-2 text-sm"
          >
            {isExpanded ? (
              <>
                Collapse
                <ChevronUp className="h-4 w-4" />
              </>
            ) : (
              <>
                View Drops
                <ChevronDown className="h-4 w-4" />
              </>
            )}
          </Button>
        </div>
      </CardHeader>
      
      {isExpanded && (
        <CardContent>
          {loadingClaims ? (
            <div className="flex justify-center items-center py-10 sm:py-12">
              <div className="text-center">
                <div className="animate-spin rounded-full h-10 w-10 sm:h-12 sm:w-12 border-b-2 border-primary mx-auto"></div>
                <p className="mt-4 text-sm sm:text-base">Loading drops...</p>
              </div>
            </div>
          ) : claims.length === 0 ? (
            <div className="text-center py-8 sm:py-12">
              <Coins className="h-10 w-10 sm:h-12 sm:w-12 text-muted-foreground mx-auto mb-3 sm:mb-4" />
              <h3 className="text-lg sm:text-xl font-medium mb-2">No Drops Found</h3>
              <p className="text-xs sm:text-sm text-muted-foreground">
                No drops have been recorded across any network yet.
              </p>
            </div>
          ) : (
            <>
              {/* Mobile View */}
              <div className="block sm:hidden space-y-3">
                {paginatedClaims.map((claim, index) => {
                  const chainId = typeof claim.chainId === 'bigint' ? Number(claim.chainId) : claim.chainId;
                  const network = networks.find((n) => n.chainId === chainId);
                  const displayName = faucetNames[claim.faucet] || `Faucet ${claim.faucet.slice(0, 6)}...${claim.faucet.slice(-4)}`;
                  return (
                    <Card key={`${claim.txHash}-${index}`} className="p-3">
                      <div className="space-y-2 text-xs">
                        <div className="flex justify-between items-start">
                          <span className="text-muted-foreground">Dropee:</span>
                          <span className="font-mono text-right break-all max-w-[150px]">
                            {claim.claimer.slice(0, 6)}...{claim.claimer.slice(-4)}
                          </span>
                        </div>
                        
                        <div className="flex justify-between items-start">
                          <span className="text-muted-foreground">Faucet:</span>
                          <Link
                            href={`/faucet/${claim.faucet}?networkId=${chainId}`}
                            className="text-blue-600 hover:underline text-right max-w-[150px]"
                          >
                            {displayName}
                          </Link>
                        </div>
                        
                        <div className="flex justify-between items-center">
                          <span className="text-muted-foreground">Amount:</span>
                          <span className="font-medium">
                            {Number(formatUnits(claim.amount, claim.tokenDecimals)).toFixed(4)} {claim.tokenSymbol}
                          </span>
                        </div>
                        
                        <div className="flex justify-between items-start">
                          <span className="text-muted-foreground">Tx:</span>
                          <a
                            href={`${network?.blockExplorer || "#"}/tx/${claim.txHash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline font-mono"
                          >
                            {claim.txHash.slice(0, 6)}...{claim.txHash.slice(-4)}
                          </a>
                        </div>
                        
                        <div className="flex justify-between items-center">
                          <span className="text-muted-foreground">Network:</span>
                          <span className="text-xs bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
                            {claim.networkName}
                          </span>
                        </div>
                        
                        <div className="flex justify-between items-center">
                          <span className="text-muted-foreground">Time:</span>
                          <span className="text-right">
                            {new Date(claim.timestamp * 1000).toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>

              {/* Desktop Table View */}
              <div className="hidden sm:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs sm:text-sm">Dropee</TableHead>
                      <TableHead className="text-xs sm:text-sm">Faucet</TableHead>
                      <TableHead className="text-xs sm:text-sm">Amount</TableHead>
                      <TableHead className="text-xs sm:text-sm">Tx Hash</TableHead>
                      <TableHead className="text-xs sm:text-sm">Network</TableHead>
                      <TableHead className="text-xs sm:text-sm">Timestamp</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedClaims.map((claim, index) => {
                      const chainId = typeof claim.chainId === 'bigint' ? Number(claim.chainId) : claim.chainId;
                      const network = networks.find((n) => n.chainId === chainId);
                      const displayName = faucetNames[claim.faucet] || `Faucet ${claim.faucet.slice(0, 6)}...${claim.faucet.slice(-4)}`;
                      return (
                        <TableRow key={`${claim.txHash}-${index}`}>
                          <TableCell className="text-xs sm:text-sm font-mono">
                            <div className="max-w-[120px] truncate" title={claim.claimer}>
                              {claim.claimer}
                            </div>
                          </TableCell>
                          <TableCell className="text-xs sm:text-sm">
                            <Link
                              href={`/faucet/${claim.faucet}?networkId=${chainId}`}
                              className="text-blue-600 hover:underline max-w-[120px] truncate block"
                              title={displayName}
                            >
                              {displayName}
                            </Link>
                          </TableCell>
                          <TableCell className="text-xs sm:text-sm">
                            {Number(formatUnits(claim.amount, claim.tokenDecimals)).toFixed(4)} {claim.tokenSymbol}
                          </TableCell>
                          <TableCell className="text-xs sm:text-sm font-mono">
                            <a
                              href={`${network?.blockExplorer || "#"}/tx/${claim.txHash}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:underline"
                              title={claim.txHash}
                            >
                              {claim.txHash.slice(0, 6)}...{claim.txHash.slice(-4)}
                            </a>
                          </TableCell>
                          <TableCell className="text-xs sm:text-sm">
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-gray-100 dark:bg-gray-800">
                              {claim.networkName}
                            </span>
                          </TableCell>
                          <TableCell className="text-xs sm:text-sm">
                            {new Date(claim.timestamp * 1000).toLocaleString()}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mt-6">
                  <div className="text-xs sm:text-sm text-muted-foreground">
                    Showing {(page - 1) * claimsPerPage + 1} to {Math.min(page * claimsPerPage, claims.length)} of{" "}
                    {claims.length} drops
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page === 1 || loadingClaims}
                      className="text-xs sm:text-sm hover:bg-primary/10"
                      aria-label="Previous page"
                    >
                      Previous
                    </Button>
                    <span className="text-xs sm:text-sm text-muted-foreground">
                      Page {page} of {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      disabled={page === totalPages || loadingClaims}
                      className="text-xs sm:text-sm hover:bg-primary/10"
                      aria-label="Next page"
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      )}
    </Card>
  );
}
