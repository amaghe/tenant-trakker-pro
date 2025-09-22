import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DollarSign, Smartphone, CreditCard, Calendar, Filter, Download } from "lucide-react";
import { useState } from "react";

const Payments = () => {
  const [payments] = useState([
    {
      id: 1,
      tenant: "John Doe",
      property: "Lagos Heights Apt 2B",
      amount: "₦180,000",
      method: "MTN Mobile Money",
      status: "completed",
      date: "Jan 15, 2024",
      transactionId: "MTN123456789"
    },
    {
      id: 2,
      tenant: "Sarah Wilson",
      property: "Victoria Garden 5A",
      amount: "₦220,000",
      method: "Bank Transfer",
      status: "pending",
      date: "Jan 14, 2024",
      transactionId: "BNK987654321"
    },
    {
      id: 3,
      tenant: "Mike Johnson",
      property: "Ikoyi Towers 12F",
      amount: "₦350,000",
      method: "Airtel Money",
      status: "completed",
      date: "Jan 12, 2024",
      transactionId: "AIR555666777"
    },
    {
      id: 4,
      tenant: "Emma Brown",
      property: "Lekki Phase 1 House",
      amount: "₦420,000",
      method: "MTN Mobile Money",
      status: "failed",
      date: "Jan 10, 2024",
      transactionId: "MTN888999000"
    }
  ]);

  const [pendingPayments] = useState([
    {
      id: 1,
      tenant: "David Smith",
      property: "Marina View 8B",
      amount: "₦280,000",
      dueDate: "Jan 31, 2024",
      daysOverdue: 0
    },
    {
      id: 2,
      tenant: "Lisa Garcia",
      property: "Banana Island Villa",
      amount: "₦850,000",
      dueDate: "Feb 1, 2024",
      daysOverdue: 0
    },
    {
      id: 3,
      tenant: "Tom Wilson",
      property: "Surulere Complex 4C",
      amount: "₦160,000",
      dueDate: "Jan 28, 2024",
      daysOverdue: 3
    }
  ]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-success text-success-foreground';
      case 'pending':
        return 'bg-warning text-warning-foreground';
      case 'failed':
        return 'bg-destructive text-destructive-foreground';
      default:
        return 'bg-secondary text-secondary-foreground';
    }
  };

  const getPaymentMethodIcon = (method: string) => {
    if (method.includes('MTN') || method.includes('Airtel')) {
      return <Smartphone className="w-4 h-4" />;
    }
    return <CreditCard className="w-4 h-4" />;
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
            <div className="text-2xl font-bold text-foreground">₦2,450,000</div>
            <p className="text-xs text-success mt-1">+12% from last month</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-card shadow-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Pending
            </CardTitle>
            <Calendar className="h-4 w-4 text-warning" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">₦1,290,000</div>
            <p className="text-xs text-muted-foreground mt-1">3 payments due</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-card shadow-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Mobile Money
            </CardTitle>
            <Smartphone className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">68%</div>
            <p className="text-xs text-muted-foreground mt-1">Preferred method</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-card shadow-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Success Rate
            </CardTitle>
            <CreditCard className="h-4 w-4 text-accent" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">94.2%</div>
            <p className="text-xs text-success mt-1">+2% improvement</p>
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
                {payments.map((payment) => (
                  <div key={payment.id} className="flex items-center justify-between py-3 border-b border-border last:border-0">
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center justify-center w-10 h-10 bg-muted rounded-lg">
                        {getPaymentMethodIcon(payment.method)}
                      </div>
                      <div>
                        <p className="font-medium text-foreground">{payment.tenant}</p>
                        <p className="text-sm text-muted-foreground">{payment.property}</p>
                        <p className="text-xs text-muted-foreground">{payment.method} • {payment.transactionId}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-foreground">{payment.amount}</p>
                      <div className="flex items-center space-x-2 mt-1">
                        <Badge className={getStatusColor(payment.status)}>
                          {payment.status}
                        </Badge>
                        <span className="text-xs text-muted-foreground">{payment.date}</span>
                      </div>
                    </div>
                  </div>
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
                  <div key={payment.id} className="flex items-center justify-between py-3 border-b border-border last:border-0">
                    <div>
                      <p className="font-medium text-foreground">{payment.tenant}</p>
                      <p className="text-sm text-muted-foreground">{payment.property}</p>
                      <p className="text-xs text-muted-foreground">Due: {payment.dueDate}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-foreground">{payment.amount}</p>
                      <div className="mt-1">
                        {payment.daysOverdue > 0 ? (
                          <Badge className="bg-destructive text-destructive-foreground">
                            {payment.daysOverdue} days overdue
                          </Badge>
                        ) : (
                          <Badge className="bg-warning text-warning-foreground">
                            Due soon
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="ml-4">
                      <Button size="sm" className="bg-gradient-primary text-white">
                        Send Reminder
                      </Button>
                    </div>
                  </div>
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