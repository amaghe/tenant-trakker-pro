-- Add momo_request_status column to payments table for RequestToPay status tracking
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS momo_request_status text;