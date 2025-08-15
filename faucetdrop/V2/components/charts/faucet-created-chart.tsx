"use client"

import { useEffect, useState } from "react"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts"
import { useNetwork } from "@/hooks/use-network"
import { getFaucetsForNetwork } from "@/lib/faucet"
import { Loader2 } from "lucide-react"

// Cache keys for faucet data
const FAUCET_STORAGE_KEYS = {
  CHART_DATA: 'faucet_chart_data',
  LAST_UPDATED: 'faucet_last_updated',
  TOTAL_FAUCETS: 'faucet_total_count'
};

// Cache duration (5 minutes)
const CACHE_DURATION = 5 * 60 * 1000;

// Helper functions for localStorage
function saveToLocalStorage(key: string, data: any) {
  try {
    if (typeof window !== 'undefined') {
      localStorage.setItem(key, JSON.stringify(data));
    }
  } catch (error) {
    console.warn('Failed to save to localStorage:', error);
  }
}

function loadFromLocalStorage<T>(key: string): T | null {
  try {
    if (typeof window !== 'undefined') {
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : null;
    }
    return null;
  } catch (error) {
    console.warn('Failed to load from localStorage:', error);
    return null;
  }
}

function isCacheValid(): boolean {
  const lastUpdated = loadFromLocalStorage<number>(FAUCET_STORAGE_KEYS.LAST_UPDATED);
  return lastUpdated ? Date.now() - lastUpdated < CACHE_DURATION : false;
}

interface ChartData {
  network: string
  faucets: number
}

export function FaucetsCreatedChart() {
  const { networks } = useNetwork()
  const [data, setData] = useState<ChartData[]>([])
  const [loading, setLoading] = useState(true)
  const [totalFaucets, setTotalFaucets] = useState(0)

  const fetchFaucetData = async () => {
    setLoading(true)
    try {
      // Check if we have valid cached data
      if (isCacheValid()) {
        const cachedData = loadFromLocalStorage<ChartData[]>(FAUCET_STORAGE_KEYS.CHART_DATA);
        const cachedTotal = loadFromLocalStorage<number>(FAUCET_STORAGE_KEYS.TOTAL_FAUCETS);
        if (cachedData && cachedTotal !== null) {
          console.log('Using cached faucet data');
          setData(cachedData);
          setTotalFaucets(cachedTotal);
          setLoading(false);
          return;
        }
      }

      const chartData: ChartData[] = []

      await Promise.all(
        networks.map(async (network) => {
          try {
            const faucets = await getFaucetsForNetwork(network)
            const sortedFaucets = faucets.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
            
            chartData.push({
              network: network.name,
              faucets: sortedFaucets.length,
            })
          } catch (error) {
            console.error(`Error fetching faucets for ${network.name}:`, error)
            chartData.push({
              network: network.name,
              faucets: 0,
            })
          }
        })
      )

      const total = chartData.reduce((sum, item) => sum + item.faucets, 0)
      
      // Cache the data
      saveToLocalStorage(FAUCET_STORAGE_KEYS.CHART_DATA, chartData)
      saveToLocalStorage(FAUCET_STORAGE_KEYS.TOTAL_FAUCETS, total)
      saveToLocalStorage(FAUCET_STORAGE_KEYS.LAST_UPDATED, Date.now())

      setData(chartData)
      setTotalFaucets(total)
    } catch (error) {
      console.error("Error fetching faucet data:", error)
      // Fallback to cached data if available
      const cachedData = loadFromLocalStorage<ChartData[]>(FAUCET_STORAGE_KEYS.CHART_DATA);
      const cachedTotal = loadFromLocalStorage<number>(FAUCET_STORAGE_KEYS.TOTAL_FAUCETS);
      if (cachedData && cachedTotal !== null) {
        console.log('Using cached faucet data as fallback');
        setData(cachedData);
        setTotalFaucets(cachedTotal);
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    // Load cached data immediately on mount
    const cachedData = loadFromLocalStorage<ChartData[]>(FAUCET_STORAGE_KEYS.CHART_DATA);
    const cachedTotal = loadFromLocalStorage<number>(FAUCET_STORAGE_KEYS.TOTAL_FAUCETS);
    if (cachedData && cachedTotal !== null && isCacheValid()) {
      console.log('Loading cached faucet data on mount');
      setData(cachedData);
      setTotalFaucets(cachedTotal);
      setLoading(false);
    }
  }, [])

  useEffect(() => {
    if (networks.length > 0) {
      // Only fetch if we don't have valid cached data
      if (!isCacheValid()) {
        fetchFaucetData()
      }
    }
  }, [networks])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

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
          <Bar dataKey="faucets" fill="#0052FF" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}