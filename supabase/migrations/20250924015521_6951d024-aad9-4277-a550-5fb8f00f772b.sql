-- Create logs table for debugging
CREATE TABLE public.debug_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  function_name TEXT NOT NULL,
  level TEXT NOT NULL DEFAULT 'info', -- info, warn, error, debug
  message TEXT NOT NULL,
  metadata JSONB,
  user_id UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.debug_logs ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own logs" 
ON public.debug_logs 
FOR SELECT 
USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Service role can manage all logs" 
ON public.debug_logs 
FOR ALL 
USING (auth.jwt() ->> 'role' = 'service_role');

-- Create index for better performance
CREATE INDEX idx_debug_logs_function_name ON public.debug_logs(function_name);
CREATE INDEX idx_debug_logs_level ON public.debug_logs(level);
CREATE INDEX idx_debug_logs_created_at ON public.debug_logs(created_at DESC);