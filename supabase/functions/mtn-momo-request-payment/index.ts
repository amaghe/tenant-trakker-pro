import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { phoneNumber, amount, tenantId, paymentId, externalId } = await req.json();

    const MTN_PRIMARY_KEY = Deno.env.get('MTN_PRIMARY_KEY');
    const MTN_USER_REFERENCE_ID = Deno.env.get('MTN_USER_REFERENCE_ID');
    const MTN_USER_API_KEY = Deno.env.get('MTN_USER_API_KEY');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!MTN_PRIMARY_KEY || !MTN_USER_REFERENCE_ID || !MTN_USER_API_KEY) {
      throw new Error('Missing MTN MoMo credentials');
    }

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    // Generate unique reference ID for this transaction
    const referenceId = externalId || crypto.randomUUID();

    console.log('Initiating MTN MoMo payment request...', {
      phoneNumber,
      amount,
      tenantId,
      paymentId,
      referenceId
    });

    // First, get bearer token for authentication
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
      console.error('MTN MoMo token API error:', tokenResponse.status, tokenError);
      throw new Error(`MTN MoMo token error: ${tokenResponse.status} - ${tokenError}`);
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;
    
    console.log('Bearer token obtained for payment request');

    // Request payment from MTN MoMo Collections API
    const requestBody = {
      amount: amount.toString(),
      currency: "EUR", // Use EUR for sandbox, or UGX for Uganda production
      externalId: referenceId,
      payer: {
        partyIdType: "MSISDN",
        partyId: phoneNumber
      },
      payerMessage: "Rent payment",
      payeeNote: "Property rent collection"
    };

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
      console.error('MTN MoMo request payment API error:', response.status, errorText);
      throw new Error(`MTN MoMo API error: ${response.status} - ${errorText}`);
    }

    console.log('Payment request initiated successfully');

    // Update payment record with MTN transaction reference
    if (paymentId) {
      const { error: updateError } = await supabase
        .from('payments')
        .update({ 
          status: 'pending',
          payment_method: 'mtn_mobile_money',
          updated_at: new Date().toISOString()
        })
        .eq('id', paymentId);

      if (updateError) {
        console.error('Error updating payment record:', updateError);
      }
    }

    return new Response(JSON.stringify({
      success: true,
      referenceId,
      message: 'Payment request sent successfully'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in mtn-momo-request-payment function:', error);
    return new Response(JSON.stringify({ 
      success: false,
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});