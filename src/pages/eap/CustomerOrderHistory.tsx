// src/pages/admin/CustomerOrderHistory.tsx
import { useEffect, useMemo, useState } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { DataTable } from "@/components/ui/data-table";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  Eye,
  Loader2,
  Package,
  Check,
  X,
  Truck,
  ShieldCheck,
  Ban,
  Mail,
  Download,
  CreditCard,
  Wrench,
  MapPinned,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type Segment = "all" | "affordable" | "midrange" | "luxury";

type Status =
  | "placed"
  | "approved"
  | "confirmed"
  | "shipped"
  | "intransit"
  | "delivered"
  | "assemble"
  | "cancelled"
  | "rejected"
  | "pending_payment"
  | "processing"
  | "returned";

const API_ROOT = "https://api.jsgallor.com/api/admin";
const API_ALL = `${API_ROOT}/orders/all`;

const SEGMENT_API: Record<Exclude<Segment, "all">, string> = {
  affordable: `${API_ROOT}/affordable/orders`,
  midrange: `${API_ROOT}/midrange/orders`,
  luxury: `${API_ROOT}/luxury/orders`,
};

type OrderItem = {
  productId: string;
  quantity: number;
  name?: string;
  image?: string;
  color?: string;
  price?: number;
  lineTotal?: number;
  discountPercent?: number;
  discountAmount?: number;
  finalPrice?: number;
  productSnapshot?: {
    name?: string;
    price?: number;
    image?: string;
    category?: string;
    inStock?: boolean;
    colors?: string[];
    originalPrice?: number;
  };
};

type OrderPayment = {
  method?: string;
  status?: string;
  transactionId?: string;
  gateway?: string;
  upiId?: string;
  cardLast4?: string;
  meta?: {
    upiId?: string;
    bank?: string;
    cardLast4?: string;
    last4?: string;
    bankRef?: string;
    [k: string]: any;
  };
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  razorpaySignature?: string;
};

type OrderPricing = {
  subtotal?: number;
  discount?: number;
  shippingCost?: number;
  shipping?: number;
  shippingBase?: number;
  shippingDiscount?: number;
  tax?: number;
  total?: number;
  currency?: string;
  coupon?: {
    couponId?: string;
    code?: string;
    type?: string;
    value?: number;
    maxDiscount?: number;
  };
};

type OrderTotals = {
  subtotal?: number;
  shipping?: number;
  shippingBase?: number;
  shippingDiscount?: number;
  discount?: number;
  tax?: number;
  total?: number;
};

type OrderAddressSnapshot = {
  fullName?: string;
  firstName?: string;
  lastName?: string;
  name?: string;
  phone?: string;
  email?: string;
  line1?: string;
  line2?: string;
  landmark?: string;
  city?: string;
  state?: string;
  pincode?: string;
  country?: string;
};

type OrderAddressDetails = {
  _id?: string;
  fullName?: string;
  firstName?: string;
  lastName?: string;
  name?: string;
  phone?: string;
  email?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  pincode?: string;
  landmark?: string;
  country?: string;
  isDefault?: boolean;
  label?: string;
} | null;

type ShippingAddress = {
  label?: string;
  firstName?: string;
  lastName?: string;
  fullName?: string;
  name?: string;
  email?: string;
  phone?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  pincode?: string;
  country?: string;
  landmark?: string;
} | null;

type Order = {
  _id: string;
  userId?: string;
  customerId?: string;
  addressId?: string;
  website?: string;
  websiteLabel?: "Affordable" | "Mid Range" | "Luxury";
  addressSnapshot?: OrderAddressSnapshot;
  addressDetails?: OrderAddressDetails;
  shippingAddress?: ShippingAddress;
  items: OrderItem[];
  pricing?: OrderPricing;
  totals?: OrderTotals;
  coupon?: {
    couponId?: string | null;
    code?: string;
    type?: string;
    value?: number;
    maxDiscount?: number;
  } | null;
  payment?: OrderPayment;
  status: Status | string;
  createdAt?: string;
  updatedAt?: string;
  userDetails?: {
    _id: string;
    name?: string;
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
  } | null;
  orderNumber?: string;
  notes?: string;
  statusHistory?: Array<{
    status?: string;
    changedAt?: string;
    note?: string;
    changedBy?: string | null;
  }>;
};

type OrdersResponse =
  | Order[]
  | {
      success?: boolean;
      data?: Order[];
      message?: string;
    };

/** ---------------- Helpers ---------------- */

const safeJson = async (res: Response) => {
  try {
    return await res.json();
  } catch {
    return {};
  }
};

function normalizeResponse(res: OrdersResponse): Order[] {
  return Array.isArray(res) ? res : res?.data || [];
}

const nonEmpty = (v?: any) => {
  const s = String(v ?? "").trim();
  return s || "";
};

const formatCurrency = (amount = 0) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(Number(amount || 0));

const formatDateTime = (iso?: string) =>
  iso ? new Date(iso).toLocaleString("en-IN") : "—";

const formatDate = (iso?: string) =>
  iso
    ? new Date(iso).toLocaleDateString("en-IN", {
        year: "numeric",
        month: "short",
        day: "2-digit",
      })
    : "—";

const orderShortId = (id: string) => `#${id.slice(-6).toUpperCase()}`;

const getFullName = (obj?: any) =>
  nonEmpty(obj?.fullName) ||
  [nonEmpty(obj?.firstName), nonEmpty(obj?.lastName)].filter(Boolean).join(" ").trim() ||
  nonEmpty(obj?.name) ||
  "";

const getCustomerLabel = (order: Order) =>
  nonEmpty(order.userDetails?.name) ||
  nonEmpty(getFullName(order.userDetails)) ||
  nonEmpty(getFullName(order.addressSnapshot)) ||
  nonEmpty(getFullName(order.addressDetails)) ||
  nonEmpty(getFullName(order.shippingAddress)) ||
  nonEmpty(order.userDetails?.email) ||
  nonEmpty(order.addressDetails?.email) ||
  nonEmpty(order.shippingAddress?.email) ||
  "Customer";

const getCustomerSub = (order: Order) =>
  [
    nonEmpty(order.userDetails?.email) ||
      nonEmpty(order.addressDetails?.email) ||
      nonEmpty(order.addressSnapshot?.email) ||
      nonEmpty(order.shippingAddress?.email),
    nonEmpty(order.userDetails?.phone) ||
      nonEmpty(order.addressSnapshot?.phone) ||
      nonEmpty(order.addressDetails?.phone) ||
      nonEmpty(order.shippingAddress?.phone),
  ]
    .filter(Boolean)
    .join(" • ");

const getOwnerId = (o: Order) => o.userId || o.customerId || "—";

const buildAddressLine = (o: Order) => {
  if (o.addressSnapshot) {
    const a = o.addressSnapshot;
    return [
      nonEmpty(getFullName(a)) ? `Name: ${getFullName(a)}` : null,
      nonEmpty(a.phone) ? `Phone: ${a.phone}` : null,
      nonEmpty(a.line1),
      nonEmpty(a.line2),
      nonEmpty(a.landmark) ? `Landmark: ${a.landmark}` : null,
      [nonEmpty(a.city), nonEmpty(a.state)].filter(Boolean).join(", "),
      nonEmpty(a.pincode) ? `PIN: ${a.pincode}` : null,
      nonEmpty(a.country) ? `Country: ${a.country}` : null,
    ]
      .filter(Boolean)
      .join(", ");
  }

  if (o.addressDetails) {
    const a = o.addressDetails;
    return [
      nonEmpty(getFullName(a)) ? `Name: ${getFullName(a)}` : null,
      nonEmpty(a.phone) ? `Phone: ${a.phone}` : null,
      nonEmpty(a.addressLine1),
      nonEmpty(a.addressLine2),
      nonEmpty(a.landmark) ? `Landmark: ${a.landmark}` : null,
      [nonEmpty(a.city), nonEmpty(a.state)].filter(Boolean).join(", "),
      nonEmpty(a.pincode) ? `PIN: ${a.pincode}` : null,
      nonEmpty(a.country) ? `Country: ${a.country}` : null,
    ]
      .filter(Boolean)
      .join(", ");
  }

  if (o.shippingAddress) {
    const a = o.shippingAddress;
    return [
      nonEmpty(getFullName(a)) ? `Name: ${getFullName(a)}` : null,
      nonEmpty(a.phone) ? `Phone: ${a.phone}` : null,
      nonEmpty(a.addressLine1),
      nonEmpty(a.addressLine2),
      nonEmpty(a.landmark) ? `Landmark: ${a.landmark}` : null,
      [nonEmpty(a.city), nonEmpty(a.state)].filter(Boolean).join(", "),
      nonEmpty(a.pincode) ? `PIN: ${a.pincode}` : null,
      nonEmpty(a.country) ? `Country: ${a.country}` : null,
    ]
      .filter(Boolean)
      .join(", ");
  }

  return "—";
};

const orderItemsText = (o: Order) =>
  (Array.isArray(o.items) ? o.items : [])
    .map((i) => {
      const name = i.name || i.productSnapshot?.name || "Item";
      return `${name} × ${i.quantity}`;
    })
    .join(", ") || "—";

const paymentLabel = (o: Order) => {
  const p = o.payment || {};
  const method = nonEmpty(p.method);
  const status = nonEmpty(p.status);
  if (!method && !status) return "—";
  return `${method || "—"}${status ? ` / ${status}` : ""}`.toUpperCase();
};

const getSubtotal = (o: Order) =>
  Number(
    o.totals?.subtotal ??
      o.pricing?.subtotal ??
      (Array.isArray(o.items) ? o.items : []).reduce((s, it) => {
        const price = Number(
          it.finalPrice ?? it.productSnapshot?.price ?? it.price ?? it.lineTotal ?? 0
        );
        const qty = Number(it.quantity || 0);
        if (it.finalPrice != null || it.price != null || it.productSnapshot?.price != null) {
          return s + price * (it.finalPrice != null ? qty : 1);
        }
        return s + price;
      }, 0)
  );

const getDiscount = (o: Order) =>
  Number(o.totals?.discount ?? o.pricing?.discount ?? o.coupon?.value ?? 0);

const getShipping = (o: Order) =>
  Number(
    o.totals?.shipping ??
      o.pricing?.shippingCost ??
      o.pricing?.shipping ??
      o.totals?.shippingBase ??
      o.pricing?.shippingBase ??
      0
  );

const getTax = (o: Order) => Number(o.totals?.tax ?? o.pricing?.tax ?? 0);

const getTotal = (o: Order) =>
  Number(
    o.totals?.total ??
      o.pricing?.total ??
      Math.max(0, getSubtotal(o) - getDiscount(o) + getShipping(o) + getTax(o))
  );

const isTerminalStatus = (s?: string) =>
  s === "assemble" || s === "cancelled" || s === "rejected" || s === "returned";

const nextActionButtons = (s?: string) => {
  switch (s) {
    case "placed":
      return ["approve", "reject", "cancel"] as const;
    case "approved":
      return ["confirm", "cancel"] as const;
    case "confirmed":
      return ["ship", "cancel"] as const;
    case "shipped":
      return ["intransit", "cancel"] as const;
    case "intransit":
      return ["deliver"] as const;
    case "delivered":
      return ["assemble"] as const;
    default:
      return [] as const;
  }
};

export default function CustomerOrderHistory() {
  const [segment, setSegment] = useState<Segment>("all");
  const [statusFilter, setStatusFilter] = useState<Status | "all">("all");
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [viewOrder, setViewOrder] = useState<Order | null>(null);
  const [actionId, setActionId] = useState<string | null>(null);

  const authHeaders = () => {
    const token = localStorage.getItem("token");
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  const resolveBaseForOrder = (o: Order) => {
    const label = nonEmpty(o.websiteLabel || o.website).toLowerCase();
    if (label.includes("afford")) return SEGMENT_API.affordable;
    if (label.includes("mid")) return SEGMENT_API.midrange;
    return SEGMENT_API.luxury;
  };

  const ensureWebsiteLabel = (o: Order): Order => {
    const w = nonEmpty(o.website).toLowerCase();
    const lbl =
      o.websiteLabel ||
      (w.includes("afford")
        ? "Affordable"
        : w.includes("mid")
        ? "Mid Range"
        : w.includes("lux")
        ? "Luxury"
        : o.customerId
        ? "Luxury"
        : o.userId && o.addressSnapshot
        ? "Mid Range"
        : "Luxury");

    return { ...o, websiteLabel: lbl as "Affordable" | "Mid Range" | "Luxury" };
  };

  const fetchOrders = async () => {
    try {
      setLoading(true);

      const qs =
        statusFilter && statusFilter !== "all"
          ? `?status=${encodeURIComponent(statusFilter)}`
          : "";

      const url = segment === "all" ? `${API_ALL}${qs}` : `${SEGMENT_API[segment]}${qs}`;

      const res = await fetch(url, { headers: authHeaders() });
      const data = await safeJson(res);
      if (!res.ok) throw new Error(data?.message || "Failed to fetch orders");

      const list = normalizeResponse(data as OrdersResponse).map(ensureWebsiteLabel);

      list.sort((a, b) => {
        const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return tb - ta;
      });

      setOrders(list);
    } catch (err: any) {
      toast({
        title: "Error",
        description: err?.message || "Failed to load orders",
        variant: "destructive",
      });
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [segment, statusFilter]);

  const updateStatus = async (order: Order, status: Status) => {
    setActionId(order._id);
    try {
      const base = segment === "all" ? resolveBaseForOrder(order) : SEGMENT_API[segment];

      const res = await fetch(`${base}/${order._id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ status }),
      });

      const data = await safeJson(res);
      if (!res.ok) throw new Error(data?.message || "Failed to update status");

      toast({ title: "Updated", description: data?.message || "Order updated" });

      const updated: Order = ensureWebsiteLabel((data?.order || data) as Order);
      setOrders((prev) => prev.map((o) => (o._id === order._id ? updated : o)));
      setViewOrder((prev) => (prev?._id === order._id ? updated : prev));
    } catch (err: any) {
      toast({
        title: "Update failed",
        description: err?.message || "Server error",
        variant: "destructive",
      });
    } finally {
      setActionId(null);
    }
  };

  const approveOrder = async (order: Order) => {
    setActionId(order._id);
    try {
      const base = segment === "all" ? resolveBaseForOrder(order) : SEGMENT_API[segment];

      const res = await fetch(`${base}/${order._id}/approve`, {
        method: "PATCH",
        headers: authHeaders(),
      });

      const data = await safeJson(res);
      if (!res.ok) throw new Error(data?.message || "Approve failed");

      toast({ title: "Approved", description: data?.message || "Order approved" });

      const updated: Order = ensureWebsiteLabel((data?.order || data) as Order);
      setOrders((prev) => prev.map((o) => (o._id === order._id ? updated : o)));
      setViewOrder((prev) => (prev?._id === order._id ? updated : prev));
    } catch (err: any) {
      toast({
        title: "Approve failed",
        description: err?.message || "Server error",
        variant: "destructive",
      });
    } finally {
      setActionId(null);
    }
  };

  const rejectOrder = async (order: Order) => {
    setActionId(order._id);
    try {
      const reason = window.prompt("Reason (optional):") || "";
      const base = segment === "all" ? resolveBaseForOrder(order) : SEGMENT_API[segment];

      const res = await fetch(`${base}/${order._id}/reject`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ reason }),
      });

      const data = await safeJson(res);
      if (!res.ok) throw new Error(data?.message || "Reject failed");

      toast({
        title: "Rejected",
        description: data?.message || "Order rejected",
        variant: "destructive",
      });

      const updated: Order = ensureWebsiteLabel((data?.order || data) as Order);
      setOrders((prev) => prev.map((o) => (o._id === order._id ? updated : o)));
      setViewOrder((prev) => (prev?._id === order._id ? updated : prev));
    } catch (err: any) {
      toast({
        title: "Reject failed",
        description: err?.message || "Server error",
        variant: "destructive",
      });
    } finally {
      setActionId(null);
    }
  };

  const cancelOrder = async (order: Order) => {
    if (!confirm("Cancel this order?")) return;
    await updateStatus(order, "cancelled");
  };

  const sendInvoiceEmail = async (order: Order) => {
    setActionId(order._id);
    try {
      const base = segment === "all" ? resolveBaseForOrder(order) : SEGMENT_API[segment];
      const toEmail =
        nonEmpty(order.userDetails?.email) ||
        nonEmpty(order.addressDetails?.email) ||
        nonEmpty(order.shippingAddress?.email) ||
        "";

      const res = await fetch(`${base}/${order._id}/invoice/email`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ email: toEmail || undefined }),
      });

      const data = await safeJson(res);
      if (!res.ok) throw new Error(data?.message || "Failed to send invoice");

      toast({
        title: "Invoice sent",
        description: data?.message || `Invoice emailed${toEmail ? ` to ${toEmail}` : ""}`,
      });
    } catch (err: any) {
      toast({
        title: "Invoice failed",
        description: err?.message || "Server error",
        variant: "destructive",
      });
    } finally {
      setActionId(null);
    }
  };

  const downloadInvoice = async (order: Order) => {
    setActionId(order._id);
    try {
      const base = segment === "all" ? resolveBaseForOrder(order) : SEGMENT_API[segment];
      const token = localStorage.getItem("token");

      const res = await fetch(`${base}/${order._id}/invoice/pdf`, {
        method: "GET",
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      });

      if (!res.ok) {
        const data = await safeJson(res);
        throw new Error(data?.message || "Failed to download invoice");
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = `invoice-${order.orderNumber || order._id}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();

      window.URL.revokeObjectURL(url);

      toast({ title: "Downloaded", description: "Invoice PDF downloaded." });
    } catch (err: any) {
      toast({
        title: "Download failed",
        description: err?.message || "Server error",
        variant: "destructive",
      });
    } finally {
      setActionId(null);
    }
  };

  const columns = useMemo(
    () => [
      {
        key: "website",
        header: "Website",
        render: (order: Order) => (
          <span className="text-xs px-2 py-1 rounded-md border">
            {order.websiteLabel || order.website || "-"}
          </span>
        ),
      },
      {
        key: "_id",
        header: "Order",
        render: (order: Order) => (
          <div className="leading-tight">
            <div className="font-mono font-medium">{orderShortId(order._id)}</div>
            <div className="text-xs text-muted-foreground">
              {order.orderNumber ? order.orderNumber : `ID: ${order._id.slice(-8).toUpperCase()}`}
            </div>
          </div>
        ),
      },
      {
        key: "customer",
        header: "Customer",
        render: (order: Order) => (
          <div className="leading-tight">
            <p className="font-medium">{getCustomerLabel(order)}</p>
            <p className="text-xs text-muted-foreground">{getCustomerSub(order) || "—"}</p>
          </div>
        ),
      },
      {
        key: "items",
        header: "Items",
        render: (order: Order) => <span className="text-sm">{orderItemsText(order)}</span>,
      },
      {
        key: "total",
        header: "Amount",
        render: (order: Order) => (
          <span className="font-medium">{formatCurrency(getTotal(order))}</span>
        ),
      },
      {
        key: "payment",
        header: "Payment",
        render: (order: Order) => (
          <Badge variant="secondary" className="text-xs">
            {paymentLabel(order)}
          </Badge>
        ),
      },
      {
        key: "status",
        header: "Status",
        render: (order: Order) => <StatusBadge status={order.status} />,
      },
      {
        key: "createdAt",
        header: "Date",
        render: (order: Order) => formatDate(order.createdAt),
      },
    ],
    []
  );

  const actions = (order: Order) => (
    <Button
      variant="ghost"
      size="icon"
      className="h-8 w-8"
      onClick={() => setViewOrder(order)}
      title="View"
    >
      <Eye className="h-4 w-4" />
    </Button>
  );

  const tableData = useMemo(() => orders, [orders]);

  const invoiceItemRow = (it: OrderItem) => {
    const name = it.name || it.productSnapshot?.name || "Item";
    const qty = Number(it.quantity || 0);
    const unit = Number(it.finalPrice ?? it.productSnapshot?.price ?? it.price ?? 0);
    const line = Number(it.lineTotal ?? unit * qty);
    const img = it.image || it.productSnapshot?.image || "";
    return { name, qty, unit, line, img, productId: it.productId };
  };

  const invoiceTotals = (o: Order) => {
    const subtotal = getSubtotal(o);
    const discount = getDiscount(o);
    const shipping = getShipping(o);
    const tax = getTax(o);
    const total = getTotal(o) || Math.max(0, subtotal - discount + shipping + tax);
    return { subtotal, discount, shipping, tax, total };
  };

  const paymentDetails = (o: Order) => {
    const p = o.payment || {};
    const meta = p.meta || {};
    const cardLast4 = nonEmpty(p.cardLast4) || nonEmpty(meta.cardLast4) || nonEmpty(meta.last4);
    const upiId = nonEmpty(p.upiId) || nonEmpty(meta.upiId);
    const bank = nonEmpty(meta.bank);
    return {
      method: nonEmpty(p.method).toUpperCase() || "—",
      status: nonEmpty(p.status).toUpperCase() || "—",
      transactionId: nonEmpty(p.transactionId),
      cardLast4,
      upiId,
      bank,
      razorpayOrderId: nonEmpty((p as any).razorpayOrderId),
      razorpayPaymentId: nonEmpty((p as any).razorpayPaymentId),
    };
  };

  return (
    <AdminLayout
      panelType="eap"
      title="Order History"
      subtitle="All websites • full details • invoice actions"
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-4">
        <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Website:</span>
            <Select value={segment} onValueChange={(v) => setSegment(v as Segment)}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Select website" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Websites</SelectItem>
                <SelectItem value="affordable">Affordable</SelectItem>
                <SelectItem value="midrange">Mid Range</SelectItem>
                <SelectItem value="luxury">Luxury</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Status:</span>
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Filter status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="pending_payment">Pending Payment</SelectItem>
                <SelectItem value="placed">Placed</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="confirmed">Confirmed</SelectItem>
                <SelectItem value="processing">Processing</SelectItem>
                <SelectItem value="shipped">Shipped</SelectItem>
                <SelectItem value="intransit">In Transit</SelectItem>
                <SelectItem value="delivered">Delivered</SelectItem>
                <SelectItem value="assemble">Assemble</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
                <SelectItem value="returned">Returned</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="text-xs text-muted-foreground hidden md:block">
            API: <span className="font-mono">{segment === "all" ? API_ALL : SEGMENT_API[segment]}</span>
          </div>
        </div>

        <div className="flex justify-end">
          <Button variant="outline" onClick={fetchOrders} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
            Refresh
          </Button>
        </div>
      </div>

      <DataTable
        data={tableData}
        columns={columns}
        searchKey="_id"
        searchPlaceholder="Search orders..."
        actions={actions}
      />

      <Dialog open={!!viewOrder} onOpenChange={() => setViewOrder(null)}>
        <DialogContent className="w-[95vw] sm:w-[92vw] lg:w-[1000px] max-w-[95vw] h-[88vh] p-0 overflow-hidden">
          <DialogHeader className="px-4 sm:px-6 py-4 border-b">
            <DialogTitle className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                <span>Order Details</span>
                {viewOrder ? (
                  <span className="font-mono text-xs text-muted-foreground">
                    {orderShortId(viewOrder._id)}
                  </span>
                ) : null}
              </div>

              {viewOrder ? (
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs px-2 py-1 rounded-md border">
                    {viewOrder.websiteLabel || viewOrder.website || "-"}
                  </span>
                  <Badge variant="secondary" className="text-xs">
                    {paymentLabel(viewOrder)}
                  </Badge>
                  <StatusBadge status={viewOrder.status} />
                </div>
              ) : null}
            </DialogTitle>
          </DialogHeader>

          <div className="h-full overflow-y-auto px-4 sm:px-6 py-5 space-y-5">
            {!viewOrder ? (
              <div className="text-sm text-muted-foreground">No order selected.</div>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <div className="rounded-lg border p-3">
                    <div className="text-xs text-muted-foreground">Order</div>
                    <div className="mt-1 font-medium">
                      {viewOrder.orderNumber || orderShortId(viewOrder._id)}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {formatDateTime(viewOrder.createdAt)}
                    </div>
                  </div>

                  <div className="rounded-lg border p-3">
                    <div className="text-xs text-muted-foreground">Customer</div>
                    <div className="mt-1 font-medium">{getCustomerLabel(viewOrder)}</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {getCustomerSub(viewOrder) || "—"}
                    </div>
                  </div>

                  <div className="rounded-lg border p-3">
                    <div className="text-xs text-muted-foreground">Total</div>
                    <div className="mt-1 font-semibold">{formatCurrency(getTotal(viewOrder))}</div>
                    {(viewOrder.pricing?.coupon?.code || viewOrder.coupon?.code) ? (
                      <div className="text-xs mt-1">
                        <span className="text-muted-foreground">Coupon: </span>
                        <span className="font-mono">
                          {viewOrder.pricing?.coupon?.code || viewOrder.coupon?.code}
                        </span>
                      </div>
                    ) : null}
                  </div>

                  <div className="rounded-lg border p-3">
                    <div className="text-xs text-muted-foreground">Owner ID</div>
                    <div className="mt-1 font-mono text-xs break-all">{getOwnerId(viewOrder)}</div>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                  <div className="rounded-lg border p-4 space-y-2">
                    <div className="text-sm font-semibold">Delivery Address</div>
                    <div className="text-sm">{buildAddressLine(viewOrder)}</div>
                    {viewOrder.addressId ? (
                      <div className="text-xs text-muted-foreground font-mono">
                        addressId: {viewOrder.addressId}
                      </div>
                    ) : null}
                  </div>

                  <div className="rounded-lg border p-4 space-y-2">
                    <div className="text-sm font-semibold flex items-center gap-2">
                      <CreditCard className="h-4 w-4" />
                      Payment Details
                    </div>

                    {(() => {
                      const p = paymentDetails(viewOrder);
                      return (
                        <div className="text-sm space-y-1">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Method</span>
                            <span className="font-medium">{p.method}</span>
                          </div>

                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Status</span>
                            <span className="font-medium">{p.status}</span>
                          </div>

                          {p.transactionId ? (
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Txn</span>
                              <span className="font-mono text-xs">{p.transactionId}</span>
                            </div>
                          ) : null}

                          {p.upiId ? (
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">UPI</span>
                              <span className="font-mono text-xs">{p.upiId}</span>
                            </div>
                          ) : null}

                          {p.bank ? (
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Bank</span>
                              <span className="font-mono text-xs">{p.bank}</span>
                            </div>
                          ) : null}

                          {p.cardLast4 ? (
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Card</span>
                              <span className="font-mono text-xs">**** {p.cardLast4}</span>
                            </div>
                          ) : null}

                          {p.razorpayOrderId || p.razorpayPaymentId ? (
                            <div className="pt-2 text-xs text-muted-foreground space-y-1">
                              {p.razorpayOrderId ? (
                                <div>
                                  Razorpay Order: <span className="font-mono">{p.razorpayOrderId}</span>
                                </div>
                              ) : null}
                              {p.razorpayPaymentId ? (
                                <div>
                                  Razorpay Payment: <span className="font-mono">{p.razorpayPaymentId}</span>
                                </div>
                              ) : null}
                            </div>
                          ) : null}
                        </div>
                      );
                    })()}
                  </div>
                </div>

                <div className="rounded-lg border p-4">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-semibold">Items</div>
                    <div className="text-xs text-muted-foreground">
                      {Array.isArray(viewOrder.items) ? viewOrder.items.length : 0} item(s)
                    </div>
                  </div>

                  <div className="mt-3 space-y-3">
                    {(Array.isArray(viewOrder.items) ? viewOrder.items : []).map((it, idx) => {
                      const row = invoiceItemRow(it);
                      return (
                        <div
                          key={`${it.productId}-${idx}`}
                          className="flex flex-col sm:flex-row gap-3 border rounded-lg p-3"
                        >
                          <div className="h-20 w-20 shrink-0 overflow-hidden rounded-md border bg-muted">
                            {row.img ? (
                              <img src={row.img} alt={row.name} className="h-full w-full object-cover" />
                            ) : null}
                          </div>

                          <div className="flex-1">
                            <div className="font-medium">{row.name}</div>

                            {(it.productSnapshot?.category || it.color) ? (
                              <div className="text-xs text-muted-foreground">
                                {it.productSnapshot?.category
                                  ? `Category: ${it.productSnapshot.category}`
                                  : null}
                                {it.productSnapshot?.category && it.color ? " • " : ""}
                                {it.color ? `Color: ${it.color}` : null}
                                {it.productSnapshot?.colors?.length
                                  ? ` • Colors: ${it.productSnapshot.colors.join(", ")}`
                                  : ""}
                              </div>
                            ) : null}

                            {typeof it.discountPercent === "number" ? (
                              <div className="text-xs text-muted-foreground mt-1">
                                Discount: {it.discountPercent}% ({formatCurrency(it.discountAmount || 0)})
                              </div>
                            ) : null}

                            <div className="mt-2 flex flex-wrap gap-4 text-sm">
                              <div>
                                <span className="text-muted-foreground">Qty: </span>
                                {row.qty}
                              </div>
                              <div>
                                <span className="text-muted-foreground">Unit: </span>
                                {formatCurrency(row.unit)}
                              </div>
                              <div className="font-semibold">
                                <span className="text-muted-foreground font-normal">Line: </span>
                                {formatCurrency(row.line)}
                              </div>
                            </div>

                            <div className="mt-2 text-xs text-muted-foreground font-mono">
                              productId: {row.productId}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="rounded-lg border p-4">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold">Invoice</div>
                      <div className="text-xs text-muted-foreground">
                        Professional invoice preview • use email/PDF buttons to send or download.
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={actionId === viewOrder._id}
                        onClick={() => sendInvoiceEmail(viewOrder)}
                      >
                        <Mail className="h-4 w-4 mr-2" />
                        Send Invoice
                      </Button>

                      <Button
                        variant="outline"
                        size="sm"
                        disabled={actionId === viewOrder._id}
                        onClick={() => downloadInvoice(viewOrder)}
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Download PDF
                      </Button>
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <div className="rounded-md border bg-secondary/10 p-4 space-y-2">
                      <div className="text-xs text-muted-foreground">Billed To</div>
                      <div className="font-medium">{getCustomerLabel(viewOrder)}</div>
                      <div className="text-sm text-muted-foreground">{getCustomerSub(viewOrder) || "—"}</div>

                      <div className="pt-2 text-xs text-muted-foreground">Ship To</div>
                      <div className="text-sm">{buildAddressLine(viewOrder)}</div>

                      <div className="pt-2 grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <div className="text-xs text-muted-foreground">Invoice No.</div>
                          <div className="font-mono text-xs">
                            {viewOrder.orderNumber || viewOrder._id.slice(-10)}
                          </div>
                        </div>
                        <div>
                          <div className="text-xs text-muted-foreground">Invoice Date</div>
                          <div className="text-sm font-medium">{formatDate(viewOrder.createdAt)}</div>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-md border bg-secondary/10 p-4">
                      {(() => {
                        const t = invoiceTotals(viewOrder);
                        return (
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Subtotal</span>
                              <span className="font-medium">{formatCurrency(t.subtotal)}</span>
                            </div>

                            {t.discount > 0 ? (
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Discount</span>
                                <span className="font-medium text-emerald-600">
                                  - {formatCurrency(t.discount)}
                                </span>
                              </div>
                            ) : null}

                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Shipping</span>
                              <span className="font-medium">{formatCurrency(t.shipping)}</span>
                            </div>

                            {t.tax > 0 ? (
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Tax</span>
                                <span className="font-medium">{formatCurrency(t.tax)}</span>
                              </div>
                            ) : null}

                            <div className="pt-2 border-t flex justify-between text-base">
                              <span className="font-semibold">Total</span>
                              <span className="font-bold">{formatCurrency(t.total)}</span>
                            </div>

                            {(viewOrder.pricing?.coupon?.code || viewOrder.coupon?.code) ? (
                              <div className="pt-2 text-xs text-muted-foreground">
                                Coupon Applied:{" "}
                                <span className="font-mono">
                                  {viewOrder.pricing?.coupon?.code || viewOrder.coupon?.code}
                                </span>
                              </div>
                            ) : null}
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row justify-end gap-2 pb-3 pt-1">
                  <Button
                    variant="outline"
                    onClick={() => setViewOrder(null)}
                    disabled={actionId === viewOrder._id}
                  >
                    Close
                  </Button>

                  {nextActionButtons(viewOrder.status).includes("cancel") ? (
                    <Button
                      variant="outline"
                      className="text-destructive"
                      disabled={actionId === viewOrder._id || isTerminalStatus(viewOrder.status)}
                      onClick={() => cancelOrder(viewOrder)}
                    >
                      <Ban className="h-4 w-4 mr-2" />
                      Cancel
                    </Button>
                  ) : null}

                  {nextActionButtons(viewOrder.status).includes("approve") ? (
                    <Button
                      variant="outline"
                      className="text-success"
                      disabled={actionId === viewOrder._id}
                      onClick={() => approveOrder(viewOrder)}
                    >
                      <Check className="h-4 w-4 mr-2" />
                      Approve
                    </Button>
                  ) : null}

                  {nextActionButtons(viewOrder.status).includes("reject") ? (
                    <Button
                      variant="destructive"
                      disabled={actionId === viewOrder._id}
                      onClick={() => rejectOrder(viewOrder)}
                    >
                      <X className="h-4 w-4 mr-2" />
                      Reject
                    </Button>
                  ) : null}

                  {nextActionButtons(viewOrder.status).includes("confirm") ? (
                    <Button
                      variant="outline"
                      disabled={actionId === viewOrder._id}
                      onClick={() => updateStatus(viewOrder, "confirmed")}
                    >
                      <ShieldCheck className="h-4 w-4 mr-2" />
                      Confirm
                    </Button>
                  ) : null}

                  {nextActionButtons(viewOrder.status).includes("ship") ? (
                    <Button
                      variant="outline"
                      disabled={actionId === viewOrder._id}
                      onClick={() => updateStatus(viewOrder, "shipped")}
                    >
                      <Truck className="h-4 w-4 mr-2" />
                      Mark Shipped
                    </Button>
                  ) : null}

                  {nextActionButtons(viewOrder.status).includes("intransit") ? (
                    <Button
                      variant="outline"
                      disabled={actionId === viewOrder._id}
                      onClick={() => updateStatus(viewOrder, "intransit")}
                    >
                      <MapPinned className="h-4 w-4 mr-2" />
                      Mark In Transit
                    </Button>
                  ) : null}

                  {nextActionButtons(viewOrder.status).includes("deliver") ? (
                    <Button
                      variant="outline"
                      disabled={actionId === viewOrder._id}
                      onClick={() => updateStatus(viewOrder, "delivered")}
                    >
                      <Package className="h-4 w-4 mr-2" />
                      Mark Delivered
                    </Button>
                  ) : null}

                  {nextActionButtons(viewOrder.status).includes("assemble") ? (
                    <Button
                      variant="outline"
                      disabled={actionId === viewOrder._id}
                      onClick={() => updateStatus(viewOrder, "assemble")}
                    >
                      <Wrench className="h-4 w-4 mr-2" />
                      Mark Assembled
                    </Button>
                  ) : null}
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
