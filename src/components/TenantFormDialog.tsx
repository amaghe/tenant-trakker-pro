import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, UserPlus, Edit2, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Tenant } from "@/hooks/useTenants";
import { useProperties } from "@/hooks/useProperties";

interface TenantFormDialogProps {
  trigger: React.ReactNode;
  tenant?: Tenant;
  onSubmit: (data: Omit<Tenant, 'id'>) => Promise<void>;
  loading: boolean;
}

const TenantFormDialog = ({ trigger, tenant, onSubmit, loading }: TenantFormDialogProps) => {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    property_id: "",
    rent: 0,
    status: "active" as "active" | "overdue" | "pending",
    lease_start: new Date(),
    lease_end: new Date(),
  });
  const { properties } = useProperties();

  useEffect(() => {
    if (tenant) {
      setFormData({
        name: tenant.name,
        email: tenant.email,
        phone: tenant.phone,
        property_id: tenant.property_id || "",
        rent: tenant.rent,
        status: tenant.status,
        lease_start: new Date(tenant.lease_start),
        lease_end: new Date(tenant.lease_end),
      });
    } else {
      // Reset form for new tenant
      setFormData({
        name: "",
        email: "",
        phone: "",
        property_id: "",
        rent: 0,
        status: "active",
        lease_start: new Date(),
        lease_end: new Date(),
      });
    }
  }, [tenant, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await onSubmit({
        ...formData,
        lease_start: formData.lease_start.toISOString().split('T')[0],
        lease_end: formData.lease_end.toISOString().split('T')[0],
      });
      setOpen(false);
    } catch (error) {
      console.error('Error submitting tenant form:', error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {tenant ? <Edit2 className="w-5 h-5" /> : <UserPlus className="w-5 h-5" />}
            {tenant ? "Edit Tenant" : "Add New Tenant"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="rent">Monthly Rent (₦)</Label>
              <Input
                id="rent"
                type="number"
                value={formData.rent}
                onChange={(e) => setFormData(prev => ({ ...prev, rent: Number(e.target.value) }))}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="property">Property</Label>
              <Select
                value={formData.property_id}
                onValueChange={(value) => setFormData(prev => ({ ...prev, property_id: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select property" />
                </SelectTrigger>
                <SelectContent>
                  {properties.map((property) => (
                    <SelectItem key={property.id} value={property.id}>
                      {property.name} - {property.address}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select
                value={formData.status}
                onValueChange={(value) => setFormData(prev => ({ ...prev, status: value as "active" | "overdue" | "pending" }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="overdue">Overdue</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Lease Start Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !formData.lease_start && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formData.lease_start ? format(formData.lease_start, "PPP") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={formData.lease_start}
                    onSelect={(date) => date && setFormData(prev => ({ ...prev, lease_start: date }))}
                    initialFocus
                    className={cn("p-3 pointer-events-auto")}
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-2">
              <Label>Lease End Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !formData.lease_end && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formData.lease_end ? format(formData.lease_end, "PPP") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={formData.lease_end}
                    onSelect={(date) => date && setFormData(prev => ({ ...prev, lease_end: date }))}
                    initialFocus
                    className={cn("p-3 pointer-events-auto")}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {tenant ? "Update Tenant" : "Add Tenant"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default TenantFormDialog;