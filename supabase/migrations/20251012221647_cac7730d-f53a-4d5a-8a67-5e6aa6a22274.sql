-- Create enum for roles
CREATE TYPE public.app_role AS ENUM ('super_user', 'admin');

-- Create user_roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Create security definer function to get all user roles
CREATE OR REPLACE FUNCTION public.get_user_roles(_user_id UUID)
RETURNS SETOF public.app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role
  FROM public.user_roles
  WHERE user_id = _user_id
$$;

-- Migrate existing role data from profiles to user_roles
INSERT INTO public.user_roles (user_id, role)
SELECT id, role::public.app_role
FROM public.profiles
WHERE role IS NOT NULL
ON CONFLICT (user_id, role) DO NOTHING;

-- Update handle_new_user trigger to assign default 'admin' role
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Insert profile
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.raw_user_meta_data ->> 'name', split_part(NEW.email, '@', 1))
  );
  
  -- Assign default 'admin' role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'admin');
  
  RETURN NEW;
END;
$$;

-- RLS policies for user_roles table
CREATE POLICY "Users can view their own roles"
ON public.user_roles
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Super users can view all roles"
ON public.user_roles
FOR SELECT
USING (public.has_role(auth.uid(), 'super_user'));

CREATE POLICY "Super users can insert roles"
ON public.user_roles
FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'super_user'));

CREATE POLICY "Super users can update roles"
ON public.user_roles
FOR UPDATE
USING (public.has_role(auth.uid(), 'super_user'))
WITH CHECK (public.has_role(auth.uid(), 'super_user'));

CREATE POLICY "Super users can delete roles"
ON public.user_roles
FOR DELETE
USING (public.has_role(auth.uid(), 'super_user'));

-- Update storage policies for tenant-documents bucket
DROP POLICY IF EXISTS "Admins can view tenant documents" ON storage.objects;
CREATE POLICY "Admins and super users can view tenant documents"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'tenant-documents' AND
  (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_user'))
);

DROP POLICY IF EXISTS "Admins can upload tenant documents" ON storage.objects;
CREATE POLICY "Admins and super users can upload tenant documents"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'tenant-documents' AND
  (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_user'))
);

DROP POLICY IF EXISTS "Admins can update tenant documents" ON storage.objects;
CREATE POLICY "Admins and super users can update tenant documents"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'tenant-documents' AND
  (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_user'))
)
WITH CHECK (
  bucket_id = 'tenant-documents' AND
  (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_user'))
);

DROP POLICY IF EXISTS "Admins can delete tenant documents" ON storage.objects;
CREATE POLICY "Admins and super users can delete tenant documents"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'tenant-documents' AND
  (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_user'))
);

-- Update storage policies for lease-documents bucket
DROP POLICY IF EXISTS "Admins can view lease documents" ON storage.objects;
CREATE POLICY "Admins and super users can view lease documents"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'lease-documents' AND
  (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_user'))
);

DROP POLICY IF EXISTS "Admins can upload lease documents" ON storage.objects;
CREATE POLICY "Admins and super users can upload lease documents"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'lease-documents' AND
  (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_user'))
);

DROP POLICY IF EXISTS "Admins can update lease documents" ON storage.objects;
CREATE POLICY "Admins and super users can update lease documents"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'lease-documents' AND
  (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_user'))
)
WITH CHECK (
  bucket_id = 'lease-documents' AND
  (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_user'))
);

DROP POLICY IF EXISTS "Admins can delete lease documents" ON storage.objects;
CREATE POLICY "Admins and super users can delete lease documents"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'lease-documents' AND
  (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_user'))
);

-- Update all existing RLS policies to use has_role function instead of get_current_user_role

-- Update properties policies
DROP POLICY IF EXISTS "Property managers can view properties" ON public.properties;
CREATE POLICY "Admins and super users can view properties"
ON public.properties
FOR SELECT
USING (
  public.has_role(auth.uid(), 'admin') OR 
  public.has_role(auth.uid(), 'super_user')
);

DROP POLICY IF EXISTS "Property managers can insert properties" ON public.properties;
CREATE POLICY "Admins and super users can insert properties"
ON public.properties
FOR INSERT
WITH CHECK (
  public.has_role(auth.uid(), 'admin') OR 
  public.has_role(auth.uid(), 'super_user')
);

DROP POLICY IF EXISTS "Property managers can update properties" ON public.properties;
CREATE POLICY "Admins and super users can update properties"
ON public.properties
FOR UPDATE
USING (
  public.has_role(auth.uid(), 'admin') OR 
  public.has_role(auth.uid(), 'super_user')
)
WITH CHECK (
  public.has_role(auth.uid(), 'admin') OR 
  public.has_role(auth.uid(), 'super_user')
);

DROP POLICY IF EXISTS "Property managers can delete properties" ON public.properties;
CREATE POLICY "Admins and super users can delete properties"
ON public.properties
FOR DELETE
USING (
  public.has_role(auth.uid(), 'admin') OR 
  public.has_role(auth.uid(), 'super_user')
);

-- Update tenants policies
DROP POLICY IF EXISTS "Property managers can view tenants" ON public.tenants;
CREATE POLICY "Admins and super users can view tenants"
ON public.tenants
FOR SELECT
USING (
  public.has_role(auth.uid(), 'admin') OR 
  public.has_role(auth.uid(), 'super_user')
);

DROP POLICY IF EXISTS "Property managers can insert tenants" ON public.tenants;
CREATE POLICY "Admins and super users can insert tenants"
ON public.tenants
FOR INSERT
WITH CHECK (
  public.has_role(auth.uid(), 'admin') OR 
  public.has_role(auth.uid(), 'super_user')
);

DROP POLICY IF EXISTS "Property managers can update tenants" ON public.tenants;
CREATE POLICY "Admins and super users can update tenants"
ON public.tenants
FOR UPDATE
USING (
  public.has_role(auth.uid(), 'admin') OR 
  public.has_role(auth.uid(), 'super_user')
)
WITH CHECK (
  public.has_role(auth.uid(), 'admin') OR 
  public.has_role(auth.uid(), 'super_user')
);

DROP POLICY IF EXISTS "Property managers can delete tenants" ON public.tenants;
CREATE POLICY "Admins and super users can delete tenants"
ON public.tenants
FOR DELETE
USING (
  public.has_role(auth.uid(), 'admin') OR 
  public.has_role(auth.uid(), 'super_user')
);

-- Update payments policies
DROP POLICY IF EXISTS "Property managers can view payments" ON public.payments;
CREATE POLICY "Admins and super users can view payments"
ON public.payments
FOR SELECT
USING (
  public.has_role(auth.uid(), 'admin') OR 
  public.has_role(auth.uid(), 'super_user')
);

DROP POLICY IF EXISTS "Property managers can insert payments" ON public.payments;
CREATE POLICY "Admins and super users can insert payments"
ON public.payments
FOR INSERT
WITH CHECK (
  public.has_role(auth.uid(), 'admin') OR 
  public.has_role(auth.uid(), 'super_user')
);

DROP POLICY IF EXISTS "Property managers can update payments" ON public.payments;
CREATE POLICY "Admins and super users can update payments"
ON public.payments
FOR UPDATE
USING (
  public.has_role(auth.uid(), 'admin') OR 
  public.has_role(auth.uid(), 'super_user')
)
WITH CHECK (
  public.has_role(auth.uid(), 'admin') OR 
  public.has_role(auth.uid(), 'super_user')
);

DROP POLICY IF EXISTS "Property managers can delete payments" ON public.payments;
CREATE POLICY "Admins and super users can delete payments"
ON public.payments
FOR DELETE
USING (
  public.has_role(auth.uid(), 'admin') OR 
  public.has_role(auth.uid(), 'super_user')
);

-- Update debug_logs policies
DROP POLICY IF EXISTS "Admins can view all logs including system logs" ON public.debug_logs;
CREATE POLICY "Admins and super users can view all logs"
ON public.debug_logs
FOR SELECT
USING (
  public.has_role(auth.uid(), 'admin') OR 
  public.has_role(auth.uid(), 'super_user')
);

-- Drop old function after updating all dependent policies
DROP FUNCTION IF EXISTS public.get_current_user_role();

-- Remove role column from profiles table (after migration)
ALTER TABLE public.profiles DROP COLUMN IF EXISTS role;