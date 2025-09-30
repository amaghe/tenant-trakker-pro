-- Add new columns to tenants table for enhanced tenant details
ALTER TABLE public.tenants 
ADD COLUMN emergency_contacts JSONB DEFAULT '[]'::jsonb,
ADD COLUMN id_document_url TEXT,
ADD COLUMN notes TEXT,
ADD COLUMN deposit NUMERIC,
ADD COLUMN lease_document_url TEXT;

-- Create storage buckets for tenant documents
INSERT INTO storage.buckets (id, name, public) VALUES ('tenant-documents', 'tenant-documents', false);
INSERT INTO storage.buckets (id, name, public) VALUES ('lease-documents', 'lease-documents', false);

-- Create policies for tenant-documents bucket
CREATE POLICY "Admins can view tenant documents" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'tenant-documents' AND get_current_user_role() = 'admin');

CREATE POLICY "Admins can upload tenant documents" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'tenant-documents' AND get_current_user_role() = 'admin');

CREATE POLICY "Admins can update tenant documents" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'tenant-documents' AND get_current_user_role() = 'admin');

CREATE POLICY "Admins can delete tenant documents" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'tenant-documents' AND get_current_user_role() = 'admin');

-- Create policies for lease-documents bucket
CREATE POLICY "Admins can view lease documents" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'lease-documents' AND get_current_user_role() = 'admin');

CREATE POLICY "Admins can upload lease documents" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'lease-documents' AND get_current_user_role() = 'admin');

CREATE POLICY "Admins can update lease documents" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'lease-documents' AND get_current_user_role() = 'admin');

CREATE POLICY "Admins can delete lease documents" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'lease-documents' AND get_current_user_role() = 'admin');