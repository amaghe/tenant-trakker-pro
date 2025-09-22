import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Mail, Phone, MapPin, Calendar, DollarSign, Loader2 } from "lucide-react";
import { useTenants } from "@/hooks/useTenants";

const Tenants = () => {
  const { tenants, loading } = useTenants();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'default';
      case 'overdue':
        return 'destructive';
      case 'pending':
        return 'secondary';
      default:
        return 'secondary';
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
          <DollarSign className="w-4 h-4 mr-2" />
          Add Tenant
        </Button>
      </div>

      {/* Tenants Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {tenants.map((tenant) => (
          <Card key={tenant.id} className="bg-gradient-card shadow-card hover:shadow-elegant transition-all">
            <CardHeader className="pb-4">
              <div className="flex items-start space-x-4">
                <Avatar className="h-12 w-12">
                  <AvatarImage src={tenant.avatar_url} alt={tenant.name} />
                  <AvatarFallback className="bg-primary/10 text-primary font-medium">
                    {tenant.name.split(' ').map(n => n[0]).join('')}
                  </AvatarFallback>
                </Avatar>
                <div className="ml-4 flex-1">
                  <h3 className="font-semibold text-foreground">{tenant.name}</h3>
                  <div className="flex items-center mt-1">
                    <MapPin className="w-4 h-4 text-muted-foreground mr-1" />
                    <span className="text-sm text-muted-foreground">
                      {tenant.property ? `${tenant.property.name} - ${tenant.property.address}` : 'No property assigned'}
                    </span>
                  </div>
                  <Badge 
                    variant={getStatusColor(tenant.status)} 
                    className="mt-2"
                  >
                    {tenant.status}
                  </Badge>
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4 mt-4">
                <div className="flex items-center space-x-2">
                  <Mail className="w-4 h-4 text-primary" />
                  <span className="text-sm text-muted-foreground">{tenant.email}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Phone className="w-4 h-4 text-primary" />
                  <span className="text-sm text-muted-foreground">{tenant.phone}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <DollarSign className="w-4 h-4 text-primary" />
                  <span className="text-sm text-muted-foreground">₦{tenant.rent.toLocaleString()}/month</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Calendar className="w-4 h-4 text-primary" />
                  <span className="text-sm text-muted-foreground">
                    Lease: {new Date(tenant.lease_start).toLocaleDateString()} - {new Date(tenant.lease_end).toLocaleDateString()}
                  </span>
                </div>
              </div>

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