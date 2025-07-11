"use client"

import { FaucetList } from "@/components/faucet-list"
import { NetworkSelector } from "@/components/network-selector"
import { WalletConnect } from "@/components/wallet-connect"
import { AnalyticsDashboard } from "@/components/analytics-dashboard"
import { Button } from "@/components/ui/button"
import { Plus, Users } from "lucide-react"
import Link from "next/link"
import Image from "next/image"
import { ethers, Contract } from "ethers"
import { useState, useEffect } from "react"
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
  const [isCheckingIn, setIsCheckingIn] = useState(false)
  const [checkInStatus, setCheckInStatus] = useState("")
  const [isWalletConnected, setIsWalletConnected] = useState(false)
  const [userAddress, setUserAddress] = useState("")
  const [isAllowedAddress, setIsAllowedAddress] = useState(false)
  const [isDivviSubmitted, setIsDivviSubmitted] = useState(false)
  const [currentNetwork, setCurrentNetwork] = useState<"celo" | "lisk" | null>(null)


  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <div className="container mx-auto px-3 sm:px-4 lg:px-6 py-4 sm:py-6 lg:py-8">
        <div className="flex flex-col gap-4 sm:gap-6 lg:gap-8">
          {/* Header Section */}
          <header className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 p-4 sm:p-6">
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 sm:gap-6">
              {/* Logo and Title */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4 w-full lg:w-auto">
                <div className="flex items-center gap-2 sm:gap-3">
                  <Image
                    src="/logo.png"
                    alt="FaucetDrops Logo"
                    width={28}
                    height={28}
                    className="sm:w-8 sm:h-8 lg:w-10 lg:h-10 rounded-md"
                  />
                  <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-slate-900 dark:text-slate-100">
                    FaucetDrops
                  </h1>
                </div>
                <div className="ml-auto sm:ml-0">
                  <NetworkSelector />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 w-full lg:w-auto">
                <div className="flex flex-col xs:flex-row gap-2 sm:gap-3 w-full sm:w-auto">
                  <Link href="/batch-claim" className="flex-1 xs:flex-none">
                    <Button 
                      variant="outline" 
                      className="w-full sm:w-auto flex items-center justify-center gap-2 text-sm hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                    >
                      <Users className="h-4 w-4" />
                      <span className="hidden xs:inline">Batch Claim</span>
                      <span className="xs:hidden">Batch</span>
                    </Button>
                  </Link>
                  
                  <Link href="/create" className="flex-1 xs:flex-none">
                    <Button className="w-full sm:w-auto flex items-center justify-center gap-2 text-sm bg-blue-600 hover:bg-blue-700 transition-colors">
                      <Plus className="h-4 w-4" />
                      <span className="hidden xs:inline">Create Faucet</span>
                      <span className="xs:hidden">Create</span>
                    </Button>
                  </Link>
                </div>

                <div className="flex flex-col xs:flex-row gap-2 sm:gap-3 w-full sm:w-auto">
                  <div className="flex-1 xs:flex-none">
                    <WalletConnect />
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
                    <span className="text-xs px-2 py-1 bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 rounded-full capitalize">
                      {currentNetwork}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Main Content */}
          <div className="space-y-6 sm:space-y-8">
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
    </main>
  )
    }
