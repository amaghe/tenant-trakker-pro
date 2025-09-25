import { supabase } from '@/integrations/supabase/client';

interface CreatePaymentRequest {
  msisdn: string;
  amount: number;
  currency?: string;
  external_id?: string;
  payer_message?: string;
  payee_note?: string;
  tenantId?: string;
  paymentId?: string;
}

interface PaymentStatus {
  status: 'PENDING' | 'SUCCESSFUL' | 'FAILED' | 'REJECTED' | 'ONGOING';
  amount?: string;
  currency?: string;
  financialTransactionId?: string;
  externalId?: string;
  payer?: {
    partyIdType?: string;
    partyId?: string;
  };
  payerMessage?: string;
  payeeNote?: string;
  checkedAt?: string;
}

/**
 * Self-contained MTN Mobile Money service for creating payments and checking status
 */
export class MtnMomoService {
  private static instance: MtnMomoService;

  private constructor() {}

  public static getInstance(): MtnMomoService {
    if (!MtnMomoService.instance) {
      MtnMomoService.instance = new MtnMomoService();
    }
    return MtnMomoService.instance;
  }

  /**
   * Validates phone number format (MSISDN)
   */
  private validateMsisdn(msisdn: string): boolean {
    // Remove all non-digit characters except +
    const cleaned = msisdn.replace(/[^\d+]/g, '');
    
    // Check if it's a valid international format
    const internationalRegex = /^\+[1-9]\d{1,14}$/;
    
    return internationalRegex.test(cleaned);
  }

  /**
   * Validates UUID format
   */
  private validateUUID(uuid: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
  }

  /**
   * Create an invoice
   * @param request Invoice creation parameters
   * @returns Promise<string | null> Returns reference ID on success, null on failure
   */
  public async create_invoice(
    msisdn: string,
    amount: number,
    currency: string = 'EUR',
    external_id?: string,
    payer_msg?: string,
    payee_note?: string
  ): Promise<string | null> {
    try {
      // Input validation
      if (!msisdn || !amount) {
        throw new Error('MSISDN and amount are required');
      }

      if (!this.validateMsisdn(msisdn)) {
        throw new Error('Invalid MSISDN format. Must be in international format (e.g., +256123456789)');
      }

      if (amount <= 0) {
        throw new Error('Amount must be greater than 0');
      }

      if (currency && !['EUR', 'UGX', 'USD'].includes(currency.toUpperCase())) {
        throw new Error('Invalid currency. Supported: EUR, UGX, USD');
      }

      const request: CreatePaymentRequest = {
        msisdn,
        amount,
        currency: currency.toUpperCase(),
        external_id,
        payer_message: payer_msg,
        payee_note
      };

      console.log('Creating MTN MoMo invoice:', {
        msisdn: msisdn.substring(0, 5) + '***',
        amount,
        currency: request.currency
      });

      const { data, error } = await supabase.functions.invoke('mtn-momo-request-payment', {
        body: {
          phoneNumber: request.msisdn,
          amount: request.amount,
          currency: request.currency,
          externalId: request.external_id,
          payerMessage: request.payer_message,
          payeeNote: request.payee_note,
          tenantId: request.tenantId,
          paymentId: request.paymentId
        }
      });

      if (error) {
        console.error('Supabase function error:', error);
        throw new Error(`Invoice creation failed: ${error.message}`);
      }

      if (!data?.success) {
        throw new Error(data?.error || 'Invoice creation failed');
      }

      console.log('Invoice created successfully:', data.referenceId?.substring(0, 8) + '***');
      return data.referenceId;

    } catch (error) {
      console.error('Error in create_invoice:', error);
      throw error;
    }
  }

  /**
   * Get invoice status by reference ID
   * @param reference_id The invoice reference ID (UUID)
   * @returns Promise<PaymentStatus | null> Returns invoice status or null on failure
   */
  public async get_invoice_status(reference_id: string): Promise<PaymentStatus | null> {
    try {
      // Input validation
      if (!reference_id) {
        throw new Error('Reference ID is required');
      }

      if (!this.validateUUID(reference_id)) {
        throw new Error('Invalid reference ID format. Must be a valid UUID.');
      }

      console.log('Checking invoice status:', reference_id.substring(0, 8) + '***');

      const { data, error } = await supabase.functions.invoke('mtn-momo-transaction-status', {
        body: { referenceId: reference_id }
      });

      if (error) {
        console.error('Supabase function error:', error);
        throw new Error(`Status check failed: ${error.message}`);
      }

      if (!data?.success) {
        throw new Error(data?.error || 'Status check failed');
      }

      const transaction = data.transaction;
      
      // Normalize and validate the response
      const status: PaymentStatus = {
        status: transaction.status?.toUpperCase() as PaymentStatus['status'],
        amount: transaction.amount,
        currency: transaction.currency,
        financialTransactionId: transaction.financialTransactionId,
        externalId: transaction.externalId,
        payer: transaction.payer,
        payerMessage: transaction.payerMessage,
        payeeNote: transaction.payeeNote,
        checkedAt: transaction.checkedAt || new Date().toISOString()
      };

      console.log('Invoice status retrieved:', {
        status: status.status,
        amount: status.amount,
        currency: status.currency
      });

      return status;

    } catch (error) {
      console.error('Error in get_invoice_status:', error);
      throw error;
    }
  }

  /**
   * Convenience method to create invoice with all parameters
   */
  public async createInvoiceFull(request: CreatePaymentRequest): Promise<string | null> {
    return this.create_invoice(
      request.msisdn,
      request.amount,
      request.currency,
      request.external_id,
      request.payer_message,
      request.payee_note
    );
  }

  /**
   * Check if an invoice is completed (successful)
   */
  public async isInvoiceCompleted(reference_id: string): Promise<boolean> {
    try {
      const status = await this.get_invoice_status(reference_id);
      return status?.status === 'SUCCESSFUL';
    } catch (error) {
      console.error('Error checking if invoice completed:', error);
      return false;
    }
  }

  /**
   * Wait for invoice completion with polling
   * @param reference_id Reference ID to monitor
   * @param timeout_seconds Maximum time to wait (default: 300 seconds)
   * @param poll_interval_seconds How often to check (default: 5 seconds)
   */
  public async waitForInvoiceCompletion(
    reference_id: string,
    timeout_seconds: number = 300,
    poll_interval_seconds: number = 5
  ): Promise<PaymentStatus | null> {
    const startTime = Date.now();
    const timeoutMs = timeout_seconds * 1000;
    const pollIntervalMs = poll_interval_seconds * 1000;

    while (Date.now() - startTime < timeoutMs) {
      try {
        const status = await this.get_invoice_status(reference_id);
        
        if (!status) {
          throw new Error('Failed to get payment status');
        }

        if (status.status === 'SUCCESSFUL' || status.status === 'FAILED' || status.status === 'REJECTED') {
          return status;
        }

        // Wait before next poll
        await new Promise(resolve => setTimeout(resolve, pollIntervalMs));
        
      } catch (error) {
        console.error('Error during invoice polling:', error);
        throw error;
      }
    }

    throw new Error(`Invoice status check timed out after ${timeout_seconds} seconds`);
  }

  // Legacy methods for backward compatibility
  public async create_payment(
    msisdn: string,
    amount: number,
    currency: string = 'EUR',
    external_id?: string,
    payer_msg?: string,
    payee_note?: string
  ): Promise<string | null> {
    return this.create_invoice(msisdn, amount, currency, external_id, payer_msg, payee_note);
  }

  public async get_payment_status(reference_id: string): Promise<PaymentStatus | null> {
    return this.get_invoice_status(reference_id);
  }
}

// Export singleton instance
export const mtnMomoService = MtnMomoService.getInstance();

// Export types for external use
export type { CreatePaymentRequest, PaymentStatus };