-- Create properties table
CREATE TABLE public.properties (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  type TEXT NOT NULL,
  bedrooms INTEGER NOT NULL,
  bathrooms INTEGER NOT NULL,
  size INTEGER NOT NULL,
  rent DECIMAL(10,2) NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('available', 'occupied')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create tenants table
CREATE TABLE public.tenants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  property_id UUID REFERENCES public.properties(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  rent DECIMAL(10,2) NOT NULL,
  lease_start DATE NOT NULL,
  lease_end DATE NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('active', 'overdue', 'pending')),
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create payments table
CREATE TABLE public.payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  property_id UUID REFERENCES public.properties(id) ON DELETE CASCADE,
  amount DECIMAL(10,2) NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('paid', 'pending', 'overdue')),
  payment_method TEXT NOT NULL,
  due_date DATE NOT NULL,
  paid_date DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- Create policies for public access (since no auth is implemented yet)
CREATE POLICY "Allow all operations on properties" 
ON public.properties 
FOR ALL 
USING (true)
WITH CHECK (true);

CREATE POLICY "Allow all operations on tenants" 
ON public.tenants 
FOR ALL 
USING (true)
WITH CHECK (true);

CREATE POLICY "Allow all operations on payments" 
ON public.payments 
FOR ALL 
USING (true)
WITH CHECK (true);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_properties_updated_at
  BEFORE UPDATE ON public.properties
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_tenants_updated_at
  BEFORE UPDATE ON public.tenants
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_payments_updated_at
  BEFORE UPDATE ON public.payments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert sample data
INSERT INTO public.properties (name, address, type, bedrooms, bathrooms, size, rent, status) VALUES
('Sunset Villa', '123 Main St, Downtown', 'Villa', 3, 2, 1200, 2500.00, 'occupied'),
('Ocean View Apartment', '456 Beach Ave, Coastal', 'Apartment', 2, 1, 800, 1800.00, 'occupied'),
('Garden House', '789 Green St, Suburbs', 'House', 4, 3, 1500, 3200.00, 'available'),
('City Loft', '321 Urban Blvd, Center', 'Loft', 1, 1, 600, 1200.00, 'occupied');

INSERT INTO public.tenants (property_id, name, email, phone, rent, lease_start, lease_end, status) VALUES
((SELECT id FROM public.properties WHERE name = 'Sunset Villa'), 'John Smith', 'john.smith@email.com', '+1 (555) 123-4567', 2500.00, '2024-01-01', '2024-12-31', 'active'),
((SELECT id FROM public.properties WHERE name = 'Ocean View Apartment'), 'Sarah Johnson', 'sarah.j@email.com', '+1 (555) 234-5678', 1800.00, '2024-02-01', '2025-01-31', 'active'),
((SELECT id FROM public.properties WHERE name = 'City Loft'), 'Mike Wilson', 'mike.w@email.com', '+1 (555) 345-6789', 1200.00, '2024-03-01', '2024-11-30', 'overdue');

INSERT INTO public.payments (tenant_id, property_id, amount, status, payment_method, due_date, paid_date) VALUES
((SELECT id FROM public.tenants WHERE name = 'John Smith'), (SELECT id FROM public.properties WHERE name = 'Sunset Villa'), 2500.00, 'paid', 'Bank Transfer', '2024-01-01', '2023-12-28'),
((SELECT id FROM public.tenants WHERE name = 'Sarah Johnson'), (SELECT id FROM public.properties WHERE name = 'Ocean View Apartment'), 1800.00, 'paid', 'Credit Card', '2024-02-01', '2024-01-30'),
((SELECT id FROM public.tenants WHERE name = 'Mike Wilson'), (SELECT id FROM public.properties WHERE name = 'City Loft'), 1200.00, 'overdue', 'Cash', '2024-03-01', NULL),
((SELECT id FROM public.tenants WHERE name = 'John Smith'), (SELECT id FROM public.properties WHERE name = 'Sunset Villa'), 2500.00, 'pending', 'Bank Transfer', '2024-02-01', NULL);