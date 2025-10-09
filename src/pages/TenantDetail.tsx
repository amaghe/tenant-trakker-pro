import React, { useState, useEffect, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Edit2, Download, Upload, Plus, Trash2, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { useTenants, Tenant, EmergencyContact } from '@/hooks/useTenants';
import { useProperties } from '@/hooks/useProperties';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';

export default function TenantDetail() {
  const { id } = useParams<{ id: string }>();
  const { tenants, updateTenant, loading } = useTenants();
  const { properties } = useProperties();
  const { toast } = useToast();
  
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<Partial<Tenant>>({});
  const [uploading, setUploading] = useState({ id: false, lease: false });

  useEffect(() => {
    const foundTenant = tenants.find(t => t.id === id);
    if (foundTenant) {
      setTenant(foundTenant);
      setFormData(foundTenant);
    }
  }, [id, tenants]);

  // Find property assigned to this tenant
  const assignedProperty = useMemo(() => {
    if (!tenant?.id) return null;
    return properties.find(p => p.tenant_id === tenant.id);
  }, [properties, tenant?.id]);

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleEmergencyContactChange = (index: number, field: string, value: string) => {
    const contacts = [...(formData.emergency_contacts || [])];
    contacts[index] = { ...contacts[index], [field]: value };
    handleInputChange('emergency_contacts', contacts);
  };

  const addEmergencyContact = () => {
    const contacts = [...(formData.emergency_contacts || [])];
    contacts.push({ name: '', phone: '', email: '' });
    handleInputChange('emergency_contacts', contacts);
  };

  const removeEmergencyContact = (index: number) => {
    const contacts = [...(formData.emergency_contacts || [])];
    contacts.splice(index, 1);
    handleInputChange('emergency_contacts', contacts);
  };

  const handleFileUpload = async (file: File, type: 'id' | 'lease') => {
    if (!tenant) return;
    
    const bucketName = type === 'id' ? 'tenant-documents' : 'lease-documents';
    const fileName = `${tenant.id}_${type}_${Date.now()}.${file.name.split('.').pop()}`;
    
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
      handleInputChange(fieldName, publicUrl);
      
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

  const handleDownload = (url: string, filename: string) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
  };

  const handleSave = async () => {
    if (!tenant || !id) return;
    
    try {
      await updateTenant(id, formData);
      setTenant({ ...tenant, ...formData });
      setIsEditing(false);
      toast({
        title: "Success",
        description: "Tenant details updated successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update tenant details",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <Skeleton className="h-8 w-48" />
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-32" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!tenant) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="text-center py-8">
            <p className="text-muted-foreground">Tenant not found</p>
            <Button asChild className="mt-4">
              <Link to="/?tab=tenants">Back to Tenants</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" asChild>
            <Link to="/?tab=tenants">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Tenants
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold">{tenant.name}</h1>
            <p className="text-muted-foreground">{tenant.email}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={tenant.status === 'active' ? 'default' : 'secondary'}>
            {tenant.status}
          </Badge>
          <Button
            variant={isEditing ? "default" : "outline"}
            onClick={() => isEditing ? handleSave() : setIsEditing(true)}
          >
            <Edit2 className="w-4 h-4 mr-2" />
            {isEditing ? 'Save Changes' : 'Edit'}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={formData.name || ''}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  disabled={!isEditing}
                />
              </div>
              <div>
                <Label htmlFor="status">Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value) => handleInputChange('status', value)}
                  disabled={!isEditing}
                >
                  <SelectTrigger>
                    <SelectValue />
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
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email || ''}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  disabled={!isEditing}
                />
              </div>
              <div>
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  value={formData.phone || ''}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                  disabled={!isEditing}
                />
              </div>
            </div>

            <div>
              <Label>Properties</Label>
              {formData.status === 'inactive' ? (
                <Input value="N/A" disabled />
              ) : (
                <div className="space-y-2">
                  {assignedProperty ? (
                    <div className="flex items-center justify-between p-2 border rounded bg-secondary/10">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{assignedProperty.name} - {assignedProperty.address}</span>
                        <Badge variant="secondary" className="text-xs">Assigned</Badge>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No properties assigned</p>
                  )}
                  {isEditing && (
                    <p className="text-sm text-muted-foreground">
                      Manage property assignments from the Properties page
                    </p>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Lease Information */}
        <Card>
          <CardHeader>
            <CardTitle>Lease Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="rent">Monthly Rent (Auto-set)</Label>
                <Input
                  id="rent"
                  type="number"
                  value={assignedProperty?.rent || formData.rent || ''}
                  disabled={true}
                  className="bg-secondary/20"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Rent is automatically set from the assigned property
                </p>
              </div>
              <div>
                <Label htmlFor="deposit">Security Deposit</Label>
                <Input
                  id="deposit"
                  type="number"
                  value={formData.deposit || ''}
                  onChange={(e) => handleInputChange('deposit', parseFloat(e.target.value))}
                  disabled={!isEditing}
                  placeholder="Optional"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="lease_start">Lease Start</Label>
                <Input
                  id="lease_start"
                  type="date"
                  value={formData.lease_start || ''}
                  onChange={(e) => handleInputChange('lease_start', e.target.value)}
                  disabled={!isEditing}
                />
              </div>
              <div>
                <Label htmlFor="lease_end">Lease End</Label>
                <Input
                  id="lease_end"
                  type="date"
                  value={formData.lease_end || ''}
                  onChange={(e) => handleInputChange('lease_end', e.target.value)}
                  disabled={!isEditing}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Emergency Contacts */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Emergency Contacts
              {isEditing && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={addEmergencyContact}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Contact
                </Button>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {formData.emergency_contacts?.length ? (
              formData.emergency_contacts.map((contact, index) => (
                <div key={index} className="space-y-2 p-4 border rounded-lg">
                  <div className="flex items-center justify-between">
                    <Label>Contact {index + 1}</Label>
                    {isEditing && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeEmergencyContact(index)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                  <div className="grid grid-cols-1 gap-2">
                    <Input
                      placeholder="Name"
                      value={contact.name}
                      onChange={(e) => handleEmergencyContactChange(index, 'name', e.target.value)}
                      disabled={!isEditing}
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <Input
                        placeholder="Phone"
                        value={contact.phone || ''}
                        onChange={(e) => handleEmergencyContactChange(index, 'phone', e.target.value)}
                        disabled={!isEditing}
                      />
                      <Input
                        placeholder="Email"
                        type="email"
                        value={contact.email || ''}
                        onChange={(e) => handleEmergencyContactChange(index, 'email', e.target.value)}
                        disabled={!isEditing}
                      />
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-muted-foreground text-sm">No emergency contacts added</p>
            )}
          </CardContent>
        </Card>

        {/* Documents */}
        <Card>
          <CardHeader>
            <CardTitle>Documents</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* ID Document */}
            <div>
              <Label>ID / Passport Document</Label>
              {formData.id_document_url ? (
                <div className="flex items-center gap-2 mt-2">
                  <FileText className="w-4 h-4" />
                  <span className="flex-1 text-sm">ID Document</span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDownload(formData.id_document_url!, 'id_document')}
                  >
                    <Download className="w-4 h-4" />
                  </Button>
                  {isEditing && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => document.getElementById('id-upload')?.click()}
                      disabled={uploading.id}
                    >
                      <Upload className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              ) : isEditing ? (
                <Button
                  variant="outline"
                  className="w-full mt-2"
                  onClick={() => document.getElementById('id-upload')?.click()}
                  disabled={uploading.id}
                >
                  <Upload className="w-4 h-4 mr-2" />
                  {uploading.id ? 'Uploading...' : 'Upload ID Document'}
                </Button>
              ) : (
                <p className="text-muted-foreground text-sm mt-2">No document uploaded</p>
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

            <Separator />

            {/* Lease Document */}
            <div>
              <Label>Lease Document</Label>
              {formData.lease_document_url ? (
                <div className="flex items-center gap-2 mt-2">
                  <FileText className="w-4 h-4" />
                  <span className="flex-1 text-sm">Lease Agreement</span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDownload(formData.lease_document_url!, 'lease_document')}
                  >
                    <Download className="w-4 h-4" />
                  </Button>
                  {isEditing && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => document.getElementById('lease-upload')?.click()}
                      disabled={uploading.lease}
                    >
                      <Upload className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              ) : isEditing ? (
                <Button
                  variant="outline"
                  className="w-full mt-2"
                  onClick={() => document.getElementById('lease-upload')?.click()}
                  disabled={uploading.lease}
                >
                  <Upload className="w-4 h-4 mr-2" />
                  {uploading.lease ? 'Uploading...' : 'Upload Lease Document'}
                </Button>
              ) : (
                <p className="text-muted-foreground text-sm mt-2">No document uploaded</p>
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
          </CardContent>
        </Card>

        {/* Admin Notes */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Internal Notes (Admin Only)</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              placeholder="Add internal notes about this tenant..."
              value={formData.notes || ''}
              onChange={(e) => handleInputChange('notes', e.target.value)}
              disabled={!isEditing}
              rows={4}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}