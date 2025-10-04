-- Create trigger function to automatically sync property status with tenant_id
CREATE OR REPLACE FUNCTION public.sync_property_status()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  -- Automatically set status based on tenant_id
  IF NEW.tenant_id IS NULL THEN
    NEW.status = 'available';
  ELSE
    NEW.status = 'occupied';
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger to run before insert or update on properties
DROP TRIGGER IF EXISTS trigger_sync_property_status ON public.properties;
CREATE TRIGGER trigger_sync_property_status
  BEFORE INSERT OR UPDATE OF tenant_id
  ON public.properties
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_property_status();

-- One-time fix: Sync all existing property statuses with tenant_id
UPDATE public.properties
SET status = CASE 
  WHEN tenant_id IS NULL THEN 'available'
  ELSE 'occupied'
END
WHERE (tenant_id IS NULL AND status != 'available') 
   OR (tenant_id IS NOT NULL AND status != 'occupied');