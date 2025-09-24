import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      functionName, 
      level = 'info', 
      message, 
      metadata,
      userId 
    } = await req.json();

    if (!functionName || !message) {
      throw new Error('functionName and message are required');
    }

    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Insert log entry
    const { data, error } = await supabase
      .from('debug_logs')
      .insert({
        function_name: functionName,
        level,
        message,
        metadata,
        user_id: userId
      });

    if (error) {
      console.error('Error inserting log:', error);
      throw error;
    }

    // Also log to console for immediate visibility
    const timestamp = new Date().toISOString();
    const logLevel = level.toUpperCase();
    console.log(`[${timestamp}] ${logLevel} [${functionName}]: ${message}`, metadata ? JSON.stringify(metadata) : '');

    return new Response(JSON.stringify({
      success: true,
      message: 'Log entry created successfully'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in debug-logger function:', error);
    return new Response(JSON.stringify({ 
      success: false,
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});