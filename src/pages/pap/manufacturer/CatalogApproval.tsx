import { useEffect, useMemo, useState } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { StatusBadge } from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Check, X, Edit, Eye, Package, Trash2, Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";

/**
 * Assumptions (adjust endpoints if yours differ):
 * GET    /api/admin/catalogs
 * PUT    /api/admin/catalogs/:id         (edit)
 * PATCH  /api/admin/catalogs/:id/status  (approve/reject)  body: { status: "approved" | "rejected" }
 * DELETE /api/admin/catalogs/:id
 */

const API_BASE = "https://api.jsgallor.com";

type CatalogStatus = "pending" | "approved" | "rejected";

type Tier = "affordable" | "mid_range" | "luxury";

interface AdminCatalogItem {
  _id: string;
  productName: string;
  manufacturerName: string;
  manufacturerId?: string;
  category: string;
  shortDescription?: string;
  description?: string;
  price: number;
  deliveryTime?: string;
  tier: Tier;
  status: CatalogStatus;

  image?: string; // main image url
  galleryImages?: string[];

  createdAt?: string;
  updatedAt?: string;
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(
    value
  );

// -------- API helper --------
const apiRequest = async (method: string, endpoint: string, data?: any) => {
  const token = localStorage.getItem("token");
  const res = await fetch(`${API_BASE}${endpoint}`, {
    method,
    headers: {
      ...(data ? { "Content-Type": "application/json" } : {}),
      Authorization: `Bearer ${token}`,
    },
    body: data ? JSON.stringify(data) : undefined,
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json?.message || "Request failed");
  return json;
};

export default function CatalogApproval() {
  const [items, setItems] = useState<AdminCatalogItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const [selectedItem, setSelectedItem] = useState<AdminCatalogItem | null>(
    null
  );
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [viewModalOpen, setViewModalOpen] = useState(false);

  const [saving, setSaving] = useState(false);

  // Filters
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<CatalogStatus | "all">("all");

  // Edit form state
  const [editForm, setEditForm] = useState({
    productName: "",
    price: "",
    shortDescription: "",
    description: "",
    deliveryTime: "",
    category: "",
    tier: "mid_range" as Tier,
  });

  const tierColors: Record<Tier, string> = {
    affordable: "bg-success/10 text-success",
    mid_range: "bg-info/10 text-info",
    luxury: "bg-accent text-accent-foreground",
  };

  const fetchCatalogs = async () => {
    try {
      setLoading(true);
      // expected response: { success: true, catalogs: [...] } or { catalogs: [...] }
      const data = await apiRequest("GET", "/api/admin/catalogs");
      const catalogs: AdminCatalogItem[] = data.catalogs || data.items || [];
      setItems(catalogs);
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to fetch catalogs",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCatalogs();
  }, []);

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();

    return items.filter((it) => {
      const matchesSearch =
        !s ||
        (it.productName || "").toLowerCase().includes(s) ||
        (it.manufacturerName || "").toLowerCase().includes(s) ||
        (it.category || "").toLowerCase().includes(s);

      const matchesStatus = statusFilter === "all" ? true : it.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [items, search, statusFilter]);

  const openEdit = (item: AdminCatalogItem) => {
    setSelectedItem(item);
    setEditForm({
      productName: item.productName || "",
      price: String(item.price ?? ""),
      shortDescription: item.shortDescription || "",
      description: item.description || "",
      deliveryTime: item.deliveryTime || "",
      category: item.category || "",
      tier: item.tier || "mid_range",
    });
    setEditModalOpen(true);
  };

  const openView = (item: AdminCatalogItem) => {
    setSelectedItem(item);
    setViewModalOpen(true);
  };

  const updateStatus = async (item: AdminCatalogItem, status: CatalogStatus) => {
    try {
      setSaving(true);

      // PATCH /api/admin/catalogs/:id/status { status }
      const data = await apiRequest(
        "PATCH",
        `/api/admin/catalogs/${item._id}/status`,
        { status }
      );

      const updated = data.catalog || data.item;

      setItems((prev) =>
        prev.map((x) => (x._id === item._id ? (updated || { ...x, status }) : x))
      );

      toast({
        title: status === "approved" ? "Catalog Approved" : "Catalog Rejected",
        description: `${item.productName} marked as ${status}.`,
        variant: status === "rejected" ? "destructive" : "default",
      });
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to update status",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const saveEdit = async () => {
    if (!selectedItem) return;

    if (!editForm.productName.trim() || !editForm.category.trim() || !editForm.price) {
      toast({
        title: "Error",
        description: "Product name, category and price are required.",
        variant: "destructive",
      });
      return;
    }

    const priceNum = Number(editForm.price);
    if (Number.isNaN(priceNum) || priceNum <= 0) {
      toast({
        title: "Error",
        description: "Price must be a valid number greater than 0.",
        variant: "destructive",
      });
      return;
    }

    try {
      setSaving(true);

      // PUT /api/admin/catalogs/:id (edit fields)
      const payload = {
        productName: editForm.productName.trim(),
        category: editForm.category.trim(),
        price: priceNum,
        shortDescription: editForm.shortDescription.trim(),
        description: editForm.description.trim(),
        deliveryTime: editForm.deliveryTime.trim(),
        tier: editForm.tier,
      };

      const data = await apiRequest(
        "PUT",
        `/api/admin/catalogs/${selectedItem._id}`,
        payload
      );

      const updated = data.catalog || data.item;

      setItems((prev) =>
        prev.map((x) => (x._id === selectedItem._id ? (updated || { ...x, ...payload }) : x))
      );

      toast({
        title: "Catalog Updated",
        description: "Changes saved successfully.",
      });

      setEditModalOpen(false);
      setSelectedItem(null);
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to update catalog",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const deleteCatalog = async (item: AdminCatalogItem) => {
    if (!window.confirm(`Delete "${item.productName}"? This cannot be undone.`)) return;

    try {
      setSaving(true);

      await apiRequest("DELETE", `/api/admin/catalogs/${item._id}`);

      setItems((prev) => prev.filter((x) => x._id !== item._id));

      if (selectedItem?._id === item._id) {
        setSelectedItem(null);
        setEditModalOpen(false);
        setViewModalOpen(false);
      }

      toast({
        title: "Deleted",
        description: "Catalog item deleted successfully.",
      });
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to delete catalog",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <AdminLayout
        panelType="pap-manufacturer"
        title="Catalog Approval"
        subtitle="Review and approve manufacturer catalogs"
      >
        <div className="flex items-center justify-center h-72">
          <Loader2 className="h-10 w-10 animate-spin text-muted-foreground" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout
      panelType="pap-manufacturer"
      title="Catalog Approval"
      subtitle="Review, approve, edit, and delete manufacturer catalogs"
    >
      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-3 md:items-center mb-6">
        <div className="flex-1">
          <Input
            placeholder="Search by product / manufacturer / category..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="flex gap-2 items-center">
          <Label className="text-sm text-muted-foreground">Status</Label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="h-10 rounded-md border border-border bg-background px-3 text-sm"
          >
            <option value="all">All</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>

          <Button variant="outline" onClick={fetchCatalogs} disabled={saving}>
            Refresh
          </Button>
        </div>
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="bg-card rounded-xl border border-border p-10 text-center">
          <div className="mx-auto h-14 w-14 rounded-full bg-muted flex items-center justify-center mb-3">
            <Package className="h-7 w-7 text-muted-foreground" />
          </div>
          <h3 className="font-semibold text-foreground mb-1">No catalogs found</h3>
          <p className="text-sm text-muted-foreground">Try changing filters or search.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((item) => (
            <div
              key={item._id}
              className="bg-card rounded-xl border border-border overflow-hidden hover:shadow-card-hover transition-all duration-300"
            >
              {/* Image */}
              <div className="h-48 bg-muted flex items-center justify-center overflow-hidden">
                {item.image ? (
                  <img
                    src={item.image}
                    alt={item.productName}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <Package className="h-16 w-16 text-muted-foreground/50" />
                )}
              </div>

              {/* Content */}
              <div className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h3 className="font-semibold text-foreground line-clamp-1">
                      {item.productName}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {item.manufacturerName}
                    </p>
                  </div>
                  <StatusBadge status={item.status} />
                </div>

                <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                  {item.shortDescription || item.description || "—"}
                </p>

                <div className="flex items-center justify-between mb-4">
                  <span className="text-lg font-bold text-foreground">
                    {formatCurrency(item.price)}
                  </span>
                  <span className={`badge-status ${tierColors[item.tier]}`}>
                    {item.tier.replace("_", " ")}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => openView(item)}
                    disabled={saving}
                  >
                    <Eye className="h-4 w-4 mr-1" />
                    View
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => openEdit(item)}
                    disabled={saving}
                  >
                    <Edit className="h-4 w-4 mr-1" />
                    Edit
                  </Button>
                </div>

                <div className="flex items-center gap-2 mt-2">
                  <Button
                    size="sm"
                    className="flex-1 bg-success hover:bg-success/90"
                    onClick={() => updateStatus(item, "approved")}
                    disabled={saving || item.status === "approved"}
                  >
                    <Check className="h-4 w-4 mr-1" />
                    Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    className="flex-1"
                    onClick={() => updateStatus(item, "rejected")}
                    disabled={saving || item.status === "rejected"}
                  >
                    <X className="h-4 w-4 mr-1" />
                    Reject
                  </Button>
                </div>

                <Button
                  size="sm"
                  variant="outline"
                  className="w-full mt-2 text-destructive border-destructive/30 hover:bg-destructive/10"
                  onClick={() => deleteCatalog(item)}
                  disabled={saving}
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  Delete
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* View Modal */}
      <Dialog open={viewModalOpen} onOpenChange={setViewModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{selectedItem?.productName}</DialogTitle>
          </DialogHeader>

          {selectedItem && (
            <div className="space-y-4">
              <div className="h-64 bg-muted rounded-lg flex items-center justify-center overflow-hidden">
                {selectedItem.image ? (
                  <img
                    src={selectedItem.image}
                    alt={selectedItem.productName}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <Package className="h-24 w-24 text-muted-foreground/50" />
                )}
              </div>

              {selectedItem.galleryImages?.length ? (
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {selectedItem.galleryImages.map((src, idx) => (
                    <img
                      key={idx}
                      src={src}
                      alt={`Gallery ${idx + 1}`}
                      className="h-20 w-20 rounded-md object-cover border border-border flex-shrink-0"
                    />
                  ))}
                </div>
              ) : null}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Manufacturer</Label>
                  <p className="font-medium">{selectedItem.manufacturerName}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Category</Label>
                  <p className="font-medium">{selectedItem.category}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Price</Label>
                  <p className="font-medium">{formatCurrency(selectedItem.price)}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Delivery Time</Label>
                  <p className="font-medium">{selectedItem.deliveryTime || "—"}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Tier</Label>
                  <p className="font-medium">{selectedItem.tier.replace("_", " ")}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Status</Label>
                  <p className="font-medium">{selectedItem.status}</p>
                </div>
              </div>

              <div>
                <Label className="text-muted-foreground">Description</Label>
                <p className="text-sm">{selectedItem.description || "—"}</p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Modal */}
      <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Catalog Item</DialogTitle>
          </DialogHeader>

          {selectedItem && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Product Name</Label>
                  <Input
                    value={editForm.productName}
                    onChange={(e) =>
                      setEditForm((p) => ({ ...p, productName: e.target.value }))
                    }
                    disabled={saving}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Price (₹)</Label>
                  <Input
                    type="number"
                    value={editForm.price}
                    onChange={(e) =>
                      setEditForm((p) => ({ ...p, price: e.target.value }))
                    }
                    disabled={saving}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Category</Label>
                  <Input
                    value={editForm.category}
                    onChange={(e) =>
                      setEditForm((p) => ({ ...p, category: e.target.value }))
                    }
                    disabled={saving}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Tier</Label>
                  <select
                    value={editForm.tier}
                    onChange={(e) =>
                      setEditForm((p) => ({ ...p, tier: e.target.value as Tier }))
                    }
                    className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm"
                    disabled={saving}
                  >
                    <option value="affordable">affordable</option>
                    <option value="mid_range">mid range</option>
                    <option value="luxury">luxury</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Short Description</Label>
                <Input
                  value={editForm.shortDescription}
                  onChange={(e) =>
                    setEditForm((p) => ({
                      ...p,
                      shortDescription: e.target.value,
                    }))
                  }
                  disabled={saving}
                />
              </div>

              <div className="space-y-2">
                <Label>Full Description</Label>
                <Textarea
                  rows={4}
                  value={editForm.description}
                  onChange={(e) =>
                    setEditForm((p) => ({ ...p, description: e.target.value }))
                  }
                  disabled={saving}
                />
              </div>

              <div className="space-y-2">
                <Label>Delivery Time</Label>
                <Input
                  value={editForm.deliveryTime}
                  onChange={(e) =>
                    setEditForm((p) => ({ ...p, deliveryTime: e.target.value }))
                  }
                  disabled={saving}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditModalOpen(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button onClick={saveEdit} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
