import { useEffect, useMemo, useState } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { DataTable } from "@/components/ui/data-table";
import { Eye, ShoppingBag, MapPin, Receipt } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";

type Segment = "all" | "affordable" | "midlevel" | "luxury";
type BackendPlatform = "affordable" | "midrange" | "luxury";

const API_BASE = "https://api.jsgallor.com";

/** ✅ API shape from /api/admin/customers/all-details */
type OrderItem = {
  productId: string;
  quantity: number;
  productSnapshot?: {
    name?: string;
    price?: number;
    image?: string;
    category?: string;
    colors?: string[];
    inStock?: boolean;
  };
};

type OrderDetailed = {
  _id: string;
  userId: string;
  addressId: string;
  items: OrderItem[];
  pricing?: {
    subtotal?: number;
    discount?: number;
    shippingCost?: number;
    total?: number;
  };
  payment?: {
    method?: string;
    status?: string;
    upiId?: string;
    cardLast4?: string;
  };
  website?: string;
  status?: string;
  createdAt?: string;
  updatedAt?: string;
};

type AddressDetailed = {
  _id: string;
  userId: string;
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
  createdAt?: string;
};

type CustomerRow = {
  id: string;
  segment: BackendPlatform; // affordable|midrange|luxury
  platform: BackendPlatform;

  name: string;
  email: string;
  phone?: string;
  role?: string;
  avatar?: string;

  orders: string[];
  addresses: string[];

  ordersDetailed: OrderDetailed[];
  addressesDetailed: AddressDetailed[];

  totalOrders: number;
  totalSpent: number;

  lastLogin?: string;
  lastOrderDate?: string;
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

function formatDateTime(iso?: string) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-IN");
}

function formatDateOnly(iso?: string) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-IN", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  });
}

function platformLabel(p?: BackendPlatform) {
  if (!p) return "—";
  if (p === "midrange") return "Midlevel";
  return p.charAt(0).toUpperCase() + p.slice(1);
}

function getCustomerName(c: CustomerRow) {
  return c.name?.trim() || c.email || "Customer";
}

function getOrderNumber(id: string) {
  return `#${id.slice(-6).toUpperCase()}`;
}

/** ---------------- Modal ---------------- */
function Modal({
  open,
  title,
  onClose,
  children,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      {/* ✅ Responsive fixed size + scroll */}
      <div className="relative w-[95vw] sm:w-[90vw] lg:w-[950px] max-w-[95vw] h-[85vh] rounded-xl bg-background shadow-lg overflow-hidden">
        <div className="flex items-center justify-between border-b px-5 py-4">
          <h2 className="text-lg font-semibold">{title}</h2>
          <Button variant="outline" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>

        <div className="h-[calc(85vh-72px)] overflow-y-auto px-5 py-4">
          {children}
        </div>
      </div>
    </div>
  );
}

export default function CustomerList() {
  const [segment, setSegment] = useState<Segment>("all");
  const [customers, setCustomers] = useState<CustomerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [viewOpen, setViewOpen] = useState(false);
  const [selected, setSelected] = useState<CustomerRow | null>(null);

  const handleDownload = () => {
    toast({
      title: "Download Started",
      description: "Customer data is being downloaded.",
    });
  };

  useEffect(() => {
    let mounted = true;

    const fetchCustomers = async () => {
      try {
        setLoading(true);
        setError(null);

        const token = localStorage.getItem("token");

        const res = await fetch(`${API_BASE}/api/admin/customers/all-details`, {
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        });

        const json = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(json?.message || "Failed to fetch customers");

        if (mounted) setCustomers(Array.isArray(json?.data) ? json.data : []);
      } catch (e: any) {
        if (mounted) setError(e?.message || "Something went wrong");
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchCustomers();
    return () => {
      mounted = false;
    };
  }, []);

  const filteredCustomers = useMemo(() => {
    if (segment === "all") return customers;

    if (segment === "midlevel") {
      return customers.filter((c) => c.platform === "midrange");
    }

    return customers.filter((c) => c.platform === segment);
  }, [segment, customers]);

  const columns = [
    {
      key: "name",
      header: "Customer",
      render: (c: CustomerRow) => (
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-full overflow-hidden border bg-muted shrink-0">
            {c.avatar ? (
              <img src={c.avatar} alt={getCustomerName(c)} className="h-full w-full object-cover" />
            ) : null}
          </div>
          <div>
            <p className="font-medium text-foreground">{getCustomerName(c)}</p>
            <p className="text-sm text-muted-foreground">{c.email}</p>
          </div>
        </div>
      ),
    },
    {
      key: "phone",
      header: "Phone",
      render: (c: CustomerRow) => c.phone || "—",
    },
    {
      key: "platform",
      header: "Platform",
      render: (c: CustomerRow) => (
        <span className="text-sm font-medium">{platformLabel(c.platform)}</span>
      ),
    },
    {
      key: "orders",
      header: "Orders",
      render: (c: CustomerRow) => (
        <div className="flex items-center gap-2">
          <ShoppingBag className="h-4 w-4 text-muted-foreground" />
          <span>{c.totalOrders ?? (c.ordersDetailed?.length || 0)}</span>
        </div>
      ),
    },
    {
      key: "spent",
      header: "Spent",
      render: (c: CustomerRow) => (
        <span className="font-medium">{formatCurrency(c.totalSpent ?? 0)}</span>
      ),
    },
    {
      key: "lastOrderDate",
      header: "Last Order",
      render: (c: CustomerRow) => formatDateOnly(c.lastOrderDate),
    },
  ];

  const openView = (c: CustomerRow) => {
    setSelected(c);
    setViewOpen(true);
  };

  const actions = (c: CustomerRow) => (
    <div className="flex items-center justify-end gap-2">
      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openView(c)}>
        <Eye className="h-4 w-4" />
      </Button>
    </div>
  );

  return (
    <AdminLayout panelType="cap" title="Customers" subtitle="View all registered customers">
      {/* Segment Filter */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          <Button variant={segment === "all" ? "default" : "outline"} size="sm" onClick={() => setSegment("all")}>
            All
          </Button>
          <Button variant={segment === "affordable" ? "default" : "outline"} size="sm" onClick={() => setSegment("affordable")}>
            Affordable
          </Button>
          <Button variant={segment === "midlevel" ? "default" : "outline"} size="sm" onClick={() => setSegment("midlevel")}>
            Midlevel
          </Button>
          <Button variant={segment === "luxury" ? "default" : "outline"} size="sm" onClick={() => setSegment("luxury")}>
            Luxury
          </Button>
        </div>

        <p className="text-sm text-muted-foreground">
          Showing <span className="font-medium text-foreground">{loading ? "..." : filteredCustomers.length}</span> customers
        </p>
      </div>

      {loading ? (
        <div className="py-10 text-center text-muted-foreground">Loading customers...</div>
      ) : error ? (
        <div className="py-10 text-center text-red-500">{error}</div>
      ) : (
        <DataTable
          data={filteredCustomers}
          columns={columns}
          searchKey="name"
          searchPlaceholder="Search customers..."
          actions={actions}
          onDownload={handleDownload}
        />
      )}

      {/* ✅ VIEW MODAL */}
      <Modal
        open={viewOpen}
        title="Customer Details"
        onClose={() => {
          setViewOpen(false);
          setSelected(null);
        }}
      >
        {!selected ? (
          <div className="text-muted-foreground">No customer selected.</div>
        ) : (
          <div className="space-y-5">
            {/* Header */}
            <div className="flex items-start gap-4">
              <div className="h-16 w-16 rounded-xl overflow-hidden border bg-muted shrink-0">
                {selected.avatar ? (
                  <img src={selected.avatar} alt={getCustomerName(selected)} className="h-full w-full object-cover" />
                ) : null}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-xl font-semibold truncate">{getCustomerName(selected)}</p>
                  <Badge variant="secondary">{platformLabel(selected.platform)}</Badge>
                  {selected.role ? <Badge variant="outline">Role: {selected.role}</Badge> : null}
                </div>
                <p className="text-sm text-muted-foreground break-all">{selected.email}</p>
                <p className="text-sm text-muted-foreground">{selected.phone || "—"}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Customer ID: <span className="font-mono">{selected.id}</span>
                </p>
              </div>
            </div>

            {/* Quick stats */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="rounded-lg border p-3">
                <div className="text-xs text-muted-foreground">Total Orders</div>
                <div className="mt-1 font-semibold">{selected.ordersDetailed?.length || 0}</div>
              </div>
              <div className="rounded-lg border p-3">
                <div className="text-xs text-muted-foreground">Total Spent</div>
                <div className="mt-1 font-semibold">{formatCurrency(selected.totalSpent || 0)}</div>
              </div>
              <div className="rounded-lg border p-3">
                <div className="text-xs text-muted-foreground">Last Order</div>
                <div className="mt-1 font-semibold">{formatDateTime(selected.lastOrderDate)}</div>
              </div>
            </div>

            {/* Addresses */}
            <div className="rounded-xl border p-4">
              <div className="flex items-center gap-2 font-semibold mb-3">
                <MapPin className="h-4 w-4" />
                Addresses
                <span className="text-xs text-muted-foreground font-normal">
                  ({selected.addressesDetailed?.length || 0})
                </span>
              </div>

              {selected.addressesDetailed?.length ? (
                <div className="space-y-3">
                  {selected.addressesDetailed.map((a) => (
                    <div key={a._id} className="rounded-lg border p-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="font-medium">{a.fullName || "—"}</div>
                        <div className="text-xs text-muted-foreground font-mono">{a._id}</div>
                      </div>

                      <div className="text-sm text-muted-foreground mt-1">
                        {(a.addressLine1 || "").trim()}
                        {a.addressLine2 ? `, ${a.addressLine2}` : ""}
                        {a.landmark ? `, ${a.landmark}` : ""}
                        {a.city ? `, ${a.city}` : ""}
                        {a.state ? `, ${a.state}` : ""}
                        {a.pincode ? ` - ${a.pincode}` : ""}
                      </div>

                      <div className="text-xs text-muted-foreground mt-2">
                        {a.phone ? `Phone: ${a.phone}` : ""}{" "}
                        {a.email ? `• Email: ${a.email}` : ""}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-muted-foreground">No addresses found.</div>
              )}
            </div>

            {/* Orders */}
            <div className="rounded-xl border p-4">
              <div className="flex items-center gap-2 font-semibold mb-3">
                <Receipt className="h-4 w-4" />
                Orders
                <span className="text-xs text-muted-foreground font-normal">
                  ({selected.ordersDetailed?.length || 0})
                </span>
              </div>

              {selected.ordersDetailed?.length ? (
                <div className="space-y-4">
                  {selected.ordersDetailed.map((o) => (
                    <div key={o._id} className="rounded-lg border p-3">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <div className="font-semibold">{getOrderNumber(o._id)}</div>
                          <div className="text-xs text-muted-foreground">
                            {formatDateTime(o.createdAt)} • Status:{" "}
                            <span className="font-medium">
                              {(o.status || "—").replaceAll("_", " ")}
                            </span>
                          </div>
                          <div className="text-xs text-muted-foreground font-mono mt-1">
                            addressId: {o.addressId}
                          </div>
                        </div>

                        <div className="text-right">
                          <div className="font-semibold">
                            {formatCurrency(o.pricing?.total || 0)}
                          </div>
                          <div className="text-xs text-muted-foreground uppercase">
                            {(o.payment?.method || "—")} / {(o.payment?.status || "—")}
                          </div>
                        </div>
                      </div>

                      {/* items */}
                      <div className="mt-3 space-y-2">
                        {(o.items || []).map((it, idx) => {
                          const name = it.productSnapshot?.name || "Item";
                          const price = Number(it.productSnapshot?.price || 0);
                          const qty = Number(it.quantity || 0);
                          return (
                            <div key={`${it.productId}-${idx}`} className="flex gap-3 border rounded-lg p-2">
                              <div className="h-14 w-14 rounded-md overflow-hidden border bg-muted shrink-0">
                                {it.productSnapshot?.image ? (
                                  <img
                                    src={it.productSnapshot.image}
                                    alt={name}
                                    className="h-full w-full object-cover"
                                  />
                                ) : null}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="font-medium truncate">{name}</div>
                                <div className="text-xs text-muted-foreground">
                                  Qty: {qty} • Price: {formatCurrency(price)} • Line:{" "}
                                  <span className="font-medium">{formatCurrency(price * qty)}</span>
                                </div>
                                <div className="text-[11px] text-muted-foreground font-mono break-all mt-1">
                                  productId: {it.productId}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* pricing */}
                      <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                        <div className="rounded-md border p-2">
                          <div className="text-muted-foreground">Subtotal</div>
                          <div className="font-medium">{formatCurrency(o.pricing?.subtotal || 0)}</div>
                        </div>
                        <div className="rounded-md border p-2">
                          <div className="text-muted-foreground">Discount</div>
                          <div className="font-medium">{formatCurrency(o.pricing?.discount || 0)}</div>
                        </div>
                        <div className="rounded-md border p-2">
                          <div className="text-muted-foreground">Shipping</div>
                          <div className="font-medium">{formatCurrency(o.pricing?.shippingCost || 0)}</div>
                        </div>
                        <div className="rounded-md border p-2">
                          <div className="text-muted-foreground">Total</div>
                          <div className="font-semibold">{formatCurrency(o.pricing?.total || 0)}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-muted-foreground">No orders found.</div>
              )}
            </div>

            {/* Footer */}
            <div className="flex justify-end pt-2">
              <Button variant="outline" onClick={() => setViewOpen(false)}>
                Close
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </AdminLayout>
  );
}
