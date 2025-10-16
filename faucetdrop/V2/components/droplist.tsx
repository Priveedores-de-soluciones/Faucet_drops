import React, { useState, useEffect, useContext } from 'react'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { 
  CheckCircle, 
  Users, 
  Twitter, 
  MessageCircle, 
  ExternalLink, 
  Wallet,
  Share2,
  X,
  Loader2,
  AlertCircle,
  Plus,
  Settings,
  Youtube,
  Instagram,
  Facebook
} from "lucide-react"
import { WalletContext } from './wallet-provider'

interface XAccount {
  id: string
  username: string
  displayName?: string
  isActive: boolean
}

interface Task {
  id: string
  title: string
  description: string
  icon: React.ReactNode
  completed: boolean
  url?: string
  points: number
  category: 'social' | 'wallet' | 'engagement' | 'referral'
  required: boolean
  platform?: string
  handle?: string
  action?: string
  verification?: {
    type: 'follow' | 'like' | 'retweet' | 'join' | 'none'
    targetUsername?: string
    targetTweetId?: string
    verifiedWithAccount?: string
  }
}

interface UserProfile {
  id: string
  walletAddress: string
  xAccounts: XAccount[]
  completedTasks: string[]
  droplistStatus: 'pending' | 'eligible' | 'completed'
}

interface DroplistConfig {
  isActive: boolean
  title: string
  description: string
  maxParticipants?: number
  endDate?: string
  requirementThreshold: number
}

interface DroplistTasksProps {
  isOpen: boolean
  onClose: () => void
}

// API service functions
const apiService = {
  // Get droplist configuration and tasks
  async getDroplistConfig(): Promise<{config: DroplistConfig, tasks: any[]}> {
    const response = await fetch('/api/droplist/config')
    if (response.ok) {
      const data = await response.json()
      return {
        config: data.config,
        tasks: data.tasks
      }
    }
    throw new Error('Failed to get droplist configuration')
  },

  // Create or get user profile
  async getOrCreateUser(walletAddress: string): Promise<UserProfile> {
    const response = await fetch(`/api/users/${walletAddress}`)
    if (response.ok) {
      return response.json()
    } else if (response.status === 404) {
      // Create new user
      const createResponse = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          walletAddress,
          xAccounts: [],
          completedTasks: [],
          droplistStatus: 'pending'
        })
      })
      return createResponse.json()
    }
    throw new Error('Failed to get user profile')
  },

  // Initiate X account connection
  async initiateXAuth(walletAddress: string): Promise<{ authUrl: string, state: string }> {
    const response = await fetch('/api/x-accounts/auth/initiate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ walletAddress })
    })
    return response.json()
  },

  // Verify task completion
  async verifyTask(walletAddress: string, taskId: string, xAccountId?: string) {
    const response = await fetch('/api/tasks/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ walletAddress, taskId, xAccountId })
    })
    return response.json()
  },

  // Verify all tasks
  async verifyAllTasks(walletAddress: string) {
    const response = await fetch('/api/tasks/verify-all', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ walletAddress })
    })
    return response.json()
  },

  // Submit to droplist
  async submitToDroplist(walletAddress: string) {
    const response = await fetch('/api/droplist/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ walletAddress })
    })
    return response.json()
  },

  // Toggle X account status
  async toggleXAccountStatus(accountId: string, isActive: boolean) {
    const response = await fetch(`/api/x-accounts/${accountId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive })
    })
    return response.json()
  }
}

export const DroplistTasks: React.FC<DroplistTasksProps> = ({
  isOpen,
  onClose
}) => {
  // Get wallet context
  const { address, isConnected, connect } = useContext(WalletContext)

  // Component state
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [tasks, setTasks] = useState<Task[]>([])
  const [droplistConfig, setDroplistConfig] = useState<DroplistConfig | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [verifyingTasks, setVerifyingTasks] = useState<Set<string>>(new Set())
  const [selectedAccountForTask, setSelectedAccountForTask] = useState<{[taskId: string]: string}>({})

  // Helper function to get platform icon
  const getPlatformIcon = (platform?: string) => {
    switch (platform?.toLowerCase()) {
      case '𝕏':
      case 'twitter':
        return <Twitter className="h-5 w-5" />
      case 'telegram':
        return <MessageCircle className="h-5 w-5" />
      case 'discord':
        return <Users className="h-5 w-5" />
      case 'youtube':
        return <Youtube className="h-5 w-5" />
      case 'instagram':
        return <Instagram className="h-5 w-5" />
      case 'facebook':
        return <Facebook className="h-5 w-5" />
      default:
        return <ExternalLink className="h-5 w-5" />
    }
  }

  // Convert backend tasks to frontend format
  const convertBackendTasksToFrontend = (backendTasks: any[], completedTaskIds: string[]): Task[] => {
    const convertedTasks: Task[] = []

    // Always add wallet connection task
    convertedTasks.push({
      id: 'connect-wallet',
      title: 'Connect Wallet',
      description: 'Connect your wallet to get started',
      icon: <Wallet className="h-5 w-5" />,
      completed: isConnected,
      points: 50,
      category: 'wallet',
      required: true,
      verification: { type: 'none' }
    })

    // Convert backend tasks
    backendTasks.forEach((task, index) => {
      const taskId = `task-${index}`
      const hasXVerification = ['follow', 'like', 'retweet'].includes(task.action?.toLowerCase() || '')
      
      convertedTasks.push({
        id: taskId,
        title: task.title,
        description: task.description,
        icon: getPlatformIcon(task.platform),
        completed: completedTaskIds.includes(taskId),
        url: task.url,
        points: task.points || 100,
        category: task.category || 'social',
        required: task.required !== undefined ? task.required : true,
        platform: task.platform,
        handle: task.handle,
        action: task.action,
        verification: {
          type: hasXVerification ? task.action?.toLowerCase() as any : 'none',
          targetUsername: task.handle?.replace('@', '') || undefined
        }
      })
    })

    return convertedTasks
  }

  // Load droplist configuration and tasks
  useEffect(() => {
    if (isOpen) {
      loadDroplistData()
    }
  }, [isOpen])

  // Load user profile when wallet connects
  useEffect(() => {
    if (isConnected && address && isOpen && droplistConfig) {
      loadUserProfile()
    }
  }, [isConnected, address, isOpen, droplistConfig])

  // Update wallet task completion
  useEffect(() => {
    setTasks(prevTasks => 
      prevTasks.map(task => 
        task.id === 'connect-wallet' 
          ? { ...task, completed: isConnected }
          : task
      )
    )
  }, [isConnected])

  const loadDroplistData = async () => {
    setIsLoading(true)
    try {
      const { config, tasks: backendTasks } = await apiService.getDroplistConfig()
      setDroplistConfig(config)
      
      // Convert backend tasks to frontend format with empty completed tasks initially
      const convertedTasks = convertBackendTasksToFrontend(backendTasks, [])
      setTasks(convertedTasks)
    } catch (error) {
      console.error('Failed to load droplist data:', error)
      // Set default config if loading fails
      setDroplistConfig({
        isActive: false,
        title: "Join FaucetDrops Community",
        description: "Complete social media tasks to join our droplist",
        requirementThreshold: 5
      })
    } finally {
      setIsLoading(false)
    }
  }

  const loadUserProfile = async () => {
    if (!address || !droplistConfig) return
    
    try {
      const profile = await apiService.getOrCreateUser(address)
      setUserProfile(profile)
      
      // Update tasks with user's completion status
      const { tasks: backendTasks } = await apiService.getDroplistConfig()
      const convertedTasks = convertBackendTasksToFrontend(backendTasks, profile.completedTasks)
      setTasks(convertedTasks)
    } catch (error) {
      console.error('Failed to load user profile:', error)
    }
  }

  const handleConnectWallet = async () => {
    try {
      await connect()
    } catch (error) {
      console.error('Failed to connect wallet:', error)
    }
  }

  const handleAddXAccount = async () => {
    if (!address) return

    try {
      const { authUrl } = await apiService.initiateXAuth(address)
      // Open X OAuth in popup window
      const popup = window.open(
        authUrl,
        'x-auth',
        'width=500,height=600,scrollbars=yes,resizable=yes'
      )

      // Listen for popup closure (you'd implement OAuth callback handling)
      const checkClosed = setInterval(() => {
        if (popup?.closed) {
          clearInterval(checkClosed)
          // Reload user profile to get new X accounts
          loadUserProfile()
        }
      }, 1000)
    } catch (error) {
      console.error('Failed to initiate X auth:', error)
    }
  }

  const handleVerifyTask = async (task: Task) => {
    if (!address) return

    const xAccountId = selectedAccountForTask[task.id]
    setVerifyingTasks(prev => new Set([...prev, task.id]))

    try {
      const result = await apiService.verifyTask(address, task.id, xAccountId)
      
      setTasks(prevTasks =>
        prevTasks.map(t => 
          t.id === task.id 
            ? { 
                ...t, 
                completed: result.completed,
                verification: {
                  ...t.verification!,
                  verifiedWithAccount: result.verifiedWith
                }
              }
            : t
        )
      )

      // Update user profile
      if (result.completed && userProfile) {
        setUserProfile(prev => prev ? {
          ...prev,
          completedTasks: [...prev.completedTasks, task.id]
        } : prev)
      }
    } catch (error) {
      console.error('Failed to verify task:', error)
    } finally {
      setVerifyingTasks(prev => {
        const newSet = new Set(prev)
        newSet.delete(task.id)
        return newSet
      })
    }
  }

  const handleTaskAction = async (task: Task) => {
    if (task.url) {
      window.open(task.url, '_blank')
      
      // Auto-verify X tasks after delay
      if (task.verification?.type && task.verification.type !== 'none') {
        setTimeout(() => {
          handleVerifyTask(task)
        }, 3000)
      } else if (task.id !== 'connect-wallet') {
        // Mark non-X tasks as completed after delay
        setTimeout(() => {
          setTasks(prevTasks =>
            prevTasks.map(t => 
              t.id === task.id ? { ...t, completed: true } : t
            )
          )
          
          // Update user profile
          if (userProfile && !userProfile.completedTasks.includes(task.id)) {
            setUserProfile(prev => prev ? {
              ...prev,
              completedTasks: [...prev.completedTasks, task.id]
            } : prev)
          }
        }, 2000)
      }
    } else if (task.id === 'share-platform') {
      // Handle sharing
      if (navigator.share) {
        try {
          await navigator.share({
            title: 'FaucetDrops - Free Token Distribution',
            text: 'Check out FaucetDrops for free, fast, and fair token distribution!',
            url: window.location.origin
          })
          setTasks(prevTasks =>
            prevTasks.map(t => 
              t.id === task.id ? { ...t, completed: true } : t
            )
          )
        } catch (err) {
          navigator.clipboard.writeText(window.location.origin)
        }
      } else {
        navigator.clipboard.writeText(window.location.origin)
        setTasks(prevTasks =>
          prevTasks.map(t => 
            t.id === task.id ? { ...t, completed: true } : t
          )
        )
      }
    }
  }

  const handleSubmitToDroplist = async () => {
    if (!address || !droplistConfig || completedTasks < droplistConfig.requirementThreshold) return
    
    setIsSubmitting(true)
    try {
      // Final verification
      await apiService.verifyAllTasks(address)
      
      // Submit to droplist
      const result = await apiService.submitToDroplist(address)
      
      if (result.success) {
        setSubmitStatus('success')
        if (userProfile) {
          setUserProfile(prev => prev ? { ...prev, droplistStatus: 'completed' } : prev)
        }
      } else {
        setSubmitStatus('error')
      }
    } catch (error) {
      console.error('Droplist submission error:', error)
      setSubmitStatus('error')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSwitchAccount = (taskId: string, accountId: string) => {
    setSelectedAccountForTask(prev => ({
      ...prev,
      [taskId]: accountId
    }))
  }

  // Calculate progress
  const completedTasks = tasks.filter(task => task.completed).length
  const totalTasks = tasks.length
  const progress = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0
  const totalPoints = tasks.filter(task => task.completed).reduce((sum, task) => sum + task.points, 0)
  const maxPoints = tasks.reduce((sum, task) => sum + task.points, 0)

  const getCategoryColor = (category: Task['category']) => {
    switch (category) {
      case 'social': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
      case 'wallet': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
      case 'engagement': return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
      case 'referral': return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200'
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
    }
  }

  if (!isOpen) return null

  // Check if droplist is active
  if (droplistConfig && !droplistConfig.isActive) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <AlertCircle className="h-12 w-12 text-yellow-500 mx-auto mb-2" />
            <CardTitle>Droplist Inactive</CardTitle>
            <CardDescription>
              The droplist is currently not accepting new members
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" onClick={onClose} className="w-full">
              Close
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Show wallet connection prompt if not connected
  if (!isConnected) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="flex items-center justify-center gap-2">
              <Wallet className="h-6 w-6" />
              Connect Wallet
            </CardTitle>
            <CardDescription>
              Connect your wallet to access the droplist tasks
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button onClick={handleConnectWallet} className="w-full">
              Connect Wallet
            </Button>
            <Button variant="outline" onClick={onClose} className="w-full">
              Cancel
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Show loading state
  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
        <Card className="w-full max-w-md">
          <CardContent className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin" />
            <span className="ml-2">Loading droplist...</span>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <CardHeader className="border-b">
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-2xl flex items-center gap-2">
                <Users className="h-6 w-6" />
                {droplistConfig?.title || "Join Droplist"}
              </CardTitle>
              <CardDescription className="mt-2">
                {droplistConfig?.description || "Complete tasks to join our droplist"}
              </CardDescription>
              <CardDescription className="mt-1">
                Connected: {address?.slice(0, 6)}...{address?.slice(-4)}
              </CardDescription>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
          
          {/* X Accounts Section */}
          <div className="mt-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">
                X Accounts ({userProfile?.xAccounts?.length || 0})
              </span>
              <Button variant="outline" size="sm" onClick={handleAddXAccount}>
                <Plus className="h-3 w-3 mr-1" />
                Add Account
              </Button>
            </div>
            
            {!userProfile?.xAccounts?.length ? (
              <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-yellow-600 dark:text-yellow-400 mt-0.5 flex-shrink-0" />
                  <div className="text-sm text-yellow-800 dark:text-yellow-200">
                    <strong>No X Accounts:</strong> Add X accounts to verify social tasks automatically.
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {userProfile.xAccounts.map((account) => (
                  <Badge 
                    key={account.id}
                    variant={account.isActive ? "default" : "secondary"}
                    className="text-xs"
                  >
                    @{account.username}
                    {account.displayName && ` (${account.displayName})`}
                  </Badge>
                ))}
              </div>
            )}
          </div>
          
          {/* Progress Section */}
          <div className="mt-6 space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Progress</span>
              <span className="text-sm text-muted-foreground">
                {completedTasks}/{droplistConfig?.requirementThreshold || totalTasks} required tasks
              </span>
            </div>
            <Progress value={progress} className="h-2" />
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">
                Points: {totalPoints}/{maxPoints}
              </span>
              <Badge variant={
                completedTasks >= (droplistConfig?.requirementThreshold || totalTasks) ? "default" : "secondary"
              }>
                {completedTasks >= (droplistConfig?.requirementThreshold || totalTasks) ? "Eligible!" : "In Progress"}
              </Badge>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="p-6">
          <div className="space-y-4">
            {tasks.map((task) => {
              const availableAccounts = userProfile?.xAccounts?.filter(acc => acc.isActive) || []
              const hasXVerification = task.verification?.type !== 'none'
              
              return (
                <div
                  key={task.id}
                  className={`p-4 border rounded-lg transition-all ${
                    task.completed 
                      ? 'bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-800' 
                      : 'bg-white border-gray-200 dark:bg-gray-950 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700'
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <div className={`p-2 rounded-full ${task.completed ? 'bg-green-100 dark:bg-green-900' : 'bg-gray-100 dark:bg-gray-800'}`}>
                      {task.icon}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <h3 className="font-semibold text-sm">{task.title}</h3>
                          <p className="text-sm text-muted-foreground mt-1">{task.description}</p>
                          <div className="flex items-center gap-2 mt-2 flex-wrap">
                            <Badge className={getCategoryColor(task.category)} variant="secondary">
                              {task.category}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              +{task.points} points
                            </span>
                            {task.required && (
                              <Badge variant="outline" className="text-xs">
                                Required
                              </Badge>
                            )}
                            {hasXVerification && (
                              <Badge variant="outline" className="text-xs">
                                Auto-verified
                              </Badge>
                            )}
                            {task.verification?.verifiedWithAccount && (
                              <Badge variant="outline" className="text-xs text-green-600">
                                ✓ @{task.verification.verifiedWithAccount}
                              </Badge>
                            )}
                          </div>
                          
                          {/* Account Selection */}
                          {hasXVerification && availableAccounts.length > 0 && (
                            <div className="mt-2">
                              <label className="text-xs text-muted-foreground">Verify with:</label>
                              <div className="flex gap-1 mt-1">
                                {availableAccounts.map((account) => (
                                  <Button
                                    key={account.id}
                                    variant={selectedAccountForTask[task.id] === account.id ? "default" : "outline"}
                                    size="sm"
                                    className="text-xs h-6 px-2"
                                    onClick={() => handleSwitchAccount(task.id, account.id)}
                                  >
                                    @{account.username}
                                  </Button>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                        
                        <div className="flex items-center gap-2">
                          {verifyingTasks.has(task.id) ? (
                            <Button size="sm" disabled>
                              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                              Verifying...
                            </Button>
                          ) : task.completed ? (
                            <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
                          ) : (
                            <div className="flex gap-2">
                              {hasXVerification && availableAccounts.length > 0 && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleVerifyTask(task)}
                                >
                                  Verify
                                </Button>
                              )}
                              <Button
                                size="sm"
                                variant={task.id === 'connect-wallet' ? 'default' : 'outline'}
                                onClick={() => task.id === 'connect-wallet' ? handleConnectWallet() : handleTaskAction(task)}
                              >
                                {task.url && <ExternalLink className="h-4 w-4 mr-1" />}
                                {task.id === 'connect-wallet' ? 'Connected' : 'Complete'}
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
          
          {/* Submit Section */}
          <div className="mt-8 p-6 bg-gray-50 dark:bg-gray-900 rounded-lg">
            <div className="text-center">
              <h3 className="font-semibold mb-2">Ready to Join?</h3>
              <p className="text-sm text-muted-foreground mb-4">
                {completedTasks >= (droplistConfig?.requirementThreshold || totalTasks)
                  ? "Congratulations! You've completed enough tasks and are eligible for the droplist."
                  : `Complete ${(droplistConfig?.requirementThreshold || totalTasks) - completedTasks} more task${(droplistConfig?.requirementThreshold || totalTasks) - completedTasks !== 1 ? 's' : ''} to become eligible.`
                }
              </p>
              
              {submitStatus === 'success' ? (
                <div className="text-center">
                  <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-2" />
                  <p className="text-green-600 font-medium">Successfully added to droplist!</p>
                  <p className="text-sm text-muted-foreground mt-1">You'll be notified about future drops.</p>
                </div>
              ) : (
                <Button
                  onClick={handleSubmitToDroplist}
                  disabled={completedTasks < (droplistConfig?.requirementThreshold || totalTasks) || isSubmitting}
                  className="w-full"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Adding to Droplist...
                    </>
                  ) : (
                    'Join Droplist'
                  )}
                </Button>
              )}
              
              {submitStatus === 'error' && (
                <p className="text-red-600 text-sm mt-2">
                  Failed to add to droplist. Please try again.
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}