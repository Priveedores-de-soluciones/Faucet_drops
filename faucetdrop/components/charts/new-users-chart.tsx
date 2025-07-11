"use client"

import { useEffect, useState } from "react"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"
import { Contract, JsonRpcProvider } from "ethers"
import { CHECKIN_ABI, FACTORY_ABI } from "@/lib/abis"
import { Loader2, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useNetwork } from "@/hooks/use-network"

const NETWORKS = {
  celo: {
    chainId: 42220,
    contractAddresses: [
      "0x71C00c430ab70a622dc0b2888C4239cab9F244b0",
      "0xDD74823C1D3eA2aC423A9c4eb77f710472bdC700"
    ],
    factoryAddresses: [
      "0x17cFed7fEce35a9A71D60Fbb5CA52237103A21FB",
      "0x9D6f441b31FBa22700bb3217229eb89b13FB49de",
      "0xFE7DB2549d0c03A4E3557e77c8d798585dD80Cc1",
      "0xE3Ac30fa32E727386a147Fe08b4899Da4115202f"
    ],
    name: "Celo",
    rpcUrl: "https://forno.celo.org",
    color: "#35D07F",
  },
  lisk: {
    chainId: 1135,
    contractAddress: "0x0995C06E2fb2d059F3534608176858406f6bE95F",
    factoryAddresses: ["0xFE7DB2549d0c03A4E3557e77c8d798585dD80Cc1"],
    name: "Lisk",
    rpcUrl: "https://rpc.api.lisk.com",
    color: "#0D4477",
  },
  base: {
    chainId: 8453,
    contractAddress: "0x0000000000000000000000000000000000000000",
    factoryAddresses: ["0x9D6f441b31FBa22700bb3217229eb89b13FB49de"],
    name: "Base",
    rpcUrl: "https://mainnet.base.org",
    color: "#0052FF",
  },
  arbitrum: {
    chainId: 42161,
    contractAddress: "0x661e54AD241549c3a5a246e5E74910aAFDF6Db72",
    factoryAddresses: ["0xFE7DB2549d0c03A4E3557e77c8d798585dD80Cc1"],
    name: "Arbitrum",
    rpcUrl: "https://arb1.arbitrum.io/rpc",
    color: "#28A0F0",
  },
}

interface UserData {
  date: string
  newUsers: number
}

export function NewUsersChart() {
  const { network, networks } = useNetwork()
  const [data, setData] = useState<UserData[]>([])
  const [loading, setLoading] = useState(true)
  const [totalNewUsers, setTotalNewUsers] = useState(0)

  const fetchData = async () => {
    setLoading(true)
    try {
      const userFirstSeen: { [user: string]: string } = {}
      const newUsersByDate: { [date: string]: Set<string> } = {}

      // Iterate over all networks
      for (const net of Object.values(NETWORKS)) {
        const provider = new JsonRpcProvider(net.rpcUrl)
        const checkInAddresses = 'contractAddresses' in net ? net.contractAddresses : ['contractAddress' in net ? net.contractAddress : '']
        const factoryAddresses = net.factoryAddresses || []

        // Query Check-in events
        for (const address of checkInAddresses) {
          if (address === "0x0000000000000000000000000000000000000000") continue // Skip placeholder address

          try {
            const contract = new Contract(address, CHECKIN_ABI, provider)
            const events = await contract.queryFilter('*', 0, 'latest')

            for (const event of events) {
              const user = event.args?.claimer || event.args?.from || event.args?.[0]
              if (!user || typeof user !== 'string' || !user.startsWith('0x')) continue

              const block = await event.getBlock()
              const date = new Date(block.timestamp * 1000).toISOString().split('T')[0]
              
              if (!userFirstSeen[user] || date < userFirstSeen[user]) {
                userFirstSeen[user] = date
              }
            }
          } catch (error) {
            console.error(`Error fetching check-in events for ${net.name} at ${address}:`, error)
          }
        }

        // Query Factory transactions
        for (const address of factoryAddresses) {
          if (address === "0x0000000000000000000000000000000000000000") continue // Skip placeholder address

          try {
            const contract = new Contract(address, FACTORY_ABI, provider)
            const transactions = await contract.getAllTransactions()

            for (const tx of transactions) {
              const user = tx.initiator
              if (!user || typeof user !== 'string' || !user.startsWith('0x')) continue

              const date = new Date(tx.timestamp * 1000).toISOString().split('T')[0]
              
              if (!userFirstSeen[user] || date < userFirstSeen[user]) {
                userFirstSeen[user] = date
              }
            }
          } catch (error) {
            console.error(`Error fetching transactions for ${net.name} at ${address}:`, error)
          }
        }
      }

      // Group users by their first appearance date
      Object.entries(userFirstSeen).forEach(([user, firstDate]) => {
        if (!newUsersByDate[firstDate]) {
          newUsersByDate[firstDate] = new Set()
        }
        newUsersByDate[firstDate].add(user)
      })

      // Convert to chart data format and sort by date
      const chartData: UserData[] = Object.entries(newUsersByDate)
        .map(([date, users]) => ({
          date,
          newUsers: users.size,
        }))
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

      const total = chartData.reduce((sum, item) => sum + item.newUsers, 0)

      console.log("New users chart data:", chartData)
      console.log("Total unique users:", total)
      setData(chartData)
      setTotalNewUsers(total)
    } catch (error) {
      console.error("Error fetching user data:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [network])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-center">
          <p className="text-2xl font-bold">{totalNewUsers}</p>
          <p className="text-sm text-muted-foreground">New Users (All Networks)</p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchData} disabled={loading}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" tickFormatter={(value) => new Date(value).toLocaleDateString()} />
          <YAxis />
          <Tooltip
            labelFormatter={(value) => new Date(value).toLocaleDateString()}
            formatter={(value) => [value, "New Users"]}
          />
          <Bar dataKey="newUsers" fill={network?.color || "#82ca9d"} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}