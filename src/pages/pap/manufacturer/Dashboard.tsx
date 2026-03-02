import { useEffect, useMemo, useState } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { StatCard } from "@/components/ui/stat-card";
import { StatusBadge } from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";
import {
  ClipboardList,
  Package,
  Truck,
  CreditCard,
  Ticket,
  Factory,
  TrendingUp,
  Loader2,
} from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "@/hooks/use-toast";

const API_BASE = "https://api.jsgallor.com";

type Summary = {
  pendingCatalogs: number;
  activeOrders: number;
  openTickets: number;
  pendingPayments: number;
};

type RecentCatalog = {
  _id: string;
  productName: string;
  manufacturerName?: string;
  status: "pending" | "approved" | "rejected";
  createdAt: string;
  price?: number;
  image?: string;
};

type RecentTicket = {
  _id: string;
  ticketNumber?: string;
  subject?: string;
  status: string;
  createdAt: string;
};

const safeJson = async (res: Response) => {
  try {
    return await res.json();
  } catch {
    return {};
  }
};

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
  });

const getToken = () => localStorage.getItem("token") || "";

export default function ManufacturerDashboard() {
  const [loading, setLoading] = useState(false);

  const [summary, setSummary] = useState<Summary>({
    pendingCatalogs: 0,
    activeOrders: 0,
    openTickets: 0,
    pendingPayments: 0,
  });

  const [recentCatalogs, setRecentCatalogs] = useState<RecentCatalog[]>([]);
  const [recentTickets, setRecentTickets] = useState<RecentTicket[]>([]);

  const fetchDashboard = async () => {
    try {
      setLoading(true);

      const [sumRes, recentRes] = await Promise.all([
        fetch(`${API_BASE}/api/admin/dashboard/manufacturers/summary`, {
          headers: { Authorization: `Bearer ${getToken()}` },
        }),
        fetch(`${API_BASE}/api/admin/dashboard/manufacturers/recent`, {
          headers: { Authorization: `Bearer ${getToken()}` },
        }),
      ]);

      const sumData = await safeJson(sumRes);
      const recentData = await safeJson(recentRes);

      if (!sumRes.ok || !sumData?.success) {
        throw new Error(sumData?.message || "Failed to load summary");
      }
      if (!recentRes.ok || !recentData?.success) {
        throw new Error(recentData?.message || "Failed to load recent activity");
      }

      setSummary(sumData.summary || summary);
      setRecentCatalogs(recentData?.recent?.catalogs || []);
      setRecentTickets(recentData?.recent?.tickets || []);
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to load dashboard",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pendingCatalogs = summary.pendingCatalogs;
  const activeOrders = summary.activeOrders;
  const openTickets = summary.openTickets;
  const pendingPayments = summary.pendingPayments;

  return (
    <AdminLayout
      panelType="pap-manufacturer"
      title="Manufacturers Dashboard (Admin)"
      subtitle="View manufacturers operations overview"
    >
      {/* Top bar */}
      <div className="flex items-center justify-end mb-5">
        <Button variant="outline" onClick={fetchDashboard} disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
          Refresh
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          title="Pending Catalogs"
          value={pendingCatalogs}
          icon={ClipboardList}
          iconClassName="bg-warning/10"
        />
        <StatCard
          title="Active Orders"
          value={activeOrders}
          icon={Package}
          iconClassName="bg-info/10"
        />
        <StatCard
          title="Open Tickets"
          value={openTickets}
          icon={Ticket}
          iconClassName="bg-destructive/10"
        />
        <StatCard
          title="Pending Payments"
          value={pendingPayments}
          icon={CreditCard}
          iconClassName="bg-success/10"
        />
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Link
          to="/pap/manufacturer/catalog"
          className="stat-card hover:border-primary/50 border border-transparent"
        >
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-warning/10 flex items-center justify-center">
              <ClipboardList className="h-5 w-5 text-warning" />
            </div>
            <div>
              <p className="font-medium">Review Catalogs</p>
              <p className="text-sm text-muted-foreground">
                {pendingCatalogs} pending approval
              </p>
            </div>
          </div>
        </Link>

        <Link
          to="/pap/manufacturer/orders/history"
          className="stat-card hover:border-primary/50 border border-transparent"
        >
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Package className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="font-medium">Orders</p>
              <p className="text-sm text-muted-foreground">
                {activeOrders} in progress
              </p>
            </div>
          </div>
        </Link>

        <Link
          to="/pap/manufacturer/orders/track"
          className="stat-card hover:border-primary/50 border border-transparent"
        >
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-info/10 flex items-center justify-center">
              <Truck className="h-5 w-5 text-info" />
            </div>
            <div>
              <p className="font-medium">Track Orders</p>
              <p className="text-sm text-muted-foreground">
                Monitor shipment status
              </p>
            </div>
          </div>
        </Link>

        <Link
          to="/pap/manufacturer/forward"
          className="stat-card hover:border-primary/50 border border-transparent"
        >
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-success/10 flex items-center justify-center">
              <TrendingUp className="h-5 w-5 text-success" />
            </div>
            <div>
              <p className="font-medium">Forward Catalogs</p>
              <p className="text-sm text-muted-foreground">To website / vendors</p>
            </div>
          </div>
        </Link>
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Catalogs */}
        <div className="bg-card rounded-xl border border-border p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">Recent Catalog Submissions</h3>
            <Link to="/admin/manufacturers/catalogs">
              <Button variant="ghost" size="sm">
                View All
              </Button>
            </Link>
          </div>

          <div className="space-y-3">
            {loading ? (
              <div className="text-sm text-muted-foreground flex items-center gap-2 py-4">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading...
              </div>
            ) : recentCatalogs.length === 0 ? (
              <div className="text-sm text-muted-foreground py-6">
                No recent catalogs found
              </div>
            ) : (
              recentCatalogs.map((item) => (
                <div
                  key={item._id}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/30"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-lg bg-muted flex items-center justify-center">
                      <Factory className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">{item.productName}</p>
                      <p className="text-xs text-muted-foreground">
                        {item.manufacturerName || "—"} • {formatDate(item.createdAt)}
                      </p>
                    </div>
                  </div>
                  <StatusBadge status={item.status as any} />
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent Tickets */}
        <div className="bg-card rounded-xl border border-border p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">Manufacturer Tickets</h3>
            <Link to="/admin/manufacturers/tickets">
              <Button variant="ghost" size="sm">
                View All
              </Button>
            </Link>
          </div>

          <div className="space-y-3">
            {loading ? (
              <div className="text-sm text-muted-foreground flex items-center gap-2 py-4">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading...
              </div>
            ) : recentTickets.length === 0 ? (
              <div className="text-sm text-muted-foreground py-6">
                No tickets found
              </div>
            ) : (
              recentTickets.map((t) => (
                <div
                  key={t._id}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/30"
                >
                  <div>
                    <p className="font-medium text-sm">
                      {t.ticketNumber || `TKT-${t._id.slice(-6).toUpperCase()}`}
                    </p>
                    <p className="text-xs text-muted-foreground line-clamp-1">
                      {t.subject || "—"}
                    </p>
                  </div>
                  <div className="text-right">
                    <StatusBadge status={t.status as any} />
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatDate(t.createdAt)}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
