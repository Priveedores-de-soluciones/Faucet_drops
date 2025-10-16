"use client"
import { useEffect, useState } from "react"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts"
import { useNetwork } from "@/hooks/use-network"
import { getFaucetsForNetwork } from "@/lib/faucet"
import { Loader2 } from "lucide-react"
import { DataService, FaucetData } from "@/lib/database-helpers"

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

  const fetchAndStoreFaucetData = async () => {
    setLoading(true)
    try {
      console.log('Fetching fresh faucet data...')
      
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
      
      // Save to localStorage
      saveToLocalStorage(FAUCET_STORAGE_KEYS.CHART_DATA, chartData)
      saveToLocalStorage(FAUCET_STORAGE_KEYS.TOTAL_FAUCETS, total)
      saveToLocalStorage(FAUCET_STORAGE_KEYS.LAST_UPDATED, Date.now())

      // Save to Supabase
      const supabaseData: Omit<FaucetData, 'id' | 'updated_at'>[] = chartData.map(item => ({
        network: item.network,
        faucets: item.faucets
      }))
      await DataService.saveFaucetData(supabaseData)

      setData(chartData)
      setTotalFaucets(total)
      
      console.log('Faucet data saved to both localStorage and Supabase')
    } catch (error) {
      console.error("Error fetching faucet data:", error)
    } finally {
      setLoading(false)
    }
  }

  const loadStoredData = async () => {
    // Try localStorage first
    if (isCacheValid()) {
      const cachedData = loadFromLocalStorage<ChartData[]>(FAUCET_STORAGE_KEYS.CHART_DATA);
      const cachedTotal = loadFromLocalStorage<number>(FAUCET_STORAGE_KEYS.TOTAL_FAUCETS);
      if (cachedData && cachedTotal !== null) {
        console.log('Using cached faucet data from localStorage');
        setData(cachedData);
        setTotalFaucets(cachedTotal);
        setLoading(false);
        return true;
      }
    }

    // Fallback to Supabase
    try {
      const supabaseData = await DataService.loadFaucetData();
      if (supabaseData.length > 0 && DataService.isDataFresh(supabaseData[0].updated_at)) {
        console.log('Using fresh faucet data from Supabase');
        const chartData = supabaseData.map(item => ({
          network: item.network,
          faucets: item.faucets
        }));
        const total = chartData.reduce((sum, item) => sum + item.faucets, 0);
        
        setData(chartData);
        setTotalFaucets(total);
        
        // Cache in localStorage
        saveToLocalStorage(FAUCET_STORAGE_KEYS.CHART_DATA, chartData);
        saveToLocalStorage(FAUCET_STORAGE_KEYS.TOTAL_FAUCETS, total);
        saveToLocalStorage(FAUCET_STORAGE_KEYS.LAST_UPDATED, Date.now());
        
        setLoading(false);
        return true;
      }
    } catch (error) {
      console.error('Error loading data from Supabase:', error);
    }

    return false;
  }

  useEffect(() => {
    loadStoredData().then((dataLoaded) => {
      if (!dataLoaded && networks.length > 0) {
        fetchAndStoreFaucetData();
      }
    });
  }, [networks])

  // Auto-refresh data every 5 minutes
  useEffect(() => {
    if (networks.length === 0) return;
    
    const interval = setInterval(() => {
      fetchAndStoreFaucetData();
    }, CACHE_DURATION);

    return () => clearInterval(interval);
  }, [networks]);

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