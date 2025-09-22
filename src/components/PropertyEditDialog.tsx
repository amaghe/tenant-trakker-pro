import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

interface Property {
  id: number;
  name: string;
  address: string;
  type: string;
  bedrooms: number;
  bathrooms: number;
  size: string;
  rent: string;
  status: string;
  tenant: string | null;
}

interface PropertyEditDialogProps {
  property: Property | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (property: Property) => void;
}

const PropertyEditDialog = ({ property, isOpen, onClose, onSave }: PropertyEditDialogProps) => {
  const [formData, setFormData] = useState<Property>({
    id: 0,
    name: "",
    address: "",
    type: "Apartment",
    bedrooms: 1,
    bathrooms: 1,
    size: "",
    rent: "",
    status: "vacant",
    tenant: null,
    ...property
  });

  const handleSave = () => {
    onSave(formData);
    onClose();
  };

  const handleInputChange = (field: keyof Property, value: string | number | null) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] bg-card shadow-elegant">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-foreground">
            {property ? "Edit Property" : "Add New Property"}
          </DialogTitle>
        </DialogHeader>
        
        <div className="grid gap-6 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-sm font-medium text-foreground">
                Property Name
              </Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleInputChange("name", e.target.value)}
                placeholder="Enter property name"
                className="bg-background border-border"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="type" className="text-sm font-medium text-foreground">
                Property Type
              </Label>
              <Select value={formData.type} onValueChange={(value) => handleInputChange("type", value)}>
                <SelectTrigger className="bg-background border-border">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent className="bg-card border-border">
                  <SelectItem value="Apartment">Apartment</SelectItem>
                  <SelectItem value="Villa">Villa</SelectItem>
                  <SelectItem value="House">House</SelectItem>
                  <SelectItem value="Penthouse">Penthouse</SelectItem>
                  <SelectItem value="Studio">Studio</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="address" className="text-sm font-medium text-foreground">
              Address
            </Label>
            <Textarea
              id="address"
              value={formData.address}
              onChange={(e) => handleInputChange("address", e.target.value)}
              placeholder="Enter full address"
              className="bg-background border-border resize-none"
              rows={2}
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="bedrooms" className="text-sm font-medium text-foreground">
                Bedrooms
              </Label>
              <Input
                id="bedrooms"
                type="number"
                min="0"
                value={formData.bedrooms}
                onChange={(e) => handleInputChange("bedrooms", parseInt(e.target.value) || 0)}
                className="bg-background border-border"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="bathrooms" className="text-sm font-medium text-foreground">
                Bathrooms
              </Label>
              <Input
                id="bathrooms"
                type="number"
                min="0"
                value={formData.bathrooms}
                onChange={(e) => handleInputChange("bathrooms", parseInt(e.target.value) || 0)}
                className="bg-background border-border"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="size" className="text-sm font-medium text-foreground">
                Size (sqft)
              </Label>
              <Input
                id="size"
                value={formData.size}
                onChange={(e) => handleInputChange("size", e.target.value)}
                placeholder="e.g., 1,200 sqft"
                className="bg-background border-border"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="rent" className="text-sm font-medium text-foreground">
                Monthly Rent
              </Label>
              <Input
                id="rent"
                value={formData.rent}
                onChange={(e) => handleInputChange("rent", e.target.value)}
                placeholder="e.g., ₦180,000"
                className="bg-background border-border"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="status" className="text-sm font-medium text-foreground">
                Status
              </Label>
              <Select value={formData.status} onValueChange={(value) => handleInputChange("status", value)}>
                <SelectTrigger className="bg-background border-border">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent className="bg-card border-border">
                  <SelectItem value="occupied">Occupied</SelectItem>
                  <SelectItem value="vacant">Vacant</SelectItem>
                  <SelectItem value="maintenance">Under Maintenance</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {formData.status === "occupied" && (
            <div className="space-y-2">
              <Label htmlFor="tenant" className="text-sm font-medium text-foreground">
                Tenant Name
              </Label>
              <Input
                id="tenant"
                value={formData.tenant || ""}
                onChange={(e) => handleInputChange("tenant", e.target.value || null)}
                placeholder="Enter tenant name"
                className="bg-background border-border"
              />
            </div>
          )}
        </div>

        <DialogFooter className="flex space-x-2">
          <Button 
            variant="outline" 
            onClick={onClose}
            className="border-border text-muted-foreground hover:text-foreground"
          >
            Cancel
          </Button>
          <Button 
            onClick={handleSave}
            className="bg-gradient-primary text-white shadow-elegant hover:shadow-lg transition-all"
          >
            Save Property
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default PropertyEditDialog;