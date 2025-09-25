import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

type DashboardSummary = {
  totalProperties: number;
  activeTenants: number;
  monthlyRevenue: number;
  paymentRequests: number;
  collectionRatePercent: number;
};

export function useDashboardSummary() {
  return useQuery({
    queryKey: ['dashboard-summary'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_dashboard_summary' as any);
      if (error) throw error;
      return data as DashboardSummary;
    }
  });
}