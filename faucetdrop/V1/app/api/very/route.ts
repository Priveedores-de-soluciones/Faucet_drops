// app/api/verify/route.ts

import { SelfBackendVerifier } from '@selfxyz/core';
import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import type { VerificationResponse } from '@/types/verification';

// ConfigMismatchError fallback (may not be exported in current version)
class ConfigMismatchError extends Error {
  issues: string[];
  
  constructor(message: string, issues: string[] = []) {
    super(message);
    this.name = 'ConfigMismatchError';
    this.issues = issues;
  }
}

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_KEY!
);

// Configuration storage that matches frontend exactly
class SimpleConfigStorage {
  async getConfig(configId: string) {
    return {
      olderThan: 15, // This maps to minimumAge: 15 in frontend
      excludedCountries: [], // Empty array, not ["", ""]
      ofac: true,
    };
  }

  async getActionId(userIdentifier: string, userDefinedData: string): Promise<string> {
    return 'default_config';
  }
}

// Initialize SelfBackendVerifier
const allowedIds = new Map<number, boolean>();
allowedIds.set(1, true); // Passports
allowedIds.set(2, true); // EU ID cards

const selfBackendVerifier = new SelfBackendVerifier(
  'faucedrop', // Must match frontend scope
  process.env.NEXT_PUBLIC_VERIFY_ENDPOINT!,
  process.env.NODE_ENV !== 'production', // true for testing, false for production
  allowedIds,
  new SimpleConfigStorage(),
  'hex' // Use 'hex' for wallet addresses, 'uuid' for traditional UUIDs
);

interface VerificationRequest {
  attestationId: string;
  proof: any;
  pubSignals: any;
  userContextData: {
    userId: string;
    [key: string]: any;
  };
}

export async function POST(request: NextRequest): Promise<NextResponse<VerificationResponse>> {
  try {
    const body: VerificationRequest = await request.json();
    
    console.log('Verification request received:', {
      hasAttestationId: !!body.attestationId,
      hasProof: !!body.proof,
      hasPubSignals: !!body.pubSignals,
      hasUserContextData: !!body.userContextData,
    });

    const { attestationId, proof, pubSignals, userContextData } = body;

    // Validate required fields
    if (!attestationId || !proof || !pubSignals || !userContextData) {
      console.error('Missing required fields:', {
        attestationId: !!attestationId,
        proof: !!proof,
        pubSignals: !!pubSignals,
        userContextData: !!userContextData
      });

      return NextResponse.json({
        status: 'error',
        result: false,
        reason: 'Missing required fields',
        error_code: 'MISSING_FIELDS',
      }, { status: 400 });
    }

    // Extract userId from userContextData
    const userId = userContextData.userId;
    if (!userId) {
      return NextResponse.json({
        status: 'error',
        result: false,
        reason: 'UserId not found in userContextData',
        error_code: 'MISSING_USER_ID',
      }, { status: 400 });
    }

    console.log('Verifying proof for user:', userId);

    // Verify the proof using SelfBackendVerifier
    const result = await selfBackendVerifier.verify(
      attestationId,
      proof,
      pubSignals,
      userContextData
    );

    console.log('Verification result:', {
      isValid: result.isValidDetails.isValid,
      userId: userId,
      discloseOutput: result.discloseOutput
    });

    if (result.isValidDetails.isValid) {
      // Store verification in Supabase
      const { data, error } = await supabase
        .from('verifications')
        .upsert({
          user_id: userId.toLowerCase(),
          verified: true,
          timestamp: new Date().toISOString(),
          attestation_id: attestationId,
          disclose_output: result.discloseOutput,
          proof_data: {
            attestationId,
            userContextData,
            timestamp: Date.now()
          }
        }, {
          onConflict: 'user_id'
        });

      if (error) {
        console.error('Supabase storage error:', error);
        return NextResponse.json({
          status: 'error',
          result: false,
          reason: 'Database storage error',
          error_code: 'DATABASE_ERROR',
        }, { status: 500 });
      }

      console.log('Verification stored successfully for user:', userId);

      return NextResponse.json({
        status: 'success',
        result: true,
        message: 'Verification successful',
        credentialSubject: result.discloseOutput,
        timestamp: new Date().toISOString()
      });
    } else {
      console.log('Verification failed:', result.isValidDetails);
      
      return NextResponse.json({
        status: 'error',
        result: false,
        reason: 'Verification failed',
        error_code: 'VERIFICATION_FAILED',
      }, { status: 200 });
    }
  } catch (error) {
    console.error('Error in verification handler:', error);
    
    if (error instanceof ConfigMismatchError) {
      console.error('Configuration mismatch:', error.issues);
      return NextResponse.json({
        status: 'error',
        result: false,
        reason: 'Configuration mismatch between frontend and backend',
        error_code: 'CONFIG_MISMATCH',
      }, { status: 400 });
    }

    return NextResponse.json({
      status: 'error',
      result: false,
      reason: 'Internal server error',
      error_code: 'INTERNAL_ERROR',
      message: process.env.NODE_ENV === 'development' ? (error as Error).message : 'Internal error occurred'
    }, { status: 500 });
  }
}

export async function OPTIONS(): Promise<NextResponse> {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}