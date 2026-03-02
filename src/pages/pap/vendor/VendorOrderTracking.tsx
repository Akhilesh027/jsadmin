// src/pages/pap/vendor/VendorOrderTracking.tsx
import { useEffect, useMemo, useState } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Package, Truck, CheckCircle, Clock, XCircle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type Segment = "all" | "affordable" | "midrange" | "luxury";

const API_BASE =
  (import.meta as any).env?.VITE_BASE_URL?.replace(/\/$/, "") || "https://api.jsgallor.com";
const VENDOR_ORDERS_API = `${API_BASE}/api/admin/vendor-orders`;

/** Timeline steps */
const statusSteps = [
  { key: "placed", label: "Placed", icon: Clock },
  { key: "approved", label: "Approved", icon: CheckCircle },
  { key: "confirmed", label: "Confirmed", icon: Package },
  { key: "shipped", label: "Shipped", icon: Truck },
  { key: "delivered", label: "Delivered", icon: CheckCircle },
] as const;

type StepKey = (typeof statusSteps)[number]["key"];

type OrderStatus =
  | "placed"
  | "approved"
  | "confirmed"
  | "processing"
  | "shipped"
  | "delivered"
  | "cancelled"
  | "rejected"
  | "returned"
  | string;

type VendorDetails = {
  vendorId: string;
  vendorName: string;
  vendorSegment: Exclude<Segment, "all">;
  payoutStatus?: "pending" | "paid" | "hold";
};

type OrderItem = {
  productId: string;
  quantity: number;
  name?: string;
  image?: string;
  price?: number;
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
  };
};

type Order = {
  _id: string;
  vendor: VendorDetails;
  items: OrderItem[];
  pricing?: { subtotal?: number; gstRate?: number; gstAmount?: number; total?: number };
  totals?: { total?: number };
  payment?: { method?: string; status?: string; transactionId?: string };
  status: OrderStatus;
  createdAt?: string;
};

type ApiResponse =
  | { success: boolean; orders: Order[] }
  | { orders: Order[] }
  | Order[];

const safeJson = async (res: Response) => {
  try {
    return await res.json();
  } catch {
    return {};
  }
};

const normalizeOrders = (data: any): Order[] => {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.orders)) return data.orders;
  if (Array.isArray(data?.data)) return data.data;
  return [];
};

const norm = (s?: any) => String(s || "").trim().toLowerCase();

const formatCurrency = (amount = 0) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(Number(amount || 0));

const formatDate = (iso?: string) =>
  iso
    ? new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "2-digit" })
    : "—";

const getOrderNumber = (order: Order) => `#${order._id.slice(-6).toUpperCase()}`;

const paymentLabel = (o: Order) => {
  const method = (o.payment?.method || "").toString().trim();
  const status = (o.payment?.status || "").toString().trim();
  if (!method && !status) return "—";
  return `${method || "—"}${status ? ` / ${status}` : ""}`.toUpperCase();
};

const vendorSegmentLabel = (seg?: string) => {
  const s = norm(seg);
  if (s === "affordable") return "Affordable";
  if (s === "midrange") return "Mid Range";
  if (s === "luxury") return "Luxury";
  return "—";
};

const payoutLabel = (s?: VendorDetails["payoutStatus"]) => {
  if (!s) return "—";
  if (s === "paid") return "Paid";
  if (s === "hold") return "On Hold";
  return "Pending";
};

const orderItemsText = (o: Order) =>
  (o.items || [])
    .map((i) => `${i.name || i.productSnapshot?.name || "Item"} × ${i.quantity}`)
    .join(", ") || "—";

const getOrderTotal = (o: Order) => Number(o.totals?.total ?? o.pricing?.total ?? 0);

const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));

/** Normalize backend status -> timeline step */
const normalizeToTimeline = (status: OrderStatus): StepKey | "rejected" | "cancelled" => {
  const s = norm(status);

  if (s === "rejected") return "rejected";
  if (s === "cancelled") return "cancelled";

  if (s === "returned") return "delivered";
  if (s === "processing") return "confirmed";

  if (s === "delivered") return "delivered";
  if (s === "shipped") return "shipped";
  if (s === "confirmed") return "confirmed";
  if (s === "approved") return "approved";
  return "placed";
};

const getStepIndexSafe = (status: StepKey) => {
  const idx = statusSteps.findIndex((s) => s.key === status);
  return idx < 0 ? 0 : idx;
};

const statusBadge = (status: OrderStatus) => {
  const s = norm(status);

  if (s === "rejected") {
    return (
      <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-md bg-red-900/30 text-red-400 border border-red-800">
        <XCircle className="h-3 w-3" /> REJECTED
      </span>
    );
  }
  if (s === "cancelled") {
    return (
      <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-md bg-red-900/20 text-red-300 border border-red-900/40">
        <XCircle className="h-3 w-3" /> CANCELLED
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-md bg-muted text-muted-foreground">
      <Package className="h-3 w-3" /> {String(status).replaceAll("_", " ").toUpperCase()}
    </span>
  );
};

export default function VendorOrderTracking() {
  const [segment, setSegment] = useState<Segment>("all");
  const [showMode, setShowMode] = useState<"active" | "all">("active");
  const [statusFilter, setStatusFilter] = useState<OrderStatus | "all">("all");

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);

  const authHeaders = () => {
    const token =
      localStorage.getItem("Admintoken") ||
      localStorage.getItem("auth_token") ||
      localStorage.getItem("token") ||
      "";
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  const fetchOrders = async () => {
    try {
      setLoading(true);

      const qs = new URLSearchParams();
      if (segment !== "all") qs.set("segment", segment);

      // we send status to backend but also apply client filter (case-safe)
      if (statusFilter !== "all") qs.set("status", String(statusFilter));

      const url = `${VENDOR_ORDERS_API}?${qs.toString()}`;

      const res = await fetch(url, { headers: authHeaders() });
      const data = await safeJson(res);
      if (!res.ok) throw new Error(data?.message || "Failed to fetch vendor orders");

      setOrders(normalizeOrders(data));
    } catch (err: any) {
      toast({
        title: "Error",
        description: err?.message || "Failed to load vendor orders",
        variant: "destructive",
      });
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [segment, statusFilter]);

  const visibleOrders = useMemo(() => {
    let list = [...orders];

    // active/all
    if (showMode === "active") {
      list = list.filter((o) => !["delivered", "cancelled", "rejected", "returned"].includes(norm(o.status)));
    }

    // client-side status filter (case-safe)
    if (statusFilter !== "all") {
      list = list.filter((o) => norm(o.status) === norm(statusFilter));
    }

    // latest first
    list.sort((a, b) => {
      const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return tb - ta;
    });

    return list;
  }, [orders, showMode, statusFilter]);

  const statusOptions = useMemo(() => {
    return [
      { value: "all", label: "All" },
      { value: "placed", label: "Placed" },
      { value: "approved", label: "Approved" },
      { value: "confirmed", label: "Confirmed" },
      { value: "processing", label: "Processing" },
      { value: "shipped", label: "Shipped" },
      { value: "delivered", label: "Delivered" },
      { value: "cancelled", label: "Cancelled" },
      { value: "rejected", label: "Rejected" },
      { value: "returned", label: "Returned" },
    ] as const;
  }, []);

  return (
    <AdminLayout panelType="pap-vendor" title="Track Vendor Orders" subtitle="Track vendor order progress">
      <div className="space-y-6">
        {/* Filters row */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
            {/* Segment */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Vendor Segment:</span>
              <Select value={segment} onValueChange={(v) => setSegment(v as Segment)}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Select segment" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="affordable">Affordable</SelectItem>
                  <SelectItem value="midrange">Mid Range</SelectItem>
                  <SelectItem value="luxury">Luxury</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Show Mode */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">View:</span>
              <Select value={showMode} onValueChange={(v) => setShowMode(v as "active" | "all")}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Select view" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active only</SelectItem>
                  <SelectItem value="all">All orders</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Status Filter */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Status:</span>
              <Select value={statusFilter as any} onValueChange={(v) => setStatusFilter(v as any)}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Filter status" />
                </SelectTrigger>
                <SelectContent>
                  {statusOptions.map((s) => (
                    <SelectItem key={s.value} value={s.value as any}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="text-xs text-muted-foreground hidden md:block">
              API: <span className="font-mono">{VENDOR_ORDERS_API}</span>
            </div>
          </div>

          {/* Refresh */}
          <div className="flex justify-end">
            <Button variant="outline" onClick={fetchOrders} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              Refresh
            </Button>
          </div>
        </div>

        {/* Loading */}
        {loading ? (
          <div className="flex items-center justify-center py-14 text-muted-foreground gap-2">
            <Loader2 className="h-5 w-5 animate-spin" />
            Loading vendor orders...
          </div>
        ) : null}

        {/* Cards */}
        {!loading &&
          visibleOrders.map((order) => {
            const normalized = normalizeToTimeline(order.status);

            const timelineStep: StepKey =
              normalized === "rejected" || normalized === "cancelled" ? "placed" : normalized;

            const currentIndex = getStepIndexSafe(timelineStep);
            const progress = clamp((currentIndex / (statusSteps.length - 1)) * 100, 0, 100);

            const items = order.items || [];

            return (
              <div key={order._id} className="bg-card rounded-xl border border-border p-6">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
                  <div>
                    <div className="flex items-center gap-3 flex-wrap">
                      <h3 className="font-semibold text-lg text-foreground">{getOrderNumber(order)}</h3>

                      <span className="text-xs px-2 py-1 rounded-md border">
                        {vendorSegmentLabel(order.vendor?.vendorSegment)}
                      </span>

                      <span className="text-xs px-2 py-1 rounded-md border">
                        Payout: {payoutLabel(order.vendor?.payoutStatus)}
                      </span>

                      {statusBadge(order.status)}

                      <Badge variant="secondary" className="text-xs">
                        {paymentLabel(order)}
                      </Badge>
                    </div>

                    <p className="text-sm text-muted-foreground">
                      Vendor: <span className="text-foreground font-medium">{order.vendor?.vendorName || "—"}</span>
                      {" • "}
                      {formatDate(order.createdAt)}
                    </p>

                    <p className="text-xs text-muted-foreground mt-1">
                      Vendor ID: <span className="font-mono">{String(order.vendor?.vendorId || "").slice(-8).toUpperCase()}</span>
                    </p>
                  </div>

                  <div className="text-right">
                    <p className="font-semibold text-lg">{formatCurrency(getOrderTotal(order))}</p>
                    <p className="text-sm text-muted-foreground">Items: {items.length}</p>
                  </div>
                </div>

                {/* Cancel/Reject message */}
                {norm(order.status) === "rejected" ? (
                  <div className="mb-4 rounded-lg border border-red-800 bg-red-900/20 px-4 py-3 text-sm text-red-300">
                    This order is <span className="font-semibold">REJECTED</span>.
                  </div>
                ) : null}

                {norm(order.status) === "cancelled" ? (
                  <div className="mb-4 rounded-lg border border-red-900/40 bg-red-900/10 px-4 py-3 text-sm text-red-200">
                    This order is <span className="font-semibold">CANCELLED</span>.
                  </div>
                ) : null}

                {/* Timeline */}
                <div className="relative">
                  <div className="flex items-center justify-between">
                    {statusSteps.map((step, index) => {
                      const isCompleted = index <= currentIndex;
                      const isCurrent = index === currentIndex;
                      const Icon = step.icon;

                      return (
                        <div key={step.key} className="flex flex-col items-center flex-1">
                          <div
                            className={cn(
                              "h-10 w-10 rounded-full flex items-center justify-center transition-all duration-300",
                              isCompleted ? "bg-success text-success-foreground" : "bg-muted text-muted-foreground",
                              isCurrent && "ring-4 ring-success/30"
                            )}
                          >
                            <Icon className="h-5 w-5" />
                          </div>

                          <span
                            className={cn(
                              "text-xs mt-2 text-center hidden sm:block",
                              isCompleted ? "text-foreground font-medium" : "text-muted-foreground"
                            )}
                          >
                            {step.label}
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  {/* Progress line */}
                  <div className="absolute top-5 left-0 right-0 h-0.5 bg-muted -z-10">
                    <div className="h-full bg-success transition-all duration-500" style={{ width: `${progress}%` }} />
                  </div>
                </div>

                {/* Items */}
                <div className="mt-6 pt-4 border-t border-border">
                  <p className="text-sm text-muted-foreground mb-2">Items:</p>

                  {items.length ? (
                    <div className="flex flex-wrap gap-2">
                      {items.map((item, idx) => (
                        <span key={`${item.productId}-${idx}`} className="px-3 py-1 bg-muted rounded-full text-sm">
                          {item.name || item.productSnapshot?.name || "Item"} × {item.quantity}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No items found.</p>
                  )}
                </div>
              </div>
            );
          })}

        {/* Empty */}
        {!loading && visibleOrders.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No vendor orders found</p>
            <p className="text-xs mt-1">Try switching <b>View</b> to <b>All orders</b> or change filters.</p>
          </div>
        ) : null}
      </div>
    </AdminLayout>
  );
}
