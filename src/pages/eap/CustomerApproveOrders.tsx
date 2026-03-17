// src/pages/admin/CustomerApproveOrders.tsx
import { useEffect, useMemo, useState } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { DataTable } from "@/components/ui/data-table";
import { StatusBadge } from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";
import { Check, X, Eye } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type Segment = "all" | "affordable" | "midrange" | "luxury";

const API_ROOT = "https://api.jsgallor.com/api/admin";

const SEGMENT_API = {
  affordable: `${API_ROOT}/affordable/orders`,
  midrange: `${API_ROOT}/midrange/orders`,
  luxury: `${API_ROOT}/luxury/orders`,
} as const;

const ALL_API = `${API_ROOT}/orders/all`;

type Order = {
  _id: string;
  userId?: string;
  customerId?: string;
  website?: "affordable" | "midrange" | "luxury" | string;
  websiteLabel?: "Affordable" | "Mid Range" | "Luxury";
  items: Array<{
    productId: string;
    variantId?: string | null;                // ✅ added
    attributes?: {                             // ✅ added
      size?: string | null;
      color?: string | null;
      fabric?: string | null;
    };
    name?: string;
    image?: string;
    quantity: number;
    price?: number;
    discountPercent?: number;
    discountAmount?: number;
    finalPrice?: number;
    _id?: string;
    productSnapshot?: {
      name?: string;
      price?: number;
      image?: string;
      category?: string;
      inStock?: boolean;
      colors?: string[];
    };
  }>;
  addressSnapshot?: {
    fullName?: string;
    phone?: string;
    line1?: string;
    line2?: string;
    landmark?: string;
    city?: string;
    state?: string;
    pincode?: string;
  };
  totals?: {
    subtotal?: number;
    shipping?: number;
    tax?: number;
    total?: number;
  };
  pricing?: {
    subtotal?: number;
    shipping?: number;
    shippingCost?: number;
    shippingDiscount?: number;
    discount?: number;
    total?: number;
    currency?: string;
    shippingBase?: number;
    coupon?: { code?: string };
  };
  payment?: {
    method?: string;
    status?: string;
    transactionId?: string;
    gateway?: string;
    razorpayOrderId?: string;
    razorpayPaymentId?: string;
    razorpaySignature?: string;
    meta?: {
      upiId?: string;
      bank?: string;
      cardLast4?: string;
      last4?: string;
    };
    upiId?: string;
    cardLast4?: string;
    last4?: string;
  };
  status: string;
  createdAt?: string;
  updatedAt?: string;
  userDetails?: {
    _id: string;
    name?: string;
    email?: string;
  };
  addressDetails?: {
    _id?: string;
    fullName?: string;
    phone?: string;
    email?: string;
    addressLine1?: string;
    addressLine2?: string;
    city?: string;
    state?: string;
    pincode?: string;
    landmark?: string;
    isDefault?: boolean;
  } | null;
  rejectReason?: string;
};

type OrdersResponse =
  | Order[]
  | {
      success?: boolean;
      data?: Order[];
      message?: string;
      pagination?: any;
    };

type OrderResponse = {
  success?: boolean;
  message?: string;
  order?: Order;
  data?: Order;
};

async function api<T>(url: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem("token");
  const res = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as any)?.message || "Request failed");
  return data as T;
}

function normalizeResponse(res: OrdersResponse): Order[] {
  return Array.isArray(res) ? res : res?.data || [];
}

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

function buildAddressLine(o: Order) {
  const snap = o.addressSnapshot;
  if (snap) {
    return [
      snap.line1,
      snap.line2,
      snap.landmark ? `Landmark: ${snap.landmark}` : null,
      `${snap.city || ""}${snap.city ? "," : ""} ${snap.state || ""}`.trim(),
      snap.pincode ? `PIN: ${snap.pincode}` : null,
    ]
      .filter(Boolean)
      .join(", ");
  }

  const a = o.addressDetails;
  if (!a) return "-";
  return [
    a.addressLine1,
    a.addressLine2,
    a.landmark ? `Landmark: ${a.landmark}` : null,
    `${a.city || ""}${a.city ? "," : ""} ${a.state || ""}`.trim(),
    a.pincode ? `PIN: ${a.pincode}` : null,
  ]
    .filter(Boolean)
    .join(", ");
}

function orderTotal(o: Order) {
  return o.totals?.total ?? o.pricing?.total ?? 0;
}

function orderItemsText(o: Order) {
  return (o.items || [])
    .map((it) => {
      const nm = it.name || it.productSnapshot?.name || "Item";
      return `${nm} × ${it.quantity}`;
    })
    .join(", ");
}

function customerName(o: Order) {
  return o.userDetails?.name || o.addressSnapshot?.fullName || o.addressDetails?.fullName || "-";
}

function customerSub(o: Order) {
  const phone = o.addressSnapshot?.phone || o.addressDetails?.phone;
  return `${o.userDetails?.email || ""}${phone ? ` • ${phone}` : ""}`.trim();
}

function orderOwnerId(o: Order) {
  return o.userId || o.customerId || "-";
}

function segmentFromOrder(o: Order): Exclude<Segment, "all"> {
  const w = String(o.website || "").toLowerCase();
  if (w.includes("aff")) return "affordable";
  if (w.includes("mid")) return "midrange";
  if (w.includes("lux")) return "luxury";

  if (o.websiteLabel === "Affordable") return "affordable";
  if (o.websiteLabel === "Mid Range") return "midrange";
  return "luxury";
}

function websiteLabelFromWebsite(website?: string): Order["websiteLabel"] {
  const w = String(website || "").toLowerCase();
  if (w.includes("aff")) return "Affordable";
  if (w.includes("mid")) return "Mid Range";
  if (w.includes("lux")) return "Luxury";
  return undefined;
}

function paymentText(o: Order) {
  const p = o.payment || {};
  const method = (p.method || "-").toUpperCase();
  const status = (p.status || "-").toUpperCase();

  const gateway = p.gateway ? ` • ${String(p.gateway).toUpperCase()}` : "";
  const rp = p.razorpayPaymentId ? ` • RP:${p.razorpayPaymentId.slice(-6)}` : "";
  const txn = p.transactionId ? ` • TXN:${p.transactionId.slice(-6)}` : "";
  return `${method}/${status}${gateway}${rp}${txn}`;
}

// Helper to get color name from hex (optional)
const getColorName = (hex: string) => {
  const colors: Record<string, string> = {
    "#8B7355": "Brown",
    "#1C1C1C": "Black",
    "#F5E6D3": "White",
    "#4A4A4A": "Grey",
    "#4A6741": "Green",
    "#2C3E50": "Blue",
  };
  return colors[hex.toUpperCase()] || hex;
};

export function CustomerApproveOrders() {
  const [segment, setSegment] = useState<Segment>("all");
  const [status, setStatus] = useState<string>("placed");

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionId, setActionId] = useState<string | null>(null);

  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<Order | null>(null);
  const [loadingSelected, setLoadingSelected] = useState(false);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const qs = status && status !== "all" ? `?status=${encodeURIComponent(status)}` : "";

      if (segment === "all") {
        const res = await api<OrdersResponse>(`${ALL_API}${qs}`);
        const list = normalizeResponse(res)
          .map((o) => ({
            ...o,
            websiteLabel: o.websiteLabel || websiteLabelFromWebsite(o.website),
          }))
          .sort((a, b) => {
            const da = new Date(a.createdAt || 0).getTime();
            const db = new Date(b.createdAt || 0).getTime();
            return db - da;
          });

        setOrders(list);
        return;
      }

      const base =
        segment === "affordable"
          ? SEGMENT_API.affordable
          : segment === "midrange"
          ? SEGMENT_API.midrange
          : SEGMENT_API.luxury;

      const res = await api<OrdersResponse>(`${base}${qs}`);
      const list = normalizeResponse(res).map((o) => ({
        ...o,
        website: o.website || segment,
        websiteLabel:
          segment === "affordable"
            ? ("Affordable" as const)
            : segment === "midrange"
            ? ("Mid Range" as const)
            : ("Luxury" as const),
      }));

      setOrders(list);
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

  useEffect(() => {
    fetchOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [segment, status]);

  const fetchFullOrder = async (o: Order) => {
    const seg = segmentFromOrder(o);
    const base = SEGMENT_API[seg];

    const full = await api<OrderResponse>(`${base}/${o._id}`, { method: "GET" });
    const order = full.order || full.data || full;

    return {
      ...o,
      ...order,
      website: order.website || o.website || seg,
      websiteLabel: o.websiteLabel || websiteLabelFromWebsite(order.website || o.website || seg),
    } as Order;
  };

  const openView = async (order: Order) => {
    setOpen(true);
    setSelected(order);

    if (segment === "all") {
      setLoadingSelected(true);
      try {
        const full = await fetchFullOrder(order);
        setSelected(full);
      } catch (err: any) {
        toast({
          title: "Could not load full order details",
          description: err?.message || "Backend missing /:id endpoint",
          variant: "destructive",
        });
      } finally {
        setLoadingSelected(false);
      }
    }
  };

  const handleApprove = async (order: Order) => {
    setActionId(order._id);
    try {
      const seg = segmentFromOrder(order);
      const base = SEGMENT_API[seg];

      const res = await api<OrderResponse>(`${base}/${order._id}/approve`, {
        method: "PATCH",
      });

      const updated = res.order || res.data || null;

      toast({ title: "Order Approved", description: res?.message || "Approved" });

      if (status === "placed") {
        setOrders((prev) => prev.filter((o) => o._id !== order._id));
        if (selected?._id === order._id) {
          setOpen(false);
          setSelected(null);
        }
      } else {
        setOrders((prev) =>
          prev.map((o) =>
            o._id === order._id
              ? { ...(updated || o), website: o.website, websiteLabel: o.websiteLabel }
              : o
          )
        );
        setSelected((prev) =>
          prev?._id === order._id
            ? { ...(updated || prev), website: prev.website, websiteLabel: prev.websiteLabel }
            : prev
        );
      }
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
    if (!window.confirm("Are you sure you want to reject this order?")) return;

    setActionId(order._id);
    try {
      const reason = window.prompt("Reason (optional):") || "";

      const seg = segmentFromOrder(order);
      const base = SEGMENT_API[seg];

      const res = await api<OrderResponse>(`${base}/${order._id}/reject`, {
        method: "PATCH",
        body: JSON.stringify({ reason }),
      });

      const updated = res.order || res.data || null;

      toast({
        title: "Order Rejected",
        description: res?.message || "Rejected",
        variant: "destructive",
      });

      if (status === "placed") {
        setOrders((prev) => prev.filter((o) => o._id !== order._id));
        if (selected?._id === order._id) {
          setOpen(false);
          setSelected(null);
        }
      } else {
        setOrders((prev) =>
          prev.map((o) =>
            o._id === order._id
              ? { ...(updated || o), website: o.website, websiteLabel: o.websiteLabel }
              : o
          )
        );
        setSelected((prev) =>
          prev?._id === order._id
            ? { ...(updated || prev), website: prev.website, websiteLabel: prev.websiteLabel }
            : prev
        );
      }
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

  const columns = useMemo(
    () => [
      {
        key: "website",
        header: "Website",
        render: (o: Order) => (
          <span className="text-xs px-2 py-1 rounded-md border">
            {o.websiteLabel || websiteLabelFromWebsite(o.website) || o.website || "-"}
          </span>
        ),
      },
      {
        key: "_id",
        header: "Order ID",
        render: (o: Order) => <span className="font-mono">{o._id.slice(-8).toUpperCase()}</span>,
      },
      {
        key: "customer",
        header: "Customer",
        render: (o: Order) => (
          <div className="leading-tight">
            <div className="font-medium">{customerName(o)}</div>
            <div className="text-xs text-muted-foreground">{customerSub(o)}</div>
          </div>
        ),
      },
      { key: "items", header: "Items", render: (o: Order) => orderItemsText(o) || "-" },
      {
        key: "total",
        header: "Total",
        render: (o: Order) => <span className="font-semibold">{formatCurrency(orderTotal(o))}</span>,
      },
      {
        key: "payment",
        header: "Payment",
        render: (o: Order) => <span className="text-xs">{paymentText(o)}</span>,
      },
      { key: "status", header: "Status", render: (o: Order) => <StatusBadge status={o.status} /> },
      { key: "createdAt", header: "Created", render: (o: Order) => formatDate(o.createdAt) },
    ],
    []
  );

  const actions = (order: Order) => (
    <div className="flex gap-1">
      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openView(order)} title="View">
        <Eye className="h-4 w-4" />
      </Button>

      {order.status === "placed" ? (
        <>
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
        </>
      ) : null}
    </div>
  );

  const selectedItemsTotal =
    selected?.items?.reduce((sum, it) => {
      const price = Number(it.finalPrice ?? it.productSnapshot?.price ?? it.price ?? 0);
      return sum + price * Number(it.quantity ?? 0);
    }, 0) ?? 0;

  const selectedTotal = selected?.totals?.total ?? selected?.pricing?.total ?? selectedItemsTotal;

  return (
    <AdminLayout panelType="eap" title="Orders" subtitle="All website orders with website & status filters">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between pb-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="text-sm text-muted-foreground">Website:</div>

          <Select value={segment} onValueChange={(v) => setSegment(v as Segment)}>
            <SelectTrigger className="w-[220px]">
              <SelectValue placeholder="Select website" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Websites</SelectItem>
              <SelectItem value="affordable">Affordable</SelectItem>
              <SelectItem value="midrange">Mid Range</SelectItem>
              <SelectItem value="luxury">Luxury</SelectItem>
            </SelectContent>
          </Select>

          <div className="text-sm text-muted-foreground">Status:</div>

          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="w-[220px]">
              <SelectValue placeholder="Select status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="pending_payment">Pending Payment</SelectItem>
              <SelectItem value="placed">Placed</SelectItem>
              <SelectItem value="confirmed">Confirmed</SelectItem>
              <SelectItem value="processing">Processing</SelectItem>
              <SelectItem value="shipped">Shipped</SelectItem>
              <SelectItem value="delivered">Delivered</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
              <SelectItem value="returned">Returned</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Button variant="outline" onClick={fetchOrders} disabled={loading}>
          {loading ? "Loading..." : "Refresh"}
        </Button>
      </div>

      <DataTable data={orders} columns={columns} searchKey="_id" actions={actions} />

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Order Details{" "}
              {selected ? <span className="font-mono text-sm ml-2">{selected._id.slice(-8).toUpperCase()}</span> : null}
            </DialogTitle>
          </DialogHeader>

          {!selected ? (
            <div className="text-sm text-muted-foreground">No order selected.</div>
          ) : loadingSelected ? (
            <div className="text-sm text-muted-foreground">Loading full details...</div>
          ) : (
            <div className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <div className="rounded-lg border p-3">
                  <div className="text-xs text-muted-foreground">Website</div>
                  <div className="mt-1 font-medium">{selected.websiteLabel || websiteLabelFromWebsite(selected.website) || selected.website || "-"}</div>
                </div>

                <div className="rounded-lg border p-3">
                  <div className="text-xs text-muted-foreground">Status</div>
                  <div className="mt-1">
                    <StatusBadge status={selected.status} />
                  </div>
                </div>

                <div className="rounded-lg border p-3">
                  <div className="text-xs text-muted-foreground">Created</div>
                  <div className="mt-1 font-medium">{formatDate(selected.createdAt)}</div>
                </div>

                <div className="rounded-lg border p-3">
                  <div className="text-xs text-muted-foreground">Total</div>
                  <div className="mt-1 font-semibold">{formatCurrency(selectedTotal)}</div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="rounded-lg border p-3">
                  <div className="text-sm font-semibold">Customer</div>
                  <div className="mt-2 text-sm">
                    <div>
                      <span className="text-muted-foreground">Name: </span>
                      {customerName(selected)}
                    </div>
                    <div>
                      <span className="text-muted-foreground">Email: </span>
                      {selected.userDetails?.email || "-"}
                    </div>
                    <div>
                      <span className="text-muted-foreground">Phone: </span>
                      {selected.addressSnapshot?.phone || selected.addressDetails?.phone || "-"}
                    </div>

                    <div className="mt-2">
                      <span className="text-muted-foreground">User ID: </span>
                      <span className="font-mono text-xs">{orderOwnerId(selected)}</span>
                    </div>
                  </div>
                </div>

                <div className="rounded-lg border p-3">
                  <div className="text-sm font-semibold">Address</div>
                  <div className="mt-2 text-sm">
                    <div>{buildAddressLine(selected)}</div>
                  </div>
                </div>
              </div>

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
                  {selected.payment?.gateway ? (
                    <div>
                      <span className="text-muted-foreground">Gateway: </span>
                      {selected.payment.gateway}
                    </div>
                  ) : null}
                  {selected.payment?.transactionId ? (
                    <div>
                      <span className="text-muted-foreground">TransactionId: </span>
                      <span className="font-mono text-xs">{selected.payment.transactionId}</span>
                    </div>
                  ) : null}
                  {selected.payment?.razorpayPaymentId ? (
                    <div>
                      <span className="text-muted-foreground">Razorpay PaymentId: </span>
                      <span className="font-mono text-xs">{selected.payment.razorpayPaymentId}</span>
                    </div>
                  ) : null}
                  {selected.payment?.razorpayOrderId ? (
                    <div>
                      <span className="text-muted-foreground">Razorpay OrderId: </span>
                      <span className="font-mono text-xs">{selected.payment.razorpayOrderId}</span>
                    </div>
                  ) : null}
                  {selected.payment?.meta?.upiId ? (
                    <div>
                      <span className="text-muted-foreground">UPI: </span>
                      {selected.payment.meta.upiId}
                    </div>
                  ) : null}
                  {selected.payment?.meta?.bank ? (
                    <div>
                      <span className="text-muted-foreground">Bank: </span>
                      {selected.payment.meta.bank}
                    </div>
                  ) : null}
                  {selected.payment?.meta?.cardLast4 || selected.payment?.meta?.last4 ? (
                    <div>
                      <span className="text-muted-foreground">Card Last4: </span>
                      {selected.payment.meta.cardLast4 || selected.payment.meta.last4}
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
                    const name = it.name || it.productSnapshot?.name || "Item";
                    const qty = Number(it.quantity ?? 0);

                    const mrp = Number(it.price ?? it.productSnapshot?.price ?? 0);
                    const final = Number(it.finalPrice ?? mrp);
                    const lineTotal = final * qty;

                    // Extract attributes
                    const attributes = it.attributes || {};

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

                          {/* ✅ Variant attributes */}
                          {(attributes.color || attributes.size || attributes.fabric) && (
                            <div className="flex flex-wrap gap-2 mt-1 text-xs">
                              {attributes.color && (
                                <span className="inline-flex items-center gap-1 bg-muted px-2 py-0.5 rounded-full">
                                  <span
                                    className="w-3 h-3 rounded-full"
                                    style={{ backgroundColor: attributes.color }}
                                  />
                                  {getColorName(attributes.color)}
                                </span>
                              )}
                              {attributes.size && (
                                <span className="bg-muted px-2 py-0.5 rounded-full">
                                  Size: {attributes.size}
                                </span>
                              )}
                              {attributes.fabric && (
                                <span className="bg-muted px-2 py-0.5 rounded-full capitalize">
                                  {attributes.fabric}
                                </span>
                              )}
                            </div>
                          )}

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
                            {it.variantId && (
                              <> • Variant ID: <span className="font-mono">{it.variantId}</span></>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setOpen(false)} disabled={actionId === selected._id}>
                  Close
                </Button>

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