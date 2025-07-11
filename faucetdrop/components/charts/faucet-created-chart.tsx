"use client"

import { useEffect, useState } from "react"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts"
import { useNetwork } from "@/hooks/use-network"
import { getFaucetsForNetwork } from "@/lib/faucet"
import { Loader2 } from "lucide-react"

interface ChartData {
  network: string
  faucets: number
}

export function FaucetsCreatedChart() {
  const { networks } = useNetwork()
  const [data, setData] = useState<ChartData[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchFaucetData = async () => {
      setLoading(true)
      try {
        const chartData: ChartData[] = []

        for (const network of networks) {
          let totalFaucets = 0

          // Iterate over all factory addresses for the network
          for (const factoryAddress of network.factoryAddresses) {
            // Fetch faucets for the specific factory address
            const faucets = await getFaucetsForNetwork(network, factoryAddress)
            totalFaucets += faucets.length
          }

          chartData.push({
            network: network.name,
            faucets: totalFaucets,
          })
        }

        setData(chartData)
      } catch (error) {
        console.error("Error fetching faucet data:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchFaucetData()
  }, [networks])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  const totalFaucets = data.reduce((sum, item) => sum + item.faucets, 0)

  return (
    <div className="space-y-4">
      <div className="text-center">
        <p className="text-2xl font-bold">{totalFaucets}</p>
        <p className="text-sm text-muted-foreground">Total Faucets Created</p>
      </div>

      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="network" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Bar dataKey="faucets" fill="#8884d8" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}