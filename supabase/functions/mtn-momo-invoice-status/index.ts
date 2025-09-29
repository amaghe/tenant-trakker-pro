import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SUB_KEY = Deno.env.get('MOMO_SUBSCRIPTION_KEY') ?? Deno.env.get('MTN_PRIMARY_KEY');
const API_USER = Deno.env.get('MOMO_API_USER') ?? Deno.env.get('MTN_USER_REFERENCE_ID');
const API_KEY = Deno.env.get('MOMO_API_KEY') ?? Deno.env.get('MTN_USER_API_KEY');
const TARGET = Deno.env.get('MOMO_TARGET_ENV') ?? 'sandbox';

async function logDebug(level: string, message: string, metadata?: any) {
  try {
    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    await supabase.from('debug_logs').insert({ function_name: 'mtn-momo-invoice-status', level, message, metadata });
  } catch (_) {}
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (!SUB_KEY || !API_USER || !API_KEY) {
      throw new Error('Missing MoMo credentials');
    }

    const { paymentId, referenceId } = await req.json();
    
    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

    // Resolve referenceId from payment if needed
    let ref = referenceId as string | undefined;
    
    if (!ref && paymentId) {
      const { data, error } = await supabase
        .from('payments')
        .select('momo_reference_id')
        .eq('id', paymentId)
        .single();
        
      if (error || !data?.momo_reference_id) {
        throw new Error('No momo_reference_id found for payment');
      }
      ref = data.momo_reference_id;
    }

    if (!ref) {
      throw new Error('referenceId or paymentId required');
    }

    await logDebug('info', 'Checking invoice status', { paymentId, referenceId: ref });

    // Get bearer token
    const tokenRes = await fetch('https://sandbox.momodeveloper.mtn.com/collection/token/', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${btoa(API_USER + ':' + API_KEY)}`,
        'Ocp-Apim-Subscription-Key': SUB_KEY!,
        'Content-Type': 'application/json'
      }
    });

    if (!tokenRes.ok) {
      const errorText = await tokenRes.text();
      await logDebug('error', 'Token request failed', { status: tokenRes.status, body: errorText });
      throw new Error(`Token error ${tokenRes.status}: ${errorText}`);
    }

    const { access_token } = await tokenRes.json();

    // Check invoice status
    const statusRes = await fetch(`https://sandbox.momodeveloper.mtn.com/collection/v2_0/invoice/${ref}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${access_token}`,
        'Ocp-Apim-Subscription-Key': SUB_KEY!,
        'X-Target-Environment': TARGET,
        'Content-Type': 'application/json'
      }
    });

    if (!statusRes.ok) {
      const errorText = await statusRes.text();
      await logDebug('error', 'Status check failed', { status: statusRes.status, body: errorText });
      throw new Error(`Status check error ${statusRes.status}: ${errorText}`);
    }

    const statusData = await statusRes.json();
    const invoiceStatus = statusData.status || 'UNKNOWN';

    await logDebug('info', 'Invoice status retrieved', { referenceId: ref, status: invoiceStatus, raw: statusData });

    // Update payment record with enhanced status mapping including expiry logic
    if (paymentId) {
      // First get the payment record to check due_date for expiry logic
      const { data: paymentData, error: fetchError } = await supabase
        .from('payments')
        .select('due_date')
        .eq('id', paymentId)
        .single();

      if (fetchError) {
        await logDebug('error', 'Failed to fetch payment for expiry check', { paymentId, error: fetchError });
      }

      const updateData: any = {
        momo_invoice_status: invoiceStatus,
        updated_at: new Date().toISOString()
      };

      // Enhanced Status Mapping with Expiry Logic
      const now = new Date();
      const dueDate = paymentData?.due_date ? new Date(paymentData.due_date) : null;
      const isExpired = dueDate && now > dueDate;

      if (invoiceStatus === 'CREATED' || invoiceStatus === 'PENDING') {
        if (isExpired) {
          updateData.status = 'expired';
          await logDebug('info', 'Payment marked as expired due to due_date', { 
            paymentId, 
            dueDate: paymentData?.due_date, 
            currentTime: now.toISOString() 
          });
        } else {
          updateData.status = 'pending';
        }
      } else if (invoiceStatus === 'SUCCESSFUL') {
        updateData.status = 'paid';
        updateData.paid_date = new Date().toISOString().split('T')[0];
        
        // Extract financial transaction ID from status data if available
        if (statusData?.financialTransactionId) {
          updateData.momo_financial_transaction_id = statusData.financialTransactionId;
        }
      } else if (invoiceStatus === 'FAILED' || invoiceStatus === 'CANCELLED') {
        updateData.status = 'failed';
        
        // Store error details for troubleshooting
        if (statusData?.reason) {
          updateData.momo_error_code = statusData.reason.code || null;
          updateData.momo_error_message = statusData.reason.message || null;
        }
      }

      const { error: updateError } = await supabase
        .from('payments')
        .update(updateData)
        .eq('id', paymentId);

      if (updateError) {
        await logDebug('error', 'Failed to update payment record', { paymentId, error: updateError });
      } else {
        await logDebug('info', 'Payment record updated with clean app status mapping', { 
          paymentId, 
          localStatus: updateData.status,
          momoStatus: invoiceStatus,
          financialTransactionId: updateData.momo_financial_transaction_id
        });
      }
    }

    return new Response(JSON.stringify({
      success: true,
      referenceId: ref,
      status: invoiceStatus,
      raw: statusData
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    await logDebug('error', 'Unhandled error', { message: String(error) });
    return new Response(JSON.stringify({
      success: false,
      error: String(error)
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});