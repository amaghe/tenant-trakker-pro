import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Helper function to log to debug table
async function logDebug(level: string, message: string, metadata?: any, userId?: string) {
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );
    
    await supabase.from('debug_logs').insert({
      function_name: 'mtn-momo-balance',
      level,
      message,
      metadata,
      user_id: userId
    });
    
    console.log(`[${level.toUpperCase()}] ${message}`, metadata || '');
  } catch (error) {
    console.error('Failed to log debug message:', error);
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    await logDebug('info', 'Starting MTN MoMo balance check request');
    
    const MTN_PRIMARY_KEY = Deno.env.get('MTN_PRIMARY_KEY');
    const MTN_USER_REFERENCE_ID = Deno.env.get('MTN_USER_REFERENCE_ID');
    const MTN_USER_API_KEY = Deno.env.get('MTN_USER_API_KEY');

    if (!MTN_PRIMARY_KEY || !MTN_USER_REFERENCE_ID || !MTN_USER_API_KEY) {
      await logDebug('error', 'Missing MTN MoMo credentials', {
        hasPrimaryKey: !!MTN_PRIMARY_KEY,
        hasUserRefId: !!MTN_USER_REFERENCE_ID,
        hasApiKey: !!MTN_USER_API_KEY
      });
      throw new Error('Missing MTN MoMo credentials');
    }

    await logDebug('info', 'Credentials loaded successfully');
    console.log('Checking MTN MoMo account balance...');

    // First, get bearer token for authentication
    await logDebug('info', 'Requesting bearer token from MTN MoMo API');
    
    const tokenResponse = await fetch('https://sandbox.momodeveloper.mtn.com/collection/token/', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${btoa(MTN_USER_REFERENCE_ID + ':' + MTN_USER_API_KEY)}`,
        'Ocp-Apim-Subscription-Key': MTN_PRIMARY_KEY,
        'Content-Type': 'application/json',
      },
    });

    await logDebug('info', 'Token API response received', {
      status: tokenResponse.status,
      statusText: tokenResponse.statusText,
      headers: Object.fromEntries(tokenResponse.headers.entries())
    });

    if (!tokenResponse.ok) {
      const tokenError = await tokenResponse.text();
      await logDebug('error', 'MTN MoMo token API error', {
        status: tokenResponse.status,
        statusText: tokenResponse.statusText,
        error: tokenError
      });
      console.error('MTN MoMo token API error:', tokenResponse.status, tokenError);
      throw new Error(`MTN MoMo token error: ${tokenResponse.status} - ${tokenError}`);
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;
    
    await logDebug('info', 'Bearer token obtained successfully');
    console.log('Bearer token obtained successfully');

    // Get account balance from MTN MoMo Collections API
    await logDebug('info', 'Requesting account balance from MTN MoMo API');
    
    const response = await fetch('https://sandbox.momodeveloper.mtn.com/collection/v1_0/account/balance', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'X-Reference-Id': MTN_USER_REFERENCE_ID,
        'X-Target-Environment': 'sandbox',
        'Ocp-Apim-Subscription-Key': MTN_PRIMARY_KEY,
        'Content-Type': 'application/json',
      },
    });

    const responseHeaders = Object.fromEntries(response.headers.entries());
    
    await logDebug('info', 'Balance API response received', {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders
    });

    console.log('Balance API Response Status:', response.status);
    console.log('Balance API Response Headers:', responseHeaders);
    
    if (!response.ok) {
      const errorText = await response.text();
      const errorDetails = {
        status: response.status,
        statusText: response.statusText,
        headers: responseHeaders,
        body: errorText
      };
      
      await logDebug('error', 'MTN MoMo balance API error', errorDetails);
      
      console.error('MTN MoMo balance API error:', response.status, errorText);
      console.error('Full response details:', errorDetails);
      throw new Error(`MTN MoMo API error: ${response.status} - ${errorText}`);
    }

    const balanceData = await response.json();
    
    await logDebug('info', 'Account balance retrieved successfully', balanceData);
    console.log('Account balance retrieved successfully:', balanceData);

    return new Response(JSON.stringify({
      success: true,
      balance: balanceData
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    await logDebug('error', 'Error in mtn-momo-balance function', {
      error: error.message,
      stack: error.stack
    });
    
    console.error('Error in mtn-momo-balance function:', error);
    return new Response(JSON.stringify({ 
      success: false,
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});