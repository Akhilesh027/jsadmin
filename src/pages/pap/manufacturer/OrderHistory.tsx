import { useEffect, useMemo, useState } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { DataTable } from "@/components/ui/data-table";
import { StatusBadge } from "@/components/ui/status-badge";
import { Eye, Loader2, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";

const API_BASE = "https://api.jsgallor.com";

/** ------- Types ------- */
type Manufacturer = {
  _id: string;
  companyName: string;
  city?: string;
  country?: string;
};

type OrderItem = {
  productName: string;
  quantity: number;
};

type ApiOrder = {
  _id: string;
  orderNumber?: string;
  createdAt: string;

  manufacturer: string | Manufacturer; // may be populated

  items?: OrderItem[];
  productName?: string;

  totalAmount?: number;

  address?: string;
  notes?: string;
  paymentMode?: string;
  paymentOption?: string;

  status:
    | "draft"
    | "sent"
    | "pending"
    | "accepted"
    | "rejected"
    | "packed"
    | "shipped"
    | "in_transit"
    | "out_for_delivery"
    | "delivered"
    | "completed";
};

/** ------- Helpers ------- */
const safeJson = async (res: Response) => {
  try {
    return await res.json();
  } catch {
    return {};
  }
};

const formatCurrency = (amount = 0) => `₹${Number(amount || 0).toLocaleString()}`;
const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
  });

const getManufacturerId = (order: ApiOrder) =>
  typeof order.manufacturer === "string" ? order.manufacturer : order.manufacturer?._id || "";

const getManufacturerLabel = (order: ApiOrder) => {
  if (typeof order.manufacturer === "string") return "Manufacturer";
  const m = order.manufacturer;
  return `${m.companyName}${m.city ? ` - ${m.city}` : ""}${m.country ? `, ${m.country}` : ""}`;
};

const getOrderNumber = (order: ApiOrder) =>
  order.orderNumber || `#${order._id.slice(-6).toUpperCase()}`;

export default function OrderHistory() {
  const [orders, setOrders] = useState<ApiOrder[]>([]);
  const [manufacturers, setManufacturers] = useState<Manufacturer[]>([]);
  const [selectedManufacturerId, setSelectedManufacturerId] = useState<string>("all");
  const [loading, setLoading] = useState(false);

  // ✅ View modal
  const [viewOrder, setViewOrder] = useState<ApiOrder | null>(null);

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

  const fetchOrders = async () => {
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
    fetchOrders();
  }, []);

  const filteredOrders = useMemo(() => {
    if (selectedManufacturerId === "all") return orders;
    return orders.filter((o) => getManufacturerId(o) === selectedManufacturerId);
  }, [orders, selectedManufacturerId]);

  /** DataTable columns */
  const columns = useMemo(
    () => [
      {
        key: "orderNumber",
        header: "Order ID",
        render: (order: ApiOrder) => (
          <span className="font-mono font-medium">{getOrderNumber(order)}</span>
        ),
      },
      {
        key: "party",
        header: "Manufacturer",
        render: (order: ApiOrder) => (
          <div>
            <p className="font-medium">{getManufacturerLabel(order)}</p>
          </div>
        ),
      },
      {
        key: "items",
        header: "Items",
        render: (order: ApiOrder) => {
          const items = Array.isArray(order.items) ? order.items : [];
          if (items.length) return <span className="text-sm">{items.map((i) => i.productName).join(", ")}</span>;
          if (order.productName) return <span className="text-sm">{order.productName}</span>;
          return <span className="text-sm text-muted-foreground">—</span>;
        },
      },
      {
        key: "totalAmount",
        header: "Amount",
        render: (order: ApiOrder) => (
          <span className="font-medium">{formatCurrency(order.totalAmount || 0)}</span>
        ),
      },
      {
        key: "status",
        header: "Status",
        render: (order: ApiOrder) => <StatusBadge status={order.status} />,
      },
      {
        key: "createdAt",
        header: "Date",
        render: (order: ApiOrder) => formatDate(order.createdAt),
      },
    ],
    []
  );

  const actions = (order: ApiOrder) => (
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

  const paymentLabel = (o: ApiOrder) => {
    const p = (o.paymentMode || o.paymentOption || "").toString().trim();
    return p ? p.toUpperCase() : "—";
  };

  const orderItemsText = (o: ApiOrder) => {
    const items = Array.isArray(o.items) ? o.items : [];
    if (items.length) return items.map((i) => `${i.productName} × ${i.quantity}`).join(", ");
    if (o.productName) return o.productName;
    return "—";
  };

  return (
    <AdminLayout panelType="pap-manufacturer" title="Order History" subtitle="View all manufacturer orders">
      {/* Filter + Refresh */}
      <div className="flex flex-col md:flex-row gap-4 md:items-end md:justify-between mb-4">
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

        <Button variant="outline" onClick={fetchOrders} disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
          Refresh
        </Button>
      </div>

      {/* Table */}
      <DataTable
        data={filteredOrders}
        columns={columns}
        searchKey="orderNumber"
        searchPlaceholder="Search orders..."
        actions={actions}
      />

      {/* ✅ VIEW MODAL */}
      <Dialog open={!!viewOrder} onOpenChange={() => setViewOrder(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Order Details
            </DialogTitle>
          </DialogHeader>

          {viewOrder && (
            <div className="space-y-5">
              {/* Header */}
              <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
                <div>
                  <p className="text-sm text-muted-foreground">Order</p>
                  <p className="text-xl font-semibold">{getOrderNumber(viewOrder)}</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {getManufacturerLabel(viewOrder)} • {formatDate(viewOrder.createdAt)}
                  </p>
                </div>

                <div className="flex items-center gap-2 md:justify-end">
                  <Badge variant="secondary" className="text-sm">
                    {paymentLabel(viewOrder)}
                  </Badge>
                  <StatusBadge status={viewOrder.status} />
                </div>
              </div>

              {/* Details grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="rounded-lg border border-border p-4 space-y-2">
                  <p className="text-sm text-muted-foreground">Amount</p>
                  <p className="text-lg font-semibold">{formatCurrency(viewOrder.totalAmount || 0)}</p>

                  <p className="text-sm text-muted-foreground mt-3">Items / Product</p>
                  <p className="text-sm">{orderItemsText(viewOrder)}</p>
                </div>

                <div className="rounded-lg border border-border p-4 space-y-2">
                  <p className="text-sm text-muted-foreground">Status</p>
                  <div className="flex items-center gap-2">
                    <StatusBadge status={viewOrder.status} />
                    <span className="text-sm text-muted-foreground">
                      ({viewOrder.status.replaceAll("_", " ")})
                    </span>
                  </div>

                  <p className="text-sm text-muted-foreground mt-3">Order ID (DB)</p>
                  <p className="text-sm font-mono">{viewOrder._id}</p>
                </div>
              </div>

              {/* Address */}
              {viewOrder.address ? (
                <div className="rounded-lg border border-border p-4">
                  <p className="text-sm text-muted-foreground mb-1">Delivery Address</p>
                  <p className="text-sm">{viewOrder.address}</p>
                </div>
              ) : null}

              {/* Notes */}
              {viewOrder.notes ? (
                <div className="rounded-lg border border-border p-4">
                  <p className="text-sm text-muted-foreground mb-1">Notes</p>
                  <p className="text-sm">{viewOrder.notes}</p>
                </div>
              ) : null}

              {/* Footer */}
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setViewOrder(null)}>
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
