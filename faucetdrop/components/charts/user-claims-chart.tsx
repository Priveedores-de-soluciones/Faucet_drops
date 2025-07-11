"use client"

import { useEffect, useState } from "react"
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader2, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ethers } from "ethers" // Import ethers directly
import { FACTORY_ABI } from "@/lib/abis"
import { useNetwork } from "@/hooks/use-network"

// Define the structure for network config
interface NetworkConfig {
  factoryAddress: string
  rpcUrl: string
}

// Define NETWORK_CONFIG with an index signature
const NETWORK_CONFIG: { [key: number]: NetworkConfig } = {
  42220: {
    // Celo Mainnet
    factoryAddress: "0x9D6f441b31FBa22700bb3217229eb89b13FB49de", // Replace with actual address
    rpcUrl: "https://forno.celo.org",
  },
  1135: {
    // Assuming this is a custom chain or testnet
    factoryAddress: "0xc5f8c2A85520c0A3595C29e004b2f5D9e7CE3b0B",    
    rpcUrl: "https://your-custom-rpc-url-here", // Replace with actual RPC URL
  },
  42161: {
    // Arbitrum One
factoryAddress: "0x6087810cFc24310E85736Cbd500e4c1d5a45E196", 
rpcUrl: "https://arb1.arbitrum.io/rpc",
  },
}

interface ClaimData {
  name: string
  value: number
  color: string
}

export function UserClaimsChart() {
  const { network } = useNetwork()
  const [data, setData] = useState<ClaimData[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedFaucet, setSelectedFaucet] = useState<string>("all")
  const [availableFaucets, setAvailableFaucets] = useState<string[]>([])

  // Define colors for the pie chart
  const COLORS = ["#8884d8", "#82ca9d", "#ffc658", "#ff7300", "#a4de6c", "#d0ed57", "#83a6ed", "#8dd1e1", "#a4de6c", "#d0ed57"]

  const fetchData = async () => {
    setLoading(true)
    try {
      // Get network config based on current chainId
      const chainId = network?.chainId || 42220 // Default to Celo Mainnet
      const config = NETWORK_CONFIG[chainId]
      if (!config) {
        throw new Error(`No configuration found for chainId ${chainId}`)
      }

      // Initialize provider and contract using ethers v6
      const provider = new ethers.JsonRpcProvider(config.rpcUrl)
      const contract = new ethers.Contract(config.factoryAddress, FACTORY_ABI, provider)

      // Fetch all transactions
      const transactions = await contract.getAllTransactions()
      console.log(`Fetched ${transactions.length} total transactions on chain ${chainId}`)

      // Filter for claim transactions and group by faucet
      const claimsByFaucet: { [key: string]: number } = {}
      const faucetSet = new Set<string>()

      for (const tx of transactions) {
        if (tx.transactionType.toLowerCase() === "claim") {
          const faucetKey = tx.faucetAddress.toLowerCase()
          faucetSet.add(faucetKey)
          claimsByFaucet[faucetKey] = (claimsByFaucet[faucetKey] || 0) + 1
        }
      }

      setAvailableFaucets(Array.from(faucetSet))

      // Convert to chart data format
      const chartData: ClaimData[] = []

      if (selectedFaucet === "all") {
        // Show top 10 faucets by claims
        const sortedFaucets = Object.entries(claimsByFaucet)
          .sort(([, a], [, b]) => b - a)
          .slice(0, 10)

        sortedFaucets.forEach(([faucet, value], index) => {
          chartData.push({
            name: `${faucet.slice(0, 6)}...${faucet.slice(-4)}`,
            value,
            color: COLORS[index % COLORS.length],
          })
        })
      } else {
        // Show specific faucet
        const value = claimsByFaucet[selectedFaucet.toLowerCase()] || 0
        chartData.push({
          name: `${selectedFaucet.slice(0, 6)}...${selectedFaucet.slice(-4)}`,
          value,
          color: COLORS[0],
        })
      }

      console.log("Claims chart data:", chartData)
      setData(chartData)
    } catch (error) {
      console.error("Error fetching transaction data:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [selectedFaucet, network])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  const totalClaims = data.reduce((sum, item) => sum + item.value, 0)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-center">
          <p className="text-2xl font-bold">{totalClaims}</p>
          <p className="text-sm text-muted-foreground">Total Claims ({network?.name || "Celo"} Network)</p>
        </div>

        <div className="flex items-center gap-2">
          <Select value={selectedFaucet} onValueChange={setSelectedFaucet}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Select faucet" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Faucets (Top 10)</SelectItem>
              {availableFaucets.map((faucet) => (
                <SelectItem key={faucet} value={faucet}>
                  {`${faucet.slice(0, 6)}...${faucet.slice(-4)}`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button variant="outline" size="sm" onClick={fetchData} disabled={loading}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
            outerRadius={80}
            dataKey="value"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}