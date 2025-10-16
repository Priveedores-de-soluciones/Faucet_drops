// File: hooks/use-wallet.tsx (WalletProvider)
"use client"

import { createContext, useContext, useEffect, useState, type ReactNode } from "react"
import { BrowserProvider, type JsonRpcSigner } from "ethers"
import { useDisconnect, useSwitchChain, useAccount, useChainId, useConnect } from 'wagmi'
import { useToast } from "@/hooks/use-toast"

interface WalletContextType {
  provider: BrowserProvider | null
  signer: JsonRpcSigner | null
  address: string | null
  chainId: number | null
  isConnected: boolean
  isConnecting: boolean
  connect: () => Promise<void>
  disconnect: () => void
  ensureCorrectNetwork: (requiredChainId: number) => Promise<boolean>
  switchChain: (newChainId: number) => Promise<void>
}

export const WalletContext = createContext<WalletContextType>({
  provider: null,
  signer: null,
  address: null,
  chainId: null,
  isConnected: false,
  isConnecting: false,
  connect: async () => {},
  disconnect: () => {},
  ensureCorrectNetwork: async () => false,
  switchChain: async () => {},
})

export function WalletProvider({ children }: { children: ReactNode }) {
  const [provider, setProvider] = useState<BrowserProvider | null>(null)
  const [signer, setSigner] = useState<JsonRpcSigner | null>(null)
  const { toast } = useToast()
  
  const { connectAsync } = useConnect()
  const { disconnect: wagmiDisconnect } = useDisconnect()
  const { switchChain: wagmiSwitchChain } = useSwitchChain()
  
  const { address, isConnected, isConnecting } = useAccount()
  const chainId = useChainId()

  useEffect(() => {
    const updateProviderAndSigner = async () => {
      if (isConnected && address && typeof window !== 'undefined' && window.ethereum) {
        try {
          console.log('Setting up provider for address:', address, 'chainId:', chainId)
          const ethersProvider = new BrowserProvider(window.ethereum)
          const ethersSigner = await ethersProvider.getSigner()
          
          setProvider(ethersProvider)
          setSigner(ethersSigner)
          
          console.log('✅ Wallet connected successfully:', { 
            address, 
            chainId,
            hasProvider: !!ethersProvider,
            hasSigner: !!ethersSigner
          })
        } catch (error) {
          console.error('❌ Error setting up provider/signer:', error)
          setProvider(null)
          setSigner(null)
        }
      } else {
        console.log('Wallet not connected, clearing provider and signer')
        setProvider(null)
        setSigner(null)
      }
    }

    updateProviderAndSigner()
  }, [isConnected, address, chainId])

  useEffect(() => {
    console.log('🔄 WalletProvider Connection state:', {
      isConnected,
      isConnecting,
      address: address ? `${address.slice(0, 6)}...${address.slice(-4)}` : null,
      chainId,
      hasProvider: !!provider,
      hasSigner: !!signer,
      fullAddress: address // for debugging
    })
  }, [isConnected, isConnecting, address, chainId, provider, signer])

  const connect = async () => {
    try {
      console.log('Opening wallet connection modal...')
      await connectAsync()
    } catch (error: any) {
      console.error("Error connecting wallet:", error)
      toast({
        title: "Connection failed",
        description: error.message || "Failed to connect wallet",
        variant: "destructive",
      })
    }
  }

  const disconnect = () => {
    try {
      console.log('Disconnecting wallet...')
      wagmiDisconnect()
      setProvider(null)
      setSigner(null)
      
      toast({
        title: "Wallet disconnected",
        description: "Your wallet has been disconnected",
      })
    } catch (error) {
      console.error("Error disconnecting:", error)
    }
  }

  const switchChain = async (newChainId: number) => {
    try {
      console.log('Switching to chain:', newChainId)
      await wagmiSwitchChain({ chainId: newChainId })
      
      toast({
        title: "Network switched",
        description: `Switched to chain ${newChainId}`,
      })
    } catch (error: any) {
      console.error("Failed to switch network:", error)
      toast({
        title: "Network switch failed",
        description: error.message || "Failed to switch network",
        variant: "destructive",
      })
      throw error
    }
  }

  const ensureCorrectNetwork = async (requiredChainId: number): Promise<boolean> => {
    console.log('Ensuring correct network:', { 
      current: chainId, 
      required: requiredChainId,
      isConnected 
    })
    
    if (!isConnected) {
      console.log('Wallet not connected, opening connection modal...')
      try {
        await connect()
        await new Promise(resolve => setTimeout(resolve, 2000))
      } catch (error) {
        console.error('Failed to connect wallet:', error)
        return false
      }
    }

    if (chainId !== requiredChainId) {
      console.log(`Network mismatch: current=${chainId}, required=${requiredChainId}`)
      try {
        await switchChain(requiredChainId)
        await new Promise(resolve => setTimeout(resolve, 1500))
        return true
      } catch (error) {
        console.error('Failed to switch network:', error)
        return false
      }
    }

    console.log('✅ On correct network')
    return true
  }

  // Additional validation for connection state
  const actuallyConnected = isConnected && !!address
  
  return (
    <WalletContext.Provider
      value={{
        provider,
        signer,
        address: address || null,
        chainId: chainId || null,
        isConnected: actuallyConnected, // Use validated connection state
        isConnecting,
        connect,
        disconnect,
        ensureCorrectNetwork,
        switchChain,
      }}
    >
      {children}
    </WalletContext.Provider>
  )
}

export function useWallet() {
  const context = useContext(WalletContext)
  
  useEffect(() => {
    console.log('useWallet hook state:', {
      address: context.address,
      isConnected: context.isConnected,
      chainId: context.chainId,
      hasProvider: !!context.provider,
      hasSigner: !!context.signer
    })
  }, [context])
  
  return context
}