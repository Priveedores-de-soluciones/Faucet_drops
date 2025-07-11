import { BrowserProvider } from 'ethers';
import { appendDivviReferralData, reportTransactionToDivvi } from './divvi-integration';

const API_URL = "https://fauctdrop-backend.onrender.com"; // Update with your actual backend URL
const ENABLE_DIVVI_REFERRAL = true;
const DEBUG_MODE = process.env.NODE_ENV === 'development';

interface ClaimPayload {
  userAddress: string;
  faucetAddress: string;
  shouldWhitelist: boolean;
  chainId: number;
  secretCode?: string;
  divviReferralData?: string;
}

interface DivviIntegrationResult {
  isApplicable: boolean;
  isWorking: boolean;
  data?: string;
  error?: string;
  debugInfo?: any;
}

interface RequestLogData {
  userAddress: string;
  faucetAddress: string;
  chainId: number;
  hasDivviData: boolean;
  divviDataLength: number;
  timestamp: string;
  payload?: string;
  divviDebugInfo?: any;
}

interface DebugInfo {
  chainId: number;
  isCeloNetwork: boolean;
  enabled: boolean;
  timestamp: string;
  reason?: string;
  rawData?: {
    value: string;
    type: string;
    length: number;
    isEmpty: boolean;
  };
  validation?: {
    isValid: boolean;
    fixed: string;
    error?: string;
  };
  processedData?: string;
  errorType?: string;
  errorMessage?: string;
}

function isCeloNetwork(chainId: number): boolean {
  return chainId === 42220;
}

function debugLog(message: string, data?: any) {
  if (DEBUG_MODE) {
    console.log(`🔍 [Divvi Debug] ${message}`, data ? data : '');
  }
}

function errorLog(message: string, error?: any) {
  console.error(`❌ [Divvi Error] ${message}`, error ? error : '');
}

function successLog(message: string, data?: any) {
  console.log(`✅ [Divvi Success] ${message}`, data ? data : '');
}

function validateAndFixHexData(data: string): { isValid: boolean; fixed: string; error?: string } {
  if (!data || typeof data !== 'string') {
    return { isValid: false, fixed: '', error: 'Data is empty or not a string' };
  }

  const trimmed = data.trim();
  if (trimmed === '') {
    return { isValid: false, fixed: '', error: 'Data is empty after trimming' };
  }

  const hexPattern = /^(0x)?[0-9a-fA-F]+$/;
  if (!hexPattern.test(trimmed)) {
    return { isValid: false, fixed: '', error: 'Data contains non-hex characters' };
  }

  const fixed = trimmed.startsWith('0x') ? trimmed : `0x${trimmed}`;
  
  const hexPart = fixed.slice(2);
  if (hexPart.length % 2 !== 0) {
    return { isValid: false, fixed: '', error: 'Hex data has odd length (incomplete bytes)' };
  }

  return { isValid: true, fixed };
}

async function processDivviReferralData(chainId: number): Promise<{
  data?: string;
  error?: string;
  debugInfo: DebugInfo;
}> {
  const debugInfo: DebugInfo = {
    chainId,
    isCeloNetwork: isCeloNetwork(chainId),
    enabled: ENABLE_DIVVI_REFERRAL,
    timestamp: new Date().toISOString()
  };

  if (!ENABLE_DIVVI_REFERRAL) {
    debugLog('Divvi referral is disabled');
    return { debugInfo: { ...debugInfo, reason: 'disabled' } };
  }

  if (!isCeloNetwork(chainId)) {
    debugLog(`Not a Celo network (chainId: ${chainId})`);
    return { debugInfo: { ...debugInfo, reason: 'not_celo_network' } };
  }

  try {
    debugLog('Attempting to get Divvi referral data...');
    
    const rawData = appendDivviReferralData('');
    
    debugInfo.rawData = {
      value: rawData,
      type: typeof rawData,
      length: rawData?.length || 0,
      isEmpty: !rawData || rawData.trim() === ''
    };

    debugLog('Raw Divvi data received:', debugInfo.rawData);

    if (!rawData || rawData.trim() === '') {
      const error = 'appendDivviReferralData returned empty or null data';
      debugLog(error);
      return { error, debugInfo: { ...debugInfo, reason: 'empty_data' } };
    }

    const validation = validateAndFixHexData(rawData);
    debugInfo.validation = validation;

    if (!validation.isValid) {
      const error = `Invalid hex data: ${validation.error}`;
      errorLog(error, { rawData, validation });
      return { error, debugInfo: { ...debugInfo, reason: 'invalid_hex' } };
    }

    successLog('Successfully processed Divvi referral data', {
      original: rawData,
      fixed: validation.fixed,
      length: validation.fixed.length
    });

    return {
      data: validation.fixed,
      debugInfo: { ...debugInfo, reason: 'success', processedData: validation.fixed }
    };

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    errorLog('Failed to process Divvi referral data', { error: errorMessage, stack: error instanceof Error ? error.stack : undefined });
    
    return {
      error: errorMessage,
      debugInfo: {
        ...debugInfo,
        reason: 'exception',
        errorType: error instanceof Error ? error.constructor.name : typeof error,
        errorMessage
      }
    };
  }
}

async function reportToDivvi(txHash: string, chainId: number): Promise<void> {
  if (!ENABLE_DIVVI_REFERRAL || !isCeloNetwork(chainId)) {
    debugLog('Skipping Divvi reporting (not applicable)');
    return;
  }

  try {
    debugLog(`Reporting transaction to Divvi: ${txHash} on chain ${chainId}`);
    await reportTransactionToDivvi(txHash as `0x${string}`, chainId);
    successLog('Transaction reported to Divvi successfully');
  } catch (error) {
    errorLog('Failed to report transaction to Divvi', error);
    
    if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
      console.error(`
🚫 CORS Error Detected - Transaction reporting to Divvi failed
📋 Error Details:
   - This is a Cross-Origin Resource Sharing (CORS) issue
   - The Divvi API doesn't allow requests from your current domain
   - Your main transaction was still successful!

💡 Recommended Solutions:
   1. Move Divvi reporting to your backend server (recommended)
   2. Contact Divvi support to allowlist your domain
   3. Use a proxy server for development
   4. Skip Divvi reporting in development mode

🔧 Quick Fix for Development:
   Set ENABLE_DIVVI_REFERRAL=false or add domain check
      `);
    } else if (error instanceof Error) {
      if (error.message.includes('400')) {
        errorLog('Bad Request - Check transaction hash and chainId format');
      } else if (error.message.includes('401') || error.message.includes('403')) {
        errorLog('Authentication/Authorization error - Check API keys or permissions');
      } else if (error.message.includes('404')) {
        errorLog('Divvi API endpoint not found - Check API URL');
      } else if (error.message.includes('429')) {
        errorLog('Rate limit exceeded - Too many requests to Divvi API');
      } else {
        errorLog('Unknown error occurred', {
          message: error.message,
          name: error.name,
          stack: DEBUG_MODE ? error.stack : undefined
        });
      }
    }
  }
}

// Add comprehensive 400 error debugging
export async function debugClaimRequest(
  userAddress: string,
  faucetAddress: string,
  secretCode: string,
  chainId: number
) {
  console.log('🔍 Debugging claim request parameters...');
  
  const validation = {
    userAddress: {
      value: userAddress,
      isValid: /^0x[a-fA-F0-9]{40}$/.test(userAddress),
      isEmpty: !userAddress,
      length: userAddress?.length
    },
    faucetAddress: {
      value: faucetAddress,
      isValid: /^0x[a-fA-F0-9]{40}$/.test(faucetAddress),
      isEmpty: !faucetAddress,
      length: faucetAddress?.length
    },
    secretCode: {
      value: secretCode,
      isValid: /^[A-Z0-9]{6}$/.test(secretCode || ''),
      isEmpty: !secretCode,
      length: secretCode?.length,
      pattern: secretCode ? secretCode.match(/^[A-Z0-9]{6}$/) : null
    },
    chainId: {
      value: chainId,
      isValid: [1135, 42220, 42161].includes(chainId),
      type: typeof chainId,
      validChains: [1135, 42220, 42161]
    }
  };
  
  console.log('📊 Validation Results:', validation);
  
  // Check for specific validation failures
  const errors = [];
  if (!validation.userAddress.isValid) {
    errors.push(`Invalid userAddress: ${userAddress} (length: ${validation.userAddress.length})`);
  }
  if (!validation.faucetAddress.isValid) {
    errors.push(`Invalid faucetAddress: ${faucetAddress} (length: ${validation.faucetAddress.length})`);
  }
  if (!validation.secretCode.isValid) {
    errors.push(`Invalid secretCode: "${secretCode}" (length: ${validation.secretCode.length}, pattern match: ${validation.secretCode.pattern})`);
  }
  if (!validation.chainId.isValid) {
    errors.push(`Invalid chainId: ${chainId} (type: ${validation.chainId.type}, valid: ${validation.chainId.validChains})`);
  }
  
  if (errors.length > 0) {
    console.error('❌ Validation Errors Found:', errors);
    return { valid: false, errors };
  }
  
  console.log('✅ All parameters valid');
  return { valid: true, errors: [] };
}

export async function claimNoCodeViaBackend(
  userAddress: string,
  faucetAddress: string,
  provider: BrowserProvider
): Promise<{ success: boolean; txHash: string; whitelistTx?: string; divviDebug?: any }> {
  try {
    debugLog('Input to claimNoCodeViaBackend', {
      userAddress,
      faucetAddress
    });

    if (typeof window === 'undefined' || !window.ethereum) {
      throw new Error("Wallet not detected. Please install MetaMask or another Ethereum wallet in a supported browser.");
    }

    if (!provider) {
      throw new Error("Provider not initialized. Please ensure your wallet is connected.");
    }

    const network = await provider.getNetwork();
    const chainId = Number(network.chainId);

    const validChainIds = [1135, 42220, 42161];
    if (!validChainIds.includes(chainId)) {
      throw new Error(`Unsupported chainId: ${chainId}. Please switch to Lisk, Celo, or Arbitrum.`);
    }

    debugLog(`Starting drop process for chainId: ${chainId}`);

    let payload: ClaimPayload = {
      userAddress,
      faucetAddress,
      shouldWhitelist: true,
      chainId
    };

    const divviResult = await processDivviReferralData(chainId);
    
    if (divviResult.data) {
      payload.divviReferralData = divviResult.data;
      successLog('Added Divvi referral data to payload', { 
        length: divviResult.data.length,
        preview: `${divviResult.data.slice(0, 20)}...`
      });
    } else if (divviResult.error) {
      debugLog(`Proceeding without Divvi data: ${divviResult.error}`);
    }

    const requestLog: RequestLogData = {
      userAddress,
      faucetAddress,
      chainId,
      hasDivviData: !!payload.divviReferralData,
      divviDataLength: payload.divviReferralData?.length || 0,
      timestamp: new Date().toISOString()
    };

    if (DEBUG_MODE) {
      requestLog.payload = JSON.stringify(payload, null, 2);
      requestLog.divviDebugInfo = divviResult.debugInfo;
    }

    debugLog('Sending drop request without code', requestLog);

    const response = await fetch(`${API_URL}/claim-no-code`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      let errorData;
      try {
        errorData = await response.json();
      } catch (e) {
        errorData = { 
          detail: `Failed to parse backend response. Status: ${response.status} ${response.statusText}` 
        };
      }
      
      errorLog('Backend request failed', {
        status: response.status,
        statusText: response.statusText,
        errorData
      });
      
      throw new Error(
        errorData.detail ||
        errorData.message ||
        `Backend request failed (${response.status}): ${JSON.stringify(errorData)}`
      );
    }

    const result = await response.json();
    successLog('Drop request without code successful', { 
      success: result.success, 
      txHash: result.txHash 
    });

    if (result.success && result.txHash) {
      setTimeout(() => {
        reportToDivvi(result.txHash, chainId);
      }, 100);
    }

    if (DEBUG_MODE) {
      result.divviDebug = divviResult.debugInfo;
    }

    return result;
  } catch (error) {
    errorLog('Error in claimNoCodeViaBackend', error);
    throw error;
  }
}


// Enhanced claimViaBackend with whitelist-first flow
export async function claimViaBackend(
  userAddress: string,
  faucetAddress: string,
  provider: BrowserProvider,
  secretCode: string
): Promise<{ success: boolean; txHash: string; whitelistTx?: string; divviDebug?: any }> {
  try {
    console.log('🚀 Starting enhanced claim process with whitelist-first flow...');
    
    // Debug input parameters first
    const validation = await debugClaimRequest(userAddress, faucetAddress, secretCode, 42220);
    
    if (!validation.valid) {
      throw new Error(`Invalid request parameters: ${validation.errors.join(', ')}`);
    }

    const network = await provider.getNetwork();
    const chainId = Number(network.chainId);
    
    // Validate chainId specifically
    const validChainIds = [1135, 42220, 42161];
    if (!validChainIds.includes(chainId)) {
      throw new Error(`Unsupported chainId: ${chainId}. Please switch to Lisk (1135), Celo (42220), or Arbitrum (42161).`);
    }

    // Clean and validate addresses
    const cleanUserAddress = userAddress.trim();
    const cleanFaucetAddress = faucetAddress.trim();
    const cleanSecretCode = secretCode.trim().toUpperCase();
    
    console.log('🧹 Cleaned parameters:', {
      userAddress: cleanUserAddress,
      faucetAddress: cleanFaucetAddress,
      secretCode: cleanSecretCode,
      chainId
    });

    // Step 1: Check if user is already whitelisted
    let whitelistTx: string | undefined;
    try {
      console.log('🔍 Checking whitelist status...');
      const whitelistStatus = await fetch(
        `${API_URL}/whitelist-status/${cleanFaucetAddress}/${cleanUserAddress}?chain_id=${chainId}`
      );
      
      if (whitelistStatus.ok) {
        const statusData = await whitelistStatus.json();
        console.log('📋 Whitelist status:', statusData);
        
        if (!statusData.isWhitelisted) {
          console.log('📝 User not whitelisted, whitelisting now...');
          
          // Step 2: Whitelist the user
          const whitelistPayload = {
            userAddress: cleanUserAddress,
            faucetAddress: cleanFaucetAddress,
            secretCode: cleanSecretCode,
            chainId
          };
          
          console.log('📤 Sending whitelist request:', whitelistPayload);
          
          const whitelistResponse = await fetch(`${API_URL}/whitelist`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(whitelistPayload),
          });
          
          if (!whitelistResponse.ok) {
            const whitelistError = await whitelistResponse.text();
            console.error('❌ Whitelist failed:', whitelistError);
            throw new Error(`Failed to whitelist user: ${whitelistError}`);
          }
          
          const whitelistResult = await whitelistResponse.json();
          console.log('✅ Whitelist successful:', whitelistResult);
          whitelistTx = whitelistResult.txHash;
          
          // Wait a moment for the whitelist transaction to be processed
          console.log('⏳ Waiting for whitelist transaction to be processed...');
          await new Promise(resolve => setTimeout(resolve, 3000));
        } else {
          console.log('✅ User already whitelisted');
        }
      } else {
        console.warn('⚠️ Could not check whitelist status, proceeding with whitelist attempt...');
        
        // Attempt to whitelist anyway
        const whitelistPayload = {
          userAddress: cleanUserAddress,
          faucetAddress: cleanFaucetAddress,
          secretCode: cleanSecretCode,
          chainId
        };
        
        const whitelistResponse = await fetch(`${API_URL}/whitelist`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(whitelistPayload),
        });
        
        if (whitelistResponse.ok) {
          const whitelistResult = await whitelistResponse.json();
          console.log('✅ Whitelist successful:', whitelistResult);
          whitelistTx = whitelistResult.txHash;
          
          // Wait a moment for the whitelist transaction to be processed
          console.log('⏳ Waiting for whitelist transaction to be processed...');
          await new Promise(resolve => setTimeout(resolve, 3000));
        }
      }
    } catch (whitelistError) {
      console.error('❌ Whitelist process failed:', whitelistError);
      // Don't throw here, let's try to claim anyway in case user is already whitelisted
    }

    // Step 3: Claim tokens
    console.log('🎯 Proceeding with token claim...');
    
    const claimPayload = {
      userAddress: cleanUserAddress,
      faucetAddress: cleanFaucetAddress,
      secretCode: cleanSecretCode,
      chainId
    };
    
    console.log('📤 Sending claim request:', claimPayload);
    
    const claimResponse = await fetch(`${API_URL}/claim`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(claimPayload),
    });
    
    console.log('📥 Claim response status:', claimResponse.status, claimResponse.statusText);
    
    if (!claimResponse.ok) {
      let errorData;
      const responseText = await claimResponse.text();
      
      console.log('📄 Raw claim response text:', responseText);
      
      try {
        errorData = JSON.parse(responseText);
      } catch (e) {
        console.error('❌ Failed to parse claim error response as JSON:', e);
        errorData = { 
          detail: `Failed to parse backend response. Status: ${claimResponse.status} ${claimResponse.statusText}. Raw response: ${responseText}` 
        };
      }
      
      console.error('❌ Claim error details:', {
        status: claimResponse.status,
        statusText: claimResponse.statusText,
        errorData,
        requestPayload: claimPayload
      });
      
      // Handle specific error cases
      if (claimResponse.status === 400) {
        const errorMessage = errorData.detail || errorData.message || 'Bad Request';
        
        if (errorMessage.includes('Invalid address')) {
          throw new Error(`Address validation failed: ${errorMessage}`);
        } else if (errorMessage.includes('Invalid chainId')) {
          throw new Error(`Chain validation failed: ${errorMessage}. Current chainId: ${chainId}`);
        } else if (errorMessage.includes('Insufficient funds')) {
          throw new Error(`Backend wallet has insufficient funds: ${errorMessage}`);
        } else if (errorMessage.includes('Transaction failed')) {
          throw new Error(`Blockchain transaction failed: ${errorMessage}`);
        } else {
          throw new Error(`Bad Request (400): ${errorMessage}`);
        }
      } else if (claimResponse.status === 403) {
        const errorMessage = errorData.detail || errorData.message || 'Forbidden';
        
        if (errorMessage.includes('not whitelisted')) {
          throw new Error(`User still not whitelisted after whitelist attempt. This might be a timing issue. Please try again in a few seconds.`);
        } else if (errorMessage.includes('Invalid or expired secret code')) {
          throw new Error(`Secret code is invalid or expired: ${errorMessage}`);
        } else {
          throw new Error(`Access denied (403): ${errorMessage}`);
        }
      }
      
      throw new Error(
        errorData.detail ||
        errorData.message ||
        `Backend request failed (${claimResponse.status}): ${JSON.stringify(errorData)}`
      );
    }
    
    const claimResult = await claimResponse.json();
    console.log('✅ Claim successful:', claimResult);
    
    return {
      success: true,
      txHash: claimResult.txHash,
      whitelistTx: whitelistTx,
      divviDebug: {
        whitelistTx,
        claimTx: claimResult.txHash
      }
    };
    
  } catch (error) {
    console.error('❌ Comprehensive error in claimViaBackend:', {
      error: error.message,
      stack: error.stack,
      userAddress,
      faucetAddress,
      secretCode: secretCode ? `${secretCode.substring(0, 2)}****` : 'undefined',
      timestamp: new Date().toISOString()
    });
    throw error;
  }
}

// Helper function to whitelist user separately (if needed)
export async function whitelistUser(
  userAddress: string,
  faucetAddress: string,
  provider: BrowserProvider,
  secretCode: string
): Promise<{ success: boolean; txHash: string | null; message?: string }> {
  try {
    console.log('🚀 Starting whitelist process...');
    
    const network = await provider.getNetwork();
    const chainId = Number(network.chainId);
    
    // Validate chainId
    const validChainIds = [1135, 42220, 42161];
    if (!validChainIds.includes(chainId)) {
      throw new Error(`Unsupported chainId: ${chainId}. Please switch to Lisk (1135), Celo (42220), or Arbitrum (42161).`);
    }
    
    // Clean and validate addresses
    const cleanUserAddress = userAddress.trim();
    const cleanFaucetAddress = faucetAddress.trim();
    const cleanSecretCode = secretCode.trim().toUpperCase();
    
    const whitelistPayload = {
      userAddress: cleanUserAddress,
      faucetAddress: cleanFaucetAddress,
      secretCode: cleanSecretCode,
      chainId
    };
    
    console.log('📤 Sending whitelist request:', whitelistPayload);
    
    const response = await fetch(`${API_URL}/whitelist`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(whitelistPayload),
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ detail: 'Unknown error' }));
      throw new Error(errorData.detail || `Whitelist failed with status ${response.status}`);
    }
    
    const result = await response.json();
    console.log('✅ Whitelist successful:', result);
    
    return result;
    
  } catch (error) {
    console.error('❌ Error in whitelistUser:', error);
    throw error;
  }
}

// Helper function to check whitelist status
export async function checkWhitelistStatus(
  userAddress: string,
  faucetAddress: string,
  provider: BrowserProvider
): Promise<{ isWhitelisted: boolean; faucetAddress: string; userAddress: string; chainId: number }> {
  try {
    const network = await provider.getNetwork();
    const chainId = Number(network.chainId);
    
    const cleanUserAddress = userAddress.trim();
    const cleanFaucetAddress = faucetAddress.trim();
    
    const response = await fetch(
      `${API_URL}/whitelist-status/${cleanFaucetAddress}/${cleanUserAddress}?chain_id=${chainId}`
    );
    
    if (!response.ok) {
      throw new Error(`Failed to check whitelist status: ${response.status}`);
    }
    
    const result = await response.json();
    console.log('📋 Whitelist status:', result);
    
    return result;
    
  } catch (error) {
    console.error('❌ Error checking whitelist status:', error);
    throw error;
  }
}