import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface MtnMomoBalance {
  availableBalance: string;
  currency: string;
}

interface PaymentRequest {
  phoneNumber: string;
  amount: number;
  tenantId?: string;
  paymentId?: string;
  externalId?: string;
}

interface InvoiceRequest {
  action: 'create' | 'status' | 'cancel';
  invoiceId?: string;
  amount?: number;
  phoneNumber?: string;
  description?: string;
}

export const useMtnMomo = () => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const getAccountBalance = async (): Promise<MtnMomoBalance | null> => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('mtn-momo-balance', {
        body: {}
      });

      if (error) throw error;

      if (!data.success) {
        throw new Error(data.error || 'Failed to get account balance');
      }

      toast({
        title: "Success",
        description: "Account balance retrieved successfully",
      });

      return data.balance;
    } catch (error) {
      console.error('Error getting MTN MoMo balance:', error);
      toast({
        title: "Error",
        description: "Failed to get account balance",
        variant: "destructive",
      });
      return null;
    } finally {
      setLoading(false);
    }
  };

  const requestPayment = async (request: PaymentRequest): Promise<string | null> => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('mtn-momo-request-payment', {
        body: request
      });

      if (error) throw error;

      if (!data.success) {
        throw new Error(data.error || 'Failed to request payment');
      }

      toast({
        title: "Success",
        description: "Payment request sent successfully",
      });

      return data.referenceId;
    } catch (error) {
      console.error('Error requesting MTN MoMo payment:', error);
      toast({
        title: "Error",
        description: "Failed to request payment",
        variant: "destructive",
      });
      return null;
    } finally {
      setLoading(false);
    }
  };

  const checkTransactionStatus = async (referenceId: string, paymentId?: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('mtn-momo-transaction-status', {
        body: { referenceId, paymentId }
      });

      if (error) throw error;

      if (!data.success) {
        throw new Error(data.error || 'Failed to check transaction status');
      }

      return data.transaction;
    } catch (error) {
      console.error('Error checking MTN MoMo transaction status:', error);
      toast({
        title: "Error",
        description: "Failed to check transaction status",
        variant: "destructive",
      });
      return null;
    } finally {
      setLoading(false);
    }
  };

  const manageInvoice = async (request: InvoiceRequest) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('mtn-momo-invoice', {
        body: request
      });

      if (error) throw error;

      if (!data.success) {
        throw new Error(data.error || 'Failed to manage invoice');
      }

      toast({
        title: "Success",
        description: `Invoice ${request.action} completed successfully`,
      });

      return data;
    } catch (error) {
      console.error('Error managing MTN MoMo invoice:', error);
      toast({
        title: "Error",
        description: `Failed to ${request.action} invoice`,
        variant: "destructive",
      });
      return null;
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    getAccountBalance,
    requestPayment,
    checkTransactionStatus,
    manageInvoice,
  };
};