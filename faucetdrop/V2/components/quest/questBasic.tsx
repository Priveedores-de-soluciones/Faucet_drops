// components/quest/questBasic.tsx
"use client"

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { toast } from 'sonner'
import {
    Upload, Loader2, Trash2, Check, AlertTriangle, Coins, Settings, Save, Plus, DollarSign, Wallet
} from "lucide-react"

import { useWallet } from "@/hooks/use-wallet"
import { ZeroAddress, isAddress as ethersIsAddress } from 'ethers'
import { type Network } from "@/lib/faucet"

// ==== CONFIG ====
const API_BASE_URL = "https://fauctdrop-backend.onrender.com";
const MIN_POOL_USD_VALUE = 50; // $50 Minimum

const networks: Network[] = [
    {
        name: "Celo", symbol: "CELO", chainId: BigInt(42220), rpcUrl: "https://forno.celo.org", blockExplorer: "https://celoscan.io", color: "#35D07F", logoUrl: "/celo.png", iconUrl: "/celo.png",
        factoryAddresses: ["0x17cFed7fEce35a9A71D60Fbb5CA52237103A21FB", "0x8cA5975Ded3B2f93E188c05dD6eb16d89b14aeA5"],
        factories: { custom: "0x8cA5975Ded3B2f93E188c05dD6eb16d89b14aeA5" }, tokenAddress: "0x471EcE3750Da237f93B8E339c536989b8978a438", nativeCurrency: { name: "Celo", symbol: "CELO", decimals: 18 }, isTestnet: false,
    },
    {
        name: "Lisk", symbol: "LSK", chainId: BigInt(1135), rpcUrl: "https://rpc.api.lisk.com", blockExplorer: "https://blockscout.lisk.com", explorerUrl: "https://blockscout.lisk.com", color: "#0D4477", logoUrl: "/lsk.png", iconUrl: "/lsk.png",
        factoryAddresses: ["0x21E855A5f0E6cF8d0CfE8780eb18e818950dafb7"],
        factories: { custom: "0x21E855A5f0E6cF8d0CfE8780eb18e818950dafb7" }, tokenAddress: ZeroAddress, nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 }, isTestnet: false,
    },
    {
        name: "Arbitrum", symbol: "ARB", chainId: BigInt(42161), rpcUrl: "https://arb1.arbitrum.io/rpc", blockExplorer: "https://arbiscan.io", explorerUrl: "https://arbiscan.io", color: "#28A0F0", logoUrl: "/arb.jpeg", iconUrl: "/arb.jpeg",
        factoryAddresses: ["0x9D6f441b31FBa22700bb3217229eb89b13FB49de"],
        factories: { custom: "0x9D6f441b31FBa22700bb3217229eb89b13FB49de" }, tokenAddress: ZeroAddress, nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 }, isTestnet: false,
    },
    {
        name: "Base", symbol: "BASE", chainId: BigInt(8453), rpcUrl: "https://base.publicnode.com", blockExplorer: "https://basescan.org", explorerUrl: "https://basescan.org", color: "#0052FF", logoUrl: "/base.png", iconUrl: "/base.png",
        factoryAddresses: ["0x587b840140321DD8002111282748acAdaa8fA206"],
        factories: { custom: "0x587b840140321DD8002111282748acAdaa8fA206" }, tokenAddress: ZeroAddress, nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 }, isTestnet: false,
    }
]

const ALL_TOKENS_BY_CHAIN: Record<number, TokenConfiguration[]> = {
    42220: [
        { address: "0x471EcE3750Da237f93B8E339c536989b8978a438", name: "Celo", symbol: "CELO", decimals: 18, isNative: true, logoUrl: "/celo.jpeg", description: "Native Celo token" },
        { address: "0x765DE816845861e75A25fCA122bb6898B8B1282a", name: "Celo Dollar", symbol: "cUSD", decimals: 18, logoUrl: "/cusd.png", description: "USD-pegged stablecoin on Celo" },
        { address: "0x48065fbBE25f71C9282ddf5e1cD6D6A887483D5e", name: "Tether", symbol: "USDT", decimals: 6, logoUrl: "/usdt.jpg", description: "Tether USD stablecoin" },
        { address: "0xcebA9300f2b948710d2653dD7B07f33A8B32118C", name: "USD Coin", symbol: "USDC", decimals: 6, logoUrl: "/usdc.jpg", description: "USD Coin stablecoin" },
    ],
    1135: [
        { address: ZeroAddress, name: "Ethereum", symbol: "ETH", decimals: 18, isNative: true, logoUrl: "/ether.jpeg", description: "Native Ethereum" },
        { address: "0xac485391EB2d7D88253a7F1eF18C37f4242D1A24", name: "Lisk", symbol: "LSK", decimals: 18, logoUrl: "/lsk.png", description: "Lisk native token" },
    ],
    42161: [
        { address: ZeroAddress, name: "Ethereum", symbol: "ETH", decimals: 18, isNative: true, logoUrl: "/ether.jpeg", description: "Native Ethereum" },
        { address: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831", name: "USD Coin", symbol: "USDC", decimals: 6, logoUrl: "/usdc.jpg", description: "Native USD Coin" },
    ],
    8453: [
        { address: ZeroAddress, name: "Ethereum", symbol: "ETH", decimals: 18, isNative: true, logoUrl: "/ether.jpeg", description: "Native Ethereum" },
        { address: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", name: "USD Coin", symbol: "USDC", decimals: 6, logoUrl: "/usdc.jpg", description: "Native USD Coin" },
    ]
}

// Map tokens to CoinGecko IDs for price fetching
const COINGECKO_IDS: Record<string, string> = {
    "CELO": "celo",
    "cUSD": "celo-dollar",
    "USDT": "tether",
    "USDC": "usd-coin",
    "ETH": "ethereum",
    "LSK": "lisk"
}

export interface TokenConfiguration {
    address: string
    name: string
    symbol: string
    decimals: number
    isNative?: boolean
    logoUrl?: string
    description?: string
}

export interface DistributionConfig {
    model: 'equal' | 'custom_tiers' | 'quadratic'
    totalWinners: number
    tiers: Array<{ rankStart: number; rankEnd: number; amountPerUser: number }>
}

export interface QuestData {
    title: string
    description: string
    imageUrl: string
    rewardPool: string
    distributionConfig: DistributionConfig
    faucetAddress?: string
    rewardTokenType?: 'native' | 'erc20'
    tokenAddress?: string
}

// ==== UTILS ====
const isAddress = (addr: string) => {
    try {
        return ethersIsAddress(addr);
    } catch {
        return false;
    }
}
const examplePoints = [10000, 8100, 6400, 4900, 3600]
const weights = examplePoints.map(p => Math.sqrt(p))
const totalWeight = weights.reduce((a, b) => a + b, 0)

// ==== MOVED OUTSIDE: Image Upload Component ====
const ImageUploadField: React.FC<{
    imageUrl: string
    onImageUrlChange: (url: string) => void
    onFileUpload: (file: File) => Promise<void>
    isUploading: boolean
    uploadError: string | null
    requiredResolution?: { width: number; height: number }
}> = ({ imageUrl, onImageUrlChange, onFileUpload, isUploading, uploadError, requiredResolution }) => {
    const fileInputRef = useRef<HTMLInputElement>(null)
    const [previewUrl, setPreviewUrl] = useState(imageUrl)
    const [resolutionError, setResolutionError] = useState<string | null>(null)
    const maxWidth = requiredResolution?.width || 1280
    const maxHeight = requiredResolution?.height || 1280

    useEffect(() => setPreviewUrl(imageUrl), [imageUrl])

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return
        setResolutionError(null)

        const reader = new FileReader()
        reader.onload = (ev) => {
            const img = new Image()
            img.onload = () => {
                if (img.width > maxWidth || img.height > maxHeight) {
                    setResolutionError(`Image too large. Max: ${maxWidth}x${maxHeight}. Found: ${img.width}x${img.height}`)
                    setPreviewUrl(null)
                    if (fileInputRef.current) fileInputRef.current.value = ""
                    return
                }
                setPreviewUrl(ev.target?.result as string)
                onFileUpload(file)
            }
            img.src = ev.target?.result as string
        }
        reader.readAsDataURL(file)
    }

    const handleRemove = () => {
        onImageUrlChange("")
        setPreviewUrl(null)
        setResolutionError(null)
        if (fileInputRef.current) fileInputRef.current.value = ""
    }

    const displayUrl = imageUrl || previewUrl

    return (
        <div className="space-y-2">
            <Label>Quest Image/Logo (Max 5MB, ≤{maxWidth}x{maxHeight})</Label>
            <div className="flex items-center space-x-3">
                <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()} disabled={isUploading || !!resolutionError} className="flex-grow">
                    {isUploading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
                    {isUploading ? "Uploading..." : imageUrl ? "Change" : "Upload"}
                </Button>
                {imageUrl && <Button type="button" variant="destructive" size="icon" onClick={handleRemove} disabled={isUploading}><Trash2 className="h-4 w-4" /></Button>}
                <Input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} disabled={isUploading} />
            </div>
            {(displayUrl || uploadError || resolutionError) && (
                <div className="flex items-start space-x-3 mt-2 border p-3 rounded-lg bg-white dark:bg-gray-800">
                    <div className="h-16 w-16 rounded-lg overflow-hidden border bg-gray-100 dark:bg-gray-700">
                        {displayUrl ? <img src={displayUrl} alt="Preview" className="h-full w-full object-contain" /> : <div className="h-full w-full flex items-center justify-center text-xs text-muted-foreground">No Img</div>}
                    </div>
                    <div>
                        {(uploadError || resolutionError) && <p className="text-xs text-red-500"><AlertTriangle className="h-3 w-3 inline mr-1" />{resolutionError || uploadError}</p>}
                        {(!uploadError && !resolutionError && imageUrl) && <p className="text-xs text-green-500"><Check className="h-3 w-3 inline mr-1" />Uploaded successfully</p>}
                    </div>
                </div>
            )}
        </div>
    )
}

// ==== PHASE 1 COMPONENT ====
interface Phase1Props<T extends QuestData> {
    newQuest: T
    setNewQuest: React.Dispatch<React.SetStateAction<T>>
    selectedToken: TokenConfiguration | null
    setSelectedToken: React.Dispatch<React.SetStateAction<TokenConfiguration | null>>
    nameError: string | null
    setNameError: React.Dispatch<React.SetStateAction<string | null>>
    isCheckingName: boolean
    setIsCheckingName: React.Dispatch<React.SetStateAction<boolean>>
    isUploadingImage: boolean
    setIsUploadingImage: React.Dispatch<React.SetStateAction<boolean>>
    uploadImageError: string | null
    setUploadImageError: React.Dispatch<React.SetStateAction<string | null>>
    handleImageUpload: (file: File) => Promise<void>
    onDraftSaved: (faucetAddress: string) => void
    isSavingDraft: boolean
    setIsSavingDraft: React.Dispatch<React.SetStateAction<boolean>>
    setError: React.Dispatch<React.SetStateAction<string | null>>
}

export default function Phase1QuestDetailsRewards<T extends QuestData>({
    newQuest,
    setNewQuest,
    selectedToken,
    setSelectedToken,
    nameError,
    setNameError,
    isCheckingName,
    setIsCheckingName,
    isUploadingImage,
    setIsUploadingImage,
    uploadImageError,
    setUploadImageError,
    handleImageUpload,
    onDraftSaved,
    isSavingDraft,
    setIsSavingDraft,
    setError
}: Phase1Props<T>) {
    const { address, isConnected, chainId } = useWallet()
    const network = useMemo(() => networks.find(n => n.chainId === BigInt(chainId || 0)) || null, [chainId])
    const availableTokens = chainId ? ALL_TOKENS_BY_CHAIN[Number(chainId)] || [] : []

    const [isCustomToken, setIsCustomToken] = useState(false)
    const [customTokenAddress, setCustomTokenAddress] = useState('')
    const nameCheckTimeoutRef = useRef<NodeJS.Timeout | null>(null)
    
    // --- PRICE CALCULATION STATE ---
    const [tokenPrice, setTokenPrice] = useState<number>(0)
    const [isFetchingPrice, setIsFetchingPrice] = useState(false)

    // --- FETCH TOKEN PRICE ---
    const fetchTokenPrice = async (symbol: string) => {
        setIsFetchingPrice(true)
        try {
            // Find CoinGecko ID or default to ethereum for unknown
            const coingeckoId = COINGECKO_IDS[symbol] || "ethereum" 
            
            const res = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${coingeckoId}&vs_currencies=usd`)
            const data = await res.json()
            
            if (data[coingeckoId] && data[coingeckoId].usd) {
                setTokenPrice(data[coingeckoId].usd)
            } else {
                setTokenPrice(0) // Price not found
            }
        } catch (e) {
            console.error("Error fetching price", e)
            setTokenPrice(0)
        } finally {
            setIsFetchingPrice(false)
        }
    }

    // Trigger price fetch when token changes
    useEffect(() => {
        if (selectedToken) {
            fetchTokenPrice(selectedToken.symbol)
        }
    }, [selectedToken])

    const calculateTotalFromTiers = () => {
        if (!newQuest.distributionConfig.tiers || newQuest.distributionConfig.tiers.length === 0) return 0;
        return newQuest.distributionConfig.tiers.reduce((acc, tier) => {
            const count = Math.max(0, tier.rankEnd - tier.rankStart + 1)
            return acc + count * tier.amountPerUser
        }, 0)
    }

    // Calculate USD Value & Min Amount
    const poolAmount = newQuest.distributionConfig.model === 'custom_tiers' 
        ? calculateTotalFromTiers()
        : parseFloat(newQuest.rewardPool || '0')
        
    const poolUsdValue = poolAmount * tokenPrice
    const isBelowMin = poolUsdValue > 0 && poolUsdValue < MIN_POOL_USD_VALUE
    const minTokenAmount = tokenPrice > 0 ? (MIN_POOL_USD_VALUE / tokenPrice).toFixed(4) : "0"

    const checkNameAvailabilityAPI = useCallback(async (nameToValidate: string) => {
        if (!nameToValidate.trim()) {
            setNameError(null)
            return
        }
        setIsCheckingName(true)
        setNameError(null)
        try {
            const response = await fetch(`${API_BASE_URL}/api/check-name?name=${encodeURIComponent(nameToValidate)}`)
            const data = await response.json()
            if (data.exists) {
                setNameError(`The name "${nameToValidate}" is already taken.`)
            } else {
                setNameError(null)
            }
        } catch {
            // setNameError("Could not verify name availability.")
        } finally {
            setIsCheckingName(false)
        }
    }, [setNameError, setIsCheckingName])

    const handleTitleChange = useCallback((value: string) => {
        setNewQuest(prev => ({ ...prev, title: value } as T))
        if (nameCheckTimeoutRef.current) clearTimeout(nameCheckTimeoutRef.current)
        if (value.trim().length >= 3) {
            nameCheckTimeoutRef.current = setTimeout(() => checkNameAvailabilityAPI(value.trim()), 1000)
        } else {
            setNameError(null)
        }
    }, [checkNameAvailabilityAPI, setNewQuest, setNameError])

    const handleTitleBlur = useCallback(() => {
        if (nameCheckTimeoutRef.current) clearTimeout(nameCheckTimeoutRef.current)
    }, [])

    const titleSafe = newQuest.title || "";
    const titleLength = titleSafe.trim().length;

    const getAmountPerWinner = () => {
        const total = parseFloat(newQuest.rewardPool || '0');
        const winners = newQuest.distributionConfig.totalWinners || 1;
        if (!total || total <= 0) return '0';
        return (total / winners).toFixed(6);
    }

    const handleTierChange = (index: number, field: 'rankStart' | 'rankEnd' | 'amountPerUser', value: number) => {
        const updated = [...newQuest.distributionConfig.tiers]
        updated[index] = { ...updated[index], [field]: value }
        
        setNewQuest(prev => ({
            ...prev,
            distributionConfig: { ...prev.distributionConfig, tiers: updated }
        } as T))
    }

    const addTier = () => {
        const last = newQuest.distributionConfig.tiers[newQuest.distributionConfig.tiers.length - 1]
        const start = last ? last.rankEnd + 1 : 1
        
        setNewQuest(prev => ({
            ...prev,
            distributionConfig: {
                ...prev.distributionConfig,
                tiers: [...prev.distributionConfig.tiers, { rankStart: start, rankEnd: start, amountPerUser: 0 }]
            }
        } as T))
    }

    const removeTier = (index: number) => {
        setNewQuest(prev => ({
            ...prev,
            distributionConfig: {
                ...prev.distributionConfig,
                tiers: prev.distributionConfig.tiers.filter((_, i) => i !== index)
            }
        } as T))
    }

    const handleSaveDraft = async () => {
        // --- ADD VALIDATION HERE ---
        if (isBelowMin) {
            setError(`Reward pool must be at least $${MIN_POOL_USD_VALUE} USD (approx ${minTokenAmount} ${selectedToken?.symbol})`)
            return
        }

        if (!address || !isConnected || !selectedToken || (newQuest.title || "").trim().length < 3 || nameError || !newQuest.imageUrl) {
            setError("Complete all required fields")
            return
        }

        if(poolAmount <= 0) {
             setError("Reward pool amount must be greater than zero.")
             return
        }

        setIsSavingDraft(true)
        try {
            const draftId = newQuest.faucetAddress || `draft-${crypto.randomUUID()}`

            const payload = {
                creatorAddress: address,
                title: newQuest.title.trim(),
                description: newQuest.description,
                imageUrl: newQuest.imageUrl,
                rewardPool: poolAmount.toString(), // Ensure we send the correct calculated pool for custom tiers
                rewardTokenType: selectedToken.isNative ? 'native' : 'erc20',
                tokenAddress: selectedToken.address,
                distributionConfig: newQuest.distributionConfig,
                faucetAddress: draftId 
            }

            const res = await fetch(`${API_BASE_URL}/api/quests/draft`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            })

            if (!res.ok) throw new Error(await res.text())

            toast.success("Draft saved successfully!")
            onDraftSaved(draftId)
        } catch (e: any) {
            setError(e.message || "Draft save failed")
        } finally {
            setIsSavingDraft(false)
        }
    }

    return (
        <div className="space-y-12 max-w-5xl mx-auto py-8">
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2"><Settings className="h-5 w-5" /> Step 1: Basic Quest Details</CardTitle>
                    <CardDescription>The Title is used as the Faucet name.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label>Quest Title (Faucet Name)</Label>
                        <div className="relative">
                            <Input
                                value={titleSafe}
                                onChange={(e) => handleTitleChange(e.target.value)}
                                onBlur={handleTitleBlur}
                                placeholder="e.g. FaucetDrop Launch Campaign"
                                className={nameError ? "border-red-500 pr-10" : (!isCheckingName && titleLength >= 3 && !nameError) ? "border-green-500 pr-10" : "pr-10"}
                                disabled={isCheckingName}
                            />
                            {isCheckingName && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-gray-500" />}
                            {!isCheckingName && titleLength >= 3 && (nameError ? <AlertTriangle className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-red-500" /> : <Check className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-green-500" />)}
                        </div>
                        {titleLength > 0 && titleLength < 3 && <p className="text-xs text-red-500">At least 3 characters</p>}
                        {nameError && titleLength >= 3 && <p className="text-xs text-red-500">{nameError}</p>}
                        {isCheckingName && <p className="text-xs text-blue-500">Checking availability...</p>}
                    </div>

                    <ImageUploadField
                        imageUrl={newQuest.imageUrl}
                        onImageUrlChange={(url) => setNewQuest(prev => ({ ...prev, imageUrl: url } as T))}
                        onFileUpload={handleImageUpload}
                        isUploading={isUploadingImage}
                        uploadError={uploadImageError}
                        requiredResolution={{ width: 1280, height: 1280 }}
                    />

                    <div className="space-y-2">
                        <Label>Description</Label>
                        <Textarea
                            value={newQuest.description || ""}
                            onChange={(e) => setNewQuest(prev => ({ ...prev, description: e.target.value } as T))}
                            placeholder="Describe your quest campaign"
                            rows={3}
                        />
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <div className="flex justify-between items-start">
                        <div>
                            <CardTitle className="text-lg flex items-center gap-2"><Coins className="h-5 w-5" /> Step 2: Rewards Configuration</CardTitle>
                            <CardDescription>Choose token and distribution model</CardDescription>
                        </div>
                        {network && (
                            <Badge variant="outline" className="flex items-center gap-1" style={{ borderColor: network.color, color: network.color }}>
                                <Wallet className="h-3 w-3" /> {network.name}
                            </Badge>
                        )}
                    </div>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="space-y-2">
                        <Label>Reward Token ({network?.name || 'Unknown Network'})</Label>
                        <Select value={isCustomToken ? "custom" : selectedToken?.address} onValueChange={(v) => {
                            if (v === "custom") {
                                setIsCustomToken(true)
                                setSelectedToken(null)
                            } else {
                                const token = availableTokens.find(t => t.address === v)
                                if (token) {
                                    setSelectedToken(token)
                                    setIsCustomToken(false)
                                    setCustomTokenAddress('')
                                    
                                    setNewQuest(prev => ({
                                        ...prev,
                                        rewardTokenType: token.isNative ? 'native' : 'erc20',
                                        tokenAddress: token.address
                                    } as T))
                                }
                            }
                        }}>
                            <SelectTrigger><SelectValue placeholder="Select token" /></SelectTrigger>
                            <SelectContent>
                                {availableTokens.map(t => <SelectItem key={t.address} value={t.address}>{t.name} ({t.symbol})</SelectItem>)}
                                <SelectItem value="custom">+ Custom Token</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {isCustomToken && (
                        <div className="p-4 border rounded-lg bg-gray-50 dark:bg-gray-900 border-dashed border-gray-300 dark:border-gray-700">
                            <Label>Custom Token Address</Label>
                            <div className="flex gap-2 mt-2">
                                <Input value={customTokenAddress} onChange={(e) => setCustomTokenAddress(e.target.value)} placeholder="0x..." />
                                <Button variant="secondary" onClick={() => {
                                    if (isAddress(customTokenAddress)) {
                                        setSelectedToken({ address: customTokenAddress, name: 'Custom', symbol: 'TOK', decimals: 18 })
                                        setNewQuest(prev => ({ ...prev, rewardTokenType: 'erc20', tokenAddress: customTokenAddress } as T))
                                        toast.success("Custom token address set")
                                    } else {
                                        toast.error("Invalid token address")
                                    }
                                }}>Set Address</Button>
                            </div>
                            <p className="text-xs text-muted-foreground mt-2">Make sure this is a valid ERC20 token on {network?.name}.</p>
                        </div>
                    )}

                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label>Number of Winners</Label>
                                <Input type="number" min="1" value={newQuest.distributionConfig.totalWinners} onChange={(e) =>
                                    
                                    setNewQuest(prev => ({
                                        ...prev,
                                        distributionConfig: { ...prev.distributionConfig, totalWinners: Math.max(1, parseInt(e.target.value) || 1) }
                                    } as T))} />
                            </div>
                            <div>
                                <Label>Distribution Model</Label>
                                <Select value={newQuest.distributionConfig.model} onValueChange={(v: any) =>
                                    
                                    setNewQuest(prev => ({
                                        ...prev,
                                        distributionConfig: { ...prev.distributionConfig, model: v, tiers: v === 'custom_tiers' ? prev.distributionConfig.tiers : [] }
                                    } as T))}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="equal">Equal</SelectItem>
                                        <SelectItem value="quadratic">Quadratic</SelectItem>
                                        <SelectItem value="custom_tiers">Custom Tiers</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        {newQuest.distributionConfig.model === 'equal' && (
                            <>
                                <div>
                                    <div className="flex justify-between">
                                        <Label>Total Reward Pool ({selectedToken?.symbol})</Label>
                                        {tokenPrice > 0 && <span className="text-xs text-muted-foreground font-mono">1 {selectedToken?.symbol} ≈ ${tokenPrice.toFixed(2)}</span>}
                                    </div>
                                    <div className="relative mt-1">
                                        <Input 
                                            type="number" 
                                            value={newQuest.rewardPool} 
                                            onChange={(e) => setNewQuest(prev => ({ ...prev, rewardPool: e.target.value } as T))} 
                                            className={isBelowMin ? "border-red-500" : ""}
                                        />
                                        {tokenPrice > 0 && (
                                            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground flex items-center gap-1">
                                                <DollarSign className="h-3 w-3" />
                                                {poolUsdValue.toFixed(2)}
                                            </div>
                                        )}
                                    </div>
                                    {isBelowMin && (
                                        <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                                            <AlertTriangle className="h-3 w-3" />
                                            Minimum pool value is ${MIN_POOL_USD_VALUE} (~{minTokenAmount} {selectedToken?.symbol})
                                        </p>
                                    )}
                                </div>
                                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded">
                                    <p>Each winner gets: <strong>{getAmountPerWinner()} {selectedToken?.symbol}</strong></p>
                                    <p className="text-xs mt-2">Deposit needed (incl. 5% fee): <strong>{newQuest.rewardPool ? (parseFloat(newQuest.rewardPool) * 1.05).toFixed(4) : 0} {selectedToken?.symbol}</strong></p>
                                </div>
                            </>
                        )}

                        {newQuest.distributionConfig.model === 'quadratic' && (
                            <>
                                <div>
                                    <Label>Total Reward Pool ({selectedToken?.symbol})</Label>
                                    <div className="relative mt-1">
                                        <Input 
                                            type="number" 
                                            value={newQuest.rewardPool} 
                                            onChange={(e) => setNewQuest(prev => ({ ...prev, rewardPool: e.target.value } as T))} 
                                            className={isBelowMin ? "border-red-500" : ""}
                                        />
                                        {tokenPrice > 0 && (
                                            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground flex items-center gap-1">
                                                <DollarSign className="h-3 w-3" />
                                                {poolUsdValue.toFixed(2)}
                                            </div>
                                        )}
                                    </div>
                                    {isBelowMin && (
                                        <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                                            <AlertTriangle className="h-3 w-3" />
                                            Minimum pool value is ${MIN_POOL_USD_VALUE} (~{minTokenAmount} {selectedToken?.symbol})
                                        </p>
                                    )}
                                </div>
                                <div className="border rounded overflow-hidden">
                                    <div className="grid grid-cols-5 text-xs font-medium bg-gray-100 dark:bg-gray-800 p-3">
                                        <div>Rank</div><div>Points</div><div>Weight</div><div>Share %</div><div>Reward</div>
                                    </div>
                                    {examplePoints.map((p, i) => {
                                        const share = totalWeight ? (weights[i] / totalWeight * 100).toFixed(2) : 0
                                        const reward = totalWeight ? (weights[i] / totalWeight * poolAmount).toFixed(4) : 0
                                        return (
                                            <div key={i} className="grid grid-cols-5 text-xs p-3 border-t">
                                                <div>#{i + 1}</div>
                                                <div>{p.toLocaleString()}</div>
                                                <div>{weights[i].toFixed(2)}</div>
                                                <div>{share}%</div>
                                                <div>{reward}</div>
                                            </div>
                                        )
                                    })}
                                    <div className="p-3 text-xs text-muted-foreground text-center bg-gray-50 dark:bg-gray-900 border-t">
                                        Previewing Top 5. Rewards scale down non-linearly.
                                    </div>
                                </div>
                            </>
                        )}

                        {newQuest.distributionConfig.model === 'custom_tiers' && (
                            <div className="space-y-3">
                                <div className="flex justify-between">
                                    <Label>Custom Tiers</Label>
                                    <Button size="sm" variant="outline" onClick={addTier}><Plus className="h-4 w-4 mr-1" />Add Tier</Button>
                                </div>
                                {newQuest.distributionConfig.tiers.map((tier, i) => (
                                    <div key={i} className="flex gap-2 items-end">
                                        <div className="flex-1">
                                            <span className="text-xs text-muted-foreground">Rank From</span>
                                            <Input type="number" value={tier.rankStart} onChange={(e) => handleTierChange(i, 'rankStart', parseInt(e.target.value) || 1)} />
                                        </div>
                                        <div className="flex-1">
                                            <span className="text-xs text-muted-foreground">Rank To</span>
                                            <Input type="number" value={tier.rankEnd} onChange={(e) => handleTierChange(i, 'rankEnd', parseInt(e.target.value) || 1)} />
                                        </div>
                                        <div className="flex-1">
                                            <span className="text-xs text-muted-foreground">Amount</span>
                                            <Input type="number" value={tier.amountPerUser} onChange={(e) => handleTierChange(i, 'amountPerUser', parseFloat(e.target.value) || 0)} />
                                        </div>
                                        <Button variant="ghost" size="icon" onClick={() => removeTier(i)} className="mb-0.5"><Trash2 className="h-4 w-4" /></Button>
                                    </div>
                                ))}
                                <div className={`bg-blue-50 dark:bg-blue-900/20 p-4 rounded ${isBelowMin ? 'border border-red-500' : ''}`}>
                                    <p>Total Pool: <strong>{calculateTotalFromTiers().toFixed(4)} {selectedToken?.symbol}</strong></p>
                                    {tokenPrice > 0 && <p className="text-xs text-muted-foreground">Value: ${poolUsdValue.toFixed(2)}</p>}
                                    
                                    <p className="text-xs mt-1">Deposit needed (incl. 5% fee): <strong>{(calculateTotalFromTiers() * 1.05).toFixed(4)}</strong></p>
                                    
                                    {isBelowMin && (
                                        <p className="text-xs text-red-500 mt-2 font-bold flex items-center gap-1">
                                            <AlertTriangle className="h-3 w-3"/>
                                            Total must exceed ${MIN_POOL_USD_VALUE}
                                        </p>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                    <div className="pt-8 border-t text-center">
                        <Button size="lg" onClick={handleSaveDraft} disabled={isSavingDraft || isBelowMin} className="w-full sm:w-auto">
                            {isSavingDraft ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Save className="mr-2 h-5 w-5" />}
                            Save and Continue
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}