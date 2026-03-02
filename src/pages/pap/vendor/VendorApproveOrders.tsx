// src/pages/pap/vendor/VendorApproveOrders.tsx
import { useEffect, useMemo, useState } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { DataTable } from "@/components/ui/data-table";
import { StatusBadge } from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";
import { Check, X, Eye } from "lucide-react";
import { toast } from "@/hooks/use-toast";

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

/** ✅ Vendor-specific shape */
type VendorDetails = {
  vendorId: string; // vendor _id
  vendorName: string;
  vendorSegment: Exclude<Segment, "all">;
  payoutStatus?: "pending" | "paid" | "hold";
};

type OrderItem = {
  productId: string;
  name?: string;
  image?: string;
  quantity: number;
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

  website?: string;
  websiteLabel?: "Affordable" | "Mid Range" | "Luxury";

  vendor: VendorDetails;

  items: OrderItem[];

  totals?: { total?: number };
  pricing?: { total?: number };

  payment?: {
    method?: string;
    status?: string;
    transactionId?: string;
  };

  status: string;
  createdAt?: string;
  updatedAt?: string;

  adminDecision?: {
    action?: "approved" | "rejected";
    reason?: string;
    by?: string;
    at?: string;
  };
};

function formatCurrency(amount?: number) {
  const n = Number(amount ?? 0);
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(n);
}

function formatDate(iso?: string) {
  if (!iso) return "-";
  return new Date(iso).toLocaleString("en-IN");
}

function orderTotal(o: Order) {
  return o.totals?.total ?? o.pricing?.total ?? 0;
}

function orderItemsText(o: Order) {
  return (o.items || [])
    .slice(0, 3)
    .map((it) => `${it.name || it.productSnapshot?.name || "Item"} × ${it.quantity}`)
    .join(", ")
    .concat(o.items?.length > 3 ? ` +${o.items.length - 3} more` : "");
}

function vendorSegmentLabel(seg: VendorDetails["vendorSegment"]) {
  if (seg === "affordable") return "Affordable";
  if (seg === "midrange") return "Mid Range";
  return "Luxury";
}

function payoutBadge(status?: VendorDetails["payoutStatus"]) {
  if (!status) return "-";
  if (status === "paid") return "Paid";
  if (status === "hold") return "On Hold";
  return "Pending";
}

/** ✅ change token key if needed */
function getAdminToken() {
  // ✅ your app uses Admintoken
  return localStorage.getItem("Admintoken") || localStorage.getItem("auth_token") || localStorage.getItem("token") || "";
}

/** ✅ change base URL if needed */
const API_BASE =
  (import.meta as any).env?.VITE_BASE_URL?.replace(/\/$/, "") || "https://api.jsgallor.com";

export function VendorApproveOrders() {
  const [segment, setSegment] = useState<Segment>("all");

  // ✅ FORCE ONLY PLACED ORDERS (no other statuses on this page)
  const STATUS = "placed";

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionId, setActionId] = useState<string | null>(null);

  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<Order | null>(null);

  // ✅ local sort by createdAt desc
  const filteredOrders = useMemo(() => {
    const list = [...orders];
    list.sort((a, b) => {
      const da = new Date(a.createdAt || 0).getTime();
      const db = new Date(b.createdAt || 0).getTime();
      return db - da;
    });
    return list;
  }, [orders]);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const token = getAdminToken();

      const qs = new URLSearchParams();
      qs.set("segment", segment);
      qs.set("status", STATUS); // ✅ ALWAYS placed

      const res = await fetch(`${API_BASE}/api/admin/vendor-orders`, {
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      if (!res.ok) {
        const msg = await res.text();
        throw new Error(msg || `Failed to load (${res.status})`);
      }

      const data = await res.json();

      // ✅ HARD FILTER (even if backend ignores status)
      const onlyPlaced = (data.orders || []).filter((o: Order) => o.status === "placed");
      setOrders(onlyPlaced);
    } catch (err: any) {
      toast({
        title: "Failed to load orders",
        description: err?.message || "Server error",
        variant: "destructive",
      });
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  // ✅ fetch on first load + whenever segment changes
  useEffect(() => {
    fetchOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [segment]);

  const handleApprove = async (order: Order) => {
    setActionId(order._id);
    try {
      const token = getAdminToken();

      const res = await fetch(`${API_BASE}/api/admin/vendor-orders/${order._id}/approve`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      if (!res.ok) {
        const msg = await res.text();
        throw new Error(msg || "Approve failed");
      }

      const updatedAt = new Date().toISOString();

      // ✅ remove from list (because this page only shows "placed")
      setOrders((prev) => prev.filter((o) => o._id !== order._id));

      // ✅ update selected + close dialog (optional)
      setSelected((prev) =>
        prev?._id === order._id ? { ...prev, status: "approved", updatedAt } : prev
      );
      setOpen(false);

      toast({ title: "Order Approved", description: "Vendor order approved successfully." });
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

  const handleReject = async (order: Order) => {
    setActionId(order._id);
    try {
      const reason = window.prompt("Reason (optional):") || "";
      const token = getAdminToken();

      const res = await fetch(`${API_BASE}/api/admin/vendor-orders/${order._id}/reject`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ reason }),
      });

      if (!res.ok) {
        const msg = await res.text();
        throw new Error(msg || "Reject failed");
      }

      const updatedAt = new Date().toISOString();

      // ✅ remove from list (because this page only shows "placed")
      setOrders((prev) => prev.filter((o) => o._id !== order._id));

      setSelected((prev) =>
        prev?._id === order._id ? { ...prev, status: "rejected", updatedAt } : prev
      );
      setOpen(false);

      toast({
        title: "Order Rejected",
        description: reason ? `Reason: ${reason}` : "Vendor order rejected.",
        variant: "destructive",
      });
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

  const openView = (order: Order) => {
    setSelected(order);
    setOpen(true);
  };

  const columns = [
    {
      key: "vendor",
      header: "Vendor",
      render: (o: Order) => (
        <div className="leading-tight">
          <div className="font-medium">{o.vendor.vendorName}</div>
          <div className="text-xs text-muted-foreground font-mono">
            {String(o.vendor.vendorId || "").slice(-8).toUpperCase()}
          </div>
        </div>
      ),
    },
    {
      key: "segment",
      header: "Segment",
      render: (o: Order) => (
        <span className="text-xs px-2 py-1 rounded-md border">
          {vendorSegmentLabel(o.vendor.vendorSegment)}
        </span>
      ),
    },
    {
      key: "_id",
      header: "Order ID",
      render: (o: Order) => <span className="font-mono">{o._id.slice(-8).toUpperCase()}</span>,
    },
    { key: "items", header: "Items", render: (o: Order) => orderItemsText(o) || "-" },
    {
      key: "total",
      header: "Total",
      render: (o: Order) => (
        <span className="font-semibold">{formatCurrency(orderTotal(o))}</span>
      ),
    },
    {
      key: "payment",
      header: "Payment",
      render: (o: Order) => (
        <span className="uppercase">
          {o.payment?.method || "-"} / {o.payment?.status || "-"}
        </span>
      ),
    },
    {
      key: "payout",
      header: "Payout",
      render: (o: Order) => <span className="text-sm">{payoutBadge(o.vendor.payoutStatus)}</span>,
    },
    {
      key: "status",
      header: "Status",
      render: (o: Order) => <StatusBadge status={o.status} />,
    },
    {
      key: "createdAt",
      header: "Created",
      render: (o: Order) => formatDate(o.createdAt),
    },
  ];

  const actions = (order: Order) => (
    <div className="flex gap-1">
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        onClick={() => openView(order)}
        title="View"
      >
        <Eye className="h-4 w-4" />
      </Button>

      {/* ✅ Only placed orders exist here, keep buttons always visible */}
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 text-success"
        disabled={actionId === order._id}
        onClick={() => handleApprove(order)}
        title="Approve"
      >
        <Check className="h-4 w-4" />
      </Button>

      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 text-destructive"
        disabled={actionId === order._id}
        onClick={() => handleReject(order)}
        title="Reject"
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  );

  const selectedItemsTotal =
    selected?.items?.reduce((sum, it) => {
      const price = Number(it.finalPrice ?? it.productSnapshot?.price ?? it.price ?? 0);
      return sum + price * Number(it.quantity ?? 0);
    }, 0) ?? 0;

  const selectedTotal =
    selected?.totals?.total ?? selected?.pricing?.total ?? selectedItemsTotal;

  return (
    <AdminLayout
      panelType="pap-vendor"
      title="Vendor Orders (Placed)"
      subtitle="Only vendor orders with status: Placed."
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between pb-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="text-sm text-muted-foreground">Vendor Segment:</div>

          <Select value={segment} onValueChange={(v) => setSegment(v as Segment)}>
            <SelectTrigger className="w-[220px]">
              <SelectValue placeholder="Select segment" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="affordable">Affordable</SelectItem>
              <SelectItem value="midrange">Mid Range</SelectItem>
              <SelectItem value="luxury">Luxury</SelectItem>
            </SelectContent>
          </Select>

          <div className="text-sm text-muted-foreground">
            Status: <span className="font-semibold text-foreground">Placed</span>
          </div>
        </div>

        <Button variant="outline" onClick={fetchOrders} disabled={loading}>
          {loading ? "Loading..." : "Refresh"}
        </Button>
      </div>

      <DataTable data={filteredOrders} columns={columns} searchKey="_id" actions={actions} />

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>
              Vendor Order Details{" "}
              {selected ? (
                <span className="font-mono text-sm ml-2">
                  {selected._id.slice(-8).toUpperCase()}
                </span>
              ) : null}
            </DialogTitle>
          </DialogHeader>

          {!selected ? (
            <div className="text-sm text-muted-foreground">No order selected.</div>
          ) : (
            <div className="space-y-5">
              {/* Top Summary */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <div className="rounded-lg border p-3">
                  <div className="text-xs text-muted-foreground">Vendor</div>
                  <div className="mt-1 font-medium">{selected.vendor.vendorName}</div>
                  <div className="mt-1 text-xs font-mono text-muted-foreground">
                    {String(selected.vendor.vendorId || "").slice(-8).toUpperCase()}
                  </div>
                </div>

                <div className="rounded-lg border p-3">
                  <div className="text-xs text-muted-foreground">Segment</div>
                  <div className="mt-1 font-medium">
                    {vendorSegmentLabel(selected.vendor.vendorSegment)}
                  </div>
                </div>

                <div className="rounded-lg border p-3">
                  <div className="text-xs text-muted-foreground">Status</div>
                  <div className="mt-1">
                    <StatusBadge status={selected.status} />
                  </div>
                </div>

                <div className="rounded-lg border p-3">
                  <div className="text-xs text-muted-foreground">Total</div>
                  <div className="mt-1 font-semibold">{formatCurrency(selectedTotal)}</div>
                </div>
              </div>

              {/* Payment + Payout */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="rounded-lg border p-3">
                  <div className="text-sm font-semibold">Payment</div>
                  <div className="mt-2 text-sm space-y-1">
                    <div>
                      <span className="text-muted-foreground">Method: </span>
                      {selected.payment?.method || "-"}
                    </div>
                    <div>
                      <span className="text-muted-foreground">Status: </span>
                      {selected.payment?.status || "-"}
                    </div>
                    <div>
                      <span className="text-muted-foreground">Txn: </span>
                      <span className="font-mono text-xs">
                        {selected.payment?.transactionId || "-"}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="rounded-lg border p-3">
                  <div className="text-sm font-semibold">Vendor Payout</div>
                  <div className="mt-2 text-sm space-y-1">
                    <div>
                      <span className="text-muted-foreground">Payout Status: </span>
                      {payoutBadge(selected.vendor.payoutStatus)}
                    </div>
                  </div>
                </div>
              </div>

              {/* Items */}
              <div className="rounded-lg border p-3">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-semibold">Items</div>
                  <div className="text-xs text-muted-foreground">
                    Items total (calc): {formatCurrency(selectedItemsTotal)}
                  </div>
                </div>

                <div className="mt-3 space-y-3">
                  {selected.items?.map((it, idx) => {
                    const name = it.name || it.productSnapshot?.name || "Item";
                    const qty = Number(it.quantity ?? 0);
                    const mrp = Number(it.price ?? it.productSnapshot?.price ?? 0);
                    const final = Number(it.finalPrice ?? mrp);
                    const lineTotal = final * qty;

                    return (
                      <div key={`${it.productId}-${idx}`} className="flex gap-3 border rounded-lg p-3">
                        <div className="h-16 w-16 shrink-0 overflow-hidden rounded-md border bg-muted">
                          {it.image || it.productSnapshot?.image ? (
                            <img
                              src={it.image || it.productSnapshot?.image}
                              alt={name}
                              className="h-full w-full object-cover"
                            />
                          ) : null}
                        </div>

                        <div className="flex-1">
                          <div className="font-medium">{name}</div>

                          <div className="mt-2 flex flex-wrap gap-3 text-sm">
                            <div>
                              <span className="text-muted-foreground">Qty: </span>
                              {qty}
                            </div>

                            <div>
                              <span className="text-muted-foreground">Final Price: </span>
                              {formatCurrency(final)}
                            </div>

                            {it.discountPercent ? (
                              <div className="text-xs text-muted-foreground">
                                Discount: {it.discountPercent}% ({formatCurrency(it.discountAmount)})
                              </div>
                            ) : null}

                            <div className="font-semibold">
                              <span className="text-muted-foreground font-normal">Line total: </span>
                              {formatCurrency(lineTotal)}
                            </div>
                          </div>

                          <div className="mt-2 text-xs text-muted-foreground">
                            Product ID: <span className="font-mono">{it.productId}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Footer actions */}
              <div className="flex justify-end gap-2 pt-2">
                <Button
                  variant="outline"
                  onClick={() => setOpen(false)}
                  disabled={!!selected && actionId === selected._id}
                >
                  Close
                </Button>

                {/* still allow actions inside dialog */}
                {selected.status === "placed" ? (
                  <>
                    <Button
                      className="text-success"
                      variant="outline"
                      disabled={actionId === selected._id}
                      onClick={() => handleApprove(selected)}
                    >
                      <Check className="h-4 w-4 mr-2" />
                      Approve
                    </Button>

                    <Button
                      variant="destructive"
                      disabled={actionId === selected._id}
                      onClick={() => handleReject(selected)}
                    >
                      <X className="h-4 w-4 mr-2" />
                      Reject
                    </Button>
                  </>
                ) : null}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}

export default VendorApproveOrders;
