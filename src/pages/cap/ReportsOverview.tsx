// src/pages/admin/ReportsOverview.tsx
import { useEffect, useMemo, useState, useCallback } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  BarChart3,
  TrendingUp,
  Users,
  Store,
  Factory,
  Package,
  ShoppingCart,
  Ticket,
  Percent,
  Image as ImageIcon,
  FileText,
  Download,
  Search,
  CalendarDays,
  RefreshCw,
  Loader2,
} from "lucide-react";

type Segment = "all" | "affordable" | "midrange" | "luxury";

type ReportsData = {
  rangeLabel: string;

  totalRevenue: number;
  totalOrders: number;
  totalCustomers: number;
  totalVendors: number;
  totalManufacturers: number;

  segmentOrders: Record<Exclude<Segment, "all">, number>;
  segmentRevenue: Record<Exclude<Segment, "all">, number>;

  ordersByStatus: Record<
    "pending" | "placed" | "packed" | "shipped" | "in_transit" | "out_for_delivery" | "delivered" | "cancelled",
    number
  >;

  totalProducts: number;
  lowStockProducts: number;

  totalCoupons: number;
  activeCoupons: number;
  couponRedemptions: number;

  totalBanners: number;

  openTickets: number;
  resolvedTickets: number;

  totalAdmins: number;
  loginEvents: number;
};

const emptyData: ReportsData = {
  rangeLabel: "Last 30 days",

  totalRevenue: 0,
  totalOrders: 0,
  totalCustomers: 0,
  totalVendors: 0,
  totalManufacturers: 0,

  segmentOrders: { affordable: 0, midrange: 0, luxury: 0 },
  segmentRevenue: { affordable: 0, midrange: 0, luxury: 0 },

  ordersByStatus: {
    pending: 0,
    placed: 0,
    packed: 0,
    shipped: 0,
    in_transit: 0,
    out_for_delivery: 0,
    delivered: 0,
    cancelled: 0,
  },

  totalProducts: 0,
  lowStockProducts: 0,

  totalCoupons: 0,
  activeCoupons: 0,
  couponRedemptions: 0,

  totalBanners: 0,

  openTickets: 0,
  resolvedTickets: 0,

  totalAdmins: 0,
  loginEvents: 0,
};

const API = import.meta.env.VITE_API_URL || "https://api.jsgallor.com";
const API_URL = `${API}/api/admin/reports/overview`;

const fmtCurrency = (n: number) => `₹${Number(n || 0).toLocaleString("en-IN")}`;
const fmtNumber = (n: number) => Number(n || 0).toLocaleString("en-IN");

function badgeVariant(kind: "good" | "warn" | "bad" | "neutral") {
  if (kind === "good") return "default";
  if (kind === "warn") return "secondary";
  if (kind === "bad") return "destructive";
  return "outline";
}

function getToken() {
  return localStorage.getItem("Admintoken") || localStorage.getItem("token");
}

export default function ReportsOverview() {
  const [data, setData] = useState<ReportsData>(emptyData);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // filters
  const [days, setDays] = useState<string>("30"); // "7" | "30" | "90" | "all"
  const [lowStock, setLowStock] = useState<string>("10");

  // search inside cards
  const [q, setQ] = useState("");

  const fetchOverview = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);

      const token = getToken();
      const url = `${API_URL}?days=${encodeURIComponent(days)}&lowStock=${encodeURIComponent(lowStock)}`;

      const res = await fetch(url, {
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.message || "Failed to load report");

      setData(json?.data || emptyData);
    } catch (err: any) {
      toast({
        title: "Failed to load report",
        description: err?.message || "Please check backend endpoint.",
        variant: "destructive",
      });
      setData((prev) => prev || emptyData);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [days, lowStock]);

  useEffect(() => {
    fetchOverview(false);
  }, [fetchOverview]);

  const cards = useMemo(() => {
    const all = [
      { key: "revenue", title: "Total Revenue", value: fmtCurrency(data.totalRevenue), icon: TrendingUp },
      { key: "orders", title: "Total Orders", value: fmtNumber(data.totalOrders), icon: ShoppingCart },
      { key: "customers", title: "Customers", value: fmtNumber(data.totalCustomers), icon: Users },
      { key: "vendors", title: "Vendors", value: fmtNumber(data.totalVendors), icon: Store },
      { key: "manufacturers", title: "Manufacturers", value: fmtNumber(data.totalManufacturers), icon: Factory },
      { key: "products", title: "Products", value: fmtNumber(data.totalProducts), icon: Package },
      { key: "lowStock", title: "Low Stock", value: fmtNumber(data.lowStockProducts), icon: Package },
      { key: "coupons", title: "Coupons", value: fmtNumber(data.totalCoupons), icon: Percent },
      { key: "couponUse", title: "Coupon Redemptions", value: fmtNumber(data.couponRedemptions), icon: Percent },
      { key: "banners", title: "Banners", value: fmtNumber(data.totalBanners), icon: ImageIcon },
      { key: "ticketsOpen", title: "Open Tickets", value: fmtNumber(data.openTickets), icon: Ticket },
      { key: "ticketsResolved", title: "Resolved Tickets", value: fmtNumber(data.resolvedTickets), icon: Ticket },
      { key: "admins", title: "Admins", value: fmtNumber(data.totalAdmins), icon: Users },
      { key: "logins", title: "Login Events", value: fmtNumber(data.loginEvents), icon: FileText },
    ];

    const query = q.trim().toLowerCase();
    if (!query) return all;
    return all.filter((c) => c.title.toLowerCase().includes(query) || c.key.toLowerCase().includes(query));
  }, [data, q]);

  const exportCSV = () => {
    const rows = [
      ["Range", data.rangeLabel],
      ["Total Revenue", data.totalRevenue],
      ["Total Orders", data.totalOrders],
      ["Total Customers", data.totalCustomers],
      ["Total Vendors", data.totalVendors],
      ["Total Manufacturers", data.totalManufacturers],
      ["Total Products", data.totalProducts],
      ["Low Stock Products", data.lowStockProducts],
      ["Total Coupons", data.totalCoupons],
      ["Active Coupons", data.activeCoupons],
      ["Coupon Redemptions", data.couponRedemptions],
      ["Total Banners", data.totalBanners],
      ["Open Tickets", data.openTickets],
      ["Resolved Tickets", data.resolvedTickets],
      ["Total Admins", data.totalAdmins],
      ["Login Events", data.loginEvents],
      ["Affordable Orders", data.segmentOrders.affordable],
      ["Midrange Orders", data.segmentOrders.midrange],
      ["Luxury Orders", data.segmentOrders.luxury],
      ["Affordable Revenue", data.segmentRevenue.affordable],
      ["Midrange Revenue", data.segmentRevenue.midrange],
      ["Luxury Revenue", data.segmentRevenue.luxury],
      ...Object.entries(data.ordersByStatus).map(([k, v]) => [`Orders: ${k}`, v]),
    ];

    const csv = rows.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `report-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "Exported", description: "Report exported as CSV." });
  };

  const lowStockBadge =
    data.lowStockProducts <= 25 ? "good" : data.lowStockProducts <= 80 ? "warn" : "bad";
  const openTicketsBadge =
    data.openTickets <= 10 ? "good" : data.openTickets <= 25 ? "warn" : "bad";

  if (loading) {
    return (
      <AdminLayout panelType="cap">
        <div className="min-h-[60vh] flex items-center justify-center">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            Loading report...
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout panelType="cap">
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-6 w-6" />
              <h1 className="text-2xl font-bold">Reports Overview</h1>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              <CalendarDays className="h-4 w-4" />
              <span>{data.rangeLabel}</span>
              <Badge variant={badgeVariant(lowStockBadge) as any}>
                Low Stock: {data.lowStockProducts}
              </Badge>
              <Badge variant={badgeVariant(openTicketsBadge) as any}>
                Open Tickets: {data.openTickets}
              </Badge>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => fetchOverview(true)} disabled={refreshing}>
              {refreshing ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Refreshing
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh
                </>
              )}
            </Button>

            <Button variant="outline" onClick={exportCSV}>
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              <Select value={days} onValueChange={setDays}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Days" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">Last 7 days</SelectItem>
                  <SelectItem value="30">Last 30 days</SelectItem>
                  <SelectItem value="90">Last 90 days</SelectItem>
                  <SelectItem value="all">All time</SelectItem>
                </SelectContent>
              </Select>

              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Low stock ≤</span>
                <Input
                  value={lowStock}
                  onChange={(e) => setLowStock(e.target.value.replace(/[^\d]/g, "") || "0")}
                  className="w-[90px]"
                />
              </div>
            </div>

            <div className="relative w-full lg:max-w-md">
              <Search className="h-4 w-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search inside report cards..."
                className="pl-9"
              />
            </div>
          </CardContent>
        </Card>

        {/* KPI Cards */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {cards.map((c) => (
            <KpiCard key={c.key} icon={c.icon} title={c.title} value={c.value} />
          ))}
        </div>

        {/* Sections */}
        <div className="grid gap-4 lg:grid-cols-2">
          {/* Orders by Status */}
          <Card>
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="font-semibold">Orders by Status</div>
                <Badge variant="outline">Total: {fmtNumber(data.totalOrders)}</Badge>
              </div>

              <div className="space-y-2">
                {Object.entries(data.ordersByStatus).map(([k, v]) => {
                  const label = k.replaceAll("_", " ");
                  const percent = data.totalOrders ? (v / data.totalOrders) * 100 : 0;
                  return (
                    <div key={k} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="capitalize">{label}</span>
                        <span className="text-muted-foreground">
                          {fmtNumber(v)} • {percent.toFixed(1)}%
                        </span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full bg-foreground/60"
                          style={{ width: `${Math.min(100, Math.max(0, percent))}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Segment Performance */}
          <Card>
            <CardContent className="p-4 space-y-4">
              <div className="flex items-center justify-between">
                <div className="font-semibold">Segment Performance</div>
                <Badge variant="outline">Orders + Revenue</Badge>
              </div>

              <SegmentRow
                label="Affordable"
                orders={data.segmentOrders.affordable}
                revenue={data.segmentRevenue.affordable}
              />
              <SegmentRow
                label="Midrange"
                orders={data.segmentOrders.midrange}
                revenue={data.segmentRevenue.midrange}
              />
              <SegmentRow
                label="Luxury"
                orders={data.segmentOrders.luxury}
                revenue={data.segmentRevenue.luxury}
              />
            </CardContent>
          </Card>
        </div>

        {/* Summary Notes */}
        <Card>
          <CardContent className="p-4 space-y-2">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              <div className="font-semibold">Quick Notes (auto)</div>
            </div>

            <ul className="text-sm text-muted-foreground list-disc pl-5 space-y-1">
              <li>
                Low stock items:{" "}
                <span className="font-medium text-foreground">{data.lowStockProducts}</span> — consider restocking.
              </li>
              <li>
                Active coupons:{" "}
                <span className="font-medium text-foreground">{data.activeCoupons}</span> out of {data.totalCoupons}.
              </li>
              <li>
                Tickets:{" "}
                <span className="font-medium text-foreground">{data.openTickets}</span> open,{" "}
                {data.resolvedTickets} resolved.
              </li>
              <li>
                Most revenue is from{" "}
                <span className="font-medium text-foreground">
                  {topSegmentByRevenue(data.segmentRevenue)}
                </span>{" "}
                segment.
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}

/** UI bits */
function KpiCard({
  icon: Icon,
  title,
  value,
}: {
  icon: any;
  title: string;
  value: string;
}) {
  return (
    <Card>
      <CardContent className="p-4 flex items-center gap-3">
        <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <div className="text-xs text-muted-foreground truncate">{title}</div>
          <div className="text-xl font-semibold truncate">{value}</div>
        </div>
      </CardContent>
    </Card>
  );
}

function SegmentRow({
  label,
  orders,
  revenue,
}: {
  label: string;
  orders: number;
  revenue: number;
}) {
  return (
    <div className="rounded-lg border p-3">
      <div className="flex items-center justify-between">
        <div className="font-medium">{label}</div>
        <Badge variant="secondary">{fmtCurrency(revenue)}</Badge>
      </div>
      <div className="mt-2 grid grid-cols-2 gap-2 text-sm text-muted-foreground">
        <div>
          <div className="text-xs">Orders</div>
          <div className="text-base font-semibold text-foreground">{fmtNumber(orders)}</div>
        </div>
        <div>
          <div className="text-xs">Revenue</div>
          <div className="text-base font-semibold text-foreground">{fmtCurrency(revenue)}</div>
        </div>
      </div>
    </div>
  );
}

function topSegmentByRevenue(rev: Record<"affordable" | "midrange" | "luxury", number>) {
  const entries = Object.entries(rev) as Array<[keyof typeof rev, number]>;
  entries.sort((a, b) => b[1] - a[1]);
  const top = entries[0]?.[0] || "affordable";
  return top.charAt(0).toUpperCase() + top.slice(1);
}
