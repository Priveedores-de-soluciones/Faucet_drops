import { getDataSuffix, submitReferral } from "@divvi/referral-sdk";

// Your Divvi Identifier from the integration guide
const DIVVI_CONSUMER_ADDRESS: `0x${string}` = "0xd59B83De618561c8FF4E98fC29a1b96ABcBFB18a";

// Providers are the addresses of the Rewards Campaigns you signed up for
const DIVVI_PROVIDERS: `0x${string}`[] = [
  '0x0423189886d7966f0dd7e7d256898daeee625dca',
  '0xc95876688026be9d6fa7a7c33328bd013effa2bb',
  '0x7beb0e14f8d2e6f6678cc30d867787b384b19e20',
  '0x5f0a55fad9424ac99429f635dfb9bf20c3360ab8'
];

/**
 * Appends Divvi referral data to transaction data
 * @param originalData - The original transaction data
 * @returns The transaction data with Divvi referral suffix
 */
export function appendDivviReferralData(originalData: string): string {
  const dataSuffix = getDataSuffix({
    consumer: DIVVI_CONSUMER_ADDRESS,
    providers: DIVVI_PROVIDERS,
  });

  return originalData + dataSuffix;
}

/**
 * Reports a successful transaction to Divvi
 * @param txHash - The transaction hash
 * @param chainId - The chain ID where the transaction was executed
 */
export async function reportTransactionToDivvi(txHash: `0x${string}`, chainId: number): Promise<void> {
  try {
    console.log(`Reporting transaction ${txHash} on chain ${chainId} to Divvi`);
    await submitReferral({
      txHash,
      chainId,
    });
    console.log("Successfully reported transaction to Divvi");
  } catch (error) {
    console.error("Failed to report transaction to Divvi:", error);
    // Don't throw the error to avoid breaking the main flow
  }
}

/**
 * Checks if the current network is Celo or Lisk
 * @param chainId - The chain ID to check
 * @returns True if the network is Celo or Lisk, false otherwise
 */
export function isSupportedNetwork(chainId: number): boolean {
  // Celo Mainnet: 42220, Celo Alfajores: 44787, Celo Baklava: 62320
  // Lisk Mainnet: 1135, Lisk Sepolia Testnet: 4202
  return [42220, 44787, 62320, 1135, 4202].includes(chainId);
}