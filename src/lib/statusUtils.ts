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
  
  // Handle different MTN MoMo statuses
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
      const errorMessage = payment.momo_error_message || 'Payment failed';
      return {
        displayText: `Failed: ${errorMessage}`,
        badgeVariant: 'destructive'
      };
      
    default:
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
}