-- Add deposit column to properties table
ALTER TABLE public.properties 
ADD COLUMN deposit numeric DEFAULT 0;

-- Migrate existing deposit data from tenants to their assigned properties
UPDATE public.properties p
SET deposit = t.deposit
FROM public.tenants t
WHERE p.tenant_id = t.id
  AND t.deposit IS NOT NULL;

-- Remove deposit column from tenants table
ALTER TABLE public.tenants 
DROP COLUMN deposit;