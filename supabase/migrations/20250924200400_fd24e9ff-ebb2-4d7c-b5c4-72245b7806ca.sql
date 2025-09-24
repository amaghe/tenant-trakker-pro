-- Remove the overly permissive policy on properties table
DROP POLICY IF EXISTS "Allow all operations on properties" ON public.properties;

-- Create role-based policies for properties table (property managers only)
CREATE POLICY "Property managers can view properties" 
ON public.properties 
FOR SELECT 
TO authenticated
USING (public.get_current_user_role() = 'admin');

CREATE POLICY "Property managers can insert properties" 
ON public.properties 
FOR INSERT 
TO authenticated
WITH CHECK (public.get_current_user_role() = 'admin');

CREATE POLICY "Property managers can update properties" 
ON public.properties 
FOR UPDATE 
TO authenticated
USING (public.get_current_user_role() = 'admin')
WITH CHECK (public.get_current_user_role() = 'admin');

CREATE POLICY "Property managers can delete properties" 
ON public.properties 
FOR DELETE 
TO authenticated
USING (public.get_current_user_role() = 'admin');