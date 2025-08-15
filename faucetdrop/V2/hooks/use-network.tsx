// Fixed NetworkContext with proper configurations
"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"
import { ZeroAddress } from "ethers"
import { useToast } from "@/hooks/use-toast"

export interface Network {
  name: string
  chainId: number
  rpcUrl: string
  blockExplorerUrls: string
  explorerUrl?: string
  color: string
  factoryAddresses: string[]
  factories: {
    dropcode?: string
    droplist?: string
    custom?: string
  }
  tokenAddress: string
  nativeCurrency: {
    name: string
    symbol: string
    decimals: number
  }
  isTestnet?: boolean
}

const networks: Network[] = [
  // Mainnet Networks
  {
    name: "Celo",
    chainId: 42220,
    rpcUrl: "https://forno.celo.org",
    blockExplorerUrls: "https://celoscan.io",
    color: "#35D07F",
    factoryAddresses: [
      "0x17cFed7fEce35a9A71D60Fbb5CA52237103A21FB",
      "0x9D6f441b31FBa22700bb3217229eb89b13FB49de",
      "0xE3Ac30fa32E727386a147Fe08b4899Da4115202f",
      "0xF8707b53a2bEc818E96471DDdb34a09F28E0dE6D",
      "0x8D1306b3970278b3AB64D1CE75377BDdf00f61da",
      "0x8cA5975Ded3B2f93E188c05dD6eb16d89b14aeA5"
    ],
    factories: {
      droplist: "0xF8707b53a2bEc818E96471DDdb34a09F28E0dE6D",
      dropcode: "0x8D1306b3970278b3AB64D1CE75377BDdf00f61da",
      custom: "0x8cA5975Ded3B2f93E188c05dD6eb16d89b14aeA5"
    },
    tokenAddress: "0x471EcE3750Da237f93B8E339c536989b8978a438",
    nativeCurrency: {
      name: "Celo",
      symbol: "CELO",
      decimals: 18,
    },
    isTestnet: false,
  },
  {
    name: "Lisk",
    chainId: 1135,
    rpcUrl: "https://rpc.api.lisk.com",
    blockExplorerUrls: "https://blockscout.lisk.com",
    explorerUrl: "https://blockscout.lisk.com",
    color: "#0D4477",
    factoryAddresses: [
      "0x96E9911df17e94F7048cCbF7eccc8D9b5eDeCb5C",
      "0x4F5Cf906b9b2Bf4245dba9F7d2d7F086a2a441C2",
      "0x21E855A5f0E6cF8d0CfE8780eb18e818950dafb7",
      "0xd6Cb67dF496fF739c4eBA2448C1B0B44F4Cf0a7C",
      "0x0837EACf85472891F350cba74937cB02D90E60A4"
    ],
    factories: {
      droplist: "0x0837EACf85472891F350cba74937cB02D90E60A4",
      dropcode: "0xd6Cb67dF496fF739c4eBA2448C1B0B44F4Cf0a7C",
      custom: "0x21E855A5f0E6cF8d0CfE8780eb18e818950dafb7"
    },
    tokenAddress: ZeroAddress,
    nativeCurrency: {
      name: "Lisk",
      symbol: "LISK",
      decimals: 18,
    },
    isTestnet: false,
  },
  {
    name: "Arbitrum",
    chainId: 42161,
    rpcUrl: "https://arb1.arbitrum.io/rpc",
    blockExplorerUrls: "https://arbiscan.io",
    explorerUrl: "https://arbiscan.io",
    color: "#28A0F0",
    factoryAddresses: ["0x0a5C19B5c0f4B9260f0F8966d26bC05AAea2009C",
      "0x42355492298A89eb1EF7FB2fFE4555D979f1Eee9",
      "0x9D6f441b31FBa22700bb3217229eb89b13FB49de"

    ],
    factories: {
      droplist: "0x0a5C19B5c0f4B9260f0F8966d26bC05AAea2009C",
      dropcode: "0x42355492298A89eb1EF7FB2fFE4555D979f1Eee9",
      custom: "0x9D6f441b31FBa22700bb3217229eb89b13FB49de"
    },
    tokenAddress: ZeroAddress,
    nativeCurrency: {
      name: "Ethereum",
      symbol: "ETH",
      decimals: 18,
    },
    isTestnet: false,
  },
{
  name: "Base",
  chainId: 8453,
  rpcUrl: "https://base.publicnode.com", 
  blockExplorerUrls: "https://basescan.org",
  explorerUrl: "https://basescan.org",
  color: "#0052FF",
  factoryAddresses: [
    "0x945431302922b69D500671201CEE62900624C6d5",
    "0xda191fb5Ca50fC95226f7FC91C792927FC968CA9",
    "0x587b840140321DD8002111282748acAdaa8fA206"
  ],
  factories: {
    droplist: "0x945431302922b69D500671201CEE62900624C6d5",
    dropcode: "0xda191fb5Ca50fC95226f7FC91C792927FC968CA9",
    custom: "0x587b840140321DD8002111282748acAdaa8fA206"
  },
  tokenAddress: ZeroAddress,
  nativeCurrency: {
    name: "Ethereum",
    symbol: "ETH",
    decimals: 18,
  },
  isTestnet: false,
}
  
  // // Testnet Networks
  // {
  //   name: "Celo Alfajores",
  //   chainId: 44787,
  //   rpcUrl: "https://alfajores-forno.celo-testnet.org",
  //   blockExplorerUrls: "https://alfajores.celoscan.io",
  //   explorerUrl: "https://alfajores.celoscan.io",
  //   color: "#5FE3A1",
  //   factoryAddresses: [
  //     "0x1234567890123456789012345678901234567890", // Example testnet addresses
  //     "0x2345678901234567890123456789012345678901",
  //     "0x3456789012345678901234567890123456789012"
  //   ],
  //   factories: {
  //     droplist: "0x7614f4C71776B2944445138be09FA160BcE3F790",
  //     dropcode: "0xF84614D384D01Aa13fe79aD5375CcED57504b586",
  //     custom: "0xd9DBAC257e532ec690dca42265A93c811Eed835f"
  //   },
  //   tokenAddress: ZeroAddress,
  //   nativeCurrency: {
  //     name: "Celo",
  //     symbol: "CELO",
  //     decimals: 18,
  //   },
  //   isTestnet: true,
  // },
  // {
  //   name: "Lisk Sepolia",
  //   chainId: 4202,
  //   rpcUrl: "https://rpc.sepolia-api.lisk.com",
  //   blockExplorerUrls: "https://sepolia-blockscout.lisk.com",
  //   explorerUrl: "https://sepolia-blockscout.lisk.com",
  //   color: "#2B5E99",
  //   factoryAddresses: [
  //     "0x52D38daee8458E89C2c997ad16B2b3e61A2E090a",
  //     "0xF8AFd6372aAF40A0694aAaf2848f6311b4f5D958",
  //     "0xDfF67DCc75fACC05E5856BE695ebcc3A9D0Ec2d9"
  //   ],
  //   factories: {
  //     droplist: "0x52D38daee8458E89C2c997ad16B2b3e61A2E090a",
  //     dropcode: "0xF8AFd6372aAF40A0694aAaf2848f6311b4f5D958",
  //     custom: "0xDfF67DCc75fACC05E5856BE695ebcc3A9D0Ec2d9"
  //   },
  //   tokenAddress: ZeroAddress,
  //   nativeCurrency: {
  //     name: "Lisk",
  //     symbol: "LSK",
  //     decimals: 18,
  //   },
  //   isTestnet: true,
  // },
  // {
  //   name: "Arbitrum Sepolia",
  //   chainId: 421614,
  //   rpcUrl: "https://sepolia-rollup.arbitrum.io/rpc",
  //   blockExplorerUrls: "https://sepolia.arbiscan.io",
  //   explorerUrl: "https://sepolia.arbiscan.io",
  //   color: "#5CBFFF",
  //   factoryAddresses: [
  //     "0x17B3d9499a56E9d6f143CB9A8Bec3A99A0C33264",
  //     "0xd041701cC67944fEdc311d7f1825A52b93C4aBF1",
  //     "0xcF97e3E1A25876a15be55F2576f4697A55A67DFC"
  //   ],
  //   factories: {
  //     droplist: "0x17B3d9499a56E9d6f143CB9A8Bec3A99A0C33264",
  //     dropcode: "0xd041701cC67944fEdc311d7f1825A52b93C4aBF1",
  //     custom: "0xcF97e3E1A25876a15be55F2576f4697A55A67DFC"
  //   },
  //   tokenAddress: ZeroAddress,
  //   nativeCurrency: {
  //     name: "Ethereum",
  //     symbol: "ETH",
  //     decimals: 18,
  //   },
  //   isTestnet: true,
  // },
  // {
  //   name: "Base Sepolia",
  //   chainId: 84532,
  //   rpcUrl: "https://sepolia.base.org",
  //   blockExplorerUrls: "https://sepolia.basescan.org",
  //   explorerUrl: "https://sepolia.basescan.org",
  //   color: "#4F8AFF",
  //   factoryAddresses: [
  //     "0x3A4B3D060136462dD57d74792Af10e0669CF47a7",
  //     "0xe60cbc95c882b16DC23C9E6A17eb7bb52344a0E1",
  //     "0x9595D20040dB9E8DF4d1510e967455295EC723a8"
  //   ],
  //   factories: {
  //     droplist: "0xe60cbc95c882b16DC23C9E6A17eb7bb52344a0E1",
  //     dropcode: "0x9595D20040dB9E8DF4d1510e967455295EC723a8",
  //     custom: "0x3A4B3D060136462dD57d74792Af10e0669CF47a7"
  //   },
  //   tokenAddress: ZeroAddress,
  //   nativeCurrency: {
  //     name: "Ethereum",
  //     symbol: "ETH",
  //     decimals: 18,
  //   },
  //   isTestnet: true,
  // },
];

// Rest of the NetworkContext implementation remains the same...
interface NetworkContextType {
  network: Network | null
  networks: Network[]
  setNetwork: (network: Network) => void
  switchNetwork: (chainId: number) => Promise<void>
  getLatestFactoryAddress: (network?: Network) => string | null
  getFactoryAddress: (factoryType: 'dropcode' | 'droplist' | 'custom', network?: Network) => string | null
  isSwitchingNetwork: boolean
  currentChainId: number | null
}

const NetworkContext = createContext<NetworkContextType>({
  network: null,
  networks: networks,
  setNetwork: () => {},
  switchNetwork: async () => {},
  getLatestFactoryAddress: () => null,
  getFactoryAddress: () => null,
  isSwitchingNetwork: false,
  currentChainId: null,
})

export function NetworkProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast()
  const [network, setNetwork] = useState<Network | null>(null)
  const [currentChainId, setCurrentChainId] = useState<number | null>(null)
  const [isSwitchingNetwork, setIsSwitchingNetwork] = useState(false)

  const getLatestFactoryAddress = (targetNetwork?: Network) => {
    const selectedNetwork = targetNetwork || network
    return selectedNetwork?.factoryAddresses[selectedNetwork.factoryAddresses.length - 1] || null
  }

  const getFactoryAddress = (factoryType: 'dropcode' | 'droplist' | 'custom', targetNetwork?: Network) => {
    const selectedNetwork = targetNetwork || network
    if (!selectedNetwork) return null
    
    return selectedNetwork.factories[factoryType] || null
  }

  // Rest of implementation stays the same...
  useEffect(() => {
    const detectCurrentChain = async () => {
      if (typeof window === "undefined" || !window.ethereum) return

      try {
        const chainIdHex = await window.ethereum.request({ method: "eth_chainId" })
        const chainId = Number.parseInt(chainIdHex, 16)
        setCurrentChainId(chainId)
        
        // Auto-set network if it matches
        const currentNetwork = networks.find((n) => n.chainId === chainId)
        if (currentNetwork && !network) {
          setNetwork(currentNetwork)
        }
      } catch (error) {
        console.error("Error detecting chain:", error)
      }
    }

    detectCurrentChain()

    if (window.ethereum) {
      const handleChainChanged = (chainIdHex: string) => {
        try {
          const chainId = Number.parseInt(chainIdHex, 16)
          console.log(`Chain changed to: ${chainId}`)
          setCurrentChainId(chainId)

          const currentNetwork = networks.find((n) => n.chainId === chainId)
          if (currentNetwork) {
            setNetwork(currentNetwork)
            toast({
              title: "Network Changed",
              description: `Switched to ${currentNetwork.name}`,
              variant: "default",
            })
          } else {
            setNetwork(null)
            toast({
              title: "Unsupported Network",
              description: `Chain ID ${chainId} is not supported. Please switch to a supported network.`,
              variant: "destructive",
            })
          }
        } catch (error) {
          console.error("Error handling chain change:", error)
        }
      }

      window.ethereum.on("chainChanged", handleChainChanged)

      return () => {
        if (window.ethereum && window.ethereum.removeListener) {
          window.ethereum.removeListener("chainChanged", handleChainChanged)
        }
      }
    }
  }, [network, toast])

  const switchNetwork = async (chainId: number) => {
    if (typeof window === "undefined" || !window.ethereum) {
      toast({
        title: "No Ethereum Provider",
        description: "Please install MetaMask or another wallet provider",
        variant: "destructive",
      })
      return
    }

    if (isSwitchingNetwork) {
      console.log("Network switch already in progress, skipping")
      return
    }

    const targetNetwork = networks.find((n) => n.chainId === chainId)
    if (!targetNetwork) {
      toast({
        title: "Network Not Supported",
        description: `Chain ID ${chainId} is not supported`,
        variant: "destructive",
      })
      return
    }

    try {
      setIsSwitchingNetwork(true)
      console.log(`Attempting to switch to network ${targetNetwork.name} (${chainId})`)

      await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: `0x${chainId.toString(16)}` }],
      })

      console.log(`Successfully switched to ${targetNetwork.name}`)
      setNetwork(targetNetwork)
      setCurrentChainId(chainId)
      toast({
        title: "Network Switched",
        description: `Successfully switched to ${targetNetwork.name}`,
        variant: "default",
      })
    } catch (error: any) {
      console.warn(`Error switching to ${targetNetwork.name}:`, error)

      if (error.code === 4902) {
        try {
          console.log(`Adding network ${targetNetwork.name} to wallet`)

          await window.ethereum.request({
            method: "wallet_addEthereumChain",
            params: [
              {
                chainId: `0x${chainId.toString(16)}`,
                chainName: targetNetwork.name,
                nativeCurrency: targetNetwork.nativeCurrency,
                rpcUrls: [targetNetwork.rpcUrl],
                blockExplorerUrls: [targetNetwork.blockExplorerUrls],
              },
            ],
          })

          console.log(`Successfully added network ${targetNetwork.name}`)

          await window.ethereum.request({
            method: "wallet_switchEthereumChain",
            params: [{ chainId: `0x${chainId.toString(16)}` }],
          })

          setNetwork(targetNetwork)
          setCurrentChainId(chainId)
          toast({
            title: "Network Switched",
            description: `Successfully switched to ${targetNetwork.name}`,
            variant: "default",
          })
        } catch (addError: any) {
          console.error(`Error adding network ${targetNetwork.name}:`, addError)
          toast({
            title: "Failed to Add Network",
            description: `Could not add ${targetNetwork.name} to your wallet: ${addError.message}`,
            variant: "destructive",
          })
        }
      } else {
        console.error(`Error switching to network ${targetNetwork.name}:`, error)
        toast({
          title: "Network Switch Failed",
          description: `Could not switch to ${targetNetwork.name}: ${error.message}`,
          variant: "destructive",
        })
      }
    } finally {
      setIsSwitchingNetwork(false)
    }
  }

  const handleSetNetwork = (newNetwork: Network) => {
    setNetwork(newNetwork)
    switchNetwork(newNetwork.chainId)
  }

  return (
    <NetworkContext.Provider
      value={{
        network,
        networks,
        setNetwork: handleSetNetwork,
        switchNetwork,
        getLatestFactoryAddress,
        getFactoryAddress,
        isSwitchingNetwork,
        currentChainId,
      }}
    >
      {children}
    </NetworkContext.Provider>
  )
}

export function useNetwork() {
  return useContext(NetworkContext)
}

// Utility functions
export function getMainnetNetworks() {
  return networks.filter(network => !network.isTestnet)
}

export function getTestnetNetworks() {
  return networks.filter(network => network.isTestnet)
}

export function getNetworkByChainId(chainId: number) {
  return networks.find(network => network.chainId === chainId)
}

export function isFactoryTypeAvailable(chainId: number, factoryType: 'dropcode' | 'droplist' | 'custom'): boolean {
  const network = getNetworkByChainId(chainId)
  if (!network) return false
  
  return !!network.factories[factoryType]
}

export function getAvailableFactoryTypes(chainId: number): ('dropcode' | 'droplist' | 'custom')[] {
  const network = getNetworkByChainId(chainId)
  if (!network) return []
  
  const availableTypes: ('dropcode' | 'droplist' | 'custom')[] = []
  
  if (network.factories.dropcode) availableTypes.push('dropcode')
  if (network.factories.droplist) availableTypes.push('droplist')
  if (network.factories.custom) availableTypes.push('custom')
  
  return availableTypes
}