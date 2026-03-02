// src/pages/pap/vendor/VendorReports.tsx
import { useEffect, useMemo, useState } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import axios from "axios";
import {
  BarChart3,
  TrendingUp,
  ShoppingCart,
  Package,
  Truck,
  History,
  Ticket,
  Download,
  Search,
  CalendarDays,
  BadgeCheck,
  AlertTriangle,
  Wallet,
} from "lucide-react";

/**
 * Vendor Reports (Real-time)
 * Admin view: shows reports for ALL vendors with selector
 */

type ActivityType = "info" | "good" | "warn";

type VendorReportItem = {
  vendor: {
    _id: string;
    name: string;
    email?: string;
    status?: string;
    isVerified?: boolean;
    createdAt?: string;
  };

  rangeLabel: string;

  totalOrders: number;
  totalRevenue: number;
  estEarnings: number;
  totalItems: number;

  byStatus: Record<
    "pending" | "approved" | "packed" | "shipped" | "in_transit" | "delivered" | "cancelled",
    number
  >;

  activeTickets: number;
  resolvedTickets: number;

  returnRequests: number;
  damageReports: number;

  topProducts: Array<{ name: string; orders: number; revenue: number }>;
  recentActivity: Array<{ label: string; at: string; type: ActivityType }>;
};

const fmtCurrency = (n: number) => `₹${Number(n || 0).toLocaleString("en-IN")}`;
const fmtNumber = (n: number) => Number(n || 0).toLocaleString("en-IN");
const fmtDate = (iso: string) => new Date(iso).toLocaleString();

function badgeVariant(kind: "good" | "warn" | "bad" | "neutral") {
  if (kind === "good") return "default";
  if (kind === "warn") return "secondary";
  if (kind === "bad") return "destructive";
  return "outline";
}

export default function VendorReports() {
  const [q, setQ] = useState("");
  const [days, setDays] = useState(30);
  const [loading, setLoading] = useState(true);

  const [reports, setReports] = useState<VendorReportItem[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");

  const token = localStorage.getItem("token");
  const API = import.meta.env.VITE_API_URL || "https://api.jsgallor.com";

  const fetchReports = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API}/api/admin/reports/vendors?days=${days}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });

      const list: VendorReportItem[] = res.data?.data || [];
      setReports(list);

      if (!selectedId && list.length > 0) setSelectedId(list[0].vendor._id);
    } catch (e) {
      toast({
        title: "Error",
        description: "Failed to load vendor reports",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [days]);

  const selected = useMemo(() => {
    return reports.find((r) => r.vendor._id === selectedId) || null;
  }, [reports, selectedId]);

  const kpis = useMemo(() => {
    if (!selected) return [];

    const all = [
      { key: "orders", title: "Total Orders", value: fmtNumber(selected.totalOrders), icon: ShoppingCart },
      { key: "revenue", title: "Total Revenue", value: fmtCurrency(selected.totalRevenue), icon: TrendingUp },
      { key: "earnings", title: "Estimated Earnings", value: fmtCurrency(selected.estEarnings), icon: Wallet },
      { key: "items", title: "Items Sold", value: fmtNumber(selected.totalItems), icon: Package },

      { key: "delivered", title: "Delivered", value: fmtNumber(selected.byStatus.delivered), icon: Truck },
      { key: "in_transit", title: "In Transit", value: fmtNumber(selected.byStatus.in_transit), icon: Truck },
      { key: "approved", title: "Approved", value: fmtNumber(selected.byStatus.approved), icon: BadgeCheck },
      { key: "pending", title: "Pending", value: fmtNumber(selected.byStatus.pending), icon: AlertTriangle },

      { key: "tickets", title: "Active Tickets", value: fmtNumber(selected.activeTickets), icon: Ticket },
      { key: "resolved", title: "Resolved Tickets", value: fmtNumber(selected.resolvedTickets), icon: Ticket },

      { key: "returns", title: "Return Requests", value: fmtNumber(selected.returnRequests), icon: History },
      { key: "damage", title: "Damage Reports", value: fmtNumber(selected.damageReports), icon: History },
    ];

    const query = q.trim().toLowerCase();
    if (!query) return all;
    return all.filter((x) => x.title.toLowerCase().includes(query) || x.key.includes(query));
  }, [selected, q]);

  const exportCSV = () => {
    if (!selected) return;

    const rows: Array<[string, string | number]> = [
      ["Vendor", selected.vendor.name],
      ["Range", selected.rangeLabel],
      ["Total Orders", selected.totalOrders],
      ["Total Revenue", selected.totalRevenue],
      ["Estimated Earnings", selected.estEarnings],
      ["Items Sold", selected.totalItems],
      ["Active Tickets", selected.activeTickets],
      ["Resolved Tickets", selected.resolvedTickets],
      ["Return Requests", selected.returnRequests],
      ["Damage Reports", selected.damageReports],
      ...Object.entries(selected.byStatus).map(([k, v]) => [`Orders: ${k}`, v]),
    ];

    const csv = rows
      .map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `vendor-report-${selected.vendor.name}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);

    toast({ title: "Exported", description: "Vendor report exported as CSV." });
  };

  const openTicketsBadge =
    (selected?.activeTickets ?? 0) <= 5 ? "good" : (selected?.activeTickets ?? 0) <= 15 ? "warn" : "bad";
  const returnsBadge =
    (selected?.returnRequests ?? 0) <= 5 ? "good" : (selected?.returnRequests ?? 0) <= 15 ? "warn" : "bad";

  return (
    <AdminLayout panelType="pap-vendor">
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-6 w-6" />
              <h1 className="text-2xl font-bold">Vendor Reports</h1>
            </div>

            <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              <CalendarDays className="h-4 w-4" />
              <span>{selected?.rangeLabel || `Last ${days} days`}</span>
              {!!selected && (
                <>
                  <Badge variant={badgeVariant(openTicketsBadge) as any}>
                    Active Tickets: {selected.activeTickets}
                  </Badge>
                  <Badge variant={badgeVariant(returnsBadge) as any}>
                    Returns: {selected.returnRequests}
                  </Badge>
                </>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <select
              className="h-10 rounded-md border bg-background px-3 text-sm"
              value={days}
              onChange={(e) => setDays(Number(e.target.value))}
            >
              <option value={7}>Last 7 days</option>
              <option value={30}>Last 30 days</option>
              <option value={90}>Last 90 days</option>
              <option value={180}>Last 180 days</option>
            </select>

            <Button variant="outline" onClick={fetchReports} disabled={loading}>
              {loading ? "Loading..." : "Refresh"}
            </Button>

            <Button variant="outline" onClick={exportCSV} disabled={!selected}>
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </div>

        {/* Vendor Selector */}
        <Card>
          <CardContent className="p-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="text-sm text-muted-foreground">Select Vendor</div>

            <select
              className="h-10 w-full md:w-[420px] rounded-md border bg-background px-3 text-sm"
              value={selectedId}
              onChange={(e) => setSelectedId(e.target.value)}
            >
              {reports.length === 0 ? (
                <option value="">No vendors</option>
              ) : (
                reports.map((r) => (
                  <option key={r.vendor._id} value={r.vendor._id}>
                    {r.vendor.name} {r.vendor.isVerified ? "✅" : ""} {r.vendor.status ? `(${r.vendor.status})` : ""}
                  </option>
                ))
              )}
            </select>
          </CardContent>
        </Card>

        {/* Search KPI */}
        <Card>
          <CardContent className="p-4">
            <div className="relative w-full max-w-md">
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

        {loading ? (
          <Card>
            <CardContent className="p-6 text-sm text-muted-foreground">Loading reports...</CardContent>
          </Card>
        ) : !selected ? (
          <Card>
            <CardContent className="p-6 text-sm text-muted-foreground">No report selected.</CardContent>
          </Card>
        ) : (
          <>
            {/* KPIs */}
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {kpis.map((k) => (
                <KpiCard key={k.key} icon={k.icon} title={k.title} value={k.value} />
              ))}
            </div>

            {/* Sections */}
            <div className="grid gap-4 lg:grid-cols-2">
              {/* Orders by Status */}
              <Card>
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="font-semibold">Fulfillment Status</div>
                    <Badge variant="outline">Total: {fmtNumber(selected.totalOrders)}</Badge>
                  </div>

                  <div className="space-y-2">
                    {Object.entries(selected.byStatus).map(([k, v]) => {
                      const label = k.replaceAll("_", " ");
                      const percent = selected.totalOrders ? (v / selected.totalOrders) * 100 : 0;
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

              {/* Top Products */}
              <Card>
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="font-semibold">Top Products</div>
                    <Badge variant="outline">By Revenue</Badge>
                  </div>

                  {(selected.topProducts || []).length === 0 ? (
                    <div className="text-sm text-muted-foreground">No top products yet.</div>
                  ) : (
                    <div className="space-y-2">
                      {selected.topProducts.map((p) => (
                        <div key={p.name} className="rounded-lg border p-3">
                          <div className="flex items-center justify-between gap-2">
                            <div className="font-medium">{p.name}</div>
                            <Badge variant="secondary">{fmtCurrency(p.revenue)}</Badge>
                          </div>
                          <div className="mt-2 text-sm text-muted-foreground flex items-center justify-between">
                            <span>Orders: {fmtNumber(p.orders)}</span>
                            <span>Revenue: {fmtCurrency(p.revenue)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Recent Activity */}
            <Card>
              <CardContent className="p-4 space-y-3">
                <div className="font-semibold">Recent Activity</div>

                {(selected.recentActivity || []).length === 0 ? (
                  <div className="text-sm text-muted-foreground">No recent activity.</div>
                ) : (
                  <div className="space-y-2">
                    {selected.recentActivity.map((a, idx) => (
                      <div
                        key={idx}
                        className="flex items-start justify-between gap-3 rounded-lg border p-3"
                      >
                        <div className="min-w-0">
                          <div className="text-sm font-medium truncate">{a.label}</div>
                          <div className="text-xs text-muted-foreground">{fmtDate(a.at)}</div>
                        </div>
                        <Badge
                          variant={
                            badgeVariant(a.type === "good" ? "good" : a.type === "warn" ? "warn" : "neutral") as any
                          }
                        >
                          {a.type.toUpperCase()}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </AdminLayout>
  );
}

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
