import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Badge } from '@/components/ui/badge';
import { CalendarIcon, Plus, Trash2, Upload } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Tenant, EmergencyContact } from '@/hooks/useTenants';
import { useProperties } from '@/hooks/useProperties';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface TenantFormDialogProps {
  trigger: React.ReactNode;
  tenant?: Tenant;
  onSubmit: (data: Omit<Tenant, 'id'>) => Promise<void>;
  loading: boolean;
}

export default function TenantFormDialog({ trigger, tenant, onSubmit, loading }: TenantFormDialogProps) {
  const [open, setOpen] = useState(false);
  const { properties, refetch: refetchProperties } = useProperties();
  const { toast } = useToast();
  const [uploading, setUploading] = useState({ id: false, lease: false });
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    property_id: '' as string,
    rent: '',
    status: 'active' as 'active' | 'inactive' | 'overdue' | 'pending',
    lease_start: '',
    lease_end: '',
    emergency_contacts: [] as EmergencyContact[],
    id_document_url: '',
    lease_document_url: '',
    notes: ''
  });

  useEffect(() => {
    if (tenant) {
      setFormData({
        name: tenant.name || '',
        email: tenant.email || '',
        phone: tenant.phone || '',
        property_id: properties.find(p => p.tenant_id === tenant.id)?.id || '',
        rent: tenant.rent?.toString() || '',
        status: tenant.status || 'active',
        lease_start: tenant.lease_start || '',
        lease_end: tenant.lease_end || '',
        emergency_contacts: tenant.emergency_contacts || [],
        id_document_url: tenant.id_document_url || '',
        lease_document_url: tenant.lease_document_url || '',
        notes: tenant.notes || ''
      });
    } else {
      setFormData({
        name: '',
        email: '',
        phone: '',
        property_id: '',
        rent: '',
        status: 'active' as 'active' | 'inactive' | 'overdue' | 'pending',
        lease_start: '',
        lease_end: '',
        emergency_contacts: [],
        id_document_url: '',
        lease_document_url: '',
        notes: ''
      });
    }
  }, [tenant, open]);

  useEffect(() => {
    if (open) {
      refetchProperties(); // Ensure we have latest property data
    }
  }, [open, refetchProperties]);

  const handleFileUpload = async (file: File, type: 'id' | 'lease') => {
    const bucketName = type === 'id' ? 'tenant-documents' : 'lease-documents';
    const fileName = `temp_${type}_${Date.now()}.${file.name.split('.').pop()}`;
    
    setUploading(prev => ({ ...prev, [type]: true }));
    
    try {
      const { error: uploadError } = await supabase.storage
        .from(bucketName)
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from(bucketName)
        .getPublicUrl(fileName);

      const fieldName = type === 'id' ? 'id_document_url' : 'lease_document_url';
      setFormData(prev => ({ ...prev, [fieldName]: publicUrl }));
      
      toast({
        title: "Success",
        description: `${type === 'id' ? 'ID document' : 'Lease document'} uploaded successfully`,
      });
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: "Error",
        description: "Failed to upload file",
        variant: "destructive",
      });
    } finally {
      setUploading(prev => ({ ...prev, [type]: false }));
    }
  };

  const addEmergencyContact = () => {
    setFormData(prev => ({
      ...prev,
      emergency_contacts: [...prev.emergency_contacts, { name: '', phone: '', email: '' }]
    }));
  };

  const removeEmergencyContact = (index: number) => {
    setFormData(prev => ({
      ...prev,
      emergency_contacts: prev.emergency_contacts.filter((_, i) => i !== index)
    }));
  };

  const updateEmergencyContact = (index: number, field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      emergency_contacts: prev.emergency_contacts.map((contact, i) => 
        i === index ? { ...contact, [field]: value } : contact
      )
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const tenantData = {
      ...formData,
      rent: parseFloat(formData.rent),
    };
    
    await onSubmit(tenantData);
    // Refetch properties to ensure status is updated across all views
    refetchProperties();
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {tenant ? 'Edit Tenant' : 'Add New Tenant'}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                placeholder="Enter full name"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select value={formData.status} onValueChange={(value) => setFormData({...formData, status: value as any})}>
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="overdue">Overdue</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="Enter email address"
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                placeholder="Enter phone number"
                value={formData.phone}
                onChange={(e) => setFormData({...formData, phone: e.target.value})}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="property">Property</Label>
            {formData.status === 'inactive' ? (
              <Input value="N/A" disabled />
            ) : (
          <Select 
            value={formData.property_id || 'none'} 
            onValueChange={(value) => {
              // Handle unassignment with special "none" value
              if (value === 'none') {
                setFormData({
                  ...formData, 
                  property_id: '',
                  rent: tenant?.rent.toString() || ''
                });
              } else {
                const selectedProperty = properties.find(p => p.id === value);
                setFormData({
                  ...formData, 
                  property_id: value,
                  rent: selectedProperty ? selectedProperty.rent.toString() : formData.rent
                });
              }
            }}
          >
                <SelectTrigger>
                  <SelectValue placeholder="Select property or leave unassigned" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None (Unassign)</SelectItem>
                  {properties
                    .filter(p => 
                      !p.tenant_id || 
                      (tenant && p.tenant_id === tenant.id)
                    )
                    .map((property) => {
                      const isAssigned = property.tenant_id === tenant?.id;
                      return (
                        <SelectItem key={property.id} value={property.id}>
                          <div className="flex items-center gap-2">
                            <span>{property.name} - {property.address}</span>
                            {isAssigned && <Badge variant="outline" className="ml-2">Assigned</Badge>}
                          </div>
                        </SelectItem>
                      );
                    })}
                </SelectContent>
              </Select>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="rent">Monthly Rent (Auto-filled)</Label>
              <Input
                id="rent"
                type="number"
                placeholder={formData.property_id ? "Auto-filled from property" : "Select a property first"}
                value={formData.rent}
                disabled={true}
                className="bg-secondary/20"
                required
              />
              <p className="text-xs text-muted-foreground">Rent is automatically set based on the selected property</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="deposit">Security Deposit (Auto-set)</Label>
              <Input
                id="deposit"
                type="number"
                value={formData.property_id ? properties.find(p => p.id === formData.property_id)?.deposit || 0 : ''}
                placeholder={formData.property_id ? "Auto-filled from property" : "N/A"}
                disabled={true}
                className="bg-secondary/20"
              />
              <p className="text-xs text-muted-foreground">Deposit is automatically set based on the selected property</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Lease Start Date</Label>
              <Popover modal={false}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !formData.lease_start && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formData.lease_start ? format(new Date(formData.lease_start), "PPP") : "Pick start date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={formData.lease_start ? new Date(formData.lease_start) : undefined}
                    onSelect={(date) => setFormData({...formData, lease_start: date ? date.toISOString().split('T')[0] : ''})}
                    initialFocus
                    className={cn("p-3 pointer-events-auto")}
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-2">
              <Label>Lease End Date</Label>
              <Popover modal={false}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !formData.lease_end && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formData.lease_end ? format(new Date(formData.lease_end), "PPP") : "Pick end date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={formData.lease_end ? new Date(formData.lease_end) : undefined}
                    onSelect={(date) => setFormData({...formData, lease_end: date ? date.toISOString().split('T')[0] : ''})}
                    initialFocus
                    className={cn("p-3 pointer-events-auto")}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Emergency Contacts */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Emergency Contacts (Optional)</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addEmergencyContact}
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Contact
              </Button>
            </div>
            {formData.emergency_contacts.map((contact, index) => (
              <div key={index} className="space-y-2 p-4 border rounded-lg">
                <div className="flex items-center justify-between">
                  <Label>Contact {index + 1}</Label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeEmergencyContact(index)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
                <div className="grid grid-cols-1 gap-2">
                  <Input
                    placeholder="Name"
                    value={contact.name}
                    onChange={(e) => updateEmergencyContact(index, 'name', e.target.value)}
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      placeholder="Phone"
                      value={contact.phone || ''}
                      onChange={(e) => updateEmergencyContact(index, 'phone', e.target.value)}
                    />
                    <Input
                      placeholder="Email"
                      type="email"
                      value={contact.email || ''}
                      onChange={(e) => updateEmergencyContact(index, 'email', e.target.value)}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* File Uploads */}
          <div className="space-y-4">
            {/* ID Document Upload */}
            <div className="space-y-2">
              <Label>ID / Passport Document (Optional)</Label>
              {formData.id_document_url ? (
                <div className="flex items-center gap-2">
                  <span className="flex-1 text-sm">Document uploaded</span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => document.getElementById('id-upload')?.click()}
                    disabled={uploading.id}
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    Replace
                  </Button>
                </div>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() => document.getElementById('id-upload')?.click()}
                  disabled={uploading.id}
                >
                  <Upload className="w-4 h-4 mr-2" />
                  {uploading.id ? 'Uploading...' : 'Upload ID Document'}
                </Button>
              )}
              <input
                id="id-upload"
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileUpload(file, 'id');
                }}
              />
            </div>

            {/* Lease Document Upload */}
            <div className="space-y-2">
              <Label>Lease Document (Optional)</Label>
              {formData.lease_document_url ? (
                <div className="flex items-center gap-2">
                  <span className="flex-1 text-sm">Document uploaded</span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => document.getElementById('lease-upload')?.click()}
                    disabled={uploading.lease}
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    Replace
                  </Button>
                </div>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() => document.getElementById('lease-upload')?.click()}
                  disabled={uploading.lease}
                >
                  <Upload className="w-4 h-4 mr-2" />
                  {uploading.lease ? 'Uploading...' : 'Upload Lease Document'}
                </Button>
              )}
              <input
                id="lease-upload"
                type="file"
                accept=".pdf"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileUpload(file, 'lease');
                }}
              />
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Internal Notes (Optional)</Label>
            <Textarea
              id="notes"
              placeholder="Add internal notes about this tenant..."
              value={formData.notes}
              onChange={(e) => setFormData({...formData, notes: e.target.value})}
              rows={3}
            />
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {tenant ? 'Update Tenant' : 'Add Tenant'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}