import { BrowserProvider } from 'ethers';
import { appendDivviReferralData, reportTransactionToDivvi } from './divvi-integration';

const API_URL = "https://fauctdrop-backend.onrender.com";
const ENABLE_DIVVI_REFERRAL = true;
const DEBUG_MODE = process.env.NODE_ENV === 'development';

interface ClaimPayload {
  userAddress: string;
  faucetAddress: string;
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
  isSupportedNetwork: boolean;
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

function isSupportedNetwork(chainId: number): boolean {
  // Updated to match the supported networks from your integration
  return [1, 42220, 44787, 62320, 1135, 4202, 8453, 84532, 137].includes(chainId);
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

async function processDivviReferralData(chainId: number, userAddress: string): Promise<{
  data?: string;
  error?: string;
  debugInfo: DebugInfo;
}> {
  const debugInfo: DebugInfo = {
    chainId,
    isSupportedNetwork: isSupportedNetwork(chainId),
    enabled: ENABLE_DIVVI_REFERRAL,
    timestamp: new Date().toISOString()
  };

  if (!ENABLE_DIVVI_REFERRAL) {
    debugLog('Divvi referral is disabled');
    return { debugInfo: { ...debugInfo, reason: 'disabled' } };
  }

  if (!isSupportedNetwork(chainId)) {
    debugLog(`Network not supported by Divvi (chainId: ${chainId})`);
    return { debugInfo: { ...debugInfo, reason: 'unsupported_network' } };
  }

  if (!userAddress) {
    debugLog('No user address provided for Divvi referral');
    return { debugInfo: { ...debugInfo, reason: 'no_user_address' } };
  }

  try {
    debugLog('Attempting to get Divvi referral data...', { userAddress, chainId });
    
    // Updated to use v2 API which requires user address
    const rawData = appendDivviReferralData('', userAddress as `0x${string}`);
    
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
      userAddress,
      chainId,
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
  if (!ENABLE_DIVVI_REFERRAL || !isSupportedNetwork(chainId)) {
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
    }
  }
}

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
      isValid: [1135, 42220, 42161, 8453, 137].includes(chainId),
      type: typeof chainId,
      validChains: [1135, 42220, 42161, 8453, 137]
    }
  };
  
  console.log('📊 Validation Results:', validation);
  
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
): Promise<{ success: boolean; txHash: string; divviDebug?: any }> {
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

    const validChainIds = [1, 1135, 42220, 42161, 8453, 84532, 137, 44787];
    if (!validChainIds.includes(chainId)) {
      throw new Error(`Unsupported chainId: ${chainId}. Please switch to a supported network.`);
    }

    debugLog(`Starting drop process for chainId: ${chainId}`);

    let payload: ClaimPayload = {
      userAddress,
      faucetAddress,
      chainId
    };

    // Updated to pass user address to Divvi v2
    const divviResult = await processDivviReferralData(chainId, userAddress);
    
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

export async function claimViaBackend(
  userAddress: string,
  faucetAddress: string,
  provider: BrowserProvider,
  secretCode: string
): Promise<{ success: boolean; txHash: string; divviDebug?: any }> {
  try {
    console.log('🚀 Starting claim process...');
    
    // Debug input parameters first
    const validation = await debugClaimRequest(userAddress, faucetAddress, secretCode, 42220);
    
    if (!validation.valid) {
      throw new Error(`Invalid request parameters: ${validation.errors.join(', ')}`);
    }

    const network = await provider.getNetwork();
    const chainId = Number(network.chainId);
    
    // Validate chainId specifically
    const validChainIds = [1, 1135, 42220, 42161, 8453, 84532, 137, 44787];
    if (!validChainIds.includes(chainId)) {
      throw new Error(`Unsupported chainId: ${chainId}. Please switch to a supported network.`);
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

    // Claim tokens directly
    console.log('🎯 Proceeding with token claim...');
    
    let claimPayload: ClaimPayload = {
      userAddress: cleanUserAddress,
      faucetAddress: cleanFaucetAddress,
      secretCode: cleanSecretCode,
      chainId
    };

    // Add Divvi referral data for supported networks
    const divviResult = await processDivviReferralData(chainId, cleanUserAddress);
    
    if (divviResult.data) {
      claimPayload.divviReferralData = divviResult.data;
      successLog('Added Divvi referral data to claim payload', { 
        length: divviResult.data.length,
        preview: `${divviResult.data.slice(0, 20)}...`
      });
    } else if (divviResult.error) {
      debugLog(`Proceeding without Divvi data: ${divviResult.error}`);
    }
    
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
        
        if (errorMessage.includes('Invalid or expired secret code')) {
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

    // Report to Divvi if transaction was successful
    if (claimResult.txHash) {
      setTimeout(() => {
        reportToDivvi(claimResult.txHash, chainId);
      }, 100);
    }
    
    return {
      success: true,
      txHash: claimResult.txHash,
      divviDebug: {
        claimTx: claimResult.txHash,
        divviData: divviResult.debugInfo
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