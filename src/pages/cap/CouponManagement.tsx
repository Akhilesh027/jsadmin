// src/pages/admin/CouponManagement.tsx
import { useEffect, useMemo, useState } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { toast } from "@/hooks/use-toast";
import {
  Plus,
  Search,
  Filter,
  Ticket,
  Calendar,
  CheckCircle,
  XCircle,
  Clock,
  Eye,
  Pencil,
  Trash2,
  Download,
  Power,
  Loader2,
} from "lucide-react";

/** ---------------------------
 * Types (Frontend uses segment, Backend uses website)
 * We'll map segment <-> website
 * -------------------------- */
type Segment = "all" | "affordable" | "midrange" | "luxury";
type CouponType = "percentage" | "flat" | "free_shipping";
type CouponStatus = "draft" | "active" | "scheduled" | "expired" | "disabled";
type Visibility = "public" | "private";

type Coupon = {
  id: string; // mapped from backend _id
  code: string;
  title: string;
  description?: string;

  segment: Segment; // mapped from backend website
  visibility: Visibility;

  type: CouponType;
  value: number;
  maxDiscount?: number;

  minOrder?: number;
  startAt: string; // ISO
  endAt: string; // ISO

  totalLimit?: number;
  perUserLimit?: number;
  usedCount: number;

  status: CouponStatus;
  updatedAt: string;
};

/** ---------------------------
 * API
 * -------------------------- */
const API_BASE = "https://api.jsgallor.com/api/admin/coupons";

function getToken() {
  return localStorage.getItem("Admintoken");
}

async function apiFetch(path: string, options: RequestInit = {}) {
  const token = getToken();
  const headers: any = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.message || "Request failed");
  return data;
}

// backend: website <-> frontend: segment
const toSegment = (website: any): Segment =>
  (website === "affordable" || website === "midrange" || website === "luxury" || website === "all")
    ? website
    : "all";

const toWebsite = (segment: Segment) => segment;

const mapFromBackend = (c: any): Coupon => ({
  id: c._id,
  code: c.code,
  title: c.title,
  description: c.description,
  segment: toSegment(c.website),
  visibility: c.visibility,
  type: c.type,
  value: Number(c.value || 0),
  maxDiscount: c.maxDiscount ?? undefined,
  minOrder: c.minOrder ?? undefined,
  startAt: new Date(c.startAt).toISOString(),
  endAt: new Date(c.endAt).toISOString(),
  totalLimit: c.totalLimit ?? undefined,
  perUserLimit: c.perUserLimit ?? undefined,
  usedCount: Number(c.usedCount || 0),
  status: c.status,
  updatedAt: new Date(c.updatedAt || c.updatedAt).toISOString(),
});

/** ---------------------------
 * Helpers
 * -------------------------- */
const fmtDate = (iso: string) => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString();
};

const fmtCurrency = (n?: number) =>
  typeof n === "number" ? `₹${n.toLocaleString("en-IN")}` : "—";

const typeLabel = (t: CouponType) => {
  if (t === "percentage") return "Percentage";
  if (t === "flat") return "Flat";
  return "Free Shipping";
};

const statusBadgeVariant = (s: CouponStatus) => {
  switch (s) {
    case "active":
      return "default";
    case "scheduled":
      return "secondary";
    case "expired":
      return "outline";
    case "disabled":
      return "destructive";
    default:
      return "secondary";
  }
};

const normalizeCode = (code: string) =>
  code
    .toUpperCase()
    .replace(/\s+/g, "")
    .replace(/[^A-Z0-9_-]/g, "");

/** ---------------------------
 * Page
 * -------------------------- */
export default function CouponManagement() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(false);

  // filters
  const [q, setQ] = useState("");
  const [segment, setSegment] = useState<Segment>("all");
  const [status, setStatus] = useState<CouponStatus | "all">("all");
  const [type, setType] = useState<CouponType | "all">("all");
  const [visibility, setVisibility] = useState<Visibility | "all">("all");

  // dialogs
  const [openCreate, setOpenCreate] = useState(false);
  const [openView, setOpenView] = useState<Coupon | null>(null);
  const [openEdit, setOpenEdit] = useState<Coupon | null>(null);

  const fetchCoupons = async () => {
    setLoading(true);
    try {
      // backend supports filters too; but we keep filtering locally for fast UI
      const data = await apiFetch("", { method: "GET" });
      const list = Array.isArray(data?.coupons) ? data.coupons.map(mapFromBackend) : [];
      setCoupons(list);
    } catch (err: any) {
      toast({
        title: "Failed to load coupons",
        description: err?.message || "Check server and route /api/admin/coupons",
        variant: "destructive",
      });
      setCoupons([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCoupons();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    return coupons
      .filter((c) => {
        if (segment !== "all" && c.segment !== segment) return false;
        if (status !== "all" && c.status !== status) return false;
        if (type !== "all" && c.type !== type) return false;
        if (visibility !== "all" && c.visibility !== visibility) return false;
        if (!query) return true;
        return (
          c.code.toLowerCase().includes(query) ||
          c.title.toLowerCase().includes(query)
        );
      })
      .sort((a, b) => +new Date(b.updatedAt) - +new Date(a.updatedAt));
  }, [coupons, q, segment, status, type, visibility]);

  const stats = useMemo(() => {
    const now = Date.now();
    const active = coupons.filter((c) => c.status === "active").length;
    const scheduled = coupons.filter((c) => c.status === "scheduled").length;
    const expired = coupons.filter((c) => c.status === "expired").length;

    const totalRedemptions = coupons.reduce((sum, c) => sum + c.usedCount, 0);

    const endingSoon = coupons.filter((c) => {
      const end = +new Date(c.endAt);
      return end > now && end < now + 3 * 864e5 && c.status === "active";
    }).length;

    return { active, scheduled, expired, totalRedemptions, endingSoon };
  }, [coupons]);

  const exportCSV = () => {
    const headers = [
      "code",
      "title",
      "segment",
      "visibility",
      "type",
      "value",
      "maxDiscount",
      "minOrder",
      "startAt",
      "endAt",
      "totalLimit",
      "perUserLimit",
      "usedCount",
      "status",
      "updatedAt",
    ];
    const rows = filtered.map((c) =>
      headers
        .map((h) => {
          // @ts-expect-error
          const v = c[h];
          return `"${String(v ?? "").replace(/"/g, '""')}"`;
        })
        .join(",")
    );
    const csv = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `coupons-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);

    toast({ title: "Exported", description: "Coupon list exported as CSV." });
  };

  const disableCoupon = async (id: string) => {
    try {
      await apiFetch(`/${id}/disable`, { method: "PATCH" });
      toast({ title: "Disabled", description: "Coupon has been disabled." });
      fetchCoupons();
    } catch (err: any) {
      toast({
        title: "Disable failed",
        description: err?.message || "Unable to disable coupon",
        variant: "destructive",
      });
    }
  };

  const deleteCoupon = async (id: string) => {
    try {
      await apiFetch(`/${id}`, { method: "DELETE" });
      toast({ title: "Deleted", description: "Coupon removed.", variant: "destructive" });
      fetchCoupons();
    } catch (err: any) {
      toast({
        title: "Delete failed",
        description: err?.message || "Unable to delete coupon",
        variant: "destructive",
      });
    }
  };

  return (
    // ✅ Core Admin sidebar (CAP)
    <AdminLayout panelType="cap">
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold">Coupon Management</h1>
            <p className="text-sm text-muted-foreground">
              Create, schedule, restrict, and track coupon usage across segments.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={exportCSV} disabled={loading}>
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
            <Button onClick={() => setOpenCreate(true)} disabled={loading}>
              <Plus className="h-4 w-4 mr-2" />
              Create Coupon
            </Button>
            <Button variant="outline" onClick={fetchCoupons} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Refresh"}
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <StatCard icon={CheckCircle} label="Active" value={stats.active} />
          <StatCard icon={Clock} label="Scheduled" value={stats.scheduled} />
          <StatCard icon={XCircle} label="Expired" value={stats.expired} />
          <StatCard icon={Ticket} label="Total Redemptions" value={stats.totalRedemptions} />
          <StatCard icon={Calendar} label="Ending Soon (3 days)" value={stats.endingSoon} />
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="relative w-full lg:max-w-md">
                <Search className="h-4 w-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                <Input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Search by code or title..."
                  className="pl-9"
                />
              </div>

              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4 lg:gap-3">
                <Select value={segment} onValueChange={(v) => setSegment(v as Segment)}>
                  <SelectTrigger className="w-full">
                    <Filter className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="Segment" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Segments</SelectItem>
                    <SelectItem value="affordable">Affordable</SelectItem>
                    <SelectItem value="midrange">Midrange</SelectItem>
                    <SelectItem value="luxury">Luxury</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={status} onValueChange={(v) => setStatus(v as any)}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="scheduled">Scheduled</SelectItem>
                    <SelectItem value="expired">Expired</SelectItem>
                    <SelectItem value="disabled">Disabled</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={type} onValueChange={(v) => setType(v as any)}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="percentage">Percentage</SelectItem>
                    <SelectItem value="flat">Flat</SelectItem>
                    <SelectItem value="free_shipping">Free Shipping</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={visibility} onValueChange={(v) => setVisibility(v as any)}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Visibility" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Visibility</SelectItem>
                    <SelectItem value="public">Public</SelectItem>
                    <SelectItem value="private">Private</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Table */}
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/40">
                  <tr className="text-left">
                    <Th>Code</Th>
                    <Th>Type</Th>
                    <Th>Value</Th>
                    <Th>Status</Th>
                    <Th>Validity</Th>
                    <Th>Usage</Th>
                    <Th>Min Order</Th>
                    <Th>Segment</Th>
                    <Th>Visibility</Th>
                    <Th className="text-right pr-4">Actions</Th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={10} className="p-6 text-center text-muted-foreground">
                        Loading coupons...
                      </td>
                    </tr>
                  ) : filtered.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="p-6 text-center text-muted-foreground">
                        No coupons found.
                      </td>
                    </tr>
                  ) : (
                    filtered.map((c) => (
                      <tr key={c.id} className="border-t">
                        <Td>
                          <div className="font-medium">{c.code}</div>
                          <div className="text-xs text-muted-foreground">{c.title}</div>
                        </Td>
                        <Td>{typeLabel(c.type)}</Td>
                        <Td>
                          {c.type === "percentage"
                            ? `${c.value}%`
                            : c.type === "flat"
                              ? fmtCurrency(c.value)
                              : "Free"}
                          {c.type === "percentage" && c.maxDiscount ? (
                            <div className="text-xs text-muted-foreground">
                              Max {fmtCurrency(c.maxDiscount)}
                            </div>
                          ) : null}
                        </Td>
                        <Td>
                          <Badge variant={statusBadgeVariant(c.status) as any}>
                            {c.status.toUpperCase()}
                          </Badge>
                        </Td>
                        <Td className="whitespace-nowrap">
                          <div className="text-xs">{fmtDate(c.startAt)}</div>
                          <div className="text-xs text-muted-foreground">→ {fmtDate(c.endAt)}</div>
                        </Td>
                        <Td>
                          <div className="font-medium">{c.usedCount}</div>
                          <div className="text-xs text-muted-foreground">
                            Limit {typeof c.totalLimit === "number" ? c.totalLimit : "∞"}
                          </div>
                        </Td>
                        <Td>{fmtCurrency(c.minOrder)}</Td>
                        <Td className="capitalize">{c.segment}</Td>
                        <Td className="capitalize">{c.visibility}</Td>
                        <Td className="text-right pr-4">
                          <div className="inline-flex items-center gap-2">
                            <Button size="icon" variant="ghost" title="View" onClick={() => setOpenView(c)}>
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button size="icon" variant="ghost" title="Edit" onClick={() => setOpenEdit(c)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              title="Disable"
                              onClick={() => disableCoupon(c.id)}
                              disabled={c.status === "disabled"}
                            >
                              <Power className="h-4 w-4" />
                            </Button>
                            <Button size="icon" variant="ghost" title="Delete" onClick={() => deleteCoupon(c.id)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </Td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Create */}
        <CouponFormDialog
          open={openCreate}
          onOpenChange={setOpenCreate}
          title="Create Coupon"
          initial={null}
          onSave={async (payload) => {
            try {
              // map segment -> website
              const body = {
                ...payload,
                website: toWebsite(payload.segment),
              };
              // remove segment from payload for backend
              delete (body as any).segment;

              await apiFetch("", { method: "POST", body: JSON.stringify(body) });
              toast({ title: "Created", description: "Coupon created successfully." });
              setOpenCreate(false);
              fetchCoupons();
            } catch (err: any) {
              toast({
                title: "Create failed",
                description: err?.message || "Unable to create coupon",
                variant: "destructive",
              });
            }
          }}
        />

        {/* Edit */}
        <CouponFormDialog
          open={!!openEdit}
          onOpenChange={(v) => !v && setOpenEdit(null)}
          title="Edit Coupon"
          initial={openEdit}
          onSave={async (payload) => {
            if (!openEdit) return;
            try {
              const body = { ...payload, website: toWebsite(payload.segment) };
              delete (body as any).segment;

              await apiFetch(`/${openEdit.id}`, {
                method: "PUT",
                body: JSON.stringify(body),
              });
              toast({ title: "Updated", description: "Coupon updated successfully." });
              setOpenEdit(null);
              fetchCoupons();
            } catch (err: any) {
              toast({
                title: "Update failed",
                description: err?.message || "Unable to update coupon",
                variant: "destructive",
              });
            }
          }}
        />

        {/* View */}
        <Dialog open={!!openView} onOpenChange={(v) => !v && setOpenView(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Coupon Details</DialogTitle>
            </DialogHeader>

            {openView && (
              <div className="space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-xl font-semibold">{openView.code}</div>
                    <div className="text-sm text-muted-foreground">{openView.title}</div>
                  </div>
                  <Badge variant={statusBadgeVariant(openView.status) as any}>
                    {openView.status.toUpperCase()}
                  </Badge>
                </div>

                <Card>
                  <CardContent className="p-4 grid gap-3 sm:grid-cols-2">
                    <Info label="Type" value={typeLabel(openView.type)} />
                    <Info
                      label="Value"
                      value={
                        openView.type === "percentage"
                          ? `${openView.value}%`
                          : openView.type === "flat"
                            ? fmtCurrency(openView.value)
                            : "Free Shipping"
                      }
                    />
                    <Info label="Max Discount" value={fmtCurrency(openView.maxDiscount)} />
                    <Info label="Min Order" value={fmtCurrency(openView.minOrder)} />
                    <Info label="Segment" value={openView.segment.toUpperCase()} />
                    <Info label="Visibility" value={openView.visibility.toUpperCase()} />
                    <Info label="Validity" value={`${fmtDate(openView.startAt)} → ${fmtDate(openView.endAt)}`} />
                    <Info
                      label="Usage"
                      value={`${openView.usedCount} / ${typeof openView.totalLimit === "number" ? openView.totalLimit : "∞"}`}
                    />
                  </CardContent>
                </Card>

                {openView.description ? (
                  <div>
                    <Label className="text-xs">Description</Label>
                    <div className="text-sm text-muted-foreground mt-1">{openView.description}</div>
                  </div>
                ) : null}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}

/** ---------------------------
 * Small UI pieces
 * -------------------------- */
function StatCard({ icon: Icon, label, value }: { icon: any; label: string; value: number }) {
  return (
    <Card>
      <CardContent className="p-4 flex items-center gap-3">
        <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <div className="text-xs text-muted-foreground">{label}</div>
          <div className="text-xl font-semibold">{value}</div>
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

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-sm font-medium">{value || "—"}</div>
    </div>
  );
}

/** ---------------------------
 * Form Dialog
 * -------------------------- */
type CouponFormPayload = Omit<Coupon, "id" | "usedCount" | "updatedAt">;

function CouponFormDialog({
  open,
  onOpenChange,
  title,
  initial,
  onSave,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  title: string;
  initial: Coupon | null;
  onSave: (payload: CouponFormPayload) => void;
}) {
  const [code, setCode] = useState(initial?.code ?? "");
  const [couponTitle, setCouponTitle] = useState(initial?.title ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");

  const [segment, setSegment] = useState<Segment>(initial?.segment ?? "all");
  const [visibility, setVisibility] = useState<Visibility>(initial?.visibility ?? "private");
  const [status, setStatus] = useState<CouponStatus>(initial?.status ?? "draft");

  const [type, setType] = useState<CouponType>(initial?.type ?? "flat");
  const [value, setValue] = useState<number>(initial?.value ?? 0);
  const [maxDiscount, setMaxDiscount] = useState<number>(initial?.maxDiscount ?? 0);

  const [minOrder, setMinOrder] = useState<number>(initial?.minOrder ?? 0);

  const [startAt, setStartAt] = useState<string>(
    initial?.startAt ? initial.startAt.slice(0, 16) : new Date().toISOString().slice(0, 16)
  );
  const [endAt, setEndAt] = useState<string>(
    initial?.endAt
      ? initial.endAt.slice(0, 16)
      : new Date(Date.now() + 7 * 864e5).toISOString().slice(0, 16)
  );

  const [totalLimit, setTotalLimit] = useState<number>(initial?.totalLimit ?? 0);
  const [perUserLimit, setPerUserLimit] = useState<number>(initial?.perUserLimit ?? 0);

  useEffect(() => {
    if (!open) return;

    setCode(initial?.code ?? "");
    setCouponTitle(initial?.title ?? "");
    setDescription(initial?.description ?? "");

    setSegment(initial?.segment ?? "all");
    setVisibility(initial?.visibility ?? "private");
    setStatus(initial?.status ?? "draft");

    setType(initial?.type ?? "flat");
    setValue(initial?.value ?? 0);
    setMaxDiscount(initial?.maxDiscount ?? 0);

    setMinOrder(initial?.minOrder ?? 0);

    setStartAt(initial?.startAt ? initial.startAt.slice(0, 16) : new Date().toISOString().slice(0, 16));
    setEndAt(
      initial?.endAt
        ? initial.endAt.slice(0, 16)
        : new Date(Date.now() + 7 * 864e5).toISOString().slice(0, 16)
    );

    setTotalLimit(initial?.totalLimit ?? 0);
    setPerUserLimit(initial?.perUserLimit ?? 0);
  }, [open, initial?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const submit = () => {
    const cleanCode = normalizeCode(code);
    if (!cleanCode || cleanCode.length < 3) {
      toast({ title: "Invalid code", description: "Coupon code must be at least 3 characters." });
      return;
    }
    if (!couponTitle.trim()) {
      toast({ title: "Missing title", description: "Coupon title is required." });
      return;
    }

    const startISO = new Date(startAt).toISOString();
    const endISO = new Date(endAt).toISOString();
    if (+new Date(endISO) <= +new Date(startISO)) {
      toast({ title: "Invalid dates", description: "End date must be after start date." });
      return;
    }

    if (type === "percentage" && (value <= 0 || value > 90)) {
      toast({ title: "Invalid %", description: "Percentage should be between 1 and 90." });
      return;
    }
    if (type === "flat" && value <= 0) {
      toast({ title: "Invalid amount", description: "Flat discount must be greater than 0." });
      return;
    }

    const payload: CouponFormPayload = {
      code: cleanCode,
      title: couponTitle.trim(),
      description: description.trim() || undefined,

      segment,
      visibility,

      type,
      value: type === "free_shipping" ? 0 : Number(value),
      maxDiscount: type === "percentage" && maxDiscount > 0 ? Number(maxDiscount) : undefined,

      minOrder: minOrder > 0 ? Number(minOrder) : undefined,
      startAt: startISO,
      endAt: endISO,

      totalLimit: totalLimit > 0 ? Number(totalLimit) : undefined,
      perUserLimit: perUserLimit > 0 ? Number(perUserLimit) : undefined,

      status,
    };

    onSave(payload);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 md:grid-cols-2">
          {/* Left */}
          <div className="space-y-3">
            <div>
              <Label>Coupon Code*</Label>
              <Input
                value={code}
                onChange={(e) => setCode(normalizeCode(e.target.value))}
                placeholder="WELCOME200"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Uppercase only (A-Z, 0-9, _ and - allowed).
              </p>
            </div>

            <div>
              <Label>Title*</Label>
              <Input value={couponTitle} onChange={(e) => setCouponTitle(e.target.value)} placeholder="Welcome Offer" />
            </div>

            <div>
              <Label>Description</Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Short terms and restrictions..."
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Status</Label>
                <Select value={status} onValueChange={(v) => setStatus(v as CouponStatus)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="scheduled">Scheduled</SelectItem>
                    <SelectItem value="expired">Expired</SelectItem>
                    <SelectItem value="disabled">Disabled</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Visibility</Label>
                <Select value={visibility} onValueChange={(v) => setVisibility(v as Visibility)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select visibility" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="public">Public</SelectItem>
                    <SelectItem value="private">Private</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Right */}
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Segment</Label>
                <Select value={segment} onValueChange={(v) => setSegment(v as Segment)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select segment" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="affordable">Affordable</SelectItem>
                    <SelectItem value="midrange">Midrange</SelectItem>
                    <SelectItem value="luxury">Luxury</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Discount Type*</Label>
                <Select value={type} onValueChange={(v) => setType(v as CouponType)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">Percentage</SelectItem>
                    <SelectItem value="flat">Flat Amount</SelectItem>
                    <SelectItem value="free_shipping">Free Shipping</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>{type === "percentage" ? "Value (%)" : type === "flat" ? "Value (₹)" : "Value"}</Label>
                <Input
                  type="number"
                  value={type === "free_shipping" ? 0 : value}
                  onChange={(e) => setValue(Number(e.target.value))}
                  disabled={type === "free_shipping"}
                />
              </div>

              <div>
                <Label>Max Discount (₹)</Label>
                <Input
                  type="number"
                  value={maxDiscount}
                  onChange={(e) => setMaxDiscount(Number(e.target.value))}
                  disabled={type !== "percentage"}
                  placeholder="Optional cap"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Min Order (₹)</Label>
                <Input
                  type="number"
                  value={minOrder}
                  onChange={(e) => setMinOrder(Number(e.target.value))}
                  placeholder="0 = none"
                />
              </div>
              <div>
                <Label>Total Usage Limit</Label>
                <Input
                  type="number"
                  value={totalLimit}
                  onChange={(e) => setTotalLimit(Number(e.target.value))}
                  placeholder="0 = unlimited"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Per User Limit</Label>
                <Input
                  type="number"
                  value={perUserLimit}
                  onChange={(e) => setPerUserLimit(Number(e.target.value))}
                  placeholder="0 = unlimited"
                />
              </div>
              <div className="text-xs text-muted-foreground pt-7">
                Timezone: <span className="font-medium">Asia/Kolkata</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Start Date & Time</Label>
                <Input type="datetime-local" value={startAt} onChange={(e) => setStartAt(e.target.value)} />
              </div>
              <div>
                <Label>End Date & Time</Label>
                <Input type="datetime-local" value={endAt} onChange={(e) => setEndAt(e.target.value)} />
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={submit}>{initial ? "Save Changes" : "Create Coupon"}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
