import { Payment } from '@/hooks/usePayments';

export type StatusDisplay = {
  displayText: string;
  badgeVariant: 'default' | 'secondary' | 'destructive' | 'outline';
  isExpired?: boolean;
};

/**
 * Determines payment status display based on MoMo status, due date, and error information
 */
export function getPaymentStatusDisplay(payment: Payment): StatusDisplay {
  const now = new Date();
  const dueDate = new Date(payment.due_date);
  const isExpired = now > dueDate;
  
  // Check for RequestToPay status first (used by Payments page)
  if (payment.momo_request_status) {
    switch (payment.momo_request_status) {
      case 'PENDING':
        if (isExpired) {
          return {
            displayText: 'Expired',
            badgeVariant: 'outline',
            isExpired: true
          };
        } else {
          return {
            displayText: 'Awaiting payment',
            badgeVariant: 'secondary'
          };
        }
        
      case 'SUCCESSFUL':
        return {
          displayText: 'Paid',
          badgeVariant: 'default'
        };
        
      case 'FAILED':
      case 'REJECTED':
        const requestErrorMessage = payment.momo_error_message || 'Payment failed';
        return {
          displayText: `Failed: ${requestErrorMessage}`,
          badgeVariant: 'destructive'
        };
        
      default:
        return {
          displayText: 'Processing',
          badgeVariant: 'secondary'
        };
    }
  }
  
  // Check for Invoice status (used by Invoices page)
  if (payment.momo_invoice_status) {
    switch (payment.momo_invoice_status) {
      case 'CREATED':
      case 'PENDING':
        if (isExpired) {
          return {
            displayText: 'Expired',
            badgeVariant: 'outline',
            isExpired: true
          };
        } else {
          return {
            displayText: 'Awaiting payment',
            badgeVariant: 'secondary'
          };
        }
        
      case 'SUCCESSFUL':
        return {
          displayText: 'Paid',
          badgeVariant: 'default'
        };
        
      case 'FAILED':
      case 'CANCELLED':
        const invoiceErrorMessage = payment.momo_error_message || 'Payment failed';
        return {
          displayText: `Failed: ${invoiceErrorMessage}`,
          badgeVariant: 'destructive'
        };
        
      default:
        return {
          displayText: 'Processing',
          badgeVariant: 'secondary'
        };
    }
  }
  
  // Fallback to local status for other cases
  switch (payment.status) {
    case 'paid':
      return {
        displayText: 'Paid',
        badgeVariant: 'default'
      };
    case 'failed':
      return {
        displayText: 'Failed',
        badgeVariant: 'destructive'
      };
    case 'expired':
      return {
        displayText: 'Expired',
        badgeVariant: 'outline',
        isExpired: true
      };
    case 'overdue':
    case 'pending':
    default:
      if (isExpired) {
        return {
          displayText: 'Expired',
          badgeVariant: 'outline',
          isExpired: true
        };
      } else {
        return {
          displayText: 'Awaiting payment',
          badgeVariant: 'secondary'
        };
      }
  }
}