import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Plus, Phone, Mail, MapPin, Calendar, DollarSign } from "lucide-react";
import { useState } from "react";

const Tenants = () => {
  const [tenants] = useState([
    {
      id: 1,
      name: "John Doe",
      email: "john.doe@email.com",
      phone: "+234 801 234 5678",
      property: "Lagos Heights Apt 2B",
      rent: "₦180,000",
      nextPayment: "Jan 31, 2024",
      status: "active",
      leaseStart: "Jan 1, 2023",
      leaseEnd: "Dec 31, 2024",
      avatar: ""
    },
    {
      id: 2,
      name: "Sarah Wilson",
      email: "sarah.wilson@email.com",
      phone: "+234 802 345 6789",
      property: "Victoria Garden 5A",
      rent: "₦220,000",
      nextPayment: "Feb 1, 2024",
      status: "active",
      leaseStart: "Feb 1, 2023",
      leaseEnd: "Jan 31, 2025",
      avatar: ""
    },
    {
      id: 3,
      name: "Mike Johnson",
      email: "mike.johnson@email.com",
      phone: "+234 803 456 7890",
      property: "Ikoyi Towers 12F",
      rent: "₦350,000",
      nextPayment: "Jan 28, 2024",
      status: "overdue",
      leaseStart: "May 1, 2023",
      leaseEnd: "Apr 30, 2025",
      avatar: ""
    },
    {
      id: 4,
      name: "Emma Brown",
      email: "emma.brown@email.com",
      phone: "+234 804 567 8901",
      property: "Lekki Phase 1 House",
      rent: "₦420,000",
      nextPayment: "Feb 5, 2024",
      status: "pending",
      leaseStart: "Mar 1, 2023",
      leaseEnd: "Feb 28, 2025",
      avatar: ""
    }
  ]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-success text-success-foreground';
      case 'overdue':
        return 'bg-destructive text-destructive-foreground';
      case 'pending':
        return 'bg-warning text-warning-foreground';
      default:
        return 'bg-secondary text-secondary-foreground';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Tenants</h1>
          <p className="text-muted-foreground mt-1">Manage tenant relationships and communications</p>
        </div>
        <Button className="bg-gradient-primary text-white shadow-elegant hover:shadow-lg transition-all">
          <Plus className="w-4 h-4 mr-2" />
          Add Tenant
        </Button>
      </div>

      {/* Tenants Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {tenants.map((tenant) => (
          <Card key={tenant.id} className="bg-gradient-card shadow-card hover:shadow-elegant transition-all">
            <CardHeader className="pb-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-3">
                  <Avatar className="w-12 h-12">
                    <AvatarImage src={tenant.avatar} />
                    <AvatarFallback className="bg-primary text-primary-foreground">
                      {tenant.name.split(' ').map(n => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <CardTitle className="text-lg font-semibold text-foreground">
                      {tenant.name}
                    </CardTitle>
                    <div className="flex items-center text-muted-foreground text-sm mt-1">
                      <MapPin className="w-4 h-4 mr-1" />
                      {tenant.property}
                    </div>
                  </div>
                </div>
                <Badge className={getStatusColor(tenant.status)}>
                  {tenant.status}
                </Badge>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              {/* Contact Information */}
              <div className="space-y-2">
                <div className="flex items-center text-sm">
                  <Mail className="w-4 h-4 text-primary mr-2" />
                  <span className="text-muted-foreground">{tenant.email}</span>
                </div>
                <div className="flex items-center text-sm">
                  <Phone className="w-4 h-4 text-primary mr-2" />
                  <span className="text-muted-foreground">{tenant.phone}</span>
                </div>
              </div>

              {/* Payment Information */}
              <div className="bg-muted rounded-lg p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Monthly Rent</span>
                  <div className="flex items-center">
                    <DollarSign className="w-4 h-4 text-success mr-1" />
                    <span className="font-semibold text-foreground">{tenant.rent}</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Next Payment</span>
                  <div className="flex items-center">
                    <Calendar className="w-4 h-4 text-warning mr-1" />
                    <span className="text-sm text-foreground">{tenant.nextPayment}</span>
                  </div>
                </div>
              </div>

              {/* Lease Information */}
              <div className="text-sm text-muted-foreground">
                <div className="flex justify-between">
                  <span>Lease Period:</span>
                  <span>{tenant.leaseStart} - {tenant.leaseEnd}</span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex space-x-2 pt-2">
                <Button variant="outline" size="sm" className="flex-1">
                  Send Message
                </Button>
                <Button variant="ghost" size="sm" className="flex-1">
                  View Details
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default Tenants;