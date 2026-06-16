"use client"

import { useState, useEffect } from "react"
import { useWallet, API_BASE } from "@/components/wallet-provider"
import {
    Dialog, DialogContent, DialogHeader, DialogTitle,
    DialogTrigger, DialogDescription
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
    Wallet, Send, Download, Copy,
    Loader2, AlertTriangle, CheckCircle2, RefreshCw,
    ExternalLink, ArrowUpRight, Eye, EyeOff
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"

import { formatUnits, parseUnits, encodeFunctionData, type Address, zeroAddress } from "viem"
import { type TokenConfiguration } from "@/components/CreateFaucetWizard"
import { supportedChains, DEFAULT_CHAIN_ID, SOLANA_CHAIN_ID, STELLAR_CHAIN_ID } from "@/config/chain"


// CoinGecko ID mapping for price fetching
const COINGECKO_IDS: Record<string, string> = {
  "CELO": "celo",
  "cUSD": "celo-dollar",
  "USDT": "tether",
  "cEUR": "celo-euro",
  "USDC": "usd-coin",
  "cREAL": "celo-brazilian-real",
  "cNGN": "celo-nigerian-naira",
  "cKES": "celo-kenyan-shilling",
  "USDGLO": "glo-dollar",
  "G$": "gooddollar",
  "ETH": "ethereum",
  "LSK": "lisk",
  "USDC.e": "usd-coin",
  "ARB": "arbitrum",
  "DEGEN": "degen-base",
  "BNB": "binancecoin",
  "BUSD": "binance-usd",
}

interface TokenBalance {
    token: TokenConfiguration
    balance: string
    balanceFormatted: string
    usdValue: string
}

interface BackendBalance {
    token_address: string
    balance: string
    is_native: boolean
}

interface BackendResponse {
    success: boolean
    balances: BackendBalance[]
}

const NETWORK_TOKENS: Record<number, TokenConfiguration[]> = {
  // Celo Mainnet (42220)
  42220: [
    { address: zeroAddress, name: "Celo", symbol: "CELO", decimals: 18, isNative: true, logoUrl: "/celo.jpeg", description: "Native Celo token for governance and staking" },
    { address: "0x765DE816845861e75A25fCA122bb6898B8B1282a", name: "Celo Dollar", symbol: "cUSD", decimals: 18, logoUrl: "/cusd.png", description: "USD-pegged stablecoin on Celo" },
    { address: "0x48065fbBE25f71C9282ddf5e1cD6D6A887483D5e", name: "Tether", symbol: "USDT", decimals: 6, logoUrl: "/usdt.jpg", description: "Tether USD stablecoin" },
    { address: "0xcebA9300f2b948710d2653dD7B07f33A8B32118C", name: "USD Coin", symbol: "USDC", decimals: 6, logoUrl: "/usdc.jpg", description: "USD Coin stablecoin" },
  ],
  // Lisk Mainnet (1135)
  1135: [
    { address: zeroAddress, name: "Ethereum", symbol: "ETH", decimals: 18, isNative: true, logoUrl: "/ether.jpeg", description: "Native Ethereum for transaction fees" },
    { address: "0xac485391EB2d7D88253a7F1eF18C37f4242D1A24", name: "Lisk", symbol: "LSK", decimals: 18, logoUrl: "/lsk.png", description: "Lisk native token" },
    { address: "0x05D032ac25d322df992303dCa074EE7392C117b9", name: "Tether USD", symbol: "USDT", decimals: 6, logoUrl: "/usdt.jpg", description: "Tether USD stablecoin" },
    { address: "0xF242275d3a6527d877f2c927a82D9b057609cc71", name: "Bridged USDC", symbol: "USDC.e", decimals: 6, logoUrl: "/usdc.jpg", description: "Bridged USD Coin from Ethereum" },
  ],
  // Arbitrum One (42161)
  42161: [
    { address: zeroAddress, name: "Ethereum", symbol: "ETH", decimals: 18, isNative: true, logoUrl: "/ether.jpeg", description: "Native Ethereum for transaction fees" },
    { address: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831", name: "USD Coin", symbol: "USDC", decimals: 6, logoUrl: "/usdc.jpg", description: "Native USD Coin on Arbitrum" },
    { address: "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9", name: "Tether USD", symbol: "USDT", decimals: 6, logoUrl: "/usdt.jpg", description: "Tether USD stablecoin" },
    { address: "0x912CE59144191C1204E64559FE8253a0e49E6548", name: "Arbitrum", symbol: "ARB", decimals: 18, logoUrl: "/arb.jpeg", description: "Arbitrum governance token" },
  ],
  // Base Mainnet (8453)
  8453: [
    { address: zeroAddress, name: "Ethereum", symbol: "ETH", decimals: 18, isNative: true, logoUrl: "/ether.jpeg", description: "Native Ethereum for transaction fees" },
    { address: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", name: "USD Coin", symbol: "USDC", decimals: 6, logoUrl: "/usdc.jpg", description: "Native USD Coin on Base" },
    { address: "0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2", name: "Bridged Tether USD", symbol: "USDT", decimals: 6, logoUrl: "/usdt.jpg", description: "Bridged Tether USD from Ethereum" },
    { address: "0x4ed4E862860beD51a9570b96d89aF5E1B0Efefed", name: "Degen", symbol: "DEGEN", decimals: 18, logoUrl: "/degen.png", description: "Degen community token" },
  ],
  // BNB Chain (56)
  56: [
    { address: zeroAddress, name: "BNB", symbol: "BNB", decimals: 18, isNative: true, logoUrl: "/bnb.jpg", description: "Native BNB for transaction fees" },
    { address: "0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d", name: "USD Coin", symbol: "USDC", decimals: 18, logoUrl: "/busdc.jpg", description: "Binance-Peg USD Coin" },
    { address: "0x55d398326f99059fF775485246999027B3197955", name: "Tether USD", symbol: "USDT", decimals: 18, logoUrl: "/busd.jpg", description: "Binance-Peg BSC-USD" },
    { address: "0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56", name: "BUSD", symbol: "BUSD", decimals: 18, logoUrl: "/busdt.jpg", description: "Binance-Peg BUSD Token" },
  ],
}

export function EmbeddedWalletControlProduction() {
    const { address: evmAddress, chainId, walletType, session, signer } = useWallet()
    const { toast } = useToast()
    const [exportType,  setExportType]  = useState<"seed" | "privatekey">("privatekey")
    const [exportedKey, setExportedKey] = useState<string | null>(null)
    const [showKey,     setShowKey]     = useState(false)
    const [exportChain, setExportChain] = useState<string>("")
    const [open, setOpen] = useState(false)
    const [activeTab, setActiveTab] = useState("balance")

    // Balance State
    const [balances, setBalances] = useState<TokenBalance[]>([])
    const [loadingBalances, setLoadingBalances] = useState(false)
    const [totalUsdValue, setTotalUsdValue] = useState("0.00")

    // Send State
    const [selectedToken, setSelectedToken] = useState<TokenConfiguration | null>(null)
    const [recipient, setRecipient] = useState("")
    const [amount, setAmount] = useState("")
    const [sending, setSending] = useState(false)
    const [txHash, setTxHash] = useState("")

    // Export State
    const [exporting, setExporting] = useState(false)
    const [seedPhrase, setSeedPhrase] = useState<string | null>(null)
    const [showSeed, setShowSeed] = useState(false)

    const currentAddress = evmAddress
    useEffect(() => {
        if (!open) {
            setSeedPhrase(null)
            setShowSeed(false)
            setExportedKey(null)   // ← add
            setShowKey(false)      // ← add
            setExportChain("")     // ← add
        }
        }, [open])

    // Derive display chain from current chainId
const getChainDisplay = () => {
  if (!chainId) return "EVM"
  if (chainId === SOLANA_CHAIN_ID)  return "Solana"
  if (chainId === STELLAR_CHAIN_ID) return "Stellar"
  return supportedChains.find(c => c.id === chainId)?.name ?? "EVM"
}

const handleExportPrivateKey = async () => {
  if (!session?.token) return toast({ title: "Error message", variant: "destructive", description:"Not authenticated" })
  const targetChainId = chainId ?? DEFAULT_CHAIN_ID
  setExporting(true)
  setExportedKey(null)
  try {
    const res = await fetch(
      `${API_BASE}/wallet/export-privatekey?chain_id=${targetChainId}`,
      {
        method:  "POST",
        headers: { Authorization: `Bearer ${session.token}` },
      }
    )
    if (!res.ok) throw new Error((await res.json()).detail || "Export failed")
    const data = await res.json()

    // Solana returns a byte array — convert to base58 for display
    // For simplicity show hex for all, users can import via their wallet
    let keyDisplay: string
    if (data.chain === "solana") {
      // Show the 64-byte array as comma-separated for Phantom import,
      // or hex seed for other importers
      keyDisplay = Array.isArray(data.private_key)
        ? `[${data.private_key.join(",")}]`
        : data.private_key_hex
    } else {
      keyDisplay = data.private_key
    }

    setExportedKey(keyDisplay)
    setExportChain(data.chain)
    setShowKey(false)
  } catch (err: any) {
    toast({ title: "Error message", variant: "destructive", description:"export failed" })
  } finally {
    setExporting(false)
  }
}

const handleExportSeed = async () => {
  if (!session?.token) return toast({ title: "Error message", variant: "destructive", description:"Not authenticated" })
  setExporting(true)
  try {
    const res = await fetch(`${API_BASE}/wallet/export-seed`, {
      method:  "POST",
      headers: { Authorization: `Bearer ${session.token}` },
    })
    if (!res.ok) throw new Error("Export failed")
    const data = await res.json()
    setSeedPhrase(data.mnemonic)
    setShowSeed(false)
  } catch (err: any) {
    toast({ title: "Error message", variant: "destructive", description:"export failed" })
  } finally {
    setExporting(false)
  }
}

    const fetchBalances = async () => {
        if (!currentAddress || !chainId) return;
        setLoadingBalances(true);

        const configTokens = NETWORK_TOKENS[chainId] || [];

        try {
            let defaultBalances = configTokens.map(token => ({
                token,
                balance: "0",
                balanceFormatted: "0",
                usdValue: "0.00"
            }));

            let backendData: BackendResponse | null = null;

            try {
                const response = await fetch(`https://identical-vivi-faucetdrops-41e9c56b.koyeb.app/api/wallet/balances/${chainId}/${currentAddress}`);
                if (response.ok) {
                    backendData = await response.json();
                }
            } catch (backendError) {
                console.warn("Backend balance fetch failed, defaulting to 0s:", backendError);
            }

            // Fetch prices from CoinGecko safely
            let prices: Record<string, { usd: number }> = {};
            try {
                const uniqueSymbols = [...new Set(configTokens.map(t => t.symbol))];
                const coingeckoIds = uniqueSymbols
                    .map(symbol => COINGECKO_IDS[symbol])
                    .filter(Boolean)
                    .join(',');

                if (coingeckoIds) {
                    const priceResponse = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${coingeckoIds}&vs_currencies=usd`);
                    if (priceResponse.ok) {
                        prices = await priceResponse.json();
                    }
                }
            } catch (priceError) {
                console.warn("CoinGecko price fetch failed, defaulting to $0.00:", priceError);
            }

            let totalValue = 0;

            const finalBalances = defaultBalances.map((item) => {
                const backendMatch = backendData?.balances?.find(
                    (b) => b.token_address.toLowerCase() === item.token.address.toLowerCase()
                );

                const rawBalance = backendMatch ? backendMatch.balance : "0";
                const formatted = formatUnits(BigInt(rawBalance), item.token.decimals);

                const coingeckoId = COINGECKO_IDS[item.token.symbol];
                const price = coingeckoId && prices[coingeckoId] ? prices[coingeckoId].usd : 0;

                const balanceNum = parseFloat(formatted);
                const usdValue = (balanceNum * price).toFixed(2);

                totalValue += parseFloat(usdValue);

                return {
                    token: item.token,
                    balance: rawBalance,
                    balanceFormatted: formatted,
                    usdValue: usdValue
                };
            });

            setBalances(finalBalances);
            setTotalUsdValue(totalValue.toFixed(2));

        } catch (error) {
            console.error("Critical fetch error:", error);
            const fallbackBalances = configTokens.map(token => ({
                token, balance: "0", balanceFormatted: "0", usdValue: "0.00"
            }));
            setBalances(fallbackBalances);
            setTotalUsdValue("0.00");

            toast({
                title: "Network Error",
                description: "Showing local tokens with 0 balances. Refresh to try again.",
                variant: "destructive"
            });
        } finally {
            setLoadingBalances(false);
        }
    };

    
    const handleSend = async () => {
        if (!selectedToken || !recipient || !amount || !currentAddress || !signer) {
            toast({ title: "Please fill all fields", variant: "destructive" })
            return
        }

        setSending(true)
        setTxHash("")

        try {
            let hash = ""

            if (!/^0x[a-fA-F0-9]{40}$/.test(recipient)) {
                throw new Error("Invalid EVM recipient address");
            }

            const amountWei = parseUnits(amount, selectedToken.decimals);

            if (selectedToken.isNative) {
                const tx = await signer.sendTransaction({
                    to: recipient as Address,
                    value: amountWei,
                });
                hash = tx.hash
            } else {
                const data = encodeFunctionData({
                    abi: [{
                        name: 'transfer', type: 'function', stateMutability: 'nonpayable',
                        inputs: [{ name: 'to', type: 'address' }, { name: 'amount', type: 'uint256' }],
                        outputs: [{ type: 'bool' }]
                    }],
                    functionName: 'transfer',
                    args: [recipient as Address, amountWei]
                });

                const tx = await signer.sendTransaction({
                    to: selectedToken.address as Address,
                    data,
                });
                hash = tx.hash
            }

            setTxHash(hash)
            toast({
                title: "Transaction sent!",
                description: `${amount} ${selectedToken.symbol} sent successfully`
            })

            setRecipient("")
            setAmount("")
            setTimeout(fetchBalances, 3000)

        } catch (error: any) {
            console.error("Send error:", error)
            const errorMessage = error instanceof Error ? error.message : "Please try again"
            toast({
                title: "Transaction failed",
                description: errorMessage,
                variant: "destructive"
            })
        } finally {
            setSending(false)
        }
    }

    const handleExportKey = async () => {
        if (!session?.token) return toast({ title: "Not authenticated", variant: "destructive" })
        setExporting(true)
        try {
            const res = await fetch(`${API_BASE}/wallet/export-seed`, {
                method: "POST",   // ← add this
                headers: { Authorization: `Bearer ${session.token}` },
            })
            if (!res.ok) throw new Error("Export failed")
            const data = await res.json()
            setSeedPhrase(data.mnemonic)
            setShowSeed(false)
        } catch (error: any) {
            toast({ title: "Export failed", description: error.message || "Failed to export", variant: "destructive" })
        } finally {
            setExporting(false)
        }
    }

    const copyToClipboard = (text: string, label: string) => {
        navigator.clipboard.writeText(text)
        toast({ title: `${label} copied` })
    }

    const getExplorerUrl = (hash: string) => {
        const explorers: Record<number, string> = {
            42220: "https://celoscan.io/tx/",
            1135: "https://blockscout.lisk.com/tx/",
            42161: "https://arbiscan.io/tx/",
            8453: "https://basescan.org/tx/",
            56: "https://bscscan.com/tx/"
        }
        return (explorers[chainId || 42220] || explorers[42220]) + hash
    }

    useEffect(() => {
        if (open && currentAddress) fetchBalances()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, chainId, currentAddress])

    // Reset seed visibility when dialog closes
    useEffect(() => {
        if (!open) {
            setSeedPhrase(null)
            setShowSeed(false)
        }
    }, [open])

    // Only show this control for embedded wallets
    if (walletType !== "embedded") {
        return null
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                    <Wallet className="h-4 w-4" />
                    <span className="hidden sm:inline">Wallet</span>
                </Button>
            </DialogTrigger>

            <DialogContent className="sm:max-w-[600px] max-w-[95vw] max-h-[90vh] overflow-hidden flex flex-col p-4 sm:p-6">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-lg sm:text-xl">
                        <Wallet className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                        <span className="hidden sm:inline">Embedded Wallet Control</span>
                        <span className="sm:hidden">Wallet</span>
                    </DialogTitle>
                    <DialogDescription className="text-xs sm:text-sm">
                        Manage your tokens and export your private key
                    </DialogDescription>
                </DialogHeader>

                <div className="flex items-center justify-between p-2 sm:p-3 bg-muted/50 rounded-lg">
                    <Badge variant="outline" className="font-mono text-[10px] sm:text-xs">
                        {currentAddress?.slice(0, 6)}...{currentAddress?.slice(-4)}
                    </Badge>
                    <Button
                        variant="ghost" size="sm"
                        onClick={() => copyToClipboard(currentAddress || "", "Address")}
                        className="h-7 w-7 sm:h-8 sm:w-8"
                    >
                        <Copy className="h-3 w-3" />
                    </Button>
                </div>

                <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
                    <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger value="balance" className="text-xs sm:text-sm">Balances</TabsTrigger>
                        <TabsTrigger value="send" className="text-xs sm:text-sm">Send</TabsTrigger>
                        <TabsTrigger value="export" className="text-xs sm:text-sm">Export</TabsTrigger>
                    </TabsList>

                    {/* BALANCES TAB */}
                    <TabsContent value="balance" className="flex-1 overflow-hidden flex flex-col space-y-3 sm:space-y-4">
                        <div className="text-center py-3 sm:py-4 bg-gradient-to-br from-primary/10 to-primary/5 rounded-lg">
                            <p className="text-xs sm:text-sm text-muted-foreground mb-1">Total Balance</p>
                            <p className="text-2xl sm:text-3xl font-bold">${totalUsdValue}</p>
                        </div>

                        <div className="flex items-center justify-between">
                            <h3 className="text-xs sm:text-sm font-medium">Tokens</h3>
                            <Button variant="ghost" size="sm" onClick={fetchBalances} disabled={loadingBalances} className="h-7 w-7 p-0">
                                <RefreshCw className={`h-3 w-3 sm:h-4 sm:w-4 ${loadingBalances ? 'animate-spin' : ''}`} />
                            </Button>
                        </div>

                        {loadingBalances ? (
                            <div className="flex items-center justify-center py-12">
                                <Loader2 className="h-6 w-6 sm:h-8 sm:w-8 animate-spin text-primary" />
                            </div>
                        ) : balances.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-12 text-center">
                                <Wallet className="h-10 w-10 sm:h-12 sm:w-12 text-muted-foreground mb-3" />
                                <p className="text-xs sm:text-sm text-muted-foreground">No tokens found</p>
                            </div>
                        ) : (
                            <ScrollArea className="flex-1">
                                <div className="space-y-2 pr-2 sm:pr-4">
                                    {balances.map((item, index) => (
                                        <button
                                            key={index}
                                            onClick={() => { setSelectedToken(item.token); setActiveTab("send"); }}
                                            className="w-full flex items-center justify-between p-2 sm:p-3 rounded-lg border hover:bg-muted/50 transition-colors group"
                                        >
                                            <div className="flex items-center gap-2 sm:gap-3">
                                                <img src={item.token.logoUrl || undefined} alt={item.token.symbol} className="h-8 w-8 sm:h-10 sm:w-10 rounded-full" />
                                                <div className="text-left">
                                                    <p className="font-medium text-sm sm:text-base">{item.token.symbol}</p>
                                                    <p className="text-[10px] sm:text-xs text-muted-foreground line-clamp-1">{item.token.name}</p>
                                                </div>
                                            </div>
                                            <div className="text-right flex items-center gap-1 sm:gap-2">
                                                <div>
                                                    <p className="font-medium text-sm sm:text-base">{parseFloat(item.balanceFormatted).toFixed(6)}</p>
                                                    <p className="text-[10px] sm:text-xs text-muted-foreground">${item.usdValue}</p>
                                                </div>
                                                <ArrowUpRight className="h-3 w-3 sm:h-4 sm:w-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </ScrollArea>
                        )}
                    </TabsContent>

                    {/* SEND TAB */}
                    <TabsContent value="send" className="space-y-3 sm:space-y-4">
                        <div className="space-y-2">
                            <Label className="text-xs sm:text-sm">Select Token</Label>
                            <ScrollArea className="h-[140px] sm:h-[160px] rounded-md border p-2">
                                <div className="space-y-1">
                                    {(NETWORK_TOKENS[chainId || 42220] || []).map((token: TokenConfiguration, index: number) => {
                                        const balance = balances.find(b => b.token.address === token.address)
                                        return (
                                            <button
                                                key={index}
                                                onClick={() => setSelectedToken(token)}
                                                disabled={!balance || parseFloat(balance.balanceFormatted) === 0}
                                                className={`w-full flex items-center gap-2 sm:gap-3 p-2 rounded-md transition-colors ${!balance || parseFloat(balance.balanceFormatted) === 0 ? 'opacity-50 cursor-not-allowed' : 'hover:bg-muted'} ${selectedToken?.address === token.address ? 'bg-primary/10 border border-primary' : 'border border-transparent'}`}
                                            >
                                                <img src={token.logoUrl || undefined} alt={token.symbol} className="h-6 w-6 sm:h-8 sm:w-8 rounded-full" />
                                                <div className="text-left flex-1">
                                                    <p className="font-medium text-xs sm:text-sm">{token.symbol}</p>
                                                    {balance && <p className="text-[10px] sm:text-xs text-muted-foreground">{parseFloat(balance.balanceFormatted).toFixed(4)}</p>}
                                                </div>
                                                {selectedToken?.address === token.address && <CheckCircle2 className="h-3 w-3 sm:h-4 sm:w-4 text-primary" />}
                                            </button>
                                        )
                                    })}
                                </div>
                            </ScrollArea>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="recipient" className="text-xs sm:text-sm">Recipient Address</Label>
                            <Input id="recipient" placeholder="0x..." value={recipient} onChange={(e) => setRecipient(e.target.value)} className="text-xs sm:text-sm h-9 sm:h-10" />
                        </div>

                        <div className="space-y-2">
                            <div className="flex justify-between">
                                <Label htmlFor="amount" className="text-xs sm:text-sm">Amount</Label>
                                {selectedToken && balances.find(b => b.token.address === selectedToken.address) && (
                                    <button
                                        onClick={() => {
                                            const bal = balances.find(b => b.token.address === selectedToken.address)
                                            if (bal) setAmount(bal.balanceFormatted)
                                        }}
                                        className="text-[10px] sm:text-xs text-primary hover:underline"
                                    >
                                        Max
                                    </button>
                                )}
                            </div>
                            <div className="relative">
                                <Input id="amount" type="number" placeholder="0.0" value={amount} onChange={(e) => setAmount(e.target.value)} className="text-xs sm:text-sm h-9 sm:h-10 pr-16" />
                                {selectedToken && <Badge variant="secondary" className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] sm:text-xs">{selectedToken.symbol}</Badge>}
                            </div>
                        </div>

                        <Button onClick={handleSend} disabled={sending || !selectedToken || !recipient || !amount} className="w-full text-xs sm:text-sm h-9 sm:h-10">
                            {sending ? <><Loader2 className="mr-2 h-3 w-3 sm:h-4 sm:w-4 animate-spin" /> Sending...</> : <><Send className="mr-2 h-3 w-3 sm:h-4 sm:w-4" /> Send Transaction</>}
                        </Button>

                        {txHash && (
                            <Alert>
                                <CheckCircle2 className="h-3 w-3 sm:h-4 sm:w-4 text-green-500" />
                                <AlertDescription className="text-[10px] sm:text-xs flex items-center gap-2">
                                    Transaction sent!
                                    <a href={getExplorerUrl(txHash)} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline flex items-center gap-1">
                                        View <ExternalLink className="h-2 w-2 sm:h-3 sm:w-3" />
                                    </a>
                                </AlertDescription>
                            </Alert>
                        )}
                    </TabsContent>

                    {/* EXPORT KEY TAB */}
                    <TabsContent value="export" className="space-y-3 sm:space-y-4">
  <Alert variant="destructive">
    <AlertTriangle className="h-3 w-3 sm:h-4 sm:w-4" />
    <AlertDescription className="text-[10px] sm:text-sm">
      <strong>Warning:</strong> Never share your private key or seed phrase. Anyone with it has full access to your wallet.
    </AlertDescription>
  </Alert>

  {/* Export type toggle */}
  <div className="grid grid-cols-2 gap-2">
    <Button
      variant={exportType === "privatekey" ? "default" : "outline"}
      size="sm"
      onClick={() => { setExportType("privatekey"); setExportedKey(null); setSeedPhrase(null) }}
      className="text-xs"
    >
      Private Key
    </Button>
    <Button
      variant={exportType === "seed" ? "default" : "outline"}
      size="sm"
      onClick={() => { setExportType("seed"); setExportedKey(null); setSeedPhrase(null) }}
      className="text-xs"
    >
      Seed Phrase
    </Button>
  </div>

  {/* Private Key export */}
  {exportType === "privatekey" && (
    <>
      <p className="text-xs text-muted-foreground">
        Exporting private key for{" "}
        <span className="font-semibold text-foreground">{getChainDisplay()}</span>.
        Switch chains to export for a different network.
      </p>

      {!exportedKey ? (
        <Button
          onClick={handleExportPrivateKey}
          disabled={exporting}
          className="w-full text-xs sm:text-sm h-9 sm:h-10"
          variant="outline"
        >
          {exporting
            ? <><Loader2 className="mr-2 h-3 w-3 animate-spin" /> Exporting…</>
            : <><Download className="mr-2 h-3 w-3" /> Export {getChainDisplay()} Private Key</>}
        </Button>
      ) : (
        <div className="space-y-3">
          {/* Chain badge */}
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs capitalize">{exportChain}</Badge>
            <span className="text-xs text-muted-foreground">private key</span>
          </div>

          {/* Key display */}
          <div className="relative">
            <div className={`p-3 rounded-lg border bg-muted/50 font-mono text-xs break-all leading-relaxed ${!showKey ? "blur-sm select-none" : ""}`}>
              {exportedKey}
            </div>
            <Button
              variant="ghost" size="sm"
              onClick={() => setShowKey(s => !s)}
              className="absolute top-2 right-2 h-7 w-7 p-0"
            >
              {showKey ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
            </Button>
          </div>

          {/* Solana format hint */}
          {exportChain === "solana" && (
            <p className="text-[10px] text-muted-foreground">
              Format: 64-byte array — paste into Phantom → Import Private Key
            </p>
          )}
          {exportChain === "stellar" && (
            <p className="text-[10px] text-muted-foreground">
              Format: Stellar secret key (S...) — importable into Lobstr, Freighter, etc.
            </p>
          )}

          <div className="flex gap-2">
            <Button
              variant="outline" size="sm"
              onClick={() => copyToClipboard(exportedKey, "Private key")}
              disabled={!showKey}
              className="flex-1 text-xs"
            >
              <Copy className="mr-2 h-3 w-3" /> Copy
            </Button>
            <Button
              variant="ghost" size="sm"
              onClick={() => { setExportedKey(null); setShowKey(false) }}
              className="flex-1 text-xs"
            >
              Clear
            </Button>
          </div>
        </div>
      )}
    </>
  )}

  {/* Seed phrase export (unchanged logic, new placement) */}
  {exportType === "seed" && (

    <>
   
      {!seedPhrase ? (
        <Button
          onClick={handleExportSeed}
          disabled={exporting}
          className="w-full text-xs sm:text-sm h-9 sm:h-10"
          variant="outline"
        >
          {exporting
            ? <><Loader2 className="mr-2 h-3 w-3 animate-spin" /> Revealing…</>
            : <><Download className="mr-2 h-3 w-3" /> Reveal Seed Phrase</>}
        </Button>
      ) : (
        <div className="space-y-3">
          <div className="relative">
            <div className={`p-3 rounded-lg border bg-muted/50 font-mono text-xs break-words leading-relaxed ${!showSeed ? "blur-sm select-none" : ""}`}>
              {seedPhrase}
            </div>
            <Button
              variant="ghost" size="sm"
              onClick={() => setShowSeed(s => !s)}
              className="absolute top-2 right-2 h-7 w-7 p-0"
            >
              {showSeed ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
            </Button>
          </div>
          <p className="text-[10px] text-muted-foreground">
            Import into any wallet using derivation paths: EVM m/44'/60'/0'/0/0 · Solana m/44'/501'/0'/0' · Stellar m/44'/148'/0'
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline" size="sm"
              onClick={() => copyToClipboard(seedPhrase, "Seed phrase")}
              disabled={!showSeed}
              className="flex-1 text-xs"
            >
              <Copy className="mr-2 h-3 w-3" /> Copy
            </Button>
            <Button
              variant="ghost" size="sm"
              onClick={() => { setSeedPhrase(null); setShowSeed(false) }}
              className="flex-1 text-xs"
            >
              Hide & Clear
            </Button>
          </div>
        </div>
      )}
    </>
  )}
</TabsContent>

                </Tabs>
            </DialogContent>
        </Dialog>
    )
}