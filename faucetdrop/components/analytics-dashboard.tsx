"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { FaucetsCreatedChart } from "./charts/faucet-created-chart"
import { TransactionsPerDayChart } from "./charts/transactions-per-day"
import { NewUsersChart } from "./charts/new-users-chart"
import { UserClaimsChart } from "./charts/user-claims-chart"
import { BarChart3, PieChart, TrendingUp, Users, Loader2 } from "lucide-react"
import { useState, useEffect } from "react"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area } from "recharts"
import { ethers } from "ethers"
import { useNetwork } from "@/hooks/use-network"
import { FACTORY_ABI } from "@/lib/abis"
import { getFaucetsForNetwork } from "@/lib/faucet"

// Types for our data
interface MonthlyData {
  month: string
  year: number
  faucetsCreated: number
  transactions: number
  newUsers: number
  claims: number
}

interface DashboardStats {
  faucetsCreated: {
    total: number
    change: string
    monthlyData: MonthlyData[]
  }
  dailyTransactions: {
    total: number
    change: string
    monthlyData: MonthlyData[]
  }
  newUsers: {
    total: number
    change: string
    monthlyData: MonthlyData[]
  }
  userClaims: {
    total: number
    change: string
    monthlyData: MonthlyData[]
  }
}

interface AnalyticsDashboardProps {
  data?: DashboardStats
  loading?: boolean
  error?: string
}

// Helper function to get month name
function getMonthName(date: Date): string {
  return date.toLocaleString('default', { month: 'short', year: 'numeric' })
}

// Helper function to get months for the last 12 months
function getLast12Months(): { month: string, year: number, startDate: Date, endDate: Date }[] {
  const months = []
  const now = new Date()
  
  for (let i = 11; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const endDate = new Date(date.getFullYear(), date.getMonth() + 1, 0)
    months.push({
      month: getMonthName(date),
      year: date.getFullYear(),
      startDate: date,
      endDate
    })
  }
  
  return months
}

// Helper function to calculate percentage change
function calculateChange(current: number, previous: number): { change: string, isPositive: boolean } {
  if (previous === 0) return { 
    change: current > 0 ? "+∞%" : "+0.0%", 
    isPositive: current > 0 
  }
  const change = ((current - previous) / previous) * 100
  return { 
    change: `${change >= 0 ? '+' : ''}${change.toFixed(1)}%`,
    isPositive: change >= 0
  }
}

// Hook to fetch and process dashboard data from multiple addresses
function useDashboardData() {
  const { network } = useNetwork()
  const [data, setData] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      if (!network) {
        setError("No network selected")
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        console.log("Fetching data for network:", network.name, "addresses:", network.factoryAddresses)

        const provider = new ethers.JsonRpcProvider(network.rpcUrl)
        const months = getLast12Months()
        
        // Initialize data structure
        const monthlyData: { [key: string]: MonthlyData } = {}
        months.forEach(({ month, year }) => {
          monthlyData[`${year}-${month}`] = {
            month,
            year,
            faucetsCreated: 0,
            transactions: 0,
            newUsers: 0,
            claims: 0
          }
        })

        // Fetch data from all Chain
        let allTransactions: Array<{
          faucetAddress: string
          transactionType: string
          initiator: string
          amount: ethers.BigNumberish
          isEther: boolean
          timestamp: ethers.BigNumberish
        }> = []
        
        let totalFaucets = 0
        const allUsers = new Set<string>()
        const userFirstTx: { [address: string]: number } = {}

        // Process each factory address
        for (const factoryAddress of network.factoryAddresses) {
          try {
            console.log(`Fetching data from factory: ${factoryAddress}`)
            
            // Get faucets for this factory
            const faucets = await getFaucetsForNetwork({
              ...network,
              factoryAddress
            })
            
            // Get transactions for this factory
            const contract = new ethers.Contract(factoryAddress, FACTORY_ABI, provider)
            const transactions = await contract.getAllTransactions()
            
            // Process transactions and categorize by month
            for (const tx of transactions) {
              const timestampNum = Number(ethers.toBigInt(tx.timestamp)) * 1000
              const txDate = new Date(timestampNum)
              const monthKey = `${txDate.getFullYear()}-${getMonthName(txDate)}`
              
              if (monthlyData[monthKey]) {
                // Count transactions
                monthlyData[monthKey].transactions++
                
                // Count claims
                if (tx.transactionType === "Claim") {
                  monthlyData[monthKey].claims++
                }
                
                // Track users
                allUsers.add(tx.initiator)
                if (!userFirstTx[tx.initiator]) {
                  userFirstTx[tx.initiator] = timestampNum
                  // Count new users for the month of their first transaction
                  monthlyData[monthKey].newUsers++
                }
              }
            }
            
            // Count faucets created by month
            if (faucets.length > 0) {
              const faucetsPerMonth = Math.ceil(faucets.length / months.length)
              months.forEach(({ month, year }, index) => {
                const monthKey = `${year}-${month}`
                if (monthlyData[monthKey]) {
                  monthlyData[monthKey].faucetsCreated = Math.min(
                    faucetsPerMonth,
                    faucets.length - (index * faucetsPerMonth)
                  )
                }
              })
            }
            
            allTransactions = [...allTransactions, ...transactions]
            totalFaucets += faucets.length
            
          } catch (err) {
            console.error(`Error fetching data from factory ${factoryAddress}:`, err)
            // Continue with other addresses
          }
        }

        // Convert data to arrays
        const monthlyDataArray = Object.values(monthlyData)
        
        // Calculate current month vs previous month changes
        const currentMonth = monthlyDataArray[monthlyDataArray.length - 1]
        const previousMonth = monthlyDataArray[monthlyDataArray.length - 2]
        
        const faucetsChange = calculateChange(
          currentMonth.faucetsCreated,
          previousMonth?.faucetsCreated || 0
        )
        
        const transactionsChange = calculateChange(
          currentMonth.transactions,
          previousMonth?.transactions || 0
        )
        
        const newUsersChange = calculateChange(
          currentMonth.newUsers,
          previousMonth?.newUsers || 0
        )
        
        const claimsChange = calculateChange(
          currentMonth.claims,
          previousMonth?.claims || 0
        )

        // Calculate totals
        const totalTransactions = monthlyDataArray.reduce((sum, month) => sum + month.transactions, 0)
        const totalNewUsers = allUsers.size
        const totalClaims = monthlyDataArray.reduce((sum, month) => sum + month.claims, 0)

        const dashboardData: DashboardStats = {
          faucetsCreated: {
            total: totalFaucets,
            change: faucetsChange.change,
            monthlyData: monthlyDataArray
          },
          dailyTransactions: {
            total: totalTransactions,
            change: transactionsChange.change,
            monthlyData: monthlyDataArray
          },
          newUsers: {
            total: totalNewUsers,
            change: newUsersChange.change,
            monthlyData: monthlyDataArray
          },
          userClaims: {
            total: totalClaims,
            change: claimsChange.change,
            monthlyData: monthlyDataArray
          }
        }

        console.log("Dashboard data:", dashboardData)
        setData(dashboardData)
        setError(null)
      } catch (err) {
        console.error("Error fetching data:", err)
        setError(`Failed to fetch data from ${network?.name || 'blockchain'}`)
        
        // Fallback to mock data
        const mockMonthlyData: MonthlyData[] = [
          { month: "Jan 2025", year: 2025, faucetsCreated: 2, transactions: 1200, newUsers: 45, claims: 800 },
          { month: "Feb 2025", year: 2025, faucetsCreated: 1, transactions: 1350, newUsers: 52, claims: 900 },
          { month: "Mar 2025", year: 2025, faucetsCreated: 3, transactions: 1100, newUsers: 38, claims: 750 },
          { month: "Apr 2025", year: 2025, faucetsCreated: 2, transactions: 1500, newUsers: 61, claims: 1000 },
          { month: "May 2025", year: 2025, faucetsCreated: 1, transactions: 1250, newUsers: 49, claims: 850 },
          { month: "Jun 2025", year: 2025, faucetsCreated: 4, transactions: 1600, newUsers: 72, claims: 1100 },
          { month: "Jul 2025", year: 2025, faucetsCreated: 2, transactions: 1400, newUsers: 58, claims: 950 },
          { month: "Aug 2025", year: 2025, faucetsCreated: 3, transactions: 1300, newUsers: 43, claims: 870 },
          { month: "Sep 2025", year: 2025, faucetsCreated: 1, transactions: 1700, newUsers: 67, claims: 1200 },
          { month: "Oct 2025", year: 2025, faucetsCreated: 2, transactions: 1550, newUsers: 55, claims: 1050 },
          { month: "Nov 2025", year: 2025, faucetsCreated: 1, transactions: 1450, newUsers: 48, claims: 980 },
          { month: "Dec 2025", year: 2025, faucetsCreated: 3, transactions: 1650, newUsers: 69, claims: 1150 }
        ]
        
        const mockData: DashboardStats = {
          faucetsCreated: {
            total: 25,
            change: calculateChange(3, 1).change,
            monthlyData: mockMonthlyData
          },
          dailyTransactions: {
            total: 17100,
            change: calculateChange(1650, 1450).change,
            monthlyData: mockMonthlyData
          },
          newUsers: {
            total: 657,
            change: calculateChange(69, 48).change,
            monthlyData: mockMonthlyData
          },
          userClaims: {
            total: 11650,
            change: calculateChange(1150, 980).change,
            monthlyData: mockMonthlyData
          }
        }
        
        console.log("Using mock data:", mockData)
        setData(mockData)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [network])

  return { data, loading, error }
}

// Loading skeleton component
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

// Chart Component
function MonthlyChart({ 
  data, 
  loading, 
  dataKey, 
  title, 
  color = "#3b82f6" 
}: { 
  data?: MonthlyData[], 
  loading: boolean, 
  dataKey: keyof MonthlyData,
  title: string,
  color?: string
}) {
  if (loading) {
    return (
      <div className="h-80 w-full flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!data || data.length === 0) {
    return (
      <div className="h- Discovering optimal data visualization height w-full flex items-center justify-center">
        <p className="text-muted-foreground">No data available</p>
      </div>
    )
  }

  return (
    <div className="h-80 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id={`color${dataKey}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={color} stopOpacity={0.3}/>
              <stop offset="95%" stopColor={color} stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
          <XAxis 
            dataKey="month" 
            className="text-xs"
            axisLine={false}
            tickLine={false}
          />
          <YAxis 
            className="text-xs"
            axisLine={false}
            tickLine={false}
          />
          <Tooltip 
            formatter={(value: number) => [value.toLocaleString(), title]}
            contentStyle={{
              backgroundColor: 'hsl(var(--background))',
              border: '1px solid hsl(var(--border))',
              borderRadius: '6px'
            }}
          />
          <Area
            type="monotone"
            dataKey={dataKey}
            stroke={color}
            strokeWidth={2}
            fillOpacity={1}
            fill={`url(#color${dataKey})`}
            name={title}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
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

// Stat card component with color-coded change
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
        <p className={`text-xs ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
          {change ?? 'No data'}
        </p>
      </CardContent>
    </Card>
  )
}

export function AnalyticsDashboard({ data: propData, loading: propLoading, error: propError }: AnalyticsDashboardProps = {}) {
  // Use hook data if no props provided
  const hookData = useDashboardData()
  const { network } = useNetwork()
  
  const data = propData ?? hookData.data
  const loading = propLoading ?? hookData.loading
  const error = propError ?? hookData.error

  return (
    <div className="w-full min-h-screen bg-background p-4 md:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center md:text-left">
          <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold tracking-tight">
            Analytics Dashboard
          </h1>
          <p className="text-muted-foreground mt-2">
            Data aggregated from all Chain
          </p>
          {loading && (
            <div className="flex items-center justify-center md:justify-start mt-2">
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              <span className="text-sm text-muted-foreground">Loading analytics...</span>
            </div>
          )}
        </div>

        {/* Stats Cards Grid */}
        <div className="grid grid-cols-1 coupled with sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          {error ? (
            <>
              <ErrorCard message={error} />
              <ErrorCard message={error} />
              <ErrorCard message={error} />
              <ErrorCard message={error} />
            </>
          ) : (
            <>
              <StatCard
                title="Total Faucets"
                value={data?.faucetsCreated.total}
                change={data?.faucetsCreated.change}
                icon={PieChart}
                loading={loading}
              />
              <StatCard
                title="Total Transactions"
                value={data?.dailyTransactions.total}
                change={data?.dailyTransactions.change}
                icon={TrendingUp}
                loading={loading}
              />
              <StatCard
                title="Total Users"
                value={data?.newUsers.total}
                change={data?.newUsers.change}
                icon={Users}
                loading={loading}
              />
              <StatCard
                title="Total Claims"
                value={data?.userClaims.total}
                change={data?.userClaims.change}
                icon={BarChart3}
                loading={loading}
              />
            </>
          )}
        </div>

        {/* Charts Section */}
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
              <span className="hidden sm:inline">Claims</span>
              <span className="sm:hidden">Claims</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="faucets" className="space-y-4 mt-6">
            <Card>
              <CardHeader className="px-4 md:px-6">
                <CardTitle className="text-lg md:text-xl">
                  Faucets Created
                </CardTitle>
                <CardDescription className="text-sm">
                  Number of new faucets created across all Chain
                </CardDescription>
              </CardHeader>
              <CardContent className="px-4 md:px-6">
                <div className="w-full overflow-hidden">
                  <FaucetsCreatedChart/>
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
                  Total number of transactions across all Chain
                </CardDescription>
              </CardHeader>
              <CardContent className="px-4 md:px-6">
                <div className="w-full overflow-hidden">
                 <TransactionsPerDayChart/>
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
                  Number of new users joining across all Chain
                </CardDescription>
              </CardHeader>
              <CardContent className="px-4 md:px-6">
                <div className="w-full overflow-hidden">
                 <NewUsersChart/>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="claims" className="space-y-4 mt-6">
            <Card>
              <CardHeader className="px-4 md:px-6">
                <CardTitle className="text-lg md:text-xl">
                  Claims
                </CardTitle>
                <CardDescription className="text-sm">
                  Number of claims made across all Chain
                </CardDescription>
              </CardHeader>
              <CardContent className="px-4 md:px-6">
                <div className="w-full overflow-hidden">
                 <UserClaimsChart/>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}