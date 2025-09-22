import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface Tenant {
  id: string;
  property_id?: string;
  name: string;
  email: string;
  phone: string;
  rent: number;
  lease_start: string;
  lease_end: string;
  status: 'active' | 'overdue' | 'pending';
  avatar_url?: string;
  property?: {
    name: string;
    address: string;
  };
  created_at?: string;
  updated_at?: string;
}

export const useTenants = () => {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchTenants = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('tenants')
        .select(`
          *,
          properties(name, address)
        `);

      if (error) throw error;

      const formattedTenants = data?.map(tenant => ({
        ...tenant,
        status: tenant.status as 'active' | 'overdue' | 'pending',
        property: tenant.properties ? {
          name: tenant.properties.name,
          address: tenant.properties.address
        } : undefined
      })) || [];

      setTenants(formattedTenants);
    } catch (error) {
      console.error('Error fetching tenants:', error);
      toast({
        title: "Error",
        description: "Failed to fetch tenants",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const addTenant = async (tenantData: Omit<Tenant, 'id'>) => {
    try {
      const { data, error } = await supabase
        .from('tenants')
        .insert([tenantData])
        .select()
        .single();

      if (error) throw error;

      await fetchTenants(); // Refetch to get property data
      toast({
        title: "Success",
        description: "Tenant added successfully",
      });
      return data;
    } catch (error) {
      console.error('Error adding tenant:', error);
      toast({
        title: "Error",
        description: "Failed to add tenant",
        variant: "destructive",
      });
      throw error;
    }
  };

  const updateTenant = async (id: string, updates: Partial<Tenant>) => {
    try {
      const { data, error } = await supabase
        .from('tenants')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      await fetchTenants(); // Refetch to get updated property data
      toast({
        title: "Success",
        description: "Tenant updated successfully",
      });
      return data;
    } catch (error) {
      console.error('Error updating tenant:', error);
      toast({
        title: "Error",
        description: "Failed to update tenant",
        variant: "destructive",
      });
      throw error;
    }
  };

  const deleteTenant = async (id: string) => {
    try {
      const { error } = await supabase
        .from('tenants')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setTenants(prev => prev.filter(t => t.id !== id));
      toast({
        title: "Success",
        description: "Tenant deleted successfully",
      });
    } catch (error) {
      console.error('Error deleting tenant:', error);
      toast({
        title: "Error",
        description: "Failed to delete tenant",
        variant: "destructive",
      });
      throw error;
    }
  };

  useEffect(() => {
    fetchTenants();
  }, []);

  return {
    tenants,
    loading,
    addTenant,
    updateTenant,
    deleteTenant,
    refetch: fetchTenants
  };
};