-- Remove the overly permissive policy on payments table
DROP POLICY IF EXISTS "Allow all operations on payments" ON public.payments;

-- Create a security definer function to get current user role to avoid RLS recursion
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS TEXT AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE SQL SECURITY DEFINER STABLE SET search_path = public;

-- Update tenants table policies to require property manager role (admin)
DROP POLICY IF EXISTS "Authenticated users can view tenants" ON public.tenants;
DROP POLICY IF EXISTS "Authenticated users can insert tenants" ON public.tenants;
DROP POLICY IF EXISTS "Authenticated users can update tenants" ON public.tenants;
DROP POLICY IF EXISTS "Authenticated users can delete tenants" ON public.tenants;

-- Create role-based policies for tenants table (property managers only)
CREATE POLICY "Property managers can view tenants" 
ON public.tenants 
FOR SELECT 
TO authenticated
USING (public.get_current_user_role() = 'admin');

CREATE POLICY "Property managers can insert tenants" 
ON public.tenants 
FOR INSERT 
TO authenticated
WITH CHECK (public.get_current_user_role() = 'admin');

CREATE POLICY "Property managers can update tenants" 
ON public.tenants 
FOR UPDATE 
TO authenticated
USING (public.get_current_user_role() = 'admin')
WITH CHECK (public.get_current_user_role() = 'admin');

CREATE POLICY "Property managers can delete tenants" 
ON public.tenants 
FOR DELETE 
TO authenticated
USING (public.get_current_user_role() = 'admin');

-- Create role-based policies for payments table (property managers only)
CREATE POLICY "Property managers can view payments" 
ON public.payments 
FOR SELECT 
TO authenticated
USING (public.get_current_user_role() = 'admin');

CREATE POLICY "Property managers can insert payments" 
ON public.payments 
FOR INSERT 
TO authenticated
WITH CHECK (public.get_current_user_role() = 'admin');

CREATE POLICY "Property managers can update payments" 
ON public.payments 
FOR UPDATE 
TO authenticated
USING (public.get_current_user_role() = 'admin')
WITH CHECK (public.get_current_user_role() = 'admin');

CREATE POLICY "Property managers can delete payments" 
ON public.payments 
FOR DELETE 
TO authenticated
USING (public.get_current_user_role() = 'admin');