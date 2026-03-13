// src/pages/admin/CustomerOrderTracking.tsx
import { useEffect, useMemo, useState } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import {
  Package,
  Truck,
  CheckCircle,
  Clock,
  XCircle,
  Loader2,
  ShieldCheck,
  MapPinned,
  Wrench,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// ✅ segment types
type Segment = "all" | "affordable" | "midrange" | "luxury";

// ✅ endpoints
const API_ROOT = "https://api.jsgallor.com/api/admin";
const SEGMENT_API: Record<Exclude<Segment, "all">, string> = {
  affordable: `${API_ROOT}/affordable/orders`,
  midrange: `${API_ROOT}/midrange/orders`,
  luxury: `${API_ROOT}/luxury/orders`,
};
const ALL_API = `${API_ROOT}/orders/all`;

/** ✅ Timeline steps (updated) */
const statusSteps = [
  { key: "placed", label: "Placed", icon: Clock },
  { key: "approved", label: "Approved", icon: CheckCircle },
  { key: "confirmed", label: "Confirmed", icon: ShieldCheck },
  { key: "shipped", label: "Shipped", icon: Truck },
  { key: "intransit", label: "In Transit", icon: MapPinned },
  { key: "delivered", label: "Delivered", icon: Package },
  { key: "assemble", label: "Assembled", icon: Wrench },
] as const;

type StepKey = (typeof statusSteps)[number]["key"];

type OrderStatus =
  | "pending_payment"
  | "placed"
  | "approved"
  | "confirmed"
  | "processing"
  | "shipped"
  | "intransit"
  | "delivered"
  | "assemble"
  | "cancelled"
  | "rejected"
  | "returned"
  | string;

type Order = {
  _id: string;

  userId?: string;
  customerId?: string;

  websiteLabel?: "Affordable" | "Mid Range" | "Luxury";
  website?: string;

  addressId?: string;

  status: OrderStatus;
  createdAt?: string;

  pricing?: {
    subtotal?: number;
    discount?: number;
    shippingCost?: number;
    shipping?: number;
    total?: number;
    currency?: string;
    tax?: number;
  };

  totals?: {
    subtotal?: number;
    shipping?: number;
    tax?: number;
    total?: number;
  };

  payment?: {
    method?: string;
    status?: string;
  };

  items: Array<{
    productId: string;
    quantity: number;
    name?: string;
    image?: string;
    price?: number;
    finalPrice?: number;
    color?: string;
    lineTotal?: number;
    productSnapshot?: {
      name?: string;
      price?: number;
      image?: string;
      category?: string;
      inStock?: boolean;
      colors?: string[];
    };
  }>;

  userDetails?: {
    _id: string;
    name?: string;
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
  };

  addressDetails?: {
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
    label?: string;
  } | null;

  addressSnapshot?: {
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

  shippingAddress?: {
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
};

type OrdersResponse =
  | Order[]
  | {
      data?: Order[];
      message?: string;
      success?: boolean;
    };

const safeJson = async (res: Response) => {
  try {
    return await res.json();
  } catch {
    return {};
  }
};

const normalizeOrders = (data: OrdersResponse): Order[] =>
  Array.isArray(data) ? data : data?.data || [];

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

const formatDate = (iso?: string) =>
  iso
    ? new Date(iso).toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "2-digit",
      })
    : "—";

const getOrderNumber = (order: Order) =>
  `#${order._id.slice(-6).toUpperCase()}`;

const paymentLabel = (o: Order) => {
  const method = nonEmpty(o.payment?.method);
  const status = nonEmpty(o.payment?.status);
  if (!method && !status) return "—";
  return `${method || "—"}${status ? ` / ${status}` : ""}`.toUpperCase();
};

const getFullName = (obj?: any) =>
  nonEmpty(obj?.fullName) ||
  [nonEmpty(obj?.firstName), nonEmpty(obj?.lastName)].filter(Boolean).join(" ").trim() ||
  nonEmpty(obj?.name) ||
  "";

const customerLabel = (o: Order) =>
  nonEmpty(o.userDetails?.name) ||
  getFullName(o.userDetails) ||
  getFullName(o.addressSnapshot) ||
  getFullName(o.addressDetails) ||
  getFullName(o.shippingAddress) ||
  nonEmpty(o.userDetails?.email) ||
  nonEmpty(o.addressDetails?.email) ||
  nonEmpty(o.shippingAddress?.email) ||
  "Customer";

const customerSub = (o: Order) =>
  [
    nonEmpty(o.userDetails?.email) ||
      nonEmpty(o.addressDetails?.email) ||
      nonEmpty(o.addressSnapshot?.email) ||
      nonEmpty(o.shippingAddress?.email),
    nonEmpty(o.userDetails?.phone) ||
      nonEmpty(o.addressSnapshot?.phone) ||
      nonEmpty(o.addressDetails?.phone) ||
      nonEmpty(o.shippingAddress?.phone),
  ]
    .filter(Boolean)
    .join(" • ");

const buildAddressLine = (o: Order) => {
  if (o.addressSnapshot) {
    const a = o.addressSnapshot;
    return [
      nonEmpty(a.line1),
      nonEmpty(a.line2),
      nonEmpty(a.landmark),
      nonEmpty(a.city),
      nonEmpty(a.state),
      nonEmpty(a.pincode),
      nonEmpty(a.country),
    ]
      .filter(Boolean)
      .join(", ");
  }

  if (o.addressDetails) {
    const a = o.addressDetails;
    return [
      nonEmpty(a.addressLine1),
      nonEmpty(a.addressLine2),
      nonEmpty(a.landmark),
      nonEmpty(a.city),
      nonEmpty(a.state),
      nonEmpty(a.pincode),
      nonEmpty(a.country),
    ]
      .filter(Boolean)
      .join(", ");
  }

  if (o.shippingAddress) {
    const a = o.shippingAddress;
    return [
      nonEmpty(a.addressLine1),
      nonEmpty(a.addressLine2),
      nonEmpty(a.landmark),
      nonEmpty(a.city),
      nonEmpty(a.state),
      nonEmpty(a.pincode),
      nonEmpty(a.country),
    ]
      .filter(Boolean)
      .join(", ");
  }

  return "—";
};

/** ✅ Normalize backend status -> timeline step */
const normalizeToTimeline = (
  status: OrderStatus
): StepKey | "rejected" | "cancelled" => {
  if (status === "rejected") return "rejected";
  if (status === "cancelled") return "cancelled";

  if (status === "returned") return "delivered";
  if (status === "pending_payment") return "placed";
  if (status === "processing") return "confirmed";

  if (status === "assemble") return "assemble";
  if (status === "delivered") return "delivered";
  if (status === "intransit") return "intransit";
  if (status === "shipped") return "shipped";
  if (status === "confirmed") return "confirmed";
  if (status === "approved") return "approved";
  return "placed";
};

const getStepIndexSafe = (status: StepKey) => {
  const idx = statusSteps.findIndex((s) => s.key === status);
  return idx < 0 ? 0 : idx;
};

const clamp = (n: number, min: number, max: number) =>
  Math.max(min, Math.min(max, n));

const statusBadge = (status: OrderStatus) => {
  if (status === "rejected") {
    return (
      <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-md bg-red-900/30 text-red-400 border border-red-800">
        <XCircle className="h-3 w-3" /> REJECTED
      </span>
    );
  }
  if (status === "cancelled") {
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

const getOrderTotal = (o: Order) =>
  Number(o.totals?.total ?? o.pricing?.total ?? 0);

export default function CustomerOrderTracking() {
  const [segment, setSegment] = useState<Segment>("all");
  const [showMode, setShowMode] = useState<"active" | "all">("active");
  const [statusFilter, setStatusFilter] = useState<OrderStatus | "all">("all");
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);

  const authHeaders = () => {
    const token = localStorage.getItem("token");
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  const fetchOrders = async () => {
    try {
      setLoading(true);

      const qs =
        statusFilter && statusFilter !== "all"
          ? `?status=${encodeURIComponent(String(statusFilter))}`
          : "";

      const url =
        segment === "all" ? `${ALL_API}${qs}` : `${SEGMENT_API[segment]}${qs}`;

      const res = await fetch(url, { headers: authHeaders() });
      const data = (await safeJson(res)) as OrdersResponse;

      if (!res.ok) throw new Error((data as any)?.message || "Failed to fetch orders");

      setOrders(normalizeOrders(data));
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

  const visibleOrders = useMemo(() => {
    let list = [...orders];

    if (showMode === "active") {
      list = list.filter(
        (o) =>
          !["assemble", "delivered", "cancelled", "rejected", "returned"].includes(
            String(o.status)
          )
      );
    }

    if (statusFilter !== "all") {
      list = list.filter((o) => String(o.status) === String(statusFilter));
    }

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
      { value: "pending_payment", label: "Pending Payment" },
      { value: "placed", label: "Placed" },
      { value: "approved", label: "Approved" },
      { value: "confirmed", label: "Confirmed" },
      { value: "processing", label: "Processing" },
      { value: "shipped", label: "Shipped" },
      { value: "intransit", label: "In Transit" },
      { value: "delivered", label: "Delivered" },
      { value: "assemble", label: "Assembled" },
      { value: "cancelled", label: "Cancelled" },
      { value: "rejected", label: "Rejected" },
      { value: "returned", label: "Returned" },
    ] as const;
  }, []);

  return (
    <AdminLayout panelType="eap" title="Track Orders" subtitle="Track customer order progress">
      <div className="space-y-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
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
              API:{" "}
              <span className="font-mono">
                {segment === "all" ? ALL_API : SEGMENT_API[segment]}
              </span>
            </div>
          </div>

          <div className="flex justify-end">
            <Button variant="outline" onClick={fetchOrders} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              Refresh
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-14 text-muted-foreground gap-2">
            <Loader2 className="h-5 w-5 animate-spin" />
            Loading orders...
          </div>
        ) : null}

        {!loading &&
          visibleOrders.map((order) => {
            const normalized = normalizeToTimeline(order.status);

            const timelineStep: StepKey =
              normalized === "rejected" || normalized === "cancelled"
                ? "placed"
                : normalized;

            const currentIndex = getStepIndexSafe(timelineStep);
            const progress = clamp(
              (currentIndex / (statusSteps.length - 1)) * 100,
              0,
              100
            );

            const items = order.items || [];

            return (
              <div key={order._id} className="bg-card rounded-xl border border-border p-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
                  <div>
                    <div className="flex items-center gap-3 flex-wrap">
                      <h3 className="font-semibold text-lg text-foreground">
                        {getOrderNumber(order)}
                      </h3>

                      {segment === "all" ? (
                        <span className="text-xs px-2 py-1 rounded-md border">
                          {order.websiteLabel || order.website || "—"}
                        </span>
                      ) : null}

                      {statusBadge(order.status)}
                      <Badge variant="secondary" className="text-xs">
                        {paymentLabel(order)}
                      </Badge>
                    </div>

                    <p className="text-sm text-muted-foreground">
                      {customerLabel(order)} • {formatDate(order.createdAt)}
                    </p>

                    <p className="text-xs text-muted-foreground mt-1">
                      {customerSub(order) || "—"}
                    </p>

                    <p className="text-xs text-muted-foreground mt-1">
                      Address:{" "}
                      <span className="text-foreground">{buildAddressLine(order)}</span>
                    </p>
                  </div>

                  <div className="text-right">
                    <p className="font-semibold text-lg">{formatCurrency(getOrderTotal(order))}</p>
                    <p className="text-sm text-muted-foreground">Items: {items.length}</p>
                  </div>
                </div>

                {order.status === "rejected" ? (
                  <div className="mb-4 rounded-lg border border-red-800 bg-red-900/20 px-4 py-3 text-sm text-red-300">
                    This order is <span className="font-semibold">REJECTED</span>.
                  </div>
                ) : null}

                {order.status === "cancelled" ? (
                  <div className="mb-4 rounded-lg border border-red-900/40 bg-red-900/10 px-4 py-3 text-sm text-red-200">
                    This order is <span className="font-semibold">CANCELLED</span>.
                  </div>
                ) : null}

                {order.status === "returned" ? (
                  <div className="mb-4 rounded-lg border border-amber-700 bg-amber-900/10 px-4 py-3 text-sm text-amber-300">
                    This order is <span className="font-semibold">RETURNED</span>.
                  </div>
                ) : null}

                <div className="relative">
                  <div className="flex items-center justify-between gap-1">
                    {statusSteps.map((step, index) => {
                      const isCompleted = index <= currentIndex;
                      const isCurrent = index === currentIndex;
                      const Icon = step.icon;

                      return (
                        <div key={step.key} className="flex flex-col items-center flex-1 min-w-0">
                          <div
                            className={cn(
                              "h-10 w-10 rounded-full flex items-center justify-center transition-all duration-300",
                              isCompleted
                                ? "bg-success text-success-foreground"
                                : "bg-muted text-muted-foreground",
                              isCurrent && "ring-4 ring-success/30"
                            )}
                          >
                            <Icon className="h-5 w-5" />
                          </div>

                          <span
                            className={cn(
                              "text-[11px] mt-2 text-center hidden sm:block",
                              isCompleted ? "text-foreground font-medium" : "text-muted-foreground"
                            )}
                          >
                            {step.label}
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  <div className="absolute top-5 left-0 right-0 h-0.5 bg-muted -z-10">
                    <div
                      className="h-full bg-success transition-all duration-500"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>

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

        {!loading && visibleOrders.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No orders found</p>
            <p className="text-xs mt-1">
              Try switching <b>View</b> to <b>All orders</b> or change filters.
            </p>
          </div>
        ) : null}
      </div>
    </AdminLayout>
  );
}
