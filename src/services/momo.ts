import { supabase } from '@/integrations/supabase/client';

export type CreateInvoiceArgs = {
  paymentId: string;
  amount: number | string;
  msisdn: string;
  validitySeconds?: number;
  description?: string;
  payeeMsisdn?: string;
};

export type GetInvoiceStatusArgs = { paymentId?: string; referenceId?: string; };
export type CancelInvoiceArgs = { paymentId?: string; referenceId?: string; externalId?: string };

export async function createInvoice(args: CreateInvoiceArgs) {
  const { data, error } = await supabase.functions.invoke('mtn-momo-create-invoice', { body: args });
  if (error) throw error;
  return data as { success: boolean; referenceId: string; externalId: string };
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