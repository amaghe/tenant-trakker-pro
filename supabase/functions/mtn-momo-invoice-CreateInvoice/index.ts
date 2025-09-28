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
    // Get the authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      await logDebug('error', 'Missing authorization header');
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Create Supabase client and get user
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
    
    if (!supabaseUrl || !supabaseAnonKey) {
      await logDebug('error', 'Missing Supabase configuration');
      return new Response(
        JSON.stringify({ error: 'Server configuration error' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      await logDebug('error', 'Authentication failed', { authError });
      return new Response(
        JSON.stringify({ error: 'Authentication failed' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    await logDebug('info', 'Starting MTN MoMo CreateInvoice', { userId: user.id });

    // Check user role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile || profile.role !== 'admin') {
      await logDebug('error', 'Insufficient permissions', { userId: user.id, role: profile?.role });
      return new Response(
        JSON.stringify({ error: 'Insufficient permissions' }),
        { 
          status: 403, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Parse request body
    const body = await req.json();
    const { 
      paymentId, 
      amount, 
      msisdn, 
      validityDuration = 24, 
      description = "Invoice",
      payeeMsisdn 
    } = body;

    if (!amount || !msisdn) {
      await logDebug('error', 'Missing required fields', { paymentId, amount: !!amount, msisdn: !!msisdn });
      return new Response(
        JSON.stringify({ error: 'Missing required fields: amount and msisdn' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Clean phone number for sandbox environment
    let cleanPhoneNumber = msisdn.replace(/\D/g, '');
    if (cleanPhoneNumber.startsWith('1')) {
      cleanPhoneNumber = '+46114699151'; // Sandbox number
    } else if (!cleanPhoneNumber.startsWith('+')) {
      cleanPhoneNumber = '+' + cleanPhoneNumber;
    }

    await logDebug('info', 'Invoice creation details received', {
      phoneNumber: msisdn.substring(0, 7) + '***',
      cleanPhoneNumber: cleanPhoneNumber.substring(0, 7) + '***',
      amount,
      paymentId,
      validityDuration,
      description
    });

    // Get MTN MoMo configuration
    const mtnPrimaryKey = Deno.env.get('MTN_PRIMARY_KEY');
    const mtnUserApiKey = Deno.env.get('MTN_USER_API_KEY');
    const mtnUserReferenceId = Deno.env.get('MTN_USER_REFERENCE_ID');
    const mtnCallbackUrl = Deno.env.get('MTN_CALLBACK_URL');

    if (!mtnPrimaryKey || !mtnUserApiKey || !mtnUserReferenceId) {
      await logDebug('error', 'Missing MTN MoMo configuration');
      return new Response(
        JSON.stringify({ error: 'MTN MoMo configuration not found' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Generate reference ID
    const referenceId = crypto.randomUUID();
    await logDebug('info', 'Generated reference ID for invoice', { referenceId });

    // Get access token
    await logDebug('info', 'Requesting bearer token from MTN MoMo API');
    const tokenResponse = await fetch('https://sandbox.momodeveloper.mtn.com/collection/token/', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${btoa(`${mtnUserReferenceId}:${mtnUserApiKey}`)}`,
        'Ocp-Apim-Subscription-Key': mtnPrimaryKey,
        'Content-Type': 'application/json',
      },
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      await logDebug('error', 'Failed to obtain bearer token', { 
        status: tokenResponse.status, 
        error: errorText 
      });
      return new Response(
        JSON.stringify({ error: 'Failed to obtain access token' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;
    await logDebug('info', 'Bearer token obtained successfully');

    // Create invoice using v2.0 API
    const invoicePayload = {
      externalId: paymentId || crypto.randomUUID(),
      amount: amount.toString(),
      currency: "EUR",
      validityDuration: (validityDuration * 3600).toString(), // Convert hours to seconds
      intendedPayer: {
        partyIdType: "MSISDN",
        partyId: cleanPhoneNumber
      },
      payee: {
        partyIdType: "MSISDN", 
        partyId: payeeMsisdn || "+4611234567" // Default payee for sandbox
      },
      description
    };

    await logDebug('info', 'Sending invoice creation to MTN MoMo v2.0 API', {
      ...invoicePayload,
      intendedPayer: { ...invoicePayload.intendedPayer, partyId: invoicePayload.intendedPayer.partyId.substring(0, 7) + '***' }
    });

    const invoiceHeaders: Record<string, string> = {
      'Authorization': `Bearer ${accessToken}`,
      'X-Reference-Id': referenceId,
      'X-Target-Environment': 'sandbox',
      'Ocp-Apim-Subscription-Key': mtnPrimaryKey,
      'Content-Type': 'application/json',
    };

    if (mtnCallbackUrl) {
      invoiceHeaders['X-Callback-Url'] = mtnCallbackUrl;
    }

    const invoiceResponse = await fetch('https://sandbox.momodeveloper.mtn.com/collection/v2_0/invoice', {
      method: 'POST',
      headers: invoiceHeaders,
      body: JSON.stringify(invoicePayload),
    });

    if (!invoiceResponse.ok) {
      const errorText = await invoiceResponse.text();
      await logDebug('error', 'Failed to create invoice', { 
        status: invoiceResponse.status, 
        error: errorText 
      });
      return new Response(
        JSON.stringify({ error: 'Failed to create invoice' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    await logDebug('info', 'Invoice created successfully', { referenceId });

    // Update payment record if paymentId provided
    if (paymentId) {
      await logDebug('info', 'Updating payment record', { paymentId, referenceId });
      
      const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
      const serviceSupabase = createClient(supabaseUrl, supabaseServiceKey!);
      
      const { error: updateError } = await serviceSupabase
        .from('payments')
        .update({
          momo_reference_id: referenceId,
          momo_invoice_status: 'PENDING',
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

    return new Response(
      JSON.stringify({ 
        success: true, 
        referenceId,
        externalId: invoicePayload.externalId
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    await logDebug('error', 'Unexpected error in invoice creation', { error: errorMessage });
    console.error('Error creating invoice:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});