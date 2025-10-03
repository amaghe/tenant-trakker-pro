-- Step 1: Add tenant_id column to properties table
ALTER TABLE public.properties
ADD COLUMN tenant_id uuid REFERENCES public.tenants(id) ON DELETE SET NULL;

-- Step 2: Migrate existing data from tenants.property_id to properties.tenant_id
UPDATE public.properties p
SET tenant_id = t.id
FROM public.tenants t
WHERE t.property_id = p.id;

-- Step 3: Remove property_id from tenants table
ALTER TABLE public.tenants
DROP COLUMN property_id;

-- Step 4: Add unique constraint to ensure one property can only have one tenant
ALTER TABLE public.properties
ADD CONSTRAINT properties_tenant_id_unique UNIQUE (tenant_id);