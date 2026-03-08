// src/pages/admin/LegalPagesManager.tsx
import { useEffect, useMemo, useState } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  FileText,
  Eye,
  Pencil,
  Trash2,
  Globe,
  Loader2,
  RefreshCw,
} from "lucide-react";

/** ---------------------------
 * Types
 * -------------------------- */
type Website = "affordable" | "midrange" | "luxury";

type PageType =
  | "privacy_policy"
  | "terms_conditions"
  | "refund_policy"
  | "shipping_policy"
  | "about"
  | "contact";

type PublishStatus = "draft" | "published";

type LegalPage = {
  id: string;
  website: Website;
  type: PageType;
  title: string;
  slug: string;
  content: string;
  status: PublishStatus;
  updatedAt: string;
};

type ApiLegalPage = {
  _id: string;
  website: Website;
  type: PageType;
  title: string;
  slug: string;
  content: string;
  status: PublishStatus;
  updatedAt: string;
  createdAt?: string;
};

type ApiResponse<T> = {
  success: boolean;
  message?: string;
  data: T;
};

const API_BASE =
  import.meta.env.VITE_API_BASE || "https://api.jsgallor.com";

const API_URL = `${API_BASE}/api/admin/legal-pages`;

const typeLabel: Record<PageType, string> = {
  privacy_policy: "Privacy Policy",
  terms_conditions: "Terms & Conditions",
  refund_policy: "Refund Policy",
  shipping_policy: "Shipping Policy",
  about: "About",
  contact: "Contact",
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
  "/" +
  s
    .trim()
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

function statusVariant(s: PublishStatus) {
  return s === "published" ? "default" : "secondary";
}

const mapPage = (item: ApiLegalPage): LegalPage => ({
  id: item._id,
  website: item.website,
  type: item.type,
  title: item.title,
  slug: item.slug,
  content: item.content,
  status: item.status,
  updatedAt: item.updatedAt,
});

async function apiRequest<T>(
  url: string,
  options: RequestInit = {}
): Promise<T> {
  const token =
    localStorage.getItem("token") ||
    localStorage.getItem("adminToken") ||
    localStorage.getItem("luxury_auth_token");

  const res = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data?.message || "Request failed");
  }

  return data as T;
}

/** ---------------------------
 * Page
 * -------------------------- */
export default function LegalPagesManager() {
  const [pages, setPages] = useState<LegalPage[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [q, setQ] = useState("");
  const [website, setWebsite] = useState<Website>("affordable");
  const [type, setType] = useState<PageType | "all">("all");
  const [status, setStatus] = useState<PublishStatus | "all">("all");

  const [openCreate, setOpenCreate] = useState(false);
  const [openView, setOpenView] = useState<LegalPage | null>(null);
  const [openEdit, setOpenEdit] = useState<LegalPage | null>(null);

  const fetchPages = async () => {
    try {
      setLoading(true);

      const params = new URLSearchParams();
      params.append("website", website);

      if (type !== "all") params.append("type", type);
      if (status !== "all") params.append("status", status);
      if (q.trim()) params.append("q", q.trim());

      const res = await apiRequest<ApiResponse<ApiLegalPage[]>>(
        `${API_URL}?${params.toString()}`
      );

      setPages((res.data || []).map(mapPage));
    } catch (error: any) {
      toast({
        title: "Failed to load pages",
        description: error.message || "Something went wrong.",
        variant: "destructive",
      });
      setPages([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPages();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [website, type, status]);

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();

    return pages
      .filter((p) => p.website === website)
      .filter((p) => (type === "all" ? true : p.type === type))
      .filter((p) => (status === "all" ? true : p.status === status))
      .filter((p) => {
        if (!query) return true;
        return (
          p.title.toLowerCase().includes(query) ||
          p.slug.toLowerCase().includes(query) ||
          typeLabel[p.type].toLowerCase().includes(query)
        );
      })
      .sort((a, b) => +new Date(b.updatedAt) - +new Date(a.updatedAt));
  }, [pages, q, website, type, status]);

  const handleSearch = async () => {
    await fetchPages();
  };

  const deletePage = async (id: string) => {
    try {
      await apiRequest(`${API_URL}/detail/${id}`, {
        method: "DELETE",
      });

      setPages((prev) => prev.filter((p) => p.id !== id));

      toast({
        title: "Deleted",
        description: "Page removed successfully.",
        variant: "destructive",
      });
    } catch (error: any) {
      toast({
        title: "Delete failed",
        description: error.message || "Could not delete page.",
        variant: "destructive",
      });
    }
  };

  const createPage = async (payload: FormPayload) => {
    try {
      setSaving(true);

      const res = await apiRequest<ApiResponse<ApiLegalPage>>(API_URL, {
        method: "POST",
        body: JSON.stringify(payload),
      });

      const created = mapPage(res.data);

      setPages((prev) => [created, ...prev]);
      setOpenCreate(false);

      toast({
        title: "Saved",
        description: "Page created successfully.",
      });
    } catch (error: any) {
      toast({
        title: "Create failed",
        description: error.message || "Could not create page.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const updatePage = async (payload: FormPayload) => {
    if (!openEdit) return;

    try {
      setSaving(true);

      const res = await apiRequest<ApiResponse<ApiLegalPage>>(
        `${API_URL}/detail/${openEdit.id}`,
        {
          method: "PUT",
          body: JSON.stringify(payload),
        }
      );

      const updated = mapPage(res.data);

      setPages((prev) =>
        prev.map((x) => (x.id === openEdit.id ? updated : x))
      );

      setOpenEdit(null);

      toast({
        title: "Updated",
        description: "Page updated successfully.",
      });
    } catch (error: any) {
      toast({
        title: "Update failed",
        description: error.message || "Could not update page.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminLayout panelType="cap">
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold">Legal Pages Manager</h1>
            <p className="text-sm text-muted-foreground">
              Manage Privacy Policy, Terms, Refund & other pages for each
              website.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Select
              value={website}
              onValueChange={(v) => setWebsite(v as Website)}
            >
              <SelectTrigger className="w-[200px]">
                <Globe className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Website" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="affordable">Affordable</SelectItem>
                <SelectItem value="midrange">Midrange</SelectItem>
                <SelectItem value="luxury">Luxury</SelectItem>
              </SelectContent>
            </Select>

            <Button variant="outline" onClick={fetchPages} disabled={loading}>
              {loading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              Refresh
            </Button>

            <Button onClick={() => setOpenCreate(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Page
            </Button>
          </div>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex gap-2 w-full lg:max-w-md">
                <div className="relative flex-1">
                  <Search className="h-4 w-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                  <Input
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleSearch();
                    }}
                    placeholder="Search by title / slug / type..."
                    className="pl-9"
                  />
                </div>
                <Button onClick={handleSearch}>Search</Button>
              </div>

              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-2 lg:gap-3">
                <Select value={type} onValueChange={(v) => setType(v as any)}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    {Object.keys(typeLabel).map((k) => (
                      <SelectItem key={k} value={k}>
                        {typeLabel[k as PageType]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select
                  value={status}
                  onValueChange={(v) => setStatus(v as any)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="published">Published</SelectItem>
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
                    <Th>Page</Th>
                    <Th>Type</Th>
                    <Th>Slug</Th>
                    <Th>Status</Th>
                    <Th>Updated</Th>
                    <Th className="text-right pr-4">Actions</Th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td
                        colSpan={6}
                        className="p-10 text-center text-muted-foreground"
                      >
                        <div className="inline-flex items-center gap-2">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Loading pages...
                        </div>
                      </td>
                    </tr>
                  ) : filtered.length === 0 ? (
                    <tr>
                      <td
                        colSpan={6}
                        className="p-6 text-center text-muted-foreground"
                      >
                        No pages found for{" "}
                        <span className="font-medium capitalize">
                          {website}
                        </span>
                        .
                      </td>
                    </tr>
                  ) : (
                    filtered.map((p) => (
                      <tr key={p.id} className="border-t">
                        <Td>
                          <div className="font-medium">{p.title}</div>
                          <div className="text-xs text-muted-foreground">
                            ID: {p.id}
                          </div>
                        </Td>
                        <Td>{typeLabel[p.type]}</Td>
                        <Td className="font-mono text-xs">{p.slug}</Td>
                        <Td>
                          <Badge variant={statusVariant(p.status) as any}>
                            {p.status.toUpperCase()}
                          </Badge>
                        </Td>
                        <Td className="text-xs">{fmtDate(p.updatedAt)}</Td>
                        <Td className="text-right pr-4">
                          <div className="inline-flex items-center gap-2">
                            <Button
                              size="icon"
                              variant="ghost"
                              title="View"
                              onClick={() => setOpenView(p)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              title="Edit"
                              onClick={() => setOpenEdit(p)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              title="Delete"
                              onClick={() => deletePage(p.id)}
                            >
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
        <LegalPageFormDialog
          open={openCreate}
          onOpenChange={setOpenCreate}
          title="Add Legal Page"
          initial={null}
          website={website}
          saving={saving}
          onSave={createPage}
        />

        {/* Edit */}
        <LegalPageFormDialog
          open={!!openEdit}
          onOpenChange={(v) => !v && setOpenEdit(null)}
          title="Edit Legal Page"
          initial={openEdit}
          website={website}
          saving={saving}
          onSave={updatePage}
        />

        {/* View */}
        <Dialog open={!!openView} onOpenChange={(v) => !v && setOpenView(null)}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>Page Preview</DialogTitle>
            </DialogHeader>

            {openView && (
              <div className="space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-xl font-semibold">
                      {openView.title}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {typeLabel[openView.type]} •{" "}
                      <span className="capitalize">{openView.website}</span> •{" "}
                      <span className="font-mono">{openView.slug}</span>
                    </div>
                  </div>
                  <Badge variant={statusVariant(openView.status) as any}>
                    {openView.status.toUpperCase()}
                  </Badge>
                </div>

                <Card>
                  <CardContent className="p-4">
                    <div className="text-sm whitespace-pre-wrap leading-relaxed">
                      {openView.content}
                    </div>
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
 * Small UI bits
 * -------------------------- */
function Th({ children, className }: any) {
  return (
    <th className={cn("p-4 font-semibold text-muted-foreground", className)}>
      {children}
    </th>
  );
}
function Td({ children, className }: any) {
  return <td className={cn("p-4 align-top", className)}>{children}</td>;
}

/** ---------------------------
 * Form Dialog
 * -------------------------- */
type FormPayload = Omit<LegalPage, "id" | "updatedAt">;

function LegalPageFormDialog({
  open,
  onOpenChange,
  title,
  initial,
  website,
  onSave,
  saving = false,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  title: string;
  initial: LegalPage | null;
  website: Website;
  onSave: (payload: FormPayload) => void;
  saving?: boolean;
}) {
  const [type, setType] = useState<PageType>(
    initial?.type ?? "privacy_policy"
  );
  const [status, setStatus] = useState<PublishStatus>(
    initial?.status ?? "draft"
  );

  const [pageTitle, setPageTitle] = useState(initial?.title ?? "");
  const [slug, setSlug] = useState(initial?.slug ?? "/privacy-policy");
  const [content, setContent] = useState(initial?.content ?? "");

  useEffect(() => {
    if (!open) return;
    setType(initial?.type ?? "privacy_policy");
    setStatus(initial?.status ?? "draft");
    setPageTitle(initial?.title ?? "");
    setSlug(initial?.slug ?? "/privacy-policy");
    setContent(initial?.content ?? "");
  }, [open, initial?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const autoSlug = () => {
    const suggested = slugify(pageTitle || typeLabel[type]);
    setSlug(suggested);
  };

  const submit = () => {
    if (!pageTitle.trim()) {
      toast({ title: "Missing title", description: "Title is required." });
      return;
    }

    if (!slug.trim().startsWith("/")) {
      toast({
        title: "Invalid slug",
        description:
          "Slug must start with / (example: /privacy-policy).",
      });
      return;
    }

    if (!content.trim()) {
      toast({
        title: "Missing content",
        description: "Content is required.",
      });
      return;
    }

    onSave({
      website,
      type,
      status,
      title: pageTitle.trim(),
      slug: slug.trim(),
      content: content.trim(),
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            {title}
          </DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-3">
            <div>
              <Label>Type</Label>
              <Select value={type} onValueChange={(v) => setType(v as PageType)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {Object.keys(typeLabel).map((k) => (
                    <SelectItem key={k} value={k}>
                      {typeLabel[k as PageType]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Status</Label>
              <Select
                value={status}
                onValueChange={(v) => setStatus(v as PublishStatus)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="published">Published</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Title*</Label>
              <Input
                value={pageTitle}
                onChange={(e) => setPageTitle(e.target.value)}
                placeholder="Privacy Policy"
              />
            </div>

            <div>
              <div className="flex items-center justify-between">
                <Label>Slug (URL path)*</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={autoSlug}
                >
                  Auto
                </Button>
              </div>
              <Input
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                placeholder="/privacy-policy"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Example: <span className="font-mono">/terms</span>,{" "}
                <span className="font-mono">/refund-policy</span>
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <Label>Content*</Label>
              <Textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Write full page content here..."
                className="min-h-[340px]"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Tip: you can paste full policy text here.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button onClick={submit} disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : initial ? (
              "Save Changes"
            ) : (
              "Create Page"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}