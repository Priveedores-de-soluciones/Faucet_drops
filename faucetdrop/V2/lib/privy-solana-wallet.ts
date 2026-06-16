// lib/privy-solana-wallet.ts
import { PublicKey, Transaction, VersionedTransaction } from "@solana/web3.js"
import type { ConnectedWallet } from "@privy-io/react-auth"

/**
 * Wraps a Privy ConnectedWallet into the shape Anchor's AnchorProvider expects.
 * Call this inside your handler, right before passing to any solana-program.ts function.
 */
export async function getAnchorWalletFromPrivy(privyWallet: ConnectedWallet) {
  // Privy exposes a WalletAdapter-compatible object via getSolanaWallet()
  const solanaWallet = await (privyWallet as any).getSolanaWallet()

  // getSolanaWallet() returns null for non-Solana wallets
  if (!solanaWallet) {
    throw new Error("This wallet is not a Solana wallet.")
  }

  const publicKey = new PublicKey(privyWallet.address)

  return {
    publicKey,

    signTransaction: async <T extends Transaction | VersionedTransaction>(tx: T): Promise<T> => {
      // Privy's solana adapter exposes signTransaction
      return solanaWallet.signTransaction(tx) as Promise<T>
    },

    signAllTransactions: async <T extends Transaction | VersionedTransaction>(txs: T[]): Promise<T[]> => {
      // Batch sign — falls back to sequential if signAllTransactions isn't available
      if (solanaWallet.signAllTransactions) {
        return solanaWallet.signAllTransactions(txs) as Promise<T[]>
      }
      return Promise.all(txs.map((tx) => solanaWallet.signTransaction(tx) as Promise<T>))
    },
  }
}