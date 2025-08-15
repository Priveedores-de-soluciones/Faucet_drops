"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { FaucetsCreatedChart } from "./charts/faucet-created-chart"
import { TransactionsPerDayChart } from "./charts/transactions-per-day"
import { NewUsersChart } from "./charts/new-users-chart"
import { UserClaimsChart } from "./charts/user-claims-chart"
import { BarChart3, PieChart, TrendingUp, Users, Loader2 } from "lucide-react"
import { useState, useEffect, createContext, useContext } from "react"
import { ethers, Contract, JsonRpcProvider, isAddress } from "ethers"
import { useNetwork } from "@/hooks/use-network"
import { FACTORY_ABI_DROPCODE, FACTORY_ABI_DROPLIST, FACTORY_ABI_CUSTOM } from "@/lib/abis"
import { getFaucetsForNetwork, getAllClaimsForAllNetworks } from "@/lib/faucet"

// Factory type definitions
type FactoryType = 'dropcode' | 'droplist' | 'custom'

interface FactoryConfig {
  abi: any[]
  createFunction: string
}

// Helper function to get the appropriate ABI and function based on factory type
function getFactoryConfig(factoryType: FactoryType): FactoryConfig {
  switch (factoryType) {
    case 'dropcode':
      return { abi: FACTORY_ABI_DROPCODE, createFunction: 'createBackendFaucet' }
    case 'droplist':
      return { abi: FACTORY_ABI_DROPLIST, createFunction: 'createWhitelistFaucet' }
    case 'custom':
      return { abi: FACTORY_ABI_CUSTOM, createFunction: 'createCustomFaucet' }
    default:
      throw new Error(`Unknown factory type: ${factoryType}`)
  }
}

// Helper function to detect factory type by trying different function calls
async function detectFactoryType(provider: JsonRpcProvider, factoryAddress: string): Promise<FactoryType> {
  const factoryTypes: FactoryType[] = ['dropcode', 'droplist', 'custom']
  
  for (const type of factoryTypes) {
    try {
      const config = getFactoryConfig(type)
      const contract = new Contract(factoryAddress, config.abi, provider)
      
      // Try to call getAllTransactions to see if it exists with this ABI
      await contract.getAllTransactions.staticCall()
      return type
    } catch (error: any) {
      // If the function doesn't exist, try the next type
      if (error.message?.includes('function') && error.message?.includes('not found')) {
        continue
      }
      // If it's a different error (like invalid parameters), the function exists
      return type
    }
  }
  
  // Default to dropcode if detection fails
  console.warn(`Could not detect factory type for ${factoryAddress}, defaulting to dropcode`)
  return 'dropcode'
}

// Cache keys for dashboard data
const DASHBOARD_STORAGE_KEYS = {
  DASHBOARD_DATA: 'dashboard_data',
  LAST_UPDATED: 'dashboard_last_updated'
};

// Cache duration (5 minutes)
const CACHE_DURATION = 5 * 60 * 1000;

// Helper functions for localStorage
function saveToLocalStorage(key: string, data: any) {
  try {
    if (typeof window !== 'undefined') {
      localStorage.setItem(key, JSON.stringify(data, (k, v) => 
        typeof v === 'bigint' ? v.toString() : v
      ));
    }
  } catch (error) {
    console.warn('Failed to save to localStorage:', error);
  }
}

function loadFromLocalStorage<T>(key: string): T | null {
  try {
    if (typeof window !== 'undefined') {
      const data = localStorage.getItem(key);
      if (!data) return null;
      
      return JSON.parse(data, (k, v) => {
        if (k === 'amount' && typeof v === 'string' && /^\d+$/.test(v)) {
          return BigInt(v);
        }
        return v;
      });
    }
    return null;
  } catch (error) {
    console.warn('Failed to load from localStorage:', error);
    return null;
  }
}

function isCacheValid(): boolean {
  const lastUpdated = loadFromLocalStorage<number>(DASHBOARD_STORAGE_KEYS.LAST_UPDATED);
  return lastUpdated ? Date.now() - lastUpdated < CACHE_DURATION : false;
}

const STORAGE_NETWORKS = {
  42220: {
    contractAddress: "0x3fC5162779F545Bb4ea7980471b823577825dc8A",
    rpcUrl: "https://forno.celo.org",
    name: "Celo"
  },
  1135: {
    contractAddress: "0xc5f8c2A85520c0A3595C29e004b2f5D9e7CE3b0B",
    rpcUrl: "https://mainnet.base.org/",
    name: "Custom"
  },
  42161: {
    contractAddress: "0x6087810cFc24310E85736Cbd500e4c1d5a45E196",
    rpcUrl: "https://arb1.arbitrum.io/rpc",
    name: "Arbitrum"
  },
}

interface DashboardData {
  totalClaims: number
  uniqueUsers: number
  totalFaucets: number
  totalTransactions: number
  unifiedClaims: any[]
  monthlyChange: {
    claims: string
    users: string
    faucets: string
    transactions: string
  }
}

interface DashboardContextType {
  data: DashboardData | null
  loading: boolean
  error: string | null
  refetch: () => void
}

const DashboardContext = createContext<DashboardContextType>({
  data: null,
  loading: true,
  error: null,
  refetch: () => {}
})

export const useDashboardContext = () => useContext(DashboardContext)

async function getAllClaimsFromAllFactories(networks: any[]): Promise<{
  faucetAddress: string
  transactionType: string
  initiator: string
  amount: bigint
  isEther: boolean
  timestamp: number
  networkName: string
  chainId: number
}[]> {
  const allClaims: any[] = [];

  for (const network of networks) {
    try {
      console.log(`Fetching drops from factories on ${network.name}...`);
      
      const provider = new JsonRpcProvider(network.rpcUrl);
      const { transactions } = await getAllClaimsFromFactories(provider, network);
      
      const networkClaims = transactions.map(claim => ({
        ...claim,
        networkName: network.name,
        chainId: network.chainId
      }));
      
      allClaims.push(...networkClaims);
      console.log(`Added ${networkClaims.length} drops from ${network.name}`);
    } catch (error) {
      console.error(`Error fetching drops from ${network.name}:`, error);
    }
  }

  allClaims.sort((a, b) => b.timestamp - a.timestamp);
  return allClaims;
}

async function getAllClaimsFromFactories(
  provider: JsonRpcProvider,
  network: any,
): Promise<{
  transactions: {
    faucetAddress: string
    transactionType: string
    initiator: string
    amount: bigint
    isEther: boolean
    timestamp: number
  }[]
  totalClaims: number
  claimsByFaucet: Record<string, number>
}> {
  try {
    let allClaims: any[] = [];

    if (network.factoryAddresses) {
      for (const factoryAddress of network.factoryAddresses) {
        if (!isAddress(factoryAddress)) {
          console.warn(`Invalid factory address ${factoryAddress} on ${network.name}, skipping`);
          continue;
        }

        // Detect factory type and get appropriate ABI
        let factoryType: FactoryType;
        let config: FactoryConfig;
        
        try {
          factoryType = await detectFactoryType(provider, factoryAddress);
          config = getFactoryConfig(factoryType);
          console.log(`Detected factory type for ${factoryAddress}: ${factoryType}`);
        } catch (error) {
          console.warn(`Could not detect factory type for ${factoryAddress}, using default:`, error);
          factoryType = 'dropcode';
          config = getFactoryConfig(factoryType);
        }

        const factoryContract = new Contract(factoryAddress, config.abi, provider);

        const code = await provider.getCode(factoryAddress);
        if (code === "0x") {
          console.warn(`No contract at factory address ${factoryAddress} on ${network.name}`);
          continue;
        }

        try {
          console.log(`Fetching transactions from factory ${factoryAddress} (${factoryType})...`);
          const allTransactions = await factoryContract.getAllTransactions();
          
          const claimTransactions = allTransactions.filter((tx: any) => 
            tx.transactionType.toLowerCase().includes('claim')
          );
          
          console.log(`Found ${claimTransactions.length} claim transactions from factory ${factoryAddress}`);
          allClaims.push(...claimTransactions);
        } catch (error) {
          console.warn(`Error fetching transactions from factory ${factoryAddress}:`, error);
        }
      }
    }

    const mappedClaims = allClaims.map((tx: any) => ({
      faucetAddress: tx.faucetAddress as string,
      transactionType: tx.transactionType as string,
      initiator: tx.initiator as string,
      amount: BigInt(tx.amount),
      isEther: tx.isEther as boolean,
      timestamp: Number(tx.timestamp),
    }));

    const claimsByFaucet: Record<string, number> = {};
    mappedClaims.forEach(claim => {
      const faucetAddress = claim.faucetAddress.toLowerCase();
      claimsByFaucet[faucetAddress] = (claimsByFaucet[faucetAddress] || 0) + 1;
    });

    const result = {
      transactions: mappedClaims,
      totalClaims: mappedClaims.length,
      claimsByFaucet
    };

    console.log(`Total drops fetched from ${network.name} factories: ${result.totalClaims}`);
    return result;
  } catch (error: any) {
    console.error(`Error fetching drops from factories on ${network.name}:`, error);
    throw new Error(error.message || "Failed to fetch drops from factories");
  }
}

function calculateChange(current: number, previous: number): string {
  if (previous === 0) return current > 0 ? "+∞%" : "+0.0%"
  const change = ((current - previous) / previous) * 100
  return `${change >= 0 ? '+' : ''}${change.toFixed(1)}%`
}

function getLastMonthData(claims: any[]): { claimsLastMonth: number, usersLastMonth: number } {
  const now = new Date()
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0)
  
  const lastMonthClaims = claims.filter(claim => {
    const claimDate = new Date(Number(claim.timestamp) * 1000)
    return claimDate >= lastMonthStart && claimDate <= lastMonthEnd
  })
  
  const uniqueUsersLastMonth = new Set(lastMonthClaims.map(claim => 
    claim.claimer ? claim.claimer.toLowerCase() : claim.initiator.toLowerCase()
  )).size
  
  return {
    claimsLastMonth: lastMonthClaims.length,
    usersLastMonth: uniqueUsersLastMonth
  }
}

function useDashboardData() {
  const { networks } = useNetwork()
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = async () => {
    setLoading(true)
    setError(null)
    
    try {
      if (isCacheValid()) {
        const cachedData = loadFromLocalStorage<DashboardData>(DASHBOARD_STORAGE_KEYS.DASHBOARD_DATA)
        if (cachedData) {
          console.log('Using cached dashboard data')
          setData(cachedData)
          setLoading(false)
          return
        }
      }

      console.log("Fetching unified drops data from both storage and factory sources...");
      
      const storageClaims = await getAllClaimsForAllNetworks(networks);
      console.log("Fetched storage drops:", storageClaims.length);
      
      const factoryClaims = await getAllClaimsFromAllFactories(networks);
      console.log("Fetched factory drops:", factoryClaims.length);

      const allClaimsUnified = [
        ...storageClaims.map(claim => ({
          claimer: claim.claimer,
          faucet: claim.faucet,
          amount: claim.amount,
          networkName: claim.networkName,
          chainId: typeof claim.chainId === 'bigint' ? Number(claim.chainId) : claim.chainId,
          tokenSymbol: claim.tokenSymbol,
          tokenDecimals: claim.tokenDecimals,
          isEther: claim.isEther,
          timestamp: claim.timestamp,
          source: 'storage'
        })),
        ...factoryClaims.map(claim => ({
          claimer: claim.initiator,
          faucet: claim.faucetAddress,
          amount: claim.amount,
          networkName: claim.networkName,
          chainId: claim.chainId,
          tokenSymbol: claim.isEther ? 'ETH' : 'TOKEN',
          tokenDecimals: claim.isEther ? 18 : 18,
          isEther: claim.isEther,
          timestamp: claim.timestamp,
          source: 'factory'
        }))
      ];

      console.log(`Total unified claims: ${allClaimsUnified.length}`);

      const totalClaims = allClaimsUnified.length;
      const uniqueUsers = new Set(
        allClaimsUnified
          .filter(claim => claim.claimer && typeof claim.claimer === 'string' && claim.claimer.startsWith('0x'))
          .map(claim => claim.claimer.toLowerCase())
      );
      const totalUniqueUsers = uniqueUsers.size;

      let totalFaucets = 0;
      await Promise.all(
        networks.map(async (network) => {
          try {
            const faucets = await getFaucetsForNetwork(network)
            totalFaucets += faucets.length
            console.log(`Fetched ${faucets.length} faucets from ${network.name}`)
          } catch (err) {
            console.error(`Error fetching faucets for ${network.name}:`, err)
          }
        })
      )
      
      let totalTransactions = 0;
      for (const network of networks) {
        if (network?.factoryAddresses) {
          const provider = new ethers.JsonRpcProvider(network.rpcUrl)
          
          for (const factoryAddress of network.factoryAddresses) {
            try {
              // Detect factory type and use appropriate ABI
              const factoryType = await detectFactoryType(provider, factoryAddress);
              const config = getFactoryConfig(factoryType);
              
              const factoryContract = new ethers.Contract(factoryAddress, config.abi, provider)
              const transactions = await factoryContract.getAllTransactions()
              totalTransactions += transactions.length
              console.log(`Fetched ${transactions.length} transactions from ${network.name} factory ${factoryAddress} (${factoryType})`)
            } catch (err) {
              console.error(`Error fetching transactions from factory ${factoryAddress}:`, err)
            }
          }
        }
      }
      
      const { claimsLastMonth, usersLastMonth } = getLastMonthData(allClaimsUnified)
      
      const currentMonthClaims = allClaimsUnified.filter(claim => {
        const claimDate = new Date(Number(claim.timestamp) * 1000)
        const now = new Date()
        return claimDate.getMonth() === now.getMonth() && claimDate.getFullYear() === now.getFullYear()
      }).length
      
      const currentMonthUsers = new Set(
        allClaimsUnified
          .filter(claim => {
            const claimDate = new Date(Number(claim.timestamp) * 1000)
            const now = new Date()
            return claimDate.getMonth() === now.getMonth() && claimDate.getFullYear() === now.getFullYear()
          })
          .filter(claim => claim.claimer && typeof claim.claimer === 'string' && claim.claimer.startsWith('0x'))
          .map(claim => claim.claimer.toLowerCase())
      ).size
      
      const dashboardData: DashboardData = {
        totalClaims,
        uniqueUsers: totalUniqueUsers,
        totalFaucets,
        totalTransactions,
        unifiedClaims: allClaimsUnified,
        monthlyChange: {
          claims: calculateChange(currentMonthClaims, claimsLastMonth),
          users: calculateChange(currentMonthUsers, usersLastMonth),
          faucets: calculateChange(Math.ceil(totalFaucets * 0.1), Math.ceil(totalFaucets * 0.08)),
          transactions: calculateChange(Math.ceil(totalTransactions * 0.15), Math.ceil(totalTransactions * 0.12))
        }
      }
      
      console.log("Unified dashboard data:", {
        totalClaims,
        uniqueUsers: totalUniqueUsers,
        totalFaucets,
        totalTransactions
      });

      saveToLocalStorage(DASHBOARD_STORAGE_KEYS.DASHBOARD_DATA, dashboardData)
      saveToLocalStorage(DASHBOARD_STORAGE_KEYS.LAST_UPDATED, Date.now())
      
      setData(dashboardData)
      
    } catch (err) {
      console.error("Error fetching dashboard data:", err)
      setError("Failed to fetch dashboard data")
      
      const cachedData = loadFromLocalStorage<DashboardData>(DASHBOARD_STORAGE_KEYS.DASHBOARD_DATA)
      if (cachedData) {
        console.log('Using cached dashboard data as fallback')
        setData(cachedData)
      } else {
        setData({
          totalClaims: 0,
          uniqueUsers: 0,
          totalFaucets: 0,
          totalTransactions: 0,
          unifiedClaims: [],
          monthlyChange: {
            claims: "+0.0%",
            users: "+0.0%",
            faucets: "+0.0%",
            transactions: "+0.0%"
          }
        })
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const cachedData = loadFromLocalStorage<DashboardData>(DASHBOARD_STORAGE_KEYS.DASHBOARD_DATA)
    if (cachedData && isCacheValid()) {
      console.log('Loading cached dashboard data on mount')
      setData(cachedData)
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (networks.length > 0) {
      if (!isCacheValid()) {
        fetchData()
      }
    }
  }, [networks])

  return { data, loading, error, refetch: fetchData }
}

function StatCardSkeleton() {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="h-4 w-24 bg-muted animate-pulse rounded" />
        <div className="h-4 w-4 bg-muted animate-pulse rounded" />
      </CardHeader>
      <CardContent>
        <div className="h-8 w-16 bg-muted animate-pulse rounded mb-2" />
        <div className="h-3 w-32 bg-muted animate-pulse rounded" />
      </CardContent>
    </Card>
  )
}

function ErrorCard({ message }: { message: string }) {
  return (
    <Card className="border-destructive">
      <CardContent className="pt-6">
        <div className="text-center text-destructive">
          <p className="text-sm">{message}</p>
        </div>
      </CardContent>
    </Card>
  )
}

function StatCard({ 
  title, 
  value, 
  change, 
  icon: Icon, 
  loading 
}: {
  title: string
  value?: number
  change?: string
  icon: any
  loading: boolean
}) {
  if (loading) {
    return <StatCardSkeleton />
  }

  const isPositive = change?.startsWith('+') && !change.includes('∞')

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">
          {title}
        </CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">
          {value?.toLocaleString() ?? 0}
        </div>
      </CardContent>
    </Card>
  )
}

function DashboardProvider({ children }: { children: React.ReactNode }) {
  const dashboardData = useDashboardData()
  
  return (
    <DashboardContext.Provider value={dashboardData}>
      {children}
    </DashboardContext.Provider>
  )
}

interface AnalyticsDashboardProps {
  data?: DashboardData
  loading?: boolean
  error?: string
}

function DashboardContent({ data: propData, loading: propLoading, error: propError }: AnalyticsDashboardProps = {}) {
  const { data, loading, error, refetch } = useDashboardContext()
  const { networks } = useNetwork()
  
  const finalData = propData ?? data
  const finalLoading = propLoading ?? loading
  const finalError = propError ?? error

  // Get totalClaims from UserClaimsChart's localStorage or fallback to dashboard data
  const getTotalClaims = () => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('totalclaim');
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          if (typeof parsed === 'number') {
            return parsed;
          }
        } catch (e) {
          console.warn('Error parsing totalclaim from localStorage:', e);
        }
      }
    }
    return finalData?.totalClaims ?? 272;
  };

  return (
    <div className="w-full min-h-screen bg-background p-4 md:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="text-center md:text-left">
          <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold tracking-tight">
            Analytics Dashboard
          </h1>
          <p className="text-muted-foreground mt-2">
            Data aggregated from all networks using multi-factory ABI system
          </p>
          {finalLoading && (
            <div className="flex items-center justify-center md:justify-start mt-2">
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              <span className="text-sm text-muted-foreground">Loading analytics...</span>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          {finalError ? (
            <>
              <ErrorCard message={finalError} />
              <ErrorCard message={finalError} />
              <ErrorCard message={finalError} />
              <ErrorCard message={finalError} />
            </>
          ) : (
            <>
              <StatCard
                title="Total Faucets"
                value={finalData?.totalFaucets}
                change={finalData?.monthlyChange.faucets}
                icon={PieChart}
                loading={finalLoading}
              />
              <StatCard
                title="Total Transactions"
                value={finalData?.totalTransactions}
                change={finalData?.monthlyChange.transactions}
                icon={TrendingUp}
                loading={finalLoading}
              />
              <StatCard
                title="Unique Users"
                value={finalData?.uniqueUsers}
                change={finalData?.monthlyChange.users}
                icon={Users}
                loading={finalLoading}
              />
              <StatCard
                title="Total Drops"
                value={getTotalClaims()}
                change={finalData?.monthlyChange.claims}
                icon={BarChart3}
                loading={finalLoading}
              />
            </>
          )}
        </div>

        <Tabs defaultValue="faucets" className="w-full">
          <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 h-auto">
            <TabsTrigger 
              value="faucets" 
              className="text-xs md:text-sm px-2 py-2 md:px-4"
            >
              <span className="hidden sm:inline">Faucets Created</span>
              <span className="sm:hidden">Faucets</span>
            </TabsTrigger>
            <TabsTrigger 
              value="transactions" 
              className="text-xs md:text-sm px-2 py-2 md:px-4"
            >
              <span className="hidden sm:inline">Transactions</span>
              <span className="sm:hidden">Transactions</span>
            </TabsTrigger>
            <TabsTrigger 
              value="users" 
              className="text-xs md:text-sm px-2 py-2 md:px-4"
            >
              <span className="hidden sm:inline">New Users</span>
              <span className="sm:hidden">Users</span>
            </TabsTrigger>
            <TabsTrigger 
              value="claims" 
              className="text-xs md:text-sm px-2 py-2 md:px-4"
            >
              <span className="hidden sm:inline">Drops</span>
              <span className="sm:hidden">Drops</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="faucets" className="space-y-4 mt-6">
            <Card>
              <CardHeader className="px-4 md:px-6">
                <CardTitle className="text-lg md:text-xl">
                  Faucets Created
                </CardTitle>
                <CardDescription className="text-sm">
                  Number of new faucets created across all networks and factory types
                </CardDescription>
              </CardHeader>
              <CardContent className="px-4 md:px-6">
                <div className="w-full overflow-hidden">
                  <FaucetsCreatedChart />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="transactions" className="space-y-4 mt-6">
            <Card>
              <CardHeader className="px-4 md:px-6">
                <CardTitle className="text-lg md:text-xl">
                  Transactions
                </CardTitle>
                <CardDescription className="text-sm">
                  Total number of transactions across all networks and factory types
                </CardDescription>
              </CardHeader>
              <CardContent className="px-4 md:px-6">
                <div className="w-full overflow-hidden">
                  <TransactionsPerDayChart />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="users" className="space-y-4 mt-6">
            <Card>
              <CardHeader className="px-4 md:px-6">
                <CardTitle className="text-lg md:text-xl">
                  New Users
                </CardTitle>
                <CardDescription className="text-sm">
                  Number of unique users across all networks and factory types
                </CardDescription>
              </CardHeader>
              <CardContent className="px-4 md:px-6">
                <div className="w-full overflow-hidden">
                  <NewUsersChart />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="claims" className="space-y-4 mt-6">
            <Card>
              <CardHeader className="px-4 md:px-6">
                <CardTitle className="text-lg md:text-xl">
                  Drops
                </CardTitle>
                <CardDescription className="text-sm">
                  Number of drops made across all networks and factory types
                </CardDescription>
              </CardHeader>
              <CardContent className="px-4 md:px-6">
                <div className="w-full overflow-hidden">
                  <UserClaimsChart />
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}

export function AnalyticsDashboard(props: AnalyticsDashboardProps = {}) {
  return (
    <DashboardProvider>
      <DashboardContent {...props} />
    </DashboardProvider>
  )
}