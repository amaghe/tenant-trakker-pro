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
    const { referenceId, paymentId } = await req.json();

    const MTN_PRIMARY_KEY = Deno.env.get('MTN_PRIMARY_KEY');
    const MTN_USER_REFERENCE_ID = Deno.env.get('MTN_USER_REFERENCE_ID');
    const MTN_USER_API_KEY = Deno.env.get('MTN_USER_API_KEY');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!MTN_PRIMARY_KEY || !MTN_USER_REFERENCE_ID || !MTN_USER_API_KEY) {
      throw new Error('Missing MTN MoMo credentials');
    }

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    console.log('Checking MTN MoMo transaction status for reference:', referenceId);

    // Check transaction status from MTN MoMo Collections API
    const response = await fetch(`https://sandbox.momodeveloper.mtn.com/collection/v1_0/requesttopay/${referenceId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${MTN_USER_API_KEY}`,
        'X-Target-Environment': 'sandbox',
        'Ocp-Apim-Subscription-Key': MTN_PRIMARY_KEY,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('MTN MoMo transaction status API error:', response.status, errorText);
      throw new Error(`MTN MoMo API error: ${response.status} - ${errorText}`);
    }

    const transactionData = await response.json();
    console.log('Transaction status retrieved:', transactionData);

    // Update payment record based on transaction status
    if (paymentId && transactionData.status) {
      let paymentStatus = 'pending';
      let paidDate = null;

      switch (transactionData.status) {
        case 'SUCCESSFUL':
          paymentStatus = 'paid';
          paidDate = new Date().toISOString().split('T')[0];
          break;
        case 'FAILED':
          paymentStatus = 'failed';
          break;
        case 'PENDING':
          paymentStatus = 'pending';
          break;
        default:
          paymentStatus = 'pending';
      }

      const updateData: any = {
        status: paymentStatus,
        updated_at: new Date().toISOString()
      };

      if (paidDate) {
        updateData.paid_date = paidDate;
      }

      const { error: updateError } = await supabase
        .from('payments')
        .update(updateData)
        .eq('id', paymentId);

      if (updateError) {
        console.error('Error updating payment record:', updateError);
      }
    }

    return new Response(JSON.stringify({
      success: true,
      transaction: transactionData
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in mtn-momo-transaction-status function:', error);
    return new Response(JSON.stringify({ 
      success: false,
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});