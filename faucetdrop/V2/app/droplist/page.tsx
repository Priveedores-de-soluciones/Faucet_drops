"use client"
import React, { useState, useEffect } from 'react'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useWallet } from "@/hooks/use-wallet"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { 
  Settings, 
  Plus, 
  Trash2, 
  Save, 
  Twitter, 
  MessageCircle, 
  Users,
  ExternalLink,
  Loader2,
  CheckCircle,
  AlertCircle,
  Eye,
  Edit
} from "lucide-react"
import { WalletConnectButton } from '@/components/wallet-connect'
import { Header } from '@/components/header'

// Platform owner address
const PLATFORM_OWNER = "0x9fBC2A0de6e5C5Fd96e8D11541608f5F328C0785"

// Backend API URL
const API_BASE_URL = "https://fauctdrop-backend.onrender.com"

interface DroplistTask {
  id: string
  title: string
  description: string
  platform?: string
  handle?: string
  url: string
  required: boolean
  points: number
  category: 'social' | 'wallet' | 'engagement' | 'referral'
  action: string
  verification?: {
    type: 'follow' | 'like' | 'retweet' | 'join' | 'none'
    targetUsername?: string
    targetTweetId?: string
  }
}

interface DroplistConfig {
  isActive: boolean
  title: string
  description: string
  maxParticipants?: number
  endDate?: string
  requirementThreshold: number // minimum tasks to complete
}

export default function DroplistAdminPanel() {
  // Use wallet hook instead of direct context
  const { address, isConnected, connect } = useWallet()
  
  const [isOwner, setIsOwner] = useState(false)
  const [isCheckingOwnership, setIsCheckingOwnership] = useState(true)
  const [tasks, setTasks] = useState<DroplistTask[]>([])
  const [config, setConfig] = useState<DroplistConfig>({
    isActive: false,
    title: "Join FaucetDrops Community",
    description: "Complete social media tasks to join our droplist",
    requirementThreshold: 5
  })
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [editingTask, setEditingTask] = useState<DroplistTask | null>(null)
  const [showPreview, setShowPreview] = useState(false)
  const [analytics, setAnalytics] = useState<any>(null)
  const [participants, setParticipants] = useState<any[]>([])
  const [isLoadingParticipants, setIsLoadingParticipants] = useState(false)
  const [isExporting, setIsExporting] = useState<string | null>(null)

  // New task form
  const [newTask, setNewTask] = useState<Partial<DroplistTask>>({
    title: "",
    description: "",
    platform: "",
    handle: "",
    url: "",
    required: true,
    points: 100,
    category: "social",
    action: "follow",
    verification: { type: "none" }
  })

  // Check ownership when wallet connection changes
  useEffect(() => {
    checkOwnership()
  }, [address, isConnected])

  // Load data only when user is verified as owner
  useEffect(() => {
    if (isOwner && address) {
      loadDroplistConfig()
      loadAnalytics()
      loadParticipants()
    }
  }, [isOwner, address])

  const checkOwnership = async () => {
    setIsCheckingOwnership(true)
    
    if (!isConnected || !address) {
      setIsOwner(false)
      setIsCheckingOwnership(false)
      return
    }

    try {
      // Check if connected address is platform owner
      const isOwnerAddress = address.toLowerCase() === PLATFORM_OWNER.toLowerCase()
      setIsOwner(isOwnerAddress)
      
      if (isOwnerAddress) {
        console.log('✅ Platform owner verified:', address)
      } else {
        console.log('❌ Access denied. Connected:', address, 'Required:', PLATFORM_OWNER)
      }
    } catch (error) {
      console.error('Error checking ownership:', error)
      setIsOwner(false)
    } finally {
      setIsCheckingOwnership(false)
    }
  }

  const loadDroplistConfig = async () => {
    setIsLoading(true)
    try {
      // Load existing droplist tasks from backend
      const response = await fetch(`${API_BASE_URL}/api/droplist/config`)
      if (response.ok) {
        const data = await response.json()
        setTasks(data.tasks || [])
        setConfig(data.config || config)
      }
    } catch (error) {
      console.error('Failed to load droplist config:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleAddTask = () => {
    if (!newTask.title || !newTask.description) return

    const task: DroplistTask = {
      id: Date.now().toString(),
      title: newTask.title!,
      description: newTask.description!,
      platform: newTask.platform,
      handle: newTask.handle,
      url: newTask.url!,
      required: newTask.required!,
      points: newTask.points!,
      category: newTask.category!,
      action: newTask.action!,
      verification: newTask.verification || { type: 'none' }
    }

    setTasks([...tasks, task])
    
    // Reset form
    setNewTask({
      title: "",
      description: "",
      platform: "",
      handle: "",
      url: "",
      required: true,
      points: 100,
      category: "social",
      action: "follow",
      verification: { type: "none" }
    })
  }

  const handleEditTask = (task: DroplistTask) => {
    setEditingTask(task)
    setNewTask(task)
  }

  const handleUpdateTask = () => {
    if (!editingTask || !newTask.title || !newTask.description) return

    const updatedTask: DroplistTask = {
      ...editingTask,
      title: newTask.title!,
      description: newTask.description!,
      platform: newTask.platform,
      handle: newTask.handle,
      url: newTask.url!,
      required: newTask.required!,
      points: newTask.points!,
      category: newTask.category!,
      action: newTask.action!,
      verification: newTask.verification || { type: 'none' }
    }

    setTasks(tasks.map(t => t.id === editingTask.id ? updatedTask : t))
    setEditingTask(null)
    
    // Reset form
    setNewTask({
      title: "",
      description: "",
      platform: "",
      handle: "",
      url: "",
      required: true,
      points: 100,
      category: "social",
      action: "follow",
      verification: { type: "none" }
    })
  }

  const handleRemoveTask = (taskId: string) => {
    setTasks(tasks.filter(t => t.id !== taskId))
  }

  const handleSaveConfig = async () => {
    if (!address) {
      console.error('No wallet address available')
      return
    }

    setIsSaving(true)
    try {
      // Convert tasks to backend format
      const backendTasks = tasks.map(task => ({
        title: task.title,
        description: task.description,
        url: task.url,
        required: task.required,
        platform: task.platform,
        handle: task.handle,
        action: task.action
      }))

      // Save to backend using existing task management system
      const response = await fetch(`${API_BASE_URL}/api/droplist/config`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userAddress: address,
          config: config,
          tasks: backendTasks
        })
      })

      if (response.ok) {
        alert('Droplist configuration saved successfully!')
        // Reload analytics after saving
        loadAnalytics()
        loadParticipants()
      } else {
        throw new Error('Failed to save configuration')
      }
    } catch (error) {
      console.error('Failed to save config:', error)
      alert('Failed to save configuration')
    } finally {
      setIsSaving(false)
    }
  }

  const loadAnalytics = async () => {
    if (!address) return

    try {
      const response = await fetch(`${API_BASE_URL}/api/admin/droplist-analytics?adminAddress=${address}`)
      if (response.ok) {
        const data = await response.json()
        setAnalytics(data.overview)
      }
    } catch (error) {
      console.error('Failed to load analytics:', error)
    }
  }

  const loadParticipants = async () => {
    if (!address) return

    setIsLoadingParticipants(true)
    try {
      const response = await fetch(`${API_BASE_URL}/api/admin/participants?adminAddress=${address}`)
      if (response.ok) {
        const data = await response.json()
        setParticipants(data.participants || [])
      }
    } catch (error) {
      console.error('Failed to load participants:', error)
    } finally {
      setIsLoadingParticipants(false)
    }
  }

  const handleExport = async (exportType: string) => {
    if (!address) return

    setIsExporting(exportType)
    try {
      const response = await fetch(`${API_BASE_URL}/api/admin/export-addresses?adminAddress=${address}&exportType=${exportType}`)
      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `${exportType}_participants_${new Date().toISOString().split('T')[0]}.csv`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        window.URL.revokeObjectURL(url)
      } else {
        throw new Error('Export failed')
      }
    } catch (error) {
      console.error('Export error:', error)
      alert('Export failed. Please try again.')
    } finally {
      setIsExporting(null)
    }
  }

  const getPlatformIcon = (platform?: string) => {
    switch (platform?.toLowerCase()) {
      case '𝕏':
      case 'twitter':
        return <Twitter className="h-4 w-4" />
      case 'telegram':
        return <MessageCircle className="h-4 w-4" />
      case 'discord':
        return <Users className="h-4 w-4" />
      default:
        return <ExternalLink className="h-4 w-4" />
    }
  }

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'social': return 'bg-blue-100 text-blue-800'
      case 'wallet': return 'bg-green-100 text-green-800'
      case 'engagement': return 'bg-purple-100 text-purple-800'
      case 'referral': return 'bg-orange-100 text-orange-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  // Show wallet connection prompt if not connected
  if (!isConnected) {
    return (
      <div className="max-w-md mx-auto mt-8">
        <Card>
          <CardHeader className="text-center">
            <WalletConnectButton />
            <CardTitle>Connect Wallet</CardTitle>
            <CardDescription>
              Connect your wallet to access the Droplist Admin Panel
            </CardDescription>
          </CardHeader>
          <CardContent>
            
            <p className="text-xs text-muted-foreground text-center mt-3">
              Only the platform owner can access this panel
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Show loading while checking ownership
  if (isCheckingOwnership) {
    return (
      <div className="max-w-md mx-auto mt-8">
        <Card>
          <CardContent className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin mr-2" />
            <span>Verifying access permissions...</span>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Access control check
  if (!isOwner) {
    return (
      <div className="max-w-md mx-auto mt-8">
        <Card>
          <CardHeader className="text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-2" />
            <CardTitle>Access Denied</CardTitle>
            <CardDescription>
              Only the platform owner can manage droplist tasks
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                <p className="text-sm text-muted-foreground text-center">
                  <strong>Connected:</strong> {address ? `${address.slice(0, 6)}...${address.slice(-4)}` : "Not connected"}
                </p>
                <p className="text-sm text-muted-foreground text-center">
                  <strong>Required:</strong> {PLATFORM_OWNER.slice(0, 6)}...{PLATFORM_OWNER.slice(-4)}
                </p>
              </div>
              <p className="text-xs text-center text-muted-foreground">
                Please connect with the platform owner wallet to access this panel
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (isLoading) {
    return (
      <Card className="max-w-md mx-auto mt-8">
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin mr-2" />
          <span>Loading droplist configuration...</span>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <Header pageTitle='Droplist Admin Panel' />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Configuration Panel */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Droplist Configuration</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="active">Droplist Active</Label>
              <Switch
                id="active"
                checked={config.isActive}
                onCheckedChange={(checked) => setConfig({...config, isActive: checked})}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={config.title}
                onChange={(e) => setConfig({...config, title: e.target.value})}
                placeholder="Join FaucetDrops Community"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={config.description}
                onChange={(e) => setConfig({...config, description: e.target.value})}
                placeholder="Complete social media tasks to join our droplist"
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="threshold">Minimum Tasks Required</Label>
              <Input
                id="threshold"
                type="number"
                value={config.requirementThreshold}
                onChange={(e) => setConfig({...config, requirementThreshold: parseInt(e.target.value)})}
                min="1"
                max={tasks.length}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="maxParticipants">Max Participants (Optional)</Label>
              <Input
                id="maxParticipants"
                type="number"
                value={config.maxParticipants || ""}
                onChange={(e) => setConfig({...config, maxParticipants: e.target.value ? parseInt(e.target.value) : undefined})}
                placeholder="Leave empty for no limit"
              />
            </div>
          </CardContent>
        </Card>

        {/* Add/Edit Task Panel */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              {editingTask ? "Edit Task" : "Add New Task"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="taskTitle">Title</Label>
                <Input
                  id="taskTitle"
                  value={newTask.title || ""}
                  onChange={(e) => setNewTask({...newTask, title: e.target.value})}
                  placeholder="Follow us on Twitter"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="points">Points</Label>
                <Input
                  id="points"
                  type="number"
                  value={newTask.points || 100}
                  onChange={(e) => setNewTask({...newTask, points: parseInt(e.target.value)})}
                  min="1"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="taskDescription">Description</Label>
              <Textarea
                id="taskDescription"
                value={newTask.description || ""}
                onChange={(e) => setNewTask({...newTask, description: e.target.value})}
                placeholder="Follow our Twitter account for updates"
                rows={2}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="platform">Platform</Label>
                <Select
                  value={newTask.platform || ""}
                  onValueChange={(value) => setNewTask({...newTask, platform: value})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select platform" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="𝕏">Twitter/𝕏</SelectItem>
                    <SelectItem value="telegram">Telegram</SelectItem>
                    <SelectItem value="discord">Discord</SelectItem>
                    <SelectItem value="youtube">YouTube</SelectItem>
                    <SelectItem value="instagram">Instagram</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="action">Action</Label>
                <Select
                  value={newTask.action || "follow"}
                  onValueChange={(value) => setNewTask({...newTask, action: value})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select action" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="follow">Follow</SelectItem>
                    <SelectItem value="subscribe">Subscribe</SelectItem>
                    <SelectItem value="join">Join</SelectItem>
                    <SelectItem value="like">Like</SelectItem>
                    <SelectItem value="retweet">Retweet</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="url">URL</Label>
              <Input
                id="url"
                value={newTask.url || ""}
                onChange={(e) => setNewTask({...newTask, url: e.target.value})}
                placeholder="https://x.com/faucetdrops"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="handle">Handle/Username</Label>
              <Input
                id="handle"
                value={newTask.handle || ""}
                onChange={(e) => setNewTask({...newTask, handle: e.target.value})}
                placeholder="@faucetdrops"
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Switch
                  checked={newTask.required || false}
                  onCheckedChange={(checked) => setNewTask({...newTask, required: checked})}
                />
                <Label>Required Task</Label>
              </div>

              <Select
                value={newTask.category || "social"}
                onValueChange={(value: any) => setNewTask({...newTask, category: value})}
              >
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="social">Social</SelectItem>
                  <SelectItem value="engagement">Engagement</SelectItem>
                  <SelectItem value="referral">Referral</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button
              onClick={editingTask ? handleUpdateTask : handleAddTask}
              className="w-full"
              disabled={!newTask.title || !newTask.description}
            >
              <Plus className="h-4 w-4 mr-2" />
              {editingTask ? "Update Task" : "Add Task"}
            </Button>

            {editingTask && (
              <Button
                variant="outline"
                onClick={() => {
                  setEditingTask(null)
                  setNewTask({
                    title: "",
                    description: "",
                    platform: "",
                    handle: "",
                    url: "",
                    required: true,
                    points: 100,
                    category: "social",
                    action: "follow",
                    verification: { type: "none" }
                  })
                }}
                className="w-full"
              >
                Cancel Edit
              </Button>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Analytics Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Users className="h-5 w-5" />
              Participants
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm">Total Users:</span>
                <Badge variant="outline">{analytics?.totalUsers || 0}</Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">Completed:</span>
                <Badge variant="default">{analytics?.completedUsers || 0}</Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">Pending:</span>
                <Badge variant="secondary">{analytics?.pendingUsers || 0}</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <CheckCircle className="h-5 w-5" />
              Completions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm">Task Completions:</span>
                <Badge variant="outline">{analytics?.totalTaskCompletions || 0}</Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">Completion Rate:</span>
                <Badge variant="default">{analytics?.completionRate || 0}%</Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">Recent (7d):</span>
                <Badge variant="secondary">{analytics?.recentCompletions || 0}</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Export Data</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleExport('all')}
                className="w-full justify-start"
                disabled={isExporting}
              >
                {isExporting === 'all' ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <ExternalLink className="h-4 w-4 mr-2" />
                )}
                All Participants
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleExport('completed')}
                className="w-full justify-start"
                disabled={isExporting}
              >
                {isExporting === 'completed' ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <CheckCircle className="h-4 w-4 mr-2" />
                )}
                Completed Only
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleExport('task_completions')}
                className="w-full justify-start"
                disabled={isExporting}
              >
                {isExporting === 'task_completions' ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Settings className="h-4 w-4 mr-2" />
                )}
                Task Details
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Participants Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Recent Participants ({participants.length})</CardTitle>
            <CardDescription>
              Latest users who joined the droplist
            </CardDescription>
          </div>
          <Button onClick={loadParticipants} disabled={isLoadingParticipants}>
            {isLoadingParticipants ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Users className="h-4 w-4 mr-2" />
            )}
            Refresh Data
          </Button>
        </CardHeader>
        <CardContent>
          {participants.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No participants yet. Data will appear here as users complete tasks.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2">Wallet Address</th>
                    <th className="text-left py-2">Tasks</th>
                    <th className="text-left py-2">Status</th>
                    <th className="text-left py-2">Joined</th>
                  </tr>
                </thead>
                <tbody>
                  {participants.slice(0, 10).map((participant, index) => (
                    <tr key={index} className="border-b">
                      <td className="py-2 font-mono text-xs">
                        {participant.walletAddress.slice(0, 6)}...{participant.walletAddress.slice(-4)}
                      </td>
                      <td className="py-2">
                        <Badge variant="outline">{participant.completedTasks}</Badge>
                      </td>
                      <td className="py-2">
                        <Badge 
                          variant={
                            participant.droplistStatus === 'completed' 
                              ? 'default' 
                              : 'secondary'
                          }
                        >
                          {participant.droplistStatus}
                        </Badge>
                      </td>
                      <td className="py-2 text-xs text-muted-foreground">
                        {participant.joinedAt ? new Date(participant.joinedAt).toLocaleDateString() : 'N/A'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {participants.length > 10 && (
                <div className="text-center py-4">
                  <p className="text-sm text-muted-foreground">
                    Showing 10 of {participants.length} participants. Export for full list.
                  </p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tasks List */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Current Tasks ({tasks.length})</CardTitle>
            <CardDescription>
              Manage all droplist tasks
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setShowPreview(!showPreview)}
            >
              <Eye className="h-4 w-4 mr-2" />
              {showPreview ? "Hide" : "Show"} Preview
            </Button>
            <Button onClick={handleSaveConfig} disabled={isSaving}>
              {isSaving ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Save Configuration
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {tasks.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No tasks created yet. Add your first task above.
            </div>
          ) : (
            <div className="space-y-3">
              {tasks.map((task) => (
                <div
                  key={task.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    {getPlatformIcon(task.platform)}
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium">{task.title}</h3>
                        <Badge className={getCategoryColor(task.category)} variant="secondary">
                          {task.category}
                        </Badge>
                        {task.required && (
                          <Badge variant="outline" className="text-xs">Required</Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">{task.description}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-muted-foreground">
                          +{task.points} points
                        </span>
                        {task.handle && (
                          <span className="text-xs text-muted-foreground">
                            {task.handle}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEditTask(task)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveTask(task.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Preview Modal */}
      {showPreview && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <CardHeader className="border-b">
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>{config.title}</CardTitle>
                  <CardDescription>{config.description}</CardDescription>
                </div>
                <Button variant="ghost" onClick={() => setShowPreview(false)}>
                  ×
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-4">
                <div className="text-sm text-muted-foreground">
                  Complete at least {config.requirementThreshold} tasks to join the droplist
                </div>
                {tasks.map((task) => (
                  <div
                    key={task.id}
                    className="p-4 border rounded-lg flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      {getPlatformIcon(task.platform)}
                      <div>
                        <h3 className="font-medium text-sm">{task.title}</h3>
                        <p className="text-xs text-muted-foreground">{task.description}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge className={getCategoryColor(task.category)} variant="secondary">
                            {task.category}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            +{task.points} points
                          </span>
                          {task.required && (
                            <Badge variant="outline" className="text-xs">Required</Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    <Button size="sm" variant="outline">
                      Complete
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}