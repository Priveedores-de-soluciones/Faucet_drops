"use client"

import { useEffect, useState, useCallback } from "react"
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts"
import { Loader2, RefreshCw, Trophy, Medal, Award, ExternalLink } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

import { Badge } from "@/components/ui/badge"
import { JsonRpcProvider, Contract, isAddress, formatUnits, ZeroAddress } from "ethers"
import { useNetwork } from "@/hooks/use-network"
import { FACTORY_ABI } from "@/lib/abis"
import { useToast } from "@/hooks/use-toast"

// ERC20 ABI for symbol and decimals
const ERC20_ABI = [
  {
    "inputs": [],
    "name": "symbol",
    "outputs": [{ "internalType": "string", "name": "", "type": "string" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "decimals",
    "outputs": [{ "internalType": "uint8", "name": "", "type": "uint8" }],
    "stateMutability": "view",
    "type": "function"
  }
]

// Faucet ABI for getting faucet names and token addresses
const FAUCET_ABI = [
  {
    "inputs": [],
    "name": "name",
    "outputs": [{ "internalType": "string", "name": "", "type": "string" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getName",
    "outputs": [{ "internalType": "string", "name": "", "type": "string" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "faucetName",
    "outputs": [{ "internalType": "string", "name": "", "type": "string" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "token",
    "outputs": [{ "internalType": "address", "name": "", "type": "address" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "tokenAddress",
    "outputs": [{ "internalType": "address", "name": "", "type": "address" }],
    "stateMutability": "view",
    "type": "function"
  }
]

// Chain configurations
interface ChainConfig {
  chainId: number
  name: string
  displayName: string
  nativeCurrency: { name: string; symbol: string; decimals: number }
  nativeTokenAddress: string
  factoryAddresses: string[]
  rpcUrls: string[]
  blockExplorerUrlsUrls: string[]
  isTestnet?: boolean
  defaultTokens: {
    address: string
    name: string
    symbol: string
    decimals: number
  }[]
}

const CHAIN_CONFIGS: Record<number, ChainConfig> = {
  42220: {
    chainId: 42220,
    name: "Celo",
    displayName: "Celo Mainnet",
    nativeCurrency: { name: "Celo", symbol: "CELO", decimals: 18 },
    nativeTokenAddress: "0x471EcE3750Da237f93B8E339c536989b8978a438",
    factoryAddresses: [
      "0xE3Ac30fa32E727386a147Fe08b4899Da4115202f",
      "0x9D6f441b31FBa22700bb3217229eb89b13FB49de",
    ],
    rpcUrls: ["https://forno.celo.org"],
    blockExplorerUrlsUrls: ["https://celoscan.io/"],
    defaultTokens: [
      {
        address: "0x765DE816845861e75A25fCA122bb6898B8B1282a",
        name: "Celo Dollar",
        symbol: "cUSD",
        decimals: 18,
      },
      {
        address: "0xD8763CBa276a3738E6DE85b4b3bF5FDed6D6cA73",
        name: "Celo Euro",
        symbol: "cEUR",
        decimals: 18,
      },
      {
        address: "0x4f604735c1cf31399c6e711d5962b2b3e0225ad3",
        name: "Glo Dollar",
        symbol: "USDGLO",
        decimals: 18,
      },
      {
        address: "0x62b8b11039fcfe5ab0c56e502b1c372a3d2a9c7a",
        name: "Good dollar",
        symbol: "G$",
        decimals: 18,
      },
    ],
  },
  42161: {
    chainId: 42161,
    name: "Arbitrum",
    displayName: "Arbitrum",
    nativeCurrency: { name: "ETHER", symbol: "ETH", decimals: 18 },
    nativeTokenAddress: ZeroAddress,
    factoryAddresses: [
      "0x96E9911df17e94F7048cCbF7eccc8D9b5eDeCb5C",
    ],
    rpcUrls: ["https://arb1.arbitrum.io/rpc"],
    blockExplorerUrlsUrls: ["https://arbiscan.io"],
    isTestnet: true,
    defaultTokens: [
      {
        address: "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174",
        name: "USD Coin",
        symbol: "USDC",
        decimals: 6,
      },
    ],
  },
  1135: {
    chainId: 1135,
    name: "Lisk",
    displayName: "Lisk Mainnet",
    nativeCurrency: { name: "Ethereum", symbol: "ETH", decimals: 18 },
    nativeTokenAddress: ZeroAddress,
    factoryAddresses: [
      "0x4F5Cf906b9b2Bf4245dba9F7d2d7F086a2a441C2",
    ],
    rpcUrls: ["https://rpc.api.lisk.com"],
    blockExplorerUrlsUrls: ["https://blockscout.lisk.com"],
    defaultTokens: [
      {
        address: "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174",
        name: "USD Coin",
        symbol: "USDC",
        decimals: 6,
      },
    ],
  },
  8453: {
    chainId: 8453,
    name: "Base",
    displayName: "Base Mainnet",
    nativeCurrency: { name: "Ethereum", symbol: "ETH", decimals: 18 },
    nativeTokenAddress: ZeroAddress,
    factoryAddresses: [
      "0xE3Ac30fa32E727386a147Fe08b4899Da4115202f",
      "0x9D6f441b31FBa22700bb3217229eb89b13FB49de",
    ],
    rpcUrls: ["https://mainnet.base.org"],
    blockExplorerUrlsUrls: ["https://basescan.org"],
    defaultTokens: [
      {
        address: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
        name: "USD Coin",
        symbol: "USDC",
        decimals: 6,
      },
    ],
  },
}

// Local storage keys for faucet names caching
const STORAGE_KEYS = {
  FAUCET_NAMES: 'faucet_names_cache',
  CLAIMS_DATA: 'faucet_claims_data',
  LAST_UPDATED: 'claims_last_updated',
  TOTAL_CLAIMS: 'totalclaim' // 
}


// Cache duration (5 minutes)
const CACHE_DURATION = 5 * 60 * 1000

// Claim type definition
type ClaimType = {
  claimer: string
  faucet: string
  amount: bigint
  networkName: string
  timestamp: number
  chainId: number
  tokenSymbol: string
  tokenDecimals: number
  isEther: boolean
}

// Helper function to save data to localStorage
function saveToLocalStorage(key: string, data: any) {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem(key, JSON.stringify(data, (k, v) => 
        typeof v === 'bigint' ? v.toString() : v
      ))
    }
  } catch (error) {
    console.warn('Failed to save to localStorage:', error)
  }
}

// Helper function to load data from localStorage
function loadFromLocalStorage<T>(key: string): T | null {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const data = localStorage.getItem(key)
      if (!data) return null
      return JSON.parse(data, (k, v) => {
        if (k === 'amount' && typeof v === 'string') {
          return BigInt(v)
        }
        return v
      })
    }
    return null
  } catch (error) {
    console.warn('Failed to load from localStorage:', error)
    return null
  }
}

// Helper function to get token information
async function getTokenInfo(
  tokenAddress: string,
  provider: JsonRpcProvider,
  chainId: number,
  isEther: boolean
): Promise<{ symbol: string; decimals: number }> {
  const chainConfig = CHAIN_CONFIGS[chainId]
  
  if (isEther) {
    return {
      symbol: chainConfig?.nativeCurrency.symbol || "ETH",
      decimals: chainConfig?.nativeCurrency.decimals || 18
    }
  }

  // Check if it's a known default token first
  if (chainConfig?.defaultTokens) {
    const knownToken = chainConfig.defaultTokens.find(
      token => token.address.toLowerCase() === tokenAddress.toLowerCase()
    )
    if (knownToken) {
      return {
        symbol: knownToken.symbol,
        decimals: knownToken.decimals
      }
    }
  }

  // Query the token contract
  try {
    const tokenContract = new Contract(tokenAddress, ERC20_ABI, provider)
    const [symbol, decimals] = await Promise.all([
      tokenContract.symbol(),
      tokenContract.decimals()
    ])
    
    return {
      symbol: symbol || "TOKEN",
      decimals: Number(decimals) || 18
    }
  } catch (error) {
    console.warn(`Error fetching token info for ${tokenAddress}:`, error)
    return {
      symbol: "TOKEN",
      decimals: 18
    }
  }
}

// Function to get claims from factories for a single network
async function getAllClaimsFromFactories(
  provider: JsonRpcProvider,
  network: any,
): Promise<{
  faucetAddress: string
  transactionType: string
  initiator: string
  amount: bigint
  isEther: boolean
  timestamp: number
  networkName: string
  chainId: number
  tokenSymbol: string
  tokenDecimals: number
}[]> {
  try {
    let allClaims: any[] = []

    // Iterate through all factory addresses
    for (const factoryAddress of network.factoryAddresses) {
      if (!isAddress(factoryAddress)) {
        console.warn(`Invalid factory address ${factoryAddress} on ${network.name}`)
        continue
      }

      const factoryContract = new Contract(factoryAddress, FACTORY_ABI, provider)

      // Check if factory contract exists
      const code = await provider.getCode(factoryAddress)
      if (code === "0x") {
        console.warn(`No contract at factory address ${factoryAddress} on ${network.name}`)
        continue
      }

      try {
        console.log(`Fetching transactions from factory ${factoryAddress} on ${network.name}...`)
        const allTransactions = await factoryContract.getAllTransactions()
        
        // Filter for claim transactions only
        const claimTransactions = allTransactions.filter((tx: any) => {
  const transactionType = tx.transactionType.toLowerCase();
  return transactionType === 'claim' || 
         (transactionType.includes('claim') && !transactionType.includes('setclaimparameters'));
});
        
        console.log(`Found ${claimTransactions.length} claim transactions from factory ${factoryAddress}`)
        allClaims.push(...claimTransactions)
      } catch (error) {
        console.warn(`Error fetching transactions from factory ${factoryAddress}:`, error)
      }
    }

    // Process claims and get additional information
    const processedClaims = await Promise.all(
      allClaims.map(async (claim) => {
        // Get token information
        let tokenInfo
        if (claim.isEther) {
          tokenInfo = await getTokenInfo("", provider, network.chainId, true)
        } else {
          try {
            const faucetContract = new Contract(claim.faucetAddress, FAUCET_ABI, provider)
            let tokenAddress
            
            try {
              tokenAddress = await faucetContract.token()
            } catch {
              try {
                tokenAddress = await faucetContract.tokenAddress()
              } catch {
                const chainConfig = CHAIN_CONFIGS[network.chainId]
                tokenAddress = chainConfig?.nativeTokenAddress || ZeroAddress
              }
            }
            
            tokenInfo = await getTokenInfo(tokenAddress, provider, network.chainId, false)
          } catch (error) {
            console.warn(`Error getting token info for faucet ${claim.faucetAddress}:`, error)
            tokenInfo = { symbol: "TOKEN", decimals: 18 }
          }
        }

        return {
          faucetAddress: claim.faucetAddress,
          transactionType: claim.transactionType,
          initiator: claim.initiator,
          amount: BigInt(claim.amount),
          isEther: claim.isEther,
          timestamp: Number(claim.timestamp),
          networkName: network.name,
          chainId: network.chainId,
          tokenSymbol: tokenInfo.symbol,
          tokenDecimals: tokenInfo.decimals
        }
      })
    )

    return processedClaims
  } catch (error: any) {
    console.error(`Error fetching claims from factories on ${network.name}:`, error)
    throw new Error(error.message || "Failed to fetch claims from factories")
  }
}

// Function to get all claims from all networks
async function getAllClaimsFromAllNetworks(
  networks: any[]
): Promise<ClaimType[]> {
  const allClaims: ClaimType[] = []

  for (const network of networks) {
    try {
      console.log(`Fetching claims from ${network.name}...`)
      
      const provider = new JsonRpcProvider(network.rpcUrl)
      const networkClaims = await getAllClaimsFromFactories(provider, network)
      
      // Convert to ClaimType format
      const convertedClaims: ClaimType[] = networkClaims.map(claim => ({
        claimer: claim.initiator,
        faucet: claim.faucetAddress,
        amount: claim.amount,
        networkName: claim.networkName,
        timestamp: claim.timestamp,
        chainId: claim.chainId,
        tokenSymbol: claim.tokenSymbol,
        tokenDecimals: claim.tokenDecimals,
        isEther: claim.isEther,
      }))
      
      allClaims.push(...convertedClaims)
      console.log(`Added ${convertedClaims.length} claims from ${network.name}`)
    } catch (error) {
      console.error(`Error fetching claims from ${network.name}:`, error)
    }
  }

  // Sort by timestamp (newest first)
  allClaims.sort((a, b) => b.timestamp - a.timestamp)

  console.log(`Total claims from all networks: ${allClaims.length}`)
  return allClaims
}

// Function to check if cache is valid
function isCacheValid(): boolean {
  const lastUpdated = loadFromLocalStorage<number>(STORAGE_KEYS.LAST_UPDATED)
  if (!lastUpdated) return false
  
  return Date.now() - lastUpdated < CACHE_DURATION
}

interface ClaimData {
  name: string
  value: number
  color: string
  faucetAddress: string
}

interface FaucetRanking {
  rank: number
  faucetAddress: string
  faucetName: string
  network: string
  chainId: number
  totalClaims: number
  latestClaimTime: number
  totalAmount: string
}

export function UserClaimsChart() {
  const { networks } = useNetwork()
  const { toast } = useToast()
  const [data, setData] = useState<ClaimData[]>([])
  const [loading, setLoading] = useState(true)
  const [totalClaims, setTotalClaims] = useState(0)
  const [totalFaucets, setTotalFaucets] = useState(0)
  const [faucetNames, setFaucetNames] = useState<Record<string, string>>({})
  const [faucetRankings, setFaucetRankings] = useState<FaucetRanking[]>([])
  
  useEffect(() => {
  // Load cached totalClaims on mount
  const stored = localStorage.getItem('totalclaim')
  if (stored) {
    try {
      const parsed = JSON.parse(stored)
      if (typeof parsed === 'number') {
        setTotalClaims(parsed)
      }
    } catch (e) {
      console.warn('Error parsing cached totalClaims:', e)
    }
  }
}, [])
  // Generate colors for the pie chart
  const generateColors = (count: number) => {
    const colors = []
    for (let i = 0; i < count; i++) {
      const hue = (i * 137.508) % 360 // Golden angle approximation for better color distribution
      colors.push(`hsl(${hue}, 70%, 60%)`)
    }
    return colors
  }

  // Function to fetch faucet names with caching - aligned with FaucetList
  const fetchFaucetNames = useCallback(async (claimsData: ClaimType[]) => {
    // Load cached names first
    const cachedNames = loadFromLocalStorage<Record<string, string>>(STORAGE_KEYS.FAUCET_NAMES) || {};
    setFaucetNames(cachedNames);

    const faucetAddresses = [...new Set(claimsData.map(claim => claim.faucet))];
    const uncachedAddresses = faucetAddresses.filter(addr => !cachedNames[addr]);

    if (uncachedAddresses.length === 0) {
      console.log('All faucet names already cached');
      return cachedNames;
    }

    console.log(`Fetching names for ${uncachedAddresses.length} uncached faucets...`);

    const namePromises = uncachedAddresses.map(async (faucetAddress) => {
      try {
        const claim = claimsData.find(c => c.faucet === faucetAddress);
        if (!claim) {
          console.warn(`No claim found for faucet ${faucetAddress}`);
          return null;
        }

        const network = networks.find(n => n.chainId === claim.chainId);
        if (!network) {
          console.warn(`No network found for chainId ${claim.chainId}`);
          return null;
        }

        const provider = new JsonRpcProvider(network.rpcUrl);
        const faucetContract = new Contract(faucetAddress, FAUCET_ABI, provider);

        let faucetName: string;
        try {
          faucetName = await faucetContract.name();
          // Ensure name is not empty
          if (!faucetName || faucetName.trim() === '') {
            console.warn(`Empty name returned for faucet ${faucetAddress}`);
            faucetName = `Faucet ${faucetAddress.slice(0, 6)}...${faucetAddress.slice(-4)}`;
          }
        } catch (error) {
          console.warn(`Error fetching name for faucet ${faucetAddress}:`, error);
          faucetName = `Faucet ${faucetAddress.slice(0, 6)}...${faucetAddress.slice(-4)}`;
        }

        return { address: faucetAddress, name: faucetName };
      } catch (error) {
        console.error(`Error processing faucet ${faucetAddress}:`, error);
        return {
          address: faucetAddress,
          name: `Faucet ${faucetAddress.slice(0, 6)}...${faucetAddress.slice(-4)}`,
        };
      }
    });

    const results = await Promise.all(namePromises);
    const newNames: Record<string, string> = { ...cachedNames };

    results.forEach(result => {
      if (result && result.name) {
        newNames[result.address] = result.name;
      }
    });

    console.log(`Successfully fetched ${Object.keys(newNames).length - Object.keys(cachedNames).length} new faucet names`);
    setFaucetNames(newNames);
    saveToLocalStorage(STORAGE_KEYS.FAUCET_NAMES, newNames);
    return newNames;
  }, [networks]);

  const fetchData = async () => {
    setLoading(true)
    try {
      console.log("Fetching claims from factory sources...")
      
      // Check if we should use cached data
      let allClaims: ClaimType[] = []
      if (isCacheValid()) {
        const cachedClaims = loadFromLocalStorage<ClaimType[]>(STORAGE_KEYS.CLAIMS_DATA)
        if (cachedClaims && cachedClaims.length > 0) {
          console.log('Using cached claims data')
          allClaims = cachedClaims
        } else {
          allClaims = await getAllClaimsFromAllNetworks(networks)
        }
      } else {
        console.log('Fetching fresh claims data...')
        allClaims = await getAllClaimsFromAllNetworks(networks)
      }

      console.log("Fetched factory claims:", allClaims.length)

      const claimsByFaucet: { [key: string]: { 
        claims: number, 
        network: string,
        chainId: number,
        totalAmount: bigint,
        tokenSymbol: string,
        tokenDecimals: number,
        latestTimestamp: number
      } } = {}
      let totalClaimsCount = allClaims.length

      // Process all claims
      for (const claim of allClaims) {
        const faucetKey = claim.faucet.toLowerCase()
        
        if (!claimsByFaucet[faucetKey]) {
          claimsByFaucet[faucetKey] = { 
            claims: 0, 
            network: claim.networkName,
            chainId: claim.chainId,
            totalAmount: BigInt(0),
            tokenSymbol: claim.tokenSymbol,
            tokenDecimals: claim.tokenDecimals,
            latestTimestamp: 0
          }
        }
        claimsByFaucet[faucetKey].claims += 1
        claimsByFaucet[faucetKey].totalAmount += claim.amount
        
        if (claim.timestamp > claimsByFaucet[faucetKey].latestTimestamp) {
          claimsByFaucet[faucetKey].latestTimestamp = claim.timestamp
        }
      }

      setTotalClaims(totalClaimsCount)
      setTotalFaucets(Object.keys(claimsByFaucet).length)

      // Fetch faucet names with caching
      const fetchedNames = await fetchFaucetNames(allClaims)

      // Create faucet rankings - ranked by latest claim time
      const rankingData: FaucetRanking[] = Object.entries(claimsByFaucet)
        .sort(([, a], [, b]) => b.latestTimestamp - a.latestTimestamp)
        .map(([faucet, data], index) => ({
          rank: index + 1,
          faucetAddress: faucet,
          faucetName: fetchedNames[faucet] || `Faucet ${faucet.slice(0, 6)}...${faucet.slice(-4)}`,
          network: data.network,
          chainId: data.chainId,
          totalClaims: data.claims,
          latestClaimTime: data.latestTimestamp,
          totalAmount: `${Number(formatUnits(data.totalAmount, data.tokenDecimals)).toFixed(4)} ${data.tokenSymbol}`
        }))

      setFaucetRankings(rankingData)

        if (typeof window !== 'undefined') {
          localStorage.setItem(STORAGE_KEYS.TOTAL_CLAIMS, JSON.stringify(totalClaimsCount))
          console.log('Saved totalClaims to localStorage:', totalClaimsCount)
        }

      // Convert to chart data format - show ONLY TOP 10 faucets
      const sortedFaucets = Object.entries(claimsByFaucet)
        .sort(([, a], [, b]) => b.claims - a.claims)

      const top10Faucets = sortedFaucets.slice(0, 10)
      const otherFaucets = sortedFaucets.slice(10)
      
      const otherTotalClaims = otherFaucets.reduce((sum, [, data]) => sum + data.claims, 0)
      
      const colors = generateColors(top10Faucets.length + (otherTotalClaims > 0 ? 1 : 0))
      
      const chartData: ClaimData[] = top10Faucets.map(([faucet, data], index) => {
        const faucetName = fetchedNames[faucet] || `${faucet.slice(0, 6)}...${faucet.slice(-4)}`
        return {
          name: faucetName,
          value: data.claims,
          color: colors[index],
          faucetAddress: faucet
        }
      })

      if (otherTotalClaims > 0) {
        chartData.push({
          name: `Others (${otherFaucets.length} faucets)`,
          value: otherTotalClaims,
          color: colors[top10Faucets.length],
          faucetAddress: 'others'
        })
      }

      // Save to cache
      saveToLocalStorage(STORAGE_KEYS.CLAIMS_DATA, allClaims)
      saveToLocalStorage(STORAGE_KEYS.LAST_UPDATED, Date.now())

      console.log("Claims chart data (Top 10):", chartData)
      console.log("Faucet rankings (All):", rankingData)
      console.log("Total claims:", totalClaimsCount)
      console.log("Total faucets:", Object.keys(claimsByFaucet).length)
      setData(chartData)
      
      if (allClaims.length > 0) {
        toast({
          title: "Data refreshed",
          description: `Loaded ${allClaims.length} total drops`,
        })
      }
    } catch (error) {
      console.error("Error fetching claim data:", error)
      toast({
        title: "Failed to load data",
        description: error instanceof Error ? error.message : "Please try again later.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (networks.length > 0) {
      fetchData()
    }
  }, [networks])

  // Background refresh effect
  useEffect(() => {
    if (networks.length === 0) return

    const interval = setInterval(() => {
      fetchData()
    }, CACHE_DURATION)

    return () => clearInterval(interval)
  }, [networks])

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        
      case 2:
      case 3:
        
      default:
        return <span className="text-sm font-medium text-muted-foreground">#{rank}</span>
    }
  }

  const getNetworkColor = (network: string) => {
    switch (network.toLowerCase()) {
      case 'celo':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
      case 'arbitrum':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
      case 'base':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
      case 'lisk':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
      case 'polygon':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
      case 'ethereum':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
    }
  }

  
      // Helper function to get the explorer URL for a given chainId
  const getExplorerUrl = (chainId: number, address: string) => {
    const chainConfig = CHAIN_CONFIGS[chainId]
    if (chainConfig?.blockExplorerUrlsUrls?.length > 0) {
      return `${chainConfig.blockExplorerUrlsUrls[0]}/address/${address}`
    }
    return '#'
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-64">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
            <p className="text-sm md:text-base">Loading faucet data...</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Custom tooltip to show faucet details
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      return (
        <div className="bg-background border rounded-lg p-3 shadow-lg max-w-xs">
          <p className="font-medium text-sm md:text-base">{data.name}</p>
          {data.faucetAddress !== 'others' && (
            <p className="text-xs md:text-sm text-muted-foreground">
              Address: {data.faucetAddress.slice(0, 6)}...{data.faucetAddress.slice(-4)}
            </p>
          )}
          <p className="text-xs md:text-sm">
            Drops: <span className="font-medium">{data.value.toLocaleString()}</span>
          </p>
          <p className="text-xs md:text-sm text-muted-foreground">
            {((data.value / totalClaims) * 100).toFixed(1)}% of total drops
          </p>
        </div>
      )
    }
    return null
  }

  return (
    <div className="space-y-4 md:space-y-6 p-2 md:p-4">
      {/* Header Section with Stats */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 flex-grow">
          <div className="text-center p-3 bg-muted/50 rounded-lg">
            <p className="text-lg md:text-2xl font-bold">{totalClaims.toLocaleString()}</p>
            <p className="text-xs md:text-sm text-muted-foreground">Total Drops</p>
          </div>
        </div>

        <Button variant="outline" size="sm" onClick={fetchData} disabled={loading} className="shrink-0">
          <RefreshCw className="h-4 w-4" />
          <span className="hidden sm:inline ml-2">Refresh</span>
        </Button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 md:gap-6">
        {/* Pie Chart - Top 10 Only */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg md:text-xl">Top 10 Faucets by Drops</CardTitle>
            <CardDescription className="text-sm">
              Distribution of drops among top 10 most active faucets
            </CardDescription>
          </CardHeader>
          <CardContent>
            {data.length > 0 ? (
              <ResponsiveContainer width="100%" height={300} className="md:h-96">
                <PieChart>
                  <Pie
                    data={data}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius="80%"
                    dataKey="value"
                  >
                    {data.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                  <Legend 
                    wrapperStyle={{ fontSize: '12px' }}
                    iconSize={8}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-64 text-muted-foreground">
                <p className="text-sm md:text-base">No drop data available</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* All Available Faucets Table */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg md:text-xl">All Available Faucets</CardTitle>
            <CardDescription className="text-sm">
              Complete list ranked by latest activity from all active faucets
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="max-h-96 overflow-auto">
              {/* Mobile Card View for small screens */}
              <div className="sm:hidden">
                {faucetRankings.length > 0 ? (
                  <div className="space-y-3 p-4">
                    {faucetRankings.map((item) => (
                      <div key={item.faucetAddress} className="border rounded-lg p-3 space-y-2">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-2">
                            {getRankIcon(item.rank)}
                            <div className="min-w-0 flex-1">
                              <p className="font-medium truncate text-sm" title={item.faucetName}>
                                {item.faucetName}
                              </p>
                              
                            </div>
                          </div>
                          <Badge variant="secondary" className={`${getNetworkColor(item.network)} text-xs`}>
                            {item.network}
                          </Badge>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div>
                            <span className="text-muted-foreground">Drops: </span>
                            <span className="font-medium">{item.totalClaims.toLocaleString()}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Latest: </span>
                            <span>{new Date(item.latestClaimTime * 1000).toLocaleDateString()}</span>
                          </div>
                        </div>
                        <div className="text-xs">
                          <span className="text-muted-foreground">Total: </span>
                          <span className="font-mono">{item.totalAmount}</span>
                        </div>
                        <div className="pt-1">
                          <a
                            href={getExplorerUrl(item.chainId, item.faucetAddress)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs text-blue-500 hover:underline"
                          >
                            <ExternalLink className="h-3 w-3" />
                            View on Explorer
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground p-4">
                    <p className="text-sm">No faucet data available yet</p>
                  </div>
                )}
              </div>

              {/* Table View for larger screens */}
              <div className="hidden sm:block">
                <table className="w-full">
                  <thead className="border-b">
                    <tr>
                      <th className="w-16 text-xs md:text-sm font-medium text-left p-2 md:p-4">Rank</th>
                      <th className="text-xs md:text-sm font-medium text-left p-2 md:p-4">Faucet Name & Address</th>
                      <th className="text-xs md:text-sm font-medium text-left p-2 md:p-4">Network</th>
                      <th className="text-right text-xs md:text-sm font-medium p-2 md:p-4">Drops</th>
                      <th className="text-right text-xs md:text-sm font-medium p-2 md:p-4 hidden lg:table-cell">Total Amount</th>
                      <th className="text-right text-xs md:text-sm font-medium p-2 md:p-4">Latest</th>
                    </tr>
                  </thead>
                  <tbody>
                    {faucetRankings.length > 0 ? (
                      faucetRankings.map((item) => (
                        <tr key={item.faucetAddress} className="border-b hover:bg-muted/50">
                          <td className="font-medium p-2 md:p-4">
                            <div className="flex items-center justify-center">
                              {getRankIcon(item.rank)}
                            </div>
                          </td>
                          <td className="p-2 md:p-4">
                            <div className="max-w-[150px] md:max-w-[200px]">
                              <div className="font-medium truncate mb-1 text-xs md:text-sm" title={item.faucetName}>
                                {item.faucetName}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {item.faucetAddress.slice(0, 6)}...{item.faucetAddress.slice(-4)} 
                                <a
                                  href={getExplorerUrl(item.chainId, item.faucetAddress)}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-blue-500 hover:underline ml-1"
                                > 
                                  <ExternalLink className="h-3 w-3 inline" />
                                </a>
                              </div>
                            </div>
                          </td>
                          <td className="p-2 md:p-4">
                            <Badge variant="secondary" className={`${getNetworkColor(item.network)} text-xs`}>
                              {item.network}
                            </Badge>
                          </td>
                          <td className="text-right font-medium text-xs md:text-sm p-2 md:p-4">
                            {item.totalClaims.toLocaleString()}
                          </td>
                          <td className="text-right text-xs font-mono p-2 md:p-4 hidden lg:table-cell">
                            {item.totalAmount}
                          </td>
                          <td className="text-right text-xs p-2 md:p-4">
                            {new Date(item.latestClaimTime * 1000).toLocaleDateString()}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={6} className="text-center py-8 text-muted-foreground p-2 md:p-4">
                          <p className="text-sm">No faucet data available yet</p>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
