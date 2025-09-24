import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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
    const { action, invoiceId, amount, phoneNumber, description } = await req.json();

    const MTN_PRIMARY_KEY = Deno.env.get('MTN_PRIMARY_KEY');
    const MTN_USER_REFERENCE_ID = Deno.env.get('MTN_USER_REFERENCE_ID');
    const MTN_USER_API_KEY = Deno.env.get('MTN_USER_API_KEY');

    if (!MTN_PRIMARY_KEY || !MTN_USER_REFERENCE_ID || !MTN_USER_API_KEY) {
      throw new Error('Missing MTN MoMo credentials');
    }

    const baseHeaders = {
      'Authorization': `Bearer ${MTN_USER_API_KEY}`,
      'X-Target-Environment': 'sandbox',
      'Ocp-Apim-Subscription-Key': MTN_PRIMARY_KEY,
      'Content-Type': 'application/json',
    };

    let response;
    let result;

    switch (action) {
      case 'create':
        // Create invoice
        const referenceId = crypto.randomUUID();
        const invoiceData = {
          amount: amount.toString(),
          currency: "EUR", // Use EUR for sandbox
          externalId: referenceId,
          payer: {
            partyIdType: "MSISDN", 
            partyId: phoneNumber
          },
          payerMessage: description || "Invoice payment",
          payeeNote: "Property rent invoice"
        };

        response = await fetch('https://sandbox.momodeveloper.mtn.com/collection/v1_0/requesttopay', {
          method: 'POST',
          headers: {
            ...baseHeaders,
            'X-Reference-Id': referenceId,
          },
          body: JSON.stringify(invoiceData),
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Invoice creation failed: ${response.status} - ${errorText}`);
        }

        result = {
          success: true,
          invoiceId: referenceId,
          message: 'Invoice created successfully'
        };
        break;

      case 'status':
        // Get invoice status
        if (!invoiceId) {
          throw new Error('Invoice ID is required for status check');
        }

        response = await fetch(`https://sandbox.momodeveloper.mtn.com/collection/v1_0/requesttopay/${invoiceId}`, {
          method: 'GET',
          headers: baseHeaders,
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Status check failed: ${response.status} - ${errorText}`);
        }

        const statusData = await response.json();
        result = {
          success: true,
          status: statusData,
          message: 'Invoice status retrieved successfully'
        };
        break;

      case 'cancel':
        // Cancel invoice - Note: MTN MoMo may not support direct cancellation
        // This would typically be handled by letting the request expire
        result = {
          success: true,
          message: 'Invoice cancellation requested (will expire automatically)'
        };
        break;

      default:
        throw new Error(`Unsupported action: ${action}`);
    }

    console.log(`Invoice ${action} completed successfully:`, result);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error in mtn-momo-invoice function:', error);
    return new Response(JSON.stringify({ 
      success: false,
      error: errorMessage 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});