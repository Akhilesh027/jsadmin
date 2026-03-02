import { useEffect, useMemo, useState } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { StatCard } from "@/components/ui/stat-card";
import { StatusBadge } from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";
import {
  Factory,
  Store,
  Users,
  ShoppingCart,
  Ticket,
  CreditCard,
  TrendingUp,
  Clock,
  Eye,
  RefreshCw,
} from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "@/hooks/use-toast";

type Segment = "affordable" | "midrange" | "luxury";

type RecentOrder = {
  id: string;
  orderNumber?: string;
  customerName?: string;
  totalAmount: number;
  status: string;
  website: Segment;
  createdAt?: string;
  updatedAt?: string;
};

type CAPDashboardResponse = {
  success: boolean;
  data: {
    rangeLabel: string;

    totalManufacturers: number;
    totalVendors: number;
    totalCustomers: number;
    totalOrders: number;

    totalTickets: number;     // ✅ from backend
    totalPayments: number;    // ✅ from backend

    pendingApprovals: number; // ✅ from backend
    activeOrders: number;     // ✅ from backend

    recentOrders: RecentOrder[];
    recentTickets: any[];
  };
  meta?: any;
};

const API_ROOT = "https://api.jsgallor.com/api/admin/cap";

function formatCurrency(n: number) {
  return `₹${Number(n || 0).toLocaleString("en-IN")}`;
}
function formatNumber(n: number) {
  return Number(n || 0).toLocaleString("en-IN");
}

function getToken() {
  return localStorage.getItem("Admintoken");
}

async function apiGet<T>(url: string): Promise<T> {
  const token = getToken();
  const res = await fetch(url, {
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as any)?.message || "Request failed");
  return data as T;
}

const EMPTY: CAPDashboardResponse["data"] = {
  rangeLabel: "Last 30 days",
  totalManufacturers: 0,
  totalVendors: 0,
  totalCustomers: 0,
  totalOrders: 0,
  totalTickets: 0,
  totalPayments: 0,
  pendingApprovals: 0,
  activeOrders: 0,
  recentOrders: [],
  recentTickets: [],
};

export default function CAPDashboard() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [dash, setDash] = useState<CAPDashboardResponse["data"]>(EMPTY);

  const fetchDashboard = async (isRefresh = false) => {
    try {
      isRefresh ? setRefreshing(true) : setLoading(true);

      // ✅ single API call (matches your response)
      const res = await apiGet<CAPDashboardResponse>(
        `${API_ROOT}/dashboard?days=30&recentOrders=5`
      );

      setDash(res?.data ? { ...EMPTY, ...res.data } : EMPTY);
    } catch (err: any) {
      toast({
        title: "Failed to load dashboard",
        description: err?.message || "Check backend API",
        variant: "destructive",
      });
      setDash(EMPTY);
    } finally {
      isRefresh ? setRefreshing(false) : setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const recentOrders = dash.recentOrders || [];
  const recentTickets = dash.recentTickets || [];

  if (loading) {
    return (
      <AdminLayout panelType="cap" title="Dashboard" subtitle="Welcome back, Super Admin">
        <div className="p-8 text-center text-muted-foreground">Loading dashboard...</div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout panelType="cap" title="Dashboard" subtitle="Welcome back, Super Admin">
      {/* Refresh */}
      <div className="flex justify-end mb-4">
        <Button variant="outline" onClick={() => fetchDashboard(true)} disabled={refreshing}>
          <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? "animate-spin" : ""}`} />
          {refreshing ? "Refreshing..." : "Refresh"}
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-8">
        <StatCard
          title="Manufacturers"
          value={formatNumber(dash.totalManufacturers)}
          icon={Factory}
          trend={{ value: 0, isPositive: true }}
          iconClassName="gradient-gold"
        />
        <StatCard
          title="Vendors"
          value={formatNumber(dash.totalVendors)}
          icon={Store}
          trend={{ value: 0, isPositive: true }}
          iconClassName="gradient-navy"
        />
        <StatCard
          title="Customers"
          value={formatNumber(dash.totalCustomers)}
          icon={Users}
          trend={{ value: 0, isPositive: true }}
        />
        <StatCard
          title="Total Orders"
          value={formatNumber(dash.totalOrders)}
          icon={ShoppingCart}
          trend={{ value: 0, isPositive: true }}
        />
        <StatCard
          title="Open Tickets"
          value={formatNumber(dash.totalTickets)}
          icon={Ticket}
          trend={{ value: 0, isPositive: false }}
        />
        <StatCard
          title="Revenue"
          value={formatCurrency(dash.totalPayments)}
          icon={CreditCard}
          trend={{ value: 0, isPositive: true }}
        />
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 mb-8">
        <Link
          to="/cap/admins/add"
          className="stat-card flex items-center gap-4 hover:border-primary/50 border border-transparent"
        >
          <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
            <Users className="h-6 w-6 text-primary" />
          </div>
          <div>
            <p className="font-semibold text-foreground">Add New Admin</p>
            <p className="text-sm text-muted-foreground">Create admin account</p>
          </div>
        </Link>

        <Link
          to="/cap/manufacturers"
          className="stat-card flex items-center gap-4 hover:border-primary/50 border border-transparent"
        >
          <div className="h-12 w-12 rounded-xl bg-warning/10 flex items-center justify-center">
            <Clock className="h-6 w-6 text-warning" />
          </div>
          <div>
            <p className="font-semibold text-foreground">{formatNumber(dash.pendingApprovals)} Pending</p>
            <p className="text-sm text-muted-foreground">Awaiting approval</p>
          </div>
        </Link>

        <Link
          to="/cap/vendors"
          className="stat-card flex items-center gap-4 hover:border-primary/50 border border-transparent"
        >
          <div className="h-12 w-12 rounded-xl bg-success/10 flex items-center justify-center">
            <TrendingUp className="h-6 w-6 text-success" />
          </div>
          <div>
            <p className="font-semibold text-foreground">{formatNumber(dash.activeOrders)} Active</p>
            <p className="text-sm text-muted-foreground">Orders in progress</p>
          </div>
        </Link>

        <Link
          to="/cap/logs"
          className="stat-card flex items-center gap-4 hover:border-primary/50 border border-transparent"
        >
          <div className="h-12 w-12 rounded-xl bg-info/10 flex items-center justify-center">
            <Eye className="h-6 w-6 text-info" />
          </div>
          <div>
            <p className="font-semibold text-foreground">View Logs</p>
            <p className="text-sm text-muted-foreground">Admin activity</p>
          </div>
        </Link>
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Recent Orders */}
        <div className="bg-card rounded-xl border border-border p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-foreground">Recent Orders</h3>
            <Link to="/eap/orders/history">
              <Button variant="ghost" size="sm">View All</Button>
            </Link>
          </div>

          {recentOrders.length === 0 ? (
            <div className="p-6 rounded-lg bg-muted/30 text-center text-muted-foreground">
              No recent orders found.
            </div>
          ) : (
            <div className="space-y-4">
              {recentOrders.map((o) => (
                <div key={o.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                  <div>
                    <p className="font-medium text-foreground">{o.orderNumber || o.id}</p>
                    <p className="text-sm text-muted-foreground capitalize">
                      {(o.customerName && o.customerName !== "—") ? o.customerName : `${o.website} website`}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-foreground">{formatCurrency(o.totalAmount)}</p>
                    <StatusBadge status={o.status} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Tickets */}
        <div className="bg-card rounded-xl border border-border p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-foreground">Recent Tickets</h3>
            <Link to="/pap/manufacturer/tickets">
              <Button variant="ghost" size="sm">View All</Button>
            </Link>
          </div>

          {recentTickets.length === 0 ? (
            <div className="p-6 rounded-lg bg-muted/30 text-center text-muted-foreground">
              No recent tickets.
            </div>
          ) : (
            <div className="space-y-4">
              {recentTickets.map((t: any) => (
                <div key={t._id || t.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                  <div>
                    <p className="font-medium text-foreground">{t.ticketNumber || t._id}</p>
                    <p className="text-sm text-muted-foreground line-clamp-1">{t.subject}</p>
                  </div>
                  <div className="text-right">
                    <StatusBadge status={t.priority} variant="priority" />
                    <p className="text-xs text-muted-foreground mt-1">
                      {t.createdAt ? new Date(t.createdAt).toLocaleString() : ""}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
