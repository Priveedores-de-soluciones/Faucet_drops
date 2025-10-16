"use client"

import type React from "react"
import { useEffect, useState, useCallback } from "react"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import { useToast } from "@/hooks/use-toast"
import { useWallet } from "@/hooks/use-wallet"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { Header } from "@/components/header"
import {
  getFaucetDetails,
  isWhitelisted,
  getAllAdmins,
  setWhitelistBatch,
  setCustomClaimAmountsBatch,
  resetAllClaims,
  fundFaucet,
  withdrawTokens,
  setClaimParameters,
  saveToStorage,
  storeClaim,
  getFromStorage,
  updateFaucetName,
  deleteFaucet,
  addAdmin,
  removeAdmin,
  getFaucetTransactionHistory,
} from "@/lib/faucet"
import { formatUnits, parseUnits, type BrowserProvider, JsonRpcProvider } from "ethers"
import { Clock, Coins, Download, Share2, Upload, Users, Key, RotateCcw, Edit, Trash2, FileUp, Menu, History, Copy, ExternalLink, Check, AlertCircle, User, ArrowLeft, Link } from "lucide-react"
import { claimViaBackend, claimNoCodeViaBackend, claimCustomViaBackend, retrieveSecretCode } from "@/lib/backend-service"
import { useNetwork } from "@/hooks/use-network"
import { TokenBalance } from "@/components/token-balance"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination"
import { Switch } from "@/components/ui/switch"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import LoadingPage from "@/components/loading"

// Faucet type definitions
type FaucetType = 'dropcode' | 'droplist' | 'custom'

export default function FaucetDetails() {
  
  const { address: faucetAddress } = useParams<{ address: string }>()
  const searchParams = useSearchParams()
  const networkId = searchParams.get("networkId")
  const { toast } = useToast()
  const router = useRouter()
  const { address, chainId, isConnected, provider } = useWallet()
  const { networks, setNetwork } = useNetwork()
  const [faucetDetails, setFaucetDetails] = useState<any>(null)
  const [faucetType, setFaucetType] = useState<FaucetType | null>(null)
  const [loading, setLoading] = useState(true)
  const [isClaiming, setIsClaiming] = useState(false)
  const [isFunding, setIsFunding] = useState(false)
  const [isWithdrawing, setIsWithdrawing] = useState(false)
  const [isUpdatingParameters, setIsUpdatingParameters] = useState(false)
  const [isUpdatingWhitelist, setIsUpdatingWhitelist] = useState(false)
  const [isUploadingCustomClaims, setIsUploadingCustomClaims] = useState(false)
  const [isResettingClaims, setIsResettingClaims] = useState(false)
  const [isUpdatingName, setIsUpdatingName] = useState(false)
  const [isDeletingFaucet, setIsDeletingFaucet] = useState(false)
  const [isManagingAdmin, setIsManagingAdmin] = useState(false)
  const [isRetrievingSecret, setIsRetrievingSecret] = useState(false)
  const [fundAmount, setFundAmount] = useState("")
  const [adjustedFundAmount, setAdjustedFundAmount] = useState("")
  const [withdrawAmount, setWithdrawAmount] = useState("")
  const [claimAmount, setClaimAmount] = useState("0")
  const [isWhitelistEnabled, setIsWhitelistEnabled] = useState(true)
  const [startTime, setStartTime] = useState("")
  const [endTime, setEndTime] = useState("")
  const [whitelistAddresses, setWhitelistAddresses] = useState("")
  const [tokenSymbol, setTokenSymbol] = useState("ETH")
  const [tokenDecimals, setTokenDecimals] = useState(18)
  const [hasClaimed, setHasClaimed] = useState(false)
  const [isGeneratingNewCode, setIsGeneratingNewCode] = useState(false)
  const [showNewCodeDialog, setShowNewCodeDialog] = useState(false)
  const [newlyGeneratedCode, setNewlyGeneratedCode] = useState("")

  // Verification system states
  const [usernames, setUsernames] = useState<Record<string, string>>({})
  const [verificationStates, setVerificationStates] = useState<Record<string, boolean>>({})
  const [isVerifying, setIsVerifying] = useState(false)
  
  const [showClaimPopup, setShowClaimPopup] = useState(false)
  const [showFundPopup, setShowFundPopup] = useState(false)
  const [showEditNameDialog, setShowEditNameDialog] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [showAddAdminDialog, setShowAddAdminDialog] = useState(false)
  const [showFollowDialog, setShowFollowDialog] = useState(false)
  const [showVerificationDialog, setShowVerificationDialog] = useState(false)
  const [newFaucetName, setNewFaucetName] = useState("")
  const [newAdminAddress, setNewAdminAddress] = useState("")
  const [isAddingAdmin, setIsAddingAdmin] = useState(true)
  const [txHash, setTxHash] = useState<string | null>(null)
  const [startCountdown, setStartCountdown] = useState<string | null>(null)
  const [endCountdown, setEndCountdown] = useState<string>("")
  const [selectedNetwork, setSelectedNetwork] = useState<any>(null)
  const [secretCode, setSecretCode] = useState("")
  const [generatedSecretCode, setGeneratedSecretCode] = useState("")
  const [showSecretCodeDialog, setShowSecretCodeDialog] = useState(false)
  const [showCurrentSecretDialog, setShowCurrentSecretDialog] = useState(false)
  const [userIsWhitelisted, setUserIsWhitelisted] = useState(false)
  const [userIsAdmin, setUserIsAdmin] = useState(false)
  const [backendMode, setBackendMode] = useState(true)
  const [userCustomClaimAmount, setUserCustomClaimAmount] = useState<bigint>(BigInt(0))
  const [hasCustomAmount, setHasCustomAmount] = useState(false)
  const [customClaimFile, setCustomClaimFile] = useState<File | null>(null)
  const [adminList, setAdminList] = useState<string[]>([])
  const [factoryOwner, setFactoryOwner] = useState<string | null>(null)
  const [showAdminPopup, setShowAdminPopup] = useState(false)
  const [dontShowAdminPopupAgain, setDontShowAdminPopupAgain] = useState(false)
  const [activeTab, setActiveTab] = useState("fund")
  const [transactions, setTransactions] = useState<
    { faucetAddress: string; transactionType: string; initiator: string; amount: bigint; isEther: boolean; timestamp: number }[]
  >([])
  const [dynamicTasks, setDynamicTasks] = useState<SocialMediaLink[]>([])
  const [newSocialLinks, setNewSocialLinks] = useState<SocialMediaLink[]>([])
  const [isLoadingSocialLinks, setIsLoadingSocialLinks] = useState(false)
  const [isSavingSocialLinks, setIsSavingSocialLinks] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const transactionsPerPage = 10
  const [customXPostTemplate, setCustomXPostTemplate] = useState("")
  const [isLoadingXTemplate, setIsLoadingXTemplate] = useState(false)
  
useEffect(() => {
  // Prevent infinite loading
  const loadingTimeout = setTimeout(() => {
    if (loading) {
      console.warn('⏰ Loading timeout - forcing stop')
      setLoading(false)
      toast({
        title: "Loading took too long",
        description: "Please refresh the page",
        variant: "destructive",
      })
    }
  }, 15000) // 15 second timeout

  return () => clearTimeout(loadingTimeout)
}, [loading, toast])
  // ✅ UPDATED: Allow admin, owner, and backend address to access drop code
  const FACTORY_OWNER_ADDRESS = "0x9fBC2A0de6e5C5Fd96e8D11541608f5F328C0785" // Backend address
  const isOwner = address && faucetDetails?.owner && address.toLowerCase() === faucetDetails.owner.toLowerCase()
  const isBackendAddress = address && address.toLowerCase() === FACTORY_OWNER_ADDRESS.toLowerCase()
  const canAccessAdminControls = isOwner || userIsAdmin
  // ✅ NEW: Extended access for drop code - includes backend address
  const canAccessDropCode = isOwner || userIsAdmin || isBackendAddress
  const isSecretCodeValid = secretCode.length === 6 && /^[A-Z0-9]{6}$/.test(secretCode)
  
  // Check if all required accounts are verified
  const allAccountsVerified = dynamicTasks.length === 0 ? true : dynamicTasks.every(task => verificationStates[task.platform])

  // Check if all usernames are provided (for button state)
  const allUsernamesProvided = dynamicTasks.length === 0 ? true : dynamicTasks.every(task => 
    usernames[task.platform] && usernames[task.platform].trim().length > 0
  )


// Add this to your component's state variables
const [startTimeError, setStartTimeError] = useState('');

// Add these helper functions to your component

// Get current date and time in the format required for datetime-local input
const getCurrentDateTime = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  
  return `${year}-${month}-${day}T${hours}:${minutes}`;
};

// Validate that start time is in the future
const validateStartTime = (value) => {
  if (!value) {
    setStartTimeError('');
    return false;
  }
  
  const now = new Date();
  const selectedTime = new Date(value);
  
  if (selectedTime <= now) {
    setStartTimeError('Start time must be ahead of current time ');
    return false;
  } else {
    setStartTimeError('');
    return true;
  }
};

// Handle start time change with validation
const handleStartTimeChange = (e) => {
  const value = e.target.value;
  setStartTime(value);
  validateStartTime(value);
};
  const getActionText = (platform: string): string => {
    switch(platform.toLowerCase()) {
      case 'telegram': return 'Join'
      case 'discord': return 'Join'
      case '𝕏':
      case 'x': return 'Follow'
      case 'youtube': return 'Subscribe'
      case 'instagram': return 'Follow'
      default: return 'Follow'
    }
  }

  const getPlatformIcon = (platform: string): string => {
    switch(platform.toLowerCase()) {
      case 'telegram': return '📱'
      case 'discord': return '💬'
      case '𝕏':
      case 'x': return '𝕏'
      case 'youtube': return '📺'
      case 'instagram': return '📷'
      case 'tiktok': return '🎵'
      case 'facebook': return '📘'
      default: return '🔗'
    }
  }

  // ✅ Helper function to get native token symbol based on network
  const getNativeTokenSymbol = (networkName: string): string => {
    switch (networkName) {
      case "Celo":
        return "CELO"
      case "Lisk":
        return "LISK"
      case "Arbitrum":
      case "Base":
      case "Ethereum":
        return "ETH"
      case "Polygon":
        return "MATIC"
      case "Optimism":
        return "ETH"
      default:
        return "ETH"
    }
  }

  interface SocialMediaLink {
    platform: string;
    url: string;
    handle: string;
    action: string;
  }

  // ✅ NEW: Copy faucet link function
  const handleCopyFaucetLink = async (): Promise<void> => {
    try {
      const currentUrl = window.location.href
      await navigator.clipboard.writeText(currentUrl)
      toast({
        title: "Link Copied",
        description: "Faucet link has been copied to your clipboard.",
      })
    } catch (error) {
      toast({
        title: "Copy Failed",
        description: "Failed to copy the link. Please try again.",
        variant: "destructive",
      })
    }
  }

  // ✅ NEW: Go back function
  const handleGoBack = (): void => {
    if (window.history.length > 1) {
      router.back()
    } else {
      router.push("/")
    }
  }

const loadCustomXPostTemplate = async (): Promise<void> => {
  if (!faucetAddress) return
  
  try {
    setIsLoadingXTemplate(true)
    console.log(`🔍 Loading custom X post template for faucet: ${faucetAddress}`)
    
    const response = await fetch(`https://fauctdrop-backend.onrender.com/faucet-x-template/${faucetAddress}`)
    
    if (!response.ok) {
      if (response.status === 404) {
        console.log("📝 No custom X post template found, using default template")
        // PRE-FILL with default template so owner can edit it
        setCustomXPostTemplate(
          `I just received a drop of {amount} {token} from @FaucetDrops on {network}. Verify Drop 💧: {explorer}`
        )
        return
      }
      throw new Error(`Failed to load X post template: ${response.status}`)
    }
    
    const result = await response.json()
    
    if (result.success && result.template) {
      setCustomXPostTemplate(result.template)
      console.log(`✅ Loaded custom X post template for faucet ${faucetAddress}`)
    } else {
      console.log("📝 No custom template set, pre-filling with default")
      // PRE-FILL with default template so owner can edit it
      setCustomXPostTemplate(
        `I just received a drop of {amount} {token} from @FaucetDrops on {network}. Verify Drop 💧: {explorer}`
      )
    }
    
  } catch (error) {
    console.error('❌ Error loading X post template:', error)
    // PRE-FILL with default template even on error
    setCustomXPostTemplate(
      `I just received a drop of {amount} {token} from @FaucetDrops on {network}. Verify Drop 💧: {explorer}`
    )
    toast({
      title: "Could not load custom template",
      description: "Using default share message instead.",
      variant: "default",
    })
  } finally {
    setIsLoadingXTemplate(false)
  }
}

const saveCustomXPostTemplate = async (): Promise<void> => {
  if (!faucetAddress || !address || !chainId) {
    console.warn("Missing required parameters for saving X post template")
    return
  }
  
  // If template is empty or just the default, don't save (will use default on backend)
  if (!customXPostTemplate || !customXPostTemplate.trim()) {
    console.log("💾 Template is empty, will use default")
    return
  }
  
  try {
    console.log(`💾 Saving X post template for faucet: ${faucetAddress}`)
    
    const response = await fetch('https://fauctdrop-backend.onrender.com/faucet-x-template', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        faucetAddress,
        template: customXPostTemplate,
        userAddress: address,
        chainId: Number(chainId)
      }),
    })
    
    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.detail || 'Failed to save X post template')
    }
    
    const result = await response.json()
    console.log('✅ X post template saved:', result)
    
    toast({
      title: "Template Saved",
      description: "Your custom X post template has been saved successfully.",
    })
    
  } catch (error: any) {
    console.error('❌ Error saving X post template:', error)
    toast({
      title: "Failed to Save Template",
      description: error.message || "Could not save X post template. Please try again.",
      variant: "destructive",
    })
    throw error
  }
}

 // ✅ UPDATED: Load social media tasks for ALL faucet types
const loadSocialMediaLinks = async (): Promise<void> => {
  if (!faucetAddress) return
  
  try {
    setIsLoadingSocialLinks(true)
    console.log(`🔍 Loading social media tasks for ${faucetType || 'unknown'} faucet: ${faucetAddress}`)
    
    const response = await fetch(`https://fauctdrop-backend.onrender.com/faucet-tasks/${faucetAddress}`)
    
    if (!response.ok) {
      if (response.status === 404) {
        console.log(`📝 No social media tasks found for ${faucetType || 'unknown'} faucet`)
        setDynamicTasks([])
        return
      }
      throw new Error(`Failed to load social media tasks: ${response.status}`)
    }
    
    const result = await response.json()
    
    if (result.success && result.tasks) {
      // ✅ Convert backend tasks to frontend social media format for ALL faucet types
      const socialLinks = result.tasks.map(task => {
        // Check if task has social media info stored (new format)
        if (task.platform && task.handle && task.action) {
          return {
            platform: task.platform,
            url: task.url,
            handle: task.handle,
            action: task.action
          }
        } else {
          // Extract from title/description for backwards compatibility
          const content = (task.title + ' ' + task.description).toLowerCase()
          let platform = '𝕏' // default
          if (content.includes('telegram')) platform = 'telegram'
          else if (content.includes('discord')) platform = 'discord'
          else if (content.includes('youtube')) platform = 'youtube'
          else if (content.includes('instagram')) platform = 'instagram'
          else if (content.includes('tiktok')) platform = 'tiktok'
          else if (content.includes('facebook')) platform = 'facebook'
          
          // Extract handle from title/description  
          const handleMatch = (task.title + ' ' + task.description).match(/@([a-zA-Z0-9_]+)/)
          const handle = handleMatch ? `@${handleMatch[1]}` : ''
          
          // Extract action from title
          let action = 'follow' // default
          if (task.title.toLowerCase().includes('subscribe')) action = 'subscribe'
          else if (task.title.toLowerCase().includes('join')) action = 'join'
          else if (task.title.toLowerCase().includes('like')) action = 'like'
          else if (task.title.toLowerCase().includes('retweet')) action = 'retweet'
          
          return {
            platform,
            url: task.url,
            handle,
            action
          }
        }
      })
      
      setDynamicTasks(socialLinks)
      console.log(`✅ Loaded ${socialLinks.length} social media tasks for ${faucetType || 'unknown'} faucet`)
    } else {
      setDynamicTasks([])
    }
    
  } catch (error) {
    console.error('❌ Error loading social media tasks:', error)
    setDynamicTasks([])
    toast({
      title: "Warning",
      description: "Could not load social media tasks. Using default verification.",
      variant: "destructive",
    })
  } finally {
    setIsLoadingSocialLinks(false)
  }
}
  const addNewSocialLink = (): void => {
    setNewSocialLinks([...newSocialLinks, {
      platform: '𝕏',
      url: '',
      handle: '',
      action: 'follow'
    }])
  }

  // Function to remove a social media link input
  const removeNewSocialLink = (index: number): void => {
    setNewSocialLinks(newSocialLinks.filter((_, i) => i !== index))
  }

  // Function to update a social media link
  const updateNewSocialLink = (index: number, field: keyof SocialMediaLink, value: string): void => {
    const updated = [...newSocialLinks]
    updated[index] = { ...updated[index], [field]: value }
    setNewSocialLinks(updated)
  }

  // Updated verify all tasks function for dynamic tasks
  const handleVerifyAllTasks = async (): Promise<void> => {
    // Check if all usernames are provided for dynamic tasks
    const missingUsernames = dynamicTasks.filter(task => 
      !usernames[task.platform] || usernames[task.platform].trim().length === 0
    )
    
    if (missingUsernames.length > 0) {
      toast({
        title: "Missing Information",
        description: "Please enter usernames for all required tasks.",
        variant: "destructive",
      })
      return
    }

    setIsVerifying(true)
    setShowVerificationDialog(true)

    // Simulate verification process (3 seconds delay)
    setTimeout(() => {
      // ✅ Set verification states for dynamic tasks
      const newVerificationStates: Record<string, boolean> = {}
      dynamicTasks.forEach(task => {
        newVerificationStates[task.platform] = true
      })
      setVerificationStates(newVerificationStates)
      
      setIsVerifying(false)
      
      toast({
        title: "All Tasks Verified",
        description: "All required tasks have been verified successfully!",
      })
      
      setTimeout(() => {
        setShowVerificationDialog(false)
        setShowFollowDialog(false)
      }, 2000)
    }, 3000)
  }

  const getAllAccountsVerified = (): boolean => {
    if (dynamicTasks.length === 0) return true // No tasks required
    return dynamicTasks.every(task => verificationStates[task.platform])
  }

  // Updated function to check if all usernames are provided
  const getAllUsernamesProvided = (): boolean => {
    if (dynamicTasks.length === 0) return true // No tasks required
    return dynamicTasks.every(task => 
      usernames[task.platform] && usernames[task.platform].trim().length > 0
    )
  }
  
  // ✅ Helper function to get custom claim amount for connected user
  const getUserCustomClaimAmount = async (provider: any, userAddress: string) => {
    if (!faucetType || faucetType !== 'custom' || !userAddress) {
      return { amount: BigInt(0), hasCustom: false }
    }
    
    try {
      // Import the custom claim functions from faucet.ts
      const { FAUCET_ABI_CUSTOM } = await import("@/lib/abis")
      const { Contract } = await import("ethers")
      
      const config = { abi: FAUCET_ABI_CUSTOM }
      const faucetContract = new Contract(faucetAddress, config.abi, provider)
      
      const hasCustom = await faucetContract.hasCustomClaimAmount(userAddress)
      if (hasCustom) {
        const customAmount = await faucetContract.getCustomClaimAmount(userAddress)
        return { amount: customAmount, hasCustom: true }
      }
      
      return { amount: BigInt(0), hasCustom: false }
    } catch (error) {
      console.warn("Error getting custom claim amount:", error)
      return { amount: BigInt(0), hasCustom: false }
    }
  }

  // Updated canClaim logic
  const canClaim = (() => {
    if (!faucetDetails?.isClaimActive || hasClaimed || !getAllAccountsVerified()) {
      return false
    }
    
    // Different validation based on actual faucet type
    switch (faucetType) {
      case 'dropcode':
        // ✅ Dropcode faucets require valid secret code (when in backend mode)
        return backendMode ? isSecretCodeValid : true
      case 'droplist':
        // ✅ Droplist faucets require user to be whitelisted
        return userIsWhitelisted
      case 'custom':
        // ✅ Custom faucets require user to have custom amount allocation
        return hasCustomAmount && userCustomClaimAmount > 0
      default:
        // Fallback for unknown types
        return false
    }
  })()
  
  // ✅ Helper functions with correct type checking based on actual faucet type
  const shouldShowWhitelistTab = (): boolean => faucetType === 'droplist'
  const shouldShowCustomTab = (): boolean => faucetType === 'custom'
  const shouldShowSecretCodeInput = (): boolean => faucetType === 'dropcode' && backendMode
  // ✅ UPDATED: Extended access for drop code button
  const shouldShowSecretCodeButton = (): boolean => faucetType === 'dropcode' && canAccessDropCode

  
  // REPLACE the generateXPostContent function with this FIXED version:
const generateXPostContent = (amount: string, txHash: string | null): string => {
  // If custom template exists, use it
  if (customXPostTemplate && customXPostTemplate.trim()) {
    let content = customXPostTemplate
    
    // Replace placeholders with actual values
    content = content.replace(/\{amount\}/g, amount)
    content = content.replace(/\{token\}/g, tokenSymbol)
    content = content.replace(/\{network\}/g, selectedNetwork?.name || "the network")
    content = content.replace(/\{faucet\}/g, faucetDetails?.name || "this faucet")
    content = content.replace(/\{txHash\}/g, txHash || "Transaction not available")
    content = content.replace(/\{explorer\}/g, 
      txHash 
        ? `${selectedNetwork?.blockExplorerUrls || "https://explorer.unknown"}/tx/${txHash}` // FIXED: use blockExplorerUrls
        : "Transaction not available"
    )
    
    console.log("📱 Using custom X post template:", content)
    return content
  }
  
  // Default template (fallback)
  console.log("📱 Using default X post template")
  return `I just received a drop of ${amount} ${tokenSymbol} from @FaucetDrops on ${selectedNetwork?.name || "the network"}. Verify Drop 💧: ${
    txHash
      ? `${selectedNetwork?.blockExplorerUrls || "https://explorer.unknown"}/tx/${txHash}` // FIXED: use blockExplorerUrls
      : "Transaction not available"
  }`
}

  const calculateFee = (amount: string) => {
    try {
      const parsedAmount = parseUnits(amount, tokenDecimals)
      const fee = (parsedAmount * BigInt(3)) / BigInt(100)
      const netAmount = parsedAmount - fee
      const recommendedInput = (parsedAmount * BigInt(100)) / BigInt(95)
      const recommendedInputStr = Number(formatUnits(recommendedInput, tokenDecimals)).toFixed(3)
      return {
        fee: formatUnits(fee, tokenDecimals),
        netAmount: formatUnits(netAmount, tokenDecimals),
        recommendedInput: recommendedInputStr,
      }
    } catch {
      return { fee: "0", netAmount: "0", recommendedInput: "0" }
    }
  }

  const { fee, netAmount, recommendedInput } = calculateFee(fundAmount)

  const handleFollowAll = (): void => {
    setShowFollowDialog(true)
  }

  
const handleShareOnX = (): void => {
  const claimedAmount = faucetType === 'custom' && hasCustomAmount
    ? formatUnits(userCustomClaimAmount, tokenDecimals)
    : faucetDetails ? formatUnits(faucetDetails.claimAmount, tokenDecimals) : "0"
  const shareText = encodeURIComponent(generateXPostContent(claimedAmount, txHash))
  const shareUrl = `https://x.com/intent/tweet?text=${shareText}`
  window.open(shareUrl, "_blank")
  setShowClaimPopup(false)
}


  const handleCopySecretCode = async (code: string): Promise<void> => {
    try {
      await navigator.clipboard.writeText(code)
      toast({
        title: "Code Copied",
        description: "Drop code has been copied to your clipboard.",
      })
      setShowSecretCodeDialog(false)
      setShowCurrentSecretDialog(false)
    } catch (error) {
      toast({
        title: "Copy Failed",
        description: "Failed to copy the code. Please try again.",
        variant: "destructive",
      })
    }
  }

  // ✅ UPDATED: Enhanced function with extended access control for drop code retrieval
  const handleRetrieveSecretCode = async (): Promise<void> => {
    if (!faucetAddress) {
      toast({
        title: "Error",
        description: "No faucet address available",
        variant: "destructive",
      })
      return
    }
    
    // ✅ Only allow for dropcode faucets
    if (faucetType !== 'dropcode') {
      toast({
        title: "Not Available",
        description: "Secret codes are only available for Drop Code faucets",
        variant: "destructive",
      })
      return
    }
    
    // ✅ UPDATED: Allow owner, admin, or backend address
    if (!canAccessDropCode) {
      toast({
        title: "Unauthorized", 
        description: "Only the faucet owner, admin, or authorized personnel can retrieve the drop code",
        variant: "destructive",
      })
      return
    }

    try {
      setIsRetrievingSecret(true)
      
      console.log(`🔍 Retrieving valid secret code for dropcode faucet: ${faucetAddress}`)
      
      // Get the valid secret code
      const code = await retrieveSecretCode(faucetAddress)
      
      // Additional validation - ensure the code is not empty
      if (!code || code.trim() === '') {
        throw new Error('Retrieved code is empty or invalid')
      }
      
      setSecretCode(code)
      setShowCurrentSecretDialog(true)
      
      // Cache the new valid code
      saveToStorage(`secretCode_${faucetAddress}`, code)
      
      console.log(`✅ Valid secret code retrieved: ${code}`)
      
      toast({
        title: "Valid Drop Code Retrieved! 🎉",
        description: "Fresh valid code retrieved and cached",
      })
      
    } catch (error: any) {
      console.error('❌ Failed to retrieve valid secret code:', error)
      
      let errorMessage = "Unknown error occurred"
      let errorTitle = "Failed to retrieve Drop code"
      
      if (error.message.includes('expired')) {
        errorTitle = "Drop Code Expired"
        errorMessage = "The secret code for this faucet has expired. Please generate a new one."
      } else if (error.message.includes('not yet active')) {
        errorTitle = "Drop Code Not Active"
        errorMessage = "The secret code is not yet active. Please wait for the start time."
      } else if (error.message.includes('not currently valid')) {
        errorTitle = "Drop Code Invalid"
        errorMessage = "The secret code is not currently valid. Please check the timing."
      } else if (error.message.includes('No secret code found')) {
        errorTitle = "No Drop Code Found"
        errorMessage = "No secret code exists for this faucet. Please generate one first."
      } else if (error.message.includes('404')) {
        errorTitle = "Drop Code Not Found"
        errorMessage = "No secret code found for this faucet address."
      } else {
        errorMessage = error.message || "Failed to retrieve the drop code"
      }
      
      toast({
        title: errorTitle,
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setIsRetrievingSecret(false)
    }
  }

  const handleUpdateFaucetName = async (): Promise<void> => {
    if (!isConnected || !provider || !newFaucetName.trim() || !chainId) {
      toast({
        title: "Invalid Input",
        description: "Please connect your wallet, ensure a network is selected, and enter a valid name",
        variant: "destructive",
      })
      return
    }
    if (!checkNetwork()) return
    try {
      setIsUpdatingName(true)
      await updateFaucetName(
        provider as BrowserProvider,
        faucetAddress,
        newFaucetName,
        BigInt(chainId),
        BigInt(Number(networkId)),
        faucetType || undefined,
      )
      toast({
        title: "Faucet name updated",
        description: `Faucet name has been updated to ${newFaucetName}`,
      })
      setNewFaucetName("")
      setShowEditNameDialog(false)
      await loadFaucetDetails()
    } catch (error: any) {
      console.error("Error updating faucet name:", error)
      toast({
        title: "Failed to update faucet name",
        description: error.message || "Unknown error occurred",
        variant: "destructive",
      })
    } finally {
      setIsUpdatingName(false)
    }
  }

  const handleDeleteFaucet = async (): Promise<void> => {
    if (!isConnected || !provider || !chainId) {
      toast({
        title: "Invalid Input",
        description: "Please connect your wallet and ensure a network is selected",
        variant: "destructive",
      })
      return
    }
    if (!checkNetwork()) return
    try {
      setIsDeletingFaucet(true)
      await deleteFaucet(
        provider as BrowserProvider, 
        faucetAddress, 
        BigInt(chainId), 
        BigInt(Number(networkId)),
        faucetType || undefined
      )
      toast({
        title: "Faucet deleted",
        description: "Faucet has been successfully deleted",
      })
      setShowDeleteDialog(false)
      router.push("/")
    } catch (error: any) {
      console.error("Error deleting faucet:", error)
      toast({
        title: "Failed to delete faucet",
        description: error.message || "Unknown error occurred",
        variant: "destructive",
      })
    } finally {
      setIsDeletingFaucet(false)
    }
  }

  const handleManageAdmin = async (): Promise<void> => {
    if (!isConnected || !provider || !newAdminAddress.trim() || !chainId) {
      toast({
        title: "Invalid Input",
        description: "Please connect your wallet, ensure a network is selected, and enter a valid address",
        variant: "destructive",
      })
      return
    }
    if (!checkNetwork()) return

    // Check if trying to add/remove the owner
    if (newAdminAddress.toLowerCase() === faucetDetails?.owner.toLowerCase()) {
      toast({
        title: "Cannot modify owner",
        description: "The faucet owner cannot be added or removed as an admin",
        variant: "destructive",
      })
      return
    }

    // Check if trying to add/remove the factory owner
    if (newAdminAddress.toLowerCase() === FACTORY_OWNER_ADDRESS.toLowerCase()) {
      toast({
        title: "Cannot modify factory owner",
        description: "The factory owner cannot be added or removed as an admin",
        variant: "destructive",
      })
      return
    }

    try {
      setIsManagingAdmin(true)
      if (isAddingAdmin) {
        await addAdmin(
          provider as BrowserProvider,
          faucetAddress,
          newAdminAddress,
          BigInt(chainId),
          BigInt(Number(networkId)),
          faucetType || undefined,
        )
        toast({
          title: "Admin added",
          description: `Address ${newAdminAddress} has been added as an admin`,
        })
        // Update admin list by adding the new admin
        setAdminList((prev) => [...prev, newAdminAddress])
      } else {
        await removeAdmin(
          provider as BrowserProvider,
          faucetAddress,
          newAdminAddress,
          BigInt(chainId),
          BigInt(Number(networkId)),
          faucetType || undefined,
        )
        toast({
          title: "Admin removed",
          description: `Address ${newAdminAddress} has been removed as an admin`,
        })
        // Update admin list by removing the admin
        setAdminList((prev) => prev.filter((admin) => admin.toLowerCase() !== newAdminAddress.toLowerCase()))
      }
      setNewAdminAddress("")
      setShowAddAdminDialog(false)
      await loadFaucetDetails()
    } catch (error: any) {
      console.error("Error managing admin:", error)
      toast({
        title: `Failed to ${isAddingAdmin ? "add" : "remove"} admin`,
        description: error.message || "Unknown error occurred",
        variant: "destructive",
      })
    } finally {
      setIsManagingAdmin(false)
    }
  }

  const checkAdminStatus = (inputAddress: string): void => {
    if (!inputAddress.trim()) {
      setIsAddingAdmin(true)
      return
    }
    // Check against the admin list (which now includes owner but excludes factory owner)
    const isAdmin = adminList.some((admin) => admin.toLowerCase() === inputAddress.toLowerCase())
    setIsAddingAdmin(!isAdmin)
  }

  const loadTransactionHistory = async (): Promise<void> => {
    if (!isConnected || !provider || !chainId || !selectedNetwork) {
      return
    }
    if (!canAccessAdminControls) {
      return
    }
    try {
      const txs = await getFaucetTransactionHistory(
        provider as BrowserProvider,
        faucetAddress,
        selectedNetwork,
        faucetType || undefined,
      )
      const sortedTxs = txs.sort((a, b) => b.timestamp - a.timestamp)
      setTransactions(sortedTxs)
    } catch (error: any) {
      console.error("Error loading Activity Log:", error)
      toast({
        title: "Failed to load Activity Log",
        description: error.message || "Unknown error occurred",
        variant: "destructive",
      })
    }
  }

  useEffect(() => {
    if (!faucetDetails) return
    const updateCountdown = () => {
      const now = Date.now()
      const start = Number(faucetDetails.startTime) * 1000
      const end = Number(faucetDetails.endTime) * 1000
      if (start > now) {
        const diff = start - now
        const days = Math.floor(diff / (1000 * 60 * 60 * 24))
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
        const seconds = Math.floor((diff % (1000 * 60)) / 1000)
        setStartCountdown(`${days}d ${hours}h ${minutes}m ${seconds}s until active`)
      } else {
        setStartCountdown("Already Active")
      }
      if (end > now && faucetDetails.isClaimActive) {
        const diff = end - now
        const days = Math.floor(diff / (1000 * 60 * 60 * 24))
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
        const seconds = Math.floor((diff % (1000 * 60)) / 1000)
        setEndCountdown(`${days}d ${hours}h ${minutes}m ${seconds}s until inactive`)
      } else if (end > 0 && end <= now) {
        setEndCountdown("Ended")
      } else {
        setEndCountdown("N/A")
      }
    }
    updateCountdown()
    const interval = setInterval(updateCountdown, 1000)
    return () => clearInterval(interval)
  }, [faucetDetails])

  // ✅ Refresh custom claim amounts when address changes or faucet type is detected
  useEffect(() => {
    if (address && faucetType === 'custom' && faucetDetails) {
      const refreshCustomAmount = async () => {
        const detailsProvider = new JsonRpcProvider(selectedNetwork?.rpcUrl || networks[0]?.rpcUrl)
        const customClaimInfo = await getUserCustomClaimAmount(detailsProvider, address)
        setUserCustomClaimAmount(customClaimInfo.amount)
        setHasCustomAmount(customClaimInfo.hasCustom)
      }
      refreshCustomAmount()
    }
  }, [address, faucetType, faucetDetails])

  useEffect(() => {
    if (canAccessAdminControls && provider && faucetAddress && selectedNetwork) {
      loadTransactionHistory()
    }
  }, [canAccessAdminControls, provider, faucetAddress, selectedNetwork])

  // ✅ Helper functions for admin popup preferences
  const saveAdminPopupPreference = async (userAddr: string, faucetAddr: string, dontShow: boolean): Promise<boolean> => {
    try {
      const response = await fetch("https://fauctdrop-backend.onrender.com/admin-popup-preference", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userAddress: userAddr,
          faucetAddress: faucetAddr,
          dontShowAgain: dontShow,
        }),
      })
      
      if (!response.ok) {
        throw new Error(`Failed to save preference: ${response.status}`)
      }
      
      const result = await response.json()
      console.log("✅ Admin popup preference saved:", result)
      return result.success
    } catch (error) {
      console.error("❌ Error saving admin popup preference:", error)
      return false
    }
  }

  // ✅ FIXED: Direct faucet type detection using the faucetType() function
  const detectFaucetType = async (provider: any, address: string): Promise<FaucetType> => {
    const { Contract } = await import("ethers")
    
    try {
      console.log("🔍 Getting faucet type directly from contract:", address)
      
      // ✅ Use a basic ABI with just the faucetType function
      const basicABI = [
        {
          "inputs": [],
          "name": "faucetType",
          "outputs": [
            {
              "internalType": "string", 
              "name": "",
              "type": "string"
            }
          ],
          "stateMutability": "view",
          "type": "function"
        }
      ]
      
      const contract = new Contract(address, basicABI, provider)
      
      // ✅ Call faucetType() directly from the contract
      const contractType = await contract.faucetType()
      console.log("✅ Contract returned faucet type:", contractType)
      
      // ✅ Map the contract response to our internal types
      switch (contractType.toLowerCase()) {
        case 'dropcode':
          return 'dropcode'
        case 'droplist':
          return 'droplist'  
        case 'custom':
          return 'custom'
        default:
          console.warn("⚠️ Unknown faucet type from contract:", contractType, "defaulting to dropcode")
          return 'dropcode'
      }
      
    } catch (error) {
      console.error("❌ Error getting faucet type from contract:", error)
      // ✅ Fallback to the old detection method if faucetType() fails
      return await fallbackTypeDetection(provider, address)
    }
  }

  // ✅ Fallback detection method (kept as backup)
  const fallbackTypeDetection = async (provider: any, address: string): Promise<FaucetType> => {
    const { Contract } = await import("ethers")
    
    try {
      console.log("🔄 Using fallback detection method")
      
      // Import all ABIs
      const { FAUCET_ABI_DROPCODE, FAUCET_ABI_DROPLIST, FAUCET_ABI_CUSTOM } = await import("@/lib/abis")
      
      // Test for droplist-specific functions first
      try {
        const droplistContract = new Contract(address, FAUCET_ABI_DROPLIST, provider)
        await droplistContract.whitelist.staticCall("0x0000000000000000000000000000000000000000")
        console.log("✅ Droplist function exists - this is a DROPLIST faucet")
        return 'droplist'
      } catch (error) {
        console.log("❌ No whitelist function - not droplist")
      }
      
      // Test for custom-specific functions
      try {
        const customContract = new Contract(address, FAUCET_ABI_CUSTOM, provider)
        await customContract.hasCustomClaimAmount.staticCall("0x0000000000000000000000000000000000000000")
        console.log("✅ Custom function exists - this is a CUSTOM faucet")
        return 'custom'
      } catch (error) {
        console.log("❌ No custom functions - not custom")
      }
      
      // Default to dropcode
      console.log("✅ Defaulting to DROPCODE")
      return 'dropcode'
      
    } catch (error) {
      console.error("❌ Fallback detection failed:", error)
      return 'dropcode'
    }
  }

  // ✅ FIXED: Updated loadFaucetDetails function with proper network handling
  const loadFaucetDetails = useCallback(async (): Promise<void> => {
  if (!faucetAddress || !networkId) {
    toast({
      title: "Invalid Parameters",
      description: "Faucet address or network ID is missing",
      variant: "destructive",
    })
    setLoading(false)
    return
  }
  
  try {
    setLoading(true)
    
    const targetNetworkId = Number(networkId)
    const targetNetwork = networks.find((n) => n.chainId === targetNetworkId)
    
    if (!targetNetwork) {
      toast({
        title: "Network Not Found", 
        description: `Network ID ${networkId} is not supported`,
        variant: "destructive",
      })
      setLoading(false)
      router.push("/")
      return
    }
    
    console.log(`🌐 Loading faucet details for network: ${targetNetwork.name}`)
    setSelectedNetwork(targetNetwork)
    
    const detailsProvider = new JsonRpcProvider(targetNetwork.rpcUrl)
    
    // ... rest of your loadFaucetDetails code ...
    
  } catch (error) {
    console.error(`❌ Error loading faucet details:`, error)
    toast({
      title: "Failed to load faucet details",
      description: error instanceof Error ? error.message : "Unknown error occurred",
      variant: "destructive",
    })
  } finally {
    setLoading(false)
  }
}, [faucetAddress, networkId, networks, router, toast])   
useEffect(() => {
  // Reload when address changes (for whitelist/admin status)
  if (address && faucetDetails && !loading) {
    console.log('👤 Address changed, refreshing status...')
    loadFaucetDetails()
  }
}, [address]) 
useEffect(() => {
  // Only load if we have required params
  if (faucetAddress && networkId) {
    console.log('📥 Loading faucet details...', { faucetAddress, networkId })
    loadFaucetDetails()
  }
}, [faucetAddress, networkId, loadFaucetDetails])

  const getAdminPopupPreference = async (userAddr: string, faucetAddr: string): Promise<boolean> => {
    try {
      const response = await fetch(
        `https://fauctdrop-backend.onrender.com/admin-popup-preference?userAddress=${encodeURIComponent(userAddr)}&faucetAddress=${encodeURIComponent(faucetAddr)}`
      )
      
      if (!response.ok) {
        console.warn("Failed to get admin popup preference, defaulting to show")
        return false
      }
      
      const result = await response.json()
      console.log("✅ Admin popup preference retrieved:", result)
      return result.dontShowAgain || false
    } catch (error) {
      console.error("❌ Error getting admin popup preference:", error)
      return false // Default to showing popup on error
    }
  }

  const checkNetwork = (): boolean => {
    if (!chainId) {
      toast({
        title: "Network not detected",
        description: "Please ensure your wallet is connected to a supported network",
        variant: "destructive",
      })
      return false
    }
    if (networkId && Number(networkId) !== chainId) {
      const targetNetwork = networks.find((n) => n.chainId === Number(networkId))
      if (targetNetwork) {
        toast({
          title: "Wrong Network",
          description: "Switch to the network to perform operation",
          variant: "destructive",
          action: (
            <Button
              onClick={() => setNetwork(targetNetwork)}
              variant="outline"
              className="text-xs sm:text-sm hover:bg-accent hover:text-accent-foreground"
            >
              Switch to {targetNetwork.name}
            </Button>
          ),
        })
        return false
      }
    }
    return true
  }

  // ✅ FIXED: Handle backend claim with proper faucet type validation
  async function handleBackendClaim(): Promise<void> {
  if (!isConnected || !address || !provider) {
    toast({
      title: "Wallet not connected",
      description: "Please connect your wallet to drop tokens",
      variant: "destructive",
    });
    return;
  }

  if (!chainId || !networkId) {
    toast({
      title: "Network not detected",
      description: "Please ensure your wallet is connected to a supported network",
      variant: "destructive",
    });
    return;
  }

  // Validation based on faucet type
  if (faucetType === 'dropcode' && backendMode && !isSecretCodeValid) {
    toast({
      title: "Invalid Drop code",
      description: "Please enter a valid 6-character alphanumeric Drop code",
      variant: "destructive",
    });
    return;
  }

  if (faucetType === 'droplist' && !userIsWhitelisted) {
    toast({
      title: "Not Drop-listed",
      description: "You are not Drop-listed to claim from this faucet",
      variant: "destructive",
    });
    return;
  }

  if (faucetType === 'custom' && !hasCustomAmount) {
    toast({
      title: "No Custom Allocation",
      description: "You don't have a custom amount allocated for this faucet",
      variant: "destructive",
    });
    return;
  }

  if (!allAccountsVerified) {
    toast({
      title: "Verification Required",
      description: "Please complete and verify all required tasks before claiming",
      variant: "destructive",
    });
    return;
  }

  if (!checkNetwork()) return;

  try {
    setIsClaiming(true);
    if (!window.ethereum) {
      throw new Error("Wallet not detected. Please install MetaMask or another Ethereum wallet.");
    }
    await window.ethereum.request({ method: "eth_requestAccounts" });
    console.log("Sending drop request", {
      faucetType,
      backendMode,
      secretCode: (faucetType === 'dropcode' && backendMode) ? secretCode : "N/A",
    });

    // Perform the claim based on faucet type
    const result = faucetType === 'custom'
      ? await claimCustomViaBackend(address, faucetAddress, provider as BrowserProvider)
      : (faucetType === 'dropcode' && backendMode)
      ? await claimViaBackend(address, faucetAddress, provider as BrowserProvider, secretCode)
      : await claimNoCodeViaBackend(address, faucetAddress, provider as BrowserProvider);

    const formattedTxHash = result.txHash.startsWith("0x") ? result.txHash : (`0x${result.txHash}` as `0x${string}`);
    setTxHash(formattedTxHash);
    const networkName = selectedNetwork?.name || "Unknown Network";

    // Get the claimed amount for on-chain storage
    const claimAmountBN = faucetType === 'custom' && hasCustomAmount
      ? userCustomClaimAmount
      : faucetDetails.claimAmount || 0n;

    // Store the claim on-chain using the updated storeClaim function
    await storeClaim(
      provider as BrowserProvider,
      address,
      faucetAddress,
      claimAmountBN,
      formattedTxHash,
      chainId,
      Number(networkId),
      networkName
    );

    // Get the claimed amount for display
    const claimedAmount = faucetType === 'custom' && hasCustomAmount
      ? formatUnits(userCustomClaimAmount, tokenDecimals)
      : faucetDetails.claimAmount
      ? formatUnits(faucetDetails.claimAmount, tokenDecimals)
      : "tokens";

    toast({
      title: "Tokens dropped successfully",
      description: `You have dropped ${claimedAmount} ${tokenSymbol} on ${networkName} and recorded the claim on-chain`,
    });
    setShowClaimPopup(true);
    setSecretCode("");
    await loadFaucetDetails();
    await loadTransactionHistory();
  } catch (error: any) {
    console.error("Error dropping tokens:", error);
    let errorMessage = error.reason || error.message || "Unknown error occurred";
    if (errorMessage.includes("Unauthorized: Invalid Drop code")) {
      errorMessage = "Invalid Drop code. Please check and try again.";
    } else if (errorMessage.includes("Network changed during transaction")) {
      errorMessage = "Network changed during transaction. Please try again with a stable network connection.";
    } else if (errorMessage.includes("Invalid transaction hash format")) {
      errorMessage = "Invalid transaction hash format. Please try again.";
    }
    toast({
      title: "Failed to drop tokens",
      description: errorMessage,
      variant: "destructive",
    });
  } finally {
    setIsClaiming(false);
  }
}

  const handleGenerateNewDropCode = async (): Promise<void> => {
  if (!isConnected || !address || !chainId) {
    toast({
      title: "Wallet not connected",
      description: "Please connect your wallet and ensure a network is selected",
      variant: "destructive",
    })
    return
  }
  
  if (faucetType !== 'dropcode') {
    toast({
      title: "Not Available",
      description: "This feature is only available for Drop Code faucets",
      variant: "destructive",
    })
    return
  }
  
  if (!canAccessDropCode) {
    toast({
      title: "Unauthorized", 
      description: "Only the faucet owner, admin, or authorized personnel can generate new drop codes",
      variant: "destructive",
    })
    return
  }

  try {
    setIsGeneratingNewCode(true)
    
    console.log(`🔄 Generating new drop code for faucet: ${faucetAddress}`)
    
    const response = await fetch("https://fauctdrop-backend.onrender.com/generate-new-drop-code", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        faucetAddress,
        userAddress: address,
        chainId: Number(chainId)
      }),
    })
    
    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.detail || "Failed to generate new drop code")
    }
    
    const result = await response.json()
    const newCode = result.secretCode
    
    // Cache the new code and invalidate old cache
    saveToStorage(`secretCode_${faucetAddress}`, newCode)
    
    // Clear any cached secret code data to force fresh retrieval
    try {
      localStorage.removeItem(`secretCode_${faucetAddress}_cached`)
      localStorage.removeItem(`secretCodeData_${faucetAddress}`)
    } catch (e) {
      console.warn('Could not clear localStorage cache:', e)
    }
    
    setNewlyGeneratedCode(newCode)
    setShowNewCodeDialog(true)
    
    console.log(`✅ New drop code generated: ${newCode}`)
    
    toast({
      title: "New Drop Code Generated! 🎉",
      description: "A fresh drop code has been generated and is now active",
    })
    
  } catch (error: any) {
    console.error('❌ Failed to generate new drop code:', error)
    
    let errorMessage = "Unknown error occurred"
    let errorTitle = "Failed to generate Drop code"
    
    if (error.message.includes('403')) {
      errorTitle = "Unauthorized"
      errorMessage = "Only authorized users can generate new drop codes"
    } else if (error.message.includes('404')) {
      errorTitle = "Faucet Not Found"
      errorMessage = "The specified faucet could not be found"
    } else {
      errorMessage = error.message || "Failed to generate the new drop code"
    }
    
    toast({
      title: errorTitle,
      description: errorMessage,
      variant: "destructive",
    })
  } finally {
    setIsGeneratingNewCode(false)
  }
}

  const handleFund = async (): Promise<void> => {
    if (!isConnected || !provider || !fundAmount || !chainId) {
      toast({
        title: "Invalid Input",
        description: "Please connect your wallet, ensure a network is selected, and enter a valid amount",
        variant: "destructive",
      })
      return
    }
    setAdjustedFundAmount(fundAmount)
    setShowFundPopup(true)
  }

  const confirmFund = async (): Promise<void> => {
    if (!isConnected || !provider || !adjustedFundAmount || !chainId) {
      toast({
        title: "Invalid Input",
        description: "Please connect your wallet, ensure a network is selected, and enter a valid amount",
        variant: "destructive",
      })
      return
    }
    if (!checkNetwork()) return
    try {
      setIsFunding(true)
      const amount = parseUnits(adjustedFundAmount, tokenDecimals)
      await fundFaucet(
        provider as BrowserProvider,
        faucetAddress,
        amount,
        faucetDetails.isEther,
        BigInt(chainId),
        BigInt(Number(networkId)),
        faucetType || undefined,
      )
      toast({
        title: "Faucet funded successfully",
        description: `You have added ${formatUnits(amount, tokenDecimals)} ${tokenSymbol} to the faucet (minus 3% platform fee)`,
      })
      setFundAmount("")
      setAdjustedFundAmount("")
      setShowFundPopup(false)
      await loadFaucetDetails()
      await loadTransactionHistory()
    } catch (error: any) {
      console.error("Error funding faucet:", error)
      if (error.message === "Switch to the network to perform operation") {
        checkNetwork()
      } else {
        toast({
          title: "Failed to fund faucet",
          description: error.message || "Unknown error occurred",
          variant: "destructive",
        })
      }
    } finally {
      setIsFunding(false)
    }
  }

  const handleWithdraw = async (): Promise<void> => {
    if (!isConnected || !provider || !withdrawAmount || !chainId) {
      toast({
        title: "Invalid Input",
        description: "Please connect your wallet, ensure a network is selected, and enter a valid amount",
        variant: "destructive",
      })
      return
    }
    if (!checkNetwork()) return
    try {
      setIsWithdrawing(true)
      const amount = parseUnits(withdrawAmount, tokenDecimals)
      await withdrawTokens(
        provider as BrowserProvider,
        faucetAddress,
        amount,
        BigInt(chainId),
        BigInt(Number(networkId)),
        faucetType || undefined,
      )
      toast({
        title: "Tokens withdrawn successfully",
        description: `You have withdrawn ${withdrawAmount} ${tokenSymbol} from the faucet`,
      })
      setWithdrawAmount("")
      await loadFaucetDetails()
      await loadTransactionHistory()
    } catch (error: any) {
      console.error("Error withdrawing tokens:", error)
      if (error.message === "Switch to the network to perform operation") {
        checkNetwork()
      } else {
        toast({
          title: "Failed to withdraw tokens",
          description: error.message || "Unknown error occurred",
          variant: "destructive",
        })
      }
    } finally {
      setIsWithdrawing(false)
    }
  }

// ✅ UPDATED: handleUpdateClaimParameters for ALL faucet types
const handleUpdateClaimParameters = async (): Promise<void> => {
  if (!isConnected || !provider || !chainId) {
    toast({
      title: "Wallet not connected",
      description: "Please connect your wallet and ensure a network is selected",
      variant: "destructive",
    })
    return
  }
  
  // For custom faucets, claimAmount is not required, but for others it is
  if (faucetType !== 'custom' && !claimAmount) {
    toast({
      title: "Invalid Input",
      description: "Please fill in the drop amount",
      variant: "destructive",
    })
    return
  }
  
  if (!startTime || !endTime) {
    toast({
      title: "Invalid Input",
      description: "Please fill in the start and end times",
      variant: "destructive",
    })
    return
  }
  
  if (startTimeError) {
    toast({
      title: "Invalid Start Time",
      description: startTimeError,
      variant: "destructive",
    })
    return
  }
  
  if (!checkNetwork()) return

  try {
    setIsUpdatingParameters(true)
    
    // For custom faucets, use 0 as claim amount since individual amounts are set separately
    const claimAmountBN = faucetType === 'custom' ? BigInt(0) : parseUnits(claimAmount, tokenDecimals)
    const startTimestamp = Math.floor(new Date(startTime).getTime() / 1000)
    const endTimestamp = Math.floor(new Date(endTime).getTime() / 1000)
    
    let secretCodeFromBackend = ""
    
    // Prepare social media tasks for ALL faucet types
    const tasksToSend = newSocialLinks.filter(link => 
      link.url.trim() && link.handle.trim()
    ).map(link => ({
      title: `${link.action.charAt(0).toUpperCase() + link.action.slice(1)} ${link.handle}`,
      description: `${link.action.charAt(0).toUpperCase() + link.action.slice(1)} our ${link.platform} account: ${link.handle}`,
      url: link.url.trim(),
      required: true,
      platform: link.platform,
      handle: link.handle,
      action: link.action
    }))
    
    console.log(`📋 Preparing to send ${tasksToSend.length} social media tasks for ${faucetType} faucet`)
    
    // Handle backend communication for ALL faucet types
    if (faucetType === 'dropcode' && backendMode) {
      // Dropcode faucets in backend mode - generates secret code + stores tasks
      console.log("🔐 Dropcode faucet - generating secret code and storing tasks")
      
      const response = await fetch("https://fauctdrop-backend.onrender.com/set-claim-parameters", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          faucetAddress,
          claimAmount: claimAmountBN.toString(),
          startTime: startTimestamp,
          endTime: endTimestamp,
          chainId: Number(chainId),
          tasks: tasksToSend
        }),
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.detail || "Failed to set drop parameters")
      }
      
      const result = await response.json()
      secretCodeFromBackend = result.secretCode
      
      console.log(`✅ Dropcode: Secret code generated, ${result.tasksStored || 0} tasks stored`)
      
    } else {
      // For ALL other faucet types (droplist, custom, dropcode in manual mode)
      console.log(`📝 ${faucetType} faucet - storing tasks via add-faucet-tasks endpoint`)
      
      if (tasksToSend.length > 0) {
        try {
          const response = await fetch("https://fauctdrop-backend.onrender.com/add-faucet-tasks", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              faucetAddress,
              tasks: tasksToSend,
              userAddress: address,
              chainId: Number(chainId)
            }),
          })
          
          if (response.ok) {
            const result = await response.json()
            console.log(`✅ ${faucetType}: ${result.tasksAdded || 0} tasks stored successfully`)
          } else {
            const errorData = await response.json()
            console.warn(`⚠️ Failed to store tasks for ${faucetType} faucet:`, errorData.detail)
          }
        } catch (taskError) {
          console.warn(`⚠️ Task storage failed for ${faucetType} faucet:`, taskError.message)
        }
      }
    }

    // Save custom X post template only if it's been modified from default
if (customXPostTemplate && customXPostTemplate.trim()) {
  const defaultTemplate = `I just received a drop of {amount} {token} from @FaucetDrops on {network}. Verify Drop 💧: {explorer}`
  
  // Only save if it's different from the default
  if (customXPostTemplate !== defaultTemplate) {
    try {
      console.log("💾 Saving custom X post template...")
      await saveCustomXPostTemplate()
    } catch (templateError) {
      console.warn("⚠️ Failed to save X post template, continuing with parameter update:", templateError)
      // Don't fail the entire operation if template save fails
    }
  } else {
    console.log("📝 Template is default, not saving")
  }
}

    // Continue with blockchain transaction for ALL faucet types
    await setClaimParameters(
      provider as BrowserProvider,
      faucetAddress,
      claimAmountBN,
      startTimestamp,
      endTimestamp,
      BigInt(chainId),
      BigInt(Number(networkId)),
      faucetType || undefined,
    )

    // Handle secret code display only for dropcode faucets
    if (faucetType === 'dropcode' && backendMode && secretCodeFromBackend) {
      saveToStorage(`secretCode_${faucetAddress}`, secretCodeFromBackend)
      setGeneratedSecretCode(secretCodeFromBackend)
      setShowSecretCodeDialog(true)
    }

    // Success message for ALL faucet types
    const taskMessage = tasksToSend.length > 0 ? `${tasksToSend.length} social media tasks saved. ` : ""
    const secretMessage = faucetType === 'dropcode' && backendMode ? "Drop code generated and stored. " : ""
    const templateMessage = customXPostTemplate && customXPostTemplate.trim() ? "Custom X post template saved. " : ""
    
    toast({
      title: "Drop parameters updated",
      description: `Parameters updated successfully. ${taskMessage}${secretMessage}${templateMessage}`,
    })
    
    // Clear the new social links after successful save
    setNewSocialLinks([])
    
    await loadFaucetDetails()
    await loadSocialMediaLinks()
    await loadCustomXPostTemplate() // Reload the template to confirm save
    await loadTransactionHistory()
    
  } catch (error: any) {
    console.error("Error updating drop parameters:", error)
    if (error.message === "Switch to the network to perform operation") {
      checkNetwork()
    } else {
      toast({
        title: "Failed to update drop parameters",
        description: error.message || "Unknown error occurred",
        variant: "destructive",
      })
    }
  } finally {
    setIsUpdatingParameters(false)
  }
}

  // Load social media links when component mounts
  useEffect(() => {
    if (faucetAddress) {
      loadSocialMediaLinks()
    }
  }, [faucetAddress])

  // ✅ Handle whitelist update (only for droplist faucets)
  const handleUpdateWhitelist = async (): Promise<void> => {
    if (!isConnected || !provider || !whitelistAddresses.trim() || !chainId) {
      toast({
        title: "Invalid Input",
        description: "Please connect your wallet, ensure a network is selected, and enter valid addresses",
        variant: "destructive",
      })
      return
    }
    if (!checkNetwork()) return
    try {
      setIsUpdatingWhitelist(true)
      const addresses = whitelistAddresses
        .split(/[\n,]/)
        .map((addr) => addr.trim())
        .filter((addr) => addr.length > 0)
      if (addresses.length === 0) return
      await setWhitelistBatch(
        provider as BrowserProvider,
        faucetAddress,
        addresses,
        isWhitelistEnabled,
        BigInt(chainId),
        BigInt(Number(networkId)),
        faucetType || undefined,
      )
      toast({
        title: "Drop-list updated",
        description: `${addresses.length} addresses have been ${isWhitelistEnabled ? "added to" : "removed from"} the Drop-list`,
      })
      setWhitelistAddresses("")
      await loadFaucetDetails()
      await loadTransactionHistory()
    } catch (error: any) {
      console.error("Error updating Drop-list:", error)
      toast({
        title: "Failed to update Drop-list",
        description: error.message || "Unknown error occurred",
        variant: "destructive",
      })
    } finally {
      setIsUpdatingWhitelist(false)
    }
  }

  const handleCustomClaimFile = async (event: React.ChangeEvent<HTMLInputElement>): Promise<void> => {
    const file = event.target.files?.[0]
    if (!file) return
    
    // Check file type
    const fileName = file.name.toLowerCase()
    
    if (!fileName.endsWith('.csv') && !fileName.endsWith('.pdf') && !fileName.endsWith('.txt')) {
      toast({
        title: "Invalid File Type",
        description: "Please select a CSV, PDF, or TXT file",
        variant: "destructive",
      })
      return
    }
    
    setCustomClaimFile(file)
  }

  const parseAddressesAndAmounts = (text: string) => {
    const users: string[] = []
    const amounts: bigint[] = []
    const errors: string[] = []
    
    // First try to parse as CSV
    if (text.includes(',') || text.includes('\t')) {
      try {
        const lines = text.split('\n').filter(line => line.trim())
        let hasHeaders = false
        
        // Check if first line looks like headers
        const firstLine = lines[0]?.toLowerCase()
        if (firstLine && (firstLine.includes('address') || firstLine.includes('amount') || firstLine.includes('wallet'))) {
          hasHeaders = true
        }
        
        const dataLines = hasHeaders ? lines.slice(1) : lines
        
        dataLines.forEach((line, index) => {
          const lineNumber = hasHeaders ? index + 2 : index + 1
          const parts = line.split(/[,\t]/).map(s => s.trim().replace(/"/g, ''))
          
          if (parts.length >= 2) {
            const [addressPart, amountPart] = parts
            
            // Validate address format
            if (!addressPart.startsWith('0x') || addressPart.length !== 42) {
              errors.push(`Line ${lineNumber}: Invalid address format "${addressPart}"`)
              return
            }
            
            // Parse amount
            try {
              const amount = parseFloat(amountPart)
              if (isNaN(amount) || amount <= 0) {
                errors.push(`Line ${lineNumber}: Invalid amount "${amountPart}"`)
                return
              }
              
              users.push(addressPart)
              amounts.push(parseUnits(amount.toString(), tokenDecimals))
            } catch (error) {
              errors.push(`Line ${lineNumber}: Could not parse amount "${amountPart}"`)
            }
          } else {
            errors.push(`Line ${lineNumber}: Invalid format - expected address,amount`)
          }
        })
      } catch (error) {
        errors.push(`CSV parsing error: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    } else {
      // Try to parse as plain text with various formats
      const lines = text.split('\n').filter(line => line.trim())
      
      lines.forEach((line, index) => {
        const lineNumber = index + 1
        line = line.trim()
        
        // Skip empty lines and potential headers
        if (!line || line.toLowerCase().includes('address') || line.toLowerCase().includes('wallet')) {
          return
        }
        
        // Try different separators: comma, tab, space, pipe
        const separators = [',', '\t', '|', ' ']
        let parts: string[] = []
        
        for (const sep of separators) {
          const testParts = line.split(sep).map(s => s.trim()).filter(s => s)
          if (testParts.length >= 2) {
            parts = testParts
            break
          }
        }
        
        if (parts.length >= 2) {
          const addressPart = parts[0].replace(/"/g, '')
          const amountPart = parts[1].replace(/"/g, '')
          
          // Validate address
          if (!addressPart.startsWith('0x') || addressPart.length !== 42) {
            errors.push(`Line ${lineNumber}: Invalid address format "${addressPart}"`)
            return
          }
          
          // Parse amount
          try {
            const amount = parseFloat(amountPart)
            if (isNaN(amount) || amount <= 0) {
              errors.push(`Line ${lineNumber}: Invalid amount "${amountPart}"`)
              return
            }
            
            users.push(addressPart)
            amounts.push(parseUnits(amount.toString(), tokenDecimals))
          } catch (error) {
            errors.push(`Line ${lineNumber}: Could not parse amount "${amountPart}"`)
          }
        } else {
          // Try to extract addresses and amounts using regex
          const addressRegex = /0x[a-fA-F0-9]{40}/g
          const amountRegex = /\d+\.?\d*/g
          
          const addressMatches = line.match(addressRegex)
          const amountMatches = line.match(amountRegex)
          
          if (addressMatches && amountMatches && addressMatches.length > 0 && amountMatches.length > 0) {
            try {
              const amount = parseFloat(amountMatches[0])
              if (!isNaN(amount) && amount > 0) {
                users.push(addressMatches[0])
                amounts.push(parseUnits(amount.toString(), tokenDecimals))
              } else {
                errors.push(`Line ${lineNumber}: Invalid amount "${amountMatches[0]}"`)
              }
            } catch (error) {
              errors.push(`Line ${lineNumber}: Could not parse extracted amount`)
            }
          } else {
            errors.push(`Line ${lineNumber}: Could not extract address and amount from "${line}"`)
          }
        }
      })
    }
    
    return { users, amounts, errors }
  }

  // ✅ Handle custom claims upload (only for custom faucets)
  const handleUploadCustomClaims = async (): Promise<void> => {
    if (!customClaimFile || !isConnected || !provider || !chainId) {
      toast({
        title: "Invalid Input",
        description: "Please select a file and ensure your wallet is connected",
        variant: "destructive",
      })
      return
    }
    if (!checkNetwork()) return
    
    try {
      setIsUploadingCustomClaims(true)
      let text = ""
      
      const fileName = customClaimFile.name.toLowerCase()
      
      if (fileName.endsWith('.pdf')) {
        // Handle PDF files
        try {
          const arrayBuffer = await customClaimFile.arrayBuffer()
          const pdfData = new Uint8Array(arrayBuffer)
          
          // Simple PDF text extraction (basic approach)
          const textDecoder = new TextDecoder()
          const pdfString = textDecoder.decode(pdfData)
          
          // Extract text between 'stream' and 'endstream' markers (simplified)
          const streamRegex = /stream[\s\S]*?endstream/g
          const matches = pdfString.match(streamRegex)
          
          if (matches) {
            text = matches.join(' ')
            // Clean up PDF artifacts
            text = text.replace(/stream|endstream/g, '')
            text = text.replace(/[^\x20-\x7E\n\r\t]/g, ' ') // Keep only printable ASCII
            text = text.replace(/\s+/g, ' ') // Normalize whitespace
          } else {
            throw new Error("Could not extract text from PDF. Please try converting to CSV or TXT format.")
          }
        } catch (error) {
          toast({
            title: "PDF Processing Error", 
            description: "Could not read PDF file. Please convert to CSV or TXT format.",
            variant: "destructive",
          })
          return
        }
      } else {
        // Handle CSV/TXT files
        text = await customClaimFile.text()
      }
      
      const { users, amounts, errors } = parseAddressesAndAmounts(text)
      
      if (errors.length > 0) {
        console.warn("Parsing errors:", errors)
        toast({
          title: "Parsing Warnings",
          description: `${errors.length} lines had issues. Check console for details. Proceeding with ${users.length} valid entries.`,
          variant: "destructive",
        })
      }
      
      if (users.length === 0) {
        throw new Error("No valid entries found in file. Expected format: address,amount per line.")
      }
      
      // Show confirmation with preview
      const previewText = users.slice(0, 3).map((user, i) => 
        `${user}: ${formatUnits(amounts[i], tokenDecimals)} ${tokenSymbol}`
      ).join('\n') + (users.length > 3 ? `\n... and ${users.length - 3} more` : '')
      
      const confirmed = window.confirm(
        `Found ${users.length} valid entries${errors.length > 0 ? ` (${errors.length} errors)` : ''}:\n\n${previewText}\n\nProceed with setting custom amounts?`
      )
      
      if (!confirmed) {
        return
      }
      
      await setCustomClaimAmountsBatch(
        provider as BrowserProvider,
        faucetAddress,
        users,
        amounts,
        BigInt(chainId),
        BigInt(Number(networkId)),
        faucetType || undefined,
      )
      
      toast({
        title: "Custom claim amounts set",
        description: `Successfully set custom amounts for ${users.length} addresses${errors.length > 0 ? ` (${errors.length} entries had errors)` : ''}`,
      })
      
      setCustomClaimFile(null)
      await loadFaucetDetails()
      await loadTransactionHistory()
    } catch (error: any) {
      console.error("Error setting custom claim amounts:", error)
      toast({
        title: "Failed to set custom claim amounts",
        description: error.message || "Unknown error occurred",
        variant: "destructive",
      })
    } finally {
      setIsUploadingCustomClaims(false)
    }
  }

  const handleResetAllClaims = async (): Promise<void> => {
    if (!isConnected || !provider || !chainId) {
      toast({
        title: "Invalid Input",
        description: "Please connect your wallet and ensure a network is selected",
        variant: "destructive",
      })
      return
    }
    if (!checkNetwork()) return
    try {
      setIsResettingClaims(true)
      
      await resetAllClaims(
        provider as BrowserProvider, 
        faucetAddress, 
        BigInt(chainId), 
        BigInt(Number(networkId)),
        faucetType || undefined
      )
      toast({
        title: "All claims reset",
        description: "All users can now claim again",
      })
      await loadFaucetDetails()
      await loadTransactionHistory()
    } catch (error: any) {
      console.error("Error resetting all claims:", error)
      let errorMessage = error.message || "Unknown error occurred"
      
      // Handle EIP-1559 specific errors
      if (errorMessage.includes("EIP-1559") || errorMessage.includes("maxFeePerGas")) {
        errorMessage = "Network doesn't support EIP-1559 transactions. This has been automatically handled in the retry."
      }
      
      toast({
        title: "Failed to reset all claims",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setIsResettingClaims(false)
    }
  }

  // ✅ FIXED: Updated to save preference to database instead of localStorage
  const handleCloseAdminPopup = async (): Promise<void> => {
    if (dontShowAdminPopupAgain && faucetAddress && address) {
      console.log("Saving admin popup preference to database...")
      const saved = await saveAdminPopupPreference(address, faucetAddress, true)
      
      if (saved) {
        toast({
          title: "Preference Saved",
          description: "Your popup preference has been saved.",
        })
      } else {
        toast({
          title: "Warning",
          description: "Failed to save popup preference. It will reset next time.",
          variant: "destructive",
        })
      }
    }
    
    setShowAdminPopup(false)
    setDontShowAdminPopupAgain(false)
  }

  const totalPages = Math.ceil(transactions.length / transactionsPerPage)
  const startIndex = (currentPage - 1) * transactionsPerPage
  const endIndex = startIndex + transactionsPerPage
  const currentTransactions = transactions.slice(startIndex, endIndex)

  const handlePageChange = (page: number): void => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page)
    }
  }

  const getTokenName = (isEther: boolean): string => {
    if (!isEther) {
      return tokenSymbol
    }
    switch (selectedNetwork?.name) {
      case "Celo":
        return "CELO"
      case "Lisk":
        return "LISK"
      case "Arbitrum":
        return "ETH"
      case "Base":
        return "ETH"
      case "Ethereum":
        return "ETH"
      case "Polygon":
        return "MATIC"
      case "Optimism":
        return "ETH"
      default:
        return "ETH"
    }
  }

  // ✅ Load faucet details when component mounts or dependencies change
  useEffect(() => {
  if (faucetAddress) {
    loadSocialMediaLinks()
    loadCustomXPostTemplate() 
  }
}, [faucetAddress])
  
  useEffect(() => {
    if (provider && faucetAddress && networkId) {
      loadFaucetDetails()
    }
  }, [provider, faucetAddress, networkId, address])

  if (loading) {
    return <LoadingPage />
  }

  return (
    <main className="min-h-screen bg-background">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <div className="flex flex-col gap-6 sm:gap-8 max-w-3xl sm:max-w-4xl mx-auto">
          <Header pageTitle="Faucet Details" />
          
          {/* ✅ NEW: Navigation and action buttons */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <Button
              variant="outline"
              onClick={handleGoBack}
              className="text-xs sm:text-sm hover:bg-accent hover:text-accent-foreground"
            >
              <ArrowLeft className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
              Back
            </Button>
            <Button
              variant="outline"
              onClick={handleCopyFaucetLink}
              className="text-xs sm:text-sm hover:bg-accent hover:text-accent-foreground"
            >
              <Link className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
              Copy Faucet Link
            </Button>
          </div>

          {faucetDetails ? (
            <>
              <Card className="w-full mx-auto">
                <CardHeader className="px-4 sm:px-6">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div className="flex items-center gap-4">
                      <CardTitle className="text-lg sm:text-xl">{faucetDetails.name || tokenSymbol} Faucet</CardTitle>
                      {canAccessAdminControls && (
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setShowEditNameDialog(true)}
                            title="Edit Faucet Name"
                            className="hover:bg-accent hover:text-accent-foreground"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setShowDeleteDialog(true)}
                            title="Delete Faucet"
                            className="hover:bg-accent hover:text-accent-foreground"
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      {selectedNetwork ? (
                        <Badge
                          style={{ backgroundColor: selectedNetwork.color }}
                          className="text-white text-xs font-medium px-2 py-1"
                        >
                          {selectedNetwork.name}
                        </Badge>
                      ) : (
                        <Badge className="text-white text-xs font-medium px-2 py-1 bg-gray-500">Unknown Network</Badge>
                      )}
                      {/* ✅ Show faucet type badge with correct type */}
                      {faucetType && (
                        <Badge variant="default" className="capitalize">
                          {faucetType === 'dropcode' ? 'DropCode' : 
                           faucetType === 'droplist' ? 'DropList' : 
                           faucetType === 'custom' ? 'Custom' : 
                           'Unknown'}
                        </Badge>
                      )}
                      {faucetDetails.isClaimActive ? (
                        <span className="text-xs bg-green-500/20 text-green-600 dark:text-green-400 px-2 py-1 rounded-full">
                          Active
                        </span>
                      ) : (
                        <span className="text-xs bg-red-500/20 text-red-600 dark:text-red-400 px-2 py-1 rounded-full">
                          Inactive
                        </span>
                      )}
                    </div>
                  </div>
                  <CardDescription className="text-xs sm:text-sm">
                    <div className="flex flex-col gap-2 mt-2">
                      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-1 sm:gap-2">
                        <span className="font-medium">Network:</span>
                        <span className="text-xs font-medium">{selectedNetwork?.name || "Unknown"}</span>
                      </div>
                      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-1 sm:gap-2">
                        <span className="font-medium">Faucet Address:</span>
                        <span className="text-xs font-mono break-all">{faucetAddress}</span>
                      </div>
                      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-1 sm:gap-2">
                        <span className="font-medium">Token Address:</span>
                        <span className="text-xs font-mono break-all">{faucetDetails.token}</span>
                      </div>
                      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-1 sm:gap-2">
                        <span className="font-medium">Owner:</span>
                        <span className="text-xs font-mono break-all">{faucetDetails.owner}</span>
                      </div>
                      {address && (
                        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-1 sm:gap-2">
                          <span className="font-medium">Connected Address:</span>
                          <span className="text-xs font-mono break-all">{address}</span>
                        </div>
                      )}

                      {/* ✅ Show status based on actual faucet type */}
                      {faucetType === 'droplist' && (
                        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-1 sm:gap-2">
                          <span className="font-medium">Drop-list Status:</span>
                          {address ? (
                            <span className={`text-xs ${userIsWhitelisted ? "text-green-600" : "text-red-600"}`}>
                              {userIsWhitelisted ? "✓ Drop-listed" : "✗ Not Drop-listed"}
                            </span>
                          ) : (
                            <span className="text-xs text-gray-500">Connect wallet to check</span>
                          )}
                        </div>
                      )}
                      {faucetType === 'custom' && (
                        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-1 sm:gap-2">
                          <span className="font-medium">Custom Amount Status:</span>
                          {address ? (
                            <span className={`text-xs ${hasCustomAmount ? "text-green-600" : "text-red-600"}`}>
                              {hasCustomAmount ? "✓ Has allocation" : "✗ No allocation"}
                            </span>
                          ) : (
                            <span className="text-xs text-gray-500">Connect wallet to check</span>
                          )}
                        </div>
                      )}
                    </div>
                  </CardDescription>
                </CardHeader>
                {faucetDetails && (
                  <div className="px-4 sm:px-6 pb-2">
                    <TokenBalance
                      tokenAddress={faucetDetails.token}
                      tokenSymbol={tokenSymbol}
                      tokenDecimals={tokenDecimals}
                      isNativeToken={faucetDetails.isEther}
                      networkChainId={selectedNetwork?.chainId}
                    />
                  </div>
                )}
                <CardContent className="space-y-4 px-4 sm:px-6">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                    <div className="flex flex-col p-3 sm:p-4 border rounded-lg">
                      <span className="text-xs sm:text-sm text-muted-foreground">Faucet Balance</span>
                      <span className="text-lg sm:text-2xl font-bold truncate">
                        {faucetDetails.balance ? formatUnits(faucetDetails.balance, tokenDecimals) : "0"} {tokenSymbol}
                      </span>
                    </div>
                    <div className="flex flex-col p-3 sm:p-4 border rounded-lg">
                      <span className="text-xs sm:text-sm text-muted-foreground">
                        {/* ✅ Show appropriate label based on actual faucet type */}
                        {faucetType === 'custom' ? 'Your Claim Amount' : 'Drop Amount'}
                      </span>
                      <span className="text-lg sm:text-2xl font-bold truncate">
                        {/* ✅ Show appropriate amount based on actual faucet type */}
                        {faucetType === 'custom' 
                          ? address 
                            ? hasCustomAmount 
                              ? `${formatUnits(userCustomClaimAmount, tokenDecimals)} ${tokenSymbol}`
                              : "No allocation"
                            : "Connect wallet"
                          : faucetDetails.claimAmount 
                            ? `${formatUnits(faucetDetails.claimAmount, tokenDecimals)} ${tokenSymbol}`
                            : `0 ${tokenSymbol}`
                        }
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-2">
                      <Clock className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
                      <span className="text-xs sm:text-sm">{startCountdown}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
                      <span className="text-xs sm:text-sm">{endCountdown}</span>
                    </div>
                  </div>

                  {/* ✅ Only show secret code input for dropcode faucets in backend mode */}
                  {shouldShowSecretCodeInput() && (
                    <div className="space-y-2">
                      <Label htmlFor="secret-code" className="text-xs sm:text-sm">
                        Drop Code
                      </Label>
                      <Input
                        id="secret-code"
                        placeholder="Enter 6-character code (e.g., ABC123)"
                        value={secretCode}
                        onChange={(e) => setSecretCode(e.target.value.toUpperCase())}
                        className="text-xs sm:text-sm"
                        maxLength={6}
                      />
                      <p className="text-xs text-muted-foreground">
                        Enter the 6-character alphanumeric code to drop tokens
                      </p>
                    </div>
                  )}
                </CardContent>
                <CardFooter className="flex flex-col gap-2 px-4 sm:px-6">
                  <Button
                    className="w-full h-8 sm:h-9 text-xs sm:text-sm hover:bg-accent hover:text-accent-foreground"
                    onClick={handleFollowAll}
                    disabled={allAccountsVerified}
                    variant={allAccountsVerified ? "secondary" : "default"}
                  >
                    {allAccountsVerified ? (
                      <>
                        <Check className="h-3 w-3 sm:h-4 sm:w-4 mr-2" />
                        All Tasks Verified ✓
                      </>
                    ) : (
                      <>
                        <AlertCircle className="h-3 w-3 sm:h-4 sm:w-4 mr-2" />
                        Complete Tasks to Unlock Drops
                      </>
                    )}
                  </Button>
                  <Button
                    className="w-full h-8 sm:h-9 text-xs sm:text-sm hover:bg-accent hover:text-accent-foreground"
                    variant="outline"
                    onClick={handleBackendClaim}
                    disabled={isClaiming || !address || !canClaim}
                  >
                    {isClaiming
                      ? <span className="flex items-center"><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>Dropping...</span>
                      : hasClaimed
                      ? "Already dropped"
                      : !address
                      ? "Connect Wallet to Drop"
                      : !allAccountsVerified
                      ? "Complete Tasks First"
                      : faucetType === 'custom' 
                        ? hasCustomAmount 
                          ? `Drop ${formatUnits(userCustomClaimAmount, tokenDecimals)} ${tokenSymbol}`
                          : "No Allocation Available"
                        : faucetType === 'droplist'
                        ? userIsWhitelisted
                          ? `Drop ${faucetDetails.claimAmount ? formatUnits(faucetDetails.claimAmount, tokenDecimals) : ""} ${tokenSymbol}`
                          : "Not Drop-listed"
                        : faucetType === 'dropcode'
                        ? backendMode && !isSecretCodeValid
                          ? "Enter Drop Code"
                          : `Drop ${faucetDetails.claimAmount ? formatUnits(faucetDetails.claimAmount, tokenDecimals) : ""} ${tokenSymbol}`
                        : "Drop Tokens"
                    }
                  </Button>
                </CardFooter>
              </Card>

              {/* ✅ Admin Controls Section */}
              {canAccessAdminControls && (
                <Card className="w-full mx-auto">
                  <CardHeader className="px-4 sm:px-6">
                    <CardTitle className="text-lg sm:text-xl">Admin Controls</CardTitle>
                    <CardDescription className="text-xs sm:text-sm">
                      Manage your {faucetType || 'unknown'} faucet settings - Mode: {backendMode ? "Automatic" : "Manual"}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="px-4 sm:px-6">
                    <Tabs defaultValue="fund" value={activeTab} onValueChange={setActiveTab}>
                      <div className="sm:hidden">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="outline" className="w-full flex justify-between items-center text-xs hover:bg-accent hover:text-accent-foreground">
                              {activeTab === "fund" && "Fund"}
                              {activeTab === "parameters" && "Parameters"}
                              {activeTab === "whitelist" && "Drop-list"}
                              {activeTab === "custom" && "Custom"}
                              {activeTab === "admin-power" && "Admin Power"}
                              {activeTab === "history" && "Activity Log"}
                              <Menu className="h-4 w-4 ml-2" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent className="w-full">
                            <DropdownMenuItem onClick={() => setActiveTab("fund")} className="text-xs hover:bg-accent hover:text-accent-foreground">
                              <Upload className="h-3 w-3 mr-2" /> Fund
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setActiveTab("parameters")} className="text-xs hover:bg-accent hover:text-accent-foreground">
                              <Coins className="h-3 w-3 mr-2" /> Parameters
                            </DropdownMenuItem>
                            {shouldShowWhitelistTab() && (
                              <DropdownMenuItem onClick={() => setActiveTab("whitelist")} className="text-xs hover:bg-accent hover:text-accent-foreground">
                                <Users className="h-3 w-3 mr-2" /> Drop-list
                              </DropdownMenuItem>
                            )}
                            {shouldShowCustomTab() && (
                              <DropdownMenuItem onClick={() => setActiveTab("custom")} className="text-xs hover:bg-accent hover:text-accent-foreground">
                                <FileUp className="h-3 w-3 mr-2" /> Custom
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem onClick={() => setActiveTab("admin-power")} className="text-xs hover:bg-accent hover:text-accent-foreground">
                              <RotateCcw className="h-3 w-3 mr-2" /> Admin Power
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setActiveTab("history")} className="text-xs hover:bg-accent hover:text-accent-foreground">
                              <History className="h-3 w-3 mr-2" /> Activity Log
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>

                      {/* ✅ Dynamic TabsList based on actual faucet type */}
                      <TabsList className={`hidden sm:grid gap-2 w-full ${
                        shouldShowWhitelistTab() && shouldShowCustomTab() ? 'grid-cols-6' : 
                        shouldShowWhitelistTab() || shouldShowCustomTab() ? 'grid-cols-5' : 
                        'grid-cols-4'
                      }`}>
                        <TabsTrigger value="fund" className="text-xs sm:text-sm hover:bg-accent hover:text-accent-foreground">
                          <Upload className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                          Fund
                        </TabsTrigger>
                        <TabsTrigger value="parameters" className="text-xs sm:text-sm hover:bg-accent hover:text-accent-foreground">
                          <Coins className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                          Parameters
                        </TabsTrigger>
                        {shouldShowWhitelistTab() && (
                          <TabsTrigger value="whitelist" className="text-xs sm:text-sm hover:bg-accent hover:text-accent-foreground">
                            <Users className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                            Drop-list
                          </TabsTrigger>
                        )}
                        {shouldShowCustomTab() && (
                          <TabsTrigger value="custom" className="text-xs sm:text-sm hover:bg-accent hover:text-accent-foreground">
                            <FileUp className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                            Custom
                          </TabsTrigger>
                        )}
                        <TabsTrigger value="admin-power" className="text-xs sm:text-sm hover:bg-accent hover:text-accent-foreground">
                          <RotateCcw className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                          Admin Power
                        </TabsTrigger>
                        <TabsTrigger value="history" className="text-xs sm:text-sm hover:bg-accent hover:text-accent-foreground">
                          <History className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                          Activity Log
                        </TabsTrigger>
                      </TabsList>

                      {/* Fund Tab */}
                      <TabsContent value="fund" className="space-y-4 mt-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="fund-amount" className="text-xs sm:text-sm">
                              Fund Amount
                            </Label>
                            <div className="flex gap-2">
                              <Input
                                id="fund-amount"
                                placeholder="0.0"
                                value={fundAmount}
                                onChange={(e) => setFundAmount(e.target.value)}
                                className="text-xs sm:text-sm"
                              />
                              <Button
                                onClick={handleFund}
                                disabled={isFunding || !fundAmount}
                                className="text-xs sm:text-sm hover:bg-accent hover:text-accent-foreground"
                              >
                                {isFunding ? (
                                  <span className="flex items-center">
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
                                    Funding...
                                  </span>
                                ) : (
                                  <>
                                    <Upload className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                                    Fund
                                  </>
                                )}
                              </Button>
                            </div>
                            <p className="text-xs text-muted-foreground">
                              Add {tokenSymbol} to the faucet (3% platform fee applies)
                            </p>
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="withdraw-amount" className="text-xs sm:text-sm">
                              Withdraw Amount
                            </Label>
                            <div className="flex gap-2">
                              <Input
                                id="withdraw-amount"
                                placeholder="0.0"
                                value={withdrawAmount}
                                onChange={(e) => setWithdrawAmount(e.target.value)}
                                className="text-xs sm:text-sm"
                              />
                              <Button
                                onClick={handleWithdraw}
                                disabled={isWithdrawing || !withdrawAmount}
                                variant="outline"
                                className="text-xs sm:text-sm hover:bg-accent hover:text-accent-foreground"
                              >
                                {isWithdrawing ? (
                                  <span className="flex items-center">
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
                                    Withdrawing...
                                  </span>
                                ) : (
                                  <>
                                    <Download className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                                    Withdraw
                                  </>
                                )}
                              </Button>
                            </div>
                            <p className="text-xs text-muted-foreground">Withdraw {tokenSymbol} from the faucet</p>
                          </div>
                        </div>
                      </TabsContent>

                     {/* Parameters Tab */}
<TabsContent value="parameters" className="space-y-4 mt-4">
  <div className="space-y-4">
    {/* ✅ FIXED: Only show claim amount for non-custom faucets */}
    {faucetType !== 'custom' && (
      <div className="space-y-2">
        <Label htmlFor="claim-amount" className="text-xs sm:text-sm">
          Drop Amount
        </Label>
        <Input
          id="claim-amount"
          placeholder="0.0"
          value={claimAmount}
          onChange={(e) => setClaimAmount(e.target.value)}
          className="text-xs sm:text-sm"
        />
        <p className="text-xs text-muted-foreground">Amount of {tokenSymbol} users can drop</p>
      </div>
    )}
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
      <div className="space-y-2">
        <Label htmlFor="start-time" className="text-xs sm:text-sm">
          Start Time
        </Label>
        <Input
          id="start-time"
          type="datetime-local"
          value={startTime}
          min={getCurrentDateTime()}
          onChange={handleStartTimeChange}
          className={`text-xs sm:text-sm ${
            startTimeError ? 'border-red-500 focus:border-red-500' : ''
          }`}
        />
        {startTimeError && (
          <p className="text-red-600 text-xs mt-1">{startTimeError}</p>
        )}
      </div>
      <div className="space-y-2">
        <Label htmlFor="end-time" className="text-xs sm:text-sm">
          End Time
        </Label>
        <Input
          id="end-time"
          type="datetime-local"
          value={endTime}
          onChange={(e) => setEndTime(e.target.value)}
          className="text-xs sm:text-sm"
        />
      </div>
    </div>

    {/* ✅ NEW: Social Media Tasks Section */}
    <div className="space-y-4 border-t pt-4">
  <div className="flex items-center justify-between">
    <div>
      <Label className="text-xs sm:text-sm font-medium">
        Social Media Tasks (Optional)
      </Label>
      <p className="text-xs text-muted-foreground mt-1">
        Add social media tasks for {faucetType === 'dropcode' ? 'Drop Code' : faucetType === 'droplist' ? 'Drop List' : 'Custom'} faucet verification
      </p>
    </div>
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={addNewSocialLink}
      className="text-xs hover:bg-accent hover:text-accent-foreground"
    >
      <ExternalLink className="h-3 w-3 mr-1" />
      Add Task
    </Button>
  </div>
  
  {/* ✅ Show current tasks for ALL faucet types */}
  {dynamicTasks.length > 0 && (
    <div className="space-y-2">
      <Label className="text-xs font-medium">Current Tasks ({dynamicTasks.length})</Label>
      <div className="space-y-1">
        {dynamicTasks.map((task, index) => (
          <div key={index} className="flex items-center justify-between p-2 bg-muted rounded text-xs">
            <span>{getPlatformIcon(task.platform)} {getActionText(task.platform)} {task.handle}</span>
            <Badge variant="outline" className="text-xs">{task.platform}</Badge>
          </div>
        ))}
      </div>
    </div>
  )}
  
  {newSocialLinks.length > 0 && (
    <div className="space-y-3">
      <Label className="text-xs font-medium">New Tasks</Label>
      {newSocialLinks.map((link, index) => (
        <div key={index} className="border rounded-lg p-3 space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs font-medium">Task {index + 1}</Label>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => removeNewSocialLink(index)}
              className="text-xs text-red-600 hover:bg-red-50 hover:text-red-700"
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-xs">Platform</Label>
              <Select
                value={link.platform}
                onValueChange={(value) => updateNewSocialLink(index, 'platform', value)}
              >
                <SelectTrigger className="text-xs">
                  <SelectValue placeholder="Select platform" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="𝕏">Twitter/𝕏</SelectItem>
                  <SelectItem value="telegram">Telegram</SelectItem>
                  <SelectItem value="discord">Discord</SelectItem>
                  <SelectItem value="youtube">YouTube</SelectItem>
                  <SelectItem value="instagram">Instagram</SelectItem>
                  <SelectItem value="tiktok">TikTok</SelectItem>
                  <SelectItem value="facebook">Facebook</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Action</Label>
              <Select
                value={link.action}
                onValueChange={(value) => updateNewSocialLink(index, 'action', value)}
              >
                <SelectTrigger className="text-xs">
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
          <div className="space-y-1">
            <Label className="text-xs">URL</Label>
            <Input
              placeholder="https://x.com/username"
              value={link.url}
              onChange={(e) => updateNewSocialLink(index, 'url', e.target.value)}
              className="text-xs"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Handle/Username</Label>
            <Input
              placeholder="@username"
              value={link.handle}
              onChange={(e) => updateNewSocialLink(index, 'handle', e.target.value)}
              className="text-xs"
            />
          </div>
        </div>
      ))}
    </div>
  )}
</div>
{/* Custom X Post Template Section */}
<div className="space-y-4 border-t pt-4">
  <div className="flex items-center justify-between">
    <div>
      <Label className="text-xs sm:text-sm font-medium">
        Custom Share on 𝕏 Post
      </Label>
      <p className="text-xs text-muted-foreground mt-1">
        Customize what users share when they claim. Use placeholders: {"{amount}"}, {"{token}"}, {"{network}"}, {"{faucet}"}, {"{explorer}"}
      </p>
    </div>
  </div>
  
  {isLoadingXTemplate ? (
    <div className="flex items-center justify-center py-4">
      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
      <span className="ml-2 text-xs text-muted-foreground">Loading template...</span>
    </div>
  ) : (
    <>
      <div className="space-y-2">
        <Textarea
          placeholder="I just received a drop of {amount} {token} from @FaucetDrops on {network}. Verify Drop 💧: {explorer}"
          value={customXPostTemplate}
          onChange={(e) => setCustomXPostTemplate(e.target.value)}
          rows={4}
          className="text-xs font-mono"
        />
        
        <div className="flex flex-wrap gap-1">
          <span className="text-xs text-muted-foreground mr-2">Quick insert:</span>
          <Badge 
            variant="outline" 
            className="text-xs cursor-pointer hover:bg-accent" 
            onClick={() => setCustomXPostTemplate(customXPostTemplate + "{amount}")}
          >
            {"{amount}"}
          </Badge>
          <Badge 
            variant="outline" 
            className="text-xs cursor-pointer hover:bg-accent"
            onClick={() => setCustomXPostTemplate(customXPostTemplate + "{token}")}
          >
            {"{token}"}
          </Badge>
          <Badge 
            variant="outline" 
            className="text-xs cursor-pointer hover:bg-accent"
            onClick={() => setCustomXPostTemplate(customXPostTemplate + "{network}")}
          >
            {"{network}"}
          </Badge>
          <Badge 
            variant="outline" 
            className="text-xs cursor-pointer hover:bg-accent"
            onClick={() => setCustomXPostTemplate(customXPostTemplate + "{faucet}")}
          >
            {"{faucet}"}
          </Badge>
          <Badge 
            variant="outline" 
            className="text-xs cursor-pointer hover:bg-accent"
            onClick={() => setCustomXPostTemplate(customXPostTemplate + "{explorer}")}
          >
            {"{explorer}"}
          </Badge>
        </div>
        
        {customXPostTemplate && (
          <div className="p-3 bg-muted rounded-lg">
            <Label className="text-xs font-medium mb-2 block">Preview:</Label>
            <p className="text-xs break-words">
              {generateXPostContent(
                faucetDetails?.claimAmount 
                  ? formatUnits(faucetDetails.claimAmount, tokenDecimals)
                  : "0",
                "0x1234567890abcdef1234567890abcdef12345678"
              )}
            </p>
          </div>
        )}
      </div>
      
      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => {
            // Reset to default template
            const defaultTemplate = `I just received a drop of {amount} {token} from @FaucetDrops on {network}. Verify Drop 💧: {explorer}`
            setCustomXPostTemplate(defaultTemplate)
            toast({
              title: "Template Reset",
              description: "Reset to default share message",
            })
          }}
          className="text-xs"
        >
          Reset to Default
        </Button>
        
        {customXPostTemplate !== `I just received a drop of {amount} {token} from @FaucetDrops on {network}. Verify Drop 💧: {explorer}` && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              setCustomXPostTemplate("")
              toast({
                title: "Template Cleared",
                description: "Template cleared, will reset to default on reload",
              })
            }}
            className="text-xs text-red-600 hover:text-red-700"
          >
            Clear All
          </Button>
        )}
      </div>
    </>
  )}
</div>
   <div className="flex flex-col gap-3 sm:gap-4 w-full max-w-3xl mx-auto">
  <Button
    onClick={handleUpdateClaimParameters}
    className="text-xs sm:text-sm font-medium py-2 sm:py-3 px-4 sm:px-6 hover:bg-accent hover:text-accent-foreground transition-colors w-full"
    disabled={isUpdatingParameters || (faucetType !== 'custom' && !claimAmount) || !startTime || !endTime || startTimeError}
  >
    {isUpdatingParameters ? (
      <span className="flex items-center justify-center">
        <div className="animate-spin rounded-full h-4 w-4 sm:h-5 sm:w-5 border-b-2 border-current mr-2"></div>
        Updating...
      </span>
    ) : (
      "Update Parameters"
    )}
  </Button>

  {/* Extended access for secret code button */}
  {shouldShowSecretCodeButton() && (
    <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 w-full">
      <Button
        onClick={handleRetrieveSecretCode}
        variant="outline"
        className="text-xs sm:text-sm font-medium py-2 sm:py-3 px-4 sm:px-6 hover:bg-accent hover:text-accent-foreground transition-colors w-full"
        disabled={isRetrievingSecret}
      >
        {isRetrievingSecret ? (
          <span className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-4 w-4 sm:h-5 sm:w-5 border-b-2 border-current mr-2"></div>
            Retrieving...
          </span>
        ) : (
          <>
            <Key className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
            Get Current Code
          </>
        )}
      </Button>

      {/* Generate New Code Button */}
      <Button
        onClick={handleGenerateNewDropCode}
        variant="outline"
        className="text-xs sm:text-sm font-medium py-2 sm:py-3 px-4 sm:px-6 hover:bg-accent hover:text-accent-foreground transition-colors w-full"
        disabled={isGeneratingNewCode}
      >
        {isGeneratingNewCode ? (
          <span className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-4 w-4 sm:h-5 sm:w-5 border-b-2 border-current mr-2"></div>
            Generating...
          </span>
        ) : (
          <>
            <RotateCcw className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
            Generate New Code
          </>
        )}
      </Button>
    </div>
  )}
</div>


<Dialog open={showNewCodeDialog} onOpenChange={setShowNewCodeDialog}>
  <DialogContent className="w-11/12 max-w-[95vw] sm:max-w-md">
    <DialogHeader>
      <DialogTitle className="text-lg sm:text-xl">New Drop Code Generated</DialogTitle>
      <DialogDescription className="text-xs sm:text-sm">
        Your new drop code has been generated and stored. The previous code is no longer valid.
      </DialogDescription>
    </DialogHeader>
    <div className="space-y-4 py-4">
      <div className="text-center">
        <div className="text-xl sm:text-2xl font-mono font-bold bg-gray-100 dark:bg-gray-800 p-4 rounded-lg">
          {newlyGeneratedCode}
        </div>
      </div>
      <div className="bg-yellow-50 dark:bg-yellow-900/20 p-3 rounded-lg">
        <p className="text-xs text-yellow-800 dark:text-yellow-200 text-center">
          ⚠️ Important: The previous drop code is now invalid. Only this new code will work for claims.
        </p>
      </div>
      <p className="text-xs text-muted-foreground text-center">
        Share this new code with users to allow them to drop tokens. Keep it safe and share it only with intended users.
      </p>
    </div>
    <DialogFooter>
      <Button
        onClick={() => handleCopySecretCode(newlyGeneratedCode)}
        className="text-xs sm:text-sm w-full hover:bg-accent hover:text-accent-foreground"
      >
        <Copy className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
        Copy New Code
      </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>

  </div>
</TabsContent>
                      {/* ✅ Whitelist Tab - Only shown for droplist faucets */}
                      {shouldShowWhitelistTab() && (
                        <TabsContent value="whitelist" className="space-y-4 mt-4">
                          <div className="space-y-4">
                            <div className="space-y-2">
                              <div className="flex items-center justify-between">
                                <Label className="text-xs sm:text-sm">
                                  {isWhitelistEnabled ? "Add to Drop-list" : "Remove from Drop-list"}
                                </Label>
                                <Switch
                                  checked={isWhitelistEnabled}
                                  onCheckedChange={setIsWhitelistEnabled}
                                />
                              </div>
                              <Label htmlFor="whitelist-addresses" className="text-xs sm:text-sm">
                                Addresses (one per line or comma-separated)
                              </Label>
                              <Textarea
                                id="whitelist-addresses"
                                value={whitelistAddresses}
                                onChange={(e) => setWhitelistAddresses(e.target.value)}
                                rows={5}
                                className="text-xs sm:text-sm"
                              />
                            </div>
                            <Button
                              onClick={handleUpdateWhitelist}
                              className="text-xs sm:text-sm hover:bg-accent hover:text-accent-foreground"
                              disabled={isUpdatingWhitelist}
                            >
                              {isUpdatingWhitelist ? (
                                <span className="flex items-center">
                                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
                                  Updating...
                                </span>
                              ) : (
                                "Update Drop-list"
                              )}
                            </Button>
                          </div>
                        </TabsContent>
                      )}

                      {/* ✅ Custom Tab - Only shown for custom faucets */}
                      {shouldShowCustomTab() && (
                        <TabsContent value="custom" className="space-y-4 mt-4">
                          <div className="space-y-4">
                            <div className="space-y-2">
                              <Label htmlFor="custom-claim-file" className="text-xs sm:text-sm">
                                Upload Custom Claim Amounts (CSV/TXT/PDF)
                              </Label>
                              <Input
                                id="custom-claim-file"
                                type="file"
                                accept=".csv,.txt,.pdf"
                                onChange={handleCustomClaimFile}
                                className="text-xs sm:text-sm"
                              />
                              <p className="text-xs text-muted-foreground">
                                Upload a CSV, TXT, or PDF file with addresses and amounts. Supports formats: address,amount or address amount (one per line)
                              </p>
                            </div>
                            <Button
                              onClick={handleUploadCustomClaims}
                              disabled={isUploadingCustomClaims || !customClaimFile}
                              className="text-xs sm:text-sm hover:bg-accent hover:text-accent-foreground"
                            >
                              {isUploadingCustomClaims ? (
                                <span className="flex items-center">
                                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
                                  Uploading...
                                </span>
                              ) : (
                                <>
                                  <FileUp className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                                  Upload Custom Claims
                                </>
                              )}
                            </Button>
                          </div>
                        </TabsContent>
                      )}

                      {/* Admin Power Tab */}
                      <TabsContent value="admin-power" className="space-y-4 mt-4">
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <Label className="text-xs sm:text-sm">All Admins </Label>
                            {adminList.length > 0 ? (
                              <div className="space-y-2">
                                {adminList.map((admin) => (
                                  <div key={admin} className="flex items-center justify-between p-2 rounded-lg">
                                    <span className="font-mono break-all text-xs sm:text-sm">{admin}</span>
                                    {admin.toLowerCase() === faucetDetails?.owner.toLowerCase() && (
                                      <Badge variant="secondary" className="text-xs">Owner</Badge>
                                    )}
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="text-xs sm:text-sm text-muted-foreground">No admins found</p>
                            )}
                          </div>
                          {isOwner && (
                            <div className="space-y-2">
                              <Label htmlFor="new-admin" className="text-xs sm:text-sm">
                                {isAddingAdmin ? "Add Admin" : "Remove Admin"}
                              </Label>
                              <div className="flex gap-2">
                                <Input
                                  id="new-admin"
                                  placeholder="0x..."
                                  value={newAdminAddress}
                                  onChange={(e) => {
                                    setNewAdminAddress(e.target.value)
                                    checkAdminStatus(e.target.value)
                                  }}
                                  className="text-xs sm:text-sm font-mono"
                                />
                                <Button
                                  onClick={() => setShowAddAdminDialog(true)}
                                  disabled={isManagingAdmin || !newAdminAddress.trim()}
                                  className="text-xs sm:text-sm hover:bg-accent hover:text-accent-foreground"
                                >
                                  {isManagingAdmin ? (
                                    <span className="flex items-center">
                                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
                                      {isAddingAdmin ? "Adding..." : "Removing..."}
                                    </span>
                                  ) : (
                                    isAddingAdmin ? "Add Admin" : "Remove Admin"
                                  )}
                                </Button>
                              </div>
                              <p className="text-xs text-muted-foreground">
                                Note: Owner and factory owner cannot be modified through this interface.
                              </p>
                            </div>
                          )}
                          <div className="space-y-2">
                            <Label className="text-xs sm:text-sm">Reset All Claims</Label>
                            <p className="text-xs text-muted-foreground">
                              Allow all users to claim again
                            </p>
                            <Button
                              onClick={handleResetAllClaims}
                              variant="destructive"
                              className="text-xs sm:text-sm hover:bg-destructive/90 hover:text-destructive-foreground"
                              disabled={isResettingClaims}
                            >
                              {isResettingClaims ? (
                                <span className="flex items-center">
                                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
                                  Resetting...
                                </span>
                              ) : (
                                <>
                                  <RotateCcw className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                                  Reset All Claims
                                </>
                              )}
                            </Button>
                          </div>
                        </div>
                      </TabsContent>

                      {/* Activity Log Tab */}
                      <TabsContent value="history" className="space-y-4 mt-4">
                        <div className="space-y-4">
                          <Label className="text-xs sm:text-sm">Activity Log</Label>
                          {transactions.length > 0 ? (
                            <>
                              <Table>
                                <TableHeader>
                                  <TableRow>
                                    <TableHead className="text-xs sm:text-sm">Type</TableHead>
                                    <TableHead className="text-xs sm:text-sm">Initiator</TableHead>
                                    <TableHead className="text-xs sm:text-sm">Amount</TableHead>
                                    <TableHead className="text-xs sm:text-sm">Token</TableHead>
                                    <TableHead className="text-xs sm:text-sm">Date</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {currentTransactions.map((tx, index) => (
                                    <TableRow key={`${tx.timestamp}-${index}`}>
                                      <TableCell className="text-xs sm:text-sm capitalize">{tx.transactionType}</TableCell>
                                      <TableCell className="text-xs sm:text-sm font-mono truncate max-w-[100px] sm:max-w-[150px]">
                                        {tx.initiator}
                                      </TableCell>
                                      <TableCell className="text-xs sm:text-sm">
                                        {formatUnits(tx.amount, tokenDecimals)}
                                      </TableCell>
                                      <TableCell className="text-xs sm:text-sm">
                                        {getTokenName(tx.isEther)}
                                      </TableCell>
                                      <TableCell className="text-xs sm:text-sm">
                                        {new Date(tx.timestamp * 1000).toLocaleString()}
                                      </TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                              {totalPages > 1 && (
                                <Pagination>
                                  <PaginationContent>
                                    <PaginationItem>
                                      <PaginationPrevious
                                        href="#"
                                        onClick={(e) => {
                                          e.preventDefault()
                                          handlePageChange(currentPage - 1)
                                        }}
                                        className={`text-xs sm:text-sm hover:bg-accent hover:text-accent-foreground ${
                                          currentPage === 1 ? "pointer-events-none opacity-50" : ""
                                        }`}
                                      />
                                    </PaginationItem>
                                    {[...Array(totalPages)].map((_, i) => (
                                      <PaginationItem key={i + 1}>
                                        <PaginationLink
                                          href="#"
                                          onClick={(e) => {
                                            e.preventDefault()
                                            handlePageChange(i + 1)
                                          }}
                                          isActive={currentPage === i + 1}
                                          className="text-xs sm:text-sm hover:bg-accent hover:text-accent-foreground"
                                        >
                                          {i + 1}
                                        </PaginationLink>
                                      </PaginationItem>
                                    ))}
                                    <PaginationItem>
                                      <PaginationNext
                                        href="#"
                                        onClick={(e) => {
                                          e.preventDefault()
                                          handlePageChange(currentPage + 1)
                                        }}
                                        className={`text-xs sm:text-sm hover:bg-accent hover:text-accent-foreground ${
                                          currentPage === totalPages ? "pointer-events-none opacity-50" : ""
                                        }`}
                                      />
                                    </PaginationItem>
                                  </PaginationContent>
                                </Pagination>
                              )}
                            </>
                          ) : (
                            <p className="text-xs sm:text-sm text-muted-foreground">No transactions found</p>
                          )}
                        </div>
                      </TabsContent>
                    </Tabs>
                  </CardContent>
                </Card>
              )}

              
            </>
          ) : (
            <Card className="w-full mx-auto">
              <CardContent className="py-6 sm:py-10 text-center">
                <p className="text-sm sm:text-base">Faucet not found or error loading details</p>
                <Button
                  className="mt-4 text-xs sm:text-sm hover:bg-accent hover:text-accent-foreground"
                  onClick={() => router.push("/")}
                >
                  Return to Home
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
      
      {/* ✅ Updated Follow Dialog with Dynamic Tasks */}
      <Dialog open={showFollowDialog} onOpenChange={setShowFollowDialog}>
        <DialogContent className="w-11/12 max-w-[95vw] sm:max-w-lg max-h-[90vh] flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle className="text-lg sm:text-xl">Complete Required Tasks</DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">
              {dynamicTasks.length > 0 
                ? "Complete these tasks and provide your usernames to unlock token claims."
                : "No specific tasks required for this faucet. You can proceed to claim tokens."
              }
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4 overflow-y-auto flex-1 min-h-0">
            {isLoadingSocialLinks ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                <p className="mt-2 text-sm text-muted-foreground">Loading required tasks...</p>
              </div>
            ) : dynamicTasks.length === 0 ? (
              <div className="text-center py-8">
                <Check className="h-12 w-12 text-green-500 mx-auto mb-4" />
                <p className="text-lg font-semibold text-green-600">No Tasks Required!</p>
                <p className="text-sm text-muted-foreground">This faucet doesn't require any social media verification.</p>
              </div>
            ) : (
              dynamicTasks.map((task) => (
                <div key={task.platform} className="p-4 border rounded-lg space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <span className="text-lg">{getPlatformIcon(task.platform)}</span>
                      <div>
                        <p className="font-medium text-sm">{task.action} {task.handle}</p>
                        <p className="text-xs text-muted-foreground">{task.platform}</p>
                        <a 
                          href={task.url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-xs text-blue-600 hover:underline flex items-center gap-1"
                        >
                          <ExternalLink className="h-3 w-3" />
                          {getActionText(task.platform)} on {task.platform}
                        </a>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {verificationStates[task.platform] ? (
                        <Badge variant="secondary" className="text-xs">
                          <Check className="h-3 w-3 mr-1" />
                          Verified
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-xs">
                          <AlertCircle className="h-3 w-3 mr-1" />
                          Pending
                        </Badge>
                      )}
                    </div>
                  </div>
                  
                  {!verificationStates[task.platform] && (
                    <div className="space-y-2">
                      <Label htmlFor={`username-${task.platform}`} className="text-xs">
                        Enter your {task.platform} username:
                      </Label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id={`username-${task.platform}`}
                          placeholder="username (without @)"
                          value={usernames[task.platform] || ''}
                          onChange={(e) => setUsernames(prev => ({
                            ...prev,
                            [task.platform]: e.target.value
                          }))}
                          className="text-xs pl-10"
                        />
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Visit the link above to {getActionText(task.platform).toLowerCase()} the account, then enter your username here.
                      </p>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
         
          <DialogFooter className="flex-shrink-0">
            <Button
              onClick={handleVerifyAllTasks}
              className="text-xs sm:text-sm w-full hover:bg-accent hover:text-accent-foreground"
              disabled={!getAllUsernamesProvided() || getAllAccountsVerified() || dynamicTasks.length === 0}
            >
              {getAllAccountsVerified() 
                ? "All Tasks Verified - Ready to Claim!" 
                : dynamicTasks.length === 0
                ? "No Tasks Required - Ready to Claim!"
                : getAllUsernamesProvided()
                ? "Verify All Tasks"
                : "Enter All Usernames First"
              }
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Verification Progress Dialog */}
      <Dialog open={showVerificationDialog} onOpenChange={() => {}}>
        <DialogContent className="w-11/12 max-w-[95vw] sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-xl">Verifying Tasks</DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">
              {isVerifying ? "Please wait while we verify all your tasks..." : "All tasks verified successfully!"}
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center justify-center py-8 space-y-4">
            {isVerifying ? (
              <>
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                <p className="text-sm text-muted-foreground">Verifying your usernames...</p>
                <p className="text-xs text-center text-muted-foreground">
                  Checking all required accounts
                </p>
              </>
            ) : (
              <>
                <div className="rounded-full h-12 w-12 bg-green-500 flex items-center justify-center">
                  <Check className="h-6 w-6 text-white" />
                </div>
                <p className="text-sm text-green-600 font-medium">All Tasks Verified!</p>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Rest of the existing dialogs */}
      <Dialog open={showClaimPopup} onOpenChange={setShowClaimPopup}>
        <DialogContent className="w-11/12 max-w-[95vw] sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-xl">Drop Successful!</DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">
              You have successfully received a drop of{" "}
              {faucetType === 'custom' && hasCustomAmount
                ? formatUnits(userCustomClaimAmount, tokenDecimals)
                : faucetDetails?.claimAmount 
                  ? formatUnits(faucetDetails.claimAmount, tokenDecimals) 
                  : "0"
              } {tokenSymbol}.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col space-y-4 py-4">
            <p className="text-xs sm:text-sm">Share your drop on X to help spread the word about FaucetDrops!</p>
          </div>
          <DialogFooter className="sm:justify-start flex flex-col sm:flex-row gap-2">
            <Button
              type="button"
              variant="default"
              onClick={handleShareOnX}
              className="flex items-center gap-2 text-xs sm:text-sm hover:bg-accent hover:text-accent-foreground"
            >
              <Share2 className="h-3 w-3 sm:h-4 sm:w-4" />
              Share on 𝕏
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showFundPopup} onOpenChange={setShowFundPopup}>
        <DialogContent className="w-11/12 max-w-[95vw] sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-xl">Confirm Funding</DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">
              Review the funding details before proceeding.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="adjusted-fund-amount" className="text-xs sm:text-sm">
                Amount to Fund
              </Label>
              <Input
                id="adjusted-fund-amount"
                value={adjustedFundAmount}
                onChange={(e) => setAdjustedFundAmount(e.target.value)}
                className="text-xs sm:text-sm"
              />
            </div>
            <div className="text-xs text-muted-foreground space-y-1">
              <p>Platform fee (3%): {fee} {tokenSymbol}</p>
              <p>Net amount to faucet: {netAmount} {tokenSymbol}</p>
              <p className="text-blue-600">
                Tip: To fund exactly {fundAmount} {tokenSymbol}, enter {recommendedInput} {tokenSymbol}
              </p>
            </div>
          </div>
          <DialogFooter className="flex flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => setShowFundPopup(false)}
              className="text-xs sm:text-sm hover:bg-accent hover:text-accent-foreground"
            >
              Cancel
            </Button>
            <Button
              onClick={confirmFund}
              className="text-xs sm:text-sm hover:bg-accent hover:text-accent-foreground"
              disabled={isFunding}
            >
              {isFunding ? (
                <span className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
                  Confirming...
                </span>
              ) : (
                "Confirm Fund"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ✅ UPDATED: Secret Code Dialogs - Extended access */}
      <Dialog open={showSecretCodeDialog} onOpenChange={setShowSecretCodeDialog}>
        <DialogContent className="w-11/12 max-w-[95vw] sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-xl">Drop Code Generated</DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">
              Your Drop code has been generated and stored. Share this code with users to allow them to drop tokens.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="text-center">
              <div className="text-xl sm:text-2xl font-mono font-bold bg-gray-100 dark:bg-gray-800 p-4 rounded-lg">
                {generatedSecretCode}
              </div>
            </div>
            <p className="text-xs text-muted-foreground text-center">
              This code is required for users to drop tokens. Keep it safe and share it only with intended users.
            </p>
          </div>
          <DialogFooter>
            <Button
              onClick={() => handleCopySecretCode(generatedSecretCode)}
              className="text-xs sm:text-sm w-full hover:bg-accent hover:text-accent-foreground"
            >
              <Copy className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
              Copy Code
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showCurrentSecretDialog} onOpenChange={setShowCurrentSecretDialog}>
        <DialogContent className="w-11/12 max-w-[95vw] sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-xl">Current Drop Code</DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">
              This is the current drop code for your faucet.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="text-center">
              <div className="text-xl sm:text-2xl font-mono font-bold bg-gray-100 dark:bg-gray-800 p-4 rounded-lg">
                {secretCode}
              </div>
            </div>
            <p className="text-xs text-muted-foreground text-center">
              Share this code with users to allow them to drop tokens from your faucet.
            </p>
          </div>
          <DialogFooter>
            <Button
              onClick={() => handleCopySecretCode(secretCode)}
              className="text-xs sm:text-sm w-full hover:bg-accent hover:text-accent-foreground"
            >
              <Copy className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
              Copy Code
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showEditNameDialog} onOpenChange={setShowEditNameDialog}>
        <DialogContent className="w-11/12 max-w-[95vw] sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-xl">Edit Faucet Name</DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">Enter a new name for your faucet.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="new-faucet-name" className="text-xs sm:text-sm">
                New Faucet Name
              </Label>
              <Input
                id="new-faucet-name"
                value={newFaucetName}
                onChange={(e) => setNewFaucetName(e.target.value)}
                placeholder="Enter new faucet name"
                className="text-xs sm:text-sm"
              />
            </div>
          </div>
          <DialogFooter className="flex flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => setShowEditNameDialog(false)}
              className="text-xs sm:text-sm hover:bg-accent hover:text-accent-foreground"
            >
              Cancel
            </Button>
            <Button onClick={handleUpdateFaucetName}
              className="text-xs sm:text-sm hover:bg-accent hover:text-accent-foreground"
              disabled={isUpdatingName || !newFaucetName.trim()}
            >
              {isUpdatingName ? (
                <span className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
                  Updating...
                </span>
              ) : (
                "Update Name"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="w-11/12 max-w-[95vw] sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-xl">Delete Faucet</DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">
              Are you sure you want to delete this faucet? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => setShowDeleteDialog(false)}
              className="text-xs sm:text-sm hover:bg-accent hover:text-accent-foreground"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteFaucet}
              className="text-xs sm:text-sm hover:bg-destructive/90 hover:text-destructive-foreground"
              disabled={isDeletingFaucet}
            >
              {isDeletingFaucet ? (
                <span className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
                  Deleting...
                </span>
              ) : (
                "Delete Faucet"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showAddAdminDialog} onOpenChange={setShowAddAdminDialog}>
        <DialogContent className="w-11/12 max-w-[95vw] sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-xl">{isAddingAdmin ? "Add Admin" : "Remove Admin"}</DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">
              {isAddingAdmin
                ? "Enter the address to grant admin privileges."
                : "Enter the address to revoke admin privileges."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="admin-address" className="text-xs sm:text-sm">
                Admin Address
              </Label>
              <Input
                id="admin-address"
                value={newAdminAddress}
                onChange={(e) => {
                  setNewAdminAddress(e.target.value)
                  checkAdminStatus(e.target.value)
                }}
                placeholder="0x..."
                className="text-xs sm:text-sm font-mono"
              />
            </div>
          </div>
          <DialogFooter className="flex flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => setShowAddAdminDialog(false)}
              className="text-xs sm:text-sm hover:bg-accent hover:text-accent-foreground"
            >
              Cancel
            </Button>
            <Button
              onClick={handleManageAdmin}
              className="text-xs sm:text-sm hover:bg-accent hover:text-accent-foreground"
              disabled={isManagingAdmin || !newAdminAddress.trim()}
            >
              {isManagingAdmin ? (
                <span className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
                  {isAddingAdmin ? "Adding..." : "Removing..."}
                </span>
              ) : (
                isAddingAdmin ? "Add Admin" : "Remove Admin"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showAdminPopup} onOpenChange={setShowAdminPopup}>
        <DialogContent className="w-11/12 max-w-[95vw] sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-xl">Admin Controls Guide</DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">
              Learn how to manage your {faucetType || 'unknown'} faucet as an admin.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <h3 className="text-sm sm:text-base font-semibold">Admin Privileges</h3>
              <div className="text-xs sm:text-sm text-muted-foreground space-y-2">
                <p>
                  <strong>Faucet Type:</strong> {
                    faucetType === 'dropcode' 
                      ? 'Drop Code - Users need a 6-character code to claim tokens'
                      : faucetType === 'droplist'
                      ? 'Drop List - Only whitelisted addresses can claim tokens'
                      : faucetType === 'custom'
                      ? 'Custom - Each address has individual claim amounts set by admin'
                      : 'Unknown type'
                  }
                </p>
                <p>As an admin, you can perform the following actions on this {faucetType || 'unknown'} faucet:</p>
              </div>
              <ul className="list-disc pl-5 text-xs sm:text-sm text-muted-foreground">
                <li><strong>Fund:</strong> Add tokens to the faucet to enable claims.</li>
                <li><strong>Withdraw:</strong> Retrieve tokens from the faucet.</li>
                <li><strong>Parameters:</strong> Set {
                  faucetType === 'custom' 
                    ? 'timing parameters (start/end times) and social media tasks'
                    : faucetType === 'dropcode'
                    ? 'claim amount, start/end times, social media tasks, and retrieve drop codes (for Auto mode)'
                    : 'claim amount, timing parameters, and social media tasks'
                }.</li>
                {faucetType === 'droplist' && (
                  <li><strong>Drop-list:</strong> Add or remove addresses for restricted claims.</li>
                )}
                {faucetType === 'custom' && (
                  <li><strong>Custom:</strong> Upload a CSV to set specific claim amounts for individual addresses.</li>
                )}
                <li><strong>Admin Power:</strong> Add or remove other admins and reset all claims to allow users to claim again.</li>
                <li><strong>Activity Log:</strong> View the faucet's transaction history.</li>
                {isOwner && (
                  <>
                    <li><strong>Edit Name:</strong> Change the faucet's display name.</li>
                    <li><strong>Delete Faucet:</strong> Permanently remove the faucet (irreversible).</li>
                  </>
                )}
              </ul>
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Use the tabs in the Admin Controls section to access these features. Ensure your wallet is connected to the correct network ({selectedNetwork?.name || "Unknown Network"}) to perform these actions.
            </p>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="dont-show-again"
                checked={dontShowAdminPopupAgain}
                onCheckedChange={(checked) => setDontShowAdminPopupAgain(checked === true)}
              />
              <Label htmlFor="dont-show-again" className="text-xs sm:text-sm">
                Don't show this again for this faucet
              </Label>
            </div>
          </div>
          <DialogFooter>
            <Button
              onClick={handleCloseAdminPopup}
              className="text-xs sm:text-sm w-full hover:bg-accent hover:text-accent-foreground"
            >
              Got It
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  )
}