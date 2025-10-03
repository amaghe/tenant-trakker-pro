import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface Property {
  id: string;
  name: string;
  address: string;
  type: string;
  bedrooms: number;
  bathrooms: number;
  size: number;
  rent: number;
  status: 'available' | 'occupied';
  tenant_id?: string;
  tenant?: string;
  created_at?: string;
  updated_at?: string;
}

export const useProperties = () => {
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchProperties = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('properties')
        .select(`
          *,
          tenants(name)
        `);

      if (error) throw error;

      const formattedProperties = data?.map(property => ({
        ...property,
        status: property.status as 'available' | 'occupied',
        tenant: property.tenants?.[0]?.name || undefined
      })) || [];

      setProperties(formattedProperties);
    } catch (error) {
      console.error('Error fetching properties:', error);
      toast({
        title: "Error",
        description: "Failed to fetch properties",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const addProperty = async (propertyData: Omit<Property, 'id'>) => {
    try {
      const { data, error } = await supabase
        .from('properties')
        .insert([propertyData])
        .select()
        .single();

      if (error) throw error;

      setProperties(prev => [...prev, { ...data, status: data.status as 'available' | 'occupied' }]);
      toast({
        title: "Success",
        description: "Property added successfully",
      });
      return data;
    } catch (error) {
      console.error('Error adding property:', error);
      toast({
        title: "Error",
        description: "Failed to add property",
        variant: "destructive",
      });
      throw error;
    }
  };

  const updateProperty = async (id: string, updates: Partial<Property>) => {
    try {
      // Remove joined fields and read-only fields
      const { tenant, created_at, updated_at, ...cleanUpdates } = updates as any;
      
      const { data, error } = await supabase
        .from('properties')
        .update(cleanUpdates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      await fetchProperties(); // Refetch to get updated tenant data
      toast({
        title: "Success",
        description: "Property updated successfully",
      });
      return data;
    } catch (error) {
      console.error('Error updating property:', error);
      toast({
        title: "Error",
        description: "Failed to update property",
        variant: "destructive",
      });
      throw error;
    }
  };

  const assignTenantToProperty = async (propertyId: string, tenantId: string | null) => {
    try {
      const { error } = await supabase
        .from('properties')
        .update({ tenant_id: tenantId })
        .eq('id', propertyId);

      if (error) throw error;

      await fetchProperties();
      toast({
        title: "Success",
        description: tenantId ? "Tenant assigned to property" : "Tenant removed from property",
      });
    } catch (error) {
      console.error('Error assigning tenant:', error);
      toast({
        title: "Error",
        description: "Failed to assign tenant to property",
        variant: "destructive",
      });
      throw error;
    }
  };

  const deleteProperty = async (id: string) => {
    try {
      const { error } = await supabase
        .from('properties')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setProperties(prev => prev.filter(p => p.id !== id));
      toast({
        title: "Success",
        description: "Property deleted successfully",
      });
    } catch (error) {
      console.error('Error deleting property:', error);
      toast({
        title: "Error",
        description: "Failed to delete property",
        variant: "destructive",
      });
      throw error;
    }
  };

  useEffect(() => {
    fetchProperties();
  }, []);

  return {
    properties,
    loading,
    addProperty,
    updateProperty,
    deleteProperty,
    assignTenantToProperty,
    refetch: fetchProperties
  };
};