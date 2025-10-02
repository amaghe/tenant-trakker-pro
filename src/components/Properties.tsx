import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Building, Loader2, Pencil } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
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

      {/* Properties Table */}
      <div className="bg-card rounded-lg border shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Property Name</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Rent</TableHead>
              <TableHead>Occupant</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {properties.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                  No properties found. Add your first property to get started.
                </TableCell>
              </TableRow>
            ) : (
              properties.map((property) => (
                <TableRow key={property.id} className="hover:bg-muted/50 transition-colors">
                  <TableCell className="font-medium text-foreground">
                    {property.name}
                  </TableCell>
                  <TableCell>
                    <Badge 
                      variant={property.status === 'occupied' ? 'default' : 'secondary'}
                      className={property.status === 'occupied' ? 'bg-success text-success-foreground' : 'bg-warning text-warning-foreground'}
                    >
                      {property.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-foreground">
                    ₦{property.rent.toLocaleString()}/mo
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {property.tenant || '—'}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => handleEditProperty(property)}
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
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