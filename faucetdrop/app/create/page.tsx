"use client"

import { Alert } from "@/components/ui/alert"
import { useState, useEffect } from "react"
import { useWallet } from "@/hooks/use-wallet"
import { useNetwork } from "@/hooks/use-network"
import { useToast } from "@/hooks/use-toast"
import { createFaucet } from "@/lib/faucet"
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
  Users,
  Key,
  Globe,
  Shield,
} from "lucide-react"
import { Header } from "@/components/header"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

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
  nativeCurrency: {
    name: string
    symbol: string
    decimals: number
  }
  nativeTokenAddress: string
  factoryAddresses: string[]
  defaultTokens: Token[]
}

// Chain configurations (unchanged)
const CHAIN_CONFIGS: Record<number, ChainConfig> = {
  42220: {
    chainId: 42220,
    name: "Celo",
    nativeCurrency: { name: "Celo", symbol: "CELO", decimals: 18 },
    nativeTokenAddress: "0x471EcE3750Da237f93B8E339c536989b8978a438",
    factoryAddresses: [
      "0xE3Ac30fa32E727386a147Fe08b4899Da4115202f",
      "0x9D6f441b31FBa22700bb3217229eb89b13FB49de",
    ],
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
  44787: {
    chainId: 44787,
    name: "Celo Alfajores",
    nativeCurrency: { name: "Celo", symbol: "CELO", decimals: 18 },
    nativeTokenAddress: "0xF194afDf50B03e69Bd7D057c1Aa9e10c9954E4C9",
    factoryAddresses: [
      "0xE3Ac30fa32E727386a147Fe08b4899Da4115202f",
      "0x9D6f441b31FBa22700bb3217229eb89b13FB49de",
    ],
    defaultTokens: [
      {
        address: "0x874069Fa1Eb16D44d622F2e0Ca25eeA172369bC1",
        name: "Celo Dollar",
        symbol: "cUSD",
        decimals: 18,
      },
    ],
  },
  137: {
    chainId: 137, // Corrected chainId from 8 to 137 for Base Mainnet
    name: "Base Mainnet",
    nativeCurrency: { name: "Base", symbol: "ETH", decimals: 18 },
    nativeTokenAddress: "0x0000000000000000000000000000000000001010",
    factoryAddresses: [
      "0xE3Ac30fa32E727386a147Fe08b4899Da4115202f",
      "0x9D6f441b31FBa22700bb3217229eb89b13FB49de",
    ],
    defaultTokens: [
      {
        address: "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174",
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
  const { network, getLatestFactoryAddress } = useNetwork()
  const { toast } = useToast()

  // Wizard state
  const [currentStep, setCurrentStep] = useState(1)
  const [faucetType, setFaucetType] = useState<string>('')

  // Form state
  const [name, setName] = useState("")
  const [selectedToken, setSelectedToken] = useState<string>("")
  const [requireDropCode, setRequireDropCode] = useState(true)
  const [maxClaims, setMaxClaims] = useState("100")
  const [claimAmount, setClaimAmount] = useState("10")

  // Loading and error states
  const [isCreating, setIsCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [availableTokens, setAvailableTokens] = useState<Token[]>([])
  const [isLoadingTokens, setIsLoadingTokens] = useState(false)

  const getCurrentChainConfig = (): ChainConfig | null => {
    if (!network?.chainId) return null
    return CHAIN_CONFIGS[Number(network.chainId)] || null
  }

  const fetchAvailableTokens = async (): Promise<Token[]> => {
    const chainConfig = getCurrentChainConfig()
    if (!chainConfig) return []
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

  useEffect(() => {
    const chainConfig = getCurrentChainConfig()
    if (network && chainId !== null && BigInt(chainId) !== BigInt(network.chainId)) {
      setError(`Please switch to the ${network.name} network to create a faucet`)
    } else if (network && !chainConfig) {
      setError(`Chain ${network.name} (ID: ${network.chainId}) is not supported yet`)
    } else {
      setError(null)
    }
  }, [network, chainId])

  useEffect(() => {
    const loadTokens = async () => {
      if (!network) return
      const chainConfig = getCurrentChainConfig()
      if (!chainConfig) {
        setError(`Chain ${network.name} (ID: ${network.chainId}) is not supported yet`)
        return
      }
      setIsLoadingTokens(true)
      try {
        const tokens = await fetchAvailableTokens()
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
  }, [network, selectedToken])

  const getSelectedTokenInfo = (): Token | null => {
    return availableTokens.find((token) => token.address === selectedToken) || null
  }

  const handleNext = () => {
    // Adjusted for 3 steps
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
    if (!selectedToken) {
      setError("Please select a token")
      return
    }
    if (chainId === null) {
      setError("Wallet chain ID is not available. Please ensure your wallet is connected.")
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
    if (!provider || !network || chainId === null) {
      setError("Wallet not connected or network not selected")
      return
    }
    setIsCreating(true)
    try {
      const chainConfig = getCurrentChainConfig()
      if (!chainConfig) {
        throw new Error(`Chain ${network?.name} is not supported`)
      }
      const factoryAddress = getLatestFactoryAddress()
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
        networkId: network.chainId.toString(),
        useBackend,
        faucetType,
        requireDropCode,
        chainConfig: chainConfig.name,
      })
      const faucetAddress = await createFaucet(
        provider,
        factoryAddress,
        name,
        tokenAddress,
        BigInt(chainId),
        BigInt(network.chainId),
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
      window.location.href = `/faucet/${faucetAddress}?networkId=${network.chainId}`
    } catch (error: any) {
      console.error("Error creating faucet:", error)
      let errorMessage = error.message || "Failed to create faucet"
      if (errorMessage.includes("Switch to the network")) {
        toast({
          title: "Network Mismatch",
          description: `Please switch to the ${network?.name} network to create a faucet`,
          variant: "destructive",
          action: (
            <Button
              onClick={() =>
                network &&
                window.ethereum.request({
                  method: "wallet_switchEthereumChain",
                  params: [{ chainId: `0x${network.chainId.toString(16)}` }],
                })
              }
            >
              Switch to {network?.name}
            </Button>
          ),
        })
      } else {
        toast({
          title: "Failed to create faucet",
          description: errorMessage,
          variant: "destructive",
        })
      }
      setError(errorMessage)
    } finally {
      setIsCreating(false)
    }
  }

  const getStepTitle = (step: number) => {
    // Updated for 3 steps
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
    // Updated for 3 steps
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
            faucetType === FAUCET_TYPES.OPEN ? 'border-blue-500 dark:bg-gray-800' : 'border-gray-200 hover:border-gray-300'
          }`}
          onClick={() => setFaucetType(FAUCET_TYPES.OPEN)}
        >
          <CardHeader>
            <div className="flex items-center space-x-2">
              <Globe className="h-5 w-5 text-green-600" />
              <CardTitle className="text-lg">Anyone with a Drop Code</CardTitle>
            </div>
            <CardDescription className="text-gray-100">Open faucet for wide distribution</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-100">
              Suitable for open community drops, wide airdrops, event distributions, and marketing campaigns.
            </p>
            <div className="mt-3 flex items-center space-x-2">
            </div>
          </CardContent>
        </Card>
        <Card
          className={`cursor-pointer border-2 transition-all ${
            faucetType === FAUCET_TYPES.GATED ? 'border-blue-500 bg-gray-800' : 'border-gray-200 hover:border-gray-300'
          }`}
          onClick={() => setFaucetType(FAUCET_TYPES.GATED)}
        >
          <CardHeader>
            <div className="flex items-center space-x-2">
              <Shield className="h-5 w-5 text-orange-600" />
              <CardTitle className="text-lg">Only Wallets I Select</CardTitle>
            </div>
            <CardDescription className="text-gray-100">Restricted drop-list faucet</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-100">
              Suitable for contests, private airdrops, community rewards, and restricted campaigns.
            </p>
            <div className="mt-3 flex items-center space-x-2">
            </div>
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
          {/* Added outline of faucet types */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Available Use Cases</CardTitle>
              <CardDescription className="text-gray-100">
                These are common use cases for {faucetType === FAUCET_TYPES.OPEN ? "open" : "gated"} faucets
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {TEMPLATES[faucetType as keyof typeof TEMPLATES]?.map((template, index) => (
                  <li key={index} className="text-sm text-gray-100">
                    <span className="font-medium">{template.name}</span>: {template.useCase}
                  </li>
                ))}
              </ul>
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
          <Input
            id="name"
            placeholder="Enter a name for your faucet (e.g., Community Airdrop)"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
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
                    <span className="text-gray-100">({token.name})</span>
                    {token.isNative && <span className="text-xs bg-blue-100 text-blue-800 px-1 rounded">Native</span>}
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
            <CardDescription className="text-gray-100">Review your configuration before creating</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-100">Faucet Type</Label>
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
                <Label className="text-sm font-medium text-gray-100">Faucet Name</Label>
                <p>{name}</p>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-100">Token</Label>
                <p>{selectedTokenInfo?.symbol} ({selectedTokenInfo?.name})</p>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-100">Network</Label>
                <p>{chainConfig?.name}</p>
              </div>
              {faucetType === FAUCET_TYPES.OPEN && (
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-100">Drop Code Required</Label>
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
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Security Warning</AlertTitle>
            <AlertDescription>
              Creating a faucet without drop code requirements is not recommended as it allows unrestricted access.
            </AlertDescription>
          </Alert>
        )}
      </div>
    )
  }

  const renderCurrentStep = () => {
    // Updated for 3 steps
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
    // Updated for 3 steps
    switch (currentStep) {
      case 1:
        return faucetType !== ''
      case 2:
        return name.trim() !== '' && selectedToken !== ''
      case 3:
        return true
      default:
        return false
    }
  }

  const isDisabled = isCreating || !network || (chainId !== null && network && BigInt(chainId) !== BigInt(network.chainId)) || !getCurrentChainConfig()

  return (
    <main className="min-h-screen">
      <div className="container mx-auto px-4 py-8">
        <Header pageTitle="Create Faucet" />
        {/* Progress Bar - Updated for 3 steps */}
        <div className="max-w-4xl mx-auto mb-8">
          <div className="flex items-center justify-between mb-4">
            {[1, 2, 3].map((step) => (
              <div key={step} className="flex items-center">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    step <= currentStep ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-100'
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
            <p className="text-sm text-gray-100">Step {currentStep} of 3</p>
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