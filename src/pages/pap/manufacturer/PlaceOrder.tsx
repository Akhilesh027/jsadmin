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
import { Calendar, Loader2, Plus, Trash2, Image as ImageIcon } from "lucide-react";

const API_BASE = "https://api.jsgallor.com";

type Manufacturer = {
  _id: string;
  companyName: string;
  city?: string;
  country?: string;
};

// ✅ Extended Product type with full details (including images)
type Product = {
  _id: string;
  name: string;
  sku?: string;
  price?: number;
  description?: string;
  images?: string[];        // array of image URLs
  category?: string;
  stock?: number;
  // ... other fields from your schema
};

type LineItem = {
  productId: string;
  productName: string;
  sku?: string;
  quantity: number;
  price?: number;           // store price at order time (optional)
  image?: string;           // first image for display
};

type PurchaseOrder = {
  _id: string;
  manufacturer: Manufacturer | string;
  items: LineItem[];
  address: string;
  expectedDate: string;
  paymentOption: "advance" | "partial" | "credit" | "delivery";
  notes?: string;
  status: "draft" | "sent" | "accepted" | "rejected" | "completed";
  createdAt: string;
};

export default function PlaceOrder() {
  const [loadingMfg, setLoadingMfg] = useState(false);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [manufacturers, setManufacturers] = useState<Manufacturer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);

  const [selectedManufacturerId, setSelectedManufacturerId] = useState("");
  const [lineItems, setLineItems] = useState<LineItem[]>([]);
  const [selectedProductId, setSelectedProductId] = useState("");
  const [itemQuantity, setItemQuantity] = useState(1);

  const [formData, setFormData] = useState({
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

  const fetchProductsForManufacturer = async (manufacturerId: string) => {
    try {
      setLoadingProducts(true);
      const res = await fetch(`${API_BASE}/api/admin/manufacturers/products/${manufacturerId}`);
      const data = await safeJson(res);
      if (!res.ok || !data?.success) throw new Error(data?.message || "Failed to load products");
      setProducts(Array.isArray(data.products) ? data.products : []);
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to load products",
        variant: "destructive",
      });
      setProducts([]);
    } finally {
      setLoadingProducts(false);
    }
  };

  const fetchOrdersForManufacturer = async (manufacturerId: string) => {
    try {
      setLoadingOrders(true);
      const res = await fetch(`${API_BASE}/api/admin/orders?manufacturerId=${manufacturerId}`);
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
    if (!selectedManufacturerId) {
      setProducts([]);
      setOrders([]);
      setLineItems([]);
      return;
    }
    fetchProductsForManufacturer(selectedManufacturerId);
    fetchOrdersForManufacturer(selectedManufacturerId);
  }, [selectedManufacturerId]);

  const addProductToOrder = () => {
    if (!selectedProductId) {
      toast({ title: "Error", description: "Select a product", variant: "destructive" });
      return;
    }
    if (itemQuantity < 1) {
      toast({ title: "Error", description: "Quantity must be at least 1", variant: "destructive" });
      return;
    }

    const product = products.find(p => p._id === selectedProductId);
    if (!product) return;

    const firstImage = product.images && product.images.length > 0 ? product.images[0] : undefined;

    const existingIndex = lineItems.findIndex(item => item.productId === selectedProductId);
    if (existingIndex !== -1) {
      const newItems = [...lineItems];
      newItems[existingIndex].quantity += itemQuantity;
      setLineItems(newItems);
    } else {
      setLineItems([
        ...lineItems,
        {
          productId: product._id,
          productName: product.name,
          sku: product.sku,
          quantity: itemQuantity,
          price: product.price,
          image: firstImage,
        },
      ]);
    }

    setSelectedProductId("");
    setItemQuantity(1);
  };

  const removeLineItem = (index: number) => {
    setLineItems(prev => prev.filter((_, i) => i !== index));
  };

  const updateLineItemQuantity = (index: number, newQuantity: number) => {
    if (newQuantity < 1) {
      removeLineItem(index);
      return;
    }
    const newItems = [...lineItems];
    newItems[index].quantity = newQuantity;
    setLineItems(newItems);
  };

  const submitOrder = async (mode: "sent" | "draft") => {
    if (!selectedManufacturerId) {
      toast({ title: "Error", description: "Please select manufacturer", variant: "destructive" });
      return;
    }
    if (lineItems.length === 0) {
      toast({ title: "Error", description: "At least one product is required", variant: "destructive" });
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
      const payload = {
        manufacturerId: selectedManufacturerId,
        items: lineItems.map(item => ({
          productId: item.productId,
          productName: item.productName,
          sku: item.sku,
          quantity: item.quantity,
        })),
        address: formData.address,
        expectedDate: formData.expectedDate,
        paymentOption: formData.paymentOption,
        notes: formData.notes,
        status: mode,
      };

      const res = await fetch(`${API_BASE}/api/admin/orders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await safeJson(res);
      if (!res.ok || !data?.success) {
        throw new Error(data?.message || "Failed to create order");
      }

      toast({
        title: mode === "draft" ? "Draft Saved" : "Purchase Order Created",
        description: mode === "draft" ? "Order saved as draft." : "Order sent to manufacturer.",
      });

      setLineItems([]);
      setFormData({
        address: "",
        expectedDate: "",
        paymentOption: "",
        notes: "",
      });
      setSelectedProductId("");
      setItemQuantity(1);
      fetchOrdersForManufacturer(selectedManufacturerId);
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Failed to submit order", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusPill = (status: PurchaseOrder["status"]) => {
    switch (status) {
      case "draft": return "bg-muted text-muted-foreground";
      case "sent": return "bg-blue-500/10 text-blue-500";
      case "accepted": return "bg-green-500/10 text-green-500";
      case "rejected": return "bg-red-500/10 text-red-500";
      case "completed": return "bg-purple-500/10 text-purple-500";
      default: return "bg-muted text-muted-foreground";
    }
  };

  // Get currently selected product details
  const selectedProduct = products.find(p => p._id === selectedProductId);

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
                  value={selectedManufacturerId}
                  onValueChange={(value) => setSelectedManufacturerId(value)}
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

              {/* Product selection with image preview */}
              {selectedManufacturerId && (
                <div className="space-y-2 border-t pt-4">
                  <Label>Add Product</Label>
                  <div className="flex gap-2">
                    <Select
                      value={selectedProductId}
                      onValueChange={setSelectedProductId}
                      disabled={loadingProducts}
                    >
                      <SelectTrigger className="flex-1">
                        <SelectValue placeholder={loadingProducts ? "Loading products..." : "Select product"} />
                      </SelectTrigger>
                      <SelectContent>
                        {products.map((p) => (
                          <SelectItem key={p._id} value={p._id}>
                            {p.name} {p.sku ? `(${p.sku})` : ""}
                            {p.price ? ` - ₹${p.price}` : ""}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input
                      type="number"
                      min={1}
                      value={itemQuantity}
                      onChange={(e) => setItemQuantity(Math.max(1, Number(e.target.value)))}
                      className="w-24"
                    />
                    <Button type="button" variant="outline" onClick={addProductToOrder}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>

                  {/* Product image & details preview */}
                  {selectedProduct && (
                    <div className="mt-2 p-3 border rounded-lg bg-muted/20 flex items-center gap-3">
                      {selectedProduct.images && selectedProduct.images[0] ? (
                        <img
                          src={selectedProduct.images[0]}
                          alt={selectedProduct.name}
                          className="w-12 h-12 object-cover rounded-md border"
                        />
                      ) : (
                        <div className="w-12 h-12 bg-muted rounded-md flex items-center justify-center">
                          <ImageIcon className="h-5 w-5 text-muted-foreground" />
                        </div>
                      )}
                      <div className="flex-1">
                        <p className="font-medium">{selectedProduct.name}</p>
                        {selectedProduct.price && (
                          <p className="text-sm text-muted-foreground">Price: ₹{selectedProduct.price}</p>
                        )}
                        {selectedProduct.description && (
                          <p className="text-xs text-muted-foreground line-clamp-1">{selectedProduct.description}</p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Line items table with images */}
                  {lineItems.length > 0 && (
                    <div className="mt-4 space-y-2">
                      <Label>Order Items</Label>
                      <div className="space-y-2">
                        {lineItems.map((item, idx) => (
                          <div key={idx} className="flex items-center gap-2 p-2 border rounded-lg">
                            {item.image ? (
                              <img src={item.image} alt={item.productName} className="w-8 h-8 object-cover rounded" />
                            ) : (
                              <div className="w-8 h-8 bg-muted rounded flex items-center justify-center">
                                <ImageIcon className="h-4 w-4 text-muted-foreground" />
                              </div>
                            )}
                            <div className="flex-1">
                              <p className="font-medium text-sm">{item.productName}</p>
                              {item.price && <p className="text-xs text-muted-foreground">₹{item.price}</p>}
                              {item.sku && <p className="text-xs text-muted-foreground">SKU: {item.sku}</p>}
                            </div>
                            <Input
                              type="number"
                              min={1}
                              value={item.quantity}
                              onChange={(e) => updateLineItemQuantity(idx, Number(e.target.value))}
                              className="w-20"
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => removeLineItem(idx)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Address + Expected Date */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Delivery Address</Label>
                  <Textarea
                    placeholder="Enter complete delivery address"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
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

        {/* Orders list for selected manufacturer */}
        <Card>
          <CardHeader>
            <CardTitle>Orders</CardTitle>
          </CardHeader>

          <CardContent>
            {!selectedManufacturerId ? (
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
                        <p className="font-semibold">
                          {o.items.length} item{o.items.length > 1 ? "s" : ""}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Expected: {new Date(o.expectedDate).toLocaleDateString()}
                        </p>
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