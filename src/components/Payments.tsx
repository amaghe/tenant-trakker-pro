import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Download, Filter, DollarSign, CreditCard, Banknote, Clock, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { usePayments } from "@/hooks/usePayments";

const Payments = () => {
  const { payments, loading } = usePayments();

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
                            <span className="text-xs text-muted-foreground">Due: {new Date(payment.due_date).toLocaleDateString()}</span>
                          </div>
                          <div className="flex items-center space-x-1 mt-1">
                            {getPaymentMethodIcon(payment.payment_method)}
                            <span className="text-xs text-muted-foreground">{payment.payment_method}</span>
                          </div>
                          <div className="flex space-x-2 mt-3">
                            <Button size="sm" className="bg-success hover:bg-success/90 text-white">
                              Mark Paid
                            </Button>
                            <Button size="sm" variant="outline">
                              Send Reminder
                            </Button>
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
      </Tabs>
    </div>
  );
};

export default Payments;