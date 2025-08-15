'use client'
import { Alert } from "@/components/ui/alert"
import { useState, useEffect, useCallback } from "react"
import { useWallet } from "@/hooks/use-wallet"
import { useNetwork } from "@/hooks/use-network"
import { useToast } from "@/hooks/use-toast"
import { createFaucet, checkFaucetNameExists } from "@/lib/faucet"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { AlertDescription, AlertTitle } from "@/components/ui/alert"
import {
  AlertCircle,
  Loader2,
  Info,
  ArrowRight,
  ArrowLeft,
  CheckCircle,
  Globe,
  Shield,
  Key,
  Coins,
  AlertTriangle,
  Check,
} from "lucide-react"
import { Header } from "@/components/header"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { zeroAddress } from "viem"

interface Token {
  address: string
  name: string
  symbol: string
  decimals: number
  isNative?: boolean
}

interface ChainConfig {
  chainId: number
  name: string
  displayName: string
  nativeCurrency: {
    name: string
    symbol: string
    decimals: number
  }
  nativeTokenAddress: string
  factoryAddresses: string[]
  defaultTokens: Token[]
  rpcUrls: string[]
  blockExplorerUrls: string[]
  isTestnet?: boolean
}

// Define CHAIN_CONFIGS 
const CHAIN_CONFIGS: Record<number, ChainConfig> = {
  42220: {
    chainId: 42220,
    name: "Celo",
    displayName: "Celo Mainnet",
    nativeCurrency: { name: "Celo", symbol: "CELO", decimals: 18 },
    nativeTokenAddress: "0x471EcE3750Da237f93B8E339c536989b8978a438",
    factoryAddresses: [
      "0xE3Ac30fa32E727386a147Fe08b4899Da4115202f",
      "0x9D6f441b31FBa22700bb3217229eb89b13FB49de",
    ],
    rpcUrls: ["https://forno.celo.org"],
    blockExplorerUrls: ["https://explorer.celo.org"],
    defaultTokens: [
      {
        address: "0x765DE816845861e75A25fCA122bb6898B8B1282a",
        name: "Celo Dollar",
        symbol: "cUSD",
        decimals: 18,
      },
      {
        address: "0xD8763CBa276a3738E6DE85b4b3bF5FDed6D6cA73",
        name: "Celo Euro",
        symbol: "cEUR",
        decimals: 18,
      },
      {
        address: "0x4f604735c1cf31399c6e711d5962b2b3e0225ad3",
        name: "Glo Dollar",
        symbol: "USDGLO",
        decimals: 18,
      },
      {
        address: "0x62b8b11039fcfe5ab0c56e502b1c372a3d2a9c7a",
        name: "Good dollar",
        symbol: "G$",
        decimals: 18,
      },
    ],
  },
  42161: {
    chainId: 42161,
    name: "Arbitrum",
    displayName: "Arbitrum",
    nativeCurrency: { name: "ETHER", symbol: "ETH", decimals: 18 },
    nativeTokenAddress: zeroAddress,
    factoryAddresses: [
      "0x96E9911df17e94F7048cCbF7eccc8D9b5eDeCb5C",
    ],
    rpcUrls: ["https://arb1.arbitrum.io/rpc"],
    blockExplorerUrls: ["https://arbiscan.io"],
    isTestnet: true,
    defaultTokens: [
      {
         address: "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174",
        name: "USD Coin",
        symbol: "USDC",
        decimals: 6,
      },
    ],
  },
  1135: {
    chainId: 1135,
    name: "Lisk",
    displayName: "Lisk Mainnet",
    nativeCurrency: { name: "Ethereum", symbol: "ETH", decimals: 18 },
    nativeTokenAddress: zeroAddress,
    factoryAddresses: [
      "0x4F5Cf906b9b2Bf4245dba9F7d2d7F086a2a441C2",
    ],
    rpcUrls: ["https://rpc.api.lisk.com"],
    blockExplorerUrls: ["https://blockscout.lisk.com"],
    defaultTokens: [
      {
        address: "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174",
        name: "USD Coin",
        symbol: "USDC",
        decimals: 6,
      },
    ],
  },
  8453: {
    chainId: 8453,
    name: "Base",
    displayName: "Base Mainnet",
    nativeCurrency: { name: "Ethereum", symbol: "ETH", decimals: 18 },
    nativeTokenAddress: zeroAddress,
    factoryAddresses: [
      "0xE3Ac30fa32E727386a147Fe08b4899Da4115202f",
      "0x9D6f441b31FBa22700bb3217229eb89b13FB49de",
    ],
    rpcUrls: ["https://mainnet.base.org"],
    blockExplorerUrls: ["https://basescan.org"],
    defaultTokens: [
      {
        address: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
        name: "USD Coin",
        symbol: "USDC",
        decimals: 6,
      },
    ],
  },
}

const FAUCET_TYPES = {
  OPEN: 'open',
  GATED: 'gated',
}

const TEMPLATES = {
  [FAUCET_TYPES.OPEN]: [
    {
      name: "Community Airdrop",
      description: "Wide distribution to community members",
      useCase: "Best for token launches and community rewards",
    },
    {
      name: "Event Distribution",
      description: "Token distribution at events or conferences",
      useCase: "Perfect for hackathons, meetups, conferences",
    },
    {
      name: "Marketing Campaign",
      description: "Public token distribution for promotion",
      useCase: "Great for increasing awareness and adoption",
    },
  ],
  [FAUCET_TYPES.GATED]: [
    {
      name: "Contest Rewards",
      description: "Rewards for specific contest winners",
      useCase: "Best for competitions and challenges",
    },
    {
      name: "Private Airdrop",
      description: "Exclusive distribution to selected wallets",
      useCase: "Perfect for investors, team members, advisors",
    },
    {
      name: "DAO Rewards",
      description: "Rewards for DAO contributors and members",
      useCase: "Great for governance participation rewards",
    },
  ],
}

export default function CreateFaucetWizard() {
  const { provider, address, isConnected, connect, chainId } = useWallet()
  const { network } = useNetwork()
  const { toast } = useToast()

  // Wizard state
  const [currentStep, setCurrentStep] = useState(1)
  const [faucetType, setFaucetType] = useState<string>('')

  // Form state
  const [name, setName] = useState("")
  const [selectedToken, setSelectedToken] = useState<string>("")
  const [requireDropCode, setRequireDropCode] = useState(true)

  // Name validation state
  const [nameValidation, setNameValidation] = useState<{
    isChecking: boolean
    isValid: boolean
    error: string | null
    existingFaucet?: { address: string; name: string; owner: string }
  }>({
    isChecking: false,
    isValid: false,
    error: null,
  })

  // Loading and error states
  const [isCreating, setIsCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [availableTokens, setAvailableTokens] = useState<Token[]>([])
  const [isLoadingTokens, setIsLoadingTokens] = useState(false)

  const getCurrentChainConfig = (): ChainConfig | null => {
    if (!chainId) return null
    return CHAIN_CONFIGS[chainId] || null
  }

  const fetchAvailableTokens = async (chainConfig: ChainConfig): Promise<Token[]> => {
    const tokens: Token[] = []
    
    tokens.push({
      address: chainConfig.nativeTokenAddress,
      name: chainConfig.nativeCurrency.name,
      symbol: chainConfig.nativeCurrency.symbol,
      decimals: chainConfig.nativeCurrency.decimals,
      isNative: true,
    })
    
    tokens.push(...chainConfig.defaultTokens)
    
    return tokens
  }

  // Debounced name validation
  const validateFaucetName = useCallback(async (nameToCheck: string) => {
    if (!nameToCheck.trim()) {
      setNameValidation({
        isChecking: false,
        isValid: false,
        error: null,
      })
      return
    }

    if (!provider || !chainId) {
      setNameValidation({
        isChecking: false,
        isValid: false,
        error: "Please connect your wallet",
      })
      return
    }

    const chainConfig = getCurrentChainConfig()
    if (!chainConfig) {
      setNameValidation({
        isChecking: false,
        isValid: false,
        error: "Unsupported network",
      })
      return
    }

    setNameValidation(prev => ({ ...prev, isChecking: true, error: null }))

    try {
      const factoryAddress = chainConfig.factoryAddresses[0]
      const result = await checkFaucetNameExists(provider, factoryAddress, nameToCheck)
      
      if (result.exists) {
        setNameValidation({
          isChecking: false,
          isValid: false,
          error: `Name "${result.existingFaucet?.name}" already exists`,
          existingFaucet: result.existingFaucet,
        })
      } else {
        setNameValidation({
          isChecking: false,
          isValid: true,
          error: null,
        })
      }
    } catch (error: any) {
      console.error("Name validation error:", error)
      setNameValidation({
        isChecking: false,
        isValid: false,
        error: "Failed to validate name",
      })
    }
  }, [provider, chainId])

  // Debounce name validation
  useEffect(() => {
    const timer = setTimeout(() => {
      if (name.trim() && name.length >= 3) {
        validateFaucetName(name)
      }
    }, 500)

    return () => clearTimeout(timer)
  }, [name, validateFaucetName])

  // Load tokens when chain changes
  useEffect(() => {
    const loadTokens = async () => {
      if (!chainId) return
      
      const chainConfig = getCurrentChainConfig()
      if (!chainConfig) {
        setError(`Current network (Chain ID: ${chainId}) is not supported`)
        return
      }

      setIsLoadingTokens(true)
      try {
        const tokens = await fetchAvailableTokens(chainConfig)
        setAvailableTokens(tokens)
        if (tokens.length > 0 && !selectedToken) {
          setSelectedToken(tokens[0].address)
        }
      } catch (error) {
        console.error("Failed to load tokens:", error)
        setError("Failed to load available tokens")
      } finally {
        setIsLoadingTokens(false)
      }
    }
    
    loadTokens()
  }, [chainId, selectedToken])

  // Check chain support
  useEffect(() => {
    if (!chainId) {
      setError("Please connect your wallet to a supported network")
      return
    }

    const chainConfig = getCurrentChainConfig()
    if (!chainConfig) {
      setError(`Current network (Chain ID: ${chainId}) is not supported`)
    } else {
      setError(null)
    }
  }, [chainId])

  const getSelectedTokenInfo = (): Token | null => {
    return availableTokens.find((token) => token.address === selectedToken) || null
  }

  const handleNext = () => {
    if (currentStep < 3) {
      setCurrentStep(currentStep + 1)
    }
  }

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleCreate = async () => {
    if (!name.trim()) {
      setError("Please enter a faucet name")
      return
    }
    if (!nameValidation.isValid) {
      setError("Please choose a valid faucet name")
      return
    }
    if (!selectedToken) {
      setError("Please select a token")
      return
    }
    if (!chainId) {
      setError("Please connect your wallet to a supported network")
      return
    }

    const chainConfig = getCurrentChainConfig()
    if (!chainConfig) {
      setError("Current network is not supported")
      return
    }

    setError(null)

    if (!isConnected) {
      try {
        await connect()
      } catch (error) {
        console.error("Failed to connect wallet:", error)
        setError("Failed to connect wallet. Please try again.")
        return
      }
    }

    if (!provider) {
      setError("Wallet not connected")
      return
    }

    if (!address) {
      setError("Unable to get wallet address")
      return
    }

    setIsCreating(true)
    try {
      const factoryAddress = chainConfig.factoryAddresses[0]
      if (!factoryAddress) {
        throw new Error("No factory address available for this network")
      }

      const useBackend = faucetType === FAUCET_TYPES.OPEN && requireDropCode
      const tokenAddress = selectedToken

      console.log("Creating faucet with params:", {
        factoryAddress,
        name,
        tokenAddress,
        chainId: chainId.toString(),
        useBackend,
        faucetType,
        requireDropCode,
        chainConfig: chainConfig.displayName,
        userAddress: address,
      })

      const faucetAddress = await createFaucet(
        provider,
        factoryAddress,
        name,
        tokenAddress,
        BigInt(chainId),
        BigInt(chainId),
        useBackend
      )

      if (!faucetAddress) {
        throw new Error("Failed to get created faucet address")
      }

      const selectedTokenInfo = getSelectedTokenInfo()
      toast({
        title: "Faucet Created Successfully! 🎉",
        description: `Your ${selectedTokenInfo?.symbol || "token"} faucet has been created at ${faucetAddress}`,
      })

      window.location.href = `/faucet/${faucetAddress}?networkId=${chainId}`
    } catch (error: any) {
      console.error("Error creating faucet:", error)
      let errorMessage = error.message || "Failed to create faucet"
      
      toast({
        title: "Failed to create faucet",
        description: errorMessage,
        variant: "destructive",
      })
      setError(errorMessage)
    } finally {
      setIsCreating(false)
    }
  }

  const getStepTitle = (step: number) => {
    switch (step) {
      case 1:
        return "Who Can Claim?"
      case 2:
        return "Configure Details"
      case 3:
        return "Review & Create"
      default:
        return "Create Faucet"
    }
  }

  const getStepDescription = (step: number) => {
    switch (step) {
      case 1:
        return "Choose who can access your faucet"
      case 2:
        return "Set up your faucet parameters"
      case 3:
        return "Review your configuration and create"
      default:
        return "Create your token faucet"
    }
  }

  const renderStep1 = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card
          className={`cursor-pointer border-2 transition-all ${
            faucetType === FAUCET_TYPES.OPEN ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-200 hover:border-gray-300'
          }`}
          onClick={() => setFaucetType(FAUCET_TYPES.OPEN)}
        >
          <CardHeader>
            <div className="flex items-center space-x-2">
              <Globe className="h-5 w-5 text-green-600" />
              <CardTitle className="text-lg">Anyone with a Drop Code</CardTitle>
            </div>
            <CardDescription>Open faucet for wide distribution</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600">
              Suitable for open community drops, wide airdrops, event distributions, and marketing campaigns.
            </p>
          </CardContent>
        </Card>
        
        <Card
          className={`cursor-pointer border-2 transition-all ${
            faucetType === FAUCET_TYPES.GATED ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-200 hover:border-gray-300'
          }`}
          onClick={() => setFaucetType(FAUCET_TYPES.GATED)}
        >
          <CardHeader>
            <div className="flex items-center space-x-2">
              <Shield className="h-5 w-5 text-orange-600" />
              <CardTitle className="text-lg">Only Wallets I Select</CardTitle>
            </div>
            <CardDescription>Restricted drop-list faucet</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600">
              Suitable for contests, private airdrops, community rewards, and restricted campaigns.
            </p>
          </CardContent>
        </Card>
      </div>
      
      {faucetType && (
        <>
          <Alert>
            <Info className="h-4 w-4" />
            <AlertTitle>{faucetType === FAUCET_TYPES.OPEN ? "Open Faucet Selected" : "Gated Faucet Selected"}</AlertTitle>
            <AlertDescription>
              {faucetType === FAUCET_TYPES.OPEN
                ? "This faucet will be accessible to anyone with a drop code."
                : "This faucet will be restricted to specific wallet addresses that you droplist."}
            </AlertDescription>
          </Alert>
          
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Available Use Cases</CardTitle>
              <CardDescription>
                These are common use cases for {faucetType === FAUCET_TYPES.OPEN ? "open" : "gated"} faucets
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {TEMPLATES[faucetType as keyof typeof TEMPLATES]?.map((template, index) => (
                  <div key={index} className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <div className="font-medium">{template.name}</div>
                    <div className="text-sm text-gray-600 mt-1">{template.useCase}</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )

  const renderStep2 = () => (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="name">Faucet Name</Label>
          <div className="relative">
            <Input
              id="name"
              placeholder="Enter a unique name for your faucet (e.g., Community Airdrop)"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={
                name.length >= 3 && nameValidation.error
                  ? "border-red-500 focus:border-red-500"
                  : name.length >= 3 && nameValidation.isValid
                  ? "border-green-500 focus:border-green-500"
                  : ""
              }
            />
            {name.length >= 3 && (
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                {nameValidation.isChecking ? (
                  <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                ) : nameValidation.isValid ? (
                  <Check className="h-4 w-4 text-green-500" />
                ) : nameValidation.error ? (
                  <AlertTriangle className="h-4 w-4 text-red-500" />
                ) : null}
              </div>
            )}
          </div>
          
          {name.length >= 3 && nameValidation.error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                {nameValidation.error}
                {nameValidation.existingFaucet && (
                  <div className="mt-2 text-sm">
                    Existing faucet: {nameValidation.existingFaucet.address}
                  </div>
                )}
              </AlertDescription>
            </Alert>
          )}
          
          {name.length >= 3 && nameValidation.isValid && (
            <Alert className="border-green-500 bg-green-50 dark:bg-green-900/20">
              <Check className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-700 dark:text-green-300">
                Great! This name is available on the current network.
              </AlertDescription>
            </Alert>
          )}
          
          {name.length > 0 && name.length < 3 && (
            <p className="text-sm text-gray-500">
              Name must be at least 3 characters long
            </p>
          )}
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="token-select">Select Token</Label>
          <Select value={selectedToken} onValueChange={setSelectedToken}>
            <SelectTrigger id="token-select">
              <SelectValue placeholder={isLoadingTokens ? "Loading tokens..." : "Select a token"} />
            </SelectTrigger>
            <SelectContent>
              {availableTokens.map((token) => (
                <SelectItem key={token.address} value={token.address}>
                  <div className="flex items-center space-x-2">
                    <span className="font-medium">{token.symbol}</span>
                    <span className="text-gray-500">({token.name})</span>
                    {token.isNative && (
                      <span className="text-xs bg-blue-100 text-blue-800 px-1 rounded">Native</span>
                    )}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        {faucetType === FAUCET_TYPES.OPEN && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="drop-code">Require Drop Code</Label>
              <Switch
                id="drop-code"
                disabled
                checked={requireDropCode}
                onCheckedChange={setRequireDropCode}
              />
            </div>
            <p className="text-sm text-gray-600">
              Drop codes provide additional security for open faucets
            </p>
          </div>
        )}
      </div>
    </div>
  )

  const renderStep3 = () => {
    const selectedTokenInfo = getSelectedTokenInfo()
    const chainConfig = getCurrentChainConfig()

    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Faucet Summary</CardTitle>
            <CardDescription>Review your configuration before creating</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-500">Network</Label>
                <p className="flex items-center space-x-2">
                  <Coins className="h-4 w-4 text-blue-600" />
                  <span>{chainConfig?.displayName || "Unknown Network"}</span>
                  {chainConfig?.isTestnet && (
                    <span className="text-xs bg-orange-100 text-orange-800 px-2 py-1 rounded">
                      Testnet
                    </span>
                  )}
                </p>
              </div>
              
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-500">Faucet Type</Label>
                <p className="flex items-center space-x-2">
                  {faucetType === FAUCET_TYPES.OPEN ? (
                    <>
                      <Globe className="h-4 w-4 text-green-600" />
                      <span>Open Faucet</span>
                    </>
                  ) : (
                    <>
                      <Shield className="h-4 w-4 text-orange-600" />
                      <span>Gated Faucet</span>
                    </>
                  )}
                </p>
              </div>
              
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-500">Faucet Name</Label>
                <p className="flex items-center space-x-2">
                  <span>{name}</span>
                  {nameValidation.isValid && (
                    <Check className="h-4 w-4 text-green-500" />
                  )}
                </p>
              </div>
              
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-500">Token</Label>
                <p className="flex items-center space-x-2">
                  <Coins className="h-4 w-4 text-gray-500" />
                  <span>{selectedTokenInfo?.symbol} ({selectedTokenInfo?.name})</span>
                  {selectedTokenInfo?.isNative && (
                    <span className="text-xs bg-blue-100 text-blue-800 px-1 rounded">Native</span>
                  )}
                </p>
              </div>
              
              {faucetType === FAUCET_TYPES.OPEN && (
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-500">Drop Code Required</Label>
                  <p className="flex items-center space-x-2">
                    {requireDropCode ? (
                      <>
                        <Key className="h-4 w-4 text-green-600" />
                        <span>Yes</span>
                      </>
                    ) : (
                      <>
                        <AlertCircle className="h-4 w-4 text-orange-600" />
                        <span>No</span>
                      </>
                    )}
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
        
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        
        {!requireDropCode && faucetType === FAUCET_TYPES.OPEN && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Security Notice</AlertTitle>
            <AlertDescription>
              This faucet will be accessible without drop code requirements. Consider the security implications.
            </AlertDescription>
          </Alert>
        )}
      </div>
    )
  }

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 1:
        return renderStep1()
      case 2:
        return renderStep2()
      case 3:
        return renderStep3()
      default:
        return renderStep1()
    }
  }

  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return faucetType !== ''
      case 2:
        return name.trim() !== '' && nameValidation.isValid && selectedToken !== ''
      case 3:
        return true
      default:
        return false
    }
  }

  const isDisabled = isCreating || !chainId || !getCurrentChainConfig()

  return (
    <main className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-4 py-8">
        <Header pageTitle="Create Faucet" />
        
        <div className="max-w-4xl mx-auto mb-8">
          <div className="flex items-center justify-between mb-4">
            {[1, 2, 3].map((step) => (
              <div key={step} className="flex items-center">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    step <= currentStep ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'
                  }`}
                >
                  {step}
                </div>
                {step < 3 && (
                  <div className={`w-24 h-1 mx-2 ${step < currentStep ? 'bg-blue-600' : 'bg-gray-200'}`} />
                )}
              </div>
            ))}
          </div>
          <div className="text-center">
            <p className="text-sm text-gray-600">Step {currentStep} of 3</p>
          </div>
        </div>
        
        <div className="max-w-4xl mx-auto">
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="text-2xl">{getStepTitle(currentStep)}</CardTitle>
              <CardDescription className="text-lg">{getStepDescription(currentStep)}</CardDescription>
            </CardHeader>
            <CardContent className="p-6">{renderCurrentStep()}</CardContent>
            <CardFooter className="flex justify-between">
              <Button
                variant="outline"
                onClick={handlePrevious}
                disabled={currentStep === 1}
                className="flex items-center space-x-2"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>Previous</span>
              </Button>
              {currentStep < 3 ? (
                <Button
                  onClick={handleNext}
                  disabled={!canProceed()}
                  className="flex items-center space-x-2"
                >
                  <span>Next</span>
                  <ArrowRight className="h-4 w-4" />
                </Button>
              ) : (
                <Button
                  onClick={handleCreate}
                  disabled={isDisabled}
                  className="flex items-center space-x-2"
                >
                  {isCreating ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Creating...</span>
                    </>
                  ) : !isConnected ? (
                    <span>Connect & Create Faucet</span>
                  ) : (
                    <>
                      <CheckCircle className="h-4 w-4" />
                      <span>Create Faucet</span>
                    </>
                  )}
                </Button>
              )}
            </CardFooter>
          </Card>
        </div>
      </div>
    </main>
  )
}