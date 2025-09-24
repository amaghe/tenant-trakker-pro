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
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    // Parse the callback data from MTN MoMo
    const callbackData = await req.json();
    
    console.log('Received MTN MoMo callback:', callbackData);

    // Extract transaction details from callback
    const {
      externalId,
      status,
      amount,
      currency,
      financialTransactionId,
      reason
    } = callbackData;

    if (!externalId) {
      console.error('Missing externalId in callback');
      return new Response(JSON.stringify({ 
        success: false,
        error: 'Missing externalId in callback' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Find the payment record by external ID or other identifier
    // For now, we'll log the callback and update payments based on status
    let paymentStatus = 'pending';
    let paidDate = null;

    switch (status) {
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

    // You might want to create a transaction log table to store these callbacks
    console.log(`Transaction ${externalId} status updated to: ${paymentStatus}`);

    // If you have a way to map externalId to payment records, update them here
    // This would require storing the externalId when creating payment requests

    return new Response(JSON.stringify({
      success: true,
      message: 'Callback processed successfully',
      processedData: {
        externalId,
        status: paymentStatus,
        amount,
        currency,
        financialTransactionId
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in mtn-momo-callback function:', error);
    return new Response(JSON.stringify({ 
      success: false,
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});