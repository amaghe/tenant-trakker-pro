import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export const usePaymentNotifications = () => {
  const { toast } = useToast();

  useEffect(() => {
    // Set up real-time subscription for payment updates to show notifications
    const channel = supabase
      .channel('payment-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'payments'
        },
        (payload) => {
          const payment = payload.new;
          if (payment.payment_method === 'MTN Mobile Money' && payment.status === 'pending') {
            toast({
              title: "Payment Request Sent",
              description: `MTN MoMo payment request sent for ₦${payment.amount.toLocaleString()}`,
              duration: 5000,
            });
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'payments'
        },
        (payload) => {
          const oldPayment = payload.old;
          const newPayment = payload.new;
          
          // Notify when payment status changes to paid
          if (oldPayment.status !== 'paid' && newPayment.status === 'paid') {
            toast({
              title: "Payment Received",
              description: `Payment of ₦${newPayment.amount.toLocaleString()} has been received`,
              duration: 5000,
            });
          }
          
          // Notify when payment becomes overdue
          if (oldPayment.status !== 'overdue' && newPayment.status === 'overdue') {
            toast({
              title: "Payment Overdue",
              description: `Payment of ₦${newPayment.amount.toLocaleString()} is now overdue`,
              variant: "destructive",
              duration: 5000,
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [toast]);
};

export default usePaymentNotifications;