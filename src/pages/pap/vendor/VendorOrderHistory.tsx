// src/pages/pap/vendor/VendorOrderHistory.tsx
import { useEffect, useMemo, useState, useCallback } from "react";
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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Segment = "all" | "affordable" | "midrange" | "luxury";
type Status =
  | "all"
  | "placed"
  | "approved"
  | "confirmed"
  | "processing"
  | "shipped"
  | "delivered"
  | "cancelled"
  | "rejected"
  | "pending"
  | "reviewing";

type VendorDetails = {
  _id?: string;
  companyName?: string;
  legalName?: string;
  companyType?: string;
  telephone?: string;
  mobile?: string;
  email?: string;
  country?: string;
  city?: string;
  businessNature?: string;
  estYear?: number | null;
  relation?: string;
  employees?: string;
  pan?: string;
  gst?: string;
  items?: string;
  legalDisputes?: string;
  exportCountries?: string;
  description?: string;
  documentUrl?: string;
  status?: "pending" | "approved" | "rejected";

  vendorId?: string;
  vendorName?: string;
  vendorSegment?: Exclude<Segment, "all">;
  payoutStatus?: "pending" | "paid" | "hold";
};

type OrderItem = {
  productId: string;
  name?: string;
  sku?: string;
  image?: string;
  tier?: string;
  category?: string;
  subcategory?: string;
  material?: string;
  color?: string;
  size?: string;
  quantity: number;
  unitPrice?: number;
  lineTotal?: number;
};

type ShippingAddress = {
  fullName?: string;
  phone?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  pincode?: string;
};

type Order = {
  _id: string;
  orderNumber?: string;
  status: string;
  note?: string;

  vendor: VendorDetails | null;
  items: OrderItem[];
  shippingAddress?: ShippingAddress;

  pricing?: {
    subtotal?: number;
    gstRate?: number;
    gstAmount?: number;
    total?: number;
  };

  meta?: {
    forwardedToAdmin?: boolean;
  };

  createdAt?: string;
  updatedAt?: string;
};

const API_BASE =
  (import.meta as any).env?.VITE_BASE_URL?.replace(/\/$/, "") ||
  "https://api.jsgallor.com";
const VENDOR_ORDERS_API = `${API_BASE}/api/admin/vendor-orders`;

const safeJson = async (res: Response) => {
  try {
    return await res.json();
  } catch {
    return {};
  }
};

const normStatus = (s?: string) => String(s || "").trim().toLowerCase();
const normSeg = (s?: string) => String(s || "").trim().toLowerCase();

const formatCurrency = (amount = 0) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(Number(amount || 0));

const formatDate = (iso?: string) =>
  iso ? new Date(iso).toLocaleString("en-IN") : "—";

const getOrderNumber = (order: Order) =>
  order.orderNumber || `#${order._id.slice(-6).toUpperCase()}`;

const inferVendorSegment = (
  vendor?: VendorDetails | null
): Exclude<Segment, "all"> => {
  const raw = String(vendor?.vendorSegment || "").toLowerCase();
  if (raw === "affordable" || raw === "midrange" || raw === "luxury") {
    return raw;
  }
  return "affordable";
};

const vendorSegmentLabel = (seg?: string) => {
  const s = normSeg(seg);
  if (s === "affordable") return "Affordable";
  if (s === "midrange") return "Mid Range";
  if (s === "luxury") return "Luxury";
  return "—";
};

const payoutBadge = (status?: VendorDetails["payoutStatus"]) => {
  if (!status) return "—";
  if (status === "paid") return "Paid";
  if (status === "hold") return "On Hold";
  return "Pending";
};

const vendorNameLabel = (vendor?: VendorDetails | null) =>
  vendor?.companyName || vendor?.legalName || vendor?.vendorName || "—";

const vendorIdLabel = (vendor?: VendorDetails | null) =>
  String(vendor?.vendorId || vendor?._id || "")
    .slice(-8)
    .toUpperCase();

const orderItemsText = (o: Order) =>
  (o.items || [])
    .slice(0, 3)
    .map((i) => `${i.name || "Item"} × ${i.quantity}`)
    .join(", ")
    .concat(o.items?.length > 3 ? ` +${o.items.length - 3} more` : "") || "—";

const getOrderTotal = (o: Order) => Number(o.pricing?.total ?? 0);

function getAdminToken() {
  return (
    localStorage.getItem("Admintoken") ||
    localStorage.getItem("auth_token") ||
    localStorage.getItem("token") ||
    ""
  );
}

const isTerminalStatus = (s?: string) => {
  const ns = normStatus(s);
  return ns === "delivered" || ns === "cancelled" || ns === "rejected";
};

const nextActionButtons = (s?: string) => {
  switch (normStatus(s)) {
    case "placed":
    case "pending":
      return ["approve", "reject", "cancel"] as const;
    case "approved":
      return ["confirm", "cancel"] as const;
    case "confirmed":
      return ["processing", "ship", "cancel"] as const;
    case "processing":
      return ["ship", "cancel"] as const;
    case "shipped":
      return ["deliver"] as const;
    default:
      return [] as const;
  }
};

export default function VendorOrderHistory() {
  const [segment, setSegment] = useState<Segment>("all");
  const [statusFilter, setStatusFilter] = useState<Status>("all");

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);

  const [viewOrder, setViewOrder] = useState<Order | null>(null);
  const [actionId, setActionId] = useState<string | null>(null);

  const authHeaders = () => {
    const token = getAdminToken();
    return {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  };

  const fetchOrders = useCallback(async () => {
    try {
      setLoading(true);

      const qs = new URLSearchParams();
      if (segment !== "all") qs.set("segment", segment);
      if (statusFilter !== "all") qs.set("status", statusFilter);

      const url = `${VENDOR_ORDERS_API}?${qs.toString()}`;
      const res = await fetch(url, { headers: authHeaders() });
      const data = await safeJson(res);

      if (!res.ok) {
        throw new Error(data?.message || "Failed to fetch vendor orders");
      }

      const list: Order[] = Array.isArray(data?.orders)
        ? data.orders
        : Array.isArray(data?.data)
          ? data.data
          : Array.isArray(data)
            ? data
            : [];

      const filtered = list.filter((o) => {
        const okSeg =
          segment === "all"
            ? true
            : normSeg(o.vendor?.vendorSegment) === segment;
        const okStatus =
          statusFilter === "all"
            ? true
            : normStatus(o.status) === statusFilter;
        return okSeg && okStatus;
      });

      filtered.sort((a, b) => {
        const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return tb - ta;
      });

      setOrders(filtered);
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
  }, [segment, statusFilter]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const approveOrder = async (order: Order) => {
    setActionId(order._id);
    try {
      const res = await fetch(`${VENDOR_ORDERS_API}/${order._id}/approve`, {
        method: "PATCH",
        headers: authHeaders(),
      });

      const data = await safeJson(res);
      if (!res.ok) throw new Error(data?.message || "Approve failed");

      toast({
        title: "Approved",
        description: data?.message || "Order approved",
      });

      const updated: Order = (data?.order || data) as Order;

      setOrders((prev) =>
        prev.map((o) => (o._id === order._id ? { ...o, ...updated } : o))
      );
      setViewOrder((prev) =>
        prev?._id === order._id ? { ...prev, ...updated } : prev
      );
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

      const res = await fetch(`${VENDOR_ORDERS_API}/${order._id}/reject`, {
        method: "PATCH",
        headers: authHeaders(),
        body: JSON.stringify({ reason }),
      });

      const data = await safeJson(res);
      if (!res.ok) throw new Error(data?.message || "Reject failed");

      toast({
        title: "Rejected",
        description: data?.message || "Order rejected",
        variant: "destructive",
      });

      const updated: Order = (data?.order || data) as Order;

      setOrders((prev) =>
        prev.map((o) => (o._id === order._id ? { ...o, ...updated } : o))
      );
      setViewOrder((prev) =>
        prev?._id === order._id ? { ...prev, ...updated } : prev
      );
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

  const updateStatus = async (order: Order, status: string) => {
    setActionId(order._id);
    try {
      const res = await fetch(`${VENDOR_ORDERS_API}/${order._id}/status`, {
        method: "PATCH",
        headers: authHeaders(),
        body: JSON.stringify({ status }),
      });

      const data = await safeJson(res);
      if (!res.ok) throw new Error(data?.message || "Failed to update status");

      toast({
        title: "Updated",
        description: data?.message || "Order updated",
      });

      const updated: Order = (data?.order || data) as Order;

      setOrders((prev) =>
        prev.map((o) => (o._id === order._id ? { ...o, ...updated } : o))
      );
      setViewOrder((prev) =>
        prev?._id === order._id ? { ...prev, ...updated } : prev
      );
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

  const cancelOrder = async (order: Order) => {
    if (!confirm("Cancel this order?")) return;
    await updateStatus(order, "cancelled");
  };

  const columns = useMemo(
    () => [
      {
        key: "vendor",
        header: "Vendor",
        render: (o: Order) => (
          <div className="leading-tight">
            <p className="font-medium">{vendorNameLabel(o.vendor)}</p>
            <p className="text-xs text-muted-foreground font-mono">
              {vendorIdLabel(o.vendor) || "—"}
            </p>
          </div>
        ),
      },
      {
        key: "segment",
        header: "Segment",
        render: (o: Order) => (
          <span className="text-xs px-2 py-1 rounded-md border">
            {vendorSegmentLabel(inferVendorSegment(o.vendor))}
          </span>
        ),
      },
      {
        key: "vendorStatus",
        header: "Vendor Status",
        render: (o: Order) => (
          <span className="text-xs px-2 py-1 rounded-md border capitalize">
            {o.vendor?.status || "—"}
          </span>
        ),
      },
      {
        key: "orderNumber",
        header: "Order No",
        render: (o: Order) => (
          <span className="font-mono font-medium">{getOrderNumber(o)}</span>
        ),
      },
      {
        key: "items",
        header: "Items",
        render: (o: Order) => (
          <span className="text-sm">{orderItemsText(o)}</span>
        ),
      },
      {
        key: "total",
        header: "Amount",
        render: (o: Order) => (
          <span className="font-medium">{formatCurrency(getOrderTotal(o))}</span>
        ),
      },
      {
        key: "status",
        header: "Status",
        render: (o: Order) => <StatusBadge status={o.status} />,
      },
      {
        key: "createdAt",
        header: "Date",
        render: (o: Order) => formatDate(o.createdAt),
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

  const selectedItemsTotal =
    viewOrder?.items?.reduce((sum, it) => {
      return sum + Number(it.lineTotal ?? Number(it.unitPrice || 0) * Number(it.quantity || 0));
    }, 0) ?? 0;

  const selectedTotal = Number(viewOrder?.pricing?.total ?? selectedItemsTotal);

  return (
    <AdminLayout
      panelType="pap-vendor"
      title="Vendor Order History"
      subtitle="View and manage vendor orders only"
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-4">
        <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
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

          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Status:</span>
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as Status)}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Filter status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="placed">Placed</SelectItem>
                <SelectItem value="reviewing">Reviewing</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="confirmed">Confirmed</SelectItem>
                <SelectItem value="processing">Processing</SelectItem>
                <SelectItem value="shipped">Shipped</SelectItem>
                <SelectItem value="delivered">Delivered</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="text-xs text-muted-foreground hidden md:block">
            API: <span className="font-mono">{VENDOR_ORDERS_API}</span>
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
        searchKey="orderNumber"
        searchPlaceholder="Search vendor orders..."
        actions={actions}
      />

      <Dialog open={!!viewOrder} onOpenChange={() => setViewOrder(null)}>
        <DialogContent
          className="
            w-[95vw] sm:w-[90vw] lg:w-[1100px]
            max-w-[95vw]
            h-[88vh] sm:h-[84vh]
            p-0 overflow-hidden
          "
        >
          <DialogHeader className="px-4 sm:px-6 py-4 border-b">
            <DialogTitle className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                <span>Vendor Order Details</span>
                {viewOrder ? (
                  <span className="font-mono text-xs text-muted-foreground">
                    {getOrderNumber(viewOrder)}
                  </span>
                ) : null}
              </div>

              {viewOrder ? (
                <div className="flex items-center gap-2 flex-wrap justify-end">
                  <span className="text-xs px-2 py-1 rounded-md border">
                    {vendorSegmentLabel(inferVendorSegment(viewOrder.vendor))}
                  </span>
                  <StatusBadge status={viewOrder.status} />
                </div>
              ) : null}
            </DialogTitle>
          </DialogHeader>

          <div className="h-full overflow-y-auto px-4 sm:px-6 py-4 space-y-5">
            {!viewOrder ? (
              <div className="text-sm text-muted-foreground">No order selected.</div>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <div className="rounded-lg border p-3">
                    <div className="text-xs text-muted-foreground">Vendor</div>
                    <div className="mt-1 font-medium">{vendorNameLabel(viewOrder.vendor)}</div>
                    <div className="mt-1 text-xs font-mono text-muted-foreground">
                      {vendorIdLabel(viewOrder.vendor) || "—"}
                    </div>
                  </div>

                  <div className="rounded-lg border p-3">
                    <div className="text-xs text-muted-foreground">Segment</div>
                    <div className="mt-1 font-medium">
                      {vendorSegmentLabel(inferVendorSegment(viewOrder.vendor))}
                    </div>
                  </div>

                  <div className="rounded-lg border p-3">
                    <div className="text-xs text-muted-foreground">Vendor Status</div>
                    <div className="mt-1 font-medium capitalize">
                      {viewOrder.vendor?.status || "—"}
                    </div>
                  </div>

                  <div className="rounded-lg border p-3">
                    <div className="text-xs text-muted-foreground">Total</div>
                    <div className="mt-1 font-semibold">
                      {formatCurrency(selectedTotal)}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div className="rounded-lg border p-4">
                    <div className="text-sm font-semibold">Vendor Details</div>

                    <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="text-muted-foreground">Company: </span>
                        {viewOrder.vendor?.companyName || "—"}
                      </div>
                      <div>
                        <span className="text-muted-foreground">Legal Name: </span>
                        {viewOrder.vendor?.legalName || "—"}
                      </div>
                      <div>
                        <span className="text-muted-foreground">Email: </span>
                        {viewOrder.vendor?.email || "—"}
                      </div>
                      <div>
                        <span className="text-muted-foreground">Mobile: </span>
                        {viewOrder.vendor?.mobile || "—"}
                      </div>
                      <div>
                        <span className="text-muted-foreground">Telephone: </span>
                        {viewOrder.vendor?.telephone || "—"}
                      </div>
                      <div>
                        <span className="text-muted-foreground">Company Type: </span>
                        {viewOrder.vendor?.companyType || "—"}
                      </div>
                      <div>
                        <span className="text-muted-foreground">Country: </span>
                        {viewOrder.vendor?.country || "—"}
                      </div>
                      <div>
                        <span className="text-muted-foreground">City: </span>
                        {viewOrder.vendor?.city || "—"}
                      </div>
                      <div>
                        <span className="text-muted-foreground">Business Nature: </span>
                        {viewOrder.vendor?.businessNature || "—"}
                      </div>
                      <div>
                        <span className="text-muted-foreground">Established: </span>
                        {viewOrder.vendor?.estYear || "—"}
                      </div>
                      <div>
                        <span className="text-muted-foreground">Relation: </span>
                        {viewOrder.vendor?.relation || "—"}
                      </div>
                      <div>
                        <span className="text-muted-foreground">Employees: </span>
                        {viewOrder.vendor?.employees || "—"}
                      </div>
                      <div>
                        <span className="text-muted-foreground">PAN: </span>
                        {viewOrder.vendor?.pan || "—"}
                      </div>
                      <div>
                        <span className="text-muted-foreground">GST: </span>
                        {viewOrder.vendor?.gst || "—"}
                      </div>
                      <div className="sm:col-span-2">
                        <span className="text-muted-foreground">Export Countries: </span>
                        {viewOrder.vendor?.exportCountries || "—"}
                      </div>
                      <div className="sm:col-span-2">
                        <span className="text-muted-foreground">Items: </span>
                        {viewOrder.vendor?.items || "—"}
                      </div>
                      <div className="sm:col-span-2">
                        <span className="text-muted-foreground">Description: </span>
                        {viewOrder.vendor?.description || "—"}
                      </div>
                      <div className="sm:col-span-2">
                        <span className="text-muted-foreground">Legal Disputes: </span>
                        {viewOrder.vendor?.legalDisputes || "—"}
                      </div>

                      {viewOrder.vendor?.documentUrl ? (
                        <div className="sm:col-span-2">
                          <a
                            href={viewOrder.vendor.documentUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="text-primary underline"
                          >
                            View Vendor Document
                          </a>
                        </div>
                      ) : null}
                    </div>
                  </div>

                  <div className="rounded-lg border p-4">
                    <div className="text-sm font-semibold">Shipping Address</div>

                    <div className="mt-3 text-sm space-y-1">
                      <div>
                        <span className="text-muted-foreground">Name: </span>
                        {viewOrder.shippingAddress?.fullName || "—"}
                      </div>
                      <div>
                        <span className="text-muted-foreground">Phone: </span>
                        {viewOrder.shippingAddress?.phone || "—"}
                      </div>
                      <div>
                        <span className="text-muted-foreground">Address 1: </span>
                        {viewOrder.shippingAddress?.addressLine1 || "—"}
                      </div>
                      <div>
                        <span className="text-muted-foreground">Address 2: </span>
                        {viewOrder.shippingAddress?.addressLine2 || "—"}
                      </div>
                      <div>
                        <span className="text-muted-foreground">City: </span>
                        {viewOrder.shippingAddress?.city || "—"}
                      </div>
                      <div>
                        <span className="text-muted-foreground">State: </span>
                        {viewOrder.shippingAddress?.state || "—"}
                      </div>
                      <div>
                        <span className="text-muted-foreground">Pincode: </span>
                        {viewOrder.shippingAddress?.pincode || "—"}
                      </div>
                    </div>

                    <div className="mt-5 border-t pt-4 text-sm space-y-1">
                      <div className="font-semibold">Pricing</div>
                      <div>
                        <span className="text-muted-foreground">Subtotal: </span>
                        {formatCurrency(viewOrder.pricing?.subtotal)}
                      </div>
                      <div>
                        <span className="text-muted-foreground">GST: </span>
                        {formatCurrency(viewOrder.pricing?.gstAmount)}
                      </div>
                      <div>
                        <span className="text-muted-foreground">GST Rate: </span>
                        {Number(viewOrder.pricing?.gstRate || 0) * 100}%
                      </div>
                      <div className="font-semibold">
                        <span className="text-muted-foreground font-normal">Total: </span>
                        {formatCurrency(viewOrder.pricing?.total)}
                      </div>
                    </div>

                    {viewOrder.note ? (
                      <div className="mt-5 border-t pt-4 text-sm">
                        <div className="font-semibold">Vendor Note</div>
                        <div className="mt-2 text-muted-foreground whitespace-pre-wrap">
                          {viewOrder.note}
                        </div>
                      </div>
                    ) : null}
                  </div>
                </div>

                <div className="rounded-lg border p-4">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-semibold">Items</div>
                    <div className="text-xs text-muted-foreground">
                      {viewOrder.items?.length || 0} item(s)
                    </div>
                  </div>

                  <div className="mt-3 space-y-3">
                    {viewOrder.items?.map((it, idx) => {
                      const name = it.name || "Item";
                      const qty = Number(it.quantity || 0);
                      const unitPrice = Number(it.unitPrice || 0);
                      const lineTotal = Number(it.lineTotal ?? unitPrice * qty);

                      return (
                        <div
                          key={`${it.productId}-${idx}`}
                          className="flex flex-col sm:flex-row gap-3 border rounded-lg p-3"
                        >
                          <div className="h-20 w-20 shrink-0 overflow-hidden rounded-md border bg-muted">
                            {it.image ? (
                              <img
                                src={it.image}
                                alt={name}
                                className="h-full w-full object-cover"
                              />
                            ) : null}
                          </div>

                          <div className="flex-1">
                            <div className="font-medium">{name}</div>

                            <div className="mt-2 flex flex-wrap gap-4 text-sm">
                              <div>
                                <span className="text-muted-foreground">Qty: </span>
                                {qty}
                              </div>
                              <div>
                                <span className="text-muted-foreground">Unit Price: </span>
                                {formatCurrency(unitPrice)}
                              </div>
                              <div className="font-semibold">
                                <span className="text-muted-foreground font-normal">Line: </span>
                                {formatCurrency(lineTotal)}
                              </div>
                            </div>

                            <div className="mt-2 flex flex-wrap gap-3 text-xs text-muted-foreground">
                              <div>
                                Product ID: <span className="font-mono">{it.productId}</span>
                              </div>
                              <div>SKU: {it.sku || "—"}</div>
                              <div>Tier: {it.tier || "—"}</div>
                              <div>Category: {it.category || "—"}</div>
                              <div>Subcategory: {it.subcategory || "—"}</div>
                              <div>Material: {it.material || "—"}</div>
                              <div>Color: {it.color || "—"}</div>
                              <div>Size: {it.size || "—"}</div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row justify-end gap-2 pb-2 pt-1">
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

                  {nextActionButtons(viewOrder.status).includes("processing") ? (
                    <Button
                      variant="outline"
                      disabled={actionId === viewOrder._id}
                      onClick={() => updateStatus(viewOrder, "processing")}
                    >
                      <Package className="h-4 w-4 mr-2" />
                      Mark Processing
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
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}