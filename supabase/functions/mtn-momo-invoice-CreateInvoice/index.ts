import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function logDebug(level: string, message: string, metadata?: any, userId?: string) {
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseServiceKey) return;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    await supabase.from('debug_logs').insert({
      function_name: 'mtn-momo-invoice-CreateInvoice',
      level,
      message,
      metadata,
      user_id: userId
    });
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

    await logDebug('info', 'Starting MTN MoMo invoice creation', { userId: user.id });

    const { paymentId, amount, msisdn, validityDuration = 24, description = "Invoice", payeeMsisdn } = await req.json();
    
    if (!amount || !msisdn) {
      await logDebug('error', 'Missing required fields', { paymentId, amount: !!amount, msisdn: !!msisdn });
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Missing required fields: amount and msisdn' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Clean phone number for sandbox environment
    let cleanPhoneNumber = msisdn?.replace(/[^\d+]/g, ''); // Remove all non-digit characters except +
    
    // Convert US format to international format for sandbox testing
    if (cleanPhoneNumber?.startsWith('+1')) {
      cleanPhoneNumber = '+46114477000'; // Valid Swedish test number for sandbox
    } else if (cleanPhoneNumber?.startsWith('1') && cleanPhoneNumber.length === 11) {
      cleanPhoneNumber = '+46114477000'; // Valid Swedish test number for sandbox
    } else if (!cleanPhoneNumber?.startsWith('+')) {
      cleanPhoneNumber = '+46114477000'; // Default to valid test number
    }

    await logDebug('info', 'Invoice creation details received', {
      phoneNumber: msisdn?.substring(0, 5) + '***',
      cleanPhoneNumber: cleanPhoneNumber?.substring(0, 5) + '***',
      amount,
      paymentId,
      validityDuration,
      description
    });

    const MTN_PRIMARY_KEY = Deno.env.get('MTN_PRIMARY_KEY');
    const MTN_USER_REFERENCE_ID = Deno.env.get('MTN_USER_REFERENCE_ID');
    const MTN_USER_API_KEY = Deno.env.get('MTN_USER_API_KEY');

    if (!MTN_PRIMARY_KEY || !MTN_USER_REFERENCE_ID || !MTN_USER_API_KEY) {
      await logDebug('error', 'Missing MTN MoMo credentials', {
        hasPrimaryKey: !!MTN_PRIMARY_KEY,
        hasUserRefId: !!MTN_USER_REFERENCE_ID,
        hasApiKey: !!MTN_USER_API_KEY
      });
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'MTN MoMo configuration not found' 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Generate reference ID
    const referenceId = crypto.randomUUID();
    await logDebug('info', 'Generated reference ID for invoice', { referenceId });

    // Get access token
    await logDebug('info', 'Requesting bearer token from MTN MoMo API', {
      url: 'https://sandbox.momodeveloper.mtn.com/collection/token/',
      method: 'POST',
      headers: {
        'Authorization': 'Basic ***',
        'Ocp-Apim-Subscription-Key': MTN_PRIMARY_KEY ? 'configured' : 'missing',
        'Content-Type': 'application/json',
      }
    }, user.id);

    const tokenResponse = await fetch('https://sandbox.momodeveloper.mtn.com/collection/token/', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${btoa(MTN_USER_REFERENCE_ID + ':' + MTN_USER_API_KEY)}`,
        'Ocp-Apim-Subscription-Key': MTN_PRIMARY_KEY,
        'Content-Type': 'application/json',
      },
    });

    await logDebug('info', 'Token response received', {
      status: tokenResponse.status,
      statusText: tokenResponse.statusText,
      ok: tokenResponse.ok,
      headers: Object.fromEntries(tokenResponse.headers.entries()),
    }, user.id);

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      await logDebug('error', 'Failed to obtain bearer token', { 
        status: tokenResponse.status,
        statusText: tokenResponse.statusText,
        error: errorText,
        headers: Object.fromEntries(tokenResponse.headers.entries())
      }, user.id);
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Failed to obtain access token',
        details: errorText
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const tokenData = await tokenResponse.json();
    await logDebug('info', 'Token response data', {
      has_access_token: !!tokenData.access_token,
      token_type: tokenData.token_type,
      expires_in: tokenData.expires_in,
      scope: tokenData.scope
    }, user.id);
    
    const accessToken = tokenData.access_token;
    await logDebug('info', 'Bearer token obtained successfully', { 
      accessToken: accessToken ? 'received' : 'missing' 
    }, user.id);

    // Create invoice using v2.0 API
    const invoicePayload = {
      externalId: paymentId || crypto.randomUUID(),
      amount: amount.toString(),
      currency: "EUR",
      validityDuration: (validityDuration * 3600).toString(), // Convert hours to seconds
      intendedPayer: {
        partyIdType: "MSISDN",
        partyId: cleanPhoneNumber.replace('+', '') // Remove + for MTN API
      },
      payee: {
        partyIdType: "MSISDN", 
        partyId: payeeMsisdn || "4611234567" // Default payee for sandbox
      },
      description
    };

    await logDebug('info', 'Sending invoice creation to MTN MoMo v2.0 API', {
      url: 'https://sandbox.momodeveloper.mtn.com/collection/v2_0/invoice',
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ***',
        'X-Reference-Id': referenceId,
        'X-Target-Environment': 'sandbox',
        'Ocp-Apim-Subscription-Key': MTN_PRIMARY_KEY ? 'configured' : 'missing',
        'Content-Type': 'application/json',
      },
      payload: {
        ...invoicePayload,
        intendedPayer: { ...invoicePayload.intendedPayer, partyId: invoicePayload.intendedPayer.partyId.substring(0, 5) + '***' }
      }
    }, user.id);

    const invoiceResponse = await fetch('https://sandbox.momodeveloper.mtn.com/collection/v2_0/invoice', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'X-Reference-Id': referenceId,
        'X-Target-Environment': 'sandbox',
        'Ocp-Apim-Subscription-Key': MTN_PRIMARY_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(invoicePayload),
    });

    await logDebug('info', 'Invoice response received', {
      status: invoiceResponse.status,
      statusText: invoiceResponse.statusText,
      ok: invoiceResponse.ok,
      headers: Object.fromEntries(invoiceResponse.headers.entries()),
    }, user.id);

    if (!invoiceResponse.ok) {
      const errorText = await invoiceResponse.text();
      await logDebug('error', 'Failed to create invoice', { 
        status: invoiceResponse.status,
        statusText: invoiceResponse.statusText,
        error: errorText,
        headers: Object.fromEntries(invoiceResponse.headers.entries()),
        payload: {
          ...invoicePayload,
          intendedPayer: { ...invoicePayload.intendedPayer, partyId: invoicePayload.intendedPayer.partyId.substring(0, 5) + '***' }
        }
      }, user.id);
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Failed to create invoice',
        details: errorText
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Try to parse response body
    let responseData = null;
    try {
      const responseText = await invoiceResponse.text();
      if (responseText) {
        responseData = JSON.parse(responseText);
        await logDebug('info', 'Invoice response data', responseData, user.id);
      } else {
        await logDebug('info', 'Invoice response empty body', {}, user.id);
      }
    } catch (parseError) {
      await logDebug('warn', 'Could not parse invoice response body', { parseError }, user.id);
    }

    await logDebug('info', 'Invoice created successfully', { 
      referenceId,
      externalId: invoicePayload.externalId,
      responseData 
    }, user.id);

    // Update payment record if paymentId provided
    if (paymentId) {
      await logDebug('info', 'Updating payment record', { paymentId, referenceId });
      
      const { error: updateError } = await authSupabase
        .from('payments')
        .update({
          status: 'pending',
          payment_method: 'MTN Mobile Money',
          momo_reference_id: referenceId,
          momo_invoice_status: 'CREATED',
          updated_at: new Date().toISOString()
        })
        .eq('id', paymentId);

      if (updateError) {
        await logDebug('error', 'Failed to update payment record', { updateError, paymentId });
      } else {
        await logDebug('info', 'Payment record updated successfully');
      }
    }

    await logDebug('info', 'Invoice creation completed successfully', { referenceId });

    return new Response(JSON.stringify({
      success: true,
      referenceId,
      externalId: invoicePayload.externalId,
      message: 'Invoice created successfully'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : undefined;
    
    await logDebug('error', 'Error in mtn-momo-invoice-CreateInvoice function', {
      error: errorMessage,
      stack: errorStack
    });
    
    console.error('Error in mtn-momo-invoice-CreateInvoice function:', error);
    return new Response(JSON.stringify({ 
      success: false,
      error: errorMessage 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});