import { type Chain } from "viem"
import { arbitrum, base, lisk, celo, bsc } from "viem/chains"

export const supportedChains: [Chain, ...Chain[]] = [arbitrum, base, celo, lisk, bsc]

export const CHAIN_RPC: Record<number, string> = {
  [arbitrum.id]: process.env.NEXT_PUBLIC_RPC_ARBITRUM ?? "https://arb1.llamarpc.com",
  [base.id]:     process.env.NEXT_PUBLIC_RPC_BASE     ?? "https://mainnet.base.org",
  [celo.id]:     process.env.NEXT_PUBLIC_RPC_CELO     ?? "https://forno.celo.org",
  [lisk.id]:     process.env.NEXT_PUBLIC_RPC_LISK     ?? "https://rpc.api.lisk.com",
  [bsc.id]:      process.env.NEXT_PUBLIC_RPC_BSC      ?? "https://bsc-dataseed.binance.org",
}

export const CHAIN_EXPLORERS: Record<number, { name: string; url: string }> = {
  [arbitrum.id]: { name: "Arbiscan",  url: "https://arbiscan.io"  },
  [base.id]:     { name: "Basescan",  url: "https://basescan.org" },
  [celo.id]:     { name: "Celoscan",  url: "https://celoscan.io"  },
  [lisk.id]:     { name: "Lisk Scan", url: "https://liskscan.com" },
  [bsc.id]:      { name: "BscScan",   url: "https://bscscan.com"  },
}

export const DEFAULT_CHAIN_ID = celo.id
export const DEFAULT_CHAIN    = celo

// ── Non-EVM chain IDs (arbitrary constants, not EVM chainIds) ────────────────
export const SOLANA_CHAIN_ID  = 900   // internal identifier
export const STELLAR_CHAIN_ID = 901

export const NON_EVM_CHAINS = {
  [SOLANA_CHAIN_ID]:  { name: "Solana",  symbol: "SOL", explorer: "https://solscan.io/account/" },
  [STELLAR_CHAIN_ID]: { name: "Stellar", symbol: "XLM", explorer: "https://stellar.expert/explorer/public/account/" },
}