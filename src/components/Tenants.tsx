import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Mail, Phone, Calendar, DollarSign, Loader2, UserPlus, Edit2, Trash2, Users, MessageCircle, Smartphone, Send, Eye, MoreHorizontal } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useTenants } from "@/hooks/useTenants";
import { usePayments } from "@/hooks/usePayments";
import { useMtnMomo } from "@/hooks/useMtnMomo";
import TenantFormDialog from "./TenantFormDialog";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useProperties } from '@/hooks/useProperties';

const Tenants = () => {
  const { toast } = useToast();
  const { tenants, loading, addTenant, updateTenant, deleteTenant } = useTenants();
  const { payments, addPayment, refetch: refetchPayments } = usePayments();
  const { loading: mtnLoading, createInvoice } = useMtnMomo();
  const [formLoading, setFormLoading] = useState(false);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState<string | null>(null);
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const { properties, refetch } = useProperties();

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
      
      // First create a payment record (without showing toast)
      const today = new Date();
      const dueDate = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 30); // 30 days from now
      
      const paymentRecord = await addPayment({
        tenant_id: tenant.id,
        property_id: tenant.property_id || '',
        amount: amount,
        status: 'pending',
        payment_method: 'MTN Mobile Money',
        due_date: dueDate.toISOString().split('T')[0],
      }, false); // Don't show toast yet

      // Then send the MTN MoMo request with the payment ID
      const referenceId = await createInvoice({
        paymentId: paymentRecord?.id || '',
        amount: amount,
        msisdn: tenant.phone,
      });

      if (referenceId) {
        // Only show success after complete flow succeeds
        toast({
          title: "Success",
          description: "Invoice created successfully",
        });
        
        setPaymentDialogOpen(null);
        setPaymentAmount(0);
        // Refresh payments to show the new request
        await refetchPayments();
      }
    } catch (error) {
      console.error('Error creating invoice:', error);
      
      // Show appropriate error message
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      toast({
        title: "Error",
        description: `Failed to create invoice: ${errorMessage}`,
        variant: "destructive",
      });
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

      {/* Tenants List */}
      {tenants.length === 0 ? (
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
      ) : (
        <Card className="bg-gradient-card shadow-card">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent border-b border-border">
                    <TableHead className="font-semibold">Tenant</TableHead>
                    <TableHead className="font-semibold">Status</TableHead>
                    <TableHead className="font-semibold">Lease Period</TableHead>
                    <TableHead className="font-semibold">Contact</TableHead>
                    <TableHead className="font-semibold text-right">Rent</TableHead>
                    <TableHead className="font-semibold text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tenants.map((tenant) => {
                    const recentPayment = getTenantPaymentStatus(tenant.id);
                    
                    return (
                      <TableRow key={tenant.id} className="hover:bg-muted/50 transition-colors">
                        <TableCell>
                          <div className="flex items-center space-x-3">
                            <Avatar className="h-10 w-10">
                              <AvatarImage src={tenant.avatar_url} alt={tenant.name} />
                              <AvatarFallback className="bg-primary/10 text-primary font-medium text-sm">
                                {tenant.name.split(' ').map(n => n[0]).join('')}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="font-medium text-foreground">{tenant.name}</div>
                              <div className="text-sm text-muted-foreground">
                                 {tenant.status === 'inactive' ? 'N/A': (tenant.properties && tenant.properties.length > 0 ? tenant.properties.map(p => p.name).join(', '): 'Unassigned')}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            <Badge 
                              variant={getStatusColor(tenant.status)} 
                              className="w-fit"
                            >
                              {tenant.status}
                            </Badge>
                            {recentPayment && (
                              <Badge 
                                variant={recentPayment.status === 'paid' ? 'default' : recentPayment.status === 'pending' ? 'secondary' : 'destructive'}
                                className="text-xs w-fit"
                              >
                                {recentPayment.status === 'pending' ? 'Invoice' : 
                                 recentPayment.status === 'paid' ? 'Paid' : 
                                 'Overdue'}
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-1 text-sm text-muted-foreground">
                            <Calendar className="w-4 h-4 flex-shrink-0" />
                            <div className="flex flex-col">
                              <span className="text-xs">Start: {new Date(tenant.lease_start).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                              <span className="text-xs">End: {new Date(tenant.lease_end).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1 text-sm">
                            <div className="flex items-center space-x-1 text-muted-foreground">
                              <Mail className="w-3 h-3 flex-shrink-0" />
                              <span className="truncate max-w-[200px]">{tenant.email}</span>
                            </div>
                            <div className="flex items-center space-x-1 text-muted-foreground">
                              <Phone className="w-3 h-3 flex-shrink-0" />
                              <span>{tenant.phone}</span>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end space-x-1 font-medium">
                            <DollarSign className="w-4 h-4 text-primary" />
                            <span>₦{tenant.rent.toLocaleString()}</span>
                          </div>
                          <span className="text-xs text-muted-foreground">/month</span>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end space-x-1">
                            <Button variant="ghost" size="sm" asChild>
                              <Link to={`/tenant/${tenant.id}`}>
                                <Eye className="w-4 h-4" />
                              </Link>
                            </Button>
                            
                            <Dialog open={paymentDialogOpen === tenant.id} onOpenChange={(open) => setPaymentDialogOpen(open ? tenant.id : null)}>
                              <DialogTrigger asChild>
                                <Button variant="ghost" size="sm" className="text-success hover:text-success">
                                  <Smartphone className="w-4 h-4" />
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="sm:max-w-[400px]">
                                <DialogHeader>
                                  <DialogTitle className="flex items-center gap-2">
                                    <Smartphone className="w-5 h-5 text-success" />
                                    Create Invoice for {tenant.name}
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
                                      Create Invoice
                                    </Button>
                                  </div>
                                </div>
                              </DialogContent>
                            </Dialog>

                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  <MoreHorizontal className="w-4 h-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <TenantFormDialog
                                  trigger={
                                    <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                                      <Edit2 className="w-4 h-4 mr-2" />
                                      Edit
                                    </DropdownMenuItem>
                                  }
                                  tenant={tenant}
                                  onSubmit={(data) => handleUpdateTenant(data, tenant.id)}
                                  loading={formLoading}
                                />
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <DropdownMenuItem 
                                      onSelect={(e) => e.preventDefault()}
                                      className="text-destructive focus:text-destructive"
                                    >
                                      <Trash2 className="w-4 h-4 mr-2" />
                                      Delete
                                    </DropdownMenuItem>
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
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Tenants;
