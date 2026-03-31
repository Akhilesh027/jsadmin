import { useEffect, useMemo, useState } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { DataTable } from "@/components/ui/data-table";
import { StatusBadge } from "@/components/ui/status-badge";
import { Eye, Loader2, Package, Download, ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import * as XLSX from "xlsx";

const API_BASE = "https://api.jsgallor.com";

/** ------- Types ------- */
type Manufacturer = {
  _id: string;
  companyName: string;
  city?: string;
  country?: string;
};

type OrderItem = {
  productId: string;
  productName: string;
  sku?: string;
  quantity: number;
  price?: number;   // optional unit price, may come from product fetch
};

type ApiOrder = {
  _id: string;
  orderNumber?: string;
  createdAt: string;
  manufacturer: string | Manufacturer;
  items: OrderItem[];
  totalAmount?: number;
  address?: string;
  notes?: string;
  paymentMode?: string;
  paymentOption?: string;
  status:
    | "draft"
    | "sent"
    | "pending"
    | "accepted"
    | "rejected"
    | "packed"
    | "shipped"
    | "in_transit"
    | "out_for_delivery"
    | "delivered"
    | "completed";
};

type ProductDetail = {
  _id: string;
  name: string;
  sku?: string;
  price: number;
  image?: string;
  // other fields as needed
};

/** ------- Helpers ------- */
const safeJson = async (res: Response) => {
  try {
    return await res.json();
  } catch {
    return {};
  }
};

const formatCurrency = (amount = 0) => `₹${Number(amount || 0).toLocaleString()}`;
const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
  });

const getManufacturerId = (order: ApiOrder) =>
  typeof order.manufacturer === "string" ? order.manufacturer : order.manufacturer?._id || "";

const getManufacturerLabel = (order: ApiOrder) => {
  if (typeof order.manufacturer === "string") return "Manufacturer";
  const m = order.manufacturer;
  return `${m.companyName}${m.city ? ` - ${m.city}` : ""}${m.country ? `, ${m.country}` : ""}`;
};

const getOrderNumber = (order: ApiOrder) =>
  order.orderNumber || `#${order._id.slice(-6).toUpperCase()}`;

const getItemsSummary = (order: ApiOrder): string => {
  const items = Array.isArray(order.items) ? order.items : [];
  if (items.length) {
    return items.map(i => `${i.productName} × ${i.quantity}`).join(", ");
  }
  return "—";
};

const getTotalQuantity = (order: ApiOrder): number => {
  const items = Array.isArray(order.items) ? order.items : [];
  return items.reduce((sum, i) => sum + i.quantity, 0);
};

const getPaymentLabel = (order: ApiOrder) => {
  const p = (order.paymentMode || order.paymentOption || "").toString().trim();
  return p ? p.toUpperCase() : "—";
};

export default function OrderHistory() {
  const [orders, setOrders] = useState<ApiOrder[]>([]);
  const [manufacturers, setManufacturers] = useState<Manufacturer[]>([]);
  const [selectedManufacturerId, setSelectedManufacturerId] = useState<string>("all");
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);

  // View modal
  const [viewOrder, setViewOrder] = useState<ApiOrder | null>(null);
  // Product details for items in the viewed order
  const [productDetails, setProductDetails] = useState<Map<string, ProductDetail>>(new Map());
  const [loadingDetails, setLoadingDetails] = useState(false);

  const fetchManufacturers = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/admin/manufacturers`);
      const data = await safeJson(res);
      if (!res.ok || !data?.success) throw new Error(data?.message || "Failed to fetch manufacturers");
      setManufacturers(Array.isArray(data.manufacturers) ? data.manufacturers : []);
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Failed to load manufacturers", variant: "destructive" });
      setManufacturers([]);
    }
  };

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/api/admin/orders`);
      const data = await safeJson(res);
      if (!res.ok || !data?.success) throw new Error(data?.message || "Failed to fetch orders");
      setOrders(Array.isArray(data.orders) ? data.orders : []);
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Failed to load orders", variant: "destructive" });
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchProductDetails = async (productId: string) => {
    try {
      const res = await fetch(`${API_BASE}/api/admin/products/${productId}`);
      const data = await safeJson(res);
      if (!res.ok || !data?.success) throw new Error(data?.message || "Failed to fetch product");
      return data.product as ProductDetail;
    } catch (err) {
      console.warn(`Failed to fetch product ${productId}:`, err);
      return null;
    }
  };

  // When modal opens, fetch product details for all items
  useEffect(() => {
    if (!viewOrder) {
      setProductDetails(new Map());
      return;
    }
    const items = viewOrder.items || [];
    if (items.length === 0) return;

    const fetchAll = async () => {
      setLoadingDetails(true);
      const newMap = new Map<string, ProductDetail>();
      for (const item of items) {
        if (!item.productId) continue;
        if (productDetails.has(item.productId)) {
          newMap.set(item.productId, productDetails.get(item.productId)!);
        } else {
          const detail = await fetchProductDetails(item.productId);
          if (detail) newMap.set(item.productId, detail);
        }
      }
      setProductDetails(newMap);
      setLoadingDetails(false);
    };
    fetchAll();
  }, [viewOrder]);

  useEffect(() => {
    fetchManufacturers();
    fetchOrders();
  }, []);

  const filteredOrders = useMemo(() => {
    if (selectedManufacturerId === "all") return orders;
    return orders.filter((o) => getManufacturerId(o) === selectedManufacturerId);
  }, [orders, selectedManufacturerId]);

  // Export all filtered orders to Excel
  const exportToExcel = async () => {
    try {
      setExporting(true);
      const dataToExport = filteredOrders.length > 0 ? filteredOrders : orders;
      if (dataToExport.length === 0) {
        toast({ title: "No data", description: "There are no orders to export.", variant: "destructive" });
        return;
      }

      const rows = dataToExport.map(order => ({
        "Order ID": getOrderNumber(order),
        "Manufacturer": getManufacturerLabel(order),
        "Items": getItemsSummary(order),
        "Total Quantity": getTotalQuantity(order),
        "Total Amount": formatCurrency(order.totalAmount || 0),
        "Status": order.status.replace(/_/g, " ").toUpperCase(),
        "Date": formatDate(order.createdAt),
        "Payment Option": getPaymentLabel(order),
        "Delivery Address": order.address || "—",
        "Notes": order.notes || "—",
      }));

      const worksheet = XLSX.utils.json_to_sheet(rows);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Orders");
      XLSX.writeFile(workbook, `orders_${new Date().toISOString().slice(0, 19)}.xlsx`);
      toast({ title: "Export successful", description: `Exported ${rows.length} orders.` });
    } catch (err: any) {
      console.error(err);
      toast({ title: "Export failed", description: err.message, variant: "destructive" });
    } finally {
      setExporting(false);
    }
  };

  // Download a single order as Excel
  const downloadOrder = async (order: ApiOrder) => {
    try {
      const rows = [];

      // Header row (order summary)
      rows.push({
        Field: "Order ID",
        Value: getOrderNumber(order),
      });
      rows.push({ Field: "Manufacturer", Value: getManufacturerLabel(order) });
      rows.push({ Field: "Status", Value: order.status.replace(/_/g, " ").toUpperCase() });
      rows.push({ Field: "Date", Value: formatDate(order.createdAt) });
      rows.push({ Field: "Payment Option", Value: getPaymentLabel(order) });
      rows.push({ Field: "Total Amount", Value: formatCurrency(order.totalAmount || 0) });
      rows.push({ Field: "Delivery Address", Value: order.address || "—" });
      rows.push({ Field: "Notes", Value: order.notes || "—" });
      rows.push({}); // empty row

      // Items section
      rows.push({ Field: "Product", Value: "SKU", Value2: "Quantity", Value3: "Unit Price", Value4: "Subtotal" });
      const items = order.items || [];
      for (const item of items) {
        const detail = productDetails.get(item.productId);
        const unitPrice = detail?.price || item.price || 0;
        const subtotal = unitPrice * item.quantity;
        rows.push({
          Field: item.productName,
          Value: item.sku || detail?.sku || "—",
          Value2: item.quantity,
          Value3: formatCurrency(unitPrice),
          Value4: formatCurrency(subtotal),
        });
      }

      // Build worksheet
      const worksheet = XLSX.utils.json_to_sheet(rows, { skipHeader: true });
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Order Details");
      XLSX.writeFile(workbook, `Order_${getOrderNumber(order)}.xlsx`);
      toast({ title: "Downloaded", description: `Order ${getOrderNumber(order)} exported.` });
    } catch (err: any) {
      toast({ title: "Download failed", description: err.message, variant: "destructive" });
    }
  };

  // DataTable columns
  const columns = useMemo(
    () => [
      {
        key: "orderNumber",
        header: "Order ID",
        render: (order: ApiOrder) => <span className="font-mono font-medium">{getOrderNumber(order)}</span>,
      },
      {
        key: "party",
        header: "Manufacturer",
        render: (order: ApiOrder) => <p className="font-medium">{getManufacturerLabel(order)}</p>,
      },
      {
        key: "items",
        header: "Items",
        render: (order: ApiOrder) => <span className="text-sm">{getItemsSummary(order)}</span>,
      },
      {
        key: "totalAmount",
        header: "Amount",
        render: (order: ApiOrder) => <span className="font-medium">{formatCurrency(order.totalAmount || 0)}</span>,
      },
      {
        key: "status",
        header: "Status",
        render: (order: ApiOrder) => <StatusBadge status={order.status} />,
      },
      {
        key: "createdAt",
        header: "Date",
        render: (order: ApiOrder) => formatDate(order.createdAt),
      },
    ],
    []
  );

  const actions = (order: ApiOrder) => (
    <Button
      variant="ghost"
      size="icon"
      className="h-8 w-8"
      onClick={() => setViewOrder(order)}
      title="View Details"
    >
      <Eye className="h-4 w-4" />
    </Button>
  );

  return (
    <AdminLayout panelType="pap-manufacturer" title="Order History" subtitle="View all manufacturer orders">
      <div className="flex flex-col md:flex-row gap-4 md:items-end md:justify-between mb-4">
        <div className="max-w-xl w-full">
          <label className="text-sm text-muted-foreground">Filter by Manufacturer</label>
          <Select value={selectedManufacturerId} onValueChange={setSelectedManufacturerId}>
            <SelectTrigger className="mt-2">
              <SelectValue placeholder="Select manufacturer" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Manufacturers</SelectItem>
              {manufacturers.map((m) => (
                <SelectItem key={m._id} value={m._id}>
                  {m.companyName}
                  {m.city ? ` - ${m.city}` : ""}
                  {m.country ? `, ${m.country}` : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={exportToExcel}
            disabled={exporting || (filteredOrders.length === 0 && orders.length === 0)}
          >
            {exporting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
            Export Excel
          </Button>
          <Button variant="outline" onClick={fetchOrders} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
            Refresh
          </Button>
        </div>
      </div>

      <DataTable
        data={filteredOrders}
        columns={columns}
        searchKey="orderNumber"
        searchPlaceholder="Search orders..."
        actions={actions}
      />

      {/* Order Details Modal */}
      <Dialog open={!!viewOrder} onOpenChange={() => setViewOrder(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Order Details
            </DialogTitle>
          </DialogHeader>

          {viewOrder && (
            <div className="space-y-6">
              {/* Header row with download button */}
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm text-muted-foreground">Order</p>
                  <p className="text-xl font-semibold">{getOrderNumber(viewOrder)}</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {getManufacturerLabel(viewOrder)} • {formatDate(viewOrder.createdAt)}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => downloadOrder(viewOrder)}
                  disabled={loadingDetails}
                  className="gap-2"
                >
                  <Download className="h-4 w-4" />
                  Download Order
                </Button>
              </div>

              {/* Status & Payment */}
              <div className="flex flex-wrap gap-4 justify-between items-center border-b pb-3">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-sm">
                    {getPaymentLabel(viewOrder)}
                  </Badge>
                  <StatusBadge status={viewOrder.status} />
                </div>
                <p className="text-sm text-muted-foreground">Total: {formatCurrency(viewOrder.totalAmount || 0)}</p>
              </div>

              {/* Items Table */}
              <div>
                <h3 className="font-medium mb-2">Order Items</h3>
                {loadingDetails ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" /> Loading product details...
                  </div>
                ) : (viewOrder.items || []).length === 0 ? (
                  <p className="text-sm text-muted-foreground">No items in this order.</p>
                ) : (
                  <div className="border rounded-md overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/50">
                        <tr>
                          <th className="p-3 text-left">Product</th>
                          <th className="p-3 text-left">SKU</th>
                          <th className="p-3 text-center">Quantity</th>
                          <th className="p-3 text-right">Unit Price</th>
                          <th className="p-3 text-right">Subtotal</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {viewOrder.items.map((item, idx) => {
                          const detail = productDetails.get(item.productId);
                          const unitPrice = detail?.price || item.price || 0;
                          const subtotal = unitPrice * item.quantity;
                          return (
                            <tr key={idx}>
                              <td className="p-3">
                                <div className="flex items-center gap-3">
                                  {detail?.image ? (
                                    <img
                                      src={detail.image}
                                      alt={item.productName}
                                      className="w-10 h-10 rounded object-cover"
                                    />
                                  ) : (
                                    <div className="w-10 h-10 bg-muted rounded flex items-center justify-center">
                                      <ImageIcon className="h-5 w-5 text-muted-foreground" />
                                    </div>
                                  )}
                                  <div>
                                    <p className="font-medium">{item.productName}</p>
                                    <p className="text-xs text-muted-foreground">{detail?.sku || item.sku}</p>
                                  </div>
                                </div>
                              </td>
                              <td className="p-3">{item.sku || detail?.sku || "—"}</td>
                              <td className="p-3 text-center">{item.quantity}</td>
                              <td className="p-3 text-right">{formatCurrency(unitPrice)}</td>
                              <td className="p-3 text-right">{formatCurrency(subtotal)}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Address */}
              {viewOrder.address && (
                <div className="rounded-lg border p-4">
                  <p className="text-sm text-muted-foreground mb-1">Delivery Address</p>
                  <p className="text-sm">{viewOrder.address}</p>
                </div>
              )}

              {/* Notes */}
              {viewOrder.notes && (
                <div className="rounded-lg border p-4">
                  <p className="text-sm text-muted-foreground mb-1">Notes</p>
                  <p className="text-sm">{viewOrder.notes}</p>
                </div>
              )}

              <div className="flex justify-end">
                <Button variant="outline" onClick={() => setViewOrder(null)}>
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}