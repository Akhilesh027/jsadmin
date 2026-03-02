// src/pages/eap/EcommerceReports.tsx
import { useEffect, useMemo, useState, useCallback } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
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
  ShoppingCart,
  Truck,
  Download,
  Search,
  CalendarDays,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";

/** ---------------------------
 * Segments
 * -------------------------- */
type Segment = "all" | "affordable" | "midrange" | "luxury";

/** ---------------------------
 * Days filter
 * -------------------------- */
type Days = "all" | "7" | "30" | "90";

/** ---------------------------
 * Order shape (flexible)
 * -------------------------- */
type AnyOrder = {
  _id?: string;
  id?: string;

  website?: Segment; // injected by frontend
  segment?: Segment; // if backend sends

  status?: string;

  totals?: { grandTotal?: number; total?: number };
  totalAmount?: number;
  grandTotal?: number;
  total?: number;

  createdAt?: string;
  updatedAt?: string;
};

const API = import.meta.env.VITE_API_URL || "https://api.jsgallor.com";
const API_ROOT = `${API}/api/admin`;

/** Your segment order endpoints */
const SEGMENT_API: Record<Exclude<Segment, "all">, string> = {
  affordable: `${API_ROOT}/affordable/orders`,
  midrange: `${API_ROOT}/midrange/orders`,
  luxury: `${API_ROOT}/luxury/orders`,
};

function getToken() {
  // you used "Admintoken"
  return localStorage.getItem("Admintoken") || localStorage.getItem("token");
}

async function apiGet(url: string) {
  const token = getToken();
  const res = await fetch(url, {
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.message || "Request failed");
  return data;
}

function extractOrders(payload: any): AnyOrder[] {
  // supports: [] OR {orders: []} OR {data: []} OR {success:true,data:[]} OR {success:true,orders:[]}
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.orders)) return payload.orders;
  if (Array.isArray(payload?.data)) return payload.data;
  if (payload?.success && Array.isArray(payload?.data)) return payload.data;
  if (payload?.success && Array.isArray(payload?.orders)) return payload.orders;
  return [];
}

function normStatus(s?: string) {
  const x = String(s || "").toLowerCase().trim();

  // normalize common variants
  if (x === "delivered") return "delivered";
  if (x === "out_for_delivery" || x === "out for delivery") return "out_for_delivery";
  if (x === "in_transit" || x === "in-transit" || x.includes("transit")) return "in_transit";
  if (x === "shipped") return "shipped";
  if (x === "packed") return "packed";
  if (x === "placed") return "placed";
  if (x === "pending") return "pending";
  if (x === "cancelled" || x === "canceled") return "cancelled";

  return x || "unknown";
}

function getAmount(o: AnyOrder) {
  return Number(
    o?.totals?.grandTotal ??
      o?.totals?.total ??
      o?.grandTotal ??
      o?.totalAmount ??
      o?.total ??
      0
  );
}

const fmtCurrency = (n: number) => `₹${Number(n || 0).toLocaleString("en-IN")}`;
const fmtNumber = (n: number) => Number(n || 0).toLocaleString("en-IN");

/** ---------------------------
 * Page
 * -------------------------- */
export default function EcommerceReports() {
  const [segment, setSegment] = useState<Segment>("all");
  const [days, setDays] = useState<Days>("all");
  const [q, setQ] = useState("");

  const [loading, setLoading] = useState(false);
  const [orders, setOrders] = useState<AnyOrder[]>([]);

  const rangeLabel =
    days === "all" ? "All Time (API)" : `Last ${days} days (API)`; // your backend may ignore this for now

  const withDays = (url: string) => {
    // If your backend supports ?days=30 it will work; if not, backend should ignore unknown query.
    if (days === "all") return url;
    return `${url}${url.includes("?") ? "&" : "?"}days=${days}`;
  };

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      let merged: AnyOrder[] = [];

      if (segment === "all") {
        const [a, m, l] = await Promise.all([
          apiGet(withDays(SEGMENT_API.affordable)),
          apiGet(withDays(SEGMENT_API.midrange)),
          apiGet(withDays(SEGMENT_API.luxury)),
        ]);

        const aOrders = extractOrders(a).map((x) => ({ ...x, website: "affordable" as const }));
        const mOrders = extractOrders(m).map((x) => ({ ...x, website: "midrange" as const }));
        const lOrders = extractOrders(l).map((x) => ({ ...x, website: "luxury" as const }));

        merged = [...aOrders, ...mOrders, ...lOrders];
      } else {
        const payload = await apiGet(withDays(SEGMENT_API[segment]));
        merged = extractOrders(payload).map((x) => ({ ...x, website: segment }));
      }

      // Sort latest first (nice UX)
      merged.sort((a, b) => {
        const da = new Date(a.createdAt || a.updatedAt || 0).getTime();
        const db = new Date(b.createdAt || b.updatedAt || 0).getTime();
        return db - da;
      });

      setOrders(merged);
    } catch (err: any) {
      toast({
        title: "Failed to load report",
        description: err?.message || "Please check API endpoints.",
        variant: "destructive",
      });
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, [segment, days]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return orders;

    return orders.filter((o) => {
      const id = String(o._id || o.id || "").toLowerCase();
      const st = normStatus(o.status);
      const site = String(o.website || o.segment || "").toLowerCase();
      return id.includes(query) || st.includes(query) || site.includes(query);
    });
  }, [orders, q]);

  const stats = useMemo(() => {
    const totalOrders = filtered.length;
    const totalRevenue = filtered.reduce((sum, o) => sum + getAmount(o), 0);

    const byStatus: Record<string, number> = {
      pending: 0,
      placed: 0,
      packed: 0,
      shipped: 0,
      in_transit: 0,
      out_for_delivery: 0,
      delivered: 0,
      cancelled: 0,
      unknown: 0,
    };

    const bySite: Record<string, number> = {
      affordable: 0,
      midrange: 0,
      luxury: 0,
    };

    for (const o of filtered) {
      const st = normStatus(o.status);
      byStatus[st] = (byStatus[st] || 0) + 1;

      const site = String((o.website || o.segment || "") as string);
      if (bySite[site] !== undefined) bySite[site] += 1;
    }

    return { totalOrders, totalRevenue, byStatus, bySite };
  }, [filtered]);

  const exportCSV = () => {
    const headers = ["id", "website", "status", "amount", "createdAt"];
    const rows = filtered.map((o) => {
      const id = o._id || o.id || "";
      const site = o.website || o.segment || "";
      const status = normStatus(o.status);
      const amount = getAmount(o);
      const createdAt = o.createdAt || "";
      return [id, site, status, amount, createdAt]
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(",");
    });

    const csv = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `eap-report-${segment}-${days}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);

    toast({ title: "Exported", description: "Report exported as CSV." });
  };

  const hasOrders = filtered.length > 0;

  return (
    <AdminLayout panelType="eap">
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-6 w-6" />
              <h1 className="text-2xl font-bold">Ecommerce Reports</h1>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              <CalendarDays className="h-4 w-4" />
              <span>{rangeLabel}</span>
              <Badge variant="outline" className="capitalize">
                Segment: {segment}
              </Badge>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={exportCSV} disabled={loading || !hasOrders}>
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </div>

        {/* Controls */}
        <Card>
          <CardContent className="p-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              <Select value={segment} onValueChange={(v) => setSegment(v as Segment)}>
                <SelectTrigger className="w-[220px]">
                  <SelectValue placeholder="Select segment" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All (Affordable + Mid + Luxury)</SelectItem>
                  <SelectItem value="affordable">Affordable</SelectItem>
                  <SelectItem value="midrange">Midrange</SelectItem>
                  <SelectItem value="luxury">Luxury</SelectItem>
                </SelectContent>
              </Select>

              <Select value={days} onValueChange={(v) => setDays(v as Days)}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Days" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Time</SelectItem>
                  <SelectItem value="7">Last 7 days</SelectItem>
                  <SelectItem value="30">Last 30 days</SelectItem>
                  <SelectItem value="90">Last 90 days</SelectItem>
                </SelectContent>
              </Select>

              <Button variant="outline" onClick={fetchOrders} disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Refresh"}
              </Button>
            </div>

            <div className="relative w-full lg:max-w-md">
              <Search className="h-4 w-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search by order id / status / website..."
                className="pl-9"
              />
            </div>
          </CardContent>
        </Card>

        {/* KPI */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Kpi title="Total Orders" value={fmtNumber(stats.totalOrders)} icon={ShoppingCart} />
          <Kpi title="Total Revenue" value={fmtCurrency(stats.totalRevenue)} icon={TrendingUp} />
          <Kpi title="Delivered" value={fmtNumber(stats.byStatus.delivered || 0)} icon={Truck} />
          <Kpi title="Cancelled" value={fmtNumber(stats.byStatus.cancelled || 0)} icon={Truck} />
        </div>

        {/* Status breakdown + Site breakdown */}
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardContent className="p-4 space-y-2">
              <div className="font-semibold">Orders by Status</div>

              {!hasOrders ? (
                <div className="text-sm text-muted-foreground">No orders found.</div>
              ) : (
                <div className="grid grid-cols-2 gap-2 text-sm">
                  {Object.entries(stats.byStatus).map(([k, v]) => (
                    <div key={k} className="flex items-center justify-between rounded-md border px-3 py-2">
                      <span className="capitalize">{k.replaceAll("_", " ")}</span>
                      <Badge variant="secondary">{fmtNumber(v)}</Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 space-y-2">
              <div className="font-semibold">Orders by Website</div>

              {!hasOrders ? (
                <div className="text-sm text-muted-foreground">No orders found.</div>
              ) : (
                <div className="grid grid-cols-1 gap-2 text-sm">
                  {(["affordable", "midrange", "luxury"] as const).map((s) => (
                    <div key={s} className="flex items-center justify-between rounded-md border px-3 py-2">
                      <span className="capitalize">{s}</span>
                      <Badge variant="outline">{fmtNumber(stats.bySite[s] || 0)}</Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Simple Table */}
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/40">
                  <tr className="text-left">
                    <Th>Order</Th>
                    <Th>Website</Th>
                    <Th>Status</Th>
                    <Th className="text-right">Amount</Th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={4} className="p-6 text-center text-muted-foreground">
                        Loading...
                      </td>
                    </tr>
                  ) : filtered.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="p-6 text-center text-muted-foreground">
                        No orders found.
                      </td>
                    </tr>
                  ) : (
                    filtered.slice(0, 50).map((o, idx) => (
                      <tr key={String(o._id || o.id || idx)} className="border-t">
                        <Td className="font-mono text-xs">{String(o._id || o.id || "—")}</Td>
                        <Td className="capitalize">{String(o.website || o.segment || "—")}</Td>
                        <Td className="capitalize">{normStatus(o.status).replaceAll("_", " ")}</Td>
                        <Td className="text-right">{fmtCurrency(getAmount(o))}</Td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>

              {filtered.length > 50 ? (
                <div className="p-3 text-xs text-muted-foreground border-t">
                  Showing first 50 rows (export CSV to get full data).
                </div>
              ) : null}
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}

/** UI */
function Kpi({ title, value, icon: Icon }: { title: string; value: string; icon: any }) {
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

function Th({ children, className }: any) {
  return <th className={cn("p-4 font-semibold text-muted-foreground", className)}>{children}</th>;
}
function Td({ children, className }: any) {
  return <td className={cn("p-4 align-top", className)}>{children}</td>;
}
