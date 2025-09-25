import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Building, Users, DollarSign, TrendingUp, Calendar, AlertCircle, Loader2, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { usePayments } from "@/hooks/usePayments";
import { useDashboardSummary } from "@/hooks/useDashboardSummary";
import { useMemo } from "react";

const Dashboard = () => {
  const { payments, loading: paymentsLoading } = usePayments();
  const { data: summary, isLoading: summaryLoading } = useDashboardSummary();

  const stats = useMemo(() => {
    if (!summary) return [];

    return [
      {
        title: "Total Properties",
        value: summary.totalProperties.toString(),
        change: `Properties managed`,
        icon: Building,
        positive: true,
      },
      {
        title: "Active Tenants", 
        value: summary.activeTenants.toString(),
        change: `Tenants active`,
        icon: Users,
        positive: true,
      },
      {
        title: "Monthly Revenue",
        value: `₦${summary.monthlyRevenue.toLocaleString()}`,
        change: `This month`,
        icon: DollarSign,
        positive: true,
      },
      {
        title: "Payment Requests",
        value: summary.paymentRequests.toString(),
        change: `This month`,
        icon: Smartphone,
        positive: true,
      },
      {
        title: "Collection Rate",
        value: `${summary.collectionRatePercent}%`,
        change: `Success rate`,
        icon: TrendingUp,
        positive: summary.collectionRatePercent >= 90,
      },
    ];
  }, [summary]);

  const recentPayments = useMemo(() => 
    payments
      .slice(0, 4)
      .map(payment => ({
        tenant: payment.tenant?.name || 'Unknown',
        property: payment.property?.name || 'Unknown',
        amount: `₦${payment.amount.toLocaleString()}`,
        status: payment.status,
        date: payment.paid_date ? new Date(payment.paid_date).toLocaleDateString() : new Date(payment.created_at || '').toLocaleDateString()
      })),
    [payments]
  );

  const upcomingRent = useMemo(() =>
    payments
      .filter(p => p.status === 'pending' || p.status === 'overdue')
      .slice(0, 3)
      .map(payment => ({
        tenant: payment.tenant?.name || 'Unknown',
        property: payment.property?.name || 'Unknown', 
        amount: `₦${payment.amount.toLocaleString()}`,
        dueDate: new Date(payment.due_date).toLocaleDateString()
      })),
    [payments]
  );

  if (summaryLoading || paymentsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground mt-1">Welcome back! Here's what's happening with your properties.</p>
        </div>
        <Button className="bg-gradient-primary text-white shadow-elegant hover:shadow-lg transition-all">
          <Calendar className="w-4 h-4 mr-2" />
          Generate Report
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.title} className="bg-gradient-card shadow-card hover:shadow-elegant transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {stat.title}
                </CardTitle>
                <Icon className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground">{stat.value}</div>
                <p className={`text-xs ${stat.positive ? 'text-success' : 'text-warning'} mt-1`}>
                  {stat.change}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Payments */}
        <Card className="bg-gradient-card shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <DollarSign className="w-5 h-5 text-primary" />
              <span>Recent Payments</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentPayments.map((payment, index) => (
                <div key={index} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                  <div className="flex-1">
                    <p className="font-medium text-foreground">{payment.tenant}</p>
                    <p className="text-sm text-muted-foreground">{payment.property}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-foreground">{payment.amount}</p>
                    <div className="flex items-center space-x-2">
                      <Badge 
                        variant={payment.status === 'paid' ? 'default' : payment.status === 'pending' ? 'secondary' : 'destructive'}
                        className={payment.status === 'paid' ? 'bg-success text-success-foreground' : ''}
                      >
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

        {/* Upcoming Rent */}
        <Card className="bg-gradient-card shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <AlertCircle className="w-5 h-5 text-warning" />
              <span>Upcoming Rent</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {upcomingRent.map((rent, index) => (
                <div key={index} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                  <div className="flex-1">
                    <p className="font-medium text-foreground">{rent.tenant}</p>
                    <p className="text-sm text-muted-foreground">{rent.property}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-foreground">{rent.amount}</p>
                    <p className="text-sm text-warning">Due: {rent.dueDate}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;