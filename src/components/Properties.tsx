import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Building, Loader2, Pencil, Trash2 } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import PropertyEditDialog from "./PropertyEditDialog";
import { useProperties, type Property } from "@/hooks/useProperties";

const Properties = () => {
  const { properties, loading, addProperty, updateProperty, deleteProperty } = useProperties();
  const [editingProperty, setEditingProperty] = useState<Property | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [propertyToDelete, setPropertyToDelete] = useState<Property | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

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

  const handleDeleteClick = (property: Property) => {
    setPropertyToDelete(property);
    setIsDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (propertyToDelete) {
      try {
        await deleteProperty(propertyToDelete.id);
        setIsDeleteDialogOpen(false);
        setPropertyToDelete(null);
      } catch (error) {
        // Error handling is done in the hook
      }
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
              <TableHead>Address</TableHead>
              <TableHead>Size</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Rent</TableHead>
              <TableHead>Occupant</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {properties.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                  No properties found. Add your first property to get started.
                </TableCell>
              </TableRow>
            ) : (
              properties.map((property) => (
                <TableRow key={property.id} className="hover:bg-muted/50 transition-colors">
                  <TableCell className="font-medium text-foreground">
                    {property.name}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {property.address}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {property.size} sqft
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
                    {property.rent.toLocaleString()}/mo
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {property.tenant_id && property.tenant ? property.tenant : '—'}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => handleEditProperty(property)}
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => handleDeleteClick(property)}
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
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

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Property</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{propertyToDelete?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setPropertyToDelete(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Properties;
