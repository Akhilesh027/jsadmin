import { useState } from 'react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { catalogItems, vendors, formatCurrency, type CatalogItem } from '@/data/dummyData';
import { Send, Package, Edit } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function ForwardCatalogs() {
  const [selectedItem, setSelectedItem] = useState<CatalogItem | null>(null);
  const [forwardModalOpen, setForwardModalOpen] = useState(false);
  const [forwardType, setForwardType] = useState<'website' | 'vendor'>('website');
  const [websiteTier, setWebsiteTier] = useState('');
  const [selectedVendor, setSelectedVendor] = useState('');

  const approvedCatalogs = catalogItems.filter((c) => c.status === 'approved');

  const handleForward = (item: CatalogItem) => {
    setSelectedItem(item);
    setForwardModalOpen(true);
  };

  const handleSubmitForward = () => {
    if (forwardType === 'website') {
      toast({
        title: 'Catalog Forwarded to Website',
        description: `${selectedItem?.productName} added to ${websiteTier} category.`,
      });
    } else {
      toast({
        title: 'Catalog Forwarded to Vendor',
        description: `${selectedItem?.productName} sent to vendor.`,
      });
    }
    setForwardModalOpen(false);
  };

  return (
    <AdminLayout
      panelType="pap-manufacturer"
      title="Forward Catalogs"
      subtitle="Forward approved catalogs to website or vendors"
    >
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {approvedCatalogs.map((item) => (
          <div key={item.id} className="bg-card rounded-xl border border-border overflow-hidden">
            <div className="h-40 bg-muted flex items-center justify-center">
              <Package className="h-12 w-12 text-muted-foreground/50" />
            </div>
            <div className="p-4">
              <h3 className="font-semibold text-foreground line-clamp-1">{item.productName}</h3>
              <p className="text-sm text-muted-foreground mb-2">{item.manufacturerName}</p>
              <p className="text-lg font-bold mb-4">{formatCurrency(item.price)}</p>
              <Button className="w-full" onClick={() => handleForward(item)}>
                <Send className="h-4 w-4 mr-2" />
                Forward Catalog
              </Button>
            </div>
          </div>
        ))}
      </div>

      {/* Forward Modal */}
      <Dialog open={forwardModalOpen} onOpenChange={setForwardModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Forward Catalog</DialogTitle>
          </DialogHeader>
          {selectedItem && (
            <div className="space-y-6">
              <div className="p-4 bg-muted/50 rounded-lg">
                <p className="font-medium">{selectedItem.productName}</p>
                <p className="text-sm text-muted-foreground">{formatCurrency(selectedItem.price)}</p>
              </div>

              <Tabs defaultValue="website" onValueChange={(v) => setForwardType(v as 'website' | 'vendor')}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="website">Forward to Website</TabsTrigger>
                  <TabsTrigger value="vendor">Forward to Vendor</TabsTrigger>
                </TabsList>
                <TabsContent value="website" className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label>Select Category</Label>
                    <RadioGroup value={websiteTier} onValueChange={setWebsiteTier}>
                      <div className="flex items-center space-x-2 p-3 rounded-lg border hover:bg-muted/50">
                        <RadioGroupItem value="affordable" id="affordable" />
                        <Label htmlFor="affordable" className="flex-1 cursor-pointer">
                          <span className="font-medium">Affordable</span>
                          <p className="text-sm text-muted-foreground">Budget-friendly collection</p>
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2 p-3 rounded-lg border hover:bg-muted/50">
                        <RadioGroupItem value="mid_range" id="mid_range" />
                        <Label htmlFor="mid_range" className="flex-1 cursor-pointer">
                          <span className="font-medium">Mid-Range</span>
                          <p className="text-sm text-muted-foreground">Premium quality selection</p>
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2 p-3 rounded-lg border hover:bg-muted/50">
                        <RadioGroupItem value="luxury" id="luxury" />
                        <Label htmlFor="luxury" className="flex-1 cursor-pointer">
                          <span className="font-medium">Luxury</span>
                          <p className="text-sm text-muted-foreground">Exclusive high-end pieces</p>
                        </Label>
                      </div>
                    </RadioGroup>
                  </div>
                </TabsContent>
                <TabsContent value="vendor" className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label>Select Vendor</Label>
                    <Select value={selectedVendor} onValueChange={setSelectedVendor}>
                      <SelectTrigger>
                        <SelectValue placeholder="Choose vendor" />
                      </SelectTrigger>
                      <SelectContent>
                        {vendors.filter((v) => v.status === 'approved').map((vendor) => (
                          <SelectItem key={vendor.id} value={vendor.id}>
                            {vendor.businessName} - {vendor.city}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </TabsContent>
              </Tabs>

              {/* Edit Fields */}
              <div className="space-y-4 border-t pt-4">
                <p className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Edit className="h-4 w-4" />
                  Edit before forwarding (optional)
                </p>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Title</Label>
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
                  <Label>Delivery Time</Label>
                  <Input defaultValue={selectedItem.deliveryTime} />
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setForwardModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmitForward}>
              <Send className="h-4 w-4 mr-2" />
              Forward Catalog
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
