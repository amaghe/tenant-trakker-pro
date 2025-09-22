import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Property } from "@/hooks/useProperties";

interface PropertyEditDialogProps {
  property: Property | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (property: Omit<Property, 'id'>) => void;
}

const PropertyEditDialog = ({ property, isOpen, onClose, onSave }: PropertyEditDialogProps) => {
  const [formData, setFormData] = useState({
    name: "",
    address: "",
    type: "Apartment",
    bedrooms: 1,
    bathrooms: 1,
    size: 0,
    rent: 0,
    status: "available" as 'available' | 'occupied',
  });

  useEffect(() => {
    if (property) {
      setFormData({
        name: property.name,
        address: property.address,
        type: property.type,
        bedrooms: property.bedrooms,
        bathrooms: property.bathrooms,
        size: property.size,
        rent: property.rent,
        status: property.status,
      });
    } else {
      setFormData({
        name: "",
        address: "",
        type: "Apartment",
        bedrooms: 1,
        bathrooms: 1,
        size: 0,
        rent: 0,
        status: "available",
      });
    }
  }, [property]);

  const handleSave = () => {
    onSave(formData);
  };

  const handleInputChange = (field: string, value: string | number) => {
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
                  <SelectItem value="Loft">Loft</SelectItem>
                  <SelectItem value="Studio">Studio</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="address" className="text-sm font-medium text-foreground">
              Address
            </Label>
            <Input
              id="address"
              value={formData.address}
              onChange={(e) => handleInputChange("address", e.target.value)}
              placeholder="Enter full address"
              className="bg-background border-border"
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
                type="number"
                min="0"
                value={formData.size}
                onChange={(e) => handleInputChange("size", parseInt(e.target.value) || 0)}
                className="bg-background border-border"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="rent" className="text-sm font-medium text-foreground">
                Monthly Rent (₦)
              </Label>
              <Input
                id="rent"
                type="number"
                min="0"
                value={formData.rent}
                onChange={(e) => handleInputChange("rent", parseInt(e.target.value) || 0)}
                placeholder="Enter rent amount"
                className="bg-background border-border"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="status" className="text-sm font-medium text-foreground">
                Status
              </Label>
              <Select value={formData.status} onValueChange={(value: 'available' | 'occupied') => handleInputChange("status", value)}>
                <SelectTrigger className="bg-background border-border">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent className="bg-card border-border">
                  <SelectItem value="available">Available</SelectItem>
                  <SelectItem value="occupied">Occupied</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
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