import { useEffect, useMemo, useState } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { StatCard } from "@/components/ui/stat-card";
import { ShoppingCart, Truck, Ticket, Users } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "@/hooks/use-toast";

const API_BASE = "https://api.jsgallor.com/api/admin/affordable/orders";

type Order = {
  _id: string;
  status: string; // placed | approved | confirmed | shipped | delivered | cancelled | rejected
  userId?: string;
  createdAt?: string;
};

const safeJson = async (res: Response) => {
  try {
    return await res.json();
  } catch {
    return {};
  }
};

export default function EcommerceDashboard() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");

      const res = await fetch(API_BASE, {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      const data = await safeJson(res);
      if (!res.ok) throw new Error(data?.message || "Failed to load orders");

      setOrders(Array.isArray(data) ? data : []);
    } catch (err: any) {
      toast({
        title: "Failed to load dashboard",
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
  }, []);

  /** ✅ Metrics based on your NEW statuses */
  const metrics = useMemo(() => {
    const pendingApproval = orders.filter((o) => o.status === "placed").length;

    const active = orders.filter(
      (o) => !["delivered", "cancelled", "rejected"].includes(o.status)
    ).length;

    const delivered = orders.filter((o) => o.status === "delivered").length;

    // ✅ unique customers by userId (fallback to 0 if missing)
    const customerSet = new Set<string>();
    orders.forEach((o) => {
      if (o.userId) customerSet.add(o.userId);
    });

    return {
      pendingApproval,
      active,
      delivered,
      customersCount: customerSet.size,
    };
  }, [orders]);

  return (
    <AdminLayout
      panelType="eap"
      title="Ecommerce Panel"
      subtitle="Manage customer orders"
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          title="Pending Orders"
          value={metrics.pendingApproval}
          icon={ShoppingCart}
          iconClassName="bg-warning/10"
        />
        <StatCard
          title="Active Orders"
          value={metrics.active}
          icon={Truck}
          iconClassName="bg-info/10"
        />
        <StatCard
          title="Delivered Orders"
          value={metrics.delivered}
          icon={Ticket}
          iconClassName="bg-success/10"
        />
        <StatCard
          title="Total Customers"
          value={metrics.customersCount}
          icon={Users}
          iconClassName="bg-primary/10"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Link
          to="/eap/orders/history"
          className="stat-card hover:border-primary/50 border border-transparent"
        >
          <p className="font-medium">All Orders</p>
          <p className="text-sm text-muted-foreground">
            {orders.length} total orders
          </p>
        </Link>

        <Link
          to="/eap/orders/history"
          className="stat-card hover:border-primary/50 border border-transparent"
        >
          <p className="font-medium">Pending Approval</p>
          <p className="text-sm text-muted-foreground">
            {metrics.pendingApproval} awaiting approval
          </p>
        </Link>

        <Link
          to="/eap/orders/history"
          className="stat-card hover:border-primary/50 border border-transparent"
        >
          <p className="font-medium">In Progress</p>
          <p className="text-sm text-muted-foreground">
            {metrics.active} orders in progress
          </p>
        </Link>

        <button
          onClick={fetchOrders}
          className="stat-card hover:border-primary/50 border border-transparent text-left"
        >
          <p className="font-medium">{loading ? "Refreshing..." : "Refresh"}</p>
          <p className="text-sm text-muted-foreground">
            Sync latest orders
          </p>
        </button>
      </div>
    </AdminLayout>
  );
}
