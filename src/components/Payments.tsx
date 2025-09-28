import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Download, Filter, DollarSign, CreditCard, Banknote, Clock, CheckCircle, AlertCircle, Loader2, Wallet, Smartphone, Send, Users } from "lucide-react";
import { usePayments } from "@/hooks/usePayments";
import { useMtnMomo } from "@/hooks/useMtnMomo";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";

const Payments = () => {
  const { payments, loading, updatePayment } = usePayments();
  const { 
    loading: mtnLoading, 
    getAccountBalance, 
    createInvoice, 
    getInvoiceStatus
  } = useMtnMomo();
  const { toast } = useToast();
  
  const [walletBalance, setWalletBalance] = useState<any>(null);
  const [balanceError, setBalanceError] = useState<string | null>(null);
  const [showMtnPayment, setShowMtnPayment] = useState<string | null>(null);
  const [phoneNumber, setPhoneNumber] = useState('');

  useEffect(() => {
    loadCachedBalance();
  }, []);

  const loadCachedBalance = () => {
    try {
      const cached = localStorage.getItem('mtn_wallet_balance');
      if (cached) {
        const { balance, error, timestamp } = JSON.parse(cached);
        setWalletBalance(balance);
        setBalanceError(error);
      }
    } catch (error) {
      console.error('Error loading cached balance:', error);
    }
  };

  const loadWalletBalance = async () => {
    try {
      setBalanceError(null);
      const balance = await getAccountBalance();
      setWalletBalance(balance);
      
      // Cache the successful balance
      localStorage.setItem('mtn_wallet_balance', JSON.stringify({
        balance,
        error: null,
        timestamp: Date.now()
      }));
    } catch (error: any) {
      const errorMessage = error.message || 'Failed to load balance';
      setBalanceError(errorMessage);
      
      // Cache the error
      localStorage.setItem('mtn_wallet_balance', JSON.stringify({
        balance: null,
        error: errorMessage,
        timestamp: Date.now()
      }));
      
      console.error('Balance error:', error);
    }
  };

  const handleMtnPayment = async (paymentId: string, amount: number) => {
    if (!phoneNumber) {
      alert('Please enter phone number');
      return;
    }

    const referenceId = await createInvoice({
      paymentId,
      amount,
      msisdn: phoneNumber,
    });

    if (referenceId) {
      // Update payment with reference ID
      await updatePayment(paymentId, { 
        momo_reference_id: referenceId, 
        momo_invoice_status: 'PENDING' 
      });
      
      setShowMtnPayment(null);
      setPhoneNumber('');
      // Check status after a short delay
      setTimeout(() => {
        getInvoiceStatus({ referenceId, paymentId });
      }, 5000);
    }
  };

  const handleSendBulkPaymentRequests = async () => {
    const overduePayments = pendingPayments.filter(p => p.status === 'overdue');
    
    for (const payment of overduePayments) {
      if (payment.tenant?.phone) {
        try {
          await createInvoice({
            paymentId: payment.id,
            amount: payment.amount,
            msisdn: payment.tenant.phone,
          });
        } catch (error) {
          console.error(`Failed to create invoice for ${payment.tenant.name}:`, error);
        }
      }
    }
  };

  const handleCheckInvoiceStatus = async (paymentId: string) => {
    const payment = payments.find(p => p.id === paymentId);
    if (!payment) return;

    // If no reference ID exists, show a message
    if (!payment.momo_reference_id) {
      toast({
        title: "Info",
        description: "No MTN MoMo reference ID found. Please create an invoice first.",
      });
      return;
    }
    
    try {
      const result = await getInvoiceStatus({ 
        referenceId: payment.momo_reference_id, 
        paymentId 
      });
      
      if (result) {
        // Update payment with new status
        await updatePayment(paymentId, { 
          momo_invoice_status: result.status 
        });
        
        toast({
          title: "Invoice Status Updated",
          description: `Status: ${result.status}`,
        });
        
        console.log('Invoice status:', result);
      }
    } catch (error) {
      console.error('Failed to check invoice status:', error);
    }
  };

  const handleMarkPaid = async (paymentId: string) => {
    await updatePayment(paymentId, { 
      status: 'paid', 
      paid_date: new Date().toISOString().split('T')[0] 
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const completedPayments = payments.filter(p => p.status === 'paid');
  const pendingPayments = payments.filter(p => p.status === 'pending' || p.status === 'overdue');

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return 'default';
      case 'pending':
        return 'secondary';
      case 'overdue':
        return 'destructive';
      default:
        return 'secondary';
    }
  };

  const getPaymentMethodIcon = (method: string) => {
    if (method.toLowerCase().includes('card') || method.toLowerCase().includes('credit')) {
      return <CreditCard className="w-4 h-4 text-primary" />;
    }
    if (method.toLowerCase().includes('cash')) {
      return <Banknote className="w-4 h-4 text-primary" />;
    }
    if (method.toLowerCase().includes('mtn') || method.toLowerCase().includes('mobile')) {
      return <Smartphone className="w-4 h-4 text-primary" />;
    }
    return <DollarSign className="w-4 h-4 text-primary" />;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Payments</h1>
          <p className="text-muted-foreground mt-1">Track rent payments and manage collections</p>
        </div>
        <div className="flex space-x-2">
          <Button 
            variant="outline"
            onClick={handleSendBulkPaymentRequests}
            disabled={mtnLoading || pendingPayments.filter(p => p.status === 'overdue').length === 0}
          >
            <Send className="w-4 h-4 mr-2" />
            Send All Overdue Invoices
          </Button>
          <Button variant="outline">
            <Filter className="w-4 h-4 mr-2" />
            Filter
          </Button>
          <Button variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* MTN MoMo Wallet Balance */}
      <Card className="bg-gradient-card shadow-card">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            MTN MoMo Wallet Balance
          </CardTitle>
          <Wallet className="h-4 w-4 text-primary" />
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xl font-bold text-foreground">
                {balanceError ? (
                  <div className="text-destructive text-sm">
                    <AlertCircle className="w-4 h-4 inline mr-1" />
                    Error: {balanceError}
                  </div>
                ) : walletBalance ? (
                  `${walletBalance.currency} ${walletBalance.availableBalance}`
                ) : (
                  mtnLoading ? 'Loading...' : 'Not loaded'
                )}
              </div>
              {!balanceError && (
                <p className="text-xs text-muted-foreground mt-1">Available Balance</p>
              )}
              {balanceError && (
                <p className="text-xs text-muted-foreground mt-1">
                  Click refresh to retry
                </p>
              )}
            </div>
            <Button 
              size="sm" 
              variant="outline" 
              onClick={loadWalletBalance}
              disabled={mtnLoading}
            >
              {mtnLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Refresh'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Payment Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="bg-gradient-card shadow-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Collected
            </CardTitle>
            <DollarSign className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              ₦{completedPayments.reduce((sum, p) => sum + p.amount, 0).toLocaleString()}
            </div>
            <p className="text-xs text-success mt-1">{completedPayments.length} payments</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-card shadow-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Pending
            </CardTitle>
            <Clock className="h-4 w-4 text-warning" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              ₦{pendingPayments.reduce((sum, p) => sum + p.amount, 0).toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground mt-1">{pendingPayments.length} payments</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-card shadow-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Overdue
            </CardTitle>
            <AlertCircle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {pendingPayments.filter(p => p.status === 'overdue').length}
            </div>
            <p className="text-xs text-destructive mt-1">Need attention</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-card shadow-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Success Rate
            </CardTitle>
            <CheckCircle className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {payments.length > 0 ? ((completedPayments.length / payments.length) * 100).toFixed(1) : 0}%
            </div>
            <p className="text-xs text-success mt-1">Collection rate</p>
          </CardContent>
        </Card>
      </div>

      {/* Payment Tabs */}
      <Tabs defaultValue="history" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="history">Payment History</TabsTrigger>
          <TabsTrigger value="pending">Pending Payments</TabsTrigger>
        </TabsList>

        <TabsContent value="history" className="space-y-4">
          <Card className="bg-gradient-card shadow-card">
            <CardHeader>
              <CardTitle>Recent Transactions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {completedPayments.map((payment) => (
                  <Card key={payment.id} className="bg-gradient-card shadow-card hover:shadow-elegant transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div className="flex items-center justify-center w-10 h-10 rounded-full bg-success/10">
                            <CheckCircle className="w-5 h-5 text-success" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-foreground">{payment.tenant?.name}</h3>
                            <p className="text-sm text-muted-foreground">{payment.property?.name}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-xl font-bold text-foreground">₦{payment.amount.toLocaleString()}</p>
                          <div className="flex items-center space-x-2 mt-1">
                            <Badge variant="outline" className="bg-success/10 text-success border-success/20">
                              {payment.status}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {payment.paid_date ? new Date(payment.paid_date).toLocaleDateString() : new Date(payment.created_at || '').toLocaleDateString()}
                            </span>
                          </div>
                          <div className="flex items-center space-x-1 mt-1">
                            {getPaymentMethodIcon(payment.payment_method)}
                            <span className="text-xs text-muted-foreground">{payment.payment_method}</span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pending" className="space-y-4">
          <Card className="bg-gradient-card shadow-card">
            <CardHeader>
              <CardTitle>Upcoming & Overdue Payments</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {pendingPayments.map((payment) => (
                  <Card key={payment.id} className="bg-gradient-card shadow-card hover:shadow-elegant transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div className={`flex items-center justify-center w-10 h-10 rounded-full ${
                            payment.status === 'overdue' ? 'bg-destructive/10' : 'bg-warning/10'
                          }`}>
                            {payment.status === 'overdue' ? (
                              <AlertCircle className="w-5 h-5 text-destructive" />
                            ) : (
                              <Clock className="w-5 h-5 text-warning" />
                            )}
                          </div>
                          <div>
                            <h3 className="font-semibold text-foreground">{payment.tenant?.name}</h3>
                            <p className="text-sm text-muted-foreground">{payment.property?.name}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-xl font-bold text-foreground">₦{payment.amount.toLocaleString()}</p>
                           <div className="flex items-center space-x-2 mt-1">
                              <Badge 
                                variant={getStatusColor(payment.status)}
                                className={payment.status === 'overdue' ? 'bg-destructive/10 text-destructive border-destructive/20' : ''}
                              >
                                {payment.status}
                              </Badge>
                              {payment.momo_invoice_status && (
                                <Badge variant="outline" className="bg-info/10 text-info border-info/20">
                                  MTN: {payment.momo_invoice_status}
                                </Badge>
                              )}
                              <span className="text-xs text-muted-foreground">Due: {new Date(payment.due_date).toLocaleDateString()}</span>
                              {payment.payment_method === 'MTN Mobile Money' && payment.status === 'pending' && (
                                <Badge variant="outline" className="bg-info/10 text-info border-info/20">
                                  <Smartphone className="w-3 h-3 mr-1" />
                                  SMS Sent
                                </Badge>
                              )}
                            </div>
                             <div className="flex items-center space-x-1 mt-1">
                              {getPaymentMethodIcon(payment.payment_method)}
                              <span className="text-xs text-muted-foreground">{payment.payment_method}</span>
                              {payment.created_at && (
                                <span className="text-xs text-muted-foreground">
                                  • Created {new Date(payment.created_at).toLocaleDateString()}
                                </span>
                              )}
                             </div>
                             {payment.momo_reference_id && (
                               <div className="mt-2">
                                 <span className="text-xs text-muted-foreground">Reference: </span>
                                 <code className="text-xs bg-muted px-2 py-1 rounded font-mono">
                                   {payment.momo_reference_id}
                                 </code>
                               </div>
                             )}
                            <div className="flex space-x-2 mt-3">
                              <Button 
                                size="sm" 
                                className="bg-success hover:bg-success/90 text-white"
                                onClick={() => handleMarkPaid(payment.id)}
                              >
                                Mark Paid
                              </Button>
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => setShowMtnPayment(payment.id)}
                              >
                                <Smartphone className="w-4 h-4 mr-2" />
                                Create Invoice
                              </Button>
                              {payment.status === 'pending' && (
                                <Button 
                                  size="sm" 
                                  variant="secondary"
                                  onClick={() => handleCheckInvoiceStatus(payment.id)}
                                  disabled={mtnLoading}
                                >
                                  {mtnLoading ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : 'Check Invoice Status'}
                                </Button>
                              )}
                            </div>
                           
                           {/* MTN Payment Modal */}
                           {showMtnPayment === payment.id && (
                             <div className="mt-4 p-4 border rounded-lg bg-muted/50">
                               <h4 className="font-semibold mb-2">Request MTN MoMo Payment</h4>
                               <div className="space-y-3">
                                 <div>
                                   <label className="text-sm font-medium">Tenant Phone Number</label>
                                   <Input
                                     placeholder="256XXXXXXXXX"
                                     value={phoneNumber}
                                     onChange={(e) => setPhoneNumber(e.target.value)}
                                   />
                                 </div>
                                 <div className="flex space-x-2">
                                   <Button 
                                     size="sm"
                                     onClick={() => handleMtnPayment(payment.id, payment.amount)}
                                     disabled={mtnLoading}
                                   >
                                     {mtnLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                                     Send Payment Request
                                   </Button>
                                   <Button 
                                     size="sm" 
                                     variant="outline"
                                     onClick={() => setShowMtnPayment(null)}
                                   >
                                     Cancel
                                   </Button>
                                 </div>
                               </div>
                             </div>
                           )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Payments;