// app/api/verify/status/[userId]/route.ts

import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import type { VerificationStatusResponse } from '@/types/verification';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_KEY!
);

interface RouteParams {
  params: {
    userId: string;
  };
}

export async function GET(
  request: NextRequest, 
  { params }: RouteParams
): Promise<NextResponse<VerificationStatusResponse>> {
  try {
    const { userId } = params;
    
    console.log('Checking verification status for user:', userId);

    if (!userId) {
      return NextResponse.json({
        status: 'error',
        verified: false,
        reason: 'User ID is required',
        error_code: 'MISSING_USER_ID',
      }, { status: 400 });
    }

    // Validate userId format (should be an Ethereum address)
    if (!/^0x[a-fA-F0-9]{40}$/.test(userId)) {
      return NextResponse.json({
        status: 'error',
        verified: false,
        reason: 'Invalid user ID format. Expected Ethereum address.',
        error_code: 'INVALID_USER_ID_FORMAT',
      }, { status: 400 });
    }

    console.log('Querying Supabase for verification record...');
    
    // Query Supabase for verification record
    const { data, error } = await supabase
      .from('verifications')
      .select('*')
      .eq('user_id', userId.toLowerCase())
      .single();

    if (error) {
      console.log('Supabase query error:', error);
      
      if (error.code === 'PGRST116') {
        // No rows found - user not verified
        console.log('No verification record found for user:', userId);
        return NextResponse.json({
          status: 'success',
          verified: false,
          message: 'User not verified',
          userId: userId.toLowerCase()
        });
      } else {
        // Database error
        console.error('Supabase query error:', error);
        return NextResponse.json({
          status: 'error',
          verified: false,
          reason: 'Database query error',
          error_code: 'DATABASE_ERROR',
        }, { status: 500 });
      }
    }

    console.log('Verification record found:', data);
    
    // Check if verification record exists and is valid
    if (data && data.verified === true) {
      console.log('User verified:', userId, 'at', data.timestamp);
      
      // Check if verification is not too old (optional - 90 days)
      const ninetyDaysAgo = new Date();
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
      const verificationDate = new Date(data.timestamp);
      
      const isExpired = verificationDate < ninetyDaysAgo;
      
      return NextResponse.json({
        status: 'success',
        verified: !isExpired,
        timestamp: data.timestamp,
        attestationId: data.attestation_id,
        discloseOutput: data.disclose_output,
        isExpired: isExpired,
        message: isExpired ? 'User verification has expired' : 'User is verified',
        userId: userId.toLowerCase()
      });
    } else {
      console.log('User verification record found but not verified:', userId);
      
      return NextResponse.json({
        status: 'success',
        verified: false,
        message: 'User verification incomplete or invalid',
        userId: userId.toLowerCase()
      });
    }
  } catch (error) {
    console.error('Error checking verification status:', error);
    
    return NextResponse.json({
      status: 'error',
      verified: false,
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
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}