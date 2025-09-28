import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};

const SUB_KEY = Deno.env.get('MOMO_SUBSCRIPTION_KEY') ?? Deno.env.get('MTN_PRIMARY_KEY');
const API_USER = Deno.env.get('MOMO_API_USER') ?? Deno.env.get('MTN_USER_REFERENCE_ID');
const API_KEY  = Deno.env.get('MOMO_API_KEY')  ?? Deno.env.get('MTN_USER_API_KEY');
const TARGET   = Deno.env.get('MOMO_TARGET_ENV') ?? 'sandbox';

async function logDebug(level: string, message: string, metadata?: any) {
  try {
    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    await supabase.from('debug_logs').insert({ function_name: 'mtn-momo-cancel-invoice', level, message, metadata });
  } catch (_) {}
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  try {
    if (!SUB_KEY || !API_USER || !API_KEY) throw new Error('Missing MoMo credentials');

    const { paymentId, referenceId, externalId } = await req.json();

    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

    // Resolve referenceId from payment if needed
    let ref = referenceId as string | undefined;
    let extId = externalId as string | undefined;

    if (!ref && paymentId) {
      const { data, error } = await supabase.from('payments').select('momo_reference_id, momo_external_id').eq('id', paymentId).single();
      if (error || !data?.momo_reference_id) throw new Error('No momo_reference_id for payment');
      ref = data.momo_reference_id;
      extId = extId ?? data.momo_external_id ?? paymentId;
    }

    if (!ref) throw new Error('referenceId or paymentId required');
    extId = extId ?? paymentId ?? crypto.randomUUID();

    await logDebug('info', 'CancelInvoice start', { ref, extId });

    // Token
    const tokenRes = await fetch('https://sandbox.momodeveloper.mtn.com/collection/token/', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${btoa(API_USER + ':' + API_KEY)}`,
        'Ocp-Apim-Subscription-Key': SUB_KEY!,
        'Content-Type': 'application/json'
      }
    });
    if (!tokenRes.ok) throw new Error(`Token error ${tokenRes.status}: ${await tokenRes.text()}`);
    const { access_token } = await tokenRes.json();

    // Cancel invoice
    const url = `https://sandbox.momodeveloper.mtn.com/collection/v2_0/invoice/${ref}`;
    const res = await fetch(url, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${access_token}`,
        'Ocp-Apim-Subscription-Key': SUB_KEY!,
        'X-Target-Environment': TARGET,
        'X-Reference-Id': ref,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ externalId: String(extId) })
    });

    const bodyText = await res.text();
    if (!res.ok) {
      await logDebug('error', 'CancelInvoice failed', { status: res.status, body: bodyText });
      throw new Error(`CancelInvoice error ${res.status}: ${bodyText}`);
    }

    // Update payment record if provided
    if (paymentId) {
      await supabase.from('payments').update({
        status: 'failed',
        momo_invoice_status: 'CANCELLED',
        updated_at: new Date().toISOString()
      }).eq('id', paymentId);
    }

    await logDebug('info', 'CancelInvoice ok', { ref });
    return new Response(JSON.stringify({ success: true, referenceId: ref, result: bodyText ? JSON.parse(bodyText) : {} }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e) {
    await logDebug('error', 'Unhandled error', { message: String(e) });
    return new Response(JSON.stringify({ success: false, error: String(e) }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});