// File: app/page.tsx (or components/home.tsx - the main Home component)
"use client"

import { FaucetList } from "@/components/faucet-list"
import { NetworkSelector } from "@/components/network-selector"
import {  WalletConnectButton } from "@/components/wallet-connect"
import { AnalyticsDashboard } from "@/components/analytics-dashboard"
import { DroplistTasks } from "@/components/droplist"
import { Button } from "@/components/ui/button"
import { Plus, Users, Loader2 } from "lucide-react"
import { NetworkDebugPanel } from "@/components/network-debug-panel" 
import Link from "next/link"
import Image from "next/image"
import { Contract, ethers } from "ethers"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { appendDivviReferralData, reportTransactionToDivvi, isSupportedNetwork } from "../lib/divvi-integration"
import { NetworkGrid } from "@/components/network"
import { useWallet } from "@/hooks/use-wallet"
import { useToast } from "@/hooks/use-toast"

// Smart contract details
const DROPLIST_CONTRACT_ADDRESS = "0xB8De8f37B263324C44FD4874a7FB7A0C59D8C58E"
const CHECKIN_ABI = [
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true, "internalType": "address", "name": "user", "type": "address" },
      { "indexed": false, "internalType": "uint256", "name": "timestamp", "type": "uint256" },
      { "indexed": false, "internalType": "uint256", "name": "balance", "type": "uint256" }
    ],
    "name": "CheckIn",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true, "internalType": "address", "name": "user", "type": "address" },
      { "indexed": false, "internalType": "uint256", "name": "participantCount", "type": "uint256" }
    ],
    "name": "NewParticipant",
    "type": "event"
  },
  {
    "inputs": [
      { "internalType": "address", "name": "user", "type": "address" }
    ],
    "name": "addressToString",
    "outputs": [
      { "internalType": "string", "name": "", "type": "string" }
    ],
    "stateMutability": "pure",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "droplist",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getAllParticipants",
    "outputs": [
      { "internalType": "address[]", "name": "", "type": "address[]" }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "address", "name": "user", "type": "address" }
    ],
    "name": "getBalance",
    "outputs": [
      { "internalType": "uint256", "name": "", "type": "uint256" }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "uint256", "name": "index", "type": "uint256" }
    ],
    "name": "getParticipant",
    "outputs": [
      { "internalType": "address", "name": "", "type": "address" }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getTotalTransactions",
    "outputs": [
      { "internalType": "uint256", "name": "", "type": "uint256" }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getUniqueParticipantCount",
    "outputs": [
      { "internalType": "uint256", "name": "", "type": "uint256" }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "address", "name": "user", "type": "address" }
    ],
    "name": "hasAddressParticipated",
    "outputs": [
      { "internalType": "bool", "name": "", "type": "bool" }
    ],
    "stateMutability": "view",
    "type": "function"
  }
]

// Helper function to safely extract error information
const getErrorInfo = (error: unknown): { code?: string | number; message: string } => {
  if (error && typeof error === "object") {
    const errorObj = error as any
    return {
      code: errorObj.code,
      message: errorObj.message || "Unknown error occurred",
    }
  }
  return {
    message: typeof error === "string" ? error : "Unknown error occurred",
  }
}

export default function Home() {
  const router = useRouter()
  const { address, isConnected, signer, chainId, ensureCorrectNetwork } = useWallet()
  const { toast } = useToast()
  
  // Existing states
  const [isCheckingIn, setIsCheckingIn] = useState(false)
  const [checkInStatus, setCheckInStatus] = useState("")
  const [isAllowedAddress, setIsAllowedAddress] = useState(false)
  const [isDivviSubmitted, setIsDivviSubmitted] = useState(false)
  const [currentNetwork, setCurrentNetwork] = useState<"celo" | "lisk" | null>(null)
  
  // Loading states
  const [isNavigatingToCreate, setIsNavigatingToCreate] = useState(false)
  const [isNavigatingToVerify, setIsNavigatingToVerify] = useState(false)
  const [isNetworkSelectorLoading, setIsNetworkSelectorLoading] = useState(false)
  const [isJoiningDroplist, setIsJoiningDroplist] = useState(false)
  
  // New droplist states
  const [isDroplistOpen, setIsDroplistOpen] = useState(false)
  const [droplistNotification, setDroplistNotification] = useState<string | null>(null)

  // Handle navigation with loading
  const handleCreateFaucetClick = async (e: React.MouseEvent) => {
    e.preventDefault()
    setIsNavigatingToCreate(true)
    
    try {
      await new Promise(resolve => setTimeout(resolve, 100)) // Small delay for UX
      router.push('/create')
    } catch (error) {
      console.error('Navigation error:', error)
      setIsNavigatingToCreate(false)
    }
  }

  const handleVerifyClick = async (e: React.MouseEvent) => {
    e.preventDefault()
    setIsNavigatingToVerify(true)
    
    try {
      await new Promise(resolve => setTimeout(resolve, 100)) // Small delay for UX
      router.push('/verify')
    } catch (error) {
      console.error('Navigation error:', error)
      setIsNavigatingToVerify(false)
    }
  }

  // Handle droplist modal
  const handleDroplistClick = () => {
    setIsDroplistOpen(true)
    setDroplistNotification(null)
  }

  const handleDroplistClose = () => {
    setIsDroplistOpen(false)
  }

  // Handle network selector loading
  const handleNetworkSelectorChange = async (network: string) => {
    setIsNetworkSelectorLoading(true)
    try {
      await new Promise(resolve => setTimeout(resolve, 1000)) // Simulate network switch
      setCurrentNetwork(network as "celo" | "lisk")
    } catch (error) {
      console.error('Network switch error:', error)
    } finally {
      setIsNetworkSelectorLoading(false)
    }
  }

  // Handle joining droplist
  const handleJoinDroplist = async () => {
    console.log('Join Droplist clicked', { isConnected, address, chainId })
    
    if (!isConnected || !address || !signer) {
      setDroplistNotification("Please connect your wallet first")
      toast({
        title: "Wallet not connected",
        description: "Please connect your wallet to join the droplist",
        variant: "destructive",
      })
      return
    }

    // Ensure correct network (Celo, chain ID 42220)
    const isCorrectNetwork = await ensureCorrectNetwork(42220)
    if (!isCorrectNetwork) {
      setDroplistNotification("Please switch to the Celo network to join the droplist")
      toast({
        title: "Incorrect network",
        description: "Please switch to the Celo network (chain ID 42220)",
        variant: "destructive",
      })
      return
    }

    setIsJoiningDroplist(true)
    setDroplistNotification(null)

    try {
      const contract = new Contract(DROPLIST_CONTRACT_ADDRESS, CHECKIN_ABI, signer)

      // Estimate gas
      let gasLimit: bigint
      try {
        gasLimit = await contract.droplist.estimateGas()
      } catch (error) {
        console.error('Gas estimation error:', getErrorInfo(error))
        throw new Error('Failed to estimate gas for droplist transaction')
      }

      // Add 20% buffer using BigInt operations
      const gasLimitWithBuffer = (gasLimit * BigInt(120)) / BigInt(100)

      // Prepare transaction data
      const txData = contract.interface.encodeFunctionData("droplist", [])
      const enhancedData = appendDivviReferralData(txData, address as `0x${string}`)

      // Send transaction
      const tx = await signer.sendTransaction({
        to: DROPLIST_CONTRACT_ADDRESS,
        data: enhancedData,
        gasLimit: gasLimitWithBuffer,
      })

      console.log('Transaction sent:', tx.hash)

      // Wait for transaction confirmation
      const receipt = await tx.wait()
      
      // Report to Divvi
      await reportTransactionToDivvi(tx.hash as `0x${string}`, chainId!)

      setDroplistNotification("Successfully joined the droplist!")
      setIsDivviSubmitted(true)
      toast({
        title: "Success",
        description: "You have successfully joined the droplist!",
      })

    } catch (error) {
      console.error('Droplist join error:', getErrorInfo(error))
      const errorInfo = getErrorInfo(error)
      setDroplistNotification(`Failed to join droplist: ${errorInfo.message}`)
      toast({
        title: "Error",
        description: `Failed to join droplist: ${errorInfo.message}`,
        variant: "destructive",
      })
    } finally {
      setIsJoiningDroplist(false)
    }
  }

  // Clean up event listener
  useEffect(() => {
    let contract: Contract | null = null
    if (isConnected && address && chainId && signer) {
      try {
        contract = new Contract(DROPLIST_CONTRACT_ADDRESS, CHECKIN_ABI, signer)
        const listener = (user: string, participantCount: bigint) => {
          if (user.toLowerCase() === address.toLowerCase()) {
            setDroplistNotification(`Joined droplist! Total participants: ${participantCount}`)
            toast({
              title: "Droplist Joined",
              description: `Total participants: ${participantCount}`,
            })
          }
        }
        contract.on("NewParticipant", listener)
        return () => {
          contract?.off("NewParticipant", listener)
        }
      } catch (error) {
        console.error('Error setting up event listener:', getErrorInfo(error))
      }
    }
  }, [isConnected, address, chainId, signer])

  // Reset navigation loading states
  useEffect(() => {
    const handleRouteChange = () => {
      setIsNavigatingToCreate(false)
      setIsNavigatingToVerify(false)
    }
    return () => {
      handleRouteChange()
    }
  }, [])

  // Show notification
  useEffect(() => {
    if (droplistNotification) {
      const timer = setTimeout(() => {
        setDroplistNotification(null)
      }, 5000)
      return () => clearTimeout(timer)
    }
  }, [droplistNotification])

  // Debug button state
  useEffect(() => {
    console.log('Button state:', { isConnected, isJoiningDroplist, disabled: !isConnected || isJoiningDroplist || !chainId || !isSupportedNetwork(chainId!), address, chainId })
  }, [isConnected, isJoiningDroplist, address, chainId])

  return (
     <main className="bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <div className="container mx-auto px-3 sm:px-4 lg:px-6 py-4 sm:py-6 lg:py-8">
        <div className="flex flex-col gap-4 sm:gap-6 lg:gap-8">
          {/* Header Section */}
          <header className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 p-4 sm:p-6">
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 sm:gap-6">
              {/* Logo and Title */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4 w-full lg:w-auto min-w-0">
                <div className="flex flex-col min-w-0">
                  <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                    <div className="flex-shrink-0">
                      <Image
                        src="/logo.png"
                        alt="FaucetDrops Logo"
                        width={32}
                        height={32}
                        className="w-7 h-7 sm:w-8 sm:h-8 lg:w-10 lg:h-10 rounded-md object-contain"
                      />
                    </div>
                    <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-slate-900 dark:text-slate-100 truncate">
                      FaucetDrops
                    </h1>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:gap-1">
                    <span className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
                      Free, Fast, Fair & Frictionless 
                    </span>
                    <span className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
                      Token Distribution 💧
                    </span> 
                  </div>
                </div>
                <div className="ml-auto sm:ml-0 flex-shrink-0">
                  <NetworkSelector />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 w-full lg:w-auto lg:flex-shrink-0">
                <div className="flex flex-col xs:flex-row gap-2 sm:gap-3 w-full sm:w-auto">
                  <Button 
                    onClick={() => router.push('/create')}
                    size="sm"
                    className="w-full sm:w-auto flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700"
                  >
                    <Plus className="h-4 w-4 flex-shrink-0" />
                    <span className="hidden xs:inline">Create Faucet</span>
                    <span className="xs:hidden">Create</span>
                  </Button>

                  <Button 
                    onClick={handleJoinDroplist}
                    disabled={!isConnected || isJoiningDroplist}
                    size="sm"
                    className="w-full sm:w-auto flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700"
                  >
                    {isJoiningDroplist ? (
                      <Loader2 className="h-4 w-4 flex-shrink-0 animate-spin" />
                    ) : (
                      <Users className="h-4 w-4 flex-shrink-0" />
                    )}
                    <span className="hidden xs:inline">
                      {isJoiningDroplist ? "Droplisting..." : "Join Droplist"}
                    </span>
                    <span className="xs:hidden">
                      {isJoiningDroplist ? "Droplisting..." : "Droplist"}
                    </span>
                  </Button>
                </div>

                <div className="flex flex-col xs:flex-row gap-2 sm:gap-3 w-full sm:w-auto">
                  <WalletConnectButton />
                </div>
              </div>
            </div>
          </header>

          {/* User Info Card (for mobile) */}
          {isConnected && address && (
            <div className="lg:hidden bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 p-3 sm:p-4">
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Wallet</span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300 font-mono break-all">
                  {address}
                </p>
                {currentNetwork && (
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Network</span>
                    <span className="text-xs px-2 py-1 bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 rounded-full capitalize whitespace-nowrap">
                      {currentNetwork}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Main Content */}
          <div className="flex flex-col gap-4 sm:gap-6 lg:gap-8">
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
              <NetworkGrid />
            </div>
            
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
              <AnalyticsDashboard /> 
            </div>
            
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
              <FaucetList />
            </div>
          </div>
        </div>
      </div>

      {/* Droplist Tasks Modal */}
      <DroplistTasks
        isOpen={isDroplistOpen}
        onClose={handleDroplistClose}
        userAddress={address || ""}
        isWalletConnected={isConnected}
      />
      
    </main>
  )
}