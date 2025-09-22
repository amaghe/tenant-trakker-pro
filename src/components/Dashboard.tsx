import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Building, Users, DollarSign, TrendingUp, Calendar, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const Dashboard = () => {
  const stats = [
    {
      title: "Total Properties",
      value: "24",
      change: "+2 this month",
      icon: Building,
      positive: true,
    },
    {
      title: "Active Tenants",
      value: "87",
      change: "+5 this month",
      icon: Users,
      positive: true,
    },
    {
      title: "Monthly Revenue",
      value: "₦2,450,000",
      change: "+12% from last month",
      icon: DollarSign,
      positive: true,
    },
    {
      title: "Collection Rate",
      value: "94.2%",
      change: "-2% from last month",
      icon: TrendingUp,
      positive: false,
    },
  ];

  const recentPayments = [
    { tenant: "John Doe", property: "Lagos Heights Apt 2B", amount: "₦180,000", status: "paid", date: "Today" },
    { tenant: "Sarah Wilson", property: "Victoria Garden 5A", amount: "₦220,000", status: "pending", date: "Yesterday" },
    { tenant: "Mike Johnson", property: "Ikoyi Towers 12F", amount: "₦350,000", status: "paid", date: "2 days ago" },
    { tenant: "Emma Brown", property: "Lekki Phase 1 House", amount: "₦420,000", status: "overdue", date: "5 days ago" },
  ];

  const upcomingRent = [
    { tenant: "David Smith", property: "Marina View 8B", amount: "₦280,000", dueDate: "Jan 31" },
    { tenant: "Lisa Garcia", property: "Banana Island Villa", amount: "₦850,000", dueDate: "Feb 1" },
    { tenant: "Tom Wilson", property: "Surulere Complex 4C", amount: "₦160,000", dueDate: "Feb 2" },
  ];

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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
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