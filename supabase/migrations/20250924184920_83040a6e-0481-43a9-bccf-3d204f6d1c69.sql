-- Remove the overly permissive policy that allows public access
DROP POLICY IF EXISTS "Allow all operations on tenants" ON public.tenants;

-- Create secure RLS policies that require authentication
CREATE POLICY "Authenticated users can view tenants" 
ON public.tenants 
FOR SELECT 
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can insert tenants" 
ON public.tenants 
FOR INSERT 
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can update tenants" 
ON public.tenants 
FOR UPDATE 
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Authenticated users can delete tenants" 
ON public.tenants 
FOR DELETE 
TO authenticated
USING (true);