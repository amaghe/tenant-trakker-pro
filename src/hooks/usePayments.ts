import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface Payment {
  id: string;
  tenant_id: string;
  property_id: string;
  amount: number;
  status: 'paid' | 'pending' | 'overdue';
  payment_method: string;
  due_date: string;
  paid_date?: string;
  momo_reference_id?: string;
  momo_invoice_status?: string;
  tenant?: {
    name: string;
    phone: string;
  };
  property?: {
    name: string;
    address: string;
  };
  created_at?: string;
  updated_at?: string;
}

export const usePayments = () => {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchPayments = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('payments')
        .select(`
          *,
          tenants(name, phone),
          properties(name, address)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const formattedPayments = data?.map(payment => ({
        ...payment,
        status: payment.status as 'paid' | 'pending' | 'overdue',
        tenant: payment.tenants ? { name: payment.tenants.name, phone: payment.tenants.phone } : undefined,
        property: payment.properties ? {
          name: payment.properties.name,
          address: payment.properties.address
        } : undefined
      })) || [];

      setPayments(formattedPayments);
    } catch (error) {
      console.error('Error fetching payments:', error);
      toast({
        title: "Error",
        description: "Failed to fetch payments",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const addPayment = async (paymentData: Omit<Payment, 'id'>, showToast = true) => {
    try {
      const { data, error } = await supabase
        .from('payments')
        .insert([paymentData])
        .select()
        .single();

      if (error) throw error;

      await fetchPayments(); // Refetch to get tenant/property data
      
      if (showToast) {
        toast({
          title: "Success",
          description: "Payment added successfully",
        });
      }
      
      return data;
    } catch (error) {
      console.error('Error adding payment:', error);
      if (showToast) {
        toast({
          title: "Error",
          description: "Failed to add payment",
          variant: "destructive",
        });
      }
      throw error;
    }
  };

  const updatePayment = async (id: string, updates: Partial<Payment>) => {
    try {
      const { data, error } = await supabase
        .from('payments')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      await fetchPayments(); // Refetch to get updated data
      toast({
        title: "Success",
        description: "Payment updated successfully",
      });
      return data;
    } catch (error) {
      console.error('Error updating payment:', error);
      toast({
        title: "Error",
        description: "Failed to update payment",
        variant: "destructive",
      });
      throw error;
    }
  };

  const deletePayment = async (id: string) => {
    try {
      const { error } = await supabase
        .from('payments')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setPayments(prev => prev.filter(p => p.id !== id));
      toast({
        title: "Success",
        description: "Payment deleted successfully",
      });
    } catch (error) {
      console.error('Error deleting payment:', error);
      toast({
        title: "Error",
        description: "Failed to delete payment",
        variant: "destructive",
      });
      throw error;
    }
  };

  useEffect(() => {
    fetchPayments();

    // Set up real-time subscription for payment updates
    const channel = supabase
      .channel('payments-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'payments'
        },
        (payload) => {
          console.log('Payment change received:', payload);
          fetchPayments(); // Refetch all payments when any change occurs
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return {
    payments,
    loading,
    addPayment,
    updatePayment,
    deletePayment,
    refetch: fetchPayments
  };
};