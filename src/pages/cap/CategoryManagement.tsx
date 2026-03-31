// src/pages/admin/CategoryManagement.tsx
import { useEffect, useMemo, useRef, useState } from "react";
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
  Download,
  Eye,
  Pencil,
  Trash2,
  Power,
  Layers,
  Tag,
  Image as ImageIcon,
  CheckCircle,
  XCircle,
  Loader2,
  RefreshCcw,
  Upload,
  X,
} from "lucide-react";

/** ---------------------------
 * Types
 * -------------------------- */
type Segment = "all" | "affordable" | "midrange" | "luxury";
type CategoryStatus = "active" | "hidden" | "disabled";

type Category = {
  id: string;
  name: string;
  slug: string;
  segment: Segment;

  parentId?: string | null;
  description?: string;

  imageUrl?: string;
  imagePublicId?: string;

  status: CategoryStatus;
  order: number;

  showOnWebsite: boolean;
  showInNavbar: boolean;
  featured: boolean;
  allowProducts: boolean;

  seoTitle?: string;
  seoDescription?: string;
  seoKeywords?: string;

  createdAt: string;
  updatedAt: string;

  productCount: number;
};

type ListResponse = {
  success: boolean;
  message?: string;
  data: {
    items: Category[];
    stats: { total: number; active: number; hidden: number; disabled: number; featured: number };
    page: number;
    limit: number;
    totalItems: number;
  };
};

/** ---------------------------
 * Helpers
 * -------------------------- */
const fmtDate = (iso: string) => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString();
};

const slugify = (s: string) =>
  s
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");

const statusVariant = (s: CategoryStatus) => {
  switch (s) {
    case "active":
      return "default";
    case "hidden":
      return "secondary";
    case "disabled":
      return "destructive";
    default:
      return "secondary";
  }
};

/** ---------------------------
 * API
 * -------------------------- */
const API_BASE = "https://api.jsgallor.com/api/admin/categories";

function getAdminToken() {
  return localStorage.getItem("admin_token") || "";
}

async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getAdminToken();
  const headers: Record<string, string> = {
    ...(options.headers as any),
  };
  
  // Don't set Content-Type for FormData, let browser set it with boundary
  if (!(options.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }
  
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.message || "Request failed");
  return data as T;
}

function buildQuery(params: Record<string, any>) {
  const usp = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v === undefined || v === null) return;
    if (typeof v === "string" && v.trim() === "") return;
    usp.set(k, String(v));
  });
  const qs = usp.toString();
  return qs ? `?${qs}` : "";
}

/** ---------------------------
 * Page
 * -------------------------- */
export default function CategoryManagement() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [stats, setStats] = useState<{ total: number; active: number; hidden: number; disabled: number; featured: number }>({
    total: 0,
    active: 0,
    hidden: 0,
    disabled: 0,
    featured: 0,
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");

  // filters
  const [q, setQ] = useState("");
  const [segment, setSegment] = useState<Segment>("all");
  const [status, setStatus] = useState<CategoryStatus | "all">("all");
  const [level, setLevel] = useState<"all" | "parent" | "child">("all");
  const [sort, setSort] = useState<"newest" | "oldest" | "az" | "order" | "most_products">("order");

  const [page, setPage] = useState(1);
  const limit = 50;
  const [totalItems, setTotalItems] = useState(0);

  // dialogs
  const [openCreate, setOpenCreate] = useState(false);
  const [openView, setOpenView] = useState<Category | null>(null);
  const [openEdit, setOpenEdit] = useState<Category | null>(null);

  // debounce search
  const [qDebounced, setQDebounced] = useState(q);
  useEffect(() => {
    const t = setTimeout(() => setQDebounced(q), 350);
    return () => clearTimeout(t);
  }, [q]);

  const abortRef = useRef<AbortController | null>(null);

  const fetchCategories = async (nextPage = page) => {
    setLoading(true);
    setError("");
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const qs = buildQuery({
        q: qDebounced,
        segment,
        status,
        level,
        sort,
        page: nextPage,
        limit,
      });

      const res = await apiFetch<ListResponse>(`${qs}`, { method: "GET" });

      setCategories(res.data.items);
      setStats(res.data.stats);
      setTotalItems(res.data.totalItems);
      setPage(res.data.page);
    } catch (e: any) {
      setError(e?.message || "Failed to load categories");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setPage(1);
    fetchCategories(1);
  }, [qDebounced, segment, status, level, sort]);

  const parents = useMemo(() => categories.filter((c) => !c.parentId), [categories]);

  const parentName = (parentId?: string | null) =>
    parentId ? categories.find((c) => c.id === parentId)?.name || "—" : "—";

  const exportCSV = () => {
    const qs = buildQuery({ q: qDebounced, segment, status, level, sort });
    const url = `${API_BASE}/export${qs}`;

    const a = document.createElement("a");
    a.href = url;
    a.download = `categories-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();

    toast({ title: "Export Started", description: "Downloading CSV from server..." });
  };

  const toggleDisabled = async (id: string) => {
    try {
      await apiFetch<{ success: boolean; message?: string; data: { id: string; status: CategoryStatus } }>(
        `/${id}/toggle-disabled`,
        { method: "PATCH" }
      );
      toast({ title: "Updated", description: "Category status updated." });
      fetchCategories(page);
    } catch (e: any) {
      toast({ title: "Failed", description: e?.message || "Unable to update status", variant: "destructive" });
    }
  };

  const deleteCategory = async (id: string) => {
    try {
      await apiFetch<{ success: boolean; message?: string; data?: any }>(`/${id}`, { method: "DELETE" });
      toast({ title: "Deleted", description: "Category deleted.", variant: "destructive" });
      
      const nextTotal = Math.max(0, totalItems - 1);
      const maxPage = Math.max(1, Math.ceil(nextTotal / limit));
      const nextPage = Math.min(page, maxPage);
      fetchCategories(nextPage);
    } catch (e: any) {
      toast({ title: "Cannot delete", description: e?.message || "Delete failed", variant: "destructive" });
    }
  };

  return (
    <AdminLayout panelType="cap">
      <div className="p-6 space-y-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold">Category Management</h1>
            <p className="text-sm text-muted-foreground">
              Create and organize product categories across segments with visibility and SEO controls.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => fetchCategories(page)} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCcw className="h-4 w-4 mr-2" />}
              Refresh
            </Button>
            <Button variant="outline" onClick={exportCSV}>
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
            <Button onClick={() => setOpenCreate(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Category
            </Button>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <StatCard icon={Layers} label="Total Categories" value={stats.total} />
          <StatCard icon={CheckCircle} label="Active" value={stats.active} />
          <StatCard icon={XCircle} label="Hidden" value={stats.hidden} />
          <StatCard icon={Power} label="Disabled" value={stats.disabled} />
          <StatCard icon={Tag} label="Featured" value={stats.featured} />
        </div>

        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="relative w-full lg:max-w-md">
                <Search className="h-4 w-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                <Input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Search by name or slug..."
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
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="hidden">Hidden</SelectItem>
                    <SelectItem value="disabled">Disabled</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={level} onValueChange={(v) => setLevel(v as any)}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Level" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="parent">Parent</SelectItem>
                    <SelectItem value="child">Child</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={sort} onValueChange={(v) => setSort(v as any)}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Sort" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="order">Custom Order</SelectItem>
                    <SelectItem value="newest">Newest</SelectItem>
                    <SelectItem value="oldest">Oldest</SelectItem>
                    <SelectItem value="az">A–Z</SelectItem>
                    <SelectItem value="most_products">Most Products</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {error ? (
              <div className="mt-3 text-sm text-destructive">{error}</div>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/40">
                  <tr className="text-left">
                    <Th>Name</Th>
                    <Th>Slug</Th>
                    <Th>Segment</Th>
                    <Th>Parent</Th>
                    <Th className="text-center">Products</Th>
                    <Th>Status</Th>
                    <Th className="text-center">Order</Th>
                    <Th>Updated</Th>
                    <Th className="text-right pr-4">Actions</Th>
                   </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={9} className="p-8 text-center text-muted-foreground">
                        <div className="inline-flex items-center gap-2">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Loading categories...
                        </div>
                      </td>
                    </tr>
                  ) : categories.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="p-6 text-center text-muted-foreground">
                        No categories found.
                      </td>
                    </tr>
                  ) : (
                    categories.map((c) => (
                      <tr key={c.id} className="border-t">
                        <Td>
                          <div className="font-medium flex items-center gap-2">
                            {c.imageUrl ? (
                              <img
                                src={c.imageUrl}
                                alt={c.name}
                                className="h-7 w-7 rounded-md object-cover border"
                              />
                            ) : (
                              <div className="h-7 w-7 rounded-md border flex items-center justify-center text-muted-foreground">
                                <ImageIcon className="h-4 w-4" />
                              </div>
                            )}
                            <span>{c.name}</span>
                            {c.featured ? (
                              <Badge variant="secondary" className="ml-1">
                                Featured
                              </Badge>
                            ) : null}
                          </div>
                          <div className="text-xs text-muted-foreground mt-0.5">ID: {c.id}</div>
                        </Td>
                        <Td className="font-mono text-xs">{c.slug}</Td>
                        <Td className="capitalize">{c.segment}</Td>
                        <Td>{parentName(c.parentId)}</Td>
                        <Td className="text-center">{c.productCount}</Td>
                        <Td>
                          <Badge variant={statusVariant(c.status) as any}>
                            {c.status.toUpperCase()}
                          </Badge>
                        </Td>
                        <Td className="text-center">{c.order}</Td>
                        <Td className="whitespace-nowrap text-xs">{fmtDate(c.updatedAt)}</Td>
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
                              title={c.status === "disabled" ? "Enable" : "Disable"}
                              onClick={() => toggleDisabled(c.id)}
                            >
                              <Power className="h-4 w-4" />
                            </Button>
                            <Button size="icon" variant="ghost" title="Delete" onClick={() => deleteCategory(c.id)}>
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

            <div className="flex items-center justify-between p-4 border-t text-sm">
              <div className="text-muted-foreground">
                Showing <span className="font-medium">{categories.length}</span> of{" "}
                <span className="font-medium">{totalItems}</span>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={loading || page <= 1}
                  onClick={() => fetchCategories(page - 1)}
                >
                  Prev
                </Button>
                <div className="text-muted-foreground">
                  Page <span className="font-medium">{page}</span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={loading || page >= Math.max(1, Math.ceil(totalItems / limit))}
                  onClick={() => fetchCategories(page + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <CategoryFormDialog
          open={openCreate}
          onOpenChange={setOpenCreate}
          title="Create Category"
          initial={null}
          parents={parents}
          onSave={async (formData) => {
            try {
              await apiFetch<{ success: boolean; message?: string; data?: any }>(``, {
                method: "POST",
                body: formData,
              });
              toast({ title: "Created", description: "Category created successfully." });
              setOpenCreate(false);
              fetchCategories(1);
            } catch (e: any) {
              toast({ title: "Create failed", description: e?.message || "Unable to create", variant: "destructive" });
            }
          }}
        />

        <CategoryFormDialog
          open={!!openEdit}
          onOpenChange={(v) => !v && setOpenEdit(null)}
          title="Edit Category"
          initial={openEdit}
          parents={parents.filter((p) => p.id !== openEdit?.id)}
          onSave={async (formData) => {
            if (!openEdit) return;
            try {
              await apiFetch<{ success: boolean; message?: string; data?: any }>(`/${openEdit.id}`, {
                method: "PUT",
                body: formData,
              });
              toast({ title: "Updated", description: "Category updated successfully." });
              setOpenEdit(null);
              fetchCategories(page);
            } catch (e: any) {
              toast({ title: "Update failed", description: e?.message || "Unable to update", variant: "destructive" });
            }
          }}
        />

        <Dialog open={!!openView} onOpenChange={(v) => !v && setOpenView(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Category Details</DialogTitle>
            </DialogHeader>

            {openView && (
              <div className="space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex gap-3">
                    {openView.imageUrl && (
                      <img
                        src={openView.imageUrl}
                        alt={openView.name}
                        className="h-16 w-16 rounded-md object-cover border"
                      />
                    )}
                    <div>
                      <div className="text-xl font-semibold">{openView.name}</div>
                      <div className="text-sm text-muted-foreground">
                        /{openView.slug} • {openView.segment.toUpperCase()}
                      </div>
                    </div>
                  </div>
                  <Badge variant={statusVariant(openView.status) as any}>
                    {openView.status.toUpperCase()}
                  </Badge>
                </div>

                <Card>
                  <CardContent className="p-4 grid gap-3 sm:grid-cols-2">
                    <Info label="Parent" value={parentName(openView.parentId)} />
                    <Info label="Products" value={String(openView.productCount)} />
                    <Info label="Order" value={String(openView.order)} />
                    <Info
                      label="Visibility"
                      value={[
                        openView.showOnWebsite ? "Website" : "",
                        openView.showInNavbar ? "Navbar" : "",
                        openView.featured ? "Featured" : "",
                      ].filter(Boolean).join(", ") || "—"}
                    />
                    <Info label="Allow Products" value={openView.allowProducts ? "YES" : "NO"} />
                    <Info label="Updated" value={fmtDate(openView.updatedAt)} />
                  </CardContent>
                </Card>

                {openView.description ? (
                  <div>
                    <Label className="text-xs">Description</Label>
                    <div className="text-sm text-muted-foreground mt-1">{openView.description}</div>
                  </div>
                ) : null}

                <Card>
                  <CardContent className="p-4 space-y-2">
                    <div className="font-medium">SEO</div>
                    <div className="grid gap-2 sm:grid-cols-2">
                      <Info label="SEO Title" value={openView.seoTitle || "—"} />
                      <Info label="SEO Keywords" value={openView.seoKeywords || "—"} />
                    </div>
                    <Info label="SEO Description" value={openView.seoDescription || "—"} />
                  </CardContent>
                </Card>
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
 * Form Dialog with Image Upload
 * -------------------------- */
function CategoryFormDialog({
  open,
  onOpenChange,
  title,
  initial,
  parents,
  onSave,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  title: string;
  initial: Category | null;
  parents: Category[];
  onSave: (formData: FormData) => void | Promise<void>;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [slug, setSlug] = useState(initial?.slug ?? "");
  const [segment, setSegment] = useState<Segment>(initial?.segment ?? "all");
  const [parentId, setParentId] = useState<string>(initial?.parentId ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [imagePreview, setImagePreview] = useState<string>(initial?.imageUrl ?? "");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const [status, setStatus] = useState<CategoryStatus>(initial?.status ?? "active");
  const [order, setOrder] = useState<number>(initial?.order ?? 0);

  const [showOnWebsite, setShowOnWebsite] = useState<boolean>(initial?.showOnWebsite ?? true);
  const [showInNavbar, setShowInNavbar] = useState<boolean>(initial?.showInNavbar ?? false);
  const [featured, setFeatured] = useState<boolean>(initial?.featured ?? false);
  const [allowProducts, setAllowProducts] = useState<boolean>(initial?.allowProducts ?? true);

  const [seoTitle, setSeoTitle] = useState(initial?.seoTitle ?? "");
  const [seoDescription, setSeoDescription] = useState(initial?.seoDescription ?? "");
  const [seoKeywords, setSeoKeywords] = useState(initial?.seoKeywords ?? "");

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;

    setName(initial?.name ?? "");
    setSlug(initial?.slug ?? "");
    setSegment(initial?.segment ?? "all");
    setParentId(initial?.parentId ?? "");
    setDescription(initial?.description ?? "");
    setImagePreview(initial?.imageUrl ?? "");
    setImageFile(null);

    setStatus(initial?.status ?? "active");
    setOrder(initial?.order ?? 0);

    setShowOnWebsite(initial?.showOnWebsite ?? true);
    setShowInNavbar(initial?.showInNavbar ?? false);
    setFeatured(initial?.featured ?? false);
    setAllowProducts(initial?.allowProducts ?? true);

    setSeoTitle(initial?.seoTitle ?? "");
    setSeoDescription(initial?.seoDescription ?? "");
    setSeoKeywords(initial?.seoKeywords ?? "");
  }, [open, initial?.id]);

  useEffect(() => {
    if (!open) return;
    if (initial?.id) return;
    setSlug(slugify(name));
  }, [name, open, initial?.id]);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!allowedTypes.includes(file.type)) {
      toast({ title: "Invalid file type", description: "Please upload JPEG, PNG, WEBP, or GIF images only.", variant: "destructive" });
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "File too large", description: "Maximum file size is 5MB.", variant: "destructive" });
      return;
    }

    setImageFile(file);
    
    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const removeImage = () => {
    setImageFile(null);
    setImagePreview("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const submit = async () => {
    if (!name.trim() || name.trim().length < 2) {
      toast({ title: "Invalid name", description: "Category name must be at least 2 characters." });
      return;
    }
    const cleanSlug = slugify(slug);
    if (!cleanSlug || cleanSlug.length < 2) {
      toast({ title: "Invalid slug", description: "Slug must be valid (letters/numbers/hyphens)." });
      return;
    }

    setUploading(true);

    try {
      // Create FormData for multipart upload
      const formData = new FormData();
      formData.append("name", name.trim());
      formData.append("slug", cleanSlug);
      formData.append("segment", segment);
      if (parentId) formData.append("parentId", parentId);
      if (description.trim()) formData.append("description", description.trim());
      formData.append("status", status);
      formData.append("order", String(order));
      formData.append("showOnWebsite", String(showOnWebsite));
      formData.append("showInNavbar", String(showInNavbar));
      formData.append("featured", String(featured));
      formData.append("allowProducts", String(allowProducts));
      if (seoTitle.trim()) formData.append("seoTitle", seoTitle.trim());
      if (seoDescription.trim()) formData.append("seoDescription", seoDescription.trim());
      if (seoKeywords.trim()) formData.append("seoKeywords", seoKeywords.trim());
      
      // Add image file if present
      if (imageFile) {
        formData.append("image", imageFile);
      } else if (initial?.imageUrl && !imageFile && imagePreview === "") {
        // If image was removed, send empty string to delete it
        formData.append("imageUrl", "");
      }

      await onSave(formData);
    } catch (error) {
      console.error("Submit error:", error);
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 lg:grid-cols-2">
          {/* Left: Basics */}
          <div className="space-y-3">
            <div>
              <Label>Category Name*</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Fresh Fruits" />
            </div>

            <div>
              <Label>Slug*</Label>
              <Input value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="fresh-fruits" />
              <p className="text-xs text-muted-foreground mt-1">Auto-generated from name (editable).</p>
            </div>

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
                <Label>Parent Category</Label>
                <Select value={parentId || "none"} onValueChange={(v) => setParentId(v === "none" ? "" : v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="None (Parent)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None (Parent)</SelectItem>
                    {parents.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label>Short Description</Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Seasonal fruits and daily essentials."
              />
            </div>

            {/* Image Upload Section */}
            <div>
              <Label>Category Image</Label>
              <div className="mt-2">
                {imagePreview ? (
                  <div className="relative inline-block">
                    <img
                      src={imagePreview}
                      alt="Category preview"
                      className="h-32 w-32 rounded-md object-cover border"
                    />
                    <button
                      type="button"
                      onClick={removeImage}
                      className="absolute -top-2 -right-2 p-1 bg-destructive text-destructive-foreground rounded-full hover:bg-destructive/90"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ) : (
                  <div
                    className="border-2 border-dashed rounded-md p-6 text-center cursor-pointer hover:border-primary transition-colors"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground">
                      Click to upload or drag and drop
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      JPEG, PNG, WEBP, GIF up to 5MB
                    </p>
                  </div>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  onChange={handleImageSelect}
                  className="hidden"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Status</Label>
                <Select value={status} onValueChange={(v) => setStatus(v as CategoryStatus)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="hidden">Hidden</SelectItem>
                    <SelectItem value="disabled">Disabled</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Display Order</Label>
                <Input type="number" value={order} onChange={(e) => setOrder(Number(e.target.value))} />
              </div>
            </div>
          </div>

          {/* Right: Visibility + SEO */}
          <div className="space-y-3">
            <Card>
              <CardContent className="p-4 space-y-3">
                <div className="font-medium">Visibility & Rules</div>

                <ToggleRow label="Show on Website" value={showOnWebsite} onChange={setShowOnWebsite} />
                <ToggleRow label="Show in Navbar" value={showInNavbar} onChange={setShowInNavbar} />
                <ToggleRow label="Featured Category" value={featured} onChange={setFeatured} />
                <ToggleRow label="Allow Products Under Category" value={allowProducts} onChange={setAllowProducts} />
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4 space-y-3">
                <div className="font-medium">SEO</div>

                <div>
                  <Label>SEO Title</Label>
                  <Input value={seoTitle} onChange={(e) => setSeoTitle(e.target.value)} placeholder="Fresh Fruits Online" />
                </div>

                <div>
                  <Label>SEO Description</Label>
                  <Textarea
                    value={seoDescription}
                    onChange={(e) => setSeoDescription(e.target.value)}
                    placeholder="Shop premium fresh fruits with fast delivery."
                  />
                </div>

                <div>
                  <Label>SEO Keywords (comma separated)</Label>
                  <Input
                    value={seoKeywords}
                    onChange={(e) => setSeoKeywords(e.target.value)}
                    placeholder="fruits, fresh, seasonal"
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={uploading}>
            {uploading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {initial ? "Save Changes" : "Create Category"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ToggleRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="text-sm">{label}</div>
      <Button
        type="button"
        variant={value ? "default" : "outline"}
        size="sm"
        onClick={() => onChange(!value)}
      >
        {value ? "ON" : "OFF"}
      </Button>
    </div>
  );
}