-- Add unique constraint to enforce one-to-one relationship between properties and tenants
-- This prevents multiple properties from being assigned to the same tenant
ALTER TABLE properties 
ADD CONSTRAINT unique_tenant_id UNIQUE (tenant_id);