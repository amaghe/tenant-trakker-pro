import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-webhook-secret',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get Supabase credentials from environment
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    // Get webhook secret for validation
    const webhookSecret = Deno.env.get('MOMO_WEBHOOK_SECRET');
    
    if (!supabaseUrl || !supabaseServiceKey) {
      return new Response(JSON.stringify({ error: 'Server configuration error' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Validate webhook secret is mandatory for security
    if (!webhookSecret) {
      return new Response(JSON.stringify({ error: 'Webhook secret not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Validate webhook secret from request headers
    const providedSecret = req.headers.get('X-Webhook-Secret');
    if (!providedSecret || providedSecret !== webhookSecret) {
      return new Response(JSON.stringify({ error: 'Unauthorized webhook request' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

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
      
      // Log the error
      await supabase.from('debug_logs').insert({
        function_name: 'mtn-momo-callback',
        level: 'error',
        message: 'Missing externalId in callback',
        metadata: {
          request_headers: Object.fromEntries(req.headers.entries()),
          request_body: callbackData
        }
      });

      return new Response(JSON.stringify({ 
        error: 'Missing externalId in callback' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Find the payment record by momo_external_id
    const { data: payment, error: findError } = await supabase
      .from('payments')
      .select('*')
      .eq('momo_external_id', externalId)
      .single();

    if (findError || !payment) {
      console.error('Payment not found for externalId:', externalId);
      
      // Log the error
      await supabase.from('debug_logs').insert({
        function_name: 'mtn-momo-callback',
        level: 'error',
        message: 'Payment not found for externalId',
        metadata: {
          external_id: externalId,
          request_headers: Object.fromEntries(req.headers.entries()),
          request_body: callbackData,
          find_error: findError
        }
      });

      return new Response(JSON.stringify({ 
        error: 'Payment not found' 
      }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Determine payment status and updates
    let paymentStatus = payment.status;
    let paidDate = payment.paid_date;
    let momoFinancialTransactionId = payment.momo_financial_transaction_id;
    let outcome = 'no_change';

    if (['SUCCESSFUL', 'SUCCESS', 'paid'].includes(status)) {
      paymentStatus = 'paid';
      paidDate = new Date().toISOString().split('T')[0];
      if (financialTransactionId) {
        momoFinancialTransactionId = financialTransactionId;
      }
      outcome = 'marked_paid';
    } else if (['FAILED', 'REJECTED', 'DECLINED'].includes(status)) {
      paymentStatus = 'failed';
      outcome = 'marked_failed';
    }

    // Update the payment record
    const { error: updateError } = await supabase
      .from('payments')
      .update({
        status: paymentStatus,
        paid_date: paidDate,
        momo_financial_transaction_id: momoFinancialTransactionId
      })
      .eq('id', payment.id);

    if (updateError) {
      console.error('Failed to update payment:', updateError);
      
      // Log the error
      await supabase.from('debug_logs').insert({
        function_name: 'mtn-momo-callback',
        level: 'error',
        message: 'Failed to update payment',
        metadata: {
          payment_id: payment.id,
          external_id: externalId,
          update_error: updateError,
          request_headers: Object.fromEntries(req.headers.entries()),
          request_body: callbackData
        }
      });

      return new Response(JSON.stringify({ 
        error: 'Failed to update payment' 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Log successful processing
    await supabase.from('debug_logs').insert({
      function_name: 'mtn-momo-callback',
      level: 'info',
      message: 'Callback processed successfully',
      metadata: {
        payment_id: payment.id,
        external_id: externalId,
        momo_status: status,
        outcome: outcome,
        request_headers: Object.fromEntries(req.headers.entries()),
        request_body: callbackData
      }
    });

    console.log(`Payment ${payment.id} updated to status: ${paymentStatus}`);

    return new Response(JSON.stringify({
      ok: true
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error in mtn-momo-callback function:', error);
    
    // Try to log the error
    try {
      const errorLogUrl = Deno.env.get('SUPABASE_URL');
      const errorLogKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
      if (errorLogUrl && errorLogKey) {
        const errorSupabase = createClient(errorLogUrl, errorLogKey);
        
        await errorSupabase.from('debug_logs').insert({
          function_name: 'mtn-momo-callback',
          level: 'error',
          message: 'Unhandled error in callback function',
          metadata: {
            error: errorMessage,
            stack: error instanceof Error ? error.stack : undefined
          }
        });
      }
    } catch (logError) {
      console.error('Failed to log error:', logError);
    }

    return new Response(JSON.stringify({ 
      error: errorMessage 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});