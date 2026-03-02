import { useEffect, useState } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { Calendar, Loader2 } from "lucide-react";

const API_BASE = "https://api.jsgallor.com";

type Manufacturer = {
  _id: string;
  companyName: string;
  city?: string;
  country?: string;
};

type PurchaseOrder = {
  _id: string;
  manufacturer: Manufacturer | string;
  productName: string;
  sku?: string;
  quantity: number;
  address: string;
  expectedDate: string;
  paymentOption: "advance" | "partial" | "credit" | "delivery";
  notes?: string;
  status: "draft" | "sent" | "accepted" | "rejected" | "completed";
  createdAt: string;
};

export default function PlaceOrder() {
  const [loadingMfg, setLoadingMfg] = useState(false);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [manufacturers, setManufacturers] = useState<Manufacturer[]>([]);
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);

  const [formData, setFormData] = useState({
    manufacturerId: "",
    productName: "",
    sku: "",
    quantity: "",
    address: "",
    expectedDate: "",
    paymentOption: "",
    notes: "",
  });

  const safeJson = async (res: Response) => {
    try {
      return await res.json();
    } catch {
      return {};
    }
  };

  // ✅ fetch manufacturers (Verified)
  const fetchVerifiedManufacturers = async () => {
    try {
      setLoadingMfg(true);
      const res = await fetch(`${API_BASE}/api/admin/manufacturers`);
      const data = await safeJson(res);

      if (!res.ok || !data?.success) {
        throw new Error(data?.message || "Failed to load manufacturers");
      }

      setManufacturers(Array.isArray(data.manufacturers) ? data.manufacturers : []);
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to load manufacturers",
        variant: "destructive",
      });
    } finally {
      setLoadingMfg(false);
    }
  };

  // ✅ fetch orders for selected manufacturer
  const fetchOrdersForManufacturer = async (manufacturerId: string) => {
    try {
      setLoadingOrders(true);
      const res = await fetch(
        `${API_BASE}/api/admin/orders?manufacturerId=${manufacturerId}`
      );
      const data = await safeJson(res);

      if (!res.ok || !data?.success) {
        throw new Error(data?.message || "Failed to load orders");
      }

      setOrders(Array.isArray(data.orders) ? data.orders : []);
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to load orders",
        variant: "destructive",
      });
      setOrders([]);
    } finally {
      setLoadingOrders(false);
    }
  };

  useEffect(() => {
    fetchVerifiedManufacturers();
  }, []);

  useEffect(() => {
    if (!formData.manufacturerId) {
      setOrders([]);
      return;
    }
    fetchOrdersForManufacturer(formData.manufacturerId);
  }, [formData.manufacturerId]);

  const submitOrder = async (mode: "sent" | "draft") => {
    if (!formData.manufacturerId) {
      toast({ title: "Error", description: "Please select manufacturer", variant: "destructive" });
      return;
    }

    if (!formData.productName.trim()) {
      toast({ title: "Error", description: "Product name is required", variant: "destructive" });
      return;
    }

    if (!formData.quantity || Number(formData.quantity) < 1) {
      toast({ title: "Error", description: "Quantity must be at least 1", variant: "destructive" });
      return;
    }

    if (!formData.address || !formData.expectedDate || !formData.paymentOption) {
      toast({
        title: "Error",
        description: "Address, expected date and payment option are required",
        variant: "destructive",
      });
      return;
    }

    try {
      setSubmitting(true);

      const res = await fetch(`${API_BASE}/api/admin/orders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          manufacturerId: formData.manufacturerId,
          productName: formData.productName.trim(),
          sku: formData.sku.trim() || undefined,
          quantity: Number(formData.quantity),
          address: formData.address,
          expectedDate: formData.expectedDate,
          paymentOption: formData.paymentOption,
          notes: formData.notes,
          status: mode,
        }),
      });

      const data = await safeJson(res);

      if (!res.ok || !data?.success) {
        throw new Error(data?.message || "Failed to create order");
      }

      toast({
        title: mode === "draft" ? "Draft Saved" : "Purchase Order Created",
        description: mode === "draft" ? "Order saved as draft." : "Order sent to manufacturer.",
      });

      // reset fields except manufacturer (optional)
      const keepManufacturer = formData.manufacturerId;
      setFormData({
        manufacturerId: keepManufacturer,
        productName: "",
        sku: "",
        quantity: "",
        address: "",
        expectedDate: "",
        paymentOption: "",
        notes: "",
      });

      // ✅ refresh orders list
      fetchOrdersForManufacturer(keepManufacturer);
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Failed to submit order", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusPill = (status: PurchaseOrder["status"]) => {
    switch (status) {
      case "draft":
        return "bg-muted text-muted-foreground";
      case "sent":
        return "bg-blue-500/10 text-blue-500";
      case "accepted":
        return "bg-green-500/10 text-green-500";
      case "rejected":
        return "bg-red-500/10 text-red-500";
      case "completed":
        return "bg-purple-500/10 text-purple-500";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  return (
    <AdminLayout
      panelType="pap-manufacturer"
      title="Place Order"
      subtitle="Create a purchase order to manufacturer"
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Form */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Purchase Order Details</CardTitle>
          </CardHeader>

          <CardContent>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                submitOrder("sent");
              }}
              className="space-y-6"
            >
              {/* Manufacturer */}
              <div className="space-y-2">
                <Label>Select Manufacturer</Label>
                <Select
                  value={formData.manufacturerId}
                  onValueChange={(value) => setFormData({ ...formData, manufacturerId: value })}
                  disabled={loadingMfg}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={loadingMfg ? "Loading..." : "Choose manufacturer"} />
                  </SelectTrigger>
                  <SelectContent>
                    {manufacturers.map((mfg) => (
                      <SelectItem key={mfg._id} value={mfg._id}>
                        {mfg.companyName}
                        {mfg.city ? ` - ${mfg.city}` : ""}
                        {mfg.country ? `, ${mfg.country}` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Product name + SKU */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Product Name *</Label>
                  <Input
                    placeholder="Enter product name"
                    value={formData.productName}
                    onChange={(e) => setFormData({ ...formData, productName: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label>SKU (optional)</Label>
                  <Input
                    placeholder="SKU (optional)"
                    value={formData.sku}
                    onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                  />
                </div>
              </div>

              {/* Quantity + Date */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Quantity</Label>
                  <Input
                    type="number"
                    min={1}
                    placeholder="Enter quantity"
                    value={formData.quantity}
                    onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                    required
                  />
                </div>

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
              </div>

              {/* Address */}
              <div className="space-y-2">
                <Label>Delivery Address</Label>
                <Textarea
                  placeholder="Enter complete delivery address"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  required
                />
              </div>

              {/* Payment */}
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

              {/* Notes */}
              <div className="space-y-2">
                <Label>Additional Notes</Label>
                <Textarea
                  placeholder="Any special instructions..."
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                />
              </div>

              {/* Buttons */}
              <div className="flex gap-4">
                <Button type="submit" disabled={submitting}>
                  {submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    "Submit Purchase Order"
                  )}
                </Button>

                <Button type="button" variant="outline" disabled={submitting} onClick={() => submitOrder("draft")}>
                  Save as Draft
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* ✅ Orders list for selected manufacturer */}
        <Card>
          <CardHeader>
            <CardTitle>Orders</CardTitle>
          </CardHeader>

          <CardContent>
            {!formData.manufacturerId ? (
              <p className="text-sm text-muted-foreground">
                Select a manufacturer to view orders.
              </p>
            ) : loadingOrders ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading orders...
              </div>
            ) : orders.length === 0 ? (
              <p className="text-sm text-muted-foreground">No orders found for this manufacturer.</p>
            ) : (
              <div className="space-y-3">
                {orders.map((o) => (
                  <div key={o._id} className="rounded-lg border border-border p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-semibold">{o.productName}</p>
                        <p className="text-xs text-muted-foreground">
                          Qty: {o.quantity} • Expected: {new Date(o.expectedDate).toLocaleDateString()}
                        </p>
                        {o.sku ? (
                          <p className="text-xs text-muted-foreground">SKU: {o.sku}</p>
                        ) : null}
                      </div>

                      <span className={`px-2 py-1 text-xs rounded ${getStatusPill(o.status)}`}>
                        {o.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
