import { useState } from 'react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { StatusBadge } from '@/components/ui/status-badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { catalogItems, formatCurrency, type CatalogItem } from '@/data/dummyData';
import { Check, X, Edit, Eye, Package } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

export default function CatalogApproval() {
  const [selectedItem, setSelectedItem] = useState<CatalogItem | null>(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [viewModalOpen, setViewModalOpen] = useState(false);

  const handleApprove = (item: CatalogItem) => {
    toast({
      title: 'Catalog Approved',
      description: `${item.productName} has been approved.`,
    });
  };

  const handleReject = (item: CatalogItem) => {
    toast({
      title: 'Catalog Rejected',
      description: `${item.productName} has been rejected.`,
      variant: 'destructive',
    });
  };

  const handleEdit = (item: CatalogItem) => {
    setSelectedItem(item);
    setEditModalOpen(true);
  };

  const handleView = (item: CatalogItem) => {
    setSelectedItem(item);
    setViewModalOpen(true);
  };

  const tierColors = {
    affordable: 'bg-success/10 text-success',
    mid_range: 'bg-info/10 text-info',
    luxury: 'bg-accent text-accent-foreground',
  };

  return (
    <AdminLayout
      panelType="pap-manufacturer"
      title="Catalog Approval"
      subtitle="Review and approve manufacturer catalogs"
    >
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {catalogItems.map((item) => (
          <div key={item.id} className="bg-card rounded-xl border border-border overflow-hidden hover:shadow-card-hover transition-all duration-300">
            {/* Image Placeholder */}
            <div className="h-48 bg-muted flex items-center justify-center">
              <Package className="h-16 w-16 text-muted-foreground/50" />
            </div>

            {/* Content */}
            <div className="p-4">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h3 className="font-semibold text-foreground line-clamp-1">{item.productName}</h3>
                  <p className="text-sm text-muted-foreground">{item.manufacturerName}</p>
                </div>
                <StatusBadge status={item.status} />
              </div>

              <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                {item.shortDescription}
              </p>

              <div className="flex items-center justify-between mb-4">
                <span className="text-lg font-bold text-foreground">{formatCurrency(item.price)}</span>
                <span className={`badge-status ${tierColors[item.tier]}`}>
                  {item.tier.replace('_', ' ')}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => handleView(item)}
                >
                  <Eye className="h-4 w-4 mr-1" />
                  View
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => handleEdit(item)}
                >
                  <Edit className="h-4 w-4 mr-1" />
                  Edit
                </Button>
              </div>

              {item.status === 'pending' && (
                <div className="flex items-center gap-2 mt-2">
                  <Button
                    size="sm"
                    className="flex-1 bg-success hover:bg-success/90"
                    onClick={() => handleApprove(item)}
                  >
                    <Check className="h-4 w-4 mr-1" />
                    Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    className="flex-1"
                    onClick={() => handleReject(item)}
                  >
                    <X className="h-4 w-4 mr-1" />
                    Reject
                  </Button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* View Modal */}
      <Dialog open={viewModalOpen} onOpenChange={setViewModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{selectedItem?.productName}</DialogTitle>
          </DialogHeader>
          {selectedItem && (
            <div className="space-y-4">
              <div className="h-64 bg-muted rounded-lg flex items-center justify-center">
                <Package className="h-24 w-24 text-muted-foreground/50" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Manufacturer</Label>
                  <p className="font-medium">{selectedItem.manufacturerName}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Category</Label>
                  <p className="font-medium">{selectedItem.category}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Price</Label>
                  <p className="font-medium">{formatCurrency(selectedItem.price)}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Delivery Time</Label>
                  <p className="font-medium">{selectedItem.deliveryTime}</p>
                </div>
              </div>
              <div>
                <Label className="text-muted-foreground">Description</Label>
                <p className="text-sm">{selectedItem.description}</p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Modal */}
      <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Catalog Item</DialogTitle>
          </DialogHeader>
          {selectedItem && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Product Name</Label>
                  <Input defaultValue={selectedItem.productName} />
                </div>
                <div className="space-y-2">
                  <Label>Price (₹)</Label>
                  <Input type="number" defaultValue={selectedItem.price} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Short Description</Label>
                <Input defaultValue={selectedItem.shortDescription} />
              </div>
              <div className="space-y-2">
                <Label>Full Description</Label>
                <Textarea rows={4} defaultValue={selectedItem.description} />
              </div>
              <div className="space-y-2">
                <Label>Delivery Time</Label>
                <Input defaultValue={selectedItem.deliveryTime} />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditModalOpen(false)}>Cancel</Button>
            <Button onClick={() => {
              toast({ title: 'Catalog Updated', description: 'Changes saved successfully.' });
              setEditModalOpen(false);
            }}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
