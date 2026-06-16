// hooks/use-unified-wallet.ts
"use client"
import { useWallet as useSolanaWallet } from "@solana/wallet-adapter-react"
import { useWallet as useEvmWallet } from "@/hooks/use-wallet"
import { SOLANA_CHAIN_ID } from "@/lib/solana-connection"

export function useUnifiedWallet(chainId?: number | null) {
  const evm = useEvmWallet()
  const solana = useSolanaWallet()

  const isSolana = chainId === SOLANA_CHAIN_ID

  if (isSolana) {
    return {
      address: solana.publicKey?.toBase58() ?? null,
      isConnected: solana.connected,
      chainId: SOLANA_CHAIN_ID,
      connect: () => solana.connect().catch(console.error),
      disconnect: () => solana.disconnect(),
      provider: null,           // no ethers provider on Solana
      switchChain: async () => {}, // no-op; Solana doesn't switch chains
      isSolana: true,
      solanaWallet: solana,
    }
  }

  return {
    ...evm,
    isSolana: false,
    solanaWallet: null,
  }
}