import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Mail, Phone, MapPin, Calendar, DollarSign, Loader2, UserPlus, Edit2, Trash2, Users, MessageCircle, Smartphone, Send } from "lucide-react";
import { useTenants } from "@/hooks/useTenants";
import { usePayments } from "@/hooks/usePayments";
import { useMtnMomo } from "@/hooks/useMtnMomo";
import TenantFormDialog from "./TenantFormDialog";
import { useState } from "react";

const Tenants = () => {
  const { tenants, loading, addTenant, updateTenant, deleteTenant } = useTenants();
  const { payments, addPayment, refetch: refetchPayments } = usePayments();
  const { loading: mtnLoading, requestPayment } = useMtnMomo();
  const [formLoading, setFormLoading] = useState(false);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState<string | null>(null);
  const [paymentAmount, setPaymentAmount] = useState<number>(0);

  // Helper function to get recent payment status for a tenant
  const getTenantPaymentStatus = (tenantId: string) => {
    const tenantPayments = payments.filter(p => p.tenant_id === tenantId);
    const recentPayment = tenantPayments
      .sort((a, b) => new Date(b.created_at || '').getTime() - new Date(a.created_at || '').getTime())[0];
    return recentPayment;
  };

  const handleAddTenant = async (tenantData: any) => {
    setFormLoading(true);
    try {
      await addTenant(tenantData);
    } finally {
      setFormLoading(false);
    }
  };

  const handleUpdateTenant = async (tenantData: any, tenantId: string) => {
    setFormLoading(true);
    try {
      await updateTenant(tenantId, tenantData);
    } finally {
      setFormLoading(false);
    }
  };

  const handleDeleteTenant = async (tenantId: string) => {
    try {
      await deleteTenant(tenantId);
    } catch (error) {
      console.error('Error deleting tenant:', error);
    }
  };

  const handleSendPaymentRequest = async (tenant: any) => {
    if (mtnLoading) return; // Prevent double submission
    
    try {
      const amount = paymentAmount || tenant.rent;
      
      // First create a payment record
      const today = new Date();
      const dueDate = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 30); // 30 days from now
      
      const paymentRecord = await addPayment({
        tenant_id: tenant.id,
        property_id: tenant.property_id || '',
        amount: amount,
        status: 'pending',
        payment_method: 'MTN Mobile Money',
        due_date: dueDate.toISOString().split('T')[0],
      });

      // Then send the MTN MoMo request with the payment ID
      const referenceId = await requestPayment({
        phoneNumber: tenant.phone,
        amount: amount,
        tenantId: tenant.id,
        paymentId: paymentRecord?.id,
      });

      if (referenceId) {
        setPaymentDialogOpen(null);
        setPaymentAmount(0);
        // Refresh payments to show the new request
        await refetchPayments();
      }
    } catch (error) {
      console.error('Error sending payment request:', error);
    }
  };

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

  const activeTenantsCount = tenants.filter(t => t.status === 'active').length;
  const overdueTenantsCount = tenants.filter(t => t.status === 'overdue').length;
  const totalRent = tenants.reduce((sum, t) => sum + t.rent, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Tenants</h1>
          <p className="text-muted-foreground mt-1">Manage tenant relationships and communications</p>
        </div>
        <TenantFormDialog
          trigger={
            <Button className="bg-gradient-primary text-white shadow-elegant hover:shadow-lg transition-all">
              <UserPlus className="w-4 h-4 mr-2" />
              Add Tenant
            </Button>
          }
          onSubmit={handleAddTenant}
          loading={formLoading}
        />
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="bg-gradient-card shadow-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Tenants
            </CardTitle>
            <Users className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{tenants.length}</div>
            <p className="text-xs text-muted-foreground mt-1">Active tenants</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-card shadow-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Active Tenants
            </CardTitle>
            <Users className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{activeTenantsCount}</div>
            <p className="text-xs text-success mt-1">Currently active</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-card shadow-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Overdue
            </CardTitle>
            <Users className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{overdueTenantsCount}</div>
            <p className="text-xs text-destructive mt-1">Need attention</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-card shadow-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Monthly Rent
            </CardTitle>
            <DollarSign className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">₦{totalRent.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1">Expected monthly</p>
          </CardContent>
        </Card>
      </div>

      {/* Tenants Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {tenants.map((tenant) => {
          const recentPayment = getTenantPaymentStatus(tenant.id);
          
          return (
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
                  <div className="flex items-center gap-2 mt-2">
                    <Badge 
                      variant={getStatusColor(tenant.status)} 
                      className="mt-0"
                    >
                      {tenant.status}
                    </Badge>
                    {recentPayment && (
                      <Badge 
                        variant={recentPayment.status === 'paid' ? 'default' : recentPayment.status === 'pending' ? 'secondary' : 'destructive'}
                        className="text-xs"
                      >
                        {recentPayment.status === 'pending' ? 'Payment Requested' : 
                         recentPayment.status === 'paid' ? 'Recently Paid' : 
                         'Payment Overdue'}
                      </Badge>
                    )}
                  </div>
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
                  <MessageCircle className="w-4 h-4 mr-2" />
                  Message
                </Button>
                <Dialog open={paymentDialogOpen === tenant.id} onOpenChange={(open) => setPaymentDialogOpen(open ? tenant.id : null)}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm" className="flex-1 bg-success/10 hover:bg-success/20 text-success border-success/20">
                      <Smartphone className="w-4 h-4 mr-2" />
                      Request Payment
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[400px]">
                    <DialogHeader>
                      <DialogTitle className="flex items-center gap-2">
                        <Smartphone className="w-5 h-5 text-success" />
                        Send Payment Request to {tenant.name}
                      </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label>Phone Number</Label>
                        <Input value={tenant.phone} disabled className="bg-muted" />
                      </div>
                      <div className="space-y-2">
                        <Label>Amount (₦)</Label>
                        <Input
                          type="number"
                          value={paymentAmount || tenant.rent}
                          onChange={(e) => setPaymentAmount(Number(e.target.value))}
                          placeholder={`Default: ₦${tenant.rent.toLocaleString()}`}
                        />
                        <p className="text-xs text-muted-foreground">
                          Default is monthly rent amount. You can change it for custom amounts.
                        </p>
                      </div>
                      <div className="flex justify-end space-x-2 pt-4">
                        <Button variant="outline" onClick={() => setPaymentDialogOpen(null)}>
                          Cancel
                        </Button>
                        <Button 
                          onClick={() => handleSendPaymentRequest(tenant)}
                          disabled={mtnLoading}
                          className="bg-success hover:bg-success/90 text-white"
                        >
                          {mtnLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                          <Send className="w-4 h-4 mr-2" />
                          Send Request
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
                <TenantFormDialog
                  trigger={
                    <Button variant="ghost" size="sm">
                      <Edit2 className="w-4 h-4 mr-2" />
                      Edit
                    </Button>
                  }
                  tenant={tenant}
                  onSubmit={(data) => handleUpdateTenant(data, tenant.id)}
                  loading={formLoading}
                />
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive">
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete Tenant</AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to delete {tenant.name}? This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction 
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        onClick={() => handleDeleteTenant(tenant.id)}
                      >
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </CardContent>
          </Card>
        )})}
      </div>

      {tenants.length === 0 && (
        <Card className="bg-gradient-card shadow-card">
          <CardContent className="p-8 text-center">
            <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">No tenants yet</h3>
            <p className="text-muted-foreground mb-4">Start by adding your first tenant to manage their information and leases.</p>
            <TenantFormDialog
              trigger={
                <Button>
                  <UserPlus className="w-4 h-4 mr-2" />
                  Add Your First Tenant
                </Button>
              }
              onSubmit={handleAddTenant}
              loading={formLoading}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Tenants;