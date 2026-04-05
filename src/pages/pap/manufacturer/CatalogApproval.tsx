import { useEffect, useMemo, useState } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { StatusBadge } from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Check, X, Edit, Eye, Package, Trash2, Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";

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
  discount?: number;
  gst?: number;
  isCustomized?: boolean;
  finalPrice?: number;
  deliveryTime?: string;
  tier: Tier;
  status: CatalogStatus;
  image?: string;
  galleryImages?: string[];
  createdAt?: string;
  updatedAt?: string;
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(value);

const computeFinalPrice = (price: number, discount: number = 0): number => {
  return price * (1 - discount / 100);
};

const computePriceWithGST = (price: number, gst: number = 0): number => {
  return price * (1 + gst / 100);
};

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

  const [selectedItem, setSelectedItem] = useState<AdminCatalogItem | null>(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [viewModalOpen, setViewModalOpen] = useState(false);

  const [discountModalOpen, setDiscountModalOpen] = useState(false);
  const [discountValue, setDiscountValue] = useState<string>("");
  const [pendingApprovalItem, setPendingApprovalItem] = useState<AdminCatalogItem | null>(null);

  const [saving, setSaving] = useState(false);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<CatalogStatus | "all">("all");

  const [editForm, setEditForm] = useState({
    productName: "",
    price: "",
    shortDescription: "",
    description: "",
    deliveryTime: "",
    category: "",
    tier: "mid_range" as Tier,
    discount: "",
    gst: "",
    isCustomized: false,
  });

  const tierColors: Record<Tier, string> = {
    affordable: "bg-success/10 text-success",
    mid_range: "bg-info/10 text-info",
    luxury: "bg-accent text-accent-foreground",
  };

  const fetchCatalogs = async () => {
    try {
      setLoading(true);
      const data = await apiRequest("GET", "/api/admin/catalogs");
      const catalogs: AdminCatalogItem[] = data.catalogs || data.items || [];
      const processed = catalogs.map(item => ({
        ...item,
        finalPrice: computeFinalPrice(item.price, item.discount)
      }));
      setItems(processed);
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
      discount: item.discount?.toString() ?? "0",
      gst: item.gst?.toString() ?? "0",
      isCustomized: item.isCustomized ?? false,
    });
    setEditModalOpen(true);
  };

  const openView = (item: AdminCatalogItem) => {
    setSelectedItem(item);
    setViewModalOpen(true);
  };

  const openDiscountModal = (item: AdminCatalogItem) => {
    setPendingApprovalItem(item);
    setDiscountValue(item.discount?.toString() ?? "0");
    setDiscountModalOpen(true);
  };

  const confirmApproveWithDiscount = async () => {
    if (!pendingApprovalItem) return;
    const discount = parseFloat(discountValue);
    if (isNaN(discount) || discount < 0 || discount > 100) {
      toast({
        title: "Invalid discount",
        description: "Discount must be a number between 0 and 100.",
        variant: "destructive",
      });
      return;
    }

    try {
      setSaving(true);
      const data = await apiRequest(
        "PATCH",
        `/api/admin/catalogs/${pendingApprovalItem._id}/status`,
        { status: "approved", discount }
      );

      const updated = data.catalog || data.item;

      setItems((prev) =>
        prev.map((x) => {
          if (x._id === pendingApprovalItem._id) {
            const newItem = updated || { ...x, status: "approved", discount };
            return {
              ...newItem,
              finalPrice: computeFinalPrice(newItem.price, newItem.discount)
            };
          }
          return x;
        })
      );

      toast({
        title: "Catalog Approved",
        description: `${pendingApprovalItem.productName} approved with ${discount}% discount.`,
      });

      setDiscountModalOpen(false);
      setPendingApprovalItem(null);
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to approve catalog",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const updateStatus = async (item: AdminCatalogItem, status: CatalogStatus) => {
    if (status === "approved") {
      openDiscountModal(item);
      return;
    }

    try {
      setSaving(true);
      await apiRequest(
        "PATCH",
        `/api/admin/catalogs/${item._id}/status`,
        { status }
      );

      setItems((prev) =>
        prev.map((x) => (x._id === item._id ? { ...x, status } : x))
      );

      toast({
        title: "Catalog Rejected",
        description: `${item.productName} marked as rejected.`,
        variant: "destructive",
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

    const discountNum = parseFloat(editForm.discount);
    if (isNaN(discountNum) || discountNum < 0 || discountNum > 100) {
      toast({
        title: "Error",
        description: "Discount must be a number between 0 and 100.",
        variant: "destructive",
      });
      return;
    }

    const gstNum = parseFloat(editForm.gst);
    if (isNaN(gstNum) || gstNum < 0 || gstNum > 100) {
      toast({
        title: "Error",
        description: "GST must be a number between 0 and 100.",
        variant: "destructive",
      });
      return;
    }

    try {
      setSaving(true);

      const payload = {
        productName: editForm.productName.trim(),
        category: editForm.category.trim(),
        price: priceNum,
        shortDescription: editForm.shortDescription.trim(),
        description: editForm.description.trim(),
        deliveryTime: editForm.deliveryTime.trim(),
        tier: editForm.tier,
        discount: discountNum,
        gst: gstNum,
        isCustomized: editForm.isCustomized,
      };

      const data = await apiRequest(
        "PUT",
        `/api/admin/catalogs/${selectedItem._id}`,
        payload
      );

      const updated = data.catalog || data.item;

      setItems((prev) =>
        prev.map((x) => {
          if (x._id === selectedItem._id) {
            const newItem = updated || { ...x, ...payload };
            return {
              ...newItem,
              finalPrice: computeFinalPrice(newItem.price, newItem.discount)
            };
          }
          return x;
        })
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

  const getEditFinalPrice = () => {
    const price = parseFloat(editForm.price);
    const discount = parseFloat(editForm.discount);
    if (isNaN(price) || isNaN(discount)) return null;
    return computeFinalPrice(price, discount);
  };

  const getEditPriceWithGST = () => {
    const price = parseFloat(editForm.price);
    const gst = parseFloat(editForm.gst);
    if (isNaN(price) || isNaN(gst)) return null;
    return computePriceWithGST(price, gst);
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
                {/* FIX: preserve line breaks in description */}
                <div className="text-sm text-muted-foreground line-clamp-2 whitespace-pre-wrap mb-3">
                  {item.shortDescription || item.description || "—"}
                </div>
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <span className="text-lg font-bold text-foreground">
                      {formatCurrency(item.finalPrice ?? item.price)}
                    </span>
                    {item.discount && item.discount > 0 && (
                      <span className="ml-2 text-xs line-through text-muted-foreground">
                        {formatCurrency(item.price)}
                      </span>
                    )}
                  </div>
                  <span className={`badge-status ${tierColors[item.tier]}`}>
                    {item.tier.replace("_", " ")}
                  </span>
                </div>
                {item.discount && item.discount > 0 && (
                  <p className="text-xs text-success mb-3">
                    {item.discount}% discount applied
                  </p>
                )}
                {item.gst && item.gst > 0 && (
                  <p className="text-xs text-muted-foreground mb-3">
                    GST: {item.gst}%
                  </p>
                )}
                {item.isCustomized && (
                  <p className="text-xs text-muted-foreground mb-3">
                    ✨ Customizable product
                  </p>
                )}
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

      {/* Discount Approval Modal */}
      <Dialog open={discountModalOpen} onOpenChange={setDiscountModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve with Discount</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-sm text-muted-foreground">
              Enter discount percentage to apply to <strong>{pendingApprovalItem?.productName}</strong>.
              Leave 0 for no discount.
            </p>
            <div className="space-y-2">
              <Label htmlFor="discount">Discount (%)</Label>
              <Input
                id="discount"
                type="number"
                step="0.1"
                min="0"
                max="100"
                value={discountValue}
                onChange={(e) => setDiscountValue(e.target.value)}
                placeholder="0"
                disabled={saving}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDiscountModalOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={confirmApproveWithDiscount} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : "Approve"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
                  <p className="font-medium">
                    {formatCurrency(selectedItem.finalPrice ?? selectedItem.price)}
                    {selectedItem.discount && selectedItem.discount > 0 && (
                      <span className="ml-2 text-xs line-through text-muted-foreground">
                        {formatCurrency(selectedItem.price)}
                      </span>
                    )}
                  </p>
                </div>
                {selectedItem.discount && selectedItem.discount > 0 && (
                  <div>
                    <Label className="text-muted-foreground">Discount</Label>
                    <p className="font-medium text-success">{selectedItem.discount}%</p>
                  </div>
                )}
                {selectedItem.gst && selectedItem.gst > 0 && (
                  <div>
                    <Label className="text-muted-foreground">GST</Label>
                    <p className="font-medium">{selectedItem.gst}%</p>
                  </div>
                )}
                <div>
                  <Label className="text-muted-foreground">Customizable</Label>
                  <p className="font-medium">{selectedItem.isCustomized ? "Yes" : "No"}</p>
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
                {/* FIX: preserve line breaks in modal description */}
                <div className="text-sm whitespace-pre-wrap">{selectedItem.description || "—"}</div>
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
                    step="0.01"
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

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Discount (%)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    min="0"
                    max="100"
                    value={editForm.discount}
                    onChange={(e) =>
                      setEditForm((p) => ({ ...p, discount: e.target.value }))
                    }
                    disabled={saving}
                    placeholder="0"
                  />
                </div>
                <div className="space-y-2">
                  <Label>GST (%)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    min="0"
                    max="100"
                    value={editForm.gst}
                    onChange={(e) =>
                      setEditForm((p) => ({ ...p, gst: e.target.value }))
                    }
                    disabled={saving}
                    placeholder="0"
                  />
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="isCustomized"
                  checked={editForm.isCustomized}
                  onCheckedChange={(checked) =>
                    setEditForm((p) => ({ ...p, isCustomized: !!checked }))
                  }
                  disabled={saving}
                />
                <Label htmlFor="isCustomized" className="cursor-pointer">
                  This product can be customized (e.g., size, color, material)
                </Label>
              </div>

              <div className="bg-muted/30 rounded-lg p-3 border border-border space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Final Price after discount:</span>
                  <div>
                    <span className="font-bold text-foreground">
                      {getEditFinalPrice() !== null ? formatCurrency(getEditFinalPrice()!) : "—"}
                    </span>
                    {parseFloat(editForm.discount) > 0 && (
                      <span className="ml-2 text-xs line-through text-muted-foreground">
                        {formatCurrency(parseFloat(editForm.price) || 0)}
                      </span>
                    )}
                  </div>
                </div>
                {parseFloat(editForm.discount) > 0 && (
                  <div className="text-xs text-success">
                    {editForm.discount}% discount applied
                  </div>
                )}
                <div className="flex items-center justify-between text-sm pt-1 border-t border-border/50">
                  <span className="text-muted-foreground">Price after GST (+{editForm.gst || 0}%):</span>
                  <span className="font-bold text-foreground">
                    {getEditPriceWithGST() !== null ? formatCurrency(getEditPriceWithGST()!) : "—"}
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Short Description</Label>
                <Input
                  value={editForm.shortDescription}
                  onChange={(e) =>
                    setEditForm((p) => ({ ...p, shortDescription: e.target.value }))
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
            <Button variant="outline" onClick={() => setEditModalOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={saveEdit} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}