import { type BrowserProvider, Contract, JsonRpcProvider, ZeroAddress, isAddress, getAddress } from "ethers"
import { FAUCET_ABI, ERC20_ABI, CHECKIN_ABI, FACTORY_ABI, STORAGE_ABI} from "./abis"
import { appendDivviReferralData, reportTransactionToDivvi } from "./divvi-integration"

// Fetch faucets for a specific network using getAllFaucets and getFaucetDetails
interface Network {
  chainId: bigint
  name: string
  rpcUrl: string
  blockExplorer: string
  factoryAddresses: string[] // Changed to array to handle multiple addresses
  color: string
  storageAddress?: string // Optional, defaults to FAUCET_STORAGE_ADDRESS
}

// Mapping of networkName to native token symbol
const NATIVE_TOKEN_MAP: Record<string, string> = {
  Celo: "CELO",
  Lisk: "LISK",
  Arbitrum: "ETH",
}
// Interfaces
interface FaucetDetails {
  faucetAddress: string;
  owner: string;
  name: string;
  claimAmount: bigint;
  tokenAddress: string;
  startTime: bigint;
  endTime: bigint;
  isClaimActive: boolean;
  balance: bigint;
  isEther: boolean;
  useBackend: boolean;
}

interface NameValidationResult {
  exists: boolean;
  existingFaucet?: { 
    address: string; 
    name: string; 
    owner: string 
  };
  warning?: string;
}
// Load backend address from .env
const BACKEND_ADDRESS = process.env.BACKEND_ADDRESS || "0x9fBC2A0de6e5C5Fd96e8D11541608f5F328C0785"

// Storage contract address
const STORAGE_CONTRACT_ADDRESS = "0x3fC5162779F545Bb4ea7980471b823577825dc8A"

// transactions contract address
const CHECKIN_CONTRACT_ADDRESS = "0x71C00c430ab70a622dc0b2888C4239cab9F244b0"

// Celo RPC URL
const CELO_RPC_URL = "https://forno.celo.org"

if (!isAddress(BACKEND_ADDRESS)) {
  throw new Error(`Invalid BACKEND_ADDRESS in .env: ${BACKEND_ADDRESS}`)
}

const VALID_BACKEND_ADDRESS = getAddress(BACKEND_ADDRESS)

const faucetDetailsCache: Map<string, any> = new Map()

// LocalStorage keys
const STORAGE_KEYS = {
  CHECKIN_DATA: "faucet_checkin_data",
  CHECKIN_LAST_BLOCK: "faucet_checkin_last_block",
  STORAGE_DATA: "faucet_storage_data",
  STORAGE_LAST_BLOCK: "faucet_storage_last_block",
  NEW_USERS_DATA: "faucet_new_users_data",
  CACHE_TIMESTAMP: "faucet_cache_timestamp",
}

// Cache duration (1 hour)
const CACHE_DURATION = 60 * 60 * 1000

// Helper to check network
function checkNetwork(chainId: bigint, networkId: bigint): boolean {
  console.log(`Checking network: chainId=${chainId}, networkId=${networkId}`)
  return chainId === networkId
}

// Check permissions and contract state
async function checkPermissions(
  provider: BrowserProvider,
  faucetAddress: string,
  callerAddress: string,
): Promise<{ isOwner: boolean; isAdmin: boolean; isPaused: boolean }> {
  try {
    const faucetContract = new Contract(faucetAddress, FAUCET_ABI, provider);
    const [owner, adminsResponse, isPaused] = await Promise.all([
      faucetContract.owner(),
      faucetContract.getAllAdmins(),
      faucetContract.paused(),
    ]);
    // Flatten the admins array
    const admins = Array.isArray(adminsResponse)
      ? adminsResponse.flat().filter((admin: string) => isAddress(admin))
      : [];
    const isAdmin = admins.some((admin: string) => admin.toLowerCase() === callerAddress.toLowerCase());
    console.log(
      `Permissions for ${callerAddress}: isOwner=${owner.toLowerCase() === callerAddress.toLowerCase()}, isAdmin=${isAdmin}, isPaused=${isPaused}`,
    );
    return {
      isOwner: owner.toLowerCase() === callerAddress.toLowerCase(),
      isAdmin,
      isPaused,
    };
  } catch (error: any) {
    console.error(`Error checking permissions for ${faucetAddress}:`, error);
    throw new Error("Failed to check permissions");
  }
}

export function getFromStorage(key: string): any {
  try {
    const item = localStorage.getItem(key)
    return item ? JSON.parse(item) : null
  } catch (error) {
    console.warn(`Error reading from localStorage key ${key}:`, error)
    return null
  }
}

export function saveToStorage(key: string, data: any): void {
  try {
    localStorage.setItem(key, JSON.stringify(data))
  } catch (error) {
    console.warn(`Error saving to localStorage key ${key}:`, error)
  }
}

function isCacheValid(): boolean {
  const timestamp = getFromStorage(STORAGE_KEYS.CACHE_TIMESTAMP)
  if (!timestamp) return false
  return Date.now() - timestamp < CACHE_DURATION
}

function updateCacheTimestamp(): void {
  saveToStorage(STORAGE_KEYS.CACHE_TIMESTAMP, Date.now())
}

// Helper to check if the network is Celo
export function isCeloNetwork(chainId: bigint): boolean {
  return chainId === BigInt(42220) // Celo Mainnet
}

// Fetch transactions data from Celo with incremental loading
export async function fetchCheckInData(): Promise<{
  transactionsByDate: { [date: string]: number }
  usersByDate: { [date: string]: Set<string> }
  allUsers: Set<string>
}> {
  try {
    const provider = new JsonRpcProvider(CELO_RPC_URL)
    const contract = new Contract(CHECKIN_CONTRACT_ADDRESS, CHECKIN_ABI, provider)

    // Check if we have cached data and if it's still valid
    const cachedData = getFromStorage(STORAGE_KEYS.CHECKIN_DATA)
    const lastBlock = getFromStorage(STORAGE_KEYS.CHECKIN_LAST_BLOCK) || 0

    let transactionsByDate: { [date: string]: number } = {}
    let usersByDate: { [date: string]: Set<string> } = {}
    let allUsers: Set<string> = new Set()

    // Load cached data if available
    if (cachedData && isCacheValid()) {
      transactionsByDate = cachedData.transactionsByDate || {}
      usersByDate = {}
      // Convert cached user data back to Sets
      Object.entries(cachedData.usersByDate || {}).forEach(([date, users]) => {
        usersByDate[date] = new Set(users as string[])
      })
      allUsers = new Set(cachedData.allUsers || [])
      console.log("Loaded cached transactions data")
    }

    // Get current block number
    const currentBlock = await provider.getBlockNumber()
    console.log(`Current block: ${currentBlock}, Last processed: ${lastBlock}`)

    // Only fetch new events if there are new blocks
    if (currentBlock > lastBlock) {
      const fromBlock = Math.max(lastBlock + 1, currentBlock - 10000) // Limit to last 10k blocks to avoid RPC issues

      console.log(`Fetching CheckedIn events from block ${fromBlock} to ${currentBlock}`)

      try {
        const filter = contract.filters.CheckedIn()
        const events = await contract.queryFilter(filter, fromBlock, currentBlock)

        console.log(`Found ${events.length} new transactions events`)

        // Process new events
        for (const event of events) {
          try {
            const block = await provider.getBlock(event.blockNumber)
            if (block && "args" in event && event.args) {
              const date = new Date(block.timestamp * 1000).toISOString().split("T")[0]
              const user = event.args.user.toLowerCase()

              // Update transactions by date
              transactionsByDate[date] = (transactionsByDate[date] || 0) + 1

              // Track users by date
              if (!usersByDate[date]) {
                usersByDate[date] = new Set()
              }
              usersByDate[date].add(user)
              allUsers.add(user)
            }
          } catch (blockError) {
            console.warn(`Error processing block ${event.blockNumber}:`, blockError)
          }
        }

        // Save updated data to localStorage
        const dataToCache = {
          transactionsByDate,
          usersByDate: Object.fromEntries(
            Object.entries(usersByDate).map(([date, users]) => [date, Array.from(users)]),
          ),
          allUsers: Array.from(allUsers),
        }

        saveToStorage(STORAGE_KEYS.CHECKIN_DATA, dataToCache)
        saveToStorage(STORAGE_KEYS.CHECKIN_LAST_BLOCK, currentBlock)
        updateCacheTimestamp()

        console.log("Updated transactions cache")
      } catch (queryError) {
        console.error("Error querying transactions events:", queryError)
        // If query fails, use cached data
      }
    }

    return { transactionsByDate, usersByDate, allUsers }
  } catch (error) {
    console.error("Error fetching transactions data:", error)

    // Return cached data if available
    const cachedData = getFromStorage(STORAGE_KEYS.CHECKIN_DATA)
    if (cachedData) {
      const usersByDate: { [date: string]: Set<string> } = {}
      Object.entries(cachedData.usersByDate || {}).forEach(([date, users]) => {
        usersByDate[date] = new Set(users as string[])
      })

      return {
        transactionsByDate: cachedData.transactionsByDate || {},
        usersByDate,
        allUsers: new Set(cachedData.allUsers || []),
      }
    }

    return { transactionsByDate: {}, usersByDate: {}, allUsers: new Set() }
  }
}

// Fetch storage contract data with incremental loading
export async function fetchStorageData(): Promise<
  {
    claimer: string
    faucet: string
    amount: bigint
    txHash: `0x${string}`
    networkName: string
    timestamp: number
    tokenSymbol: string
    tokenDecimals: number
    isEther: boolean
  }[]
> {
  try {
    const provider = new JsonRpcProvider(CELO_RPC_URL)

    // Check if storage contract exists
    const code = await provider.getCode(STORAGE_CONTRACT_ADDRESS)
    if (code === "0x") {
      console.log("Storage contract not deployed on Celo")
      return []
    }

    const contract = new Contract(STORAGE_CONTRACT_ADDRESS, STORAGE_ABI, provider)

    // Check cached data
    const cachedData = getFromStorage(STORAGE_KEYS.STORAGE_DATA)
    if (cachedData && isCacheValid()) {
      console.log("Using cached storage data")
      return cachedData.map((claim: any) => ({
        ...claim,
        amount: BigInt(claim.amount),
      }))
    }

    // Fetch all claims from storage contract
    console.log("Fetching all claims from storage contract...")
    const claims: any[] = await contract.getAllClaims()
    console.log(`Found ${claims.length} claims in storage contract`)

    // Process claims
    const formattedClaims = await Promise.all(
      claims.map(async (claim: any) => {
        let tokenSymbol = "CELO"
        let tokenDecimals = 18
        let isEther = true

        // Try to get faucet details for token info
        try {
          const faucetDetails = await getFaucetDetails(provider, claim.faucet)
          tokenSymbol = faucetDetails.tokenSymbol
          tokenDecimals = faucetDetails.tokenDecimals
          isEther = faucetDetails.isEther
        } catch (error) {
          console.warn(`Error fetching faucet details for ${claim.faucet}:`, error)
        }

        return {
          claimer: claim.claimer as string,
          faucet: claim.faucet as string,
          amount: claim.amount, // Keep as string for storage
          txHash: claim.txHash as `0x${string}`,
          networkName: claim.networkName as string,
          timestamp: Number(claim.timestamp),
          tokenSymbol,
          tokenDecimals,
          isEther,
        }
      }),
    )

    // Cache the data
    saveToStorage(STORAGE_KEYS.STORAGE_DATA, formattedClaims)
    updateCacheTimestamp()

    // Convert amounts back to BigInt for return
    return formattedClaims.map((claim) => ({
      ...claim,
      amount: BigInt(claim.amount),
    }))
  } catch (error) {
    console.error("Error fetching storage data:", error)

    // Return cached data if available
    const cachedData = getFromStorage(STORAGE_KEYS.STORAGE_DATA)
    if (cachedData) {
      return cachedData.map((claim: any) => ({
        ...claim,
        amount: BigInt(claim.amount),
      }))
    }

    return []
  }
}

export async function checkFaucetNameExists(
  provider: BrowserProvider,
  factoryAddress: string,
  proposedName: string
): Promise<NameValidationResult> {
  try {
    if (!proposedName.trim()) {
      throw new Error("Faucet name cannot be empty");
    }
    
    if (!isAddress(factoryAddress)) {
      throw new Error(`Invalid factory address: ${factoryAddress}`);
    }

    const factoryContract = new Contract(factoryAddress, FACTORY_ABI, provider);
    const normalizedProposedName = proposedName.trim().toLowerCase();

    console.log("Starting name validation for:", proposedName);

    // Method 1: Try getAllFaucetDetails first (preferred method)
    try {
      console.log("Attempting getAllFaucetDetails...");
      const allFaucetDetails: FaucetDetails[] = await factoryContract.getAllFaucetDetails();
      
      const existingFaucet = allFaucetDetails.find(faucet => 
        faucet.name.toLowerCase() === normalizedProposedName
      );
      
      if (existingFaucet) {
        return {
          exists: true,
          existingFaucet: {
            address: existingFaucet.faucetAddress,
            name: existingFaucet.name,
            owner: existingFaucet.owner
          }
        };
      }
      
      console.log("Name check completed successfully via getAllFaucetDetails");
      return { exists: false };
      
    } catch (getAllError) {
      console.warn("getAllFaucetDetails failed, trying fallback method:", getAllError.message);
      
      // Method 2: Fallback - Get all faucet addresses and check each individually
      try {
        console.log("Attempting getAllFaucets fallback...");
        const faucetAddresses: string[] = await factoryContract.getAllFaucets();
        
        console.log(`Found ${faucetAddresses.length} faucets to check`);
        
        // Check each faucet individually (with batching for performance)
        const batchSize = 5; // Smaller batch size to avoid overwhelming RPC
        
        for (let i = 0; i < faucetAddresses.length; i += batchSize) {
          const batch = faucetAddresses.slice(i, i + batchSize);
          
          // Process batch in parallel
          const batchPromises = batch.map(async (faucetAddress) => {
            try {
              const faucetDetails = await factoryContract.getFaucetDetails(faucetAddress);
              return {
                address: faucetAddress,
                name: faucetDetails.name,
                owner: faucetDetails.owner
              };
            } catch (error: any) {
              console.warn(`Failed to get details for faucet ${faucetAddress}:`, error.message);
              return null;
            }
          });
          
          const batchResults = await Promise.allSettled(batchPromises);
          
          // Check this batch for name conflicts
          for (const result of batchResults) {
            if (result.status === 'fulfilled' && result.value) {
              const faucet = result.value;
              if (faucet.name.toLowerCase() === normalizedProposedName) {
                return {
                  exists: true,
                  existingFaucet: faucet
                };
              }
            }
          }
          
          // Add delay between batches to be nice to the RPC
          if (i + batchSize < faucetAddresses.length) {
            await new Promise(resolve => setTimeout(resolve, 200));
          }
        }
        
        console.log("Name check completed successfully via fallback method");
        return { exists: false };
        
      } catch (fallbackError) {
        console.warn("Fallback method also failed:", fallbackError.message);
        
        // Method 3: Last resort - try to get total count and sample some faucets
        try {
          console.log("Attempting limited sampling method...");
          const totalFaucets = await factoryContract.getTotalFaucets();
          console.log(`Total faucets in factory: ${totalFaucets}`);
          
          // If there are too many faucets, we'll warn the user and allow the name
          if (totalFaucets > 50) {
            console.warn(`Too many faucets (${totalFaucets}) to check efficiently. Skipping validation.`);
            return { 
              exists: false,
              warning: `Unable to verify name uniqueness (${totalFaucets} existing faucets). Please ensure your name is unique.`
            };
          }
          
          // For smaller numbers, try the fallback method again with smaller batches
          const faucetAddresses: string[] = await factoryContract.getAllFaucets();
          const maxCheck = Math.min(20, faucetAddresses.length);
          
          for (let i = 0; i < maxCheck; i++) {
            try {
              const faucetDetails = await factoryContract.getFaucetDetails(faucetAddresses[i]);
              if (faucetDetails.name.toLowerCase() === normalizedProposedName) {
                return {
                  exists: true,
                  existingFaucet: {
                    address: faucetAddresses[i],
                    name: faucetDetails.name,
                    owner: faucetDetails.owner
                  }
                };
              }
            } catch (detailError) {
              console.warn(`Failed to get details for sampled faucet ${faucetAddresses[i]}`);
              continue;
            }
          }
          
          console.log("Name check completed via sampling method");
          return { 
            exists: false,
            warning: maxCheck < faucetAddresses.length ? 
              `Partial validation completed (checked ${maxCheck}/${faucetAddresses.length} faucets)` : 
              undefined
          };
          
        } catch (samplingError) {
          console.error("All validation methods failed:", samplingError.message);
          return { 
            exists: false, 
            warning: "Unable to validate name due to network issues. Please ensure your name is unique."
          };
        }
      }
    }
    
  } catch (error: any) {
    console.error("Error in checkFaucetNameExists:", error);
    // Don't throw, return graceful degradation
    return { 
      exists: false, 
      warning: "Name validation unavailable due to network issues. Please ensure your name is unique."
    };
  }
}
// Create a faucet with backend toggle support
export async function createFaucet(
  provider: BrowserProvider,
  factoryAddress: string,
  name: string,
  tokenAddress: string,
  chainId: bigint,
  networkId: bigint,
  useBackend: boolean,
): Promise<string> {
  try {
    if (!name.trim()) {
      throw new Error("Faucet name cannot be empty");
    }
    if (!isAddress(tokenAddress)) {
      throw new Error(`Invalid token address: ${tokenAddress}`);
    }
    if (!isAddress(factoryAddress)) {
      throw new Error(`Invalid factory address: ${factoryAddress}`);
    }

    // Enhanced name validation with better error handling
    console.log("Validating faucet name before creation...");
    try {
      const nameCheck = await checkFaucetNameExists(provider, factoryAddress, name);
      
      if (nameCheck.exists && nameCheck.existingFaucet) {
        throw new Error(
          `A faucet with the name "${nameCheck.existingFaucet.name}" already exists on this network. ` +
          `Existing faucet address: ${nameCheck.existingFaucet.address}. ` +
          `Please choose a different name.`
        );
      }
      
      if (nameCheck.warning) {
        console.warn("Name validation warning:", nameCheck.warning);
        // Continue with creation but log the warning
      }
      
      console.log("Name validation passed");
    } catch (validationError: any) {
      if (validationError.message.includes("already exists")) {
        // Re-throw name conflict errors
        throw validationError;
      } else {
        // Log validation errors but don't block creation
        console.warn("Name validation failed, proceeding with creation:", validationError.message);
      }
    }

    const signer = await provider.getSigner();
    const signerAddress = await signer.getAddress();
    const factoryContract = new Contract(factoryAddress, FACTORY_ABI, signer);

    const backendAddress = VALID_BACKEND_ADDRESS;

    const data = factoryContract.interface.encodeFunctionData("createFaucet", [
      name,
      tokenAddress,
      backendAddress,
      useBackend,
    ]);
    const dataWithReferral = appendDivviReferralData(data);

    const gasEstimate = await provider.estimateGas({
      to: factoryAddress,
      data: dataWithReferral,
      from: signerAddress,
    });
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice || BigInt(0);
    const maxFeePerGas = feeData.maxFeePerGas || undefined;
    const maxPriorityFeePerGas = feeData.maxPriorityFeePerGas || undefined;
    const gasCost = gasEstimate * gasPrice;

    console.log("Create faucet params:", {
      factoryAddress,
      name,
      tokenAddress,
      backendAddress,
      useBackend,
      chainId: chainId.toString(),
      networkId: networkId.toString(),
      signerAddress,
      gasEstimate: gasEstimate.toString(),
      gasPrice: gasPrice.toString(),
      gasCost: gasCost.toString(),
    });

    const tx = await signer.sendTransaction({
      to: factoryAddress,
      data: dataWithReferral,
      gasLimit: (gasEstimate * BigInt(12)) / BigInt(10),
      maxFeePerGas,
      maxPriorityFeePerGas,
    });

    console.log("Transaction hash:", tx.hash);
    const receipt = await tx.wait();
    if (!receipt) {
      throw new Error("Transaction receipt is null");
    }
    console.log("Transaction confirmed:", receipt.hash);
    await reportTransactionToDivvi(tx.hash as `0x${string}`, Number(chainId));

    const event = receipt?.logs
      ?.map((log) => {
        try {
          return factoryContract.interface.parseLog({ data: log.data, topics: log.topics as string[] });
        } catch {
          return null;
        }
      })
      .find((parsed) => parsed?.name === "FaucetCreated");

    if (!event || !event.args || !event.args.faucet) {
      throw new Error("Failed to retrieve faucet address from transaction");
    }

    console.log("New faucet created:", {
      faucetAddress: event.args.faucet,
      backendAddress,
      useBackend,
    });

    return event.args.faucet as string;
  } catch (error: any) {
    console.error("Error creating faucet:", error);
    if (error.message?.includes("network changed")) {
      throw new Error("Network changed during transaction. Please try again with a stable network connection.");
    }
    if (error.data && typeof error.data === "string") {
      throw new Error(decodeRevertError(error.data));
    }
    throw new Error(error.reason || error.message || "Failed to create faucet");
  }
}

/**
 * Utility function to safely make contract calls with fallbacks
 */
export async function safeContractCall<T>(
  contract: Contract,
  methodName: string,
  args: any[] = [],
  fallbackValue: T
): Promise<T> {
  try {
    const result = await contract[methodName](...args);
    return result;
  } catch (error: any) {
    console.warn(`Contract call ${methodName} failed:`, error.message);
    return fallbackValue;
  }
}

/**
 * Check if a contract method exists
 */
export async function checkContractMethod(
  contract: Contract,
  methodName: string
): Promise<boolean> {
  try {
    const fragment = contract.interface.getFunction(methodName);
    return fragment !== null;
  } catch {
    return false;
  }
}

export async function getAllAdmins(
  provider: BrowserProvider | JsonRpcProvider,
  faucetAddress: string,
): Promise<string[]> {
  try {
    if (!isAddress(faucetAddress)) {
      throw new Error("Invalid faucet address");
    }

    const faucetContract = new Contract(faucetAddress, FAUCET_ABI, provider);
    const adminsResponse = await faucetContract.getAllAdmins();
    const admins = Array.isArray(adminsResponse)
      ? adminsResponse.flat().filter((admin: string) => isAddress(admin))
      : [];
    console.log(`Fetched admins for faucet ${faucetAddress}:`, admins);
    return admins;
  }  catch (error: any) {
    console.error(`Error fetching admins for ${faucetAddress}:`, error);
    throw new Error(error.message || "Failed to fetch admins");
  }
}

export async function isAdmin(
  provider: BrowserProvider | JsonRpcProvider,
  faucetAddress: string,
  userAddress: string,
): Promise<boolean> {
  try {
    if (!isAddress(faucetAddress) || !isAddress(userAddress)) {
      throw new Error("Invalid faucet or user address");
    }

    const admins = await getAllAdmins(provider, faucetAddress);
    const isAdminStatus = admins.some((admin: string) => admin.toLowerCase() === userAddress.toLowerCase());
    console.log(`Admin check for ${userAddress} on faucet ${faucetAddress}: ${isAdminStatus}`);
    return isAdminStatus;
  } catch (error: any) {
    console.error(`Error checking admin status for ${userAddress} on ${faucetAddress}:`, error);
    return false;
  }
}

// Check if an address is whitelisted for a faucet
export async function isWhitelisted(
  provider: BrowserProvider | JsonRpcProvider,
  faucetAddress: string,
  userAddress: string,
): Promise<boolean> {
  try {
    if (!isAddress(faucetAddress) || !isAddress(userAddress)) {
      throw new Error("Invalid faucet or user address")
    }

    const faucetContract = new Contract(faucetAddress, FAUCET_ABI, provider)
    const isWhitelisted = await faucetContract.isWhitelisted(userAddress)
    console.log(`Whitelist check for ${userAddress} on faucet ${faucetAddress}: ${isWhitelisted}`)
    return isWhitelisted
  } catch (error: any) {
    console.error(`Error checking whitelist for ${userAddress} on ${faucetAddress}:`, error)
    return false
  }
}

// Get faucet backend mode from contract
export async function getFaucetBackendMode(
  provider: BrowserProvider | JsonRpcProvider,
  faucetAddress: string,
): Promise<boolean> {
  try {
    if (!isAddress(faucetAddress)) {
      throw new Error("Invalid faucet address");
    }

    const faucetContract = new Contract(faucetAddress, FAUCET_ABI, provider);
    const useBackend = await faucetContract.getUseBackend();
    console.log(`Backend mode for faucet ${faucetAddress}: ${useBackend}`);
    return useBackend;
  } catch (error: any) {
    console.error(`Error fetching backend mode for ${faucetAddress}:`, error);
    return false; // Default to false if contract call fails
  }
}

// Get faucet details with admin check and backend mode from contract
export async function getFaucetDetails(provider: BrowserProvider | JsonRpcProvider, faucetAddress: string) {
  try {
    console.log(`Getting details for faucet ${faucetAddress}`);
    let contract: Contract;
    if ("getSigner" in provider && typeof provider.getSigner === "function") {
      try {
        contract = new Contract(faucetAddress, FAUCET_ABI, await provider.getSigner());
      } catch (error) {
        console.warn(`Error getting signer, falling back to provider for ${faucetAddress}:`, error);
        contract = new Contract(faucetAddress, FAUCET_ABI, provider);
      }
    } else {
      contract = new Contract(faucetAddress, FAUCET_ABI, provider);
    }

    let tokenAddress = ZeroAddress;
    let ownerAddress = ZeroAddress;
    let faucetName = "Unknown Faucet";
    let claimAmount = BigInt(0);
    let startTime = BigInt(0);
    let endTime = BigInt(0);
    let isClaimActive = false;
    let balance = BigInt(0);
    let isEther = true;
    let tokenSymbol = "CELO";
    let tokenDecimals = 18;
    let useBackend = false;

    try {
      tokenAddress = await contract.token();
    } catch (error) {
      console.warn(`Error getting token address:`, error);
    }
    try {
      ownerAddress = await contract.owner();
    } catch (error) {
      console.warn(`Error getting owner address:`, error);
    }
    try {
      faucetName = await contract.name();
    } catch (error) {
      console.warn(`Error getting name:`, error);
    }
    try {
      claimAmount = await contract.claimAmount();
    } catch (error) {
      console.warn(`Error getting claim amount:`, error);
    }
    try {
      startTime = await contract.startTime();
    } catch (error) {
      console.warn(`Error getting start time:`, error);
    }
    try {
      endTime = await contract.endTime();
    } catch (error) {
      console.warn(`Error getting end time:`, error);
    }
    try {
      isClaimActive = await contract.isClaimActive();
    } catch (error) {
      console.warn(`Error getting claim active status:`, error);
    }
    try {
      useBackend = await contract.getUseBackend();
    } catch (error) {
      console.warn(`Error getting backend mode:`, error);
    }
    try {
      const balanceResult = await contract.getFaucetBalance();
      balance = balanceResult[0];
      isEther = balanceResult[1];
      const network = await provider.getNetwork();
      tokenSymbol = isEther
        ? isCeloNetwork(network.chainId)
          ? "CELO"
          : network.chainId === BigInt(1135)
            ? "LISK"
            : "ETH"
        : tokenSymbol;
    } catch (error) {
      console.warn(`Error getting balance:`, error);
      if (tokenAddress !== ZeroAddress) {
        try {
          const tokenContract = new Contract(tokenAddress, ERC20_ABI, provider);
          balance = await tokenContract.balanceOf(faucetAddress);
          isEther = false;
        } catch (innerError) {
          console.warn(`Error getting token balance:`, innerError);
        }
      } else {
        try {
          balance = await provider.getBalance(faucetAddress);
          isEther = true;
        } catch (innerError) {
          console.warn(`Error getting native balance:`, innerError);
        }
      }
    }

    if (!isEther && tokenAddress !== ZeroAddress) {
      try {
        const tokenContract = new Contract(tokenAddress, ERC20_ABI, provider);
        tokenSymbol = await tokenContract.symbol();
      } catch (error) {
        console.warn(`Error getting token symbol:`, error);
      }
      try {
        const tokenContract = new Contract(tokenAddress, ERC20_ABI, provider);
        tokenDecimals = await tokenContract.decimals();
      } catch (error) {
        console.warn(`Error getting token decimals:`, error);
      }
    }

    let hasClaimed = false;
    let isUserAdmin = false;
    if ("getSigner" in provider && typeof provider.getSigner === "function") {
      try {
        const signer = await provider.getSigner();
        const userAddress = await signer.getAddress();
        hasClaimed = await contract.hasClaimed(userAddress);
        isUserAdmin = await isAdmin(provider, faucetAddress, userAddress);
      } catch (error) {
        console.warn(`Error checking claim status or admin status:`, error);
      }
    }

    console.log(`Successfully got details for faucet ${faucetAddress}`);
    return {
      faucetAddress,
      token: tokenAddress,
      owner: ownerAddress,
      name: faucetName,
      claimAmount,
      startTime,
      endTime,
      isClaimActive,
      balance,
      isEther,
      tokenSymbol,
      tokenDecimals,
      hasClaimed,
      isUserAdmin,
      backendMode: useBackend,
    };
  } catch (error) {
    console.error(`Error getting faucet details for ${faucetAddress}:`, error);
    return {
      faucetAddress,
      token: ZeroAddress,
      owner: ZeroAddress,
      name: "Error Loading Faucet",
      claimAmount: BigInt(0),
      startTime: BigInt(0),
      endTime: BigInt(0),
      isClaimActive: false,
      balance: BigInt(0),
      isEther: true,
      tokenSymbol: "CELO",
      tokenDecimals: 18,
      hasClaimed: false,
      isUserAdmin: false,
      backendMode: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// Store claim in storage contract
export async function storeClaim(
  provider: BrowserProvider,
  claimer: string,
  faucetAddress: string,
  amount: bigint,
  txHash: string,
  chainId: bigint,
  networkId: bigint,
  networkName: string,
): Promise<string> {
  if (!checkNetwork(chainId, networkId)) {
    throw new Error("Switch to the network to perform operation")
  }

  try {
    const signer = await provider.getSigner()
    const signerAddress = await signer.getAddress()
    const storageContract = new Contract(STORAGE_CONTRACT_ADDRESS, STORAGE_ABI, signer)

    // Convert txHash to bytes32 (ensure it's a valid 32-byte hash)
    const formattedTxHash = txHash.startsWith("0x") ? txHash : `0x${txHash}`
    if (!/^0x[a-fA-F0-9]{64}$/.test(formattedTxHash)) {
      throw new Error(`Invalid transaction hash format: ${formattedTxHash}`)
    }

    if (!networkName) {
      throw new Error("Network name cannot be empty")
    }

    const data = storageContract.interface.encodeFunctionData("storeClaim", [
      claimer,
      faucetAddress,
      amount,
      formattedTxHash,
      networkName,
    ])
    const dataWithReferral = appendDivviReferralData(data)

    // Estimate gas
    const gasEstimate = await provider.estimateGas({
      to: STORAGE_CONTRACT_ADDRESS,
      data: dataWithReferral,
      from: signerAddress,
    })
    const feeData = await provider.getFeeData()
    const maxFeePerGas = feeData.maxFeePerGas || undefined
    const maxPriorityFeePerGas = feeData.maxPriorityFeePerGas || undefined

    console.log("Store claim params:", {
      claimer,
      faucetAddress,
      amount: amount.toString(),
      txHash: formattedTxHash,
      networkName,
      chainId: chainId.toString(),
      networkId: networkId.toString(),
      signerAddress,
      gasEstimate: gasEstimate.toString(),
      maxFeePerGas: maxFeePerGas?.toString(),
      maxPriorityFeePerGas: maxPriorityFeePerGas?.toString(),
    })

    const tx = await signer.sendTransaction({
      to: STORAGE_CONTRACT_ADDRESS,
      data: dataWithReferral,
      gasLimit: (gasEstimate * BigInt(12)) / BigInt(10), // 20% buffer
      maxFeePerGas,
      maxPriorityFeePerGas,
    })

    console.log("Store claim transaction hash:", tx.hash)
    const receipt = await tx.wait()
    if (!receipt) {
      throw new Error("Store claim transaction receipt is null")
    }
    console.log("Store claim transaction confirmed:", receipt.hash)
    await reportTransactionToDivvi(tx.hash as `0x${string}`, Number(chainId))

    return tx.hash
  } catch (error: any) {
    console.error("Error storing claim:", error)
    if (error.message?.includes("network changed")) {
      throw new Error("Network changed during transaction. Please try again with a stable network connection.")
    }
    throw new Error(error.reason || error.message || "Failed to store claim")
  }
}

export async function getFaucetsForNetwork(network: Network): Promise<any[]> {
  try {
    const provider = new JsonRpcProvider(network.rpcUrl)
    let allFaucets: any[] = []

    // Fetch faucets from all factory addresses
    for (const factoryAddress of network.factoryAddresses) {
      if (!isAddress(factoryAddress)) {
        console.warn(`Invalid factory address ${factoryAddress} on ${network.name}, skipping`);
        continue;
      }

      const factoryContract = new Contract(factoryAddress, FACTORY_ABI, provider)

      // Check if factory contract exists
      const code = await provider.getCode(factoryAddress)
      if (code === "0x") {
        console.warn(`No contract at factory address ${factoryAddress} on ${network.name}`)
        continue
      }

      // Fetch all faucet addresses for this factory
      let faucetAddresses: string[] = []
      try {
        faucetAddresses = await factoryContract.getAllFaucets()
      } catch (error) {
        console.error(`Error calling getAllFaucets for ${factoryAddress} on ${network.name}:`, error)
        continue
      }

      // Process each faucet address to get full details
      const results = await Promise.all(
        faucetAddresses.map(async (faucetAddress: string) => {
          if (!faucetAddress || faucetAddress === ZeroAddress) return null
          try {
            const faucetContract = new Contract(faucetAddress, FAUCET_ABI, provider)
            const isDeleted = await faucetContract.deleted()
            if (isDeleted) {
              console.log(`Faucet ${faucetAddress} is deleted, skipping`)
              return null
            }

            const details = await getFaucetDetails(provider, faucetAddress)
            return {
              ...details,
              network: {
                chainId: network.chainId,
                name: network.name,
                color: network.color,
                blockExplorer: network.blockExplorer,
              },
              factoryAddress, // Include factory address for reference
            }
          } catch (error) {
            console.warn(`Error getting details for faucet ${faucetAddress} on ${network.name}:`, error)
            return null
          }
        }),
      )

      allFaucets.push(...results.filter((result) => result !== null))
    }

    return allFaucets
  } catch (error) {
    console.error(`Error fetching faucets for ${network.name}:`, error)
    return []
  }
}

// Fetch transaction history for a specific faucet (admin only)
export async function getFaucetTransactionHistory(
  provider: BrowserProvider,
  faucetAddress: string,
  network: Network,
): Promise<{
  faucetAddress: string
  transactionType: string
  initiator: string
  amount: bigint
  isEther: boolean
  timestamp: number
}[]> {
  try {
    if (!isAddress(faucetAddress)) {
      throw new Error(`Invalid faucet address: ${faucetAddress}`)
    }

    const signer = await provider.getSigner()
    const signerAddress = await signer.getAddress()
    const permissions = await checkPermissions(provider, faucetAddress, signerAddress)

    if (!permissions.isOwner && !permissions.isAdmin) {
      throw new Error("Only the owner or admin can view transaction history")
    }

    let transactions: any[] = [];

    // Iterate through all factory addresses to collect transactions
    for (const factoryAddress of network.factoryAddresses) {
      if (!isAddress(factoryAddress)) {
        console.warn(`Invalid factory address ${factoryAddress} on ${network.name}, skipping`);
        continue;
      }

      const factoryContract = new Contract(factoryAddress, FACTORY_ABI, provider);

      // Check if factory contract exists
      const code = await provider.getCode(factoryAddress);
      if (code === "0x") {
        console.warn(`No contract at factory address ${factoryAddress} on ${network.name}`);
        continue;
      }

      // Use getFaucetTransactions from the new ABI
      try {
        const factoryTxs = await factoryContract.getFaucetTransactions(faucetAddress);
        transactions.push(...factoryTxs);
      } catch (error) {
        console.warn(`Error fetching transactions from factory ${factoryAddress}:`, error);
      }
    }

    // Map and filter transactions
    const filteredTransactions = transactions
      .filter((tx: any) => tx.faucetAddress.toLowerCase() === faucetAddress.toLowerCase())
      .map((tx: any) => ({
        faucetAddress: tx.faucetAddress as string,
        transactionType: tx.transactionType as string,
        initiator: tx.initiator as string,
        amount: BigInt(tx.amount),
        isEther: tx.isEther as boolean,
        timestamp: Number(tx.timestamp),
      }));

    console.log(`Fetched ${filteredTransactions.length} transactions for faucet ${faucetAddress}`)
    return filteredTransactions
  } catch (error: any) {
    console.error(`Error fetching transaction history for faucet ${faucetAddress}:`, error)
    throw new Error(error.message || "Failed to fetch transaction history")
  }
}

async function contractExists(provider: JsonRpcProvider, address: string): Promise<boolean> {
  try {
    const code = await provider.getCode(address)
    return code !== "0x"
  } catch (error) {
    console.warn(`Error checking contract at ${address}:`, error)
    return false
  }
}

export async function getAllClaims(
  chainId: bigint,
  networks: Network[],
): Promise<
  {
    claimer: string
    faucet: string
    amount: bigint
    txHash: `0x${string}`
    networkName: string
    timestamp: number
    tokenSymbol: string
    tokenDecimals: number
    isEther: boolean
  }[]
> {
  try {
    const network = networks.find((n) => n.chainId === chainId)
    if (!network) {
      throw new Error(`Network with chainId ${chainId} not found`)
    }

    const provider = new JsonRpcProvider(network.rpcUrl)
    const storageAddress = STORAGE_CONTRACT_ADDRESS
    const contract = new Contract(storageAddress, STORAGE_ABI, provider)

    // Verify contract exists
    const exists = await contractExists(provider, storageAddress)
    if (!exists) {
      console.error(`No contract at ${storageAddress} on ${network.name}`)
      return []
    }

    // Call getAllClaims function
    const claims: any[] = await contract.getAllClaims()

    // Fetch token details for each claim
    const formattedClaims = await Promise.all(
      claims.map(async (claim: any) => {
        let tokenSymbol = NATIVE_TOKEN_MAP[network.name] || "TOK"
        let tokenDecimals = 18
        let isEther = true

        // Check cache for faucet details
        const cacheKey = `${network.chainId}-${claim.faucet}`
        let faucetDetails = faucetDetailsCache.get(cacheKey)

        if (!faucetDetails) {
          try {
            faucetDetails = await getFaucetDetails(provider, claim.faucet)
            faucetDetailsCache.set(cacheKey, faucetDetails)
          } catch (error) {
            console.warn(`Error fetching faucet details for ${claim.faucet} on ${network.name}:`, error)
            faucetDetails = {
              tokenSymbol: NATIVE_TOKEN_MAP[network.name] || "TOK",
              tokenDecimals: 18,
              isEther: true,
            }
          }
        }

        tokenSymbol = faucetDetails.tokenSymbol
        tokenDecimals = faucetDetails.tokenDecimals
        isEther = faucetDetails.isEther

        return {
          claimer: claim.claimer as string,
          faucet: claim.faucet as string,
          amount: BigInt(claim.amount),
          txHash: claim.txHash as `0x${string}`,
          networkName: claim.networkName as string,
          timestamp: Number(claim.timestamp),
          tokenSymbol,
          tokenDecimals,
          isEther,
        }
      }),
    )

    return formattedClaims
  } catch (error) {
    console.error(`Error fetching claims for chainId ${chainId}:`, error)
    if (error instanceof Error) {
      throw new Error(`Failed to fetch claims: ${error.message}`)
    }
    throw new Error("Failed to fetch claims: Unknown error")
  }
}

export async function getAllClaimsFromFactoryTransactions(
  networks: Network[]
): Promise<
  {
    claimer: string
    faucet: string
    amount: bigint
    txHash: `0x${string}`
    networkName: string
    timestamp: number
    chainId: bigint
    tokenSymbol: string
    tokenDecimals: number
    isEther: boolean
  }[]
> {
  try {
    const allClaims: any[] = []

    for (const network of networks) {
      try {
        const provider = new JsonRpcProvider(network.rpcUrl)
        
        // Iterate through all factory addresses for this network
        for (const factoryAddress of network.factoryAddresses) {
          if (!isAddress(factoryAddress)) {
            console.warn(`Invalid factory address ${factoryAddress} on ${network.name}, skipping`)
            continue
          }

          // Check if factory contract exists
          const code = await provider.getCode(factoryAddress)
          if (code === "0x") {
            console.warn(`No contract at factory address ${factoryAddress} on ${network.name}`)
            continue
          }

          const factoryContract = new Contract(factoryAddress, FACTORY_ABI, provider)

          try {
            // Get all transactions from this factory
            const allTransactions = await factoryContract.getAllTransaction()
            console.log(`Found ${allTransactions.length} transactions from factory ${factoryAddress} on ${network.name}`)

            // Filter for claim transactions (assuming transaction type includes "claim" or similar)
            const claimTransactions = allTransactions.filter((tx: any) => 
              tx.transactionType && 
              (tx.transactionType.toLowerCase().includes('claim') || 
               tx.transactionType.toLowerCase().includes('drop'))
            )

            console.log(`Found ${claimTransactions.length} claim transactions from factory ${factoryAddress}`)

            // Process each claim transaction
            for (const tx of claimTransactions) {
              try {
                // Get faucet details to fetch token information
                let tokenSymbol = NATIVE_TOKEN_MAP[network.name] || "TOK"
                let tokenDecimals = 18
                let isEther = true

                // Check cache for faucet details
                const cacheKey = `${network.chainId}-${tx.faucetAddress}`
                let faucetDetails = faucetDetailsCache.get(cacheKey)

                if (!faucetDetails) {
                  try {
                    faucetDetails = await getFaucetDetails(provider, tx.faucetAddress)
                    faucetDetailsCache.set(cacheKey, faucetDetails)
                  } catch (error) {
                    console.warn(`Error fetching faucet details for ${tx.faucetAddress} on ${network.name}:`, error)
                    faucetDetails = {
                      tokenSymbol: NATIVE_TOKEN_MAP[network.name] || "TOK",
                      tokenDecimals: 18,
                      isEther: true,
                    }
                  }
                }

                tokenSymbol = faucetDetails.tokenSymbol
                tokenDecimals = faucetDetails.tokenDecimals
                isEther = faucetDetails.isEther

                // Create claim object from transaction data
                const claim = {
                  claimer: tx.initiator as string, // Assuming initiator is the claimer for claim transactions
                  faucet: tx.faucetAddress as string,
                  amount: BigInt(tx.amount),
                  txHash: tx.txHash as `0x${string}`, // Assuming txHash exists in transaction data
                  networkName: network.name,
                  timestamp: Number(tx.timestamp),
                  chainId: network.chainId,
                  tokenSymbol,
                  tokenDecimals,
                  isEther,
                }

                allClaims.push(claim)
              } catch (processingError) {
                console.warn(`Error processing claim transaction:`, processingError)
              }
            }
          } catch (factoryError) {
            console.error(`Error fetching transactions from factory ${factoryAddress} on ${network.name}:`, factoryError)
          }
        }
      } catch (networkError) {
        console.error(`Error processing network ${network.name}:`, networkError)
      }
    }

    return allClaims
  } catch (error) {
    console.error("Error fetching claims from factory transactions:", error)
    return []
  }
}

// Modified function to combine storage data with factory transaction data
export async function getAllClaimsForAllNetworks(networks: Network[]): Promise<
  {
    claimer: string
    faucet: string
    amount: bigint
    txHash: `0x${string}`
    networkName: string
    timestamp: number
    chainId: bigint
    tokenSymbol: string
    tokenDecimals: number
    isEther: boolean
  }[]
> {
  try {
    console.log("Fetching claims from both storage and factory transactions...")
    
    // Fetch claims from storage contract (historical data)
    const storageClaims = await fetchStorageData()
    console.log(`Found ${storageClaims.length} claims from storage contract`)

    // Add chainId to storage claims (assuming they're all from Celo for now)
    const storageClaimsWithChainId = storageClaims.map(claim => ({
      ...claim,
      chainId: BigInt(42220), // Celo chainId - adjust if storage is on different network
    }))

    // Fetch claims from factory transactions (new method)
    const factoryClaims = await getAllClaimsFromFactoryTransactions(networks)
    console.log(`Found ${factoryClaims.length} claims from factory transactions`)

    // Combine both sources and remove duplicates based on txHash
    const allClaims = [...storageClaimsWithChainId, ...factoryClaims]
    
    // Remove duplicates based on txHash
    const uniqueClaims = allClaims.reduce((acc, current) => {
      const existing = acc.find(item => item.txHash === current.txHash)
      if (!existing) {
        acc.push(current)
      }
      return acc
    }, [] as typeof allClaims)

    // Sort by timestamp (most recent first)
    const sortedClaims = uniqueClaims.sort((a, b) => b.timestamp - a.timestamp)
    
    console.log(`Total unique claims: ${sortedClaims.length} (${storageClaims.length} from storage + ${factoryClaims.length} from factory - duplicates)`)
    
    return sortedClaims
  } catch (error) {
    console.error("Error fetching claims for all networks:", error)
    if (error instanceof Error) {
      throw new Error(`Failed to fetch claims for all networks: ${error.message}`)
    }
    throw new Error("Failed to fetch claims for all networks: Unknown error")
  }
}

// Optional: Add a function to get only new claims from factories (excluding storage)
export async function getNewClaimsFromFactories(networks: Network[]): Promise<
  {
    claimer: string
    faucet: string
    amount: bigint
    txHash: `0x${string}`
    networkName: string
    timestamp: number
    chainId: bigint
    tokenSymbol: string
    tokenDecimals: number
    isEther: boolean
  }[]
> {
  try {
    const factoryClaims = await getAllClaimsFromFactoryTransactions(networks)
    const sortedClaims = factoryClaims.sort((a, b) => b.timestamp - a.timestamp)
    
    console.log(`Found ${sortedClaims.length} new claims from factory transactions`)
    return sortedClaims
  } catch (error) {
    console.error("Error fetching new claims from factories:", error)
    return []
  }
}

// Helper function to migrate storage claims to factory format if needed
export async function migrateStorageClaimsToFactory(): Promise<void> {
  try {
    console.log("Starting migration of storage claims...")
    
    // This would be implemented if you want to migrate old storage claims
    // to be tracked through factory transactions as well
    // Implementation depends on your specific migration strategy
    
    console.log("Migration completed")
  } catch (error) {
    console.error("Error during migration:", error)
  }
}

// Fund faucet
export async function fundFaucet(
  provider: BrowserProvider,
  faucetAddress: string,
  amount: bigint,
  isEther: boolean,
  chainId: bigint,
  networkId: bigint,
): Promise<string> {
  if (!checkNetwork(chainId, networkId)) {
    throw new Error("Switch to the network to perform operation")
  }

  try {
    const signer = await provider.getSigner()
    const signerAddress = await signer.getAddress()
    const balance = await provider.getBalance(signerAddress)
    const faucetContract = new Contract(faucetAddress, FAUCET_ABI, signer)
    const contractBalance = await provider.getBalance(faucetAddress)
    const backendAddress = await faucetContract.BACKEND?.()
    const backendFeePercent = await faucetContract.BACKEND_FEE_PERCENT?.()
    const vaultFeePercent = await faucetContract.VAULT_FEE_PERCENT?.()
    console.log("Funding params:", {
      faucetAddress,
      amount: amount.toString(),
      isEther,
      chainId: chainId.toString(),
      networkId: networkId.toString(),
      signerAddress,
      signerBalance: balance.toString(),
      contractBalance: contractBalance.toString(),
      backendAddress,
      backendFeePercent: backendFeePercent?.toString(),
      vaultFeePercent: vaultFeePercent?.toString(),
    })

    const isCelo = isCeloNetwork(chainId)

    if (isEther && !isCelo) {
      console.log(`Funding faucet ${faucetAddress} with ${amount} native tokens on chain ${chainId}`)
      // Estimate gas for fund transaction
      const gasEstimate = await provider.estimateGas({
        to: faucetAddress,
        value: amount,
        data: "0x",
      })
      const feeData = await provider.getFeeData()
      const gasPrice = feeData.gasPrice || BigInt(0)
      const gasCost = gasEstimate * gasPrice
      console.log("Gas estimate:", {
        gasEstimate: gasEstimate.toString(),
        gasPrice: gasPrice.toString(),
        gasCost: gasCost.toString(),
      })

      const tx = await signer.sendTransaction({
        to: faucetAddress,
        value: amount,
        data: "0x",
        gasLimit: (gasEstimate * BigInt(12)) / BigInt(10), // 20% buffer
        maxFeePerGas: feeData.maxFeePerGas || undefined,
        maxPriorityFeePerGas: feeData.maxPriorityFeePerGas || undefined,
      })
      console.log("Transaction hash:", tx.hash)
      const receipt = await tx.wait()
      if (!receipt) {
        throw new Error("Fund transaction receipt is null")
      }
      console.log("Transaction confirmed:", receipt.hash)
      await reportTransactionToDivvi(tx.hash as `0x${string}`, Number(chainId))
      return tx.hash
    }

    const tokenAddress =
      isEther && isCelo
        ? "0x471EcE3750Da237f93B8E339c536989b8978a438" // Wrapped CELO
        : await faucetContract.token()

    if (tokenAddress === ZeroAddress) {
      throw new Error("Token address is zero, cannot proceed with ERC-20 transfer")
    }

    const tokenContract = new Contract(tokenAddress, ERC20_ABI, signer)
    console.log(`Approving ${amount} ${isEther && isCelo ? "CELO" : "tokens"} for faucet ${faucetAddress}`)

    const approveData = tokenContract.interface.encodeFunctionData("approve", [faucetAddress, amount])
    const approveDataWithReferral = appendDivviReferralData(approveData)
    const approveGasEstimate = await provider.estimateGas({
      to: tokenAddress,
      data: approveDataWithReferral,
      from: signerAddress,
    })
    const feeData = await provider.getFeeData()
    const approveTx = await signer.sendTransaction({
      to: tokenAddress,
      data: approveDataWithReferral,
      gasLimit: (approveGasEstimate * BigInt(12)) / BigInt(10),
      maxFeePerGas: feeData.maxFeePerGas || undefined,
      maxPriorityFeePerGas: feeData.maxPriorityFeePerGas || undefined,
    })
    const approveReceipt = await approveTx.wait()
    if (!approveReceipt) {
      throw new Error("Approve transaction receipt is null")
    }
    console.log("Approve transaction confirmed:", approveReceipt.hash)
    await reportTransactionToDivvi(approveTx.hash as `0x${string}`, Number(chainId))

    console.log(`Funding faucet ${faucetAddress} with ${amount} ${isEther && isCelo ? "CELO" : "tokens"}`)
    const fundData = faucetContract.interface.encodeFunctionData("fund", [amount])
    const fundDataWithReferral = appendDivviReferralData(fundData)
    const fundGasEstimate = await provider.estimateGas({
      to: faucetAddress,
      data: fundDataWithReferral,
      from: signerAddress,
    })
    const fundTx = await signer.sendTransaction({
      to: faucetAddress,
      data: fundDataWithReferral,
      gasLimit: (fundGasEstimate * BigInt(12)) / BigInt(10),
      maxFeePerGas: feeData.maxFeePerGas || undefined,
      maxPriorityFeePerGas: feeData.maxPriorityFeePerGas || undefined,
    })
    console.log("Fund transaction hash:", fundTx.hash)
    const fundReceipt = await fundTx.wait()
    if (!fundReceipt) {
      throw new Error("Fund transaction receipt is null")
    }
    console.log("Fund transaction confirmed:", fundReceipt.hash)
    await reportTransactionToDivvi(fundTx.hash as `0x${string}`, Number(chainId))
    return fundTx.hash
  } catch (error: any) {
    console.error("Error funding faucet:", error)
    if (error.message?.includes("network changed")) {
      throw new Error("Network changed during transaction. Please try again with a stable network connection.")
    }
    throw new Error(error.reason || error.message || "Failed to fund faucet")
  }
}

// Withdraw tokens
export async function withdrawTokens(
  provider: BrowserProvider,
  faucetAddress: string,
  amount: bigint,
  chainId: bigint,
  networkId: bigint,
): Promise<string> {
  if (!checkNetwork(chainId, networkId)) {
    throw new Error("Switch to the network to perform operation")
  }

  try {
    const signer = await provider.getSigner()
    const signerAddress = await signer.getAddress()
    const faucetContract = new Contract(faucetAddress, FAUCET_ABI, signer)

    const data = faucetContract.interface.encodeFunctionData("withdraw", [amount])
    const dataWithReferral = appendDivviReferralData(data)

    // Estimate gas
    const gasEstimate = await provider.estimateGas({
      to: faucetAddress,
      data: dataWithReferral,
      from: signerAddress,
    })
    const feeData = await provider.getFeeData()
    const maxFeePerGas = feeData.maxFeePerGas || undefined
    const maxPriorityFeePerGas = feeData.maxPriorityFeePerGas || undefined

    console.log("Withdraw tokens params:", {
      faucetAddress,
      amount: amount.toString(),
      chainId: chainId.toString(),
      networkId: networkId.toString(),
      signerAddress,
      gasEstimate: gasEstimate.toString(),
      maxFeePerGas: maxFeePerGas?.toString(),
      maxPriorityFeePerGas: maxPriorityFeePerGas?.toString(),
    })

    const tx = await signer.sendTransaction({
      to: faucetAddress,
      data: dataWithReferral,
      gasLimit: (gasEstimate * BigInt(12)) / BigInt(10), // 20% buffer
      maxFeePerGas,
      maxPriorityFeePerGas,
    })

    console.log("Withdraw transaction hash:", tx.hash)
    const receipt = await tx.wait()
    if (!receipt) {
      throw new Error("Withdraw transaction receipt is null")
    }
    console.log("Withdraw transaction confirmed:", receipt.hash)
    await reportTransactionToDivvi(tx.hash as `0x${string}`, Number(chainId))

    return tx.hash
  } catch (error: any) {
    console.error("Error withdrawing tokens:", error)
    if (error.message?.includes("network changed")) {
      throw new Error("Network changed during transaction. Please try again with a stable network connection.")
    }
    throw new Error(error.reason || error.message || "Failed to withdraw tokens")
  }
}

// Set whitelist batch
export async function setWhitelistBatch(
  provider: BrowserProvider,
  faucetAddress: string,
  addresses: string[],
  status: boolean,
  chainId: bigint,
  networkId: bigint,
): Promise<string> {
  if (!checkNetwork(chainId, networkId)) {
    throw new Error("Switch to the network to perform operation")
  }

  try {
    const signer = await provider.getSigner()
    const signerAddress = await signer.getAddress()
    const faucetContract = new Contract(faucetAddress, FAUCET_ABI, signer)

    const data = faucetContract.interface.encodeFunctionData("setWhitelistBatch", [addresses, status])
    const dataWithReferral = appendDivviReferralData(data)

    // Estimate gas
    const gasEstimate = await provider.estimateGas({
      to: faucetAddress,
      data: dataWithReferral,
      from: signerAddress,
    })
    const feeData = await provider.getFeeData()
    const maxFeePerGas = feeData.maxFeePerGas || undefined
    const maxPriorityFeePerGas = feeData.maxPriorityFeePerGas || undefined

    console.log("Set whitelist batch params:", {
      faucetAddress,
      addresses,
      status,
      chainId: chainId.toString(),
      networkId: networkId.toString(),
      signerAddress,
      gasEstimate: gasEstimate.toString(),
      maxFeePerGas: maxFeePerGas?.toString(),
      maxPriorityFeePerGas: maxPriorityFeePerGas?.toString(),
    })

    const tx = await signer.sendTransaction({
      to: faucetAddress,
      data: dataWithReferral,
      gasLimit: (gasEstimate * BigInt(12)) / BigInt(10), // 20% buffer
      maxFeePerGas,
      maxPriorityFeePerGas,
    })

    console.log("Set whitelist batch transaction hash:", tx.hash)
    const receipt = await tx.wait()
    if (!receipt) {
      throw new Error("Set whitelist batch transaction receipt is null")
    }
    console.log("Set whitelist batch transaction confirmed:", receipt.hash)
    await reportTransactionToDivvi(tx.hash as `0x${string}`, Number(chainId))

    return tx.hash
  } catch (error: any) {
    console.error("Error setting whitelist batch:", error)
    if (error.message?.includes("network changed")) {
      throw new Error("Network changed during transaction. Please try again with a stable network connection.")
    }
    throw new Error(error.reason || error.message || "Failed to set whitelist batch")
  }
}

// Set custom claim amounts for multiple users (batch operation)
export async function setCustomClaimAmountsBatch(
  provider: BrowserProvider,
  faucetAddress: string,
  users: string[],
  amounts: bigint[],
  chainId: bigint,
  networkId: bigint,
): Promise<string> {
  if (!checkNetwork(chainId, networkId)) {
    throw new Error("Switch to the network to perform operation")
  }

  try {
    const signer = await provider.getSigner()
    const signerAddress = await signer.getAddress()
    const faucetContract = new Contract(faucetAddress, FAUCET_ABI, signer)

    const data = faucetContract.interface.encodeFunctionData("setCustomClaimAmountsBatch", [users, amounts])
    const dataWithReferral = appendDivviReferralData(data)

    // Estimate gas
    const gasEstimate = await provider.estimateGas({
      to: faucetAddress,
      data: dataWithReferral,
      from: signerAddress,
    })
    const feeData = await provider.getFeeData()
    const maxFeePerGas = feeData.maxFeePerGas || undefined
    const maxPriorityFeePerGas = feeData.maxPriorityFeePerGas || undefined

    console.log("Set custom claim amounts batch params:", {
      faucetAddress,
      users,
      amounts: amounts.map((a) => a.toString()),
      chainId: chainId.toString(),
      networkId: networkId.toString(),
      signerAddress,
      gasEstimate: gasEstimate.toString(),
      maxFeePerGas: maxFeePerGas?.toString(),
      maxPriorityFeePerGas: maxPriorityFeePerGas?.toString(),
    })

    const tx = await signer.sendTransaction({
      to: faucetAddress,
      data: dataWithReferral,
      gasLimit: (gasEstimate * BigInt(12)) / BigInt(10), // 20% buffer
      maxFeePerGas,
      maxPriorityFeePerGas,
    })

    console.log("Set custom claim amounts batch transaction hash:", tx.hash)
    const receipt = await tx.wait()
    if (!receipt) {
      throw new Error("Set custom claim amounts batch transaction receipt is null")
    }
    console.log("Set custom claim amounts batch transaction confirmed:", receipt.hash)
    await reportTransactionToDivvi(tx.hash as `0x${string}`, Number(chainId))

    return tx.hash
  } catch (error: any) {
    console.error("Error setting custom claim amounts batch:", error)
    if (error.message?.includes("network changed")) {
      throw new Error("Network changed during transaction. Please try again with a stable network connection.")
    }
    throw new Error(error.reason || error.message || "Failed to set custom claim amounts batch")
  }
}

// Reset all claims for a faucet
export async function resetAllClaims(
  provider: BrowserProvider,
  faucetAddress: string,
  chainId: bigint,
  networkId: bigint,
): Promise<string> {
  if (!checkNetwork(chainId, networkId)) {
    throw new Error("Switch to the network to perform operation");
  }

  try {
    const signer = await provider.getSigner();
    const signerAddress = await signer.getAddress();
    const faucetContract = new Contract(faucetAddress, FAUCET_ABI, signer);

    // Use the correct function name: resetAllClaimed
    const data = faucetContract.interface.encodeFunctionData("resetAllClaimed", []);
    const dataWithReferral = appendDivviReferralData(data, signerAddress as `0x${string}`);

    // Estimate gas
    const gasEstimate = await provider.estimateGas({
      to: faucetAddress,
      data: dataWithReferral,
      from: signerAddress,
    });

    // Get fee data and detect EIP-1559 support
    const feeData = await provider.getFeeData();
    const supportsEIP1559 = feeData.maxFeePerGas !== null && feeData.maxPriorityFeePerGas !== null;

    console.log("Reset all claims params:", {
      faucetAddress,
      chainId: chainId.toString(),
      networkId: networkId.toString(),
      signerAddress,
      gasEstimate: gasEstimate.toString(),
      supportsEIP1559,
      maxFeePerGas: feeData.maxFeePerGas?.toString(),
      maxPriorityFeePerGas: feeData.maxPriorityFeePerGas?.toString(),
      gasPrice: feeData.gasPrice?.toString(),
    });

    let tx;
    if (supportsEIP1559) {
      // Use EIP-1559 transaction
      tx = await signer.sendTransaction({
        to: faucetAddress,
        data: dataWithReferral,
        gasLimit: (gasEstimate * BigInt(12)) / BigInt(10), // 20% buffer
        maxFeePerGas: feeData.maxFeePerGas!,
        maxPriorityFeePerGas: feeData.maxPriorityFeePerGas!,
      });
    } else {
      // Use legacy transaction
      tx = await signer.sendTransaction({
        to: faucetAddress,
        data: dataWithReferral,
        gasLimit: (gasEstimate * BigInt(12)) / BigInt(10), // 20% buffer
        gasPrice: feeData.gasPrice || undefined,
      });
    }

    console.log("Reset all claims transaction hash:", tx.hash);
    const receipt = await tx.wait();
    if (!receipt) {
      throw new Error("Reset all claims transaction receipt is null");
    }
    console.log("Reset all claims transaction confirmed:", receipt.hash);
    await reportTransactionToDivvi(tx.hash as `0x${string}`, Number(chainId));

    return tx.hash;
  } catch (error: any) {
    console.error("Error resetting all claims:", error);
    if (error.message?.includes("network changed")) {
      throw new Error("Network changed during transaction. Please try again with a stable network connection.");
    }
    throw new Error(error.reason || error.message || "Failed to reset all claims");
  }
}

// Reset claimed status for specific addresses
export async function resetClaimedStatus(
  provider: BrowserProvider,
  faucetAddress: string,
  addresses: string[],
  status: boolean,
  chainId: bigint,
  networkId: bigint,
): Promise<string> {
  if (!checkNetwork(chainId, networkId)) {
    throw new Error("Switch to the network to perform operation")
  }

  try {
    const signer = await provider.getSigner()
    const signerAddress = await signer.getAddress()
    const faucetContract = new Contract(faucetAddress, FAUCET_ABI, signer)

    const data = faucetContract.interface.encodeFunctionData("resetClaimedBatch", [addresses])
    const dataWithReferral = appendDivviReferralData(data)

    // Estimate gas
    const gasEstimate = await provider.estimateGas({
      to: faucetAddress,
      data: dataWithReferral,
      from: signerAddress,
    })
    const feeData = await provider.getFeeData()
    const maxFeePerGas = feeData.maxFeePerGas || undefined
    const maxPriorityFeePerGas = feeData.maxPriorityFeePerGas || undefined

    console.log("Reset claimed status params:", {
      faucetAddress,
      addresses,
      status,
      chainId: chainId.toString(),
      networkId: networkId.toString(),
      signerAddress,
      gasEstimate: gasEstimate.toString(),
      maxFeePerGas: maxFeePerGas?.toString(),
      maxPriorityFeePerGas: maxPriorityFeePerGas?.toString(),
    })

    const tx = await signer.sendTransaction({
      to: faucetAddress,
      data: dataWithReferral,
      gasLimit: (gasEstimate * BigInt(12)) / BigInt(10), // 20% buffer
      maxFeePerGas,
      maxPriorityFeePerGas,
    })

    console.log("Reset claimed status transaction hash:", tx.hash)
    const receipt = await tx.wait()
    if (!receipt) {
      throw new Error("Reset claimed status transaction receipt is null")
    }
    console.log("Reset claimed status transaction confirmed:", receipt.hash)
    await reportTransactionToDivvi(tx.hash as `0x${string}`, Number(chainId))

    return tx.hash
  } catch (error: any) {
    console.error("Error resetting claimed status:", error)
    if (error.message?.includes("network changed")) {
      throw new Error("Network changed during transaction. Please try again with a stable network connection.")
    }
    throw new Error(error.reason || error.message || "Failed to reset claimed status")
  }
}

export async function retrieveSecretCode(faucetAddress: string): Promise<string> {
  if (!isAddress(faucetAddress)) {
    throw new Error(`Invalid faucet address: ${faucetAddress}`)
  }

  try {
    // Check localStorage first
    const cachedCode = getFromStorage(`secretCode_${faucetAddress}`)
    if (cachedCode && /^[A-Z0-9]{6}$/.test(cachedCode)) {
      console.log(`Retrieved Drop code for ${faucetAddress} from localStorage`)
      return cachedCode
    }

    // Fallback to backend if not found in localStorage
    const response = await fetch("https://fauctdrop-backend.onrender.com/retrieve-secret-code", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        faucetAddress: getAddress(faucetAddress), // Normalize address
      }),
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.detail || "Failed to retrieve Drop code")
    }

    const result = await response.json()
    const secretCode = result.secretCode

    if (!secretCode || !/^[A-Z0-9]{6}$/.test(secretCode)) {
      throw new Error("Invalid Drop code format received from backend")
    }

    // Store the retrieved Drop code in localStorage for future use
    saveToStorage(`secretCode_${faucetAddress}`, secretCode)

    console.log(`Retrieved and stored Drop code for ${faucetAddress} from backend`)
    return secretCode
  } catch (error: any) {
    console.error("Error retrieving Drop code:", error)
    throw new Error(error.message || "Failed to retrieve Drop code")
  }
}

const ERROR_SIGNATURES = {
  OwnableUnauthorizedAccount: "0x118cdaa7", // keccak256("OwnableUnauthorizedAccount(address)")
  ContractPaused: "0xbec6425c", // keccak256("ContractPaused()")
  OnlyAdmin: "0x9b23d3d9", // keccak256("OnlyAdmin()")
  EmptyName: "0xe8930e56", // keccak256("EmptyName()")
  UnknownError: "0xab35696f", // Placeholder for new error
  NotWhitelisted: "0x55f33f14", // keccak256("NotWhitelisted()")
}

// Helper to decode revert data
function decodeRevertError(data: string): string {
  if (data.startsWith(ERROR_SIGNATURES.OwnableUnauthorizedAccount)) {
    return "Only the faucet owner can perform this action"
  } else if (data.startsWith(ERROR_SIGNATURES.ContractPaused)) {
    return "Faucet is paused and cannot be modified"
  } else if (data.startsWith(ERROR_SIGNATURES.OnlyAdmin)) {
    return "Only an admin can perform this action"
  } else if (data.startsWith(ERROR_SIGNATURES.EmptyName)) {
    return "Faucet name cannot be empty"
  } else if (data.startsWith(ERROR_SIGNATURES.NotWhitelisted)) {
    return "Only whitelisted addresses are supported"
  } else if (data.startsWith(ERROR_SIGNATURES.UnknownError)) {
    return "Permission denied or invalid state (verify contract ABI and state)"
  }
  return "Unknown contract error occurred"
}

// Update faucet name with admin check
export async function updateFaucetName(
  provider: BrowserProvider,
  faucet: string,
  name: string,
  chainId: bigint,
  networkId: bigint,
): Promise<`0x${string}`> {
  try {
    if (!checkNetwork(chainId, networkId)) {
      throw new Error("Switch to the correct network to perform this operation");
    }

    if (!name.trim()) {
      throw new Error("Faucet name cannot be empty");
    }

    const signer = await provider.getSigner();
    const signerAddress = await signer.getAddress();
    const permissions = await checkPermissions(provider, faucet, signerAddress);
    if (permissions.isPaused) {
      throw new Error("Faucet is paused and cannot be modified");
    }
    if (!permissions.isOwner && !permissions.isAdmin) {
      throw new Error("Only the owner or admin can update the faucet name");
    }

    const faucetContract = new Contract(faucet, FAUCET_ABI, signer);
    const gasEstimate = await faucetContract.updateName.estimateGas(name);
    const feeData = await provider.getFeeData();

    const tx = await faucetContract.updateName(name, {
      gasLimit: (gasEstimate * BigInt(12)) / BigInt(10),
      maxFeePerGas: feeData.maxFeePerGas,
      maxPriorityFeePerGas: feeData.maxPriorityFeePerGas,
    });

    console.log(`Update faucet name transaction sent: ${tx.hash}`);
    const receipt = await tx.wait();
    if (!receipt) {
      throw new Error("Transaction receipt is null");
    }

    await reportTransactionToDivvi(tx.hash as `0x${string}`, Number(chainId));
    return tx.hash as `0x${string}`;
  } catch (error: any) {
    console.error("Error updating faucet name:", error);
    if (error.data && typeof error.data === "string") {
      throw new Error(decodeRevertError(error.data));
    }
    throw new Error(error.reason || error.message || "Failed to update faucet name");
  }
}

// Delete faucet with admin check
export async function deleteFaucet(
  provider: BrowserProvider,
  faucetAddress: string,
  chainId: bigint,
  networkId: bigint,
): Promise<`0x${string}`> {
  try {
    if (!checkNetwork(chainId, networkId)) {
      throw new Error("Switch to the correct network to perform this operation");
    }

    const signer = await provider.getSigner();
    const signerAddress = await signer.getAddress();
    const permissions = await checkPermissions(provider, faucetAddress, signerAddress);
    if (permissions.isPaused) {
      throw new Error("Faucet is paused and cannot be deleted");
    }
    if (!permissions.isOwner && !permissions.isAdmin) {
      throw new Error("Only the owner or admin can delete the faucet");
    }

    const faucetContract = new Contract(faucetAddress, FAUCET_ABI, signer);
    const gasEstimate = await faucetContract.deleteFaucet.estimateGas();
    const feeData = await provider.getFeeData();

    const tx = await faucetContract.deleteFaucet({
      gasLimit: (gasEstimate * BigInt(12)) / BigInt(10),
      maxFeePerGas: feeData.maxFeePerGas,
      maxPriorityFeePerGas: feeData.maxPriorityFeePerGas,
    });

    console.log(`Delete faucet transaction sent: ${tx.hash}`);
    const receipt = await tx.wait();
    if (!receipt) {
      throw new Error("Transaction receipt is null");
    }

    await reportTransactionToDivvi(tx.hash as `0x${string}`, Number(chainId));
    faucetDetailsCache.delete(faucetAddress);
    return tx.hash as `0x${string}`;
  } catch (error: any) {
    console.error("Error deleting faucet:", error);
    if (error.data && typeof error.data === "string") {
      throw new Error(decodeRevertError(error.data));
    }
    throw new Error(error.reason || error.message || "Failed to delete faucet");
  }
}

// Add admin with permission check
export async function addAdmin(
  provider: BrowserProvider,
  faucetAddress: string,
  adminAddress: string,
  chainId: bigint,
  networkId: bigint,
): Promise<`0x${string}`> {
  try {
    if (!checkNetwork(chainId, networkId)) {
      throw new Error("Switch to the correct network to perform this operation");
    }

    if (!isAddress(adminAddress)) {
      throw new Error("Invalid admin address");
    }

    const signer = await provider.getSigner();
    const signerAddress = await signer.getAddress();
    const permissions = await checkPermissions(provider, faucetAddress, signerAddress);
    if (permissions.isPaused) {
      throw new Error("Faucet is paused and cannot be modified");
    }
    if (!permissions.isOwner && !permissions.isAdmin) {
      throw new Error("Only the owner or admin can add an admin");
    }

    const faucetContract = new Contract(faucetAddress, FAUCET_ABI, signer);
    const data = faucetContract.interface.encodeFunctionData("addAdmin", [adminAddress]);
    const dataWithReferral = appendDivviReferralData(data);

    const gasEstimate = await provider.estimateGas({
      to: faucetAddress,
      data: dataWithReferral,
      from: signerAddress,
    });
    const feeData = await provider.getFeeData();
    const maxFeePerGas = feeData.maxFeePerGas || undefined;
    const maxPriorityFeePerGas = feeData.maxPriorityFeePerGas || undefined;

    const tx = await signer.sendTransaction({
      to: faucetAddress,
      data: dataWithReferral,
      gasLimit: (gasEstimate * BigInt(12)) / BigInt(10),
      maxFeePerGas,
      maxPriorityFeePerGas,
    });

    console.log(`Add admin transaction sent: ${tx.hash}`);
    const receipt = await tx.wait();
    if (!receipt) {
      throw new Error("Transaction receipt is null");
    }

    await reportTransactionToDivvi(tx.hash as `0x${string}`, Number(chainId));
    return tx.hash as `0x${string}`;
  } catch (error: any) {
    console.error("Error adding admin:", error);
    if (error.data && typeof error.data === "string") {
      throw new Error(decodeRevertError(error.data));
    }
    throw new Error(error.reason || error.message || "Failed to add admin");
  }
}

// Remove admin with permission check
export async function removeAdmin(
  provider: BrowserProvider,
  faucetAddress: string,
  adminAddress: string,
  chainId: bigint,
  networkId: bigint,
): Promise<`0x${string}`> {
  try {
    if (!checkNetwork(chainId, networkId)) {
      throw new Error("Switch to the correct network to perform this operation");
    }

    if (!isAddress(adminAddress)) {
      throw new Error("Invalid admin address");
    }

    const signer = await provider.getSigner();
    const signerAddress = await signer.getAddress();
    const permissions = await checkPermissions(provider, faucetAddress, signerAddress);
    if (permissions.isPaused) {
      throw new Error("Faucet is paused and cannot be modified");
    }
    if (!permissions.isOwner && !permissions.isAdmin) {
      throw new Error("Only the owner or admin can remove an admin");
    }

    const faucetContract = new Contract(faucetAddress, FAUCET_ABI, signer);
    const data = faucetContract.interface.encodeFunctionData("removeAdmin", [adminAddress]);
    const dataWithReferral = appendDivviReferralData(data, signerAddress);

    const gasEstimate = await provider.estimateGas({
      to: faucetAddress,
      data: dataWithReferral,
      from: signerAddress,
    });
    const feeData = await provider.getFeeData();
    const maxFeePerGas = feeData.maxFeePerGas || undefined;
    const maxPriorityFeePerGas = feeData.maxPriorityFeePerGas || undefined;

    const tx = await signer.sendTransaction({
      to: faucetAddress,
      data: dataWithReferral,
      gasLimit: (gasEstimate * BigInt(12)) / BigInt(10),
      maxFeePerGas,
      maxPriorityFeePerGas,
    });

    console.log(`Remove admin transaction sent: ${tx.hash}`);
    const receipt = await tx.wait();
    if (!receipt) {
      throw new Error("Transaction receipt is null");
    }

    await reportTransactionToDivvi(tx.hash as `0x${string}`, Number(chainId));
    return tx.hash as `0x${string}`;
  } catch (error: any) {
    console.error("Error removing admin:", error);
    if (error.data && typeof error.data === "string") {
      throw new Error(decodeRevertError(error.data));
    }
    throw new Error(error.reason || error.message || "Failed to remove admin");
  }
}

// Set claim parameters with admin check
export async function setClaimParameters(
  provider: BrowserProvider,
  faucetAddress: string,
  claimAmount: bigint,
  startTime: number,
  endTime: number,
  chainId: bigint,
  networkId: bigint,
): Promise<string> {
  if (!checkNetwork(chainId, networkId)) {
    throw new Error("Switch to the network to perform operation");
  }

  try {
    const signer = await provider.getSigner();
    const signerAddress = await signer.getAddress();
    const permissions = await checkPermissions(provider, faucetAddress, signerAddress);
    if (permissions.isPaused) {
      throw new Error("Faucet is paused and cannot be modified");
    }
    if (!permissions.isOwner && !permissions.isAdmin) {
      throw new Error("Only the owner or admin can set claim parameters");
    }

    const faucetContract = new Contract(faucetAddress, FAUCET_ABI, signer);

    const data = faucetContract.interface.encodeFunctionData("setClaimParameters", [claimAmount, startTime, endTime]);
    const dataWithReferral = appendDivviReferralData(data);

    const gasEstimate = await provider.estimateGas({
      to: faucetAddress,
      data: dataWithReferral,
      from: signerAddress,
    });
    const feeData = await provider.getFeeData();
    const maxFeePerGas = feeData.maxFeePerGas || undefined;
    const maxPriorityFeePerGas = feeData.maxPriorityFeePerGas || undefined;

    console.log("Set claim parameters params:", {
      faucetAddress,
      claimAmount: claimAmount.toString(),
      startTime,
      endTime,
      chainId: chainId.toString(),
      networkId: networkId.toString(),
      signerAddress,
      gasEstimate: gasEstimate.toString(),
      maxFeePerGas: maxFeePerGas?.toString(),
      maxPriorityFeePerGas: maxPriorityFeePerGas?.toString(),
    });

    const tx = await signer.sendTransaction({
      to: faucetAddress,
      data: dataWithReferral,
      gasLimit: (gasEstimate * BigInt(12)) / BigInt(10),
      maxFeePerGas,
      maxPriorityFeePerGas,
    });

    console.log("Set claim parameters transaction hash:", tx.hash);
    const receipt = await tx.wait();
    if (!receipt) {
      throw new Error("Set claim parameters transaction receipt is null");
    }
    console.log("Set claim parameters transaction confirmed:", receipt.hash);
    await reportTransactionToDivvi(tx.hash as `0x${string}`, Number(chainId));

    return tx.hash;
  } catch (error: any) {
    console.error("Error setting claim parameters:", error);
    if (error.message?.includes("network changed")) {
      throw new Error("Network changed during transaction. Please try again with a stable network connection.");
    }
    throw new Error(error.reason || error.message || "Failed to set claim parameters");
  }
}