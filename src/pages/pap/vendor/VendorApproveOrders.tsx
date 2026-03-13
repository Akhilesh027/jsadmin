// src/pages/pap/vendor/VendorApproveOrders.tsx
import { useEffect, useMemo, useState, useCallback } from "react";
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

function safeStatus(status?: string) {
  return String(status || "").trim().toLowerCase();
}

function isPlacedStatus(status?: string) {
  const s = safeStatus(status);
  return s === "placed";
}

function orderTotal(o: Order) {
  return Number(o.pricing?.total ?? 0);
}

function orderItemsText(o: Order) {
  const text = (o.items || [])
    .slice(0, 3)
    .map((it) => `${it.name || "Item"} × ${it.quantity}`)
    .join(", ");

  return text + ((o.items?.length || 0) > 3 ? ` +${o.items.length - 3} more` : "");
}

function inferVendorSegment(vendor?: VendorDetails | null): Exclude<Segment, "all"> {
  const raw = String(vendor?.vendorSegment || "").toLowerCase();

  if (raw === "affordable" || raw === "midrange" || raw === "luxury") {
    return raw;
  }

  return "affordable";
}

function vendorSegmentLabel(seg: Exclude<Segment, "all">) {
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

function getAdminToken() {
  return (
    localStorage.getItem("Admintoken") ||
    localStorage.getItem("auth_token") ||
    localStorage.getItem("token") ||
    ""
  );
}

const API_BASE =
  (import.meta as any).env?.VITE_BASE_URL?.replace(/\/$/, "") || "https://api.jsgallor.com";

export function VendorApproveOrders() {
  const [segment, setSegment] = useState<Segment>("all");
  const STATUS = "placed";

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionId, setActionId] = useState<string | null>(null);

  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<Order | null>(null);

  const filteredOrders = useMemo(() => {
    const list = [...orders];
    list.sort((a, b) => {
      const da = new Date(a.createdAt || 0).getTime();
      const db = new Date(b.createdAt || 0).getTime();
      return db - da;
    });
    return list;
  }, [orders]);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const token = getAdminToken();

      const qs = new URLSearchParams();
      qs.set("segment", segment);
      qs.set("status", STATUS);

      const res = await fetch(`${API_BASE}/api/admin/vendor-orders?${qs.toString()}`, {
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
      const incoming = Array.isArray(data?.orders) ? data.orders : [];
      const onlyPlaced = incoming.filter((o: Order) => isPlacedStatus(o.status));
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
  }, [segment]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

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

      setOrders((prev) => prev.filter((o) => o._id !== order._id));
      setSelected((prev) =>
        prev?._id === order._id
          ? { ...prev, status: "approved", updatedAt: new Date().toISOString() }
          : prev
      );
      setOpen(false);

      toast({
        title: "Order Approved",
        description: "Vendor order approved successfully.",
      });
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

      setOrders((prev) => prev.filter((o) => o._id !== order._id));
      setSelected((prev) =>
        prev?._id === order._id
          ? { ...prev, status: "rejected", updatedAt: new Date().toISOString() }
          : prev
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
      render: (o: Order) => {
        const vendorName =
          o.vendor?.companyName ||
          o.vendor?.legalName ||
          o.vendor?.vendorName ||
          "—";

        const vendorId =
          o.vendor?.vendorId ||
          o.vendor?._id ||
          "";

        return (
          <div className="leading-tight">
            <div className="font-medium">{vendorName}</div>
            <div className="text-xs text-muted-foreground font-mono">
              {String(vendorId).slice(-8).toUpperCase() || "-"}
            </div>
          </div>
        );
      },
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
      key: "orderNumber",
      header: "Order No",
      render: (o: Order) => (
        <span className="font-mono">{o.orderNumber || o._id.slice(-8).toUpperCase()}</span>
      ),
    },
    {
      key: "items",
      header: "Items",
      render: (o: Order) => orderItemsText(o) || "-",
    },
    {
      key: "total",
      header: "Total",
      render: (o: Order) => (
        <span className="font-semibold">{formatCurrency(orderTotal(o))}</span>
      ),
    },
    {
      key: "vendorStatus",
      header: "Vendor Status",
      render: (o: Order) => (
        <span className="text-sm capitalize">{o.vendor?.status || "-"}</span>
      ),
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
      return sum + Number(it.lineTotal ?? Number(it.unitPrice || 0) * Number(it.quantity || 0));
    }, 0) ?? 0;

  const selectedTotal = Number(selected?.pricing?.total ?? selectedItemsTotal);

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

      <DataTable data={filteredOrders} columns={columns} searchKey="orderNumber" actions={actions} />

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Vendor Order Details{" "}
              {selected ? (
                <span className="font-mono text-sm ml-2">
                  {selected.orderNumber || selected._id.slice(-8).toUpperCase()}
                </span>
              ) : null}
            </DialogTitle>
          </DialogHeader>

          {!selected ? (
            <div className="text-sm text-muted-foreground">No order selected.</div>
          ) : (
            <div className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <div className="rounded-lg border p-3">
                  <div className="text-xs text-muted-foreground">Vendor</div>
                  <div className="mt-1 font-medium">
                    {selected.vendor?.companyName ||
                      selected.vendor?.legalName ||
                      selected.vendor?.vendorName ||
                      "—"}
                  </div>
                  <div className="mt-1 text-xs font-mono text-muted-foreground">
                    {String(selected.vendor?.vendorId || selected.vendor?._id || "")
                      .slice(-8)
                      .toUpperCase() || "-"}
                  </div>
                </div>

                <div className="rounded-lg border p-3">
                  <div className="text-xs text-muted-foreground">Segment</div>
                  <div className="mt-1 font-medium">
                    {vendorSegmentLabel(inferVendorSegment(selected.vendor))}
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

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="rounded-lg border p-4">
                  <div className="text-sm font-semibold">Vendor Details</div>

                  <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-muted-foreground">Company: </span>
                      {selected.vendor?.companyName || "-"}
                    </div>
                    <div>
                      <span className="text-muted-foreground">Legal Name: </span>
                      {selected.vendor?.legalName || "-"}
                    </div>
                    <div>
                      <span className="text-muted-foreground">Email: </span>
                      {selected.vendor?.email || "-"}
                    </div>
                    <div>
                      <span className="text-muted-foreground">Mobile: </span>
                      {selected.vendor?.mobile || "-"}
                    </div>
                    <div>
                      <span className="text-muted-foreground">Telephone: </span>
                      {selected.vendor?.telephone || "-"}
                    </div>
                    <div>
                      <span className="text-muted-foreground">Company Type: </span>
                      {selected.vendor?.companyType || "-"}
                    </div>
                    <div>
                      <span className="text-muted-foreground">Country: </span>
                      {selected.vendor?.country || "-"}
                    </div>
                    <div>
                      <span className="text-muted-foreground">City: </span>
                      {selected.vendor?.city || "-"}
                    </div>
                    <div>
                      <span className="text-muted-foreground">Business Nature: </span>
                      {selected.vendor?.businessNature || "-"}
                    </div>
                    <div>
                      <span className="text-muted-foreground">Established: </span>
                      {selected.vendor?.estYear || "-"}
                    </div>
                    <div>
                      <span className="text-muted-foreground">Relation: </span>
                      {selected.vendor?.relation || "-"}
                    </div>
                    <div>
                      <span className="text-muted-foreground">Employees: </span>
                      {selected.vendor?.employees || "-"}
                    </div>
                    <div>
                      <span className="text-muted-foreground">PAN: </span>
                      {selected.vendor?.pan || "-"}
                    </div>
                    <div>
                      <span className="text-muted-foreground">GST: </span>
                      {selected.vendor?.gst || "-"}
                    </div>
                    <div className="sm:col-span-2">
                      <span className="text-muted-foreground">Export Countries: </span>
                      {selected.vendor?.exportCountries || "-"}
                    </div>
                    <div className="sm:col-span-2">
                      <span className="text-muted-foreground">Items: </span>
                      {selected.vendor?.items || "-"}
                    </div>
                    <div className="sm:col-span-2">
                      <span className="text-muted-foreground">Description: </span>
                      {selected.vendor?.description || "-"}
                    </div>
                    <div className="sm:col-span-2">
                      <span className="text-muted-foreground">Legal Disputes: </span>
                      {selected.vendor?.legalDisputes || "-"}
                    </div>

                    {selected.vendor?.documentUrl ? (
                      <div className="sm:col-span-2">
                        <a
                          href={selected.vendor.documentUrl}
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
                      {selected.shippingAddress?.fullName || "-"}
                    </div>
                    <div>
                      <span className="text-muted-foreground">Phone: </span>
                      {selected.shippingAddress?.phone || "-"}
                    </div>
                    <div>
                      <span className="text-muted-foreground">Address 1: </span>
                      {selected.shippingAddress?.addressLine1 || "-"}
                    </div>
                    <div>
                      <span className="text-muted-foreground">Address 2: </span>
                      {selected.shippingAddress?.addressLine2 || "-"}
                    </div>
                    <div>
                      <span className="text-muted-foreground">City: </span>
                      {selected.shippingAddress?.city || "-"}
                    </div>
                    <div>
                      <span className="text-muted-foreground">State: </span>
                      {selected.shippingAddress?.state || "-"}
                    </div>
                    <div>
                      <span className="text-muted-foreground">Pincode: </span>
                      {selected.shippingAddress?.pincode || "-"}
                    </div>
                  </div>

                  <div className="mt-5 border-t pt-4 text-sm space-y-1">
                    <div className="font-semibold">Pricing</div>
                    <div>
                      <span className="text-muted-foreground">Subtotal: </span>
                      {formatCurrency(selected.pricing?.subtotal)}
                    </div>
                    <div>
                      <span className="text-muted-foreground">GST: </span>
                      {formatCurrency(selected.pricing?.gstAmount)}
                    </div>
                    <div>
                      <span className="text-muted-foreground">GST Rate: </span>
                      {Number(selected.pricing?.gstRate || 0) * 100}%
                    </div>
                    <div className="font-semibold">
                      <span className="text-muted-foreground font-normal">Total: </span>
                      {formatCurrency(selected.pricing?.total)}
                    </div>
                  </div>

                  {selected.note ? (
                    <div className="mt-5 border-t pt-4 text-sm">
                      <div className="font-semibold">Vendor Note</div>
                      <div className="mt-2 text-muted-foreground whitespace-pre-wrap">
                        {selected.note}
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>

              <div className="rounded-lg border p-3">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-semibold">Items</div>
                  <div className="text-xs text-muted-foreground">
                    Items total (calc): {formatCurrency(selectedItemsTotal)}
                  </div>
                </div>

                <div className="mt-3 space-y-3">
                  {selected.items?.map((it, idx) => {
                    const name = it.name || "Item";
                    const qty = Number(it.quantity ?? 0);
                    const unitPrice = Number(it.unitPrice ?? 0);
                    const lineTotal = Number(it.lineTotal ?? unitPrice * qty);

                    return (
                      <div key={`${it.productId}-${idx}`} className="flex gap-3 border rounded-lg p-3">
                        <div className="h-16 w-16 shrink-0 overflow-hidden rounded-md border bg-muted">
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

                          <div className="mt-2 flex flex-wrap gap-3 text-sm">
                            <div>
                              <span className="text-muted-foreground">Qty: </span>
                              {qty}
                            </div>

                            <div>
                              <span className="text-muted-foreground">Unit Price: </span>
                              {formatCurrency(unitPrice)}
                            </div>

                            <div className="font-semibold">
                              <span className="text-muted-foreground font-normal">Line total: </span>
                              {formatCurrency(lineTotal)}
                            </div>
                          </div>

                          <div className="mt-2 flex flex-wrap gap-3 text-xs text-muted-foreground">
                            <div>
                              Product ID: <span className="font-mono">{it.productId}</span>
                            </div>
                            <div>SKU: {it.sku || "-"}</div>
                            <div>Tier: {it.tier || "-"}</div>
                            <div>Category: {it.category || "-"}</div>
                            <div>Subcategory: {it.subcategory || "-"}</div>
                            <div>Material: {it.material || "-"}</div>
                            <div>Color: {it.color || "-"}</div>
                            <div>Size: {it.size || "-"}</div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  variant="outline"
                  onClick={() => setOpen(false)}
                  disabled={!!selected && actionId === selected._id}
                >
                  Close
                </Button>

                {isPlacedStatus(selected.status) ? (
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