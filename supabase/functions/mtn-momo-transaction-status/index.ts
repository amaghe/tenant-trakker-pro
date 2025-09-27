import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

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
      function_name: 'mtn-momo-transaction-status',
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

// Helper function to validate UUID format
function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify user authentication and admin role
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Authentication required' 
      }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Initialize Supabase client to verify user role
    const authSupabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get user from JWT
    const jwt = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await authSupabase.auth.getUser(jwt);
    
    if (authError || !user) {
      await logDebug('error', 'Invalid authentication token', { error: authError });
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Invalid authentication' 
      }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check if user has admin role
    const { data: profile, error: profileError } = await authSupabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError || !profile || profile.role !== 'admin') {
      await logDebug('error', 'Insufficient permissions', { 
        userId: user.id, 
        role: profile?.role,
        error: profileError 
      });
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Admin access required' 
      }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    await logDebug('info', 'Starting MTN MoMo invoice status check', { userId: user.id });
    
    const { referenceId, paymentId } = await req.json();

    // Validate required parameters
    if (!referenceId) {
      await logDebug('error', 'Missing required parameter: referenceId');
      throw new Error('Reference ID is required');
    }

    // Validate UUID format
    if (!isValidUUID(referenceId)) {
      await logDebug('error', 'Invalid UUID format for referenceId', { referenceId });
      throw new Error('Invalid reference ID format. Must be a valid UUID.');
    }

    await logDebug('info', 'Invoice status check request received', {
      referenceId: referenceId.substring(0, 8) + '***', // Partial log for security
      hasPaymentId: !!paymentId
    });

    // Validate environment variables
    const MTN_PRIMARY_KEY = Deno.env.get('MTN_PRIMARY_KEY');
    const MTN_USER_REFERENCE_ID = Deno.env.get('MTN_USER_REFERENCE_ID');
    const MTN_USER_API_KEY = Deno.env.get('MTN_USER_API_KEY');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!MTN_PRIMARY_KEY || !MTN_USER_REFERENCE_ID || !MTN_USER_API_KEY) {
      await logDebug('error', 'Missing MTN MoMo credentials', {
        hasPrimaryKey: !!MTN_PRIMARY_KEY,
        hasUserRefId: !!MTN_USER_REFERENCE_ID,
        hasApiKey: !!MTN_USER_API_KEY
      });
      throw new Error('Missing MTN MoMo credentials');
    }

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      await logDebug('error', 'Missing Supabase credentials');
      throw new Error('Missing Supabase credentials');
    }

    const statusSupabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    await logDebug('info', 'Checking MTN MoMo invoice status', { referenceId: referenceId.substring(0, 8) + '***' });

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

    if (!tokenResponse.ok) {
      const tokenError = await tokenResponse.text();
      await logDebug('error', 'MTN MoMo token API error', {
        status: tokenResponse.status,
        statusText: tokenResponse.statusText,
        error: tokenError
      });
      throw new Error(`MTN MoMo token error: ${tokenResponse.status} - ${tokenError}`);
    }

    const tokenData = await tokenResponse.json();
    
    if (!tokenData.access_token) {
      await logDebug('error', 'No access token in response', { tokenData });
      throw new Error('No access token received from MTN MoMo API');
    }

    const accessToken = tokenData.access_token;
    await logDebug('info', 'Bearer token obtained successfully for status check');

    // Check invoice status from MTN MoMo Collections API
    await logDebug('info', 'Requesting invoice status from MTN MoMo API', {
      referenceId: referenceId.substring(0, 8) + '***'
    });

    const response = await fetch(`https://sandbox.momodeveloper.mtn.com/collection/v1_0/requesttopay/${referenceId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'X-Target-Environment': 'sandbox',
        'Ocp-Apim-Subscription-Key': MTN_PRIMARY_KEY,
        'Content-Type': 'application/json',
      },
    });

    // Log response details
    await logDebug('info', 'MTN MoMo API response received', {
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers.entries())
    });

    if (!response.ok) {
      const errorText = await response.text();
      await logDebug('error', 'MTN MoMo transaction status API error', {
        status: response.status,
        statusText: response.statusText,
        error: errorText,
        referenceId: referenceId.substring(0, 8) + '***'
      });
      
      // Provide more specific error messages
      if (response.status === 404) {
        throw new Error('Transaction not found. The reference ID may be invalid or the transaction may not exist.');
      } else if (response.status === 401) {
        throw new Error('Authentication failed. Please check MTN MoMo credentials.');
      } else if (response.status === 403) {
        throw new Error('Access forbidden. Check subscription key and permissions.');
      } else {
        throw new Error(`MTN MoMo API error: ${response.status} - ${errorText}`);
      }
    }

    const transactionData = await response.json();
    await logDebug('info', 'Invoice status retrieved successfully', {
      status: transactionData.status,
      amount: transactionData.amount,
      currency: transactionData.currency,
      referenceId: referenceId.substring(0, 8) + '***'
    });

    // Update payment record based on transaction status
    if (paymentId && transactionData.status) {
      await logDebug('info', 'Updating payment record based on transaction status', {
        paymentId,
        transactionStatus: transactionData.status
      });

      let paymentStatus = 'pending';
      let paidDate = null;

      switch (transactionData.status.toUpperCase()) {
        case 'SUCCESSFUL':
          paymentStatus = 'paid';
          paidDate = new Date().toISOString().split('T')[0];
          break;
        case 'FAILED':
        case 'REJECTED':
          paymentStatus = 'failed';
          break;
        case 'PENDING':
        case 'ONGOING':
          paymentStatus = 'pending';
          break;
        default:
          await logDebug('warn', 'Unknown transaction status', { status: transactionData.status });
          paymentStatus = 'pending';
      }

      const updateData: any = {
        status: paymentStatus,
        updated_at: new Date().toISOString()
      };

      if (paidDate) {
        updateData.paid_date = paidDate;
      }

      const { error: updateError } = await authSupabase
        .from('payments')
        .update(updateData)
        .eq('id', paymentId);

      if (updateError) {
        await logDebug('error', 'Error updating payment record', {
          error: updateError,
          paymentId,
          updateData
        });
        console.error('Error updating payment record:', updateError);
        // Don't throw here, as the main operation (getting status) was successful
      } else {
        await logDebug('info', 'Payment record updated successfully', {
          paymentId,
          newStatus: paymentStatus
        });
      }
    }

    await logDebug('info', 'Invoice status check completed successfully');

    return new Response(JSON.stringify({
      success: true,
      transaction: {
        ...transactionData,
        status: transactionData.status?.toUpperCase(), // Normalize status
        checkedAt: new Date().toISOString()
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : undefined;
    
    await logDebug('error', 'Error in mtn-momo-transaction-status function', {
      error: errorMessage,
      stack: errorStack
    });
    
    console.error('Error in mtn-momo-transaction-status function:', error);
    
    // Determine appropriate HTTP status code
    let statusCode = 500;
    if (errorMessage.includes('not found') || errorMessage.includes('404')) {
      statusCode = 404;
    } else if (errorMessage.includes('Authentication') || errorMessage.includes('401')) {
      statusCode = 401;
    } else if (errorMessage.includes('forbidden') || errorMessage.includes('403')) {
      statusCode = 403;
    } else if (errorMessage.includes('Invalid') || errorMessage.includes('required')) {
      statusCode = 400;
    }

    return new Response(JSON.stringify({ 
      success: false,
      error: errorMessage,
      timestamp: new Date().toISOString()
    }), {
      status: statusCode,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});