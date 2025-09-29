-- Add missing columns to payments table for improved MoMo integration
ALTER TABLE public.payments 
ADD COLUMN momo_financial_transaction_id TEXT,
ADD COLUMN momo_error_code TEXT,
ADD COLUMN momo_error_message TEXT,
ADD COLUMN momo_external_id TEXT;

-- Add index for faster lookups by external ID (used in callbacks)
CREATE INDEX idx_payments_momo_external_id ON public.payments(momo_external_id);