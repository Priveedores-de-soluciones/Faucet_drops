"use client"

import { createContext, useContext, useEffect, useState, type ReactNode } from "react"
import { BrowserProvider, type JsonRpcSigner } from "ethers"
import { useDisconnect, useSwitchChain, useChainId } from 'wagmi'
import { usePrivy, useWallets } from '@privy-io/react-auth'
import { toast } from "sonner"

interface WalletContextType {
  provider: BrowserProvider | null
  signer: JsonRpcSigner | null
  address: string | null
  chainId: number | null
  isConnected: boolean
  isConnecting: boolean
  walletType: 'embedded' | 'external' | null
  connect: () => Promise<void>
  disconnect: () => Promise<void>
  disconnectExternalWallet: () => Promise<void> 
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
  walletType: null,
  connect: async () => {},
  disconnect: async () => {},
  disconnectExternalWallet: async () => {},
  ensureCorrectNetwork: async () => false,
  switchChain: async () => {},
})

export function WalletProvider({ children }: { children: ReactNode }) {
  const [provider, setProvider] = useState<BrowserProvider | null>(null)
  const [signer, setSigner] = useState<JsonRpcSigner | null>(null)
  const [walletType, setWalletType] = useState<'embedded' | 'external' | null>(null)
  
  // Privy hooks
  const { ready, authenticated, login, logout, user } = usePrivy()
  const { wallets } = useWallets()
  
  // Wagmi hooks
  const { disconnect: wagmiDisconnect } = useDisconnect()
  const { switchChain: wagmiSwitchChain } = useSwitchChain()
  const chainId = useChainId()

  const getActiveWallet = () => {
    if (!authenticated || wallets.length === 0) return null
    
    // Prioritize embedded wallet
    const embeddedWallet = wallets.find(w => w.walletClientType === 'privy')
    const externalWallet = wallets.find(w => w.walletClientType !== 'privy')
    
    // Check if user has ANY standard social auth method
    const hasAuthMethod = user?.email || user?.google || user?.twitter || user?.discord || user?.telegram
    
    if (hasAuthMethod && embeddedWallet) {
      return embeddedWallet
    }
    
    return embeddedWallet || externalWallet || wallets[0]
  }

  const activeWallet = getActiveWallet()
  const address = activeWallet?.address || null
  
  // Derived state
  const isConnected = ready && authenticated && !!address && !!signer
  // FIX 1: Single declaration. Do not spin if authenticated but 0 physical wallets exist
  const isConnecting = !ready || (authenticated && wallets.length > 0 && !address)

  // FIX 2: The "Missing Wallet" Safety Net Detector for Mobile
  useEffect(() => {
    if (ready && authenticated && wallets.length === 0) {
      // Delay slightly to give Privy a moment to inject the wallet
      const timer = setTimeout(() => {
        if (wallets.length === 0) {
          toast.error(
            "Account recognized, but your external wallet is missing on this device. Please log in using WalletConnect or your mobile wallet app browser.", 
            { duration: 6000 }
          )
          logout() // Gracefully log them out so they aren't stuck on a blank screen
        }
      }, 2500)
      return () => clearTimeout(timer)
    }
  }, [ready, authenticated, wallets.length, logout])

  // Auto-disconnect external wallet if embedded wallet exists + user has auth method
  useEffect(() => {
    const autoDisconnectExternal = async () => {
      if (!authenticated || wallets.length <= 1) return
      
      const embeddedWallet = wallets.find(w => w.walletClientType === 'privy')
      const externalWallet = wallets.find(w => w.walletClientType !== 'privy')
      const hasAuthMethod = user?.email || user?.google || user?.twitter || user?.discord || user?.telegram
      
      if (hasAuthMethod && embeddedWallet && externalWallet) {
        try {
          await externalWallet.disconnect()
          wagmiDisconnect()
          toast.info("Switched to embedded wallet")
        } catch (error) {
          console.error('[WalletProvider] Failed to disconnect external wallet:', error)
        }
      }
    }

    autoDisconnectExternal()
  }, [authenticated, wallets, user, wagmiDisconnect])

  // Setup provider from the active wallet
  useEffect(() => {
    let isMounted = true

    const setupProvider = async () => {
      if (!activeWallet) {
        if (isMounted) {
          setProvider(null)
          setSigner(null)
          setWalletType(null)
        }
        return
      }

      try {
        const isEmbedded = activeWallet.walletClientType === 'privy'
        const ethereumProvider = await activeWallet.getEthereumProvider()
        const ethersProvider = new BrowserProvider(ethereumProvider)
        const ethersSigner = await ethersProvider.getSigner()
        
        if (isMounted) {
          setProvider(ethersProvider)
          setSigner(ethersSigner)
          setWalletType(isEmbedded ? 'embedded' : 'external')
        }
      } catch (error) {
        console.error('❌ [WalletProvider] Error setting up wallet:', error)
        
        // FIX 3: Catch Provider initialization failures
        if (activeWallet.walletClientType !== 'privy') {
          toast.error("Could not connect to your wallet app. Please ensure it is unlocked.", { duration: 5000 })
          logout()
        }
        
        if (isMounted) {
          setProvider(null)
          setSigner(null)
          setWalletType(null)
        }
      }
    }

    setupProvider()

    // Cleanup to prevent memory leaks
    return () => {
      isMounted = false
    }
  }, [authenticated, wallets, activeWallet, logout])

  const connect = async () => {
    try {
      await login()
    } catch (error: any) {
      toast.error("Failed to connect wallet")
    }
  }

  const disconnect = async () => {
    try {
      wagmiDisconnect()
      setProvider(null)
      setSigner(null)
      setWalletType(null)
      await logout()
      toast.warning("Wallet disconnected")
    } catch (error) {
      console.error("[WalletProvider] Error disconnecting:", error)
    }
  }

  const disconnectExternalWallet = async () => {
    try {
      const externalWallet = wallets.find(w => w.walletClientType !== 'privy')
      if (externalWallet) {
        await externalWallet.disconnect()
        wagmiDisconnect()
        toast.success("External wallet disconnected")
      }
    } catch (error) {
      toast.error("Failed to disconnect external wallet")
    }
  }

  const switchChain = async (newChainId: number) => {
    try {
      if (!activeWallet) throw new Error("No wallet connected")
      await wagmiSwitchChain({ chainId: newChainId })
      toast.success("Network switched")
    } catch (error: any) {
      toast.error("Failed to switch network")
      throw error
    }
  }

  const ensureCorrectNetwork = async (requiredChainId: number): Promise<boolean> => {
    if (!isConnected) {
      try {
        await connect()
        await new Promise(resolve => setTimeout(resolve, 2000))
      } catch (error) {
        return false
      }
    }

    if (chainId !== requiredChainId) {
      try {
        await switchChain(requiredChainId)
        await new Promise(resolve => setTimeout(resolve, 1500))
        return true
      } catch (error) {
        return false
      }
    }
    return true
  }

  return (
    <WalletContext.Provider
      value={{
        provider,
        signer,
        address,
        chainId: chainId || null,
        isConnected,
        isConnecting,
        walletType,
        connect,
        disconnect,
        disconnectExternalWallet,
        ensureCorrectNetwork,
        switchChain,
      }}
    >
      {children}
    </WalletContext.Provider>
  )
}

export function useWallet() {
  return useContext(WalletContext)
}