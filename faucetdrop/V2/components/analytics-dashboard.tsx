"use client"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { FaucetsCreatedChart } from "./charts/faucet-created-chart"
import { TransactionsPerDayChart } from "./charts/transactions-per-day"
import { NewUsersChart } from "./charts/new-users-chart"
import { UserClaimsChart } from "./charts/user-claims-chart"
import { BarChart3, PieChart, TrendingUp, Users, Loader2 } from "lucide-react"
import { useState, useEffect, createContext, useContext } from "react"
import { DataService, DashboardSummary } from "@/lib/database-helpers"

// Cache keys for dashboard data
const DASHBOARD_STORAGE_KEYS = {
  DASHBOARD_SUMMARY: 'dashboard_summary',
  LAST_UPDATED: 'dashboard_summary_last_updated'
};

// Cache duration (5 minutes)
const CACHE_DURATION = 5 * 60 * 1000;

// Default constant values
const DEFAULT_DASHBOARD_DATA: DashboardData = {
  totalFaucets: 66,
  totalTransactions: 2413,
  uniqueUsers: 720,
  totalClaims: 960,
  lastUpdated: new Date().toISOString()
};

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
  const lastUpdated = loadFromLocalStorage<number>(DASHBOARD_STORAGE_KEYS.LAST_UPDATED);
  return lastUpdated ? Date.now() - lastUpdated < CACHE_DURATION : false;
}

interface DashboardData {
  totalFaucets: number
  totalTransactions: number
  uniqueUsers: number
  totalClaims: number
  lastUpdated: string
}

interface DashboardContextType {
  data: DashboardData | null
  loading: boolean
  error: string | null
}

const DashboardContext = createContext<DashboardContextType>({
  data: DEFAULT_DASHBOARD_DATA,
  loading: true,
  error: null
})

export const useDashboardContext = () => useContext(DashboardContext)

function calculateChange(current: number, previous: number): string {
  if (previous === 0) return current > 0 ? "+∞%" : "+0.0%"
  const change = ((current - previous) / previous) * 100
  return `${change >= 0 ? '+' : ''}${change.toFixed(1)}%`
}

function useDashboardData() {
  const [data, setData] = useState<DashboardData>(DEFAULT_DASHBOARD_DATA)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadStoredData = async () => {
    setLoading(true)
    setError(null)
    
    try {
      // Try localStorage first
      if (isCacheValid()) {
        const cachedSummary = loadFromLocalStorage<DashboardSummary>(DASHBOARD_STORAGE_KEYS.DASHBOARD_SUMMARY)
        if (cachedSummary) {
          console.log('Using cached dashboard summary from localStorage')
          setData({
            totalFaucets: cachedSummary.total_faucets,
            totalTransactions: cachedSummary.total_transactions,
            uniqueUsers: cachedSummary.unique_users,
            totalClaims: cachedSummary.total_claims,
            lastUpdated: cachedSummary.updated_at
          })
          setLoading(false)
          return
        }
      }

      // Fallback to Supabase
      const supabaseSummary = await DataService.loadDashboardSummary()
      if (supabaseSummary && DataService.isDataFresh(supabaseSummary.updated_at)) {
        console.log('Using fresh dashboard summary from Supabase')
        const dashboardData = {
          totalFaucets: supabaseSummary.total_faucets,
          totalTransactions: supabaseSummary.total_transactions,
          uniqueUsers: supabaseSummary.unique_users,
          totalClaims: supabaseSummary.total_claims,
          lastUpdated: supabaseSummary.updated_at
        }
        
        setData(dashboardData)
        
        // Cache in localStorage
        saveToLocalStorage(DASHBOARD_STORAGE_KEYS.DASHBOARD_SUMMARY, supabaseSummary)
        saveToLocalStorage(DASHBOARD_STORAGE_KEYS.LAST_UPDATED, Date.now())
        
        setLoading(false)
        return
      }

      // Fallback to individual localStorage values if available
      const totalFaucets = loadFromLocalStorage<number>('faucet_total_count') || DEFAULT_DASHBOARD_DATA.totalFaucets
      const totalTransactions = loadFromLocalStorage<number>('transaction_total_count') || DEFAULT_DASHBOARD_DATA.totalTransactions
      const uniqueUsers = loadFromLocalStorage<number>('total_unique_users') || DEFAULT_DASHBOARD_DATA.uniqueUsers
      const totalClaims = loadFromLocalStorage<number>('totalclaim') || DEFAULT_DASHBOARD_DATA.totalClaims
      
      console.log('Using individual cached values as fallback')
      setData({
        totalFaucets,
        totalTransactions,
        uniqueUsers,
        totalClaims,
        lastUpdated: new Date().toISOString()
      })
      
    } catch (err) {
      console.error("Error loading dashboard data:", err)
      setError("Failed to load dashboard data")
      setData(DEFAULT_DASHBOARD_DATA)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadStoredData()
  }, [])

  // Auto-refresh data every 5 minutes by re-reading from storage
  useEffect(() => {
    const interval = setInterval(() => {
      loadStoredData()
    }, CACHE_DURATION)

    return () => clearInterval(interval)
  }, [])

  return { data, loading, error }
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
  icon: Icon, 
  loading,
  lastUpdated
}: {
  title: string
  value?: number
  icon: any
  loading: boolean
  lastUpdated?: string
}) {
  if (loading) {
    return <StatCardSkeleton />
  }

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
        {lastUpdated && (
          <p className="text-xs text-muted-foreground mt-1">
            Updated: {new Date(lastUpdated).toLocaleTimeString()}
          </p>
        )}
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
  const { data, loading, error } = useDashboardContext()
  
  const finalData = propData ?? data
  const finalLoading = propLoading ?? loading
  const finalError = propError ?? error

  return (
    <div className="w-full min-h-screen bg-background p-4 md:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="text-center md:text-left">
          <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold tracking-tight">
            Analytics Dashboard
          </h1>
          <p className="text-muted-foreground mt-2">
            Real-time data from all networks
          </p>
          {finalLoading && (
            <div className="flex items-center justify-center md:justify-start mt-2">
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              <span className="text-sm text-muted-foreground">Loading cached analytics...</span>
            </div>
          )}
          {finalData?.lastUpdated && !finalLoading && (
            ""
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
                icon={BarChart3}
                loading={finalLoading}
              />
              <StatCard
                title="Total Transactions"
                value={finalData?.totalTransactions}
                icon={TrendingUp}
                loading={finalLoading}
                
              />
              <StatCard
                title="Unique Users"
                value={finalData?.uniqueUsers}
                icon={Users}
                loading={finalLoading}
                
              />
              <StatCard
                title="Total Drops"
                value={finalData?.totalClaims}
                icon={PieChart}
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
                  Number of new faucets created across all networks
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
                  Total number of transactions across all networks
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
                  Number of unique users across all networks
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
                  Number of drops made across all networks
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
