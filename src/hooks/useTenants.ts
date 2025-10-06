import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useProperties } from '@/hooks/useProperties';

export interface EmergencyContact {
  name: string;
  phone?: string;
  email?: string;
}

export interface Tenant {
  id: string;
  name: string;
  email: string;
  phone: string;
  rent: number;
  lease_start: string;
  lease_end: string;
  status: 'active' | 'inactive' | 'overdue' | 'pending';
  avatar_url?: string;
  emergency_contacts?: EmergencyContact[];
  id_document_url?: string;
  notes?: string;
  deposit?: number;
  lease_document_url?: string;
  properties?: properties;
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
          properties(id, name, address)
        `);

      if (error) throw error;

      const formattedTenants = data?.map(tenant => ({
        ...tenant,
        status: tenant.status as 'active' | 'inactive' | 'overdue' | 'pending',
        emergency_contacts: tenant.emergency_contacts ? 
          (Array.isArray(tenant.emergency_contacts) ? 
            tenant.emergency_contacts as unknown as EmergencyContact[] : 
            JSON.parse(tenant.emergency_contacts as string) as EmergencyContact[]) : [],
        properties: Array.isArray(tenant.properties) ? tenant.properties.map((p: any) => ({
          id: p.id,
          name: p.name,
          address: p.address
        })) : []
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
      // Extract property_id before inserting tenant
      const { property_id, ...cleanTenantData } = tenantData as any;
      
      const insertData = {
        ...cleanTenantData,
        emergency_contacts: JSON.stringify(cleanTenantData.emergency_contacts || [])
      };
      
      const { data, error } = await supabase
        .from('tenants')
        .insert([insertData])
        .select()
        .single();

      if (error) throw error;

      // Now assign property to this tenant
      if (property_id) {
        const { error: propertyError } = await supabase
          .from('properties')
          .update({ tenant_id: data.id })
          .eq('id', property_id);

        if (propertyError) {
          console.error('Error assigning property:', propertyError);
          // Don't throw - tenant was created successfully
        }
      }

      await fetchTenants(); // Refetch to get property data and ensure UI updates
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
      // Remove joined fields and read-only fields that shouldn't be updated
      const { properties, created_at, updated_at, property_id, ...cleanUpdates } = updates as any;
      
      const updateData = {
        ...cleanUpdates,
        emergency_contacts: updates.emergency_contacts ? JSON.stringify(updates.emergency_contacts) : undefined
      };
      
      const { data, error } = await supabase
        .from('tenants')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      // Handle property assignment
      if (property_id !== undefined) {
        // First, unassign current property if any
        await supabase
          .from('properties')
          .update({ tenant_id: null })
          .eq('tenant_id', id);

        // Then assign the new property if one was selected
        if (property_id) {
          const { error: propertyError } = await supabase
            .from('properties')
            .update({ tenant_id: id })
            .eq('id', property_id);

          if (propertyError) {
            console.error('Error assigning property:', propertyError);
          }
        }
      }

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
      // First, unassign all properties from this tenant
      await supabase
        .from('properties')
        .update({ tenant_id: null })
        .eq('tenant_id', id);

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