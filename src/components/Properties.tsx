import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, MapPin, Bed, Bath, Square, Users, DollarSign, Building } from "lucide-react";
import { useState } from "react";

const Properties = () => {
  const [properties] = useState([
    {
      id: 1,
      name: "Lagos Heights Apartment",
      address: "Victoria Island, Lagos",
      type: "Apartment",
      bedrooms: 3,
      bathrooms: 2,
      size: "1,200 sqft",
      rent: "₦180,000",
      status: "occupied",
      tenant: "John Doe",
      image: "/api/placeholder/400/300"
    },
    {
      id: 2,
      name: "Victoria Garden Villa",
      address: "Lekki Phase 1, Lagos",
      type: "Villa",
      bedrooms: 4,
      bathrooms: 3,
      size: "2,500 sqft",
      rent: "₦420,000",
      status: "vacant",
      tenant: null,
      image: "/api/placeholder/400/300"
    },
    {
      id: 3,
      name: "Ikoyi Towers Penthouse",
      address: "Ikoyi, Lagos",
      type: "Penthouse",
      bedrooms: 5,
      bathrooms: 4,
      size: "3,200 sqft",
      rent: "₦850,000",
      status: "occupied",
      tenant: "Sarah Wilson",
      image: "/api/placeholder/400/300"
    },
    {
      id: 4,
      name: "Surulere Complex",
      address: "Surulere, Lagos",
      type: "Apartment",
      bedrooms: 2,
      bathrooms: 1,
      size: "800 sqft",
      rent: "₦120,000",
      status: "maintenance",
      tenant: null,
      image: "/api/placeholder/400/300"
    }
  ]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Properties</h1>
          <p className="text-muted-foreground mt-1">Manage your property portfolio</p>
        </div>
        <Button className="bg-gradient-primary text-white shadow-elegant hover:shadow-lg transition-all">
          <Plus className="w-4 h-4 mr-2" />
          Add Property
        </Button>
      </div>

      {/* Properties Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {properties.map((property) => (
          <Card key={property.id} className="bg-gradient-card shadow-card hover:shadow-elegant transition-all cursor-pointer">
            <div className="aspect-video bg-muted rounded-t-lg flex items-center justify-center">
              <Building className="w-12 h-12 text-muted-foreground" />
            </div>
            
            <CardHeader className="pb-2">
              <div className="flex justify-between items-start">
                <CardTitle className="text-lg font-semibold text-foreground">
                  {property.name}
                </CardTitle>
                <Badge 
                  variant={property.status === 'occupied' ? 'default' : property.status === 'vacant' ? 'secondary' : 'destructive'}
                  className={property.status === 'occupied' ? 'bg-success text-success-foreground' : property.status === 'vacant' ? 'bg-warning text-warning-foreground' : ''}
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
                  <span className="text-sm text-muted-foreground">{property.size}</span>
                </div>
              </div>

              {/* Rent and Tenant Info */}
              <div className="pt-2 border-t border-border">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <DollarSign className="w-4 h-4 text-success mr-1" />
                    <span className="font-semibold text-foreground">{property.rent}/month</span>
                  </div>
                  {property.tenant && (
                    <div className="flex items-center text-muted-foreground text-sm">
                      <Users className="w-4 h-4 mr-1" />
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
                <Button variant="ghost" size="sm" className="flex-1">
                  Edit
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default Properties;