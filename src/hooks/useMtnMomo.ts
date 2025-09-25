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

interface CreateInvoiceRequest {
  paymentId: string;
  amount: number;
  msisdn: string;
  validitySeconds?: number;
  description?: string;
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
      // Validate input parameters
      if (!request.phoneNumber || !request.amount) {
        throw new Error('Phone number and amount are required');
      }

      if (request.amount <= 0) {
        throw new Error('Amount must be greater than 0');
      }

      const { data, error } = await supabase.functions.invoke('mtn-momo-request-payment', {
        body: request
      });

      if (error) {
        console.error('Supabase function error:', error);
        throw new Error(`Request failed: ${error.message}`);
      }

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
      const errorMessage = error instanceof Error ? error.message : 'Failed to request payment';
      toast({
        title: "Error",
        description: errorMessage,
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
      // Validate UUID format
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(referenceId)) {
        throw new Error('Invalid reference ID format. Must be a valid UUID.');
      }

      const { data, error } = await supabase.functions.invoke('mtn-momo-transaction-status', {
        body: { referenceId, paymentId }
      });

      if (error) {
        console.error('Supabase function error:', error);
        throw new Error(`Status check failed: ${error.message}`);
      }

      if (!data.success) {
        throw new Error(data.error || 'Failed to check transaction status');
      }

      // Return standardized status
      const transaction = data.transaction;
      return {
        ...transaction,
        status: transaction.status?.toUpperCase(), // Normalize status
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error checking MTN MoMo transaction status:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to check transaction status';
      toast({
        title: "Error",
        description: errorMessage,
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

  const createInvoice = async (request: CreateInvoiceRequest): Promise<string | null> => {
    return await requestPayment({
      phoneNumber: request.msisdn,
      amount: request.amount,
      paymentId: request.paymentId,
    });
  };

  const getInvoiceStatus = async (request: { referenceId: string; paymentId?: string }) => {
    return await checkTransactionStatus(request.referenceId, request.paymentId);
  };

  return {
    loading,
    getAccountBalance,
    createInvoice,
    getInvoiceStatus,
    // Keep old names for backward compatibility
    requestPayment,
    checkTransactionStatus,
    manageInvoice,
  };
};