"use client"

import { useEffect, useState, useCallback, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { useWallet } from "@/hooks/use-wallet";
import { useNetwork } from "@/hooks/use-network";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getFaucetsForNetwork } from "@/lib/faucet";
import { formatUnits, Contract, ZeroAddress, JsonRpcProvider } from "ethers";
import { Coins, Clock, Search, Filter, SortAsc, X, ArrowLeft } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ERC20_ABI } from "@/lib/abis";
import { Header } from "@/components/header";
import Link from "next/link";

// Types for better type safety
interface FaucetData {
  faucetAddress: string;
  name?: string;
  tokenSymbol?: string;
  tokenDecimals?: number;
  isEther: boolean;
  balance?: bigint;
  claimAmount?: bigint;
  startTime?: string | number;
  endTime?: string | number;
  isClaimActive: boolean;
  token?: string;
  network?: {
    chainId: number;
    name: string;
    color: string;
  };
  createdAt?: string | number; // For sorting by latest
}

// Filter and sort options
const FILTER_OPTIONS = {
  ALL: 'all',
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  NATIVE: 'native',
  ERC20: 'erc20'
} as const;

const SORT_OPTIONS = {
  DEFAULT: 'default', // Active first, then by latest
  NAME_ASC: 'name_asc',
  NAME_DESC: 'name_desc',
  BALANCE_HIGH: 'balance_high',
  BALANCE_LOW: 'balance_low',
  AMOUNT_HIGH: 'amount_high',
  AMOUNT_LOW: 'amount_low'
} as const;

type FilterOption = typeof FILTER_OPTIONS[keyof typeof FILTER_OPTIONS];
type SortOption = typeof SORT_OPTIONS[keyof typeof SORT_OPTIONS];

// Hook to track window size
function useWindowSize() {
  const [windowSize, setWindowSize] = useState<{ width: number; height: number }>({
    width: typeof window !== "undefined" ? window.innerWidth : 0,
    height: typeof window !== "undefined" ? window.innerHeight : 0,
  });

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;

    const handleResize = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        setWindowSize({
          width: window.innerWidth,
          height: window.innerHeight,
        });
      }, 150);
    };

    window.addEventListener("resize", handleResize);
    handleResize();

    return () => {
      window.removeEventListener("resize", handleResize);
      clearTimeout(timeoutId);
    };
  }, []);

  return windowSize;
}

// Hook for back navigation
function usePreviousPage() {
  const router = useRouter();
  const [canGoBack, setCanGoBack] = useState(false);

  useEffect(() => {
    // Check if there's a previous page in history
    setCanGoBack(window.history.length > 1);
  }, []);

  const goBack = useCallback(() => {
    if (canGoBack) {
      router.back();
    } else {
      router.push('/');
    }
  }, [router, canGoBack]);

  return { goBack, canGoBack };
}

// ✅ Helper function to get native token symbol based on network
const getNativeTokenSymbol = (networkName: string): string => {
  switch (networkName) {
    case "Celo":
      return "CELO"
    case "Lisk":
    case "Arbitrum":
    case "Base":
    case "Ethereum":
      return "ETH"
    case "Polygon":
      return "MATIC"
    case "Optimism":
      return "ETH"
    default:
      return "ETH"
  }
}

// TokenBalance component
function TokenBalance({
  tokenAddress,
  tokenSymbol,
  tokenDecimals,
  isNativeToken,
  networkChainId,
}: {
  tokenAddress: string;
  tokenSymbol: string;
  tokenDecimals: number;
  isNativeToken: boolean;
  networkChainId: number;
}) {
  const { provider, address } = useWallet();
  const [balance, setBalance] = useState<string>("0");
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const fetchBalance = async () => {
      if (!provider || !address || !networkChainId) {
        setBalance("0");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        let balance: bigint;
        if (isNativeToken) {
          balance = await provider.getBalance(address);
        } else if (tokenAddress === ZeroAddress) {
          balance = 0n;
        } else {
          const tokenContract = new Contract(tokenAddress, ERC20_ABI, provider);
          balance = await tokenContract.balanceOf(address);
        }
        const formattedBalance = Number(formatUnits(balance, tokenDecimals)).toFixed(4);
        setBalance(formattedBalance);
      } catch (error) {
        console.error("Error fetching balance:", error);
        setBalance("0");
        toast({
          title: "Failed to fetch balance",
          description: "Please try again later.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchBalance();
  }, [provider, address, tokenAddress, tokenDecimals, isNativeToken, networkChainId, toast]);

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-2 sm:p-3 md:p-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
          <span className="text-xs sm:text-sm md:text-base font-medium">Your Balance:</span>
          <span className="text-xs sm:text-sm md:text-base font-semibold truncate max-w-full sm:max-w-[180px] md:max-w-[200px]">
            {loading ? "Loading..." : `${balance} ${tokenSymbol}`}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

// FaucetCard component
function FaucetCard({ faucet, onNetworkSwitch }: { faucet: FaucetData; onNetworkSwitch: () => Promise<void> }) {
  const { chainId } = useWallet();
  const isOnCorrectNetwork = chainId === faucet.network?.chainId;
  const [startCountdown, setStartCountdown] = useState<string>("");
  const [endCountdown, setEndCountdown] = useState<string>("");

  useEffect(() => {
    const updateCountdown = () => {
      const now = Date.now();
      const start = Number(faucet.startTime || 0) * 1000;
      const end = Number(faucet.endTime || 0) * 1000;

      if (!start) {
        setStartCountdown("Inactive");
      } else if (start > now) {
        const diff = start - now;
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        setStartCountdown(`${days}d ${hours}h ${minutes}m ${seconds}s until active`);
      } else {
        setStartCountdown("Already Active");
      }

      if (end > now && faucet.isClaimActive) {
        const diff = end - now;
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        setEndCountdown(`${days}d ${hours}h ${minutes}m ${seconds}s until inactive`);
      } else if (end > 0 && end <= now) {
        setEndCountdown("Ended");
      } else {
        setEndCountdown("N/A");
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [faucet.startTime, faucet.endTime, faucet.isClaimActive]);

  // ✅ FIXED: Ensure proper token symbol display based on network
  const displayTokenSymbol = faucet.tokenSymbol || 
    (faucet.isEther ? getNativeTokenSymbol(faucet.network?.name || "Ethereum") : "TOK");

  return (
    <Card className="relative w-full max-w-[400px] mx-auto">
      {faucet.network && (
        <div className="absolute top-2 sm:top-3 right-2 sm:right-3">
          <Badge
            style={{ backgroundColor: faucet.network.color }}
            className="text-white text-[10px] sm:text-xs md:text-sm font-medium px-1.5 sm:px-2 py-0.5 sm:py-1"
          >
            {faucet.network.name}
          </Badge>
        </div>
      )}
      <CardHeader className="pb-1 sm:pb-2 px-3 sm:px-4">
        <CardTitle className="text-sm sm:text-base md:text-lg flex items-center justify-between pr-12 sm:pr-16 md:pr-20">
          <span className="truncate">{faucet.name || `${displayTokenSymbol} Faucet`}</span>
          {faucet.isClaimActive ? (
            <span className="text-[10px] sm:text-xs md:text-sm bg-green-500/20 text-green-600 dark:text-green-400 px-1.5 sm:px-2 py-0.5 rounded-full">
              Active
            </span>
          ) : (
            <span className="text-[10px] sm:text-xs md:text-sm bg-red-500/20 text-red-600 dark:text-red-400 px-1.5 sm:px-2 py-0.5 rounded-full">
              Inactive
            </span>
          )}
        </CardTitle>
        <CardDescription className="text-[10px] sm:text-xs md:text-sm truncate">
          {faucet.faucetAddress}
        </CardDescription>
      </CardHeader>
      <div className="px-3 sm:px-4 pb-1 sm:pb-2">
        {isOnCorrectNetwork ? (
          <TokenBalance
            tokenAddress={faucet.token || ZeroAddress}
            tokenSymbol={displayTokenSymbol}
            tokenDecimals={faucet.tokenDecimals || 18}
            isNativeToken={faucet.isEther}
            networkChainId={faucet.network?.chainId || 0}
          />
        ) : (
          <Card className="overflow-hidden">
            <CardContent className="p-2 sm:p-3 md:p-4">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                <span className="text-xs sm:text-sm md:text-base font-medium">Balance:</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onNetworkSwitch}
                  className="text-xs sm:text-sm md:text-base h-8 sm:h-9 w-full sm:w-auto"
                >
                  Switch to {faucet.network?.name || "Network"}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
      <CardContent className="pb-1 sm:pb-2 px-3 sm:px-4">
        <div className="space-y-1 sm:space-y-2 text-xs sm:text-sm md:text-base">
          <div className="flex justify-between items-center gap-2">
            <span className="text-muted-foreground">Network:</span>
            <span className="font-medium truncate">
              {faucet.network?.name || "Unknown"}
            </span>
          </div>
          <div className="flex justify-between items-center gap-2">
            <span className="text-muted-foreground">Balance:</span>
            <span className="font-medium truncate">
              {faucet.balance
                ? Number(formatUnits(faucet.balance, faucet.tokenDecimals || 18)).toFixed(4)
                : "0"}{" "}
              {displayTokenSymbol}
            </span>
          </div>
          <div className="flex justify-between items-center gap-2">
            <span className="text-muted-foreground">Drop Amount:</span>
            <span className="font-medium truncate">
              {faucet.claimAmount
                ? Number(formatUnits(faucet.claimAmount, faucet.tokenDecimals || 18)).toFixed(4)
                : "0"}{" "}
              {displayTokenSymbol}
            </span>
          </div>
          <div className="flex justify-between items-center gap-2">
            <span className="text-muted-foreground">Type:</span>
            <span className="font-medium">{faucet.isEther ? "Native Token" : "ERC20 Token"}</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="h-3 w-3 sm:h-4 sm:w-4 md:h-5 md:w-5 text-muted-foreground" />
            <span>{startCountdown}</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="h-3 w-3 sm:h-4 sm:w-4 md:h-5 md:w-5 text-muted-foreground" />
            <span>{endCountdown}</span>
          </div>
        </div>
      </CardContent>
      <CardFooter className="px-3 sm:px-4">
        <Link
          href={`/faucet/${faucet.faucetAddress}?networkId=${faucet.network?.chainId}`}
          className="w-full"
        >
          <Button
            variant="outline"
            className="w-full h-8 sm:h-9 md:h-10 text-xs sm:text-sm md:text-base"
          >
            <Coins className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4 md:h-5 md:w-5" />
            View Details
          </Button>
        </Link>
      </CardFooter>
    </Card>
  );
}

// Search and Filter Controls
function SearchAndFilterControls({
  searchTerm,
  setSearchTerm,
  filterBy,
  setFilterBy,
  sortBy,
  setSortBy,
  onClearFilters,
  hasActiveFilters
}: {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  filterBy: FilterOption;
  setFilterBy: (filter: FilterOption) => void;
  sortBy: SortOption;
  setSortBy: (sort: SortOption) => void;
  onClearFilters: () => void;
  hasActiveFilters: boolean;
}) {
  return (
    <div className="flex flex-col gap-3 sm:gap-4 mb-4 sm:mb-6">
      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search faucets by name, symbol, or address..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10 pr-4 h-9 sm:h-10 text-xs sm:text-sm"
        />
        {searchTerm && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSearchTerm("")}
            className="absolute right-2 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
          >
            <X className="h-3 w-3" />
          </Button>
        )}
      </div>

      {/* Filter and Sort Controls */}
      <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
        <div className="flex items-center gap-2 flex-1">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Select value={filterBy} onValueChange={(value: FilterOption) => setFilterBy(value)}>
            <SelectTrigger className="h-8 sm:h-9 text-xs sm:text-sm">
              <SelectValue placeholder="Filter by..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={FILTER_OPTIONS.ALL}>All Faucets</SelectItem>
              <SelectItem value={FILTER_OPTIONS.ACTIVE}>Active Only</SelectItem>
              <SelectItem value={FILTER_OPTIONS.INACTIVE}>Inactive Only</SelectItem>
              <SelectItem value={FILTER_OPTIONS.NATIVE}>Native Tokens</SelectItem>
              <SelectItem value={FILTER_OPTIONS.ERC20}>ERC20 Tokens</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2 flex-1">
          <SortAsc className="h-4 w-4 text-muted-foreground" />
          <Select value={sortBy} onValueChange={(value: SortOption) => setSortBy(value)}>
            <SelectTrigger className="h-8 sm:h-9 text-xs sm:text-sm">
              <SelectValue placeholder="Sort by..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={SORT_OPTIONS.DEFAULT}>Default (Active First)</SelectItem>
              <SelectItem value={SORT_OPTIONS.NAME_ASC}>Name A-Z</SelectItem>
              <SelectItem value={SORT_OPTIONS.NAME_DESC}>Name Z-A</SelectItem>
              <SelectItem value={SORT_OPTIONS.BALANCE_HIGH}>Balance (High to Low)</SelectItem>
              <SelectItem value={SORT_OPTIONS.BALANCE_LOW}>Balance (Low to High)</SelectItem>
              <SelectItem value={SORT_OPTIONS.AMOUNT_HIGH}>Drop Amount (High to Low)</SelectItem>
              <SelectItem value={SORT_OPTIONS.AMOUNT_LOW}>Drop Amount (Low to High)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {hasActiveFilters && (
          <Button
            variant="outline"
            size="sm"
            onClick={onClearFilters}
            className="h-8 sm:h-9 text-xs sm:text-sm px-3"
          >
            <X className="h-3 w-3 mr-1" />
            Clear
          </Button>
        )}
      </div>
    </div>
  );
}

export default function NetworkFaucets() {
  const { chainId: chainIdStr } = useParams<{ chainId: string }>();
  const router = useRouter();
  const { provider, ensureCorrectNetwork } = useWallet();
  const { networks, setNetwork } = useNetwork();
  const { toast } = useToast();
  const { goBack } = usePreviousPage();
  const [faucets, setFaucets] = useState<FaucetData[]>([]);
  const [loadingFaucets, setLoadingFaucets] = useState(true);
  const [page, setPage] = useState(1);
  const [switchingNetwork, setSwitchingNetwork] = useState(false);
  const { width, height } = useWindowSize();

  // Search and filter states
  const [searchTerm, setSearchTerm] = useState("");
  const [filterBy, setFilterBy] = useState<FilterOption>(FILTER_OPTIONS.ALL);
  const [sortBy, setSortBy] = useState<SortOption>(SORT_OPTIONS.DEFAULT);

  // ✅ FIXED: Parse chainId with proper validation and network lookup
  const chainId = chainIdStr ? parseInt(chainIdStr, 10) : NaN;
  const network = !isNaN(chainId) ? networks.find((n) => n.chainId === chainId) : undefined;

  console.log(`🌐 NetworkFaucets: chainId=${chainId}, network=${network?.name || 'not found'}`);

  // Calculate faucetsPerPage based on screen size and viewport height
  const calculateFaucetsPerPage = useCallback(() => {
    if (!height || !width) {
      if (width < 640) return 5;
      if (width < 1024) return 8;
      return 10;
    }

    const headerHeight = width < 640 ? 60 : 120;
    const searchFilterHeight = width < 640 ? 120 : 80; // Space for search/filter controls
    const paginationHeight = width < 640 ? 50 : 60;
    const containerPadding = width < 640 ? 32 : 64;
    const cardHeight = width < 640 ? 300 : width < 1024 ? 320 : 350;
    const gridGap = width < 640 ? 12 : width < 1024 ? 16 : 24;

    const availableHeight = height - (headerHeight + searchFilterHeight + paginationHeight + containerPadding);
    const cardsPerColumn = Math.floor(availableHeight / (cardHeight + gridGap));
    const columns = width < 640 ? 1 : width < 1024 ? 2 : 3;
    let faucetsPerPage = cardsPerColumn * columns;

    faucetsPerPage = Math.max(3, Math.min(12, faucetsPerPage));
    if (faucetsPerPage <= 0) faucetsPerPage = 3;

    return faucetsPerPage;
  }, [width, height]);

  const [faucetsPerPage, setFaucetsPerPage] = useState(calculateFaucetsPerPage());

  useEffect(() => {
    const newFaucetsPerPage = calculateFaucetsPerPage();
    if (newFaucetsPerPage !== faucetsPerPage) {
      setFaucetsPerPage(newFaucetsPerPage);
      setPage(1);
    }
  }, [calculateFaucetsPerPage, faucetsPerPage]);

  // Filter and sort faucets
  const filteredAndSortedFaucets = useMemo(() => {
    let filtered = [...faucets];

    // Apply search filter
    if (searchTerm.trim()) {
      const search = searchTerm.toLowerCase().trim();
      filtered = filtered.filter((faucet) => {
        const name = (faucet.name || faucet.tokenSymbol || "").toLowerCase();
        const symbol = (faucet.tokenSymbol || "").toLowerCase();
        const address = faucet.faucetAddress.toLowerCase();
        return name.includes(search) || symbol.includes(search) || address.includes(search);
      });
    }

    // Apply type filter
    if (filterBy !== FILTER_OPTIONS.ALL) {
      filtered = filtered.filter((faucet) => {
        switch (filterBy) {
          case FILTER_OPTIONS.ACTIVE:
            return faucet.isClaimActive;
          case FILTER_OPTIONS.INACTIVE:
            return !faucet.isClaimActive;
          case FILTER_OPTIONS.NATIVE:
            return faucet.isEther;
          case FILTER_OPTIONS.ERC20:
            return !faucet.isEther;
          default:
            return true;
        }
      });
    }

    // Apply sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case SORT_OPTIONS.DEFAULT:
          // Active first, then by latest (createdAt or startTime)
          if (a.isClaimActive !== b.isClaimActive) {
            return a.isClaimActive ? -1 : 1;
          }
          const aTime = Number(a.createdAt || a.startTime || 0);
          const bTime = Number(b.createdAt || b.startTime || 0);
          return bTime - aTime;

        case SORT_OPTIONS.NAME_ASC:
          const aName = (a.name || a.tokenSymbol || "").toLowerCase();
          const bName = (b.name || b.tokenSymbol || "").toLowerCase();
          return aName.localeCompare(bName);

        case SORT_OPTIONS.NAME_DESC:
          const aNameDesc = (a.name || a.tokenSymbol || "").toLowerCase();
          const bNameDesc = (b.name || b.tokenSymbol || "").toLowerCase();
          return bNameDesc.localeCompare(aNameDesc);

        case SORT_OPTIONS.BALANCE_HIGH:
          const aBalance = Number(formatUnits(a.balance || 0n, a.tokenDecimals || 18));
          const bBalance = Number(formatUnits(b.balance || 0n, b.tokenDecimals || 18));
          return bBalance - aBalance;

        case SORT_OPTIONS.BALANCE_LOW:
          const aBalanceLow = Number(formatUnits(a.balance || 0n, a.tokenDecimals || 18));
          const bBalanceLow = Number(formatUnits(b.balance || 0n, b.tokenDecimals || 18));
          return aBalanceLow - bBalanceLow;

        case SORT_OPTIONS.AMOUNT_HIGH:
          const aAmount = Number(formatUnits(a.claimAmount || 0n, a.tokenDecimals || 18));
          const bAmount = Number(formatUnits(b.claimAmount || 0n, b.tokenDecimals || 18));
          return bAmount - aAmount;

        case SORT_OPTIONS.AMOUNT_LOW:
          const aAmountLow = Number(formatUnits(a.claimAmount || 0n, a.tokenDecimals || 18));
          const bAmountLow = Number(formatUnits(b.claimAmount || 0n, b.tokenDecimals || 18));
          return aAmountLow - bAmountLow;

        default:
          return 0;
      }
    });

    return filtered;
  }, [faucets, searchTerm, filterBy, sortBy]);

  // ✅ FIXED: Enhanced loadFaucets function with proper network handling
  const loadFaucets = useCallback(async () => {
    if (!network || isNaN(chainId)) {
      console.log("Skipping loadFaucets: network undefined or invalid chainId", { chainId, network });
      setLoadingFaucets(false);
      return;
    }

    console.log(`🔄 Loading faucets for network: ${network.name} (Chain ID: ${network.chainId})`);
    setLoadingFaucets(true);
    
    try {
      // ✅ CRITICAL FIX: Create a provider for the target network to read data
      const networkProvider = new JsonRpcProvider(network.rpcUrl);
      console.log(`🔗 Using network RPC: ${network.rpcUrl}`);
      
      // ✅ Pass the network-specific provider to getFaucetsForNetwork
      const fetchedFaucets = await getFaucetsForNetwork(network, networkProvider);
      
      // ✅ Ensure all faucets have the correct network information
      const faucetsWithNetwork = fetchedFaucets
        .filter((f) => f && f.faucetAddress)
        .map((faucet) => ({
          ...faucet,
          network: network, // Ensure correct network is set
          tokenSymbol: faucet.tokenSymbol || 
            (faucet.isEther ? getNativeTokenSymbol(network.name) : "TOK")
        }));
      
      console.log(`✅ Loaded ${faucetsWithNetwork.length} faucets for ${network.name}`);
      console.log("Sample faucet:", faucetsWithNetwork[0] ? {
        address: faucetsWithNetwork[0].faucetAddress,
        network: faucetsWithNetwork[0].network?.name,
        symbol: faucetsWithNetwork[0].tokenSymbol,
        isEther: faucetsWithNetwork[0].isEther
      } : "No faucets found");
      
      setFaucets(faucetsWithNetwork);
      setPage(1);
    } catch (error) {
      console.error(`❌ Error loading faucets for network ${network.name} (chainId ${chainId}):`, error);
      toast({
        title: `Failed to load faucets for ${network.name}`,
        description: "Please try again later.",
        variant: "destructive",
      });
      setFaucets([]); // Clear faucets on error
    } finally {
      setLoadingFaucets(false);
    }
  }, [network, chainId, toast]);

  useEffect(() => {
    if (isNaN(chainId) || !network) {
      console.log("❌ Invalid chainId or network not found", { chainId, network, chainIdStr });
      toast({
        title: "Network Not Found",
        description: `Network with chain ID ${chainIdStr || "unknown"} is not supported`,
        variant: "destructive",
      });
      router.push("/");
      return;
    }

    console.log(`✅ Valid network found: ${network.name} (${network.chainId})`);
    loadFaucets();
  }, [chainId, network, router, toast, loadFaucets, chainIdStr]);

  const handleNetworkSwitch = async (targetChainId: number) => {
    setSwitchingNetwork(true);
    try {
      const targetNetwork = networks.find((n) => n.chainId === targetChainId);
      if (!targetNetwork) {
        throw new Error(`Target network with chainId ${targetChainId} not found`);
      }
      console.log(`🔄 Switching to network: ${targetNetwork.name} (${targetChainId})`);
      setNetwork(targetNetwork);
      await ensureCorrectNetwork(targetChainId);
    } catch (error) {
      console.error("❌ Error switching network:", error);
      toast({
        title: "Network switch failed",
        description: "Failed to switch network. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSwitchingNetwork(false);
    }
  };

  const handleClearFilters = () => {
    setSearchTerm("");
    setFilterBy(FILTER_OPTIONS.ALL);
    setSortBy(SORT_OPTIONS.DEFAULT);
    setPage(1);
  };

  const hasActiveFilters = searchTerm.trim() !== "" || filterBy !== FILTER_OPTIONS.ALL || sortBy !== SORT_OPTIONS.DEFAULT;

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [searchTerm, filterBy, sortBy]);

  const totalPages = Math.ceil(filteredAndSortedFaucets.length / faucetsPerPage);
  const paginatedFaucets = filteredAndSortedFaucets.slice((page - 1) * faucetsPerPage, page * faucetsPerPage);

  const getPageButtons = () => {
    const buttons = [];
    const maxButtons = 5;
    const start = Math.max(1, page - Math.floor(maxButtons / 2));
    const end = Math.min(totalPages, start + maxButtons - 1);

    if (start > 1) {
      buttons.push(
        <Button
          key={1}
          variant={1 === page ? "default" : "outline"}
          size="sm"
          onClick={() => setPage(1)}
          className="w-8 h-8 sm:w-9 sm:h-9 text-xs sm:text-sm"
        >
          1
        </Button>
      );
      if (start > 2) buttons.push(<span key="start-ellipsis" className="text-xs sm:text-sm">...</span>);
    }

    for (let p = start; p <= end; p++) {
      buttons.push(
        <Button
          key={p}
          variant={p === page ? "default" : "outline"}
          size="sm"
          onClick={() => setPage(p)}
          className="w-8 h-8 sm:w-9 sm:h-9 text-xs sm:text-sm"
        >
          {p}
        </Button>
      );
    }

    if (end < totalPages) {
      if (end < totalPages - 1) buttons.push(<span key="end-ellipsis" className="text-xs sm:text-sm">...</span>);
      buttons.push(
        <Button
          key={totalPages}
          variant={totalPages === page ? "default" : "outline"}
          size="sm"
          onClick={() => setPage(totalPages)}
          className="w-8 h-8 sm:w-9 sm:h-9 text-xs sm:text-sm"
        >
          {totalPages}
        </Button>
      );
    }

    return buttons;
  };

  return (
    <div className="container mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-6 md:py-8 space-y-4 sm:space-y-6">
      {/* Header with Back Button */}
      <div className="flex items-center gap-4 mb-6">
        <Button 
          variant="outline" 
          size="sm" 
          onClick={goBack}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
        <div className="flex-1">
          <Header
            pageTitle={`Faucets on ${network?.name || "Unknown Network"}`}
            onRefresh={loadFaucets}
            loading={loadingFaucets}
          />
        </div>
      </div>

      {/* Search and Filter Controls */}
      <SearchAndFilterControls
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        filterBy={filterBy}
        setFilterBy={setFilterBy}
        sortBy={sortBy}
        setSortBy={setSortBy}
        onClearFilters={handleClearFilters}
        hasActiveFilters={hasActiveFilters}
      />

      {loadingFaucets ? (
        <div className="flex justify-center items-center py-8 sm:py-10 md:py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 sm:h-10 sm:w-10 md:h-12 md:w-12 border-b-2 border-primary mx-auto"></div>
            <p className="mt-3 sm:mt-4 text-xs sm:text-sm md:text-base">Loading faucets...</p>
          </div>
        </div>
      ) : filteredAndSortedFaucets.length === 0 ? (
        <Card className="w-full max-w-[400px] mx-auto">
          <CardContent className="flex flex-col items-center justify-center py-6 sm:py-8 md:py-10">
            <Coins className="h-8 w-8 sm:h-10 sm:w-10 md:h-12 md:w-12 text-muted-foreground mb-2 sm:mb-3 md:mb-4" />
            <h3 className="text-base sm:text-lg md:text-xl font-medium mb-1 sm:mb-2">
              {faucets.length === 0 ? "No Faucets Found" : "No Matching Faucets"}
            </h3>
            <p className="text-xs sm:text-sm md:text-base text-muted-foreground mb-3 sm:mb-4 md:mb-6 text-center">
              {faucets.length === 0 
                ? `No faucets are available on ${network?.name || "this network"} yet.`
                : "Try adjusting your search or filter criteria."
              }
            </p>
            {faucets.length === 0 ? (
              <Link href="/create">
                <Button className="h-8 sm:h-9 md:h-10 text-xs sm:text-sm md:text-base">
                  Create Faucet
                </Button>
              </Link>
            ) : (
              <Button 
                onClick={handleClearFilters}
                className="h-8 sm:h-9 md:h-10 text-xs sm:text-sm md:text-base"
              >
                Clear Filters
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Results Summary */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 text-xs sm:text-sm text-muted-foreground">
            <span>
              Showing {filteredAndSortedFaucets.length} of {faucets.length} faucets on {network?.name || "Unknown Network"}
              {hasActiveFilters && " (filtered)"}
            </span>
            {hasActiveFilters && (
              <div className="flex items-center gap-2">
                <span className="text-primary font-medium">Filters applied</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClearFilters}
                  className="h-6 text-xs px-2"
                >
                  Clear all
                </Button>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 md:gap-6">
            {paginatedFaucets.map((faucet) => (
              <FaucetCard
                key={`${faucet.faucetAddress}-${network?.chainId || chainId}`}
                faucet={faucet}
                onNetworkSwitch={() => handleNetworkSwitch(faucet.network?.chainId || 0)}
              />
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex flex-col sm:flex-row justify-between items-center gap-3 sm:gap-4 mt-4 sm:mt-6">
              <div className="text-xs sm:text-sm md:text-base text-muted-foreground text-center sm:text-left">
                Showing {(page - 1) * faucetsPerPage + 1} to{" "}
                {Math.min(page * faucetsPerPage, filteredAndSortedFaucets.length)} of {filteredAndSortedFaucets.length} faucets
              </div>
              <div className="flex items-center gap-1 sm:gap-2 flex-wrap justify-center">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1 || loadingFaucets}
                  className="h-8 sm:h-9 md:h-10 text-xs sm:text-sm md:text-base px-2 sm:px-3"
                >
                  Previous
                </Button>
                {getPageButtons()}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages || loadingFaucets}
                  className="h-8 sm:h-9 md:h-10 text-xs sm:text-sm md:text-base px-2 sm:px-3"
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}