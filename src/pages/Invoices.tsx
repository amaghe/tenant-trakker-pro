import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, Search, CheckCircle, XCircle, Clock, Users, Smartphone, Plus, RefreshCw, Trash2 } from 'lucide-react';
import { useTenants } from '@/hooks/useTenants';
import { usePayments } from '@/hooks/usePayments';
import { useToast } from '@/hooks/use-toast';
import { createInvoice, getInvoiceStatus, cancelInvoice } from '@/services/momo';

const Invoices = () => {
  const { tenants } = useTenants();
  const { payments, loading, addPayment, deletePayment, refetch: refetchPayments } = usePayments();
  const { toast } = useToast();
  
  // Form state
  const [selectedTenant, setSelectedTenant] = useState('');
  const [amount, setAmount] = useState<number>(0);
  const [msisdn, setMsisdn] = useState('');
  const [description, setDescription] = useState('Rent invoice');
  const [validityDuration, setValidityDuration] = useState<number>(24); // Default 24 hours
  const [creating, setCreating] = useState(false);
  
  // UI state
  const [searchQuery, setSearchQuery] = useState('');
  const [checkingAll, setCheckingAll] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  // Filter invoices (payments with momo_reference_id)
  const invoices = useMemo(() => {
    return payments.filter(payment => payment.momo_reference_id).filter(payment => {
      if (!searchQuery) return true;
      const query = searchQuery.toLowerCase();
      return (
        payment.tenant?.name?.toLowerCase().includes(query) ||
        payment.property?.name?.toLowerCase().includes(query) ||
        payment.momo_reference_id?.toLowerCase().includes(query)
      );
    });
  }, [payments, searchQuery]);

  // Handle tenant selection
  const handleTenantSelect = (tenantId: string) => {
    setSelectedTenant(tenantId);
    const tenant = tenants.find(t => t.id === tenantId);
    if (tenant) {
      setAmount(tenant.rent);
      setMsisdn(tenant.phone);
    }
  };

  // Create invoice
  const handleCreateInvoice = async () => {
    if (!selectedTenant || !amount || !msisdn) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    setCreating(true);
    try {
      const tenant = tenants.find(t => t.id === selectedTenant);
      if (!tenant) throw new Error('Tenant not found');

      // Create payment record first
      const paymentData = {
        tenant_id: selectedTenant,
        property_id: tenant.property_id,
        amount,
        status: 'pending' as const,
        payment_method: 'MTN Mobile Money',
        due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 days from now
      };

      const payment = await addPayment(paymentData, false);
      
      // Create MTN MoMo invoice
      const result = await createInvoice({
        paymentId: payment.id,
        amount,
        msisdn,
        description,
        validityDuration,
      });

      toast({
        title: "Invoice Created",
        description: `Reference ID: ${result.referenceId}`,
      });

      // Reset form
      setSelectedTenant('');
      setAmount(0);
      setMsisdn('');
      setDescription('Rent invoice');
      setValidityDuration(24);
      
      await refetchPayments();
    } catch (error) {
      console.error('Error creating invoice:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create invoice",
        variant: "destructive",
      });
    } finally {
      setCreating(false);
    }
  };

  // Check individual invoice status
  const handleCheckStatus = async (paymentId: string) => {
    setCheckingStatus(paymentId);
    try {
      await getInvoiceStatus({ paymentId });
      await refetchPayments();
      toast({
        title: "Status Updated",
        description: "Invoice status has been refreshed",
      });
    } catch (error) {
      console.error('Error checking status:', error);
      toast({
        title: "Error",
        description: "Failed to check invoice status",
        variant: "destructive",
      });
    } finally {
      setCheckingStatus(null);
    }
  };

  // Check all invoice statuses
  const handleCheckAllStatuses = async () => {
    const pendingInvoices = invoices.filter(p => p.momo_reference_id && p.status !== 'paid');
    if (pendingInvoices.length === 0) {
      toast({
        title: "Info",
        description: "No pending invoices to check",
      });
      return;
    }

    setCheckingAll(true);
    try {
      await Promise.all(
        pendingInvoices.map(payment => 
          getInvoiceStatus({ paymentId: payment.id }).catch(console.error)
        )
      );
      await refetchPayments();
      toast({
        title: "Status Updated",
        description: `Checked ${pendingInvoices.length} invoice(s)`,
      });
    } catch (error) {
      console.error('Error checking all statuses:', error);
      toast({
        title: "Error",
        description: "Failed to check some invoice statuses",
        variant: "destructive",
      });
    } finally {
      setCheckingAll(false);
    }
  };

  // Cancel invoice
  const handleCancelInvoice = async (paymentId: string) => {
    setCancelling(paymentId);
    try {
      await cancelInvoice({ paymentId });
      await refetchPayments();
      toast({
        title: "Invoice Cancelled",
        description: "The invoice has been cancelled successfully",
      });
    } catch (error) {
      console.error('Error cancelling invoice:', error);
      toast({
        title: "Error",
        description: "Failed to cancel invoice",
        variant: "destructive",
      });
    } finally {
      setCancelling(null);
    }
  };

  // Get badge variant for payment status
  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'paid': return 'default';
      case 'pending': return 'secondary';
      case 'overdue': return 'destructive';
      default: return 'secondary';
    }
  };

  // Get badge variant for invoice status
  const getInvoiceStatusBadgeVariant = (status?: string) => {
    switch (status) {
      case 'SUCCESSFUL': return 'default';
      case 'CREATED':
      case 'PENDING': return 'secondary';
      case 'FAILED':
      case 'CANCELLED': return 'destructive';
      default: return 'secondary';
    }
  };

  // Delete invoice
  const handleDeleteInvoice = async (paymentId: string) => {
    setDeleting(paymentId);
    try {
      await deletePayment(paymentId);
      toast({
        title: "Invoice Deleted",
        description: "The invoice has been deleted successfully",
      });
    } catch (error) {
      console.error('Error deleting invoice:', error);
      toast({
        title: "Error",
        description: "Failed to delete invoice",
        variant: "destructive",
      });
    } finally {
      setDeleting(null);
    }
  };

  if (loading) {
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
          <h1 className="text-3xl font-bold text-foreground">Invoices</h1>
          <p className="text-muted-foreground mt-1">Manage MTN Mobile Money invoices</p>
        </div>
        <div className="flex items-center space-x-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search by tenant, property, or reference..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 w-80"
            />
          </div>
          <Button 
            variant="outline"
            onClick={handleCheckAllStatuses}
            disabled={checkingAll || invoices.filter(p => p.status !== 'paid').length === 0}
          >
            {checkingAll ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4 mr-2" />
            )}
            Check All Statuses
          </Button>
        </div>
      </div>

      {/* Create Invoice Card */}
      <Card className="bg-gradient-card shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="w-5 h-5 text-primary" />
            Create New Invoice
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="space-y-2">
              <Label>Tenant</Label>
              <Select value={selectedTenant} onValueChange={handleTenantSelect}>
                <SelectTrigger>
                  <SelectValue placeholder="Select tenant" />
                </SelectTrigger>
                <SelectContent>
                  {tenants.map((tenant) => (
                    <SelectItem key={tenant.id} value={tenant.id}>
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4" />
                        {tenant.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>Amount (₦)</Label>
              <Input
                type="number"
                value={amount || ''}
                onChange={(e) => setAmount(Number(e.target.value))}
                placeholder="0"
              />
            </div>
            
            <div className="space-y-2">
              <Label>Phone Number</Label>
              <Input
                value={msisdn}
                onChange={(e) => setMsisdn(e.target.value)}
                placeholder="+46114477000"
              />
            </div>
            
            <div className="space-y-2">
              <Label>Validity (hours)</Label>
              <Input
                type="number"
                value={validityDuration}
                onChange={(e) => setValidityDuration(Number(e.target.value))}
                placeholder="24"
                min="1"
                max="168"
              />
            </div>
            
            <div className="space-y-2">
              <Label>Description</Label>
              <Input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Rent invoice"
              />
            </div>
          </div>
          
          <div className="flex justify-end">
            <Button 
              onClick={handleCreateInvoice}
              disabled={creating || !selectedTenant || !amount || !msisdn || !validityDuration}
              className="bg-primary hover:bg-primary/90"
            >
              {creating ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Smartphone className="w-4 h-4 mr-2" />
              )}
              Create Invoice
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Existing Invoices Table */}
      <Card className="bg-gradient-card shadow-card">
        <CardHeader>
          <CardTitle>Existing Invoices</CardTitle>
        </CardHeader>
        <CardContent>
          {invoices.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Smartphone className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No invoices found</p>
              <p className="text-sm">Create your first invoice above</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tenant</TableHead>
                  <TableHead>Property</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Invoice</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Reference</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.map((payment) => (
                  <TableRow key={payment.id}>
                    <TableCell className="font-medium">
                      {payment.tenant?.name || 'Unknown'}
                    </TableCell>
                    <TableCell>
                      {payment.property?.name || 'N/A'}
                    </TableCell>
                    <TableCell>
                      ₦{payment.amount.toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <Badge variant={getStatusBadgeVariant(payment.status)}>
                        {payment.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getInvoiceStatusBadgeVariant(payment.momo_invoice_status)}>
                        {payment.momo_invoice_status || 'UNKNOWN'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {new Date(payment.due_date).toLocaleDateString()}
                    </TableCell>
                     <TableCell>
                       <code className="text-xs bg-muted px-2 py-1 rounded font-mono">
                         {payment.momo_reference_id || 'N/A'}
                       </code>
                     </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end space-x-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleCheckStatus(payment.id)}
                          disabled={checkingStatus === payment.id}
                        >
                          {checkingStatus === payment.id ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <RefreshCw className="w-3 h-3" />
                          )}
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleCancelInvoice(payment.id)}
                          disabled={
                            cancelling === payment.id ||
                            payment.momo_invoice_status === 'CANCELLED' ||
                            payment.status === 'paid'
                          }
                        >
                          {cancelling === payment.id ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <XCircle className="w-3 h-3" />
                          )}
                        </Button>
                        {(payment.status === 'pending' || payment.momo_invoice_status === 'CREATED') && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDeleteInvoice(payment.id)}
                            disabled={deleting === payment.id}
                            className="text-destructive hover:text-destructive"
                          >
                            {deleting === payment.id ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              <Trash2 className="w-3 h-3" />
                            )}
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Invoices;
