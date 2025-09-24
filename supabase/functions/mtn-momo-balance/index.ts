import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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
    const MTN_PRIMARY_KEY = Deno.env.get('MTN_PRIMARY_KEY');
    const MTN_USER_REFERENCE_ID = Deno.env.get('MTN_USER_REFERENCE_ID');
    const MTN_USER_API_KEY = Deno.env.get('MTN_USER_API_KEY');

    if (!MTN_PRIMARY_KEY || !MTN_USER_REFERENCE_ID || !MTN_USER_API_KEY) {
      throw new Error('Missing MTN MoMo credentials');
    }

    console.log('Checking MTN MoMo account balance...');

    // Get account balance from MTN MoMo Collections API
    const response = await fetch('https://sandbox.momodeveloper.mtn.com/collection/v1_0/account/balance', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${MTN_USER_API_KEY}`,
        'X-Reference-Id': MTN_USER_REFERENCE_ID,
        'X-Target-Environment': 'sandbox',
        'Ocp-Apim-Subscription-Key': MTN_PRIMARY_KEY,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('MTN MoMo balance API error:', response.status, errorText);
      throw new Error(`MTN MoMo API error: ${response.status} - ${errorText}`);
    }

    const balanceData = await response.json();
    console.log('Account balance retrieved successfully:', balanceData);

    return new Response(JSON.stringify({
      success: true,
      balance: balanceData
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
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