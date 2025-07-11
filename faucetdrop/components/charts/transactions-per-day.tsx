"use client"

import { useEffect, useState } from "react"
import { Contract, JsonRpcProvider } from "ethers"
import { CHECKIN_ABI, FACTORY_ABI } from "@/lib/abis"
import { Loader2, Activity } from "lucide-react"

const NETWORKS = {
  celo: {
    chainId: 42220, // Celo Mainnet
    contractAddresses: [
      "0x17cFed7fEce35a9A71D60Fbb5CA52237103A21FB",
      "0x9D6f441b31FBa22700bb3217229eb89b13FB49de",
      "0xFE7DB2549d0c03A4E3557e77c8d798585dD80Cc1",
      "0xE3Ac30fa32E727386a147Fe08b4899Da4115202f",
      "0x71C00c430ab70a622dc0b2888C4239cab9F244b0",
      "0xDD74823C1D3eA2aC423A9c4eb77f710472bdC700",
    ],
    name: "Celo",
    rpcUrl: "https://forno.celo.org",
    color: "#35D07F",
  },
  lisk: {
    chainId: 1135, // Lisk Mainnet
    contractAddresses: [
      "0xFE7DB2549d0c03A4E3557e77c8d798585dD80Cc1",
      "0x0995C06E2fb2d059F3534608176858406f6bE95F",
    ],
    name: "Lisk",
    rpcUrl: "https://rpc.api.lisk.com",
    color: "#0D4477",
  },
  base: {
    chainId: 8453, // Base Mainnet
    contractAddresses: ["0x9D6f441b31FBa22700bb3217229eb89b13FB49de"],
    name: "Base",
    rpcUrl: "https://mainnet.base.org",
    color: "#0052FF",
  },
  arbitrum: {
    chainId: 42161, // Arbitrum One Mainnet
    contractAddresses: [
      "0x661e54AD241549c3a5a246e5E74910aAFDF6Db72",
      "0xFE7DB2549d0c03A4E3557e77c8d798585dD80Cc1",
    ],
    name: "Arbitrum",
    rpcUrl: "https://arb1.arbitrum.io/rpc",
    color: "#28A0F0",
  },
}

interface NetworkStats {
  name: string
  totalCheckIns: number
  color: string
}

export function TransactionsPerDayChart() {
  const [networkStats, setNetworkStats] = useState<NetworkStats[]>([])
  const [loading, setLoading] = useState(true)
  const [totalTransactions, setTotalTransactions] = useState(0)

  useEffect(() => {
    const fetchTotalCheckIns = async () => {
      setLoading(true)
      try {
        const stats: NetworkStats[] = []
        let grandTotal = 0

        for (const [key, network] of Object.entries(NETWORKS)) {
          let checkInCount = 0
          const provider = new JsonRpcProvider(network.rpcUrl)

          for (const address of network.contractAddresses) {
            try {
              // Fetch check-in contract transactions
              const contract = new Contract(address, CHECKIN_ABI, provider)
              if (key === "arbitrum" || key === "base") {
                // Arbitrum and Base: Fetch total transactions via all events
                try {
                  const events = await contract.queryFilter("*", 0, "latest")
                  checkInCount += events.length
                  console.log(`${network.name} events for ${address}:`, events.length)
                } catch (error) {
                  console.error(`Error fetching ${network.name} events for ${address}:`, error)
                }
              } else {
                // Celo and Lisk: Fetch totalCheckIns from contract
                try {
                  const totalCheckIns = await contract.totalCheckIns()
                  checkInCount += Number(totalCheckIns)
                  console.log(`${network.name} check-ins for ${address}:`, Number(totalCheckIns))
                } catch (error) {
                  console.error(`Error fetching ${network.name} check-ins for ${address}:`, error)
                }
              }

              // Fetch additional transactions from factory contract
              const factoryContract = new Contract(address, FACTORY_ABI, provider)
              try {
                const factoryTxCount = await factoryContract.getTotalTransactions()
                checkInCount += Number(factoryTxCount)
                console.log(`${network.name} factory transactions for ${address}:`, Number(factoryTxCount))
              } catch (error) {
                console.error(`Error fetching ${network.name} factory transactions for ${address}:`, error)
              }
            } catch (error) {
              console.error(`Error processing contract ${address} for ${network.name}:`, error)
            }
          }

          stats.push({
            name: network.name,
            totalCheckIns: checkInCount,
            color: network.color,
          })

          grandTotal += checkInCount
          console.log(`${network.name} total transactions:`, checkInCount)
        }

        setNetworkStats(stats)
        setTotalTransactions(grandTotal)
      } catch (error) {
        console.error("Error fetching total transactions:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchTotalCheckIns()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <p className="text-4xl font-bold text-primary">{totalTransactions.toLocaleString()}</p>
        <p className="text-sm text-muted-foreground">Total transactions across all Networks</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {networkStats.map((network) => (
          <div
            key={network.name}
            className="p-4 rounded-lg border bg-card"
            style={{ borderLeftColor: network.color, borderLeftWidth: "4px" }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Activity className="h-5 w-5" style={{ color: network.color }} />
                <h3 className="font-semibold">{network.name}</h3>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold">{network.totalCheckIns.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">transactions</p>
              </div>
            </div>

            <div className="mt-2">
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="h-2 rounded-full transition-all duration-300"
                  style={{
                    backgroundColor: network.color,
                    width: `${totalTransactions > 0 ? (network.totalCheckIns / totalTransactions) * 100 : 0}%`,
                  }}
                />
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {totalTransactions > 0 ? ((network.totalCheckIns / totalTransactions) * 100).toFixed(1) : 0}% of total
              </p>
            </div>
          </div>
        ))}
      </div>

      {totalTransactions === 0 && (
        <div className="text-center py-8">
          <Activity className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
          <p className="text-muted-foreground">No transactions recorded yet</p>
        </div>
      )}
    </div>
  )
}