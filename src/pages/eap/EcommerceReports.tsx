// src/pages/eap/EcommerceReports.tsx
import { useEffect, useMemo, useState, useCallback } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  BarChart3,
  TrendingUp,
  ShoppingCart,
  Truck,
  Download,
  Search,
  CalendarDays,
  Loader2,
  Eye,
  MapPin,
  Receipt,
  CreditCard,
  FileSpreadsheet,
} from "lucide-react";
import { cn } from "@/lib/utils";
import * as XLSX from "xlsx";

/** ---------------------------
 * Types
 * -------------------------- */
type Segment = "all" | "affordable" | "midrange" | "luxury";
type Days = "all" | "7" | "30" | "90";

type OrderItem = {
  productId?: string;
  quantity?: number;
  price?: number;
  finalPrice?: number;
  productSnapshot?: {
    name?: string;
    price?: number;
    sku?: string;
    image?: string;
    images?: string[];
    gallery?: string[];
  };
  name?: string;
};

type OrderPricing = {
  subtotal?: number;
  discount?: number;
  shipping?: number;
  tax?: number;
  total?: number;
  coupon?: {
    code?: string;
  };
};

type OrderPayment = {
  method?: string;
  status?: string;
  transactionId?: string;
  meta?: {
    upiId?: string;
    bank?: string;
    cardLast4?: string;
  };
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
};

type OrderAddress = {
  line1?: string;
  line2?: string;
  landmark?: string;
  city?: string;
  state?: string;
  pincode?: string;
  country?: string;
  addressLine1?: string;
  addressLine2?: string;
  fullName?: string;
  phone?: string;
  email?: string;
};

type FullOrder = {
  _id?: string;
  id?: string;
  orderNumber?: string;
  website?: Segment;
  segment?: Segment;
  status?: string;
  createdAt?: string;
  updatedAt?: string;
  items?: OrderItem[];
  pricing?: OrderPricing;
  totals?: OrderPricing;
  payment?: OrderPayment;
  addressSnapshot?: OrderAddress;
  shippingAddress?: OrderAddress;
  addressDetails?: OrderAddress;
  userDetails?: {
    name?: string;
    email?: string;
    phone?: string;
  };
};

const API = import.meta.env.VITE_API_URL || "https://api.jsgallor.com";
const API_ROOT = `${API}/api/admin`;

const SEGMENT_API: Record<Exclude<Segment, "all">, string> = {
  affordable: `${API_ROOT}/affordable/orders`,
  midrange: `${API_ROOT}/midrange/orders`,
  luxury: `${API_ROOT}/luxury/orders`,
};

function getToken() {
  return localStorage.getItem("Admintoken") || localStorage.getItem("token");
}

async function apiGet(url: string) {
  const token = getToken();
  const res = await fetch(url, {
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.message || "Request failed");
  return data;
}

function extractOrders(payload: any): FullOrder[] {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.orders)) return payload.orders;
  if (Array.isArray(payload?.data)) return payload.data;
  if (payload?.success && Array.isArray(payload?.data)) return payload.data;
  if (payload?.success && Array.isArray(payload?.orders)) return payload.orders;
  return [];
}

function normStatus(s?: string) {
  const x = String(s || "").toLowerCase().trim();
  if (x === "delivered") return "delivered";
  if (x === "out_for_delivery" || x === "out for delivery") return "out_for_delivery";
  if (x === "in_transit" || x === "in-transit" || x.includes("transit")) return "in_transit";
  if (x === "shipped") return "shipped";
  if (x === "packed") return "packed";
  if (x === "placed") return "placed";
  if (x === "pending") return "pending";
  if (x === "cancelled" || x === "canceled") return "cancelled";
  return x || "unknown";
}

function getAmount(o: FullOrder) {
  const pricing = o.pricing || o.totals || {};
  return Number(pricing.total ?? pricing.grandTotal ?? 0);
}

function getSubtotal(o: FullOrder) {
  const pricing = o.pricing || o.totals || {};
  return Number(pricing.subtotal ?? 0);
}

function getDiscount(o: FullOrder) {
  const pricing = o.pricing || o.totals || {};
  return Number(pricing.discount ?? 0);
}

function getShipping(o: FullOrder) {
  const pricing = o.pricing || o.totals || {};
  return Number(pricing.shipping ?? 0);
}

function getTax(o: FullOrder) {
  const pricing = o.pricing || o.totals || {};
  return Number(pricing.tax ?? 0);
}

const fmtCurrency = (n: number) => `₹${Number(n || 0).toLocaleString("en-IN")}`;
const fmtNumber = (n: number) => Number(n || 0).toLocaleString("en-IN");
const formatDateTime = (iso?: string) => {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-IN");
};

/** Helper to get full address string */
function getFullAddress(addr: OrderAddress | undefined) {
  if (!addr) return "";
  const parts = [
    addr.addressLine1 || addr.line1,
    addr.addressLine2 || addr.line2,
    addr.landmark ? `Landmark: ${addr.landmark}` : "",
    `${addr.city || ""}${addr.city ? "," : ""} ${addr.state || ""}`.trim(),
    addr.pincode ? `PIN: ${addr.pincode}` : "",
    addr.country ? `Country: ${addr.country}` : "",
  ];
  return parts.filter(Boolean).join(", ");
}

/** Excel Export: Two sheets – Orders & Order Items */
function exportOrdersToExcel(orders: FullOrder[]) {
  if (!orders.length) {
    toast({ title: "No data", description: "There are no orders to export.", variant: "destructive" });
    return;
  }

  // Sheet 1: Orders
  const ordersSheetData = orders.map((o) => {
    const addr = o.addressSnapshot || o.shippingAddress || o.addressDetails || {};
    const pricing = o.pricing || o.totals || {};
    const payment = o.payment || {};

    return {
      "Order ID": o.orderNumber || o._id || o.id || "",
      "Website": o.website || o.segment || "",
      "Status": normStatus(o.status),
      "Created At": formatDateTime(o.createdAt),
      "Customer Name": o.userDetails?.name || addr.fullName || "",
      "Customer Email": o.userDetails?.email || addr.email || "",
      "Customer Phone": o.userDetails?.phone || addr.phone || "",
      "Shipping Address": getFullAddress(addr),
      "Subtotal": pricing.subtotal ?? 0,
      "Discount": pricing.discount ?? 0,
      "Shipping": pricing.shipping ?? 0,
      "Tax": pricing.tax ?? 0,
      "Total": pricing.total ?? 0,
      "Payment Method": payment.method || "",
      "Payment Status": payment.status || "",
      "Transaction ID": payment.transactionId || "",
      "UPI ID": payment.meta?.upiId || "",
      "Card Last4": payment.meta?.cardLast4 || "",
      "Razorpay Order ID": payment.razorpayOrderId || "",
      "Razorpay Payment ID": payment.razorpayPaymentId || "",
      "Coupon Code": pricing.coupon?.code || "",
    };
  });

  // Sheet 2: Order Items
  const itemsSheetData: any[] = [];
  orders.forEach((o) => {
    const orderId = o.orderNumber || o._id || o.id || "";
    const items = o.items || [];
    items.forEach((it, idx) => {
      const name = it.name || it.productSnapshot?.name || "Item";
      const qty = Number(it.quantity || 0);
      const price = Number(it.finalPrice ?? it.price ?? it.productSnapshot?.price ?? 0);
      const lineTotal = price * qty;
      itemsSheetData.push({
        "Order ID": orderId,
        "Item #": idx + 1,
        "Product Name": name,
        "SKU": it.productSnapshot?.sku || "",
        "Quantity": qty,
        "Unit Price": price,
        "Line Total": lineTotal,
        "Product ID": it.productId || "",
      });
    });
  });

  const wb = XLSX.utils.book_new();

  const ordersSheet = XLSX.utils.json_to_sheet(ordersSheetData);
  XLSX.utils.book_append_sheet(wb, ordersSheet, "Orders");

  if (itemsSheetData.length) {
    const itemsSheet = XLSX.utils.json_to_sheet(itemsSheetData);
    XLSX.utils.book_append_sheet(wb, itemsSheet, "Order Items");
  }

  const fileName = `orders_report_${new Date().toISOString().slice(0, 19).replace(/:/g, "-")}.xlsx`;
  XLSX.writeFile(wb, fileName);

  toast({ title: "Export completed", description: "Orders exported to Excel." });
}

/** ---------------------------
 * Modal Component
 * -------------------------- */
function OrderDetailsModal({
  open,
  order,
  onClose,
}: {
  open: boolean;
  order: FullOrder | null;
  onClose: () => void;
}) {
  if (!open || !order) return null;

  const orderId = order.orderNumber || order._id || order.id || "—";
  const website = order.website || order.segment || "—";
  const status = normStatus(order.status);
  const createdAt = formatDateTime(order.createdAt);

  // Address
  const addr = order.addressSnapshot || order.shippingAddress || order.addressDetails || {};
  const addressText = getFullAddress(addr);

  const customerName =
    order.userDetails?.name ||
    addr.fullName ||
    "Customer";
  const customerEmail = order.userDetails?.email || addr.email || "";
  const customerPhone = order.userDetails?.phone || addr.phone || "";

  // Items
  const items = order.items || [];
  const pricing = order.pricing || order.totals || {};
  const payment = order.payment || {};

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-[95vw] sm:w-[90vw] lg:w-[1000px] max-w-[95vw] h-[85vh] rounded-xl bg-background shadow-lg overflow-hidden">
        <div className="flex items-center justify-between border-b px-5 py-4">
          <h2 className="text-lg font-semibold">Order Details</h2>
          <Button variant="outline" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>

        <div className="h-[calc(85vh-72px)] overflow-y-auto px-5 py-4">
          <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-wrap justify-between gap-4">
              <div>
                <div className="text-xl font-bold">{orderId}</div>
                <div className="text-sm text-muted-foreground mt-1">
                  <Badge variant="outline" className="capitalize">{website}</Badge>
                  <Badge variant="secondary" className="ml-2 capitalize">{status.replaceAll("_", " ")}</Badge>
                </div>
                <div className="text-xs text-muted-foreground mt-2">Created: {createdAt}</div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold">{fmtCurrency(getAmount(order))}</div>
                <div className="text-xs text-muted-foreground">Total</div>
              </div>
            </div>

            {/* Customer & Address */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="border rounded-lg p-3">
                <div className="flex items-center gap-2 font-semibold mb-2">
                  <MapPin className="h-4 w-4" />
                  Billed To
                </div>
                <div className="font-medium">{customerName}</div>
                {customerEmail && <div className="text-sm text-muted-foreground">{customerEmail}</div>}
                {customerPhone && <div className="text-sm text-muted-foreground">{customerPhone}</div>}
              </div>
              <div className="border rounded-lg p-3">
                <div className="flex items-center gap-2 font-semibold mb-2">
                  <MapPin className="h-4 w-4" />
                  Shipping Address
                </div>
                <div className="text-sm">{addressText || "—"}</div>
              </div>
            </div>

            {/* Items Table */}
            <div className="border rounded-lg overflow-hidden">
              <div className="bg-muted/40 px-4 py-2 font-semibold">Order Items</div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/20">
                    <tr>
                      <th className="p-3 text-left">#</th>
                      <th className="p-3 text-left">Product</th>
                      <th className="p-3 text-right">Qty</th>
                      <th className="p-3 text-right">Price</th>
                      <th className="p-3 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="p-3 text-center text-muted-foreground">
                          No items
                        </td>
                      </tr>
                    ) : (
                      items.map((it, idx) => {
                        const name = it.name || it.productSnapshot?.name || "Item";
                        const qty = Number(it.quantity || 0);
                        const price = Number(it.finalPrice ?? it.price ?? it.productSnapshot?.price ?? 0);
                        const line = price * qty;
                        const sku = it.productSnapshot?.sku || "";
                        return (
                          <tr key={idx} className="border-t">
                            <td className="p-3">{idx + 1}</td>
                            <td className="p-3">
                              <div className="font-medium">{name}</div>
                              {sku && <div className="text-xs text-muted-foreground">SKU: {sku}</div>}
                            </td>
                            <td className="p-3 text-right">{qty}</td>
                            <td className="p-3 text-right">{fmtCurrency(price)}</td>
                            <td className="p-3 text-right font-medium">{fmtCurrency(line)}</td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Pricing & Payment */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="border rounded-lg p-3">
                <div className="font-semibold mb-2">Summary</div>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span>{fmtCurrency(getSubtotal(order))}</span>
                  </div>
                  {getDiscount(order) > 0 && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Discount</span>
                      <span className="text-green-600">-{fmtCurrency(getDiscount(order))}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Shipping</span>
                    <span>{fmtCurrency(getShipping(order))}</span>
                  </div>
                  {getTax(order) > 0 && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Tax</span>
                      <span>{fmtCurrency(getTax(order))}</span>
                    </div>
                  )}
                  {pricing.coupon?.code && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Coupon</span>
                      <span className="font-mono text-xs">{pricing.coupon.code}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-semibold pt-2 border-t">
                    <span>Total</span>
                    <span>{fmtCurrency(getAmount(order))}</span>
                  </div>
                </div>
              </div>

              <div className="border rounded-lg p-3">
                <div className="flex items-center gap-2 font-semibold mb-2">
                  <CreditCard className="h-4 w-4" />
                  Payment
                </div>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Method</span>
                    <span className="capitalize">{payment.method || "—"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Status</span>
                    <span className="capitalize">{payment.status || "—"}</span>
                  </div>
                  {payment.transactionId && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Transaction ID</span>
                      <span className="font-mono text-xs">{payment.transactionId}</span>
                    </div>
                  )}
                  {payment.meta?.upiId && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">UPI ID</span>
                      <span className="font-mono text-xs">{payment.meta.upiId}</span>
                    </div>
                  )}
                  {payment.meta?.cardLast4 && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Card</span>
                      <span>**** {payment.meta.cardLast4}</span>
                    </div>
                  )}
                  {payment.razorpayOrderId && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Razorpay Order</span>
                      <span className="font-mono text-xs">{payment.razorpayOrderId}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/** ---------------------------
 * Main Component
 * -------------------------- */
export default function EcommerceReports() {
  const [segment, setSegment] = useState<Segment>("all");
  const [days, setDays] = useState<Days>("all");
  const [q, setQ] = useState("");

  const [loading, setLoading] = useState(false);
  const [orders, setOrders] = useState<FullOrder[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<FullOrder | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const rangeLabel =
    days === "all" ? "All Time (API)" : `Last ${days} days (API)`;

  const withDays = (url: string) => {
    if (days === "all") return url;
    return `${url}${url.includes("?") ? "&" : "?"}days=${days}`;
  };

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      let merged: FullOrder[] = [];

      if (segment === "all") {
        const [a, m, l] = await Promise.all([
          apiGet(withDays(SEGMENT_API.affordable)),
          apiGet(withDays(SEGMENT_API.midrange)),
          apiGet(withDays(SEGMENT_API.luxury)),
        ]);

        const aOrders = extractOrders(a).map((x) => ({ ...x, website: "affordable" as const }));
        const mOrders = extractOrders(m).map((x) => ({ ...x, website: "midrange" as const }));
        const lOrders = extractOrders(l).map((x) => ({ ...x, website: "luxury" as const }));

        merged = [...aOrders, ...mOrders, ...lOrders];
      } else {
        const payload = await apiGet(withDays(SEGMENT_API[segment]));
        merged = extractOrders(payload).map((x) => ({ ...x, website: segment }));
      }

      // Sort latest first
      merged.sort((a, b) => {
        const da = new Date(a.createdAt || a.updatedAt || 0).getTime();
        const db = new Date(b.createdAt || b.updatedAt || 0).getTime();
        return db - da;
      });

      setOrders(merged);
    } catch (err: any) {
      toast({
        title: "Failed to load report",
        description: err?.message || "Please check API endpoints.",
        variant: "destructive",
      });
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, [segment, days]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return orders;

    return orders.filter((o) => {
      const id = String(o._id || o.id || "").toLowerCase();
      const st = normStatus(o.status);
      const site = String(o.website || o.segment || "").toLowerCase();
      return id.includes(query) || st.includes(query) || site.includes(query);
    });
  }, [orders, q]);

  const stats = useMemo(() => {
    const totalOrders = filtered.length;
    const totalRevenue = filtered.reduce((sum, o) => sum + getAmount(o), 0);

    const byStatus: Record<string, number> = {
      pending: 0,
      placed: 0,
      packed: 0,
      shipped: 0,
      in_transit: 0,
      out_for_delivery: 0,
      delivered: 0,
      cancelled: 0,
      unknown: 0,
    };

    const bySite: Record<string, number> = {
      affordable: 0,
      midrange: 0,
      luxury: 0,
    };

    for (const o of filtered) {
      const st = normStatus(o.status);
      byStatus[st] = (byStatus[st] || 0) + 1;

      const site = String((o.website || o.segment || "") as string);
      if (bySite[site] !== undefined) bySite[site] += 1;
    }

    return { totalOrders, totalRevenue, byStatus, bySite };
  }, [filtered]);

  const handleExport = () => {
    if (filtered.length === 0) {
      toast({ title: "No data", description: "There are no orders to export.", variant: "destructive" });
      return;
    }
    exportOrdersToExcel(filtered);
  };

  const hasOrders = filtered.length > 0;

  const openOrderModal = (order: FullOrder) => {
    setSelectedOrder(order);
    setModalOpen(true);
  };

  return (
    <AdminLayout panelType="eap">
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-6 w-6" />
              <h1 className="text-2xl font-bold">Ecommerce Reports</h1>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              <CalendarDays className="h-4 w-4" />
              <span>{rangeLabel}</span>
              <Badge variant="outline" className="capitalize">
                Segment: {segment}
              </Badge>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={handleExport} disabled={loading || !hasOrders}>
              <FileSpreadsheet className="h-4 w-4 mr-2" />
              Export Excel
            </Button>
          </div>
        </div>

        {/* Controls */}
        <Card>
          <CardContent className="p-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              <Select value={segment} onValueChange={(v) => setSegment(v as Segment)}>
                <SelectTrigger className="w-[220px]">
                  <SelectValue placeholder="Select segment" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All (Affordable + Mid + Luxury)</SelectItem>
                  <SelectItem value="affordable">Affordable</SelectItem>
                  <SelectItem value="midrange">Midrange</SelectItem>
                  <SelectItem value="luxury">Luxury</SelectItem>
                </SelectContent>
              </Select>

              <Select value={days} onValueChange={(v) => setDays(v as Days)}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Days" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Time</SelectItem>
                  <SelectItem value="7">Last 7 days</SelectItem>
                  <SelectItem value="30">Last 30 days</SelectItem>
                  <SelectItem value="90">Last 90 days</SelectItem>
                </SelectContent>
              </Select>

              <Button variant="outline" onClick={fetchOrders} disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Refresh"}
              </Button>
            </div>

            <div className="relative w-full lg:max-w-md">
              <Search className="h-4 w-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search by order id / status / website..."
                className="pl-9"
              />
            </div>
          </CardContent>
        </Card>

        {/* KPI */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Kpi title="Total Orders" value={fmtNumber(stats.totalOrders)} icon={ShoppingCart} />
          <Kpi title="Total Revenue" value={fmtCurrency(stats.totalRevenue)} icon={TrendingUp} />
          <Kpi title="Delivered" value={fmtNumber(stats.byStatus.delivered || 0)} icon={Truck} />
          <Kpi title="Cancelled" value={fmtNumber(stats.byStatus.cancelled || 0)} icon={Truck} />
        </div>

        {/* Status breakdown + Site breakdown */}
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardContent className="p-4 space-y-2">
              <div className="font-semibold">Orders by Status</div>
              {!hasOrders ? (
                <div className="text-sm text-muted-foreground">No orders found.</div>
              ) : (
                <div className="grid grid-cols-2 gap-2 text-sm">
                  {Object.entries(stats.byStatus).map(([k, v]) => (
                    <div key={k} className="flex items-center justify-between rounded-md border px-3 py-2">
                      <span className="capitalize">{k.replaceAll("_", " ")}</span>
                      <Badge variant="secondary">{fmtNumber(v)}</Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 space-y-2">
              <div className="font-semibold">Orders by Website</div>
              {!hasOrders ? (
                <div className="text-sm text-muted-foreground">No orders found.</div>
              ) : (
                <div className="grid grid-cols-1 gap-2 text-sm">
                  {(["affordable", "midrange", "luxury"] as const).map((s) => (
                    <div key={s} className="flex items-center justify-between rounded-md border px-3 py-2">
                      <span className="capitalize">{s}</span>
                      <Badge variant="outline">{fmtNumber(stats.bySite[s] || 0)}</Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Orders Table with View Button */}
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/40">
                  <tr className="text-left">
                    <Th>Order</Th>
                    <Th>Website</Th>
                    <Th>Status</Th>
                    <Th className="text-right">Amount</Th>
                    <Th className="text-center">Actions</Th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={5} className="p-6 text-center text-muted-foreground">
                        Loading...
                      </td>
                    </tr>
                  ) : filtered.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-6 text-center text-muted-foreground">
                        No orders found.
                      </td>
                    </tr>
                  ) : (
                    filtered.slice(0, 50).map((o, idx) => (
                      <tr key={String(o._id || o.id || idx)} className="border-t">
                        <Td className="font-mono text-xs">{String(o._id || o.id || "—")}</Td>
                        <Td className="capitalize">{String(o.website || o.segment || "—")}</Td>
                        <Td className="capitalize">{normStatus(o.status).replaceAll("_", " ")}</Td>
                        <Td className="text-right">{fmtCurrency(getAmount(o))}</Td>
                        <Td className="text-center">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => openOrderModal(o)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </Td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>

              {filtered.length > 50 ? (
                <div className="p-3 text-xs text-muted-foreground border-t">
                  Showing first 50 rows (export Excel to get full data).
                </div>
              ) : null}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Modal */}
      <OrderDetailsModal
        open={modalOpen}
        order={selectedOrder}
        onClose={() => {
          setModalOpen(false);
          setSelectedOrder(null);
        }}
      />
    </AdminLayout>
  );
}

/** UI Components */
function Kpi({ title, value, icon: Icon }: { title: string; value: string; icon: any }) {
  return (
    <Card>
      <CardContent className="p-4 flex items-center gap-3">
        <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <div className="text-xs text-muted-foreground truncate">{title}</div>
          <div className="text-xl font-semibold truncate">{value}</div>
        </div>
      </CardContent>
    </Card>
  );
}

function Th({ children, className }: any) {
  return <th className={cn("p-4 font-semibold text-muted-foreground", className)}>{children}</th>;
}
function Td({ children, className }: any) {
  return <td className={cn("p-4 align-top", className)}>{children}</td>;
}