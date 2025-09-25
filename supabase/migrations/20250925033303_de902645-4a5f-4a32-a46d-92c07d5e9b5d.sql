-- Add momo_reference_id and momo_invoice_status columns to payments table
ALTER TABLE public.payments 
ADD COLUMN IF NOT EXISTS momo_reference_id UUID,
ADD COLUMN IF NOT EXISTS momo_invoice_status TEXT;