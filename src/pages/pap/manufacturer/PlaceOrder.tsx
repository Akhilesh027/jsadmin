import { useState } from 'react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { manufacturers } from '@/data/dummyData';
import { toast } from '@/hooks/use-toast';
import { Calendar } from 'lucide-react';

export default function PlaceOrder() {
  const [formData, setFormData] = useState({
    manufacturer: '',
    product: '',
    quantity: '',
    address: '',
    expectedDate: '',
    paymentOption: '',
    notes: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    toast({
      title: 'Purchase Order Created',
      description: 'Order has been sent to the manufacturer.',
    });
  };

  return (
    <AdminLayout
      panelType="pap-manufacturer"
      title="Place Order"
      subtitle="Create a purchase order to manufacturer"
    >
      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Purchase Order Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label>Select Manufacturer</Label>
              <Select
                value={formData.manufacturer}
                onValueChange={(value) => setFormData({ ...formData, manufacturer: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose manufacturer" />
                </SelectTrigger>
                <SelectContent>
                  {manufacturers
                    .filter((m) => m.status === 'approved')
                    .map((mfg) => (
                      <SelectItem key={mfg.id} value={mfg.id}>
                        {mfg.companyName} - {mfg.city}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Product Name</Label>
                <Input
                  placeholder="Enter product name"
                  value={formData.product}
                  onChange={(e) => setFormData({ ...formData, product: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Quantity</Label>
                <Input
                  type="number"
                  placeholder="Enter quantity"
                  value={formData.quantity}
                  onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Delivery Address</Label>
              <Textarea
                placeholder="Enter complete delivery address"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Expected Delivery Date</Label>
                <div className="relative">
                  <Input
                    type="date"
                    value={formData.expectedDate}
                    onChange={(e) => setFormData({ ...formData, expectedDate: e.target.value })}
                    required
                  />
                  <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Payment Option</Label>
                <Select
                  value={formData.paymentOption}
                  onValueChange={(value) => setFormData({ ...formData, paymentOption: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select payment" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="advance">100% Advance</SelectItem>
                    <SelectItem value="partial">50% Advance + 50% on Delivery</SelectItem>
                    <SelectItem value="credit">30 Days Credit</SelectItem>
                    <SelectItem value="delivery">On Delivery</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Additional Notes</Label>
              <Textarea
                placeholder="Any special instructions..."
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              />
            </div>

            <div className="flex gap-4">
              <Button type="submit">Submit Purchase Order</Button>
              <Button type="button" variant="outline">Save as Draft</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </AdminLayout>
  );
}
