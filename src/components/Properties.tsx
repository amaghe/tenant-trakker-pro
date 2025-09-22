import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Building, MapPin, Bed, Bath, Square, DollarSign, User, Loader2 } from "lucide-react";
import PropertyEditDialog from "./PropertyEditDialog";
import { useProperties, type Property } from "@/hooks/useProperties";

const Properties = () => {
  const { properties, loading, addProperty, updateProperty } = useProperties();
  const [editingProperty, setEditingProperty] = useState<Property | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const handleEditProperty = (property: Property) => {
    setEditingProperty(property);
    setIsDialogOpen(true);
  };

  const handleSaveProperty = async (propertyData: Omit<Property, 'id'>) => {
    try {
      if (editingProperty) {
        // Update existing property
        await updateProperty(editingProperty.id, propertyData);
      } else {
        // Add new property
        await addProperty(propertyData);
      }
      setIsDialogOpen(false);
      setEditingProperty(null);
    } catch (error) {
      // Error handling is done in the hook
    }
  };

  const handleAddProperty = () => {
    setEditingProperty(null);
    setIsDialogOpen(true);
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
          <h1 className="text-3xl font-bold text-foreground">Properties</h1>
          <p className="text-muted-foreground mt-1">Manage your property portfolio</p>
        </div>
        <Button 
          className="bg-gradient-primary text-white shadow-elegant hover:shadow-lg transition-all"
          onClick={handleAddProperty}
        >
          <Building className="w-4 h-4 mr-2" />
          Add Property
        </Button>
      </div>

      {/* Properties Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {properties.map((property) => (
          <Card key={property.id} className="bg-gradient-card shadow-card hover:shadow-elegant transition-all">
            <CardHeader className="pb-4">
              <div className="flex justify-between items-start">
                <CardTitle className="text-lg font-semibold text-foreground">
                  {property.name}
                </CardTitle>
                <Badge 
                  variant={property.status === 'occupied' ? 'default' : 'secondary'}
                  className={property.status === 'occupied' ? 'bg-success text-success-foreground' : 'bg-warning text-warning-foreground'}
                >
                  {property.status}
                </Badge>
              </div>
              <div className="flex items-center text-muted-foreground text-sm">
                <MapPin className="w-4 h-4 mr-1" />
                {property.address}
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              {/* Property Details */}
              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="flex flex-col items-center">
                  <Bed className="w-4 h-4 text-primary mb-1" />
                  <span className="text-sm text-muted-foreground">{property.bedrooms} Bed</span>
                </div>
                <div className="flex flex-col items-center">
                  <Bath className="w-4 h-4 text-primary mb-1" />
                  <span className="text-sm text-muted-foreground">{property.bathrooms} Bath</span>
                </div>
                <div className="flex flex-col items-center">
                  <Square className="w-4 h-4 text-primary mb-1" />
                  <span className="text-sm text-muted-foreground">{property.size} sqft</span>
                </div>
              </div>

              {/* Rent and Tenant Info */}
              <div className="pt-2 border-t border-border">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <DollarSign className="w-4 h-4 text-success mr-1" />
                    <span className="font-semibold text-foreground">₦{property.rent.toLocaleString()}/month</span>
                  </div>
                  {property.tenant && (
                    <div className="flex items-center text-muted-foreground text-sm">
                      <User className="w-4 h-4 mr-1" />
                      {property.tenant}
                    </div>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex space-x-2 pt-2">
                <Button variant="outline" size="sm" className="flex-1">
                  View Details
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="flex-1"
                  onClick={() => handleEditProperty(property)}
                >
                  Edit
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <PropertyEditDialog
        property={editingProperty}
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        onSave={handleSaveProperty}
      />
    </div>
  );
};

export default Properties;