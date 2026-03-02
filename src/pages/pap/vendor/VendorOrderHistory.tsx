// src/pages/pap/vendor/VendorOrderHistory.tsx
import { useEffect, useMemo, useState } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { DataTable } from "@/components/ui/data-table";
import { StatusBadge } from "@/components/ui/status-badge";
import { Eye, Loader2, Package, Check, X, Truck, ShieldCheck, Ban } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

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
  | "returned"
  | "rejected";

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
  status: string; // can be "Placed" etc
  createdAt?: string;
  updatedAt?: string;
};

const API_BASE =
  (import.meta as any).env?.VITE_BASE_URL?.replace(/\/$/, "") || "https://api.jsgallor.com";
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
  iso
    ? new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "2-digit" })
    : "—";

const getOrderNumber = (order: Order) => `#${order._id.slice(-6).toUpperCase()}`;

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

const paymentLabel = (o: Order) => {
  const method = (o.payment?.method || "").toString().trim();
  const status = (o.payment?.status || "").toString().trim();
  if (!method && !status) return "—";
  return `${method || "—"}${status ? ` / ${status}` : ""}`.toUpperCase();
};

const orderItemsText = (o: Order) =>
  (o.items || [])
    .slice(0, 3)
    .map((i) => `${i.name || i.productSnapshot?.name || "Item"} × ${i.quantity}`)
    .join(", ")
    .concat(o.items?.length > 3 ? ` +${o.items.length - 3} more` : "") || "—";

const getOrderTotal = (o: Order) =>
  Number(o.totals?.total ?? o.pricing?.total ?? 0);

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
  return ns === "delivered" || ns === "cancelled" || ns === "rejected" || ns === "returned";
};

const nextActionButtons = (s?: string) => {
  switch (normStatus(s)) {
    case "placed":
      return ["approve", "reject", "cancel"] as const;
    case "approved":
      return ["confirm", "cancel"] as const;
    case "confirmed":
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
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  const fetchOrders = async () => {
    try {
      setLoading(true);

      const qs = new URLSearchParams();
      if (segment !== "all") qs.set("segment", segment); // backend can filter
      if (statusFilter !== "all") {
        // backend might expect "Placed" etc; but we’ll also filter client-side
        qs.set("status", statusFilter);
      }

      const url = `${VENDOR_ORDERS_API}?${qs.toString()}`;

      const res = await fetch(url, { headers: authHeaders() });
      const data = await safeJson(res);
      if (!res.ok) throw new Error(data?.message || "Failed to fetch vendor orders");

      const list: Order[] = data?.orders || data?.data || data || [];

      // ✅ HARD FILTER client-side (handles "Placed" vs "placed")
      const filtered = list.filter((o) => {
        const okSeg =
          segment === "all" ? true : normSeg(o.vendor?.vendorSegment) === segment;
        const okStatus =
          statusFilter === "all" ? true : normStatus(o.status) === statusFilter;
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
        description: err.message || "Failed to load vendor orders",
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

  /** ✅ Approve endpoint */
  const approveOrder = async (order: Order) => {
    setActionId(order._id);
    try {
      const token = getAdminToken();

      const res = await fetch(`${VENDOR_ORDERS_API}/${order._id}/approve`, {
        method: "PATCH",
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      const data = await safeJson(res);
      if (!res.ok) throw new Error(data?.message || "Approve failed");

      toast({ title: "Approved", description: data?.message || "Order approved" });

      // remove from list if filter is "placed"
      const updated: Order = (data?.order || data) as Order;
      setOrders((prev) =>
        prev
          .map((o) => (o._id === order._id ? { ...o, ...updated } : o))
          .filter((o) => (statusFilter === "placed" ? normStatus(o.status) === "placed" : true))
      );
      setViewOrder((prev) => (prev?._id === order._id ? { ...prev, ...updated } : prev));
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

  /** ✅ Reject endpoint */
  const rejectOrder = async (order: Order) => {
    setActionId(order._id);
    try {
      const reason = window.prompt("Reason (optional):") || "";
      const token = getAdminToken();

      const res = await fetch(`${VENDOR_ORDERS_API}/${order._id}/reject`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
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
        prev
          .map((o) => (o._id === order._id ? { ...o, ...updated } : o))
          .filter((o) => (statusFilter === "placed" ? normStatus(o.status) === "placed" : true))
      );
      setViewOrder((prev) => (prev?._id === order._id ? { ...prev, ...updated } : prev));
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

  /** ✅ Optional: cancel via status endpoint (only if your backend supports it)
   * If you don’t have this endpoint, remove this button or tell me your cancel API.
   */
  const updateStatus = async (order: Order, status: string) => {
    setActionId(order._id);
    try {
      const token = getAdminToken();

      const res = await fetch(`${VENDOR_ORDERS_API}/${order._id}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ status }),
      });

      const data = await safeJson(res);
      if (!res.ok) throw new Error(data?.message || "Failed to update status");

      toast({ title: "Updated", description: data?.message || "Order updated" });

      const updated: Order = (data?.order || data) as Order;
      setOrders((prev) =>
        prev.map((o) => (o._id === order._id ? { ...o, ...updated } : o))
      );
      setViewOrder((prev) => (prev?._id === order._id ? { ...prev, ...updated } : prev));
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
            <p className="font-medium">{o.vendor?.vendorName || "—"}</p>
            <p className="text-xs text-muted-foreground font-mono">
              {String(o.vendor?.vendorId || "").slice(-8).toUpperCase()}
            </p>
          </div>
        ),
      },
      {
        key: "segment",
        header: "Segment",
        render: (o: Order) => (
          <span className="text-xs px-2 py-1 rounded-md border">
            {vendorSegmentLabel(o.vendor?.vendorSegment)}
          </span>
        ),
      },
      {
        key: "payout",
        header: "Payout",
        render: (o: Order) => (
          <span className="text-xs px-2 py-1 rounded-md border">
            {payoutBadge(o.vendor?.payoutStatus)}
          </span>
        ),
      },
      {
        key: "_id",
        header: "Order ID",
        render: (o: Order) => <span className="font-mono font-medium">{getOrderNumber(o)}</span>,
      },
      {
        key: "items",
        header: "Items",
        render: (o: Order) => <span className="text-sm">{orderItemsText(o)}</span>,
      },
      {
        key: "total",
        header: "Amount",
        render: (o: Order) => <span className="font-medium">{formatCurrency(getOrderTotal(o))}</span>,
      },
      {
        key: "payment",
        header: "Payment",
        render: (o: Order) => (
          <Badge variant="secondary" className="text-xs">
            {paymentLabel(o)}
          </Badge>
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

  return (
    <AdminLayout
      panelType="pap-vendor"
      title="Vendor Order History"
      subtitle="View and manage vendor orders only"
    >
      {/* Filters + Refresh */}
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
                <SelectItem value="placed">Placed</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="confirmed">Confirmed</SelectItem>
                <SelectItem value="processing">Processing</SelectItem>
                <SelectItem value="shipped">Shipped</SelectItem>
                <SelectItem value="delivered">Delivered</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
                <SelectItem value="returned">Returned</SelectItem>
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

      {/* Table */}
      <DataTable
        data={tableData}
        columns={columns}
        searchKey="_id"
        searchPlaceholder="Search vendor orders..."
        actions={actions}
      />

      {/* View Modal */}
      <Dialog open={!!viewOrder} onOpenChange={() => setViewOrder(null)}>
        <DialogContent
          className="
            w-[95vw] sm:w-[90vw] lg:w-[900px]
            max-w-[95vw]
            h-[85vh] sm:h-[80vh]
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
                <div className="flex items-center gap-2">
                  <span className="text-xs px-2 py-1 rounded-md border">
                    {vendorSegmentLabel(viewOrder.vendor?.vendorSegment)}
                  </span>
                  <Badge variant="secondary" className="text-xs">
                    {paymentLabel(viewOrder)}
                  </Badge>
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
                {/* Summary */}
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <div className="rounded-lg border p-3">
                    <div className="text-xs text-muted-foreground">Vendor</div>
                    <div className="mt-1 font-medium">{viewOrder.vendor?.vendorName || "—"}</div>
                    <div className="mt-1 text-xs font-mono text-muted-foreground">
                      {String(viewOrder.vendor?.vendorId || "").slice(-8).toUpperCase()}
                    </div>
                  </div>

                  <div className="rounded-lg border p-3">
                    <div className="text-xs text-muted-foreground">Segment</div>
                    <div className="mt-1 font-medium">
                      {vendorSegmentLabel(viewOrder.vendor?.vendorSegment)}
                    </div>
                  </div>

                  <div className="rounded-lg border p-3">
                    <div className="text-xs text-muted-foreground">Payout</div>
                    <div className="mt-1 font-medium">
                      {payoutBadge(viewOrder.vendor?.payoutStatus)}
                    </div>
                  </div>

                  <div className="rounded-lg border p-3">
                    <div className="text-xs text-muted-foreground">Total</div>
                    <div className="mt-1 font-semibold">
                      {formatCurrency(getOrderTotal(viewOrder))}
                    </div>
                  </div>
                </div>

                {/* Items */}
                <div className="rounded-lg border p-4">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-semibold">Items</div>
                    <div className="text-xs text-muted-foreground">
                      {viewOrder.items?.length || 0} item(s)
                    </div>
                  </div>

                  <div className="mt-3 space-y-3">
                    {viewOrder.items?.map((it, idx) => {
                      const name = it.name || it.productSnapshot?.name || "Item";
                      const qty = Number(it.quantity || 0);
                      const price = Number(
                        it.finalPrice ?? it.price ?? it.productSnapshot?.price ?? 0
                      );
                      const image = it.image || it.productSnapshot?.image || "";

                      return (
                        <div
                          key={`${it.productId}-${idx}`}
                          className="flex flex-col sm:flex-row gap-3 border rounded-lg p-3"
                        >
                          <div className="h-20 w-20 shrink-0 overflow-hidden rounded-md border bg-muted">
                            {image ? (
                              <img src={image} alt={name} className="h-full w-full object-cover" />
                            ) : null}
                          </div>

                          <div className="flex-1">
                            <div className="font-medium">{name}</div>

                            {it.productSnapshot ? (
                              <div className="text-xs text-muted-foreground">
                                Category: {it.productSnapshot?.category || "—"}
                                {it.productSnapshot?.colors?.length
                                  ? ` • Colors: ${it.productSnapshot.colors.join(", ")}`
                                  : ""}
                                {it.productSnapshot?.inStock === false ? " • Out of stock" : ""}
                              </div>
                            ) : null}

                            {typeof it.discountPercent === "number" ? (
                              <div className="text-xs text-muted-foreground mt-1">
                                Discount: {it.discountPercent}% (
                                {formatCurrency(it.discountAmount || 0)})
                              </div>
                            ) : null}

                            <div className="mt-2 flex flex-wrap gap-4 text-sm">
                              <div>
                                <span className="text-muted-foreground">Qty: </span>
                                {qty}
                              </div>
                              <div>
                                <span className="text-muted-foreground">Price: </span>
                                {formatCurrency(price)}
                              </div>
                              <div className="font-semibold">
                                <span className="text-muted-foreground font-normal">Line: </span>
                                {formatCurrency(price * qty)}
                              </div>
                            </div>

                            <div className="mt-2 text-xs text-muted-foreground font-mono">
                              productId: {it.productId}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Footer buttons */}
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
