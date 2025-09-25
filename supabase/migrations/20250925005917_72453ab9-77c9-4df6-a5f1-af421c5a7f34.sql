CREATE OR REPLACE FUNCTION public.get_dashboard_summary()
RETURNS jsonb
LANGUAGE sql
SECURITY DEFINER
SET search_path = public AS
$$
WITH
month_bounds AS (
  SELECT date_trunc('month', now()) AS start_ts,
         (date_trunc('month', now()) + interval '1 month') AS end_ts
),
totals AS (
  SELECT
    (SELECT count(*) FROM public.properties p WHERE coalesce(p.status != 'inactive', true)) AS total_properties,
    (SELECT count(*) FROM public.tenants t WHERE coalesce(t.status = 'active', true)) AS active_tenants,
    (SELECT coalesce(sum(pmt.amount), 0) FROM public.payments pmt
       JOIN month_bounds mb ON true
      WHERE pmt.status = 'paid'
        AND pmt.paid_date >= mb.start_ts
        AND pmt.paid_date <  mb.end_ts) AS monthly_revenue,
    (SELECT count(*) FROM public.payments pmt
       JOIN month_bounds mb ON true
      WHERE pmt.created_at >= mb.start_ts
        AND pmt.created_at <  mb.end_ts) AS payment_requests,
    (SELECT count(*) FROM public.payments pmt
       JOIN month_bounds mb ON true
      WHERE pmt.status = 'paid'
        AND pmt.created_at >= mb.start_ts
        AND pmt.created_at <  mb.end_ts) AS successful_requests
)
SELECT jsonb_build_object(
  'totalProperties', total_properties,
  'activeTenants',   active_tenants,
  'monthlyRevenue',  monthly_revenue,
  'paymentRequests', payment_requests,
  'collectionRatePercent',
    CASE WHEN payment_requests = 0 THEN 0
         ELSE round(100.0 * successful_requests::numeric / payment_requests::numeric, 2)
    END
)
FROM totals;
$$;

-- Optional RLS-friendly wrapper: allow authenticated users to call it
REVOKE ALL ON FUNCTION public.get_dashboard_summary() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_dashboard_summary() TO authenticated;