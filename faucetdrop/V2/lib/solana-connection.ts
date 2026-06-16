// lib/solana-connection.ts
// Solana RPC connection manager with automatic failover
// Drop this file in your lib/ directory and import where needed

import { Connection, PublicKey, clusterApiUrl } from "@solana/web3.js";

// ─── Constants ────────────────────────────────────────────────────────────────

/** Chain ID used throughout your app for Solana routing */
export const SOLANA_CHAIN_ID = 102;

/** Program ID matching your on-chain IDL */
export const SOLANA_PROGRAM_ID =
  "5Kw76EwothAXEiDt3EPTmxwYLdWiw89pRAXxWHVmsXTU";

// ─── RPC Endpoints (ordered: fastest/most reliable first) ────────────────────

/**
 * Public + free RPC endpoints for Solana Mainnet.
 * Swap the first entry for your own paid RPC (Helius, Triton, QuikNode, etc.)
 * once you hit rate limits in production.
 */
export const SOLANA_RPC_ENDPOINTS: string[] = [
  // Paid / high-priority (fill in your key)
  process.env.NEXT_PUBLIC_SOLANA_RPC_URL ?? "",

  // Free fallbacks — always available
  "https://api.mainnet-beta.solana.com",
  "https://solana-mainnet.g.alchemy.com/v2/demo",
  "https://rpc.ankr.com/solana",
  "https://solana.publicnode.com",
  "https://mainnet.helius-rpc.com/?api-key=demo",
].filter(Boolean); // strip empty strings

/** Devnet endpoints (used when NEXT_PUBLIC_SOLANA_NETWORK=devnet) */
export const SOLANA_DEVNET_ENDPOINTS: string[] = [
  process.env.NEXT_PUBLIC_SOLANA_DEVNET_RPC_URL ?? "",
  clusterApiUrl("devnet"),
  "https://api.devnet.solana.com",
].filter(Boolean);

// ─── Connection Factory ───────────────────────────────────────────────────────

const IS_DEVNET =
  process.env.NEXT_PUBLIC_SOLANA_NETWORK?.toLowerCase() === "devnet";

/**
 * Returns the ordered list of RPC URLs appropriate for the current environment.
 */
export function getSolanaRpcEndpoints(): string[] {
  return IS_DEVNET ? SOLANA_DEVNET_ENDPOINTS : SOLANA_RPC_ENDPOINTS;
}

/**
 * Creates a `Connection` to the first available endpoint.
 * Uses "confirmed" commitment by default — fast enough for UX, safe enough
 * for balance reads and PDA fetches.
 */
export function createSolanaConnection(
  commitment: "processed" | "confirmed" | "finalized" = "confirmed"
): Connection {
  const endpoints = getSolanaRpcEndpoints();
  const primary = endpoints[0];
  return new Connection(primary, {
    commitment,
    confirmTransactionInitialTimeout: 60_000,
    wsEndpoint: primary.replace(/^http/, "ws"),
  });
}

/**
 * Tries each RPC endpoint in order until one succeeds.
 * Use this for critical reads where you cannot afford a single-endpoint failure.
 *
 * @example
 * const balance = await withFallback((conn) => conn.getBalance(pubkey))
 */
export async function withFallback<T>(
  fn: (connection: Connection) => Promise<T>,
  commitment: "processed" | "confirmed" | "finalized" = "confirmed"
): Promise<T> {
  const endpoints = getSolanaRpcEndpoints();
  let lastError: unknown;

  for (const endpoint of endpoints) {
    const conn = new Connection(endpoint, {
      commitment,
      confirmTransactionInitialTimeout: 60_000,
    });
    try {
      return await fn(conn);
    } catch (err) {
      console.warn(`[Solana] RPC ${endpoint} failed:`, err);
      lastError = err;
    }
  }

  throw lastError;
}

// ─── PDA Helpers (mirror your TypeScript SDK) ─────────────────────────────────

const PROGRAM = new PublicKey(SOLANA_PROGRAM_ID);

/** ["faucet", owner, name] */
export function getFaucetStatePda(ownerPubkey: PublicKey, name: string) {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("faucet"), ownerPubkey.toBuffer(), Buffer.from(name)],
    PROGRAM
  );
}

/** ["faucet_vault", faucetState] */
export function getFaucetVaultPda(faucetStatePubkey: PublicKey) {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("faucet_vault"), faucetStatePubkey.toBuffer()],
    PROGRAM
  );
}

/** ["faucet_claim", faucetState, participant] */
export function getFaucetClaimStatusPda(
  faucetStatePubkey: PublicKey,
  participantPubkey: PublicKey
) {
  return PublicKey.findProgramAddressSync(
    [
      Buffer.from("faucet_claim"),
      faucetStatePubkey.toBuffer(),
      participantPubkey.toBuffer(),
    ],
    PROGRAM
  );
}

/** ["quiz", owner, name] */
export function getQuizStatePda(ownerPubkey: PublicKey, name: string) {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("quiz"), ownerPubkey.toBuffer(), Buffer.from(name)],
    PROGRAM
  );
}

/** ["quiz_player", quizState, participant] */
export function getQuizPlayerRecordPda(
  quizStatePubkey: PublicKey,
  participantPubkey: PublicKey
) {
  return PublicKey.findProgramAddressSync(
    [
      Buffer.from("quiz_player"),
      quizStatePubkey.toBuffer(),
      participantPubkey.toBuffer(),
    ],
    PROGRAM
  );
}

/** ["quest", owner, name] */
export function getQuestStatePda(ownerPubkey: PublicKey, name: string) {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("quest"), ownerPubkey.toBuffer(), Buffer.from(name)],
    PROGRAM
  );
}

/** ["quest_participant", questState, participant] */
export function getQuestParticipantRecordPda(
  questStatePubkey: PublicKey,
  participantPubkey: PublicKey
) {
  return PublicKey.findProgramAddressSync(
    [
      Buffer.from("quest_participant"),
      questStatePubkey.toBuffer(),
      participantPubkey.toBuffer(),
    ],
    PROGRAM
  );
}

// ─── Balance Utilities ────────────────────────────────────────────────────────

/**
 * Returns the SOL balance for a wallet address string.
 * Uses fallback RPC logic so one dead node won't break the UI.
 */
export async function getSolBalance(walletAddress: string): Promise<number> {
  const pubkey = new PublicKey(walletAddress);
  const lamports = await withFallback((conn) => conn.getBalance(pubkey));
  return lamports / 1_000_000_000;
}

/**
 * Returns the SPL token balance for a mint + wallet combination.
 * Returns 0 (not throws) when the ATA doesn't exist yet.
 */
export async function getSplBalance(
  walletAddress: string,
  mintAddress: string
): Promise<number> {
  const { getAssociatedTokenAddress, getAccount } = await import(
    "@solana/spl-token"
  );
  const owner = new PublicKey(walletAddress);
  const mint = new PublicKey(mintAddress);
  const ata = await getAssociatedTokenAddress(mint, owner);

  try {
    const account = await withFallback((conn) => getAccount(conn, ata));
    return Number(account.amount);
  } catch {
    return 0; // ATA doesn't exist — balance is effectively 0
  }
}

// ─── Address Utilities ────────────────────────────────────────────────────────

/** True if the string looks like a valid base-58 Solana address */
export function isValidSolanaAddress(address: string): boolean {
  try {
    new PublicKey(address);
    return true;
  } catch {
    return false;
  }
}

/** Returns true for Solana addresses (no 0x prefix) */
export function isSolanaAddress(address: string): boolean {
  return !address.startsWith("0x") && isValidSolanaAddress(address);
}