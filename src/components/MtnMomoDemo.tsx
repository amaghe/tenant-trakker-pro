import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Loader2, CheckCircle, XCircle, Clock } from 'lucide-react';
import { mtnMomoService, PaymentStatus } from '@/services/mtnMomoService';
import { useToast } from '@/hooks/use-toast';

export default function MtnMomoDemo() {
  const [loading, setLoading] = useState(false);
  const [paymentData, setPaymentData] = useState({
    msisdn: '+46114477000', // Default sandbox number
    amount: 100,
    currency: 'EUR',
    payerMessage: 'Test payment',
    payeeNote: 'Demo transaction'
  });
  const [referenceId, setReferenceId] = useState<string>('');
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus | null>(null);
  const [statusLoading, setStatusLoading] = useState(false);
  
  const { toast } = useToast();

  const handleCreatePayment = async () => {
    setLoading(true);
    try {
      const refId = await mtnMomoService.create_payment(
        paymentData.msisdn,
        paymentData.amount,
        paymentData.currency,
        undefined, // external_id (auto-generated)
        paymentData.payerMessage,
        paymentData.payeeNote
      );

      if (refId) {
        setReferenceId(refId);
        toast({
          title: "Success",
          description: "Payment request created successfully",
        });
      } else {
        throw new Error('Failed to create payment');
      }
    } catch (error) {
      console.error('Payment creation error:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : 'Failed to create payment',
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCheckStatus = async () => {
    if (!referenceId) {
      toast({
        title: "Error",
        description: "No reference ID available. Create a payment first.",
        variant: "destructive",
      });
      return;
    }

    setStatusLoading(true);
    try {
      const status = await mtnMomoService.get_payment_status(referenceId);
      setPaymentStatus(status);
      
      if (status) {
        toast({
          title: "Status Retrieved",
          description: `Payment status: ${status.status}`,
        });
      }
    } catch (error) {
      console.error('Status check error:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : 'Failed to check status',
        variant: "destructive",
      });
    } finally {
      setStatusLoading(false);
    }
  };

  const getStatusIcon = (status?: string) => {
    switch (status) {
      case 'SUCCESSFUL':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'FAILED':
      case 'REJECTED':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'PENDING':
      case 'ONGOING':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'SUCCESSFUL':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'FAILED':
      case 'REJECTED':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'PENDING':
      case 'ONGOING':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>MTN Mobile Money Integration Demo</CardTitle>
          <CardDescription>
            Test the MTN MoMo API integration with sandbox environment
          </CardDescription>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Create Payment */}
        <Card>
          <CardHeader>
            <CardTitle>Create Payment</CardTitle>
            <CardDescription>
              Send a payment request to MTN Mobile Money
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="msisdn">Phone Number (MSISDN)</Label>
              <Input
                id="msisdn"
                value={paymentData.msisdn}
                onChange={(e) => setPaymentData(prev => ({ ...prev, msisdn: e.target.value }))}
                placeholder="+46114477000"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="amount">Amount</Label>
                <Input
                  id="amount"
                  type="number"
                  value={paymentData.amount}
                  onChange={(e) => setPaymentData(prev => ({ ...prev, amount: parseFloat(e.target.value) || 0 }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="currency">Currency</Label>
                <Input
                  id="currency"
                  value={paymentData.currency}
                  onChange={(e) => setPaymentData(prev => ({ ...prev, currency: e.target.value }))}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="payerMessage">Payer Message</Label>
              <Input
                id="payerMessage"
                value={paymentData.payerMessage}
                onChange={(e) => setPaymentData(prev => ({ ...prev, payerMessage: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="payeeNote">Payee Note</Label>
              <Input
                id="payeeNote"
                value={paymentData.payeeNote}
                onChange={(e) => setPaymentData(prev => ({ ...prev, payeeNote: e.target.value }))}
              />
            </div>

            <Button 
              onClick={handleCreatePayment} 
              className="w-full"
              disabled={loading}
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Payment
            </Button>

            {referenceId && (
              <div className="mt-4 p-3 bg-green-50 rounded-lg border border-green-200">
                <div className="text-sm font-medium text-green-800">Payment Created</div>
                <div className="text-xs text-green-600 font-mono break-all">
                  Reference ID: {referenceId}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Check Status */}
        <Card>
          <CardHeader>
            <CardTitle>Check Payment Status</CardTitle>
            <CardDescription>
              Get the current status of a payment
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="statusReferenceId">Reference ID</Label>
              <Input
                id="statusReferenceId"
                value={referenceId}
                onChange={(e) => setReferenceId(e.target.value)}
                placeholder="Enter reference ID to check"
              />
            </div>

            <Button 
              onClick={handleCheckStatus} 
              className="w-full"
              disabled={statusLoading || !referenceId}
            >
              {statusLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Check Status
            </Button>

            {paymentStatus && (
              <div className="space-y-4">
                <Separator />
                
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Status</span>
                    <Badge className={getStatusColor(paymentStatus.status)}>
                      <div className="flex items-center gap-1">
                        {getStatusIcon(paymentStatus.status)}
                        {paymentStatus.status}
                      </div>
                    </Badge>
                  </div>

                  {paymentStatus.amount && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Amount</span>
                      <span className="text-sm">{paymentStatus.amount} {paymentStatus.currency}</span>
                    </div>
                  )}

                  {paymentStatus.financialTransactionId && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Transaction ID</span>
                      <span className="text-xs font-mono">{paymentStatus.financialTransactionId}</span>
                    </div>
                  )}

                  {paymentStatus.externalId && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">External ID</span>
                      <span className="text-xs font-mono">{paymentStatus.externalId}</span>
                    </div>
                  )}

                  {paymentStatus.payer && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Payer</span>
                      <span className="text-sm">{paymentStatus.payer.partyId}</span>
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Checked At</span>
                    <span className="text-xs text-gray-500">
                      {paymentStatus.checkedAt ? new Date(paymentStatus.checkedAt).toLocaleString() : 'N/A'}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* API Information */}
      <Card>
        <CardHeader>
          <CardTitle>API Information</CardTitle>
          <CardDescription>
            Technical details about the MTN MoMo integration
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium mb-2">Available Methods</h4>
              <ul className="text-sm space-y-1 text-gray-600">
                <li>• <code>create_payment(msisdn, amount, currency, external_id, payer_msg, payee_note)</code></li>
                <li>• <code>get_payment_status(reference_id)</code></li>
                <li>• <code>isPaymentCompleted(reference_id)</code></li>
                <li>• <code>waitForPaymentCompletion(reference_id, timeout, interval)</code></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-medium mb-2">Status Values</h4>
              <ul className="text-sm space-y-1 text-gray-600">
                <li>• <code>PENDING</code> - Payment request sent</li>
                <li>• <code>ONGOING</code> - Payment in progress</li>
                <li>• <code>SUCCESSFUL</code> - Payment completed</li>
                <li>• <code>FAILED</code> - Payment failed</li>
                <li>• <code>REJECTED</code> - Payment rejected</li>
              </ul>
            </div>
          </div>

          <Separator />

          <div>
            <h4 className="font-medium mb-2">Error Handling Features</h4>
            <ul className="text-sm space-y-1 text-gray-600">
              <li>• Input validation for phone numbers and UUIDs</li>
              <li>• Comprehensive logging to debug_logs table</li>
              <li>• Meaningful error messages for different failure scenarios</li>
              <li>• HTTP status code mapping (400, 401, 403, 404, 500)</li>
              <li>• Automatic retry logic with polling for status updates</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}