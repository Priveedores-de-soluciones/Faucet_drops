import {
  Connection,
  PublicKey,
  SystemProgram,
  Transaction,
  ComputeBudgetProgram,
} from '@solana/web3.js';
import { Program, AnchorProvider, Idl, BN } from '@coral-xyz/anchor';
import {
  TOKEN_PROGRAM_ID,
  getAssociatedTokenAddress,
  getAccount,
} from '@solana/spl-token';
import FaucetDropsIDL from './faucet_drops_idl.json';

// =============================================================================
// ⚙️ CONSTANTS
// =============================================================================

export const PROGRAM_ID = new PublicKey('5Kw76EwothAXEiDt3EPTmxwYLdWiw89pRAXxWHVmsXTU');

// Replace with your actual backend signer and fee vault pubkeys
export const BACKEND_PUBKEY = new PublicKey(
  process.env.NEXT_PUBLIC_BACKEND_PUBKEY ?? PublicKey.default.toBase58()
)
export const FEE_VAULT_PUBKEY = new PublicKey(
  process.env.NEXT_PUBLIC_FEE_VAULT_PUBKEY ?? PublicKey.default.toBase58()
)
// =============================================================================
// 🔧 PROGRAM SETUP
// =============================================================================

export function getProgram(connection: Connection, wallet: any): Program<Idl> {
  const provider = new AnchorProvider(connection, wallet, AnchorProvider.defaultOptions());
  const idl = { ...FaucetDropsIDL, address: PROGRAM_ID.toBase58() } as unknown as Idl;
  return new Program<Idl>(idl, provider);
}

/** Read-only wallet for fetch-only calls */
function readOnlyWallet(connection: Connection) {
  const wallet = {
    publicKey: PublicKey.default,
    signTransaction: async (tx: any) => tx,
    signAllTransactions: async (txs: any[]) => txs,
  };
  return getProgram(connection, wallet);
}

/** Cast program.methods to any to avoid deep TS inference errors */
const m = (program: Program<Idl>): any => (program as any).methods;
/** Cast program.account to any */
const a = (program: Program<Idl>): any => (program as any).account;

// =============================================================================
// 🗝️ PDA DERIVATION
// =============================================================================

// ── Faucet PDAs ──────────────────────────────────────────────────────────────

/** seeds: ["faucet", owner, name] */
export function getFaucetStatePda(ownerPubkey: PublicKey, name: string) {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('faucet'), ownerPubkey.toBuffer(), Buffer.from(name)],
    PROGRAM_ID
  );
}

/** seeds: ["faucet_vault", faucetState] */
export function getFaucetVaultPda(faucetStatePubkey: PublicKey) {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('faucet_vault'), faucetStatePubkey.toBuffer()],
    PROGRAM_ID
  );
}

/** seeds: ["faucet_claim", faucetState, participant] */
export function getFaucetClaimStatusPda(faucetStatePubkey: PublicKey, participantPubkey: PublicKey) {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('faucet_claim'), faucetStatePubkey.toBuffer(), participantPubkey.toBuffer()],
    PROGRAM_ID
  );
}

/** seeds: ["whitelist", faucetState, user] */
export function getWhitelistEntryPda(faucetStatePubkey: PublicKey, userPubkey: PublicKey) {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('whitelist'), faucetStatePubkey.toBuffer(), userPubkey.toBuffer()],
    PROGRAM_ID
  );
}

/** seeds: ["faucet_admin", faucetState, targetAdmin] */
export function getFaucetAdminRecordPda(faucetStatePubkey: PublicKey, adminPubkey: PublicKey) {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('faucet_admin'), faucetStatePubkey.toBuffer(), adminPubkey.toBuffer()],
    PROGRAM_ID
  );
}

// ── Quiz PDAs ────────────────────────────────────────────────────────────────

/** seeds: ["quiz", owner, name] */
export function getQuizStatePda(ownerPubkey: PublicKey, name: string) {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('quiz'), ownerPubkey.toBuffer(), Buffer.from(name)],
    PROGRAM_ID
  );
}

/** seeds: ["quiz_vault", quizState] */
export function getQuizVaultPda(quizStatePubkey: PublicKey) {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('quiz_vault'), quizStatePubkey.toBuffer()],
    PROGRAM_ID
  );
}

/** seeds: ["quiz_player", quizState, participant] */
export function getQuizPlayerRecordPda(quizStatePubkey: PublicKey, participantPubkey: PublicKey) {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('quiz_player'), quizStatePubkey.toBuffer(), participantPubkey.toBuffer()],
    PROGRAM_ID
  );
}

/** seeds: ["quiz_admin", quizState, targetAdmin] */
export function getQuizAdminRecordPda(quizStatePubkey: PublicKey, adminPubkey: PublicKey) {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('quiz_admin'), quizStatePubkey.toBuffer(), adminPubkey.toBuffer()],
    PROGRAM_ID
  );
}

// ── Quest PDAs ────────────────────────────────────────────────────────────────

/** seeds: ["quest", owner, name] */
export function getQuestStatePda(ownerPubkey: PublicKey, name: string) {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('quest'), ownerPubkey.toBuffer(), Buffer.from(name)],
    PROGRAM_ID
  );
}

/** seeds: ["quest_vault", questState] */
export function getQuestVaultPda(questStatePubkey: PublicKey) {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('quest_vault'), questStatePubkey.toBuffer()],
    PROGRAM_ID
  );
}

/** seeds: ["quest_participant", questState, participant] */
export function getQuestParticipantRecordPda(
  questStatePubkey: PublicKey,
  participantPubkey: PublicKey
) {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('quest_participant'), questStatePubkey.toBuffer(), participantPubkey.toBuffer()],
    PROGRAM_ID
  );
}

// =============================================================================
// 📦 RETURN TYPES
// =============================================================================

export interface FaucetStateData {
  owner: string;
  backendSigner: string;
  tokenMint: string;
  vaultAddress: string;
  name: string;
  claimAmount: bigint;
  startTime: number;
  endTime: number;
  faucetType: number;
  paused: boolean;
  deleted: boolean;
  bump: number;
}

export interface ClaimStatusData {
  claimed: boolean;
  claimer: string;
  amount: bigint;
  claimTime: number;
}

export interface WhitelistEntryData {
  isWhitelisted: boolean;
  customAmount: bigint;
}

export interface QuizStateData {
  owner: string;
  backend: string;
  vaultAddress: string;
  tokenMint: string;
  name: string;
  claimWindowDuration: number;
  claimWindowEnd: number;
  totalParticipants: number;
  totalSubmissions: number;
  isStarted: boolean;
  paused: boolean;
  deleted: boolean;
  bump: number;
}

export interface QuizPlayerRecordData {
  quiz: string;
  player: string;
  hasJoined: boolean;
  hasSubmitted: boolean;
  hasClaimed: boolean;
  rewardAmount: bigint;
}

export interface QuestStateData {
  owner: string;
  backend: string;
  backendB: string;
  tokenMint: string;
  name: string;
  startTime: number;
  endTime: number;
  totalParticipants: bigint;
  totalSubmissions: bigint;
  totalCheckins: bigint;
  paused: boolean;
  deleted: boolean;
  fundsWithdrawn: boolean;
  bump: number;
}

export interface QuestParticipantRecordData {
  quest: string;
  participant: string;
  hasJoined: boolean;
  hasClaimed: boolean;
  rewardAmount: bigint;
}

// =============================================================================
// 💧 MODULE 1: FAUCET INSTRUCTIONS
// =============================================================================

/**
 * Creates a new faucet on-chain.
 * faucetType: 0 = whitelist fixed, 1 = open/backend-verified, 2 = custom whitelist amounts
 */
export async function initializeFaucet(
  connection: Connection,
  wallet: any,
  name: string,
  tokenMintAddress: string,
  claimAmount: number,
  startTime: number,
  endTime: number,
  faucetType: 0 | 1 | 2
): Promise<{ tx: string; faucetState: string; faucetTokenVault: string }> {
  const program = getProgram(connection, wallet);
  const tokenMint = new PublicKey(tokenMintAddress);
  const [faucetState] = getFaucetStatePda(wallet.publicKey, name);
  const [faucetTokenVault] = getFaucetVaultPda(faucetState);

  const tx = await m(program)
    .initializeFaucet(
      name,
      new BN(claimAmount),
      new BN(startTime),
      new BN(endTime),
      faucetType
    )
    .accounts({
      owner: wallet.publicKey,
      backend: BACKEND_PUBKEY,
      tokenMint,
      vaultAddress: FEE_VAULT_PUBKEY,
      faucetState,
      faucetTokenVault,
      systemProgram: SystemProgram.programId,
      tokenProgram: TOKEN_PROGRAM_ID,
    })
    .rpc();

  return { tx, faucetState: faucetState.toString(), faucetTokenVault: faucetTokenVault.toString() };
}

/**
 * Deposits tokens into the faucet vault.
 * Fees: 1% backend + 2% platform vault (deducted automatically on-chain).
 */
export async function fundFaucet(
  connection: Connection,
  wallet: any,
  faucetStateAddress: string,
  amount: number
): Promise<string> {
  const program = getProgram(connection, wallet);
  const faucetState = new PublicKey(faucetStateAddress);
  const [faucetTokenVault] = getFaucetVaultPda(faucetState);

  const state: any = await a(program).faucetState.fetch(faucetState);

  const funderTokenAccount = await getAssociatedTokenAddress(state.tokenMint, wallet.publicKey);
  const backendTokenAccount = await getAssociatedTokenAddress(state.tokenMint, state.backendSigner);
  const vaultTokenAccount = await getAssociatedTokenAddress(state.tokenMint, state.vaultAddress);

  return m(program)
    .fundFaucet(new BN(amount))
    .accounts({
      funder: wallet.publicKey,
      faucetState,
      funderTokenAccount,
      backendTokenAccount,
      vaultTokenAccount,
      faucetTokenVault,
      tokenProgram: TOKEN_PROGRAM_ID,
    })
    .rpc();
}

/**
 * Executes a claim on behalf of a participant (backend signs).
 * Used for all faucet types. For type 2, backendAmount is used as fallback
 * when the whitelist entry has custom_amount == 0.
 */
export async function claimFaucet(
  connection: Connection,
  backendWallet: any,
  faucetStateAddress: string,
  participantAddress: string,
  backendAmount: number,
  isWhitelisted: boolean
): Promise<string> {
  const program = getProgram(connection, backendWallet);
  const faucetState = new PublicKey(faucetStateAddress);
  const participant = new PublicKey(participantAddress);
  const [faucetTokenVault] = getFaucetVaultPda(faucetState);
  const [claimStatus] = getFaucetClaimStatusPda(faucetState, participant);
  const [whitelistEntry] = getWhitelistEntryPda(faucetState, participant);

  const state: any = await a(program).faucetState.fetch(faucetState);
  const participantTokenAccount = await getAssociatedTokenAddress(state.tokenMint, participant);

  return m(program)
    .claimFaucet(new BN(backendAmount))
    .accounts({
      backend: backendWallet.publicKey,
      faucetState,
      participant,
      claimStatus,
      // Pass the whitelist PDA if relevant; null omits the optional account
      whitelistEntry: isWhitelisted ? whitelistEntry : null,
      faucetTokenVault,
      participantTokenAccount,
      systemProgram: SystemProgram.programId,
      tokenProgram: TOKEN_PROGRAM_ID,
    })
    .rpc();
}

/**
 * Adds a user to the faucet whitelist.
 * Pass 0 for customAmount to use the faucet's default claimAmount.
 * Callable by owner OR backend signer.
 */
export async function addToWhitelist(
  connection: Connection,
  wallet: any,
  faucetStateAddress: string,
  userAddress: string,
  customAmount: number
): Promise<string> {
  const program = getProgram(connection, wallet);
  const faucetState = new PublicKey(faucetStateAddress);
  const user = new PublicKey(userAddress);
  const [whitelistEntry] = getWhitelistEntryPda(faucetState, user);

  return m(program)
    .addToWhitelist(new BN(customAmount))
    .accounts({
      signer: wallet.publicKey,
      faucetState,
      user,
      whitelistEntry,
      systemProgram: SystemProgram.programId,
    })
    .rpc();
}

/**
 * Removes a user from the faucet whitelist.
 * Callable by owner OR backend signer.
 */
export async function removeFromWhitelist(
  connection: Connection,
  wallet: any,
  faucetStateAddress: string,
  userAddress: string
): Promise<string> {
  const program = getProgram(connection, wallet);
  const faucetState = new PublicKey(faucetStateAddress);
  const user = new PublicKey(userAddress);
  const [whitelistEntry] = getWhitelistEntryPda(faucetState, user);

  return m(program)
    .removeFromWhitelist()
    .accounts({
      signer: wallet.publicKey,
      faucetState,
      user,
      whitelistEntry,
      systemProgram: SystemProgram.programId,
    })
    .rpc();
}

/**
 * Withdraws remaining tokens from the vault back to the owner.
 * Only callable AFTER the claim period ends (end_time has passed).
 */
export async function withdrawFaucet(
  connection: Connection,
  wallet: any,
  faucetStateAddress: string,
  amount: number
): Promise<string> {
  const program = getProgram(connection, wallet);
  const faucetState = new PublicKey(faucetStateAddress);
  const [faucetTokenVault] = getFaucetVaultPda(faucetState);

  const state: any = await a(program).faucetState.fetch(faucetState);
  const ownerTokenAccount = await getAssociatedTokenAddress(state.tokenMint, wallet.publicKey);

  return m(program)
    .withdrawFaucet(new BN(amount))
    .accounts({
      owner: wallet.publicKey,
      faucetState,
      faucetTokenVault,
      ownerTokenAccount,
      tokenProgram: TOKEN_PROGRAM_ID,
    })
    .rpc();
}

/**
 * Marks faucet as deleted, pauses it, and drains the vault back to the owner.
 * Callable by owner OR backend signer.
 */
export async function deleteFaucet(
  connection: Connection,
  wallet: any,
  faucetStateAddress: string
): Promise<string> {
  const program = getProgram(connection, wallet);
  const faucetState = new PublicKey(faucetStateAddress);
  const [faucetTokenVault] = getFaucetVaultPda(faucetState);

  const state: any = await a(program).faucetState.fetch(faucetState);
  const ownerTokenAccount = await getAssociatedTokenAddress(state.tokenMint, state.owner);

  return m(program)
    .deleteFaucet()
    .accounts({
      signer: wallet.publicKey,
      faucetState,
      faucetTokenVault,
      ownerTokenAccount,
      tokenProgram: TOKEN_PROGRAM_ID,
    })
    .rpc();
}

/**
 * Grants admin privileges to a pubkey on this faucet.
 * Only callable by the faucet owner.
 */
export async function addFaucetAdmin(
  connection: Connection,
  wallet: any,
  faucetStateAddress: string,
  targetAdminAddress: string
): Promise<string> {
  const program = getProgram(connection, wallet);
  const faucetState = new PublicKey(faucetStateAddress);
  const targetAdmin = new PublicKey(targetAdminAddress);
  const [adminRecord] = getFaucetAdminRecordPda(faucetState, targetAdmin);

  return m(program)
    .addFaucetAdmin()
    .accounts({
      owner: wallet.publicKey,
      faucetState,
      targetAdmin,
      adminRecord,
      systemProgram: SystemProgram.programId,
    })
    .rpc();
}

/**
 * Revokes admin privileges from a pubkey on this faucet.
 * Only callable by the faucet owner.
 */
export async function removeFaucetAdmin(
  connection: Connection,
  wallet: any,
  faucetStateAddress: string,
  targetAdminAddress: string
): Promise<string> {
  const program = getProgram(connection, wallet);
  const faucetState = new PublicKey(faucetStateAddress);
  const targetAdmin = new PublicKey(targetAdminAddress);
  const [adminRecord] = getFaucetAdminRecordPda(faucetState, targetAdmin);

  return m(program)
    .removeFaucetAdmin()
    .accounts({
      owner: wallet.publicKey,
      faucetState,
      targetAdmin,
      adminRecord,
      systemProgram: SystemProgram.programId,
    })
    .rpc();
}

/**
 * Resets a single user's claim status so they can claim again.
 * Callable by owner OR backend signer.
 */
export async function resetFaucetClaim(
  connection: Connection,
  wallet: any,
  faucetStateAddress: string,
  userAddress: string
): Promise<string> {
  const program = getProgram(connection, wallet);
  const faucetState = new PublicKey(faucetStateAddress);
  const user = new PublicKey(userAddress);
  const [claimStatus] = getFaucetClaimStatusPda(faucetState, user);

  return m(program)
    .resetFaucetClaim()
    .accounts({
      signer: wallet.publicKey,
      faucetState,
      user,
      claimStatus,
    })
    .rpc();
}

/**
 * Updates claimAmount, startTime, and endTime.
 * Only callable by the faucet owner.
 */
export async function updateFaucetConfig(
  connection: Connection,
  wallet: any,
  faucetStateAddress: string,
  newAmount: number,
  newStart: number,
  newEnd: number
): Promise<string> {
  const program = getProgram(connection, wallet);
  const faucetState = new PublicKey(faucetStateAddress);

  return m(program)
    .updateFaucetConfig(new BN(newAmount), new BN(newStart), new BN(newEnd))
    .accounts({
      authority: wallet.publicKey,
      faucetState,
    })
    .rpc();
}

/**
 * Pauses or unpauses the faucet.
 * Only callable by the faucet owner.
 */
export async function setFaucetPaused(
  connection: Connection,
  wallet: any,
  faucetStateAddress: string,
  paused: boolean
): Promise<string> {
  const program = getProgram(connection, wallet);
  const faucetState = new PublicKey(faucetStateAddress);

  return m(program)
    .setFaucetPaused(paused)
    .accounts({
      authority: wallet.publicKey,
      faucetState,
    })
    .rpc();
}

/**
 * Updates the faucet name stored in state.
 * NOTE: This does NOT change the PDA seeds — the faucet address remains the same.
 * Only callable by the faucet owner.
 */
export async function updateFaucetName(
  connection: Connection,
  wallet: any,
  faucetStateAddress: string,
  newName: string
): Promise<string> {
  const program = getProgram(connection, wallet);
  const faucetState = new PublicKey(faucetStateAddress);

  return m(program)
    .updateFaucetName(newName)
    .accounts({
      authority: wallet.publicKey,
      faucetState,
    })
    .rpc();
}

/**
 * Transfers ownership of the faucet to a new authority.
 * ⚠️ Irreversible unless the new owner transfers it back.
 * Only callable by the current faucet owner.
 */
export async function transferFaucetAuthority(
  connection: Connection,
  wallet: any,
  faucetStateAddress: string,
  newAuthority: string
): Promise<string> {
  const program = getProgram(connection, wallet);
  const faucetState = new PublicKey(faucetStateAddress);

  return m(program)
    .transferFaucetAuthority(new PublicKey(newAuthority))
    .accounts({
      authority: wallet.publicKey,
      faucetState,
    })
    .rpc();
}

// ── Faucet Batch Helpers ──────────────────────────────────────────────────────

/**
 * Adds multiple users to the whitelist in a single transaction.
 * Recommended max: 15 entries per call to stay within compute limits.
 */
export async function batchAddToWhitelist(
  connection: Connection,
  wallet: any,
  faucetStateAddress: string,
  entries: { userAddress: string; customAmount: number }[]
): Promise<string> {
  if (!entries.length) throw new Error('No entries provided');
  const program = getProgram(connection, wallet);
  const faucetState = new PublicKey(faucetStateAddress);
  const tx = new Transaction();
  tx.add(ComputeBudgetProgram.setComputeUnitLimit({ units: 1_400_000 }));

  for (const { userAddress, customAmount } of entries) {
    const user = new PublicKey(userAddress);
    const [whitelistEntry] = getWhitelistEntryPda(faucetState, user);
    const ix = await m(program)
      .addToWhitelist(new BN(customAmount))
      .accounts({
        signer: wallet.publicKey,
        faucetState,
        user,
        whitelistEntry,
        systemProgram: SystemProgram.programId,
      })
      .instruction();
    tx.add(ix);
  }

  return (program.provider as AnchorProvider).sendAndConfirm!(tx);
}

/**
 * Removes multiple users from the whitelist in a single transaction.
 */
export async function batchRemoveFromWhitelist(
  connection: Connection,
  wallet: any,
  faucetStateAddress: string,
  userAddresses: string[]
): Promise<string> {
  if (!userAddresses.length) throw new Error('No users provided');
  const program = getProgram(connection, wallet);
  const faucetState = new PublicKey(faucetStateAddress);
  const tx = new Transaction();
  tx.add(ComputeBudgetProgram.setComputeUnitLimit({ units: 1_400_000 }));

  for (const userAddress of userAddresses) {
    const user = new PublicKey(userAddress);
    const [whitelistEntry] = getWhitelistEntryPda(faucetState, user);
    const ix = await m(program)
      .removeFromWhitelist()
      .accounts({
        signer: wallet.publicKey,
        faucetState,
        user,
        whitelistEntry,
        systemProgram: SystemProgram.programId,
      })
      .instruction();
    tx.add(ix);
  }

  return (program.provider as AnchorProvider).sendAndConfirm!(tx);
}

/**
 * Resets claim status for multiple users in a single transaction.
 */
export async function batchResetFaucetClaims(
  connection: Connection,
  wallet: any,
  faucetStateAddress: string,
  userAddresses: string[]
): Promise<string> {
  if (!userAddresses.length) throw new Error('No users provided');
  const program = getProgram(connection, wallet);
  const faucetState = new PublicKey(faucetStateAddress);
  const tx = new Transaction();
  tx.add(ComputeBudgetProgram.setComputeUnitLimit({ units: 1_400_000 }));

  for (const userAddress of userAddresses) {
    const user = new PublicKey(userAddress);
    const [claimStatus] = getFaucetClaimStatusPda(faucetState, user);
    const ix = await m(program)
      .resetFaucetClaim()
      .accounts({
        signer: wallet.publicKey,
        faucetState,
        user,
        claimStatus,
      })
      .instruction();
    tx.add(ix);
  }

  return (program.provider as AnchorProvider).sendAndConfirm!(tx);
}

// =============================================================================
// 🧠 MODULE 2: QUIZ INSTRUCTIONS
// =============================================================================

/**
 * Creates a new multiplayer quiz on-chain.
 * claimWindowDuration: seconds the claim window stays open after rewards are set.
 */
export async function initializeQuiz(
  connection: Connection,
  wallet: any,
  name: string,
  tokenMintAddress: string,
  claimWindowDuration: number
): Promise<{ tx: string; quizState: string; quizTokenVault: string }> {
  const program = getProgram(connection, wallet);
  const tokenMint = new PublicKey(tokenMintAddress);
  const [quizState] = getQuizStatePda(wallet.publicKey, name);
  const [quizTokenVault] = getQuizVaultPda(quizState);

  const tx = await m(program)
    .initializeQuiz(name, new BN(claimWindowDuration))
    .accounts({
      owner: wallet.publicKey,
      backend: BACKEND_PUBKEY,
      tokenMint,
      vaultAddress: FEE_VAULT_PUBKEY,
      quizState,
      quizTokenVault,
      systemProgram: SystemProgram.programId,
      tokenProgram: TOKEN_PROGRAM_ID,
    })
    .rpc();

  return { tx, quizState: quizState.toString(), quizTokenVault: quizTokenVault.toString() };
}

/**
 * Deposits tokens into the quiz vault.
 * Fees: 2% backend + 3% platform vault.
 */
export async function fundQuiz(
  connection: Connection,
  wallet: any,
  quizStateAddress: string,
  amount: number
): Promise<string> {
  const program = getProgram(connection, wallet);
  const quizState = new PublicKey(quizStateAddress);
  const [quizTokenVault] = getQuizVaultPda(quizState);

  const state: any = await a(program).quizState.fetch(quizState);
  const funderTokenAccount = await getAssociatedTokenAddress(state.tokenMint, wallet.publicKey);
  const backendTokenAccount = await getAssociatedTokenAddress(state.tokenMint, state.backend);
  const vaultTokenAccount = await getAssociatedTokenAddress(state.tokenMint, state.vaultAddress);

  return m(program)
    .fundQuiz(new BN(amount))
    .accounts({
      funder: wallet.publicKey,
      quizState,
      funderTokenAccount,
      backendTokenAccount,
      vaultTokenAccount,
      quizTokenVault,
      tokenProgram: TOKEN_PROGRAM_ID,
    })
    .rpc();
}

/**
 * Starts the quiz. Only callable by the backend.
 */
export async function startQuiz(
  connection: Connection,
  backendWallet: any,
  quizStateAddress: string
): Promise<string> {
  const program = getProgram(connection, backendWallet);
  const quizState = new PublicKey(quizStateAddress);

  return m(program)
    .startQuiz()
    .accounts({
      backend: backendWallet.publicKey,
      quizState,
    })
    .rpc();
}

/**
 * Registers a participant in the quiz. Only callable by the backend.
 */
export async function joinQuiz(
  connection: Connection,
  backendWallet: any,
  quizStateAddress: string,
  participantAddress: string
): Promise<string> {
  const program = getProgram(connection, backendWallet);
  const quizState = new PublicKey(quizStateAddress);
  const participant = new PublicKey(participantAddress);
  const [playerRecord] = getQuizPlayerRecordPda(quizState, participant);

  return m(program)
    .joinQuiz()
    .accounts({
      backend: backendWallet.publicKey,
      quizState,
      participant,
      playerRecord,
      systemProgram: SystemProgram.programId,
    })
    .rpc();
}

/**
 * Records a participant's quiz submission. Only callable by the backend.
 */
export async function submitQuiz(
  connection: Connection,
  backendWallet: any,
  quizStateAddress: string,
  participantAddress: string
): Promise<string> {
  const program = getProgram(connection, backendWallet);
  const quizState = new PublicKey(quizStateAddress);
  const participant = new PublicKey(participantAddress);
  const [playerRecord] = getQuizPlayerRecordPda(quizState, participant);

  return m(program)
    .submitQuiz()
    .accounts({
      backend: backendWallet.publicKey,
      quizState,
      participant,
      playerRecord,
    })
    .rpc();
}

/**
 * Sets a participant's reward amount and opens the claim window if not already open.
 * Callable by backend, owner, or any registered quiz admin.
 */
export async function setQuizRewardAmount(
  connection: Connection,
  wallet: any,
  quizStateAddress: string,
  participantAddress: string,
  amount: number
): Promise<string> {
  const program = getProgram(connection, wallet);
  const quizState = new PublicKey(quizStateAddress);
  const participant = new PublicKey(participantAddress);
  const [playerRecord] = getQuizPlayerRecordPda(quizState, participant);
  const [adminRecord] = getQuizAdminRecordPda(quizState, wallet.publicKey);

  return m(program)
    .setQuizRewardAmount(new BN(amount))
    .accounts({
      signer: wallet.publicKey,
      quizState,
      participant,
      playerRecord,
      adminRecord,
      systemProgram: SystemProgram.programId,
    })
    .rpc();
}

/**
 * Manually opens the claim window. Only callable by the backend.
 * Note: setQuizRewardAmount also auto-opens the window on first call.
 */
export async function openQuizClaimWindow(
  connection: Connection,
  backendWallet: any,
  quizStateAddress: string
): Promise<string> {
  const program = getProgram(connection, backendWallet);
  const quizState = new PublicKey(quizStateAddress);

  return m(program)
    .openQuizClaimWindow()
    .accounts({
      backend: backendWallet.publicKey,
      quizState,
    })
    .rpc();
}

/**
 * Claims a quiz reward for a participant. Only callable by the backend.
 */
export async function claimQuizReward(
  connection: Connection,
  backendWallet: any,
  quizStateAddress: string,
  participantAddress: string
): Promise<string> {
  const program = getProgram(connection, backendWallet);
  const quizState = new PublicKey(quizStateAddress);
  const participant = new PublicKey(participantAddress);
  const [quizTokenVault] = getQuizVaultPda(quizState);
  const [playerRecord] = getQuizPlayerRecordPda(quizState, participant);

  const state: any = await a(program).quizState.fetch(quizState);
  const participantTokenAccount = await getAssociatedTokenAddress(state.tokenMint, participant);

  return m(program)
    .claimQuizReward()
    .accounts({
      backend: backendWallet.publicKey,
      quizState,
      participant,
      playerRecord,
      quizTokenVault,
      participantTokenAccount,
      tokenProgram: TOKEN_PROGRAM_ID,
    })
    .rpc();
}

/**
 * Grants admin privileges to a pubkey on this quiz.
 * Only callable by the quiz owner.
 */
export async function addQuizAdmin(
  connection: Connection,
  wallet: any,
  quizStateAddress: string,
  targetAdminAddress: string
): Promise<string> {
  const program = getProgram(connection, wallet);
  const quizState = new PublicKey(quizStateAddress);
  const targetAdmin = new PublicKey(targetAdminAddress);
  const [adminRecord] = getQuizAdminRecordPda(quizState, targetAdmin);

  return m(program)
    .addQuizAdmin()
    .accounts({
      owner: wallet.publicKey,
      quizState,
      targetAdmin,
      adminRecord,
      systemProgram: SystemProgram.programId,
    })
    .rpc();
}

/**
 * Revokes admin privileges from a pubkey on this quiz.
 * Only callable by the quiz owner.
 */
export async function removeQuizAdmin(
  connection: Connection,
  wallet: any,
  quizStateAddress: string,
  targetAdminAddress: string
): Promise<string> {
  const program = getProgram(connection, wallet);
  const quizState = new PublicKey(quizStateAddress);
  const targetAdmin = new PublicKey(targetAdminAddress);
  const [adminRecord] = getQuizAdminRecordPda(quizState, targetAdmin);

  return m(program)
    .removeQuizAdmin()
    .accounts({
      owner: wallet.publicKey,
      quizState,
      targetAdmin,
      adminRecord,
      systemProgram: SystemProgram.programId,
    })
    .rpc();
}

/**
 * Updates the quiz name stored in state.
 * Callable by owner or any registered quiz admin.
 */
export async function updateQuizName(
  connection: Connection,
  wallet: any,
  quizStateAddress: string,
  newName: string
): Promise<string> {
  const program = getProgram(connection, wallet);
  const quizState = new PublicKey(quizStateAddress);
  const [adminRecord] = getQuizAdminRecordPda(quizState, wallet.publicKey);

  return m(program)
    .updateQuizName(newName)
    .accounts({
      signer: wallet.publicKey,
      quizState,
      adminRecord,
      systemProgram: SystemProgram.programId,
    })
    .rpc();
}

/**
 * Pauses or unpauses the quiz.
 * Callable by owner or any registered quiz admin.
 */
export async function setQuizPaused(
  connection: Connection,
  wallet: any,
  quizStateAddress: string,
  paused: boolean
): Promise<string> {
  const program = getProgram(connection, wallet);
  const quizState = new PublicKey(quizStateAddress);
  const [adminRecord] = getQuizAdminRecordPda(quizState, wallet.publicKey);

  return m(program)
    .setQuizPaused(paused)
    .accounts({
      signer: wallet.publicKey,
      quizState,
      adminRecord,
      systemProgram: SystemProgram.programId,
    })
    .rpc();
}

/**
 * Withdraws unclaimed quiz funds back to the owner.
 * Only callable AFTER the claim window has closed.
 */
export async function withdrawQuiz(
  connection: Connection,
  wallet: any,
  quizStateAddress: string,
  amount: number
): Promise<string> {
  const program = getProgram(connection, wallet);
  const quizState = new PublicKey(quizStateAddress);
  const [quizTokenVault] = getQuizVaultPda(quizState);

  const state: any = await a(program).quizState.fetch(quizState);
  const ownerTokenAccount = await getAssociatedTokenAddress(state.tokenMint, wallet.publicKey);

  return m(program)
    .withdrawQuiz(new BN(amount))
    .accounts({
      owner: wallet.publicKey,
      quizState,
      quizTokenVault,
      ownerTokenAccount,
      tokenProgram: TOKEN_PROGRAM_ID,
    })
    .rpc();
}

// =============================================================================
// 🗺️ MODULE 3: QUEST INSTRUCTIONS
// =============================================================================

/**
 * Creates a new action-based quest on-chain.
 * claimWindowHours: duration of the claim window in hours.
 */
export async function initializeQuest(
  connection: Connection,
  wallet: any,
  name: string,
  tokenMintAddress: string,
  questStartTime: number,
  claimWindowHours: number,
  backendBAddress?: string
): Promise<{ tx: string; questState: string; questTokenVault: string }> {
  const program = getProgram(connection, wallet);
  const tokenMint = new PublicKey(tokenMintAddress);
  const [questState] = getQuestStatePda(wallet.publicKey, name);
  const [questTokenVault] = getQuestVaultPda(questState);
  // Use BACKEND_PUBKEY for backendB if not specified
  const backendB = backendBAddress ? new PublicKey(backendBAddress) : BACKEND_PUBKEY;

  const tx = await m(program)
    .initializeQuest(name, new BN(questStartTime), new BN(claimWindowHours))
    .accounts({
      owner: wallet.publicKey,
      backend: BACKEND_PUBKEY,
      backendB,
      tokenMint,
      vaultAddress: FEE_VAULT_PUBKEY,
      questState,
      questTokenVault,
      systemProgram: SystemProgram.programId,
      tokenProgram: TOKEN_PROGRAM_ID,
    })
    .rpc();

  return { tx, questState: questState.toString(), questTokenVault: questTokenVault.toString() };
}

/**
 * Deposits tokens into the quest vault.
 * Fees: 2% backend + 3% platform vault.
 */
export async function fundQuest(
  connection: Connection,
  wallet: any,
  questStateAddress: string,
  amount: number
): Promise<string> {
  const program = getProgram(connection, wallet);
  const questState = new PublicKey(questStateAddress);
  const [questTokenVault] = getQuestVaultPda(questState);

  const state: any = await a(program).questState.fetch(questState);
  const funderTokenAccount = await getAssociatedTokenAddress(state.tokenMint, wallet.publicKey);
  const backendTokenAccount = await getAssociatedTokenAddress(state.tokenMint, state.backend);
  const vaultTokenAccount = await getAssociatedTokenAddress(state.tokenMint, FEE_VAULT_PUBKEY);

  return m(program)
    .fundQuest(new BN(amount))
    .accounts({
      funder: wallet.publicKey,
      questState,
      funderTokenAccount,
      backendTokenAccount,
      vaultTokenAccount,
      questTokenVault,
      tokenProgram: TOKEN_PROGRAM_ID,
    })
    .rpc();
}

/**
 * Registers a participant in the quest.
 * Callable by either backend or backendB.
 */
export async function joinQuest(
  connection: Connection,
  backendWallet: any,
  questStateAddress: string,
  participantAddress: string
): Promise<string> {
  const program = getProgram(connection, backendWallet);
  const questState = new PublicKey(questStateAddress);
  const participant = new PublicKey(participantAddress);
  const [participantRecord] = getQuestParticipantRecordPda(questState, participant);

  return m(program)
    .joinQuest()
    .accounts({
      backend: backendWallet.publicKey,
      questState,
      participant,
      participantRecord,
      systemProgram: SystemProgram.programId,
    })
    .rpc();
}

/**
 * Increments the quest's total_submissions counter.
 * Callable by either backend or backendB.
 */
export async function submitQuestTask(
  connection: Connection,
  backendWallet: any,
  questStateAddress: string
): Promise<string> {
  const program = getProgram(connection, backendWallet);
  const questState = new PublicKey(questStateAddress);

  return m(program)
    .submitQuestTask()
    .accounts({
      backend: backendWallet.publicKey,
      questState,
    })
    .rpc();
}

/**
 * Increments the quest's total_checkins counter.
 * Callable by either backend or backendB.
 */
export async function checkInQuest(
  connection: Connection,
  backendWallet: any,
  questStateAddress: string
): Promise<string> {
  const program = getProgram(connection, backendWallet);
  const questState = new PublicKey(questStateAddress);

  return m(program)
    .checkInQuest()
    .accounts({
      backend: backendWallet.publicKey,
      questState,
    })
    .rpc();
}

/**
 * Sets a participant's reward amount.
 * Callable by backend, backendB, or owner.
 */
export async function setQuestRewardAmount(
  connection: Connection,
  wallet: any,
  questStateAddress: string,
  participantAddress: string,
  amount: number
): Promise<string> {
  const program = getProgram(connection, wallet);
  const questState = new PublicKey(questStateAddress);
  const participant = new PublicKey(participantAddress);
  const [participantRecord] = getQuestParticipantRecordPda(questState, participant);

  return m(program)
    .setQuestRewardAmount(new BN(amount))
    .accounts({
      signer: wallet.publicKey,
      questState,
      participant,
      participantRecord,
    })
    .rpc();
}

/**
 * Claims a quest reward for a participant.
 * Callable by either backend or backendB.
 */
export async function claimQuestReward(
  connection: Connection,
  backendWallet: any,
  questStateAddress: string,
  participantAddress: string
): Promise<string> {
  const program = getProgram(connection, backendWallet);
  const questState = new PublicKey(questStateAddress);
  const participant = new PublicKey(participantAddress);
  const [questTokenVault] = getQuestVaultPda(questState);
  const [participantRecord] = getQuestParticipantRecordPda(questState, participant);

  const state: any = await a(program).questState.fetch(questState);
  const participantTokenAccount = await getAssociatedTokenAddress(state.tokenMint, participant);

  return m(program)
    .claimQuestReward()
    .accounts({
      backend: backendWallet.publicKey,
      questState,
      participant,
      participantRecord,
      questTokenVault,
      participantTokenAccount,
      tokenProgram: TOKEN_PROGRAM_ID,
    })
    .rpc();
}

/**
 * Updates quest start time and claim window duration.
 * Callable by owner, backend, or backendB.
 */
export async function updateQuestTimings(
  connection: Connection,
  wallet: any,
  questStateAddress: string,
  newStartTime: number,
  claimWindowHours: number
): Promise<string> {
  const program = getProgram(connection, wallet);
  const questState = new PublicKey(questStateAddress);

  return m(program)
    .updateQuestTimings(new BN(newStartTime), new BN(claimWindowHours))
    .accounts({
      signer: wallet.publicKey,
      questState,
    })
    .rpc();
}

/**
 * Updates the quest name stored in state.
 * Callable by owner, backend, or backendB.
 */
export async function updateQuestName(
  connection: Connection,
  wallet: any,
  questStateAddress: string,
  newName: string
): Promise<string> {
  const program = getProgram(connection, wallet);
  const questState = new PublicKey(questStateAddress);

  return m(program)
    .updateQuestName(newName)
    .accounts({
      signer: wallet.publicKey,
      questState,
    })
    .rpc();
}

/**
 * Pauses or unpauses the quest.
 * Callable by owner, backend, or backendB.
 */
export async function setQuestPaused(
  connection: Connection,
  wallet: any,
  questStateAddress: string,
  paused: boolean
): Promise<string> {
  const program = getProgram(connection, wallet);
  const questState = new PublicKey(questStateAddress);

  return m(program)
    .setQuestPaused(paused)
    .accounts({
      signer: wallet.publicKey,
      questState,
    })
    .rpc();
}

/**
 * Withdraws unclaimed quest funds back to the owner.
 * Only callable AFTER end_time has passed. Can only be called once (funds_withdrawn flag).
 */
export async function withdrawQuest(
  connection: Connection,
  wallet: any,
  questStateAddress: string,
  amount: number
): Promise<string> {
  const program = getProgram(connection, wallet);
  const questState = new PublicKey(questStateAddress);
  const [questTokenVault] = getQuestVaultPda(questState);

  const state: any = await a(program).questState.fetch(questState);
  const ownerTokenAccount = await getAssociatedTokenAddress(state.tokenMint, wallet.publicKey);

  return m(program)
    .withdrawQuest(new BN(amount))
    .accounts({
      owner: wallet.publicKey,
      questState,
      ownerTokenAccount,
      questTokenVault,
      tokenProgram: TOKEN_PROGRAM_ID,
    })
    .rpc();
}

// =============================================================================
// 📖 READ / FETCH FUNCTIONS
// =============================================================================

// ── Faucet Reads ─────────────────────────────────────────────────────────────

/** Fetches full on-chain state for a faucet including vault token balance. */
export async function getFaucetState(
  connection: Connection,
  faucetStateAddress: string
): Promise<FaucetStateData & { vaultBalance: bigint }> {
  const program = readOnlyWallet(connection);
  const faucetState = new PublicKey(faucetStateAddress);
  const state: any = await a(program).faucetState.fetch(faucetState);
  const [vaultPda] = getFaucetVaultPda(faucetState);

  let vaultBalance = BigInt(0);
  try {
    const vault = await getAccount(connection, vaultPda);
    vaultBalance = vault.amount;
  } catch { /* vault may be empty */ }

  return {
    owner: state.owner.toString(),
    backendSigner: state.backendSigner.toString(),
    tokenMint: state.tokenMint.toString(),
    vaultAddress: state.vaultAddress.toString(),
    name: state.name,
    claimAmount: BigInt(state.claimAmount.toString()),
    startTime: Number(state.startTime),
    endTime: Number(state.endTime),
    faucetType: state.faucetType,
    paused: state.paused,
    deleted: state.deleted,
    bump: state.bump,
    vaultBalance,
  };
}

/** Returns whether a user has claimed from a faucet. Returns claimed:false if PDA doesn't exist yet. */
export async function getFaucetClaimStatus(
  connection: Connection,
  faucetStateAddress: string,
  participantAddress: string
): Promise<ClaimStatusData> {
  const program = readOnlyWallet(connection);
  const faucetState = new PublicKey(faucetStateAddress);
  const participant = new PublicKey(participantAddress);
  const [claimPda] = getFaucetClaimStatusPda(faucetState, participant);

  try {
    const status: any = await a(program).claimStatus.fetch(claimPda);
    return {
      claimed: status.claimed,
      claimer: status.claimer.toString(),
      amount: BigInt(status.amount.toString()),
      claimTime: Number(status.claimTime),
    };
  } catch (e: any) {
    if (e.message?.includes('Account does not exist') || e.message?.includes('could not find account')) {
      return { claimed: false, claimer: '', amount: BigInt(0), claimTime: 0 };
    }
    throw e;
  }
}

/** Returns whitelist entry for a user. Returns isWhitelisted:false if no entry exists. */
export async function getWhitelistEntry(
  connection: Connection,
  faucetStateAddress: string,
  userAddress: string
): Promise<WhitelistEntryData> {
  const program = readOnlyWallet(connection);
  const faucetState = new PublicKey(faucetStateAddress);
  const user = new PublicKey(userAddress);
  const [whitelistPda] = getWhitelistEntryPda(faucetState, user);

  try {
    const entry: any = await a(program).whitelistEntry.fetch(whitelistPda);
    return {
      isWhitelisted: entry.isWhitelisted,
      customAmount: BigInt(entry.customAmount.toString()),
    };
  } catch {
    return { isWhitelisted: false, customAmount: BigInt(0) };
  }
}

/** Returns true if the given pubkey is a registered faucet admin. */
export async function isFaucetAdmin(
  connection: Connection,
  faucetStateAddress: string,
  adminAddress: string
): Promise<boolean> {
  const program = readOnlyWallet(connection);
  const faucetState = new PublicKey(faucetStateAddress);
  const admin = new PublicKey(adminAddress);
  const [adminRecordPda] = getFaucetAdminRecordPda(faucetState, admin);

  try {
    const record: any = await a(program).faucetAdminRecord.fetch(adminRecordPda);
    return record.isAdmin === true;
  } catch {
    return false;
  }
}

// ── Quiz Reads ────────────────────────────────────────────────────────────────

/** Fetches full on-chain state for a quiz including vault token balance. */
export async function getQuizState(
  connection: Connection,
  quizStateAddress: string
): Promise<QuizStateData & { vaultBalance: bigint }> {
  const program = readOnlyWallet(connection);
  const quizState = new PublicKey(quizStateAddress);
  const state: any = await a(program).quizState.fetch(quizState);
  const [vaultPda] = getQuizVaultPda(quizState);

  let vaultBalance = BigInt(0);
  try {
    const vault = await getAccount(connection, vaultPda);
    vaultBalance = vault.amount;
  } catch { /* vault may be empty */ }

  return {
    owner: state.owner.toString(),
    backend: state.backend.toString(),
    vaultAddress: state.vaultAddress.toString(),
    tokenMint: state.tokenMint.toString(),
    name: state.name,
    claimWindowDuration: Number(state.claimWindowDuration),
    claimWindowEnd: Number(state.claimWindowEnd),
    totalParticipants: Number(state.totalParticipants),
    totalSubmissions: Number(state.totalSubmissions),
    isStarted: state.isStarted,
    paused: state.paused,
    deleted: state.deleted,
    bump: state.bump,
    vaultBalance,
  };
}

/** Fetches a player's record for a quiz. */
export async function getQuizPlayerRecord(
  connection: Connection,
  quizStateAddress: string,
  participantAddress: string
): Promise<QuizPlayerRecordData | null> {
  const program = readOnlyWallet(connection);
  const quizState = new PublicKey(quizStateAddress);
  const participant = new PublicKey(participantAddress);
  const [playerRecordPda] = getQuizPlayerRecordPda(quizState, participant);

  try {
    const record: any = await a(program).quizPlayerRecord.fetch(playerRecordPda);
    return {
      quiz: record.quiz.toString(),
      player: record.player.toString(),
      hasJoined: record.hasJoined,
      hasSubmitted: record.hasSubmitted,
      hasClaimed: record.hasClaimed,
      rewardAmount: BigInt(record.rewardAmount.toString()),
    };
  } catch {
    return null;
  }
}

/** Returns true if the given pubkey is a registered quiz admin. */
export async function isQuizAdmin(
  connection: Connection,
  quizStateAddress: string,
  adminAddress: string
): Promise<boolean> {
  const program = readOnlyWallet(connection);
  const quizState = new PublicKey(quizStateAddress);
  const admin = new PublicKey(adminAddress);
  const [adminRecordPda] = getQuizAdminRecordPda(quizState, admin);

  try {
    const record: any = await a(program).quizAdminRecord.fetch(adminRecordPda);
    return record.isAdmin === true;
  } catch {
    return false;
  }
}

// ── Quest Reads ───────────────────────────────────────────────────────────────

/** Fetches full on-chain state for a quest including vault token balance. */
export async function getQuestState(
  connection: Connection,
  questStateAddress: string
): Promise<QuestStateData & { vaultBalance: bigint }> {
  const program = readOnlyWallet(connection);
  const questState = new PublicKey(questStateAddress);
  const state: any = await a(program).questState.fetch(questState);
  const [vaultPda] = getQuestVaultPda(questState);

  let vaultBalance = BigInt(0);
  try {
    const vault = await getAccount(connection, vaultPda);
    vaultBalance = vault.amount;
  } catch { /* vault may be empty */ }

  return {
    owner: state.owner.toString(),
    backend: state.backend.toString(),
    backendB: state.backendB.toString(),
    tokenMint: state.tokenMint.toString(),
    name: state.name,
    startTime: Number(state.startTime),
    endTime: Number(state.endTime),
    totalParticipants: BigInt(state.totalParticipants.toString()),
    totalSubmissions: BigInt(state.totalSubmissions.toString()),
    totalCheckins: BigInt(state.totalCheckins.toString()),
    paused: state.paused,
    deleted: state.deleted,
    fundsWithdrawn: state.fundsWithdrawn,
    bump: state.bump,
    vaultBalance,
  };
}

/** Fetches a participant's record for a quest. */
export async function getQuestParticipantRecord(
  connection: Connection,
  questStateAddress: string,
  participantAddress: string
): Promise<QuestParticipantRecordData | null> {
  const program = readOnlyWallet(connection);
  const questState = new PublicKey(questStateAddress);
  const participant = new PublicKey(participantAddress);
  const [participantRecordPda] = getQuestParticipantRecordPda(questState, participant);

  try {
    const record: any = await a(program).questParticipantRecord.fetch(participantRecordPda);
    return {
      quest: record.quest.toString(),
      participant: record.participant.toString(),
      hasJoined: record.hasJoined,
      hasClaimed: record.hasClaimed,
      rewardAmount: BigInt(record.rewardAmount.toString()),
    };
  } catch {
    return null;
  }
}