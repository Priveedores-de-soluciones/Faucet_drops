"use client"

import { createContext, useEffect, useState, type ReactNode } from "react"
import { BrowserProvider, type JsonRpcSigner } from "ethers"
import { useNetwork } from "@/hooks/use-network"
import { useToast } from "@/hooks/use-toast"

interface WalletContextType {
  provider: BrowserProvider | null
  signer: JsonRpcSigner | null
  address: string | null
  chainId: number | null
  isConnected: boolean
  connect: () => Promise<void>
  disconnect: () => void
  ensureCorrectNetwork: (requiredChainId: number) => Promise<boolean>
}

export const WalletContext = createContext<WalletContextType>({
  provider: null,
  signer: null,
  address: null,
  chainId: null,
  isConnected: false,
  connect: async () => {},
  disconnect: () => {},
  ensureCorrectNetwork: async () => false,
})

export function WalletProvider({ children }: { children: ReactNode }) {
  const [provider, setProvider] = useState<BrowserProvider | null>(null)
  const [signer, setSigner] = useState<JsonRpcSigner | null>(null)
  const [address, setAddress] = useState<string | null>(null)
  const [chainId, setChainId] = useState<number | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [isConnecting, setIsConnecting] = useState(false)
  const { network, switchNetwork } = useNetwork()
  const { toast } = useToast()

  useEffect(() => {
    if (typeof window !== "undefined" && window.ethereum) {
      const provider = new BrowserProvider(window.ethereum)
      setProvider(provider)

      window.ethereum.on("accountsChanged", handleAccountsChanged)

      const handleChainChanged = (chainIdHex: string) => {
        try {
          const newChainId = Number.parseInt(chainIdHex, 16)
          console.log(`Chain changed to: ${newChainId}`)
          setChainId(newChainId)
          // Reload the page on chain change
          window.location.reload()
        } catch (error) {
          console.error("Error handling chain change:", error)
        }
      }

      window.ethereum.on("chainChanged", handleChainChanged)

      provider
        .getNetwork()
        .then((network) => {
          setChainId(Number(network.chainId))
        })
        .catch(console.error)

      return () => {
        if (window.ethereum && window.ethereum.removeListener) {
          window.ethereum.removeListener("accountsChanged", handleAccountsChanged)
          window.ethereum.removeListener("chainChanged", handleChainChanged)
        }
      }
    }
  }, [])

  const handleAccountsChanged = async (accounts: any) => {
    if (accounts.length === 0) {
      setSigner(null)
      setAddress(null)
      setIsConnected(false)
      // No page reload on disconnect
      console.log("Accounts disconnected")
    } else {
      try {
        if (provider) {
          const signer = await provider.getSigner()
          setSigner(signer)
          const address = await signer.getAddress()
          setAddress(address)
          setIsConnected(true)
          console.log("Accounts connected:", address)
        }
      } catch (error) {
        console.error("Error getting signer:", error)
      }
    }
  }

  const connect = async () => {
    if (isConnecting) {
      console.log("Connection already in progress, skipping")
      return
    }

    if (!window.ethereum) {
      toast({
        title: "MetaMask not found",
        description: "Please install MetaMask to connect your wallet",
        variant: "destructive",
      })
      return
    }

    setIsConnecting(true)

    try {
      if (!provider) {
        const newProvider = new BrowserProvider(window.ethereum)
        setProvider(newProvider)
      }

      // Always request accounts to trigger the wallet popup
      const accounts = await window.ethereum.request({ method: "eth_requestAccounts" })
      await handleAccountsChanged(accounts)

      if (provider) {
        const network = await provider.getNetwork()
        setChainId(Number(network.chainId))
      }
    } catch (error: any) {
      console.error("Error connecting wallet:", error)
      if (error.code !== 4001) { // 4001 is user rejected request
        toast({
          title: "Connection failed",
          description: `Failed to connect wallet: ${error.message}`,
          variant: "destructive",
        })
      }
      throw error
    } finally {
      setIsConnecting(false)
    }
  }

  const disconnect = () => {
    setSigner(null)
    setAddress(null)
    setIsConnected(false)
    // No page reload on disconnect
    console.log("Wallet disconnected")
  }

  const ensureCorrectNetwork = async (requiredChainId: number): Promise<boolean> => {
    if (!isConnected) {
      try {
        await connect()
      } catch (error) {
        return false
      }
    }

    if (chainId !== requiredChainId) {
      console.log(`Network mismatch: current=${chainId}, required=${requiredChainId}`)
      return false
    }

    return true
  }

  return (
    <WalletContext.Provider
      value={{
        provider,
        signer,
        address,
        chainId,
        isConnected,
        connect,
        disconnect,
        ensureCorrectNetwork,
      }}
    >
      {children}
    </WalletContext.Provider>
  )
}