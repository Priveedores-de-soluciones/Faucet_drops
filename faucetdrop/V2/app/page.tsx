"use client"

import { FaucetList } from "@/components/faucet-list"
import { NetworkSelector } from "@/components/network-selector"
import { WalletConnect } from "@/components/wallet-connect"
import { AnalyticsDashboard } from "@/components/analytics-dashboard"
import { Button } from "@/components/ui/button"
import { Plus, Users, Loader2 } from "lucide-react"
import Link from "next/link"
import Image from "next/image"
import { ethers, Contract } from "ethers"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { appendDivviReferralData, reportTransactionToDivvi } from "../lib/divvi-integration"
import { NetworkGrid } from "@/components/network"

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
  
  // Existing states
  const [isCheckingIn, setIsCheckingIn] = useState(false)
  const [checkInStatus, setCheckInStatus] = useState("")
  const [isWalletConnected, setIsWalletConnected] = useState(false)
  const [userAddress, setUserAddress] = useState("")
  const [isAllowedAddress, setIsAllowedAddress] = useState(false)
  const [isDivviSubmitted, setIsDivviSubmitted] = useState(false)
  const [currentNetwork, setCurrentNetwork] = useState<"celo" | "lisk" | null>(null)
  
  // Loading states
  const [isNavigatingToCreate, setIsNavigatingToCreate] = useState(false)
  const [isNavigatingToVerify, setIsNavigatingToVerify] = useState(false)
  const [isNetworkSelectorLoading, setIsNetworkSelectorLoading] = useState(false)
  const [isWalletConnectLoading, setIsWalletConnectLoading] = useState(false)

  // Handle navigation with loading
  const handleCreateFaucetClick = async (e: React.MouseEvent) => {
    e.preventDefault()
    setIsNavigatingToCreate(true)
    
    try {
      // Add any pre-navigation logic here if needed
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
      // Add any pre-navigation logic here if needed
      await new Promise(resolve => setTimeout(resolve, 100)) // Small delay for UX
      router.push('/verify')
    } catch (error) {
      console.error('Navigation error:', error)
      setIsNavigatingToVerify(false)
    }
  }

  // Handle network selector loading
  const handleNetworkSelectorChange = async (network: string) => {
    setIsNetworkSelectorLoading(true)
    try {
      // Add your network switching logic here
      await new Promise(resolve => setTimeout(resolve, 1000)) // Simulate network switch
      setCurrentNetwork(network as "celo" | "lisk")
    } catch (error) {
      console.error('Network switch error:', error)
    } finally {
      setIsNetworkSelectorLoading(false)
    }
  }

  // Handle wallet connection loading
  const handleWalletConnect = async () => {
    setIsWalletConnectLoading(true)
    try {
      // Add your wallet connection logic here
      await new Promise(resolve => setTimeout(resolve, 2000)) // Simulate wallet connection
      setIsWalletConnected(true)
      setUserAddress("0x1234...5678") // Replace with actual address
    } catch (error) {
      console.error('Wallet connection error:', error)
    } finally {
      setIsWalletConnectLoading(false)
    }
  }

  // Reset navigation loading states when component unmounts or navigation completes
  useEffect(() => {
    const handleRouteChange = () => {
      setIsNavigatingToCreate(false)
      setIsNavigatingToVerify(false)
    }

    // Listen for route changes (if using Next.js router events)
    return () => {
      handleRouteChange()
    }
  }, [])

  return (
    <main className="bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <div className="container mx-auto px-3 sm:px-4 lg:px-6 py-4 sm:py-6 lg:py-8">
        <div className="flex flex-col gap-4 sm:gap-6 lg:gap-8">
          {/* Header Section */}
          <header className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 p-4 sm:p-6">
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 sm:gap-6">
              {/* Logo and Title */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4 w-full lg:w-auto min-w-0">
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
                <div className="ml-auto sm:ml-0 flex-shrink-0">
                  <NetworkSelector 
                    onNetworkChange={handleNetworkSelectorChange}
                    isLoading={isNetworkSelectorLoading}
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 w-full lg:w-auto lg:flex-shrink-0">
                <div className="flex flex-col xs:flex-row gap-2 sm:gap-3 w-full sm:w-auto">
                  <Button 
                    onClick={handleCreateFaucetClick}
                    disabled={isNavigatingToCreate}
                    size="sm"
                    className="w-full sm:w-auto flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 transition-colors whitespace-nowrap"
                  >
                    {isNavigatingToCreate ? (
                      <Loader2 className="h-4 w-4 flex-shrink-0 animate-spin" />
                    ) : (
                      <Plus className="h-4 w-4 flex-shrink-0" />
                    )}
                    <span className="hidden xs:inline">
                      {isNavigatingToCreate ? "Loading..." : "Create Faucet"}
                    </span>
                    <span className="xs:hidden">
                      {isNavigatingToCreate ? "Loading..." : "Create"}
                    </span>
                  </Button>
                </div>

                <div className="flex flex-col xs:flex-row gap-2 sm:gap-3 w-full sm:w-auto">
                  <div className="flex-1 xs:flex-none">
                    <WalletConnect 
                      onConnect={handleWalletConnect}
                      isLoading={isWalletConnectLoading}
                    />
                  </div>
                </div>
              </div>
            </div>
          </header>

          {/* User Info Card (for mobile) */}
          {isWalletConnected && (
            <div className="lg:hidden bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 p-3 sm:p-4">
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Wallet</span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300 font-mono break-all">
                  {userAddress}
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
            
            <div className="flex flex-col xs:flex-row gap-2 sm:gap-3 w-full sm:w-auto">
              <Button 
                onClick={handleVerifyClick}
                disabled={isNavigatingToVerify}
                variant="outline" 
                size="sm"
                className="w-full sm:w-auto flex items-center justify-center gap-2 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50 transition-colors whitespace-nowrap"
              >
                {isNavigatingToVerify ? (
                  <Loader2 className="h-4 w-4 flex-shrink-0 animate-spin" />
                ) : (
                  <Users className="h-4 w-4 flex-shrink-0" />
                )}
                <span className="hidden xs:inline">
                  {isNavigatingToVerify ? "Loading..." : "Verify"}
                </span>
                <span className="xs:hidden">
                  {isNavigatingToVerify ? "Loading..." : "Verify"}
                </span>
              </Button>
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
    </main>
  )
}