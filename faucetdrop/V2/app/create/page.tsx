'use client'
import { Alert } from "@/components/ui/alert"
import { useState, useEffect, useCallback } from "react"
import { useWallet } from "@/hooks/use-wallet"
import { useNetwork, isFactoryTypeAvailable, getAvailableFactoryTypes } from "@/hooks/use-network"
import { useToast } from "@/hooks/use-toast"
import { 
  createFaucet, 
  checkFaucetNameExists,
  checkFaucetNameExistsAcrossAllFactories 
} from "@/lib/faucet"
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
  Settings,
  Zap,
  XCircle,
  Plus,
  X,
} from "lucide-react"
import { Header } from "@/components/header"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { zeroAddress } from "viem"
import { isAddress } from "ethers"

// Enhanced type definitions with better naming
interface TokenConfiguration {
  address: string
  name: string
  symbol: string
  decimals: number
  isNative?: boolean
  isCustom?: boolean
  logoUrl?: string
}

interface FaucetNameConflict {
  faucetAddress: string
  faucetName: string
  ownerAddress: string
  factoryAddress: string
  factoryType: FactoryType
}

interface NameValidationState {
  isValidating: boolean
  isNameAvailable: boolean
  validationError: string | null
  conflictingFaucets?: FaucetNameConflict[]
  validationWarning?: string
}

interface CustomTokenValidationState {
  isValidating: boolean
  isValid: boolean
  tokenInfo: TokenConfiguration | null
  validationError: string | null
}

interface FaucetCreationFormData {
  faucetName: string
  selectedTokenAddress: string
  customTokenAddress: string
  showCustomTokenInput: boolean
  requiresDropCode: boolean
}

interface WizardStepState {
  currentStep: number
  selectedFaucetType: string
  formData: FaucetCreationFormData
  showUseCasesDialog: boolean
}

// Factory and faucet type definitions with better naming
type FactoryType = 'dropcode' | 'droplist' | 'custom'
type FaucetType = 'open' | 'gated' | 'custom'

// Type for the conflict data returned from validation functions
interface ValidationConflict {
  address: string
  name: string
  owner: string
  factoryAddress: string
  factoryType: FactoryType
}

// Faucet type constants with better naming
const FAUCET_TYPES = {
  OPEN: 'open' as const,
  GATED: 'gated' as const,
  CUSTOM: 'custom' as const,
} as const

// ✅ FIXED: Correct mapping from UI faucet types to factory types
const FAUCET_TYPE_TO_FACTORY_TYPE_MAPPING: Record<FaucetType, FactoryType> = {
  [FAUCET_TYPES.OPEN]: 'dropcode',    // ✅ Open faucets use dropcode factory
  [FAUCET_TYPES.GATED]: 'droplist',   // ✅ Gated faucets use droplist factory
  [FAUCET_TYPES.CUSTOM]: 'custom',    // ✅ Custom faucets use custom factory
}

// Enhanced token configurations for different networks
const NETWORK_TOKENS: Record<number, TokenConfiguration[]> = {
  // Celo Mainnet (42220)
  42220: [
    {
      address: "0x471EcE3750Da237f93B8E339c536989b8978a438",
      name: "Celo",
      symbol: "CELO",
      decimals: 18,
      isNative: true,
    },
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
      address: "0x639A647fbe20b6c8ac19E48E2de44ea792c62c5C",
      name: "Celo Brazilian Real",
      symbol: "cREAL",
      decimals: 18,
    },
    {
      address: "0x32A9FE697a32135BFd313a6Ac28792DaE4D9979d",
      name: "Celo Kenyan Shilling",
      symbol: "cKES",
      decimals: 18,
    },
  ],
  
  // Celo Alfajores Testnet (44787)
  44787: [
    {
      address: zeroAddress,
      name: "Celo",
      symbol: "CELO",
      decimals: 18,
      isNative: true,
    },
    {
      address: "0x874069Fa1Eb16D44d622F2e0Ca25eeA172369bC1",
      name: "Celo Dollar",
      symbol: "cUSD",
      decimals: 18,
    },
    {
      address: "0x10c892A6EC43a53E45D0B916B4b7D383B1b78C0F",
      name: "Celo Euro",
      symbol: "cEUR",
      decimals: 18,
    },
  ],

  // Lisk Sepolia (4202)
  4202: [
    {
      address: zeroAddress,
      name: "Lisk",
      symbol: "LSK",
      decimals: 18,
      isNative: true,
    },
     {
      address: "0x874069Fa1Eb16D44d622F2e0Ca25eeA172369bC1",
      name: "Celo Dollar",
      symbol: "cUSD",
      decimals: 18,
    },
    {
      address: "0x10c892A6EC43a53E45D0B916B4b7D383B1b78C0F",
      name: "Celo Euro",
      symbol: "cEUR",
      decimals: 18,
    },
  ],

  // Arbitrum Sepolia (421614)
  421614: [
    {
      address: zeroAddress,
      name: "Ethereum",
      symbol: "ETH",
      decimals: 18,
      isNative: true,
    },
  ],

  // Base Sepolia (84532)
  84532: [
    {
      address: zeroAddress,
      name: "Ethereum",
      symbol: "ETH",
      decimals: 18,
      isNative: true,
    },
  ],

  // Arbitrum One (42161) - Commented out in original but adding tokens for reference
  42161: [
    {
      address: zeroAddress,
      name: "Ethereum",
      symbol: "ETH",
      decimals: 18,
      isNative: true,
    },
    {
      address: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
      name: "USD Coin",
      symbol: "USDC",
      decimals: 6,
    },
    {
      address: "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9",
      name: "Tether USD",
      symbol: "USDT",
      decimals: 6,
    },
    {
      address: "0x912CE59144191C1204E64559FE8253a0e49E6548",
      name: "Arbitrum",
      symbol: "ARB",
      decimals: 18,
    },
  ],

  // Base Mainnet (8453) - Commented out in original but adding tokens for reference
  8453: [
    {
      address: zeroAddress,
      name: "Ethereum",
      symbol: "ETH",
      decimals: 18,
      isNative: true,
    },
    {
      address: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
      name: "USD Coin",
      symbol: "USDC",
      decimals: 6,
    },
    {
      address: "0x4ed4E862860beD51a9570b96d89aF5E1B0Efefed",
      name: "Degen",
      symbol: "DEGEN",
      decimals: 18,
    },
  ],
}

// Enhanced template configurations with better structure
const FAUCET_USE_CASE_TEMPLATES: Record<FaucetType, Array<{
  templateName: string
  description: string
  idealUseCase: string
}>> = {
  [FAUCET_TYPES.OPEN]: [
    {
      templateName: "Community Token Distribution",
      description: "Wide distribution to community members with drop code protection",
      idealUseCase: "Best for token launches and community rewards",
    },
    {
      templateName: "Event-Based Distribution",
      description: "Token distribution at events, conferences, or hackathons",
      idealUseCase: "Perfect for hackathons, meetups, and conferences",
    },
    {
      templateName: "Marketing Campaign Distribution",
      description: "Public token distribution for promotional purposes",
      idealUseCase: "Great for increasing awareness and adoption",
    },
  ],
  [FAUCET_TYPES.GATED]: [
    {
      templateName: "Contest Winner Rewards",
      description: "Exclusive rewards for specific contest participants",
      idealUseCase: "Best for competitions and challenges",
    },
    {
      templateName: "Private Investor Airdrop",
      description: "Exclusive distribution to pre-selected wallet addresses",
      idealUseCase: "Perfect for investors, team members, and advisors",
    },
    {
      templateName: "DAO Member Rewards",
      description: "Rewards for active DAO contributors and governance participants",
      idealUseCase: "Great for governance participation incentives",
    },
  ],
  [FAUCET_TYPES.CUSTOM]: [
    {
      templateName: "Advanced Logic Airdrops",
      description: "Complex distribution with sophisticated rules and conditions",
      idealUseCase: "Best for sophisticated token distribution mechanisms",
    },
    {
      templateName: "Multi-Tier Reward System",
      description: "Different reward amounts based on user tier or activity",
      idealUseCase: "Perfect for loyalty programs and tiered distributions",
    },
    {
      templateName: "API-Integrated Distribution",
      description: "Built for seamless API integration and automated systems",
      idealUseCase: "Great for dApps and automated distribution systems",
    },
  ],
}

export default function CreateFaucetWizard() {
  const { provider, address, isConnected, connect, chainId } = useWallet()
  const { network, getFactoryAddress } = useNetwork()
  const { toast } = useToast()

  // Wizard navigation state
  const [wizardState, setWizardState] = useState<WizardStepState>({
    currentStep: 1,
    selectedFaucetType: '',
    formData: {
      faucetName: '',
      selectedTokenAddress: '',
      customTokenAddress: '',
      showCustomTokenInput: false,
      requiresDropCode: true,
    },
    showUseCasesDialog: false,
  })

  // Enhanced name validation state
  const [nameValidation, setNameValidation] = useState<NameValidationState>({
    isValidating: false,
    isNameAvailable: false,
    validationError: null,
  })

  // Custom token validation state
  const [customTokenValidation, setCustomTokenValidation] = useState<CustomTokenValidationState>({
    isValidating: false,
    isValid: false,
    tokenInfo: null,
    validationError: null,
  })

  // Component state for UI management
  const [availableTokens, setAvailableTokens] = useState<TokenConfiguration[]>([])
  const [isTokensLoading, setIsTokensLoading] = useState(false)
  const [isFaucetCreating, setIsFaucetCreating] = useState(false)
  const [creationError, setCreationError] = useState<string | null>(null)
  const [showConflictDetails, setShowConflictDetails] = useState(false)

  // Enhanced token fetching function with predefined tokens
  const fetchAvailableTokensForNetwork = async (): Promise<TokenConfiguration[]> => {
    if (!network) return []
    
    // Get predefined tokens for the current network
    const networkTokens = NETWORK_TOKENS[network.chainId] || []
    
    // Add native token if not already in the list
    const hasNativeToken = networkTokens.some(token => token.isNative)
    if (!hasNativeToken) {
      networkTokens.unshift({
        address: network.tokenAddress,
        name: network.nativeCurrency.name,
        symbol: network.nativeCurrency.symbol,
        decimals: network.nativeCurrency.decimals,
        isNative: true,
      })
    }
    
    return networkTokens
  }

  // Function to validate custom token address
  const validateCustomTokenAddress = useCallback(async (tokenAddress: string) => {
    if (!tokenAddress.trim()) {
      setCustomTokenValidation({
        isValidating: false,
        isValid: false,
        tokenInfo: null,
        validationError: null,
      })
      return
    }

    if (!isAddress(tokenAddress)) {
      setCustomTokenValidation({
        isValidating: false,
        isValid: false,
        tokenInfo: null,
        validationError: "Invalid token address format",
      })
      return
    }

    if (!provider) {
      setCustomTokenValidation({
        isValidating: false,
        isValid: false,
        tokenInfo: null,
        validationError: "Please connect your wallet to validate the token",
      })
      return
    }

    setCustomTokenValidation(prev => ({ ...prev, isValidating: true, validationError: null }))

    try {
      // Create a contract instance to fetch token details
      const tokenContract = new (await import("ethers")).Contract(
        tokenAddress,
        [
          "function name() view returns (string)",
          "function symbol() view returns (string)",
          "function decimals() view returns (uint8)",
        ],
        provider
      )

      const [name, symbol, decimals] = await Promise.all([
        tokenContract.name(),
        tokenContract.symbol(),
        tokenContract.decimals(),
      ])

      const tokenInfo: TokenConfiguration = {
        address: tokenAddress,
        name,
        symbol,
        decimals,
        isCustom: true,
      }

      setCustomTokenValidation({
        isValidating: false,
        isValid: true,
        tokenInfo,
        validationError: null,
      })
      
    } catch (error: any) {
      console.error("Custom token validation error:", error)
      setCustomTokenValidation({
        isValidating: false,
        isValid: false,
        tokenInfo: null,
        validationError: "Failed to fetch token information. Please check if the address is correct and the token follows ERC-20 standard.",
      })
    }
  }, [provider])

  // Debounced custom token validation
  useEffect(() => {
    if (wizardState.formData.showCustomTokenInput && wizardState.formData.customTokenAddress.trim()) {
      const validationTimer = setTimeout(() => {
        validateCustomTokenAddress(wizardState.formData.customTokenAddress)
      }, 500)

      return () => clearTimeout(validationTimer)
    }
  }, [wizardState.formData.customTokenAddress, wizardState.formData.showCustomTokenInput, validateCustomTokenAddress])

  // ✅ FIXED: Enhanced faucet type availability checking with proper logging
  const isFaucetTypeAvailableOnNetwork = (faucetType: FaucetType): boolean => {
    if (!chainId) {
      console.log("❌ No chainId available for type check")
      return false
    }
    
    const mappedFactoryType = FAUCET_TYPE_TO_FACTORY_TYPE_MAPPING[faucetType]
    const isAvailable = isFactoryTypeAvailable(chainId, mappedFactoryType)
    
    console.log(`🔍 Checking availability for ${faucetType} (${mappedFactoryType}) on chain ${chainId}:`, isAvailable)
    
    return isAvailable
  }

  // Get list of unavailable faucet types for current network
  const getUnavailableFaucetTypesForNetwork = (): FaucetType[] => {
    if (!chainId) return []
    
    const unavailableTypes: FaucetType[] = []
    Object.entries(FAUCET_TYPE_TO_FACTORY_TYPE_MAPPING).forEach(([faucetType, factoryType]) => {
      if (!isFactoryTypeAvailable(chainId, factoryType)) {
        unavailableTypes.push(faucetType as FaucetType)
      }
    })
    
    return unavailableTypes
  }

  // Enhanced name validation with multi-factory support
  const validateFaucetNameAcrossFactories = useCallback(async (nameToValidate: string) => {
    if (!nameToValidate.trim()) {
      setNameValidation({
        isValidating: false,
        isNameAvailable: false,
        validationError: null,
      })
      return
    }

    if (!provider || !chainId || !network) {
      setNameValidation({
        isValidating: false,
        isNameAvailable: false,
        validationError: "Please connect your wallet to validate the name",
      })
      return
    }

    if (!wizardState.selectedFaucetType) {
      setNameValidation({
        isValidating: false,
        isNameAvailable: false,
        validationError: "Please select a faucet type before validating the name",
      })
      return
    }

    const mappedFactoryType = FAUCET_TYPE_TO_FACTORY_TYPE_MAPPING[wizardState.selectedFaucetType as FaucetType]
    const primaryFactoryAddress = getFactoryAddress(mappedFactoryType)
    
    if (!primaryFactoryAddress) {
      setNameValidation({
        isValidating: false,
        isNameAvailable: false,
        validationError: `${wizardState.selectedFaucetType} faucets are not available on this network`,
      })
      return
    }

    setNameValidation(prev => ({ ...prev, isValidating: true, validationError: null }))

    try {
      console.log(`Validating name "${nameToValidate}" across all factories on ${network.name}...`)
      
      const validationResult = await checkFaucetNameExists(provider, network, nameToValidate)
      
      if (validationResult.exists && validationResult.conflictingFaucets) {
        const conflictCount = validationResult.conflictingFaucets.length
        const factoryTypeList = validationResult.conflictingFaucets
          .map((conflict: ValidationConflict) => `${conflict.factoryType} factory`)
          .join(', ')
        
        setNameValidation({
          isValidating: false,
          isNameAvailable: false,
          validationError: conflictCount > 1 
            ? `Name "${validationResult.existingFaucet?.name}" exists in ${conflictCount} factories: ${factoryTypeList}`
            : `Name "${validationResult.existingFaucet?.name}" already exists in ${factoryTypeList}`,
          conflictingFaucets: validationResult.conflictingFaucets.map((conflict: ValidationConflict) => ({
            faucetAddress: conflict.address,
            faucetName: conflict.name,
            ownerAddress: conflict.owner,
            factoryAddress: conflict.factoryAddress,
            factoryType: conflict.factoryType,
          })),
        })
        return
      }

      if (validationResult.warning) {
        console.warn("Name validation warning:", validationResult.warning)
        setNameValidation({
          isValidating: false,
          isNameAvailable: true,
          validationError: null,
          validationWarning: validationResult.warning,
        })
        return
      }
      
      setNameValidation({
        isValidating: false,
        isNameAvailable: true,
        validationError: null,
      })
      
    } catch (error: any) {
      console.error("Name validation error:", error)
      setNameValidation({
        isValidating: false,
        isNameAvailable: false,
        validationError: "Failed to validate name across all factories",
      })
    }
  }, [provider, chainId, network, wizardState.selectedFaucetType, getFactoryAddress])

  // Debounced name validation effect
  useEffect(() => {
    const validationTimer = setTimeout(() => {
      if (wizardState.formData.faucetName.trim() && wizardState.formData.faucetName.length >= 3) {
        validateFaucetNameAcrossFactories(wizardState.formData.faucetName)
      }
    }, 500)

    return () => clearTimeout(validationTimer)
  }, [wizardState.formData.faucetName, validateFaucetNameAcrossFactories])

  // Load available tokens when network changes
  useEffect(() => {
    const loadNetworkTokens = async () => {
      if (!network) return
      
      setIsTokensLoading(true)
      try {
        const tokens = await fetchAvailableTokensForNetwork()
        setAvailableTokens(tokens)
        if (tokens.length > 0 && !wizardState.formData.selectedTokenAddress) {
          setWizardState(prev => ({
            ...prev,
            formData: {
              ...prev.formData,
              selectedTokenAddress: tokens[0].address,
            }
          }))
        }
      } catch (error) {
        console.error("Failed to load tokens:", error)
        setCreationError("Failed to load available tokens")
      } finally {
        setIsTokensLoading(false)
      }
    }
    
    loadNetworkTokens()
  }, [network, wizardState.formData.selectedTokenAddress])

  // Network support validation and faucet type reset
  useEffect(() => {
    if (!chainId || !network) {
      setCreationError("Please connect your wallet to a supported network")
      return
    }

    setCreationError(null)
    // Reset faucet type if it's not available on current network
    if (wizardState.selectedFaucetType && !isFaucetTypeAvailableOnNetwork(wizardState.selectedFaucetType as FaucetType)) {
      setWizardState(prev => ({ ...prev, selectedFaucetType: '' }))
      toast({
        title: "Faucet Type Unavailable",
        description: `${wizardState.selectedFaucetType} faucets are not available on ${network.name}. Please select a different type.`,
        variant: "destructive",
      })
    }
  }, [chainId, network, wizardState.selectedFaucetType, toast])

  // Reset custom token input when switching away from custom
  useEffect(() => {
    if (!wizardState.formData.showCustomTokenInput) {
      setWizardState(prev => ({
        ...prev,
        formData: {
          ...prev.formData,
          customTokenAddress: '',
        }
      }))
      setCustomTokenValidation({
        isValidating: false,
        isValid: false,
        tokenInfo: null,
        validationError: null,
      })
    }
  }, [wizardState.formData.showCustomTokenInput])

  // Helper function to get selected token information
  const getSelectedTokenConfiguration = (): TokenConfiguration | null => {
    if (wizardState.formData.showCustomTokenInput && customTokenValidation.tokenInfo) {
      return customTokenValidation.tokenInfo
    }
    return availableTokens.find((token) => token.address === wizardState.formData.selectedTokenAddress) || null
  }

  // Get the final token address to use
  const getFinalTokenAddress = (): string => {
    if (wizardState.formData.showCustomTokenInput && customTokenValidation.isValid) {
      return wizardState.formData.customTokenAddress
    }
    return wizardState.formData.selectedTokenAddress
  }

  // Navigation functions
  const proceedToNextStep = () => {
    if (wizardState.currentStep < 3) {
      setWizardState(prev => ({ ...prev, currentStep: prev.currentStep + 1 }))
    }
  }

  const returnToPreviousStep = () => {
    if (wizardState.currentStep > 1) {
      setWizardState(prev => ({ ...prev, currentStep: prev.currentStep - 1 }))
    }
  }

  // ✅ FIXED: Enhanced type selection with validation
  const selectFaucetType = (type: FaucetType) => {
    if (!isFaucetTypeAvailableOnNetwork(type)) {
      console.warn(`❌ Cannot select ${type} - not available on current network`)
      toast({
        title: "Faucet Type Unavailable",
        description: `${type} faucets are not available on ${network?.name}`,
        variant: "destructive",
      })
      return
    }
    
    console.log(`✅ Selected faucet type: ${type}`)
    setWizardState(prev => ({ ...prev, selectedFaucetType: type }))
  }

  // Function to handle token selection change
  const handleTokenSelectionChange = (value: string) => {
    if (value === "custom") {
      setWizardState(prev => ({
        ...prev,
        formData: {
          ...prev.formData,
          showCustomTokenInput: true,
          selectedTokenAddress: '',
        }
      }))
    } else {
      setWizardState(prev => ({
        ...prev,
        formData: {
          ...prev.formData,
          showCustomTokenInput: false,
          selectedTokenAddress: value,
        }
      }))
    }
  }

  // ✅ FIXED: Enhanced faucet creation function with better debugging
  const handleFaucetCreation = async () => {
    if (!wizardState.formData.faucetName.trim()) {
      setCreationError("Please enter a faucet name")
      return
    }
    if (!nameValidation.isNameAvailable) {
      setCreationError("Please choose a valid faucet name")
      return
    }

    const finalTokenAddress = getFinalTokenAddress()
    if (!finalTokenAddress) {
      setCreationError("Please select a token or enter a custom token address")
      return
    }

    if (wizardState.formData.showCustomTokenInput && !customTokenValidation.isValid) {
      setCreationError("Please enter a valid custom token address")
      return
    }

    if (!chainId || !network) {
      setCreationError("Please connect your wallet to a supported network")
      return
    }

    const mappedFactoryType = FAUCET_TYPE_TO_FACTORY_TYPE_MAPPING[wizardState.selectedFaucetType as FaucetType]
    const factoryAddress = getFactoryAddress(mappedFactoryType)
    
    if (!factoryAddress) {
      setCreationError(`${wizardState.selectedFaucetType} faucets are not available on this network`)
      return
    }

    setCreationError(null)

    if (!isConnected) {
      try {
        await connect()
      } catch (error) {
        console.error("Failed to connect wallet:", error)
        setCreationError("Failed to connect wallet. Please try again.")
        return
      }
    }

    if (!provider) {
      setCreationError("Wallet not connected")
      return
    }

    if (!address) {
      setCreationError("Unable to get wallet address")
      return
    }

    setIsFaucetCreating(true)
    try {
      // ✅ FIXED: Better parameter determination with debugging
      let shouldUseBackend = false
      let isCustomFaucet = false

      console.log("🏭 Creating faucet with selected type:", wizardState.selectedFaucetType)
      console.log("🏭 Mapped factory type:", mappedFactoryType)
      console.log("🏭 Factory address:", factoryAddress)
      console.log("🏭 Final token address:", finalTokenAddress)

      switch (wizardState.selectedFaucetType) {
        case FAUCET_TYPES.OPEN: // 'open'
          shouldUseBackend = wizardState.formData.requiresDropCode
          isCustomFaucet = false
          console.log("✅ Creating OPEN faucet (DropCode) - Backend:", shouldUseBackend)
          break
        case FAUCET_TYPES.GATED: // 'gated' 
          shouldUseBackend = false
          isCustomFaucet = false
          console.log("✅ Creating GATED faucet (DropList) - No backend needed")
          break
        case FAUCET_TYPES.CUSTOM: // 'custom'
          shouldUseBackend = false
          isCustomFaucet = true
          console.log("✅ Creating CUSTOM faucet - Custom flag enabled")
          break
        default:
          throw new Error(`Invalid faucet type selected: ${wizardState.selectedFaucetType}`)
      }

      console.log("🔧 Final creation parameters:", {
        factoryAddress,
        factoryType: mappedFactoryType,
        faucetName: wizardState.formData.faucetName,
        tokenAddress: finalTokenAddress,
        chainId: chainId.toString(),
        shouldUseBackend,
        isCustomFaucet,
        selectedFaucetType: wizardState.selectedFaucetType,
        requiresDropCode: wizardState.formData.requiresDropCode,
        userAddress: address,
        isCustomToken: wizardState.formData.showCustomTokenInput,
      })

      const createdFaucetAddress = await createFaucet(
        provider,
        factoryAddress,
        wizardState.formData.faucetName,
        finalTokenAddress,
        BigInt(chainId),
        BigInt(chainId),
        shouldUseBackend,
        isCustomFaucet
      )

      if (!createdFaucetAddress) {
        throw new Error("Failed to get created faucet address")
      }

      console.log("🎉 Faucet created successfully at:", createdFaucetAddress)
      console.log("🎉 Expected type:", mappedFactoryType)

      const selectedToken = getSelectedTokenConfiguration()
      toast({
        title: "Faucet Created Successfully! 🎉",
        description: `Your ${selectedToken?.symbol || "token"} faucet (${mappedFactoryType}) has been created at ${createdFaucetAddress}`,
      })

      // ✅ Add a small delay to ensure the contract is indexed before redirecting
      setTimeout(() => {
        window.location.href = `/faucet/${createdFaucetAddress}?networkId=${chainId}`
      }, 2000)

    } catch (error: any) {
      console.error("❌ Error creating faucet:", error)
      let errorMessage = error.message || "Failed to create faucet"
      
      toast({
        title: "Failed to create faucet",
        description: errorMessage,
        variant: "destructive",
      })
      setCreationError(errorMessage)
    } finally {
      setIsFaucetCreating(false)
    }
  }

  // Step title and description helpers
  const getWizardStepTitle = (step: number): string => {
    switch (step) {
      case 1: return "Choose Faucet Type"
      case 2: return "Configure Details"
      case 3: return "Review & Create"
      default: return "Create Faucet"
    }
  }

  const getWizardStepDescription = (step: number): string => {
    switch (step) {
      case 1: return "Select the type of faucet that fits your needs"
      case 2: return "Set up your faucet parameters and select tokens"
      case 3: return "Review your configuration and create"
      default: return "Create your token faucet"
    }
  }

  // Component for rendering use case templates
  const renderUseCaseTemplates = (faucetType: FaucetType) => {
    const templates = FAUCET_USE_CASE_TEMPLATES[faucetType]
    if (!templates) return null

    return (
      <div className="space-y-3">
        {templates.map((template, index) => (
          <div key={index} className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <div className="font-medium">{template.templateName}</div>
            <div className="text-sm text-gray-600 mt-1">{template.idealUseCase}</div>
          </div>
        ))}
      </div>
    )
  }

  // Component for showing detailed conflict information
  const ConflictDetailsDialog = () => {
    if (!nameValidation.conflictingFaucets || nameValidation.conflictingFaucets.length === 0) {
      return null
    }

    return (
      <>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => setShowConflictDetails(true)}
          className="mt-2"
        >
          <Info className="h-4 w-4 mr-2" />
          View Conflict Details
        </Button>
        
        <Dialog open={showConflictDetails} onOpenChange={setShowConflictDetails}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Name Conflicts Found</DialogTitle>
              <DialogDescription>
                The name "{wizardState.formData.faucetName}" is already used by {nameValidation.conflictingFaucets.length} faucet(s) on this network:
              </DialogDescription>
            </DialogHeader>
            <div className="mt-4 space-y-3 max-h-60 overflow-y-auto">
              {nameValidation.conflictingFaucets.map((conflict: FaucetNameConflict, index: number) => (
                <div key={index} className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <AlertTriangle className="h-4 w-4 text-red-600" />
                      <span className="font-medium capitalize">{conflict.factoryType} Factory</span>
                    </div>
                    <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded">
                      Conflict
                    </span>
                  </div>
                  <div className="mt-2 space-y-1 text-sm">
                    <div>
                      <span className="text-gray-500">Faucet:</span> {conflict.faucetAddress.slice(0, 8)}...{conflict.faucetAddress.slice(-6)}
                    </div>
                    <div>
                      <span className="text-gray-500">Owner:</span> {conflict.ownerAddress.slice(0, 8)}...{conflict.ownerAddress.slice(-6)}
                    </div>
                    <div>
                      <span className="text-gray-500">Factory:</span> {conflict.factoryAddress.slice(0, 8)}...{conflict.factoryAddress.slice(-6)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex items-center space-x-2 mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <Info className="h-4 w-4 text-blue-600" />
              <span className="text-sm text-blue-700 dark:text-blue-300">
                Please choose a different name to avoid conflicts across factory types.
              </span>
            </div>
          </DialogContent>
        </Dialog>
      </>
    )
  }

  // Step 1: Faucet Type Selection
  const renderFaucetTypeSelection = () => {
    const unavailableTypes = getUnavailableFaucetTypesForNetwork()

    return (
      <div className="space-y-6">
        {!network && (
          <Alert className="border-red-500 bg-red-50 dark:bg-red-900/20">
            <AlertTriangle className="h-4 w-4 text-red-600" />
            <AlertTitle className="text-red-700 dark:text-red-300">No Network Selected</AlertTitle>
            <AlertDescription className="text-red-700 dark:text-red-300">
              Please connect your wallet and switch to a supported network to create a faucet.
            </AlertDescription>
          </Alert>
        )}

        {unavailableTypes.length > 0 && network && (
          <Alert className="border-orange-500 bg-orange-50 dark:bg-orange-900/20">
            <AlertTriangle className="h-4 w-4 text-orange-600" />
            <AlertTitle className="text-orange-700 dark:text-orange-300">Limited Factory Support</AlertTitle>
            <AlertDescription className="text-orange-700 dark:text-orange-300">
              Some faucet types are not yet available on {network.name}:
              <div className="mt-2 space-y-1">
                {unavailableTypes.map((type) => (
                  <div key={type} className="flex items-center space-x-2">
                    <XCircle className="h-3 w-3" />
                    <span className="capitalize">{type} Drop</span>
                  </div>
                ))}
              </div>
            </AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Open Drop Faucet Card */}
          <Card
            className={`cursor-pointer border-2 transition-all ${
              !isFaucetTypeAvailableOnNetwork(FAUCET_TYPES.OPEN) 
                ? 'border-gray-200 bg-gray-50 opacity-50 cursor-not-allowed' 
                : wizardState.selectedFaucetType === FAUCET_TYPES.OPEN 
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' 
                  : 'border-gray-200 hover:border-gray-300'
            }`}
            onClick={() => isFaucetTypeAvailableOnNetwork(FAUCET_TYPES.OPEN) && selectFaucetType(FAUCET_TYPES.OPEN)}
          >
            <CardHeader>
              <div className="flex items-center space-x-2">
                <Globe className={`h-5 w-5 ${isFaucetTypeAvailableOnNetwork(FAUCET_TYPES.OPEN) ? 'text-green-600' : 'text-gray-400'}`} />
                <CardTitle className="text-lg flex items-center space-x-2">
                  <span>Open Drop</span>
                  {!isFaucetTypeAvailableOnNetwork(FAUCET_TYPES.OPEN) && (
                    <XCircle className="h-4 w-4 text-red-500" />
                  )}
                </CardTitle>
              </div>
              <CardDescription>Anyone with a Drop Code</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600">
                Open faucet for wide distribution with drop code protection.
              </p>
              {!isFaucetTypeAvailableOnNetwork(FAUCET_TYPES.OPEN) && (
                <p className="text-xs text-red-600 mt-2">Not available on this network</p>
              )}
            </CardContent>
          </Card>
          
          {/* Gated Drop Faucet Card */}
          <Card
            className={`cursor-pointer border-2 transition-all ${
              !isFaucetTypeAvailableOnNetwork(FAUCET_TYPES.GATED) 
                ? 'border-gray-200 bg-gray-50 opacity-50 cursor-not-allowed' 
                : wizardState.selectedFaucetType === FAUCET_TYPES.GATED 
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' 
                  : 'border-gray-200 hover:border-gray-300'
            }`}
            onClick={() => isFaucetTypeAvailableOnNetwork(FAUCET_TYPES.GATED) && selectFaucetType(FAUCET_TYPES.GATED)}
          >
            <CardHeader>
              <div className="flex items-center space-x-2">
                <Shield className={`h-5 w-5 ${isFaucetTypeAvailableOnNetwork(FAUCET_TYPES.GATED) ? 'text-orange-600' : 'text-gray-400'}`} />
                <CardTitle className="text-lg flex items-center space-x-2">
                  <span>Whitelist Drop</span>
                  {!isFaucetTypeAvailableOnNetwork(FAUCET_TYPES.GATED) && (
                    <XCircle className="h-4 w-4 text-red-500" />
                  )}
                </CardTitle>
              </div>
              <CardDescription>Only Selected Wallets</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600">
                Restricted faucet for specific wallet addresses only.
              </p>
              {!isFaucetTypeAvailableOnNetwork(FAUCET_TYPES.GATED) && (
                <p className="text-xs text-red-600 mt-2">Not available on this network</p>
              )}
            </CardContent>
          </Card>

          {/* Custom Drop Faucet Card */}
          <Card
            className={`cursor-pointer border-2 transition-all ${
              !isFaucetTypeAvailableOnNetwork(FAUCET_TYPES.CUSTOM) 
                ? 'border-gray-200 bg-gray-50 opacity-50 cursor-not-allowed' 
                : wizardState.selectedFaucetType === FAUCET_TYPES.CUSTOM 
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' 
                  : 'border-gray-200 hover:border-gray-300'
            }`}
            onClick={() => isFaucetTypeAvailableOnNetwork(FAUCET_TYPES.CUSTOM) && selectFaucetType(FAUCET_TYPES.CUSTOM)}
          >
            <CardHeader>
              <div className="flex items-center space-x-2">
                <Settings className={`h-5 w-5 ${isFaucetTypeAvailableOnNetwork(FAUCET_TYPES.CUSTOM) ? 'text-purple-600' : 'text-gray-400'}`} />
                <CardTitle className="text-lg flex items-center space-x-2">
                  <span>Custom Drop</span>
                  {!isFaucetTypeAvailableOnNetwork(FAUCET_TYPES.CUSTOM) && (
                    <XCircle className="h-4 w-4 text-red-500" />
                  )}
                </CardTitle>
              </div>
              <CardDescription>Advanced Configuration</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600">
                Fully customizable faucet with advanced features and API integration.
              </p>
              {!isFaucetTypeAvailableOnNetwork(FAUCET_TYPES.CUSTOM) && (
                <p className="text-xs text-red-600 mt-2">Not available on this network</p>
              )}
            </CardContent>
          </Card>
        </div>
        
        {wizardState.selectedFaucetType && (
          <>
            <Alert>
              <Info className="h-4 w-4" />
              <AlertTitle>
                {wizardState.selectedFaucetType === FAUCET_TYPES.OPEN ? "Open Drop Selected" : 
                 wizardState.selectedFaucetType === FAUCET_TYPES.GATED ? "Whitelist Drop Selected" : 
                 "Custom Drop Selected"}
              </AlertTitle>
              <AlertDescription>
                {wizardState.selectedFaucetType === FAUCET_TYPES.OPEN
                  ? "This faucet will be accessible to anyone with a drop code for security."
                  : wizardState.selectedFaucetType === FAUCET_TYPES.GATED
                  ? "This faucet will be restricted to specific wallet addresses that you whitelist."
                  : "This faucet offers advanced customization options and is perfect for complex distribution scenarios."}
              </AlertDescription>
            </Alert>
            
            {/* Desktop: Show use cases inline */}
            <Card className="hidden md:block">
              <CardHeader>
                <CardTitle className="text-lg">Available Use Cases</CardTitle>
                <CardDescription>
                  These are common use cases for {
                    wizardState.selectedFaucetType === FAUCET_TYPES.OPEN ? "open drop" : 
                    wizardState.selectedFaucetType === FAUCET_TYPES.GATED ? "whitelist drop" : 
                    "custom drop"
                  } faucets
                </CardDescription>
              </CardHeader>
              <CardContent>
                {renderUseCaseTemplates(wizardState.selectedFaucetType as FaucetType)}
              </CardContent>
            </Card>

            {/* Mobile: Show use cases in popup */}
            <div className="md:hidden">
              <Dialog open={wizardState.showUseCasesDialog} onOpenChange={(open) => 
                setWizardState(prev => ({ ...prev, showUseCasesDialog: open }))}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="w-full">
                    <Info className="h-4 w-4 mr-2" />
                    View Use Cases
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>Available Use Cases</DialogTitle>
                    <DialogDescription>
                      Common use cases for {
                        wizardState.selectedFaucetType === FAUCET_TYPES.OPEN ? "open drop" : 
                        wizardState.selectedFaucetType === FAUCET_TYPES.GATED ? "whitelist drop" : 
                        "custom drop"
                      } faucets
                    </DialogDescription>
                  </DialogHeader>
                  <div className="mt-4">
                    {renderUseCaseTemplates(wizardState.selectedFaucetType as FaucetType)}
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            {wizardState.selectedFaucetType === FAUCET_TYPES.CUSTOM && (
              <Alert className="border-purple-500 bg-purple-50 dark:bg-purple-900/20">
                <Zap className="h-4 w-4 text-purple-600" />
                <AlertTitle className="text-purple-700 dark:text-purple-300">Advanced Features</AlertTitle>
                <AlertDescription className="text-purple-700 dark:text-purple-300">
                  Custom faucets provide maximum flexibility with features like dynamic claim amounts, 
                  complex eligibility rules, API integrations, and custom distribution logic.
                </AlertDescription>
              </Alert>
            )}
          </>
        )}
      </div>
    )
  }

  // Step 2: Configuration Details
  const renderConfigurationDetails = () => (
    <div className="space-y-6">
      <div className="space-y-4">
        {/* Enhanced Faucet Name Input with Multi-Factory Validation */}
        <div className="space-y-2">
          <Label htmlFor="faucet-name">Faucet Name</Label>
          <div className="relative">
            <Input
              id="faucet-name"
              placeholder="Enter a unique name for your faucet (e.g., Community Airdrop)"
              value={wizardState.formData.faucetName}
              onChange={(e) => setWizardState(prev => ({
                ...prev,
                formData: { ...prev.formData, faucetName: e.target.value }
              }))}
              className={
                wizardState.formData.faucetName.length >= 3 && nameValidation.validationError
                  ? "border-red-500 focus:border-red-500"
                  : wizardState.formData.faucetName.length >= 3 && nameValidation.isNameAvailable
                  ? "border-green-500 focus:border-green-500"
                  : ""
              }
            />
            {wizardState.formData.faucetName.length >= 3 && (
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                {nameValidation.isValidating ? (
                  <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                ) : nameValidation.isNameAvailable ? (
                  <Check className="h-4 w-4 text-green-500" />
                ) : nameValidation.validationError ? (
                  <AlertTriangle className="h-4 w-4 text-red-500" />
                ) : null}
              </div>
            )}
          </div>
          
          {/* Enhanced Validation Feedback */}
          {wizardState.formData.faucetName.length >= 3 && nameValidation.validationError && (
            <div className="space-y-2">
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  {nameValidation.validationError}
                </AlertDescription>
              </Alert>
              {nameValidation.conflictingFaucets && nameValidation.conflictingFaucets.length > 0 && (
                <ConflictDetailsDialog />
              )}
            </div>
          )}
          
          {wizardState.formData.faucetName.length >= 3 && nameValidation.isNameAvailable && (
            <Alert className="border-green-500 bg-green-50 dark:bg-green-900/20">
              <Check className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-700 dark:text-green-300">
                Great! This name is available across all factory types on {network?.name}.
                {nameValidation.validationWarning && (
                  <div className="mt-1 text-xs text-yellow-700">
                    Note: {nameValidation.validationWarning}
                  </div>
                )}
              </AlertDescription>
            </Alert>
          )}
          
          {wizardState.formData.faucetName.length > 0 && wizardState.formData.faucetName.length < 3 && (
            <p className="text-sm text-gray-500">
              Name must be at least 3 characters long
            </p>
          )}
        </div>
        
        {/* Enhanced Token Selection with Multiple Options */}
        <div className="space-y-2">
          <Label htmlFor="token-selector">Select Token</Label>
          
          {/* Token Selection Dropdown */}
          <Select 
            value={wizardState.formData.showCustomTokenInput ? "custom" : wizardState.formData.selectedTokenAddress} 
            onValueChange={handleTokenSelectionChange}
          >
            <SelectTrigger id="token-selector">
              <SelectValue placeholder={isTokensLoading ? "Loading tokens..." : "Select a token"} />
            </SelectTrigger>
            <SelectContent>
              {/* Predefined Tokens */}
              {availableTokens.map((token) => (
                <SelectItem key={token.address} value={token.address}>
                  <div className="flex items-center space-x-2">
                    <Coins className="h-4 w-4 text-gray-400" />
                    <span className="font-medium">{token.symbol}</span>
                    <span className="text-gray-500">({token.name})</span>
                    {token.isNative && (
                      <span className="text-xs bg-blue-100 text-blue-800 px-1 rounded">Native</span>
                    )}
                  </div>
                </SelectItem>
              ))}
              
              {/* Divider */}
              {availableTokens.length > 0 && (
                <SelectItem disabled value="_divider" className="border-t border-gray-200 mt-1 pt-1">
                  <span className="text-gray-400 text-xs">━━━━━━━━━━━━━━━━━━━━</span>
                </SelectItem>
              )}
              
              {/* Custom Token Option */}
              <SelectItem value="custom">
                <div className="flex items-center space-x-2">
                  <Plus className="h-4 w-4 text-purple-600" />
                  <span className="font-medium text-purple-600">Add Custom Token</span>
                </div>
              </SelectItem>
            </SelectContent>
          </Select>

          {/* Custom Token Input */}
          {wizardState.formData.showCustomTokenInput && (
            <div className="space-y-3 p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200">
              <div className="flex items-center justify-between">
                <Label htmlFor="custom-token-address" className="text-purple-700 dark:text-purple-300">
                  Custom Token Contract Address
                </Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setWizardState(prev => ({
                    ...prev,
                    formData: {
                      ...prev.formData,
                      showCustomTokenInput: false,
                      selectedTokenAddress: availableTokens[0]?.address || '',
                    }
                  }))}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              
              <div className="relative">
                <Input
                  id="custom-token-address"
                  placeholder="Enter ERC-20 token contract address (0x...)"
                  value={wizardState.formData.customTokenAddress}
                  onChange={(e) => setWizardState(prev => ({
                    ...prev,
                    formData: { ...prev.formData, customTokenAddress: e.target.value }
                  }))}
                  className={
                    wizardState.formData.customTokenAddress.length > 0 && customTokenValidation.validationError
                      ? "border-red-500 focus:border-red-500"
                      : wizardState.formData.customTokenAddress.length > 0 && customTokenValidation.isValid
                      ? "border-green-500 focus:border-green-500"
                      : ""
                  }
                />
                {wizardState.formData.customTokenAddress.length > 0 && (
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                    {customTokenValidation.isValidating ? (
                      <Loader2 className="h-4 w-4 animate-spin text-purple-500" />
                    ) : customTokenValidation.isValid ? (
                      <Check className="h-4 w-4 text-green-500" />
                    ) : customTokenValidation.validationError ? (
                      <AlertTriangle className="h-4 w-4 text-red-500" />
                    ) : null}
                  </div>
                )}
              </div>

              {/* Custom Token Validation Feedback */}
              {wizardState.formData.customTokenAddress.length > 0 && customTokenValidation.validationError && (
                <Alert variant="destructive" className="mt-2">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    {customTokenValidation.validationError}
                  </AlertDescription>
                </Alert>
              )}

              {wizardState.formData.customTokenAddress.length > 0 && customTokenValidation.isValid && customTokenValidation.tokenInfo && (
                <Alert className="border-green-500 bg-green-50 dark:bg-green-900/20 mt-2">
                  <Check className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-700 dark:text-green-300">
                    <div className="space-y-1">
                      <div className="font-medium">Token Found:</div>
                      <div className="flex items-center space-x-2 text-sm">
                        <span>{customTokenValidation.tokenInfo.symbol}</span>
                        <span>({customTokenValidation.tokenInfo.name})</span>
                        <span className="text-xs bg-green-100 text-green-800 px-1 rounded">
                          {customTokenValidation.tokenInfo.decimals} decimals
                        </span>
                      </div>
                    </div>
                  </AlertDescription>
                </Alert>
              )}

              <div className="text-xs text-purple-600 dark:text-purple-400">
                <Info className="h-3 w-3 inline mr-1" />
                We'll automatically fetch the token details from the contract. Make sure the token follows ERC-20 standard.
              </div>
            </div>
          )}

          {/* Token Information Display */}
          {!wizardState.formData.showCustomTokenInput && wizardState.formData.selectedTokenAddress && (
            <div className="text-sm text-gray-600">
              {(() => {
                const selectedToken = availableTokens.find(t => t.address === wizardState.formData.selectedTokenAddress)
                return selectedToken ? (
                  <div className="flex items-center space-x-2 p-2 bg-gray-50 dark:bg-gray-800 rounded">
                    <Coins className="h-4 w-4" />
                    <span>{selectedToken.symbol} - {selectedToken.name}</span>
                    <span className="text-xs text-gray-500">({selectedToken.decimals} decimals)</span>
                    {selectedToken.isNative && (
                      <span className="text-xs bg-blue-100 text-blue-800 px-1 rounded">Native</span>
                    )}
                  </div>
                ) : null
              })()}
            </div>
          )}
        </div>
        
        {/* Drop Code Requirement (Open Faucets Only) */}
        {wizardState.selectedFaucetType === FAUCET_TYPES.OPEN && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="drop-code-toggle">Require Drop Code</Label>
              <Switch
                id="drop-code-toggle"
                disabled
                checked={wizardState.formData.requiresDropCode}
                onCheckedChange={(checked) => setWizardState(prev => ({
                  ...prev,
                  formData: { ...prev.formData, requiresDropCode: checked }
                }))}
              />
            </div>
            <p className="text-sm text-gray-600">
              Drop codes provide additional security for open faucets
            </p>
          </div>
        )}

        {/* Custom Faucet Information */}
        {wizardState.selectedFaucetType === FAUCET_TYPES.CUSTOM && (
          <Alert className="border-purple-500 bg-purple-50 dark:bg-purple-900/20">
            <Settings className="h-4 w-4 text-purple-600" />
            <AlertTitle className="text-purple-700 dark:text-purple-300">Custom Configuration</AlertTitle>
            <AlertDescription className="text-purple-700 dark:text-purple-300">
              After creation, you'll have access to advanced settings including custom claim amounts, 
              dynamic distribution rules, and API endpoints for external integrations.
            </AlertDescription>
          </Alert>
        )}
      </div>
    </div>
  )

  // Step 3: Review and Create
  const renderReviewAndCreate = () => {
    const selectedTokenConfig = getSelectedTokenConfiguration()
    const mappedFactoryType = FAUCET_TYPE_TO_FACTORY_TYPE_MAPPING[wizardState.selectedFaucetType as FaucetType]
    const factoryAddress = getFactoryAddress(mappedFactoryType)
    const finalTokenAddress = getFinalTokenAddress()

    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Faucet Configuration Summary</CardTitle>
            <CardDescription>Review your configuration before creating the faucet</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-500">Network</Label>
                <p className="flex items-center space-x-2">
                  <Coins className="h-4 w-4 text-blue-600" />
                  <span>{network?.name || "Unknown Network"}</span>
                  {network?.isTestnet && (
                    <span className="text-xs bg-orange-100 text-orange-800 px-2 py-1 rounded">
                      Testnet
                    </span>
                  )}
                </p>
              </div>
              
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-500">Faucet Type</Label>
                <p className="flex items-center space-x-2">
                  {wizardState.selectedFaucetType === FAUCET_TYPES.OPEN ? (
                    <>
                      <Globe className="h-4 w-4 text-green-600" />
                      <span>Open Drop</span>
                    </>
                  ) : wizardState.selectedFaucetType === FAUCET_TYPES.GATED ? (
                    <>
                      <Shield className="h-4 w-4 text-orange-600" />
                      <span>Whitelist Drop</span>
                    </>
                  ) : (
                    <>
                      <Settings className="h-4 w-4 text-purple-600" />
                      <span>Custom Drop</span>
                    </>
                  )}
                </p>
              </div>
              
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-500">Factory Address</Label>
                <p className="text-sm font-mono text-gray-600">
                  {factoryAddress ? `${factoryAddress.slice(0, 6)}...${factoryAddress.slice(-4)}` : 'N/A'}
                </p>
              </div>
              
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-500">Faucet Name</Label>
                <p className="flex items-center space-x-2">
                  <span>{wizardState.formData.faucetName}</span>
                  {nameValidation.isNameAvailable && (
                    <Check className="h-4 w-4 text-green-500" />
                  )}
                </p>
              </div>
              
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-500">Token</Label>
                <p className="flex items-center space-x-2">
                  <Coins className="h-4 w-4 text-gray-500" />
                  <span>{selectedTokenConfig?.symbol} ({selectedTokenConfig?.name})</span>
                  {selectedTokenConfig?.isNative && (
                    <span className="text-xs bg-blue-100 text-blue-800 px-1 rounded">Native</span>
                  )}
                  {selectedTokenConfig?.isCustom && (
                    <span className="text-xs bg-purple-100 text-purple-800 px-1 rounded">Custom</span>
                  )}
                </p>
                <p className="text-xs text-gray-500 font-mono">
                  {finalTokenAddress.slice(0, 8)}...{finalTokenAddress.slice(-6)}
                </p>
              </div>
              
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-500">Token Source</Label>
                <p className="flex items-center space-x-2">
                  {wizardState.formData.showCustomTokenInput ? (
                    <>
                      <Plus className="h-4 w-4 text-purple-600" />
                      <span>Custom Contract</span>
                    </>
                  ) : (
                    <>
                      <Coins className="h-4 w-4 text-blue-600" />
                      <span>Predefined Token</span>
                    </>
                  )}
                </p>
              </div>
              
              {wizardState.selectedFaucetType === FAUCET_TYPES.OPEN && (
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-500">Drop Code Required</Label>
                  <p className="flex items-center space-x-2">
                    {wizardState.formData.requiresDropCode ? (
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

              {wizardState.selectedFaucetType === FAUCET_TYPES.CUSTOM && (
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-500">Advanced Features</Label>
                  <p className="flex items-center space-x-2">
                    <Zap className="h-4 w-4 text-purple-600" />
                    <span>Enabled</span>
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
        
        {creationError && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{creationError}</AlertDescription>
          </Alert>
        )}
        
        {!factoryAddress && (
          <Alert variant="destructive">
            <XCircle className="h-4 w-4" />
            <AlertTitle>Factory Not Available</AlertTitle>
            <AlertDescription>
              {wizardState.selectedFaucetType} faucets are not available on {network?.name}. Please select a different faucet type or switch networks.
            </AlertDescription>
          </Alert>
        )}

        {wizardState.selectedFaucetType === FAUCET_TYPES.CUSTOM && (
          <Alert className="border-purple-500 bg-purple-50 dark:bg-purple-900/20">
            <Settings className="h-4 w-4 text-purple-600" />
            <AlertTitle className="text-purple-700 dark:text-purple-300">Next Steps</AlertTitle>
            <AlertDescription className="text-purple-700 dark:text-purple-300">
              After creation, you'll be able to configure advanced settings including custom eligibility rules, 
              dynamic claim amounts, API integrations, and more through the faucet management interface.
            </AlertDescription>
          </Alert>
        )}

        {wizardState.formData.showCustomTokenInput && (
          <Alert className="border-purple-500 bg-purple-50 dark:bg-purple-900/20">
            <Info className="h-4 w-4 text-purple-600" />
            <AlertTitle className="text-purple-700 dark:text-purple-300">Custom Token Notice</AlertTitle>
            <AlertDescription className="text-purple-700 dark:text-purple-300">
              You're using a custom token contract. Please ensure you have sufficient tokens in your wallet 
              to fund the faucet and that the contract is legitimate and follows ERC-20 standards.
            </AlertDescription>
          </Alert>
        )}
      </div>
    )
  }

  // Main step renderer
  const renderCurrentWizardStep = () => {
    switch (wizardState.currentStep) {
      case 1: return renderFaucetTypeSelection()
      case 2: return renderConfigurationDetails()
      case 3: return renderReviewAndCreate()
      default: return renderFaucetTypeSelection()
    }
  }

  // Step validation function
  const canProceedToNextStep = (): boolean => {
    switch (wizardState.currentStep) {
      case 1:
        return wizardState.selectedFaucetType !== '' && 
               isFaucetTypeAvailableOnNetwork(wizardState.selectedFaucetType as FaucetType)
      case 2:
        const hasValidName = wizardState.formData.faucetName.trim() !== '' && nameValidation.isNameAvailable
        const hasValidToken = wizardState.formData.showCustomTokenInput 
          ? customTokenValidation.isValid 
          : wizardState.formData.selectedTokenAddress !== ''
        return hasValidName && hasValidToken
      case 3:
        const mappedFactoryType = FAUCET_TYPE_TO_FACTORY_TYPE_MAPPING[wizardState.selectedFaucetType as FaucetType]
        const factoryAddress = getFactoryAddress(mappedFactoryType)
        return !!factoryAddress
      default:
        return false
    }
  }

  const isActionDisabled = isFaucetCreating || !chainId || !network

  return (
    <main className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-4 py-8">
        <Header pageTitle="Create Faucet" />
        
        {/* Wizard Progress Indicator */}
        <div className="max-w-4xl mx-auto mb-8">
          <div className="flex items-center justify-between mb-4">
            {[1, 2, 3].map((step) => (
              <div key={step} className="flex items-center">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    step <= wizardState.currentStep ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'
                  }`}
                >
                  {step}
                </div>
                {step < 3 && (
                  <div className={`w-24 h-1 mx-2 ${step < wizardState.currentStep ? 'bg-blue-600' : 'bg-gray-200'}`} />
                )}
              </div>
            ))}
          </div>
          <div className="text-center">
            <p className="text-sm text-gray-600">Step {wizardState.currentStep} of 3</p>
          </div>
        </div>
        
        {/* Main Wizard Content */}
        <div className="max-w-4xl mx-auto">
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="text-2xl">{getWizardStepTitle(wizardState.currentStep)}</CardTitle>
              <CardDescription className="text-lg">{getWizardStepDescription(wizardState.currentStep)}</CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              {renderCurrentWizardStep()}
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button
                variant="outline"
                onClick={returnToPreviousStep}
                disabled={wizardState.currentStep === 1}
                className="flex items-center space-x-2"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>Previous</span>
              </Button>
              {wizardState.currentStep < 3 ? (
                <Button
                  onClick={proceedToNextStep}
                  disabled={!canProceedToNextStep()}
                  className="flex items-center space-x-2"
                >
                  <span>Next</span>
                  <ArrowRight className="h-4 w-4" />
                </Button>
              ) : (
                <Button
                  onClick={handleFaucetCreation}
                  disabled={isActionDisabled || !canProceedToNextStep()}
                  className="flex items-center space-x-2"
                >
                  {isFaucetCreating ? (
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