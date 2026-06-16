"use client"
import { createContext, useContext, useState, useEffect, useCallback, useRef, type ReactNode } from "react"
import { ZeroAddress, FallbackProvider, JsonRpcProvider } from "ethers"
import { useToast } from "@/hooks/use-toast"
import { useWallet } from "@/hooks/use-wallet"
// Solana wallet-adapter — only the publicKey/connected fields are needed here
import { useWallet as useSolanaWallet } from "@solana/wallet-adapter-react"

export const SOLANA_CHAIN_ID = 102

export interface Network {
  name: string
  symbol: string
  chainId: number
  rpcUrl: string | string[]
  blockExplorerUrls: string
  explorerUrl?: string
  color: string
  logoUrl: string
  iconUrl?: string
  factoryAddresses: string[]
  factories: {
    dropcode?: string
    droplist?: string
    custom?: string
    quest?: string
    quiz?: string
  }
  tokenAddress: string
  nativeCurrency: {
    name: string
    symbol: string
    decimals: number
  }
  isTestnet?: boolean
  defaultTokens?: {
    address: string
    name: string
    symbol: string
    decimals: number
  }[]
}

export const networks: Network[] = [
  {
    name: "Celo",
    symbol: "CELO",
    chainId: 42220,
    rpcUrl: [
      "https://forno.celo.org",
      "https://celo-mainnet.g.alchemy.com/v2/sXHCrL5-xwYkPtkRC_WTEZHvIkOVTbw-",
      "https://celo-mainnet.infura.io/v3/e9fa8c3350054dafa40019a5b604679f",
      "https://rpc.ankr.com/celo",
      "https://1rpc.io/celo",
      "https://celo.drpc.org",
      "https://celo-rpc.publicnode.com",
    ],
    blockExplorerUrls: "https://celoscan.io",
    color: "#35D07F",
    logoUrl: "/celo.png",
    iconUrl: "/celo.png",
    factoryAddresses: [
      "0x17cFed7fEce35a9A71D60Fbb5CA52237103A21FB",
      "0xB8De8f37B263324C44FD4874a7FB7A0C59D8C58E",
      "0xc26c4Ea50fd3b63B6564A5963fdE4a3A474d4024",
      "0x9D6f441b31FBa22700bb3217229eb89b13FB49de",
      "0xE3Ac30fa32E727386a147Fe08b4899Da4115202f",
      "0xF8707b53a2bEc818E96471DDdb34a09F28E0dE6D",
      "0x8D1306b3970278b3AB64D1CE75377BDdf00f61da",
      "0x8cA5975Ded3B2f93E188c05dD6eb16d89b14aeA5",
      "0xdC9b027B6453560ce8C4390E0B609b343a8eBd62",
      "0xc9c89f695C7fa9D9AbA3B297C9b0d86C5A74f534",
    ],
    factories: {
      droplist: "0xF8707b53a2bEc818E96471DDdb34a09F28E0dE6D",
      dropcode: "0x8D1306b3970278b3AB64D1CE75377BDdf00f61da",
      custom: "0x8cA5975Ded3B2f93E188c05dD6eb16d89b14aeA5",
      quest: "0x0229FC9B6b7A30054130DD61f5846053A0b4237a",
      quiz: "0x45aF94C51188C2f1cBAa060Bd9Ee4a37e416Ed1F",
    },
    tokenAddress: "0x471EcE3750Da237f93B8E339c536989b8978a438",
    nativeCurrency: { name: "Celo", symbol: "CELO", decimals: 18 },
    isTestnet: false,
  },
  {
    name: "Lisk",
    symbol: "LSK",
    chainId: 1135,
    rpcUrl: [
      "https://rpc.api.lisk.com",
      "https://lisk.drpc.org",
      "https://1rpc.io/lisk",
    ],
    blockExplorerUrls: "https://blockscout.lisk.com",
    explorerUrl: "https://blockscout.lisk.com",
    color: "#0D4477",
    logoUrl: "/lsk.png",
    iconUrl: "/lsk.png",
    factoryAddresses: [
      "0x96E9911df17e94F7048cCbF7eccc8D9b5eDeCb5C",
      "0x4F5Cf906b9b2Bf4245dba9F7d2d7F086a2a441C2",
      "0x21E855A5f0E6cF8d0CfE8780eb18e818950dafb7",
      "0xd6Cb67dF496fF739c4eBA2448C1B0B44F4Cf0a7C",
      "0x0837EACf85472891F350cba74937cB02D90E60A4",
    ],
    factories: {
      droplist: "0x0837EACf85472891F350cba74937cB02D90E60A4",
      dropcode: "0xd6Cb67dF496fF739c4eBA2448C1B0B44F4Cf0a7C",
      custom: "0x21E855A5f0E6cF8d0CfE8780eb18e818950dafb7",
      quest: "0xD94339701BE3C0E2Dab135447004304e0B80b761",
      quiz: "0x8BD9AD5C66Ca2BE1A728e4d139d92103615bcA7C",
    },
    tokenAddress: ZeroAddress,
    nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
    isTestnet: false,
  },
  {
    name: "Arbitrum",
    symbol: "ARB",
    chainId: 42161,
    rpcUrl: [
      "https://arb1.arbitrum.io/rpc",
      "https://arb-mainnet.g.alchemy.com/v2/sXHCrL5-xwYkPtkRC_WTEZHvIkOVTbw-",
      "https://arbitrum.infura.io/v3/e9fa8c3350054dafa40019a5b604679f",
      "https://rpc.ankr.com/arbitrum",
      "https://1rpc.io/arb",
      "https://arbitrum.drpc.org",
      "https://arbitrum-one-rpc.publicnode.com",
    ],
    blockExplorerUrls: "https://arbiscan.io",
    explorerUrl: "https://arbiscan.io",
    color: "#28A0F0",
    logoUrl: "/arb.jpeg",
    iconUrl: "/arb.jpeg",
    factoryAddresses: [
      "0x0a5C19B5c0f4B9260f0F8966d26bC05AAea2009C",
      "0x42355492298A89eb1EF7FB2fFE4555D979f1Eee9",
      "0x9D6f441b31FBa22700bb3217229eb89b13FB49de",
    ],
    factories: {
      droplist: "0x0a5C19B5c0f4B9260f0F8966d26bC05AAea2009C",
      dropcode: "0x42355492298A89eb1EF7FB2fFE4555D979f1Eee9",
      custom: "0x9D6f441b31FBa22700bb3217229eb89b13FB49de",
      quest: "0x6442eA1cce9786F776a0B758Ac014c06838D0c30",
      quiz: "0x3C4ce82625Aa9dc0Efb199bCf5553Af32d27e555",
    },
    tokenAddress: ZeroAddress,
    nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
    isTestnet: false,
  },
  {
    name: "Base",
    symbol: "BASE",
    chainId: 8453,
    rpcUrl: [
      "https://base.publicnode.com",
      "https://base-mainnet.g.alchemy.com/v2/sXHCrL5-xwYkPtkRC_WTEZHvIkOVTbw-",
      "https://mainnet.base.org",
      "https://rpc.ankr.com/base",
      "https://1rpc.io/base",
      "https://base-mainnet.infura.io/v3/e9fa8c3350054dafa40019a5b604679f",
      "https://base.drpc.org",
    ],
    blockExplorerUrls: "https://basescan.org",
    explorerUrl: "https://basescan.org",
    color: "#0052FF",
    logoUrl: "/base.png",
    iconUrl: "/base.png",
    factoryAddresses: [
      "0x945431302922b69D500671201CEE62900624C6d5",
      "0xda191fb5Ca50fC95226f7FC91C792927FC968CA9",
      "0x587b840140321DD8002111282748acAdaa8fA206",
    ],
    factories: {
      droplist: "0x945431302922b69D500671201CEE62900624C6d5",
      dropcode: "0xda191fb5Ca50fC95226f7FC91C792927FC968CA9",
      custom: "0x587b840140321DD8002111282748acAdaa8fA206",
      quest: "0x1F41b9bc5a5761F5581c3891c8f62b56e02A2E46",
      quiz: "0xE88028BC2bF2C4bb6eC6C0587d3248b79cAA5198",
    },
    tokenAddress: ZeroAddress,
    nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
    isTestnet: false,
  },
  {
    name: "BNB",
    symbol: "BNB",
    chainId: 56,
    rpcUrl: [
      "https://bnb-mainnet.g.alchemy.com/v2/sXHCrL5-xwYkPtkRC_WTEZHvIkOVTbw-",
      "https://bsc-dataseed.binance.org/",
      "https://rpc.ankr.com/bsc",
      "https://1rpc.io/bnb",
      "https://bsc-mainnet.infura.io/v3/e9fa8c3350054dafa40019a5b604679f",
      "https://bsc.publicnode.com",
      "https://bsc.drpc.org",
    ],
    blockExplorerUrls: "https://bscscan.com",
    explorerUrl: "https://bscscan.com",
    color: "#F3BA2F",
    logoUrl: "/bnb.jpg",
    iconUrl: "/bnb.jpg",
    factoryAddresses: [
      "0xFE7DB2549d0c03A4E3557e77c8d798585dD80Cc1",
      "0x0F779235237Fc136c6EE9dD9bC2545404CDeAB36",
      "0x4B8c7A12660C4847c65662a953F517198fBFc0ED",
    ],
    factories: {
      droplist: "0x4B8c7A12660C4847c65662a953F517198fBFc0ED",
      dropcode: "0xFE7DB2549d0c03A4E3557e77c8d798585dD80Cc1",
      custom: "0x0F779235237Fc136c6EE9dD9bC2545404CDeAB36",
      quest: "0x9c4c900815D629dcb22320a74b88268308Cd325a",
      quiz: "0xBfbE657a1FB5Fbc1fFadfB5A79EBAfC7D2637d06",
    },
    tokenAddress: ZeroAddress,
    nativeCurrency: { name: "BNB", symbol: "BNB", decimals: 18 },
    isTestnet: false,
  },
  {
    name: "Solana Devnet",
    symbol: "SOL",
    chainId: SOLANA_CHAIN_ID,
    rpcUrl: [
      process.env.NEXT_PUBLIC_SOLANA_RPC_URL || "https://api.devnet.solana.com",
    ],
    blockExplorerUrls: "https://solscan.io/?cluster=devnet",
    color: "#14F195",
    logoUrl: "/solana.png",
    iconUrl: "/solana.png",
    factoryAddresses: [],
    // All point to the single Anchor program ID — no EVM factory concept
    factories: {
      droplist: "719GaXbsBWwskSVKZDykUMX6mur7BiCVjNSSWS7KMwtp",
      dropcode: "719GaXbsBWwskSVKZDykUMX6mur7BiCVjNSSWS7KMwtp",
      custom: "719GaXbsBWwskSVKZDykUMX6mur7BiCVjNSSWS7KMwtp",
      quest: "719GaXbsBWwskSVKZDykUMX6mur7BiCVjNSSWS7KMwtp",
      quiz: "719GaXbsBWwskSVKZDykUMX6mur7BiCVjNSSWS7KMwtp",
    },
    tokenAddress: "11111111111111111111111111111111",
    nativeCurrency: { name: "Solana", symbol: "SOL", decimals: 9 },
    isTestnet: true,
  },
]

// =============================================================================
// RPC helpers
// =============================================================================

export function getRpcUrls(network: Network | null): string[] {
  if (!network) return []
  return Array.isArray(network.rpcUrl)
    ? network.rpcUrl.filter(Boolean)
    : [network.rpcUrl].filter(Boolean)
}

export function getPrimaryRpcUrl(network: Network | null): string {
  return getRpcUrls(network)[0] || ""
}

export function createFallbackProvider(network: Network | null) {
  const urls = getRpcUrls(network)
  if (urls.length === 0) return null
  const providers = urls.map((url) => new JsonRpcProvider(url))
  return new FallbackProvider(providers, 1)
}

// =============================================================================
// Context types
// =============================================================================

interface NetworkContextType {
  network: Network | null
  networks: Network[]
  setNetwork: (network: Network) => void
  switchNetwork: (chainId: number) => Promise<void>
  getLatestFactoryAddress: (network?: Network) => string | null
  getFactoryAddress: (
    factoryType: "dropcode" | "droplist" | "custom" | "quest" | "quiz",
    network?: Network
  ) => string | null
  isSwitchingNetwork: boolean
  currentChainId: number | null
  isConnecting: boolean
}

const NetworkContext = createContext<NetworkContextType>({
  network: null,
  networks,
  setNetwork: () => {},
  switchNetwork: async () => {},
  getLatestFactoryAddress: () => null,
  getFactoryAddress: () => null,
  isSwitchingNetwork: false,
  currentChainId: null,
  isConnecting: false,
})

// =============================================================================
// Provider
// =============================================================================

export function NetworkProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast()

  // EVM wallet (Privy/wagmi)
  const { chainId: rawEvmChainId, address: evmAddress, switchChain } = useWallet()

  // Solana wallet (adapter) — connected / publicKey only
  // This hook is safe to call here because ConnectionProvider + WalletProvider
  // wrap NetworkProvider in the layout.
  const { connected: solanaConnected, publicKey: solanaPublicKey } = useSolanaWallet()

  const [network, setNetworkState] = useState<Network | null>(null)
  const [isSwitchingNetwork, setIsSwitchingNetwork] = useState(false)
  const [isConnecting, setIsConnecting] = useState(false)

  // Always-fresh ref so callbacks never close over stale wallet state
  const walletRef = useRef({ evmAddress, rawEvmChainId, switchChain, solanaConnected, solanaPublicKey })
  walletRef.current = { evmAddress, rawEvmChainId, switchChain, solanaConnected, solanaPublicKey }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  const parseChainId = (id: string | number | null | undefined): number | null => {
    if (!id) return null
    const s = String(id)
    const parsed = s.startsWith("0x") ? parseInt(s, 16) : Number(s)
    return isNaN(parsed) ? null : parsed
  }

  const currentChainId = parseChainId(rawEvmChainId)

  // ---------------------------------------------------------------------------
  // Effect: resolve active network from EVM chainId OR Solana connection
  // ---------------------------------------------------------------------------

  // use-network.tsx — replace the effect
const prevChainIdRef = useRef<number | null>(null)

useEffect(() => {
  if (solanaConnected && solanaPublicKey) {
    const solanaNetwork = networks.find((n) => n.chainId === SOLANA_CHAIN_ID)
    if (solanaNetwork && prevChainIdRef.current !== SOLANA_CHAIN_ID) {
      setNetworkState(solanaNetwork)
      prevChainIdRef.current = SOLANA_CHAIN_ID
    }
    setIsConnecting(false)
    return
  }

  if (!evmAddress) {
    setIsConnecting(false)
    if (prevChainIdRef.current === SOLANA_CHAIN_ID) {
      setNetworkState(null)
      prevChainIdRef.current = null
    }
    return
  }

  if (currentChainId === null) {
    setIsConnecting(true)
    return
  }

  setIsConnecting(false)

  if (currentChainId === prevChainIdRef.current) return  // no change

  const matched = networks.find((n) => n.chainId === currentChainId)
  if (matched) {
    const wasConnected = prevChainIdRef.current !== null
    setNetworkState(matched)
    prevChainIdRef.current = currentChainId
    if (wasConnected) {
      toast({ title: "Network Changed", description: `Switched to ${matched.name}` })
    }
  } else {
    setNetworkState(null)
    prevChainIdRef.current = currentChainId
    toast({
      title: "Unsupported Network",
      description: `Chain ID ${currentChainId} is not supported.`,
      variant: "destructive",
    })
  }
}, [rawEvmChainId, evmAddress, currentChainId, solanaConnected, solanaPublicKey, toast])
  const switchNetwork = useCallback(
    async (targetChainId: number) => {
      const { evmAddress: addr, rawEvmChainId: rawId, switchChain: sc } = walletRef.current

      const targetNetwork = networks.find((n) => n.chainId === targetChainId)
      if (!targetNetwork) {
        toast({
          title: "Network Not Supported",
          description: `Chain ID ${targetChainId} is not supported`,
          variant: "destructive",
        })
        return
      }

      // ── Solana: no EVM switchChain needed ──────────────────────────────────
      // The user selects Solana from the network picker; the Solana wallet-
      // adapter connection is triggered in the UI (WalletModalButton etc.).
      // Here we just update local state so the rest of the app responds.
      if (targetChainId === SOLANA_CHAIN_ID) {
        setNetworkState(targetNetwork)
        toast({ title: "Network Changed", description: "Switched to Solana Devnet" })
        return
      }

      // ── EVM ────────────────────────────────────────────────────────────────
      if (!addr) {
        toast({
          title: "No Wallet Connected",
          description: "Please connect your wallet first",
          variant: "destructive",
        })
        return
      }

      if (isSwitchingNetwork) return

      const currentParsed = parseChainId(rawId)
      if (currentParsed === targetChainId) return

      try {
        setIsSwitchingNetwork(true)
        await sc(targetChainId)
        toast({ title: "Network Switched", description: `Switched to ${targetNetwork.name}` })
      } catch (error: any) {
        toast({
          title: "Network Switch Failed",
          description: error?.message || `Could not switch to ${targetNetwork.name}`,
          variant: "destructive",
        })
      } finally {
        setIsSwitchingNetwork(false)
      }
    },
    [isSwitchingNetwork, toast]
  )

  // ---------------------------------------------------------------------------
  // Factory helpers
  // ---------------------------------------------------------------------------

  const getLatestFactoryAddress = (targetNetwork?: Network) => {
    const n = targetNetwork || network
    return n?.factoryAddresses[n.factoryAddresses.length - 1] || null
  }

  const getFactoryAddress = (
    factoryType: "dropcode" | "droplist" | "custom" | "quest" | "quiz",
    targetNetwork?: Network
  ) => {
    const n = targetNetwork || network
    if (!n) return null
    return n.factories[factoryType] || null
  }

  const handleSetNetwork = useCallback(
    (newNetwork: Network) => switchNetwork(newNetwork.chainId),
    [switchNetwork]
  )

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
        isConnecting,
      }}
    >
      {children}
    </NetworkContext.Provider>
  )
}

// =============================================================================
// Hook + utilities
// =============================================================================

export function useNetwork() {
  return useContext(NetworkContext)
}

export function getMainnetNetworks() {
  return networks.filter((n) => !n.isTestnet)
}

export function getTestnetNetworks() {
  return networks.filter((n) => n.isTestnet)
}

export function getNetworkByChainId(chainId: number) {
  return networks.find((n) => n.chainId === chainId)
}

export function isFactoryTypeAvailable(
  chainId: number,
  factoryType: "dropcode" | "droplist" | "custom" | "quest" | "quiz"
): boolean {
  // Solana supports all types via the single Anchor program
  if (chainId === SOLANA_CHAIN_ID) return true
  const network = getNetworkByChainId(chainId)
  if (!network) return false
  return !!network.factories[factoryType]
}

export function getAvailableFactoryTypes(
  chainId: number
): ("dropcode" | "droplist" | "custom" | "quest" | "quiz")[] {
  if (chainId === SOLANA_CHAIN_ID) {
    return ["dropcode", "droplist", "custom", "quest", "quiz"]
  }
  const network = getNetworkByChainId(chainId)
  if (!network) return []
  const types: ("dropcode" | "droplist" | "custom" | "quest" | "quiz")[] = []
  if (network.factories.dropcode) types.push("dropcode")
  if (network.factories.droplist) types.push("droplist")
  if (network.factories.custom) types.push("custom")
  if (network.factories.quest) types.push("quest")
  if (network.factories.quiz) types.push("quiz")
  return types
}