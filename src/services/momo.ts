import { supabase } from '@/integrations/supabase/client';

export type CreateInvoiceArgs = {
  paymentId: string;
  amount: number | string;
  msisdn: string;
  validityDuration?: number; // Duration in hours
  description?: string;
  payeeMsisdn?: string;
};

export type GetInvoiceStatusArgs = { paymentId?: string; referenceId?: string; };
export type CancelInvoiceArgs = { paymentId?: string; referenceId?: string; externalId?: string };

export async function createInvoice(args: CreateInvoiceArgs) {
  console.log('=== CALLING MTN MOMO INVOICE FUNCTION ===');
  console.log('Function name: mtn-momo-invoice-CreateInvoice');
  console.log('Arguments:', args);
  
  try {
    const { data, error } = await supabase.functions.invoke('mtn-momo-invoice-CreateInvoice', { body: args });
    
    console.log('Function response - data:', data);
    console.log('Function response - error:', error);
    
    if (error) {
      console.error('Function invocation error:', error);
      throw error;
    }
    
    return data as { success: boolean; referenceId: string; externalId: string };
  } catch (err) {
    console.error('Error in createInvoice:', err);
    throw err;
  }
}

export async function getInvoiceStatus(args: GetInvoiceStatusArgs) {
  const { data, error } = await supabase.functions.invoke('mtn-momo-invoice-status', { body: args });
  if (error) throw error;
  return data as { success: boolean; referenceId: string; status: string; raw?: any };
}

export async function cancelInvoice(args: CancelInvoiceArgs) {
  const { data, error } = await supabase.functions.invoke('mtn-momo-cancel-invoice', { body: args });
  if (error) throw error;
  return data as { success: boolean; referenceId?: string; result?: any };
}