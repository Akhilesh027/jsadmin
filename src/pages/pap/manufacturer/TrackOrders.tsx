import { useEffect, useMemo, useState } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import {
  Package,
  Truck,
  CheckCircle,
  Clock,
  MapPin,
  Loader2,
  XCircle,
  BadgeCheck,
  Send,
  FileText,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const API_BASE = "https://api.jsgallor.com";

/** Timeline steps (tracking view) */
const statusSteps = [
  { key: "pending", label: "Pending", icon: Clock },
  { key: "packed", label: "Packed", icon: Package },
  { key: "shipped", label: "Shipped", icon: Truck },
  { key: "in_transit", label: "In Transit", icon: Truck },
  { key: "out_for_delivery", label: "Out for Delivery", icon: MapPin },
  { key: "delivered", label: "Delivered", icon: CheckCircle },
] as const;

type StepKey = (typeof statusSteps)[number]["key"];

type Manufacturer = {
  _id: string;
  companyName: string;
  city?: string;
  country?: string;
};

type ApiOrderItem = {
  productName: string;
  quantity: number;
};

type ApiOrderStatus =
  | "draft"
  | "sent"
  | "accepted"
  | "rejected"
  | "pending"
  | "packed"
  | "shipped"
  | "in_transit"
  | "out_for_delivery"
  | "delivered"
  | "completed";

type ApiOrder = {
  _id: string;
  orderNumber?: string;
  createdAt: string;

  manufacturer: string | Manufacturer; // may be populated object

  status: ApiOrderStatus;

  items?: ApiOrderItem[];
  productName?: string;

  totalAmount?: number;
  paymentMode?: string;
  paymentOption?: string;
};

const formatCurrency = (amount = 0) => `₹${Number(amount || 0).toLocaleString()}`;
const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
  });

const safeJson = async (res: Response) => {
  try {
    return await res.json();
  } catch {
    return {};
  }
};

const getStatusIndexSafe = (status: StepKey) => {
  const idx = statusSteps.findIndex((s) => s.key === status);
  return idx < 0 ? 0 : idx;
};

const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));

/**
 * Map backend statuses into timeline status
 * - draft/sent/accepted => pending in timeline
 * - completed => delivered in timeline
 * - rejected handled separately (special badge)
 */
const normalizeStatusForTimeline = (status: ApiOrderStatus): StepKey | "rejected" => {
  if (status === "rejected") return "rejected";
  if (status === "delivered" || status === "completed") return "delivered";

  if (status === "draft" || status === "sent" || status === "accepted" || status === "pending")
    return "pending";

  if (status === "packed") return "packed";
  if (status === "shipped") return "shipped";
  if (status === "in_transit") return "in_transit";
  if (status === "out_for_delivery") return "out_for_delivery";

  return "pending";
};

const statusBadge = (status: ApiOrderStatus) => {
  // Simple badge at header to reflect non-tracking states too
  switch (status) {
    case "draft":
      return (
        <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-md bg-muted text-muted-foreground">
          <FileText className="h-3 w-3" /> Draft
        </span>
      );
    case "sent":
      return (
        <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-md bg-yellow-900/30 text-yellow-400 border border-yellow-800">
          <Send className="h-3 w-3" /> Sent
        </span>
      );
    case "accepted":
      return (
        <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-md bg-blue-900/30 text-blue-400 border border-blue-800">
          <BadgeCheck className="h-3 w-3" /> Accepted
        </span>
      );
    case "rejected":
      return (
        <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-md bg-red-900/30 text-red-400 border border-red-800">
          <XCircle className="h-3 w-3" /> Rejected
        </span>
      );
    case "delivered":
    case "completed":
      return (
        <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-md bg-green-900/30 text-green-400 border border-green-800">
          <CheckCircle className="h-3 w-3" /> Delivered
        </span>
      );
    default:
      // tracking statuses
      return (
        <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-md bg-muted text-muted-foreground">
          <Package className="h-3 w-3" /> {status.replaceAll("_", " ")}
        </span>
      );
  }
};

export default function TrackOrdersAdmin() {
  const [manufacturers, setManufacturers] = useState<Manufacturer[]>([]);
  const [selectedManufacturerId, setSelectedManufacturerId] = useState<string>("all");

  const [orders, setOrders] = useState<ApiOrder[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchManufacturers = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/admin/manufacturers`);
      const data = await safeJson(res);

      if (!res.ok || !data?.success) throw new Error(data?.message || "Failed to fetch manufacturers");

      setManufacturers(Array.isArray(data.manufacturers) ? data.manufacturers : []);
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to load manufacturers",
        variant: "destructive",
      });
      setManufacturers([]);
    }
  };

  const fetchAllOrders = async () => {
    try {
      setLoading(true);

      const res = await fetch(`${API_BASE}/api/admin/orders`);
      const data = await safeJson(res);

      if (!res.ok || !data?.success) throw new Error(data?.message || "Failed to fetch orders");

      setOrders(Array.isArray(data.orders) ? data.orders : []);
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to load orders",
        variant: "destructive",
      });
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchManufacturers();
    fetchAllOrders();
  }, []);

  // manufacturer helpers (works with populated or plain id)
  const getOrderManufacturerId = (order: ApiOrder) =>
    typeof order.manufacturer === "string" ? order.manufacturer : order.manufacturer?._id || "";

  const getOrderManufacturerLabel = (order: ApiOrder) => {
    if (typeof order.manufacturer === "string") return "Manufacturer";
    const m = order.manufacturer;
    return `${m.companyName}${m.city ? ` - ${m.city}` : ""}${m.country ? `, ${m.country}` : ""}`;
  };

  const filteredOrders = useMemo(() => {
    if (selectedManufacturerId === "all") return orders;
    return orders.filter((o) => getOrderManufacturerId(o) === selectedManufacturerId);
  }, [orders, selectedManufacturerId]);

  // ✅ show all orders (not only active)
  const visibleOrders = filteredOrders;

  return (
    <AdminLayout
      panelType="pap-manufacturer"
      title="Track Orders"
      subtitle="Monitor all orders status (Admin)"
    >
      <div className="space-y-6">
        {/* Filter */}
        <div className="flex flex-col md:flex-row gap-4 md:items-end md:justify-between">
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

          <button
            onClick={fetchAllOrders}
            className="px-4 py-2 rounded-md border border-border bg-card hover:bg-muted text-sm"
            disabled={loading}
          >
            {loading ? (
              <span className="inline-flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" /> Refreshing...
              </span>
            ) : (
              "Refresh Orders"
            )}
          </button>
        </div>

        {/* Loading */}
        {loading ? (
          <div className="flex items-center justify-center py-14 text-muted-foreground gap-2">
            <Loader2 className="h-5 w-5 animate-spin" />
            Loading orders...
          </div>
        ) : null}

        {/* Orders */}
        {!loading &&
          visibleOrders.map((order) => {
            const normalized = normalizeStatusForTimeline(order.status);

            const timelineStatus: StepKey =
              normalized === "rejected" ? "pending" : normalized;

            const currentIndex = getStatusIndexSafe(timelineStatus);
            const progress = clamp(
              (currentIndex / (statusSteps.length - 1)) * 100,
              0,
              100
            );

            const title = order.orderNumber || `Order #${order._id.slice(-6).toUpperCase()}`;
            const paymentLabel =
              (order.paymentMode || order.paymentOption || "").toString().toUpperCase() || "—";

            const items = Array.isArray(order.items) ? order.items : [];

            return (
              <div key={order._id} className="bg-card rounded-xl border border-border p-6">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
                  <div>
                    <div className="flex items-center gap-3 flex-wrap">
                      <h3 className="font-semibold text-lg text-foreground">{title}</h3>
                      {statusBadge(order.status)}
                    </div>

                    <p className="text-sm text-muted-foreground">
                      {getOrderManufacturerLabel(order)} • {formatDate(order.createdAt)}
                    </p>

                    <p className="text-xs text-muted-foreground mt-1">
                      Current Status:{" "}
                      <span className="text-foreground font-medium">
                        {order.status.replaceAll("_", " ")}
                      </span>
                    </p>
                  </div>

                  <div className="text-right">
                    <p className="font-semibold text-lg">{formatCurrency(order.totalAmount || 0)}</p>
                    <p className="text-sm text-muted-foreground">{paymentLabel}</p>
                  </div>
                </div>

                {/* Rejected message (timeline still shows but order is rejected) */}
                {order.status === "rejected" ? (
                  <div className="mb-4 rounded-lg border border-red-800 bg-red-900/20 px-4 py-3 text-sm text-red-300">
                    This order is <span className="font-semibold">Rejected</span>.
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
                              "text-xs mt-2 text-center hidden sm:block",
                              isCompleted
                                ? "text-foreground font-medium"
                                : "text-muted-foreground"
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
                    <div
                      className="h-full bg-success transition-all duration-500"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>

                {/* Items */}
                <div className="mt-6 pt-4 border-t border-border">
                  <p className="text-sm text-muted-foreground mb-2">Items:</p>

                  {items.length ? (
                    <div className="flex flex-wrap gap-2">
                      {items.map((item, idx) => (
                        <span key={idx} className="px-3 py-1 bg-muted rounded-full text-sm">
                          {item.productName} × {item.quantity}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      {order.productName ? `• ${order.productName}` : "No items found."}
                    </p>
                  )}
                </div>
              </div>
            );
          })}

        {/* Empty */}
        {!loading && visibleOrders.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No orders found</p>
          </div>
        ) : null}
      </div>
    </AdminLayout>
  );
}
