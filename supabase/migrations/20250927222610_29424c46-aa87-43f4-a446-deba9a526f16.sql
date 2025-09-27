-- Fix security issue: Restrict access to debug logs
-- Remove the overly permissive policy that allows all users to view system logs
DROP POLICY IF EXISTS "Users can view their own logs" ON public.debug_logs;

-- Create a new restrictive policy that only allows users to view their own logs (not system logs)
CREATE POLICY "Users can view only their own specific logs" 
ON public.debug_logs 
FOR SELECT 
USING (auth.uid() = user_id);

-- Create a separate policy for admins to view all logs including system logs
CREATE POLICY "Admins can view all logs including system logs" 
ON public.debug_logs 
FOR SELECT 
USING (get_current_user_role() = 'admin');

-- Note: The service role policy already exists and allows full access for edge functions