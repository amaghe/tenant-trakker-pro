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
      function_name: 'mtn-momo-request-payment',
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
    const { data: userRole, error: roleError } = await authSupabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .maybeSingle();

    if (roleError || !userRole) {
      await logDebug('error', 'Insufficient permissions', { 
        userId: user.id, 
        hasAdminRole: !!userRole,
        error: roleError 
      });
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Admin access required' 
      }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    await logDebug('info', 'Starting MTN MoMo invoice creation', { userId: user.id });
    const { phoneNumber, amount, tenantId, paymentId, externalId, validityDuration, description, msisdn } = await req.json();
    
    // Use msisdn if provided, otherwise use phoneNumber for backwards compatibility
    const targetPhone = msisdn || phoneNumber;

    // Clean and validate phone number format for MTN MoMo
    let cleanPhoneNumber = targetPhone?.replace(/[^\d+]/g, ''); // Remove all non-digit characters except +
    
    // Convert US format to international format for sandbox testing
    if (cleanPhoneNumber?.startsWith('+1')) {
      // For sandbox, we need to use European numbers, so convert US to a valid test number
      cleanPhoneNumber = '+46114477000'; // Valid Swedish test number for sandbox
    } else if (cleanPhoneNumber?.startsWith('1') && cleanPhoneNumber.length === 11) {
      cleanPhoneNumber = '+46114477000'; // Valid Swedish test number for sandbox
    } else if (!cleanPhoneNumber?.startsWith('+')) {
      cleanPhoneNumber = '+46114477000'; // Default to valid test number
    }

    await logDebug('info', 'Invoice creation details received', {
      phoneNumber: targetPhone?.substring(0, 5) + '***', // Hide full phone number in logs
      cleanPhoneNumber: cleanPhoneNumber?.substring(0, 5) + '***',
      amount,
      tenantId,
      paymentId,
      hasExternalId: !!externalId,
      validityDuration,
      description
    });

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

    const paymentSupabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Generate unique reference ID for this transaction
    const referenceId = externalId || crypto.randomUUID();

    await logDebug('info', 'Generated reference ID for transaction', { referenceId });

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
      console.error('MTN MoMo token API error:', tokenResponse.status, tokenError);
      throw new Error(`MTN MoMo token error: ${tokenResponse.status} - ${tokenError}`);
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;
    
    await logDebug('info', 'Bearer token obtained successfully');

    // Request payment from MTN MoMo Collections API with cleaned phone number
    const requestBody = {
      amount: amount.toString(),
      currency: "EUR", // Use EUR for sandbox, or UGX for Uganda production
      externalId: referenceId,
      payer: {
        partyIdType: "MSISDN",
        partyId: cleanPhoneNumber.replace('+', '') // Remove + for MTN API
      },
      payerMessage: description || "Rent invoice payment",
      payeeNote: description || "Property rent invoice",
      ...(validityDuration && { validityDuration: validityDuration * 3600 }) // Convert hours to seconds
    };

    await logDebug('info', 'Sending invoice creation to MTN MoMo API', {
      amount,
      currency: "EUR",
      referenceId,
      validityDuration,
      description
    });

    const response = await fetch('https://sandbox.momodeveloper.mtn.com/collection/v1_0/requesttopay', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'X-Reference-Id': referenceId,
        'X-Target-Environment': 'sandbox',
        'Ocp-Apim-Subscription-Key': MTN_PRIMARY_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      await logDebug('error', 'MTN MoMo request payment API error', {
        status: response.status,
        statusText: response.statusText,
        error: errorText
      });
      console.error('MTN MoMo request payment API error:', response.status, errorText);
      throw new Error(`MTN MoMo API error: ${response.status} - ${errorText}`);
    }

    await logDebug('info', 'Invoice created successfully', { referenceId });

    // Update payment record with MTN transaction reference
    if (paymentId) {
      await logDebug('info', 'Updating payment record', { paymentId, referenceId });
      
      const { error: updateError } = await authSupabase
        .from('payments')
        .update({ 
          status: 'pending',
          payment_method: 'MTN Mobile Money',
          momo_reference_id: referenceId,
          momo_request_status: 'PENDING',
          updated_at: new Date().toISOString()
        })
        .eq('id', paymentId);

      if (updateError) {
        await logDebug('error', 'Error updating payment record', { error: updateError });
        console.error('Error updating payment record:', updateError);
      } else {
        await logDebug('info', 'Payment record updated successfully');
      }
    }

    await logDebug('info', 'Invoice creation completed successfully', { referenceId });

    return new Response(JSON.stringify({
      success: true,
      referenceId,
      externalId: referenceId,
      message: 'Invoice created successfully for ' + targetPhone?.substring(0, 5) + '***'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : undefined;
    
    await logDebug('error', 'Error in mtn-momo-invoice-creation function', {
      error: errorMessage,
      stack: errorStack
    });
    
    console.error('Error in mtn-momo-request-payment function:', error);
    return new Response(JSON.stringify({ 
      success: false,
      error: errorMessage 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});