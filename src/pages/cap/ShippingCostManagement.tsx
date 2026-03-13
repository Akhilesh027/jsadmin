// src/pages/admin/ShippingCostManagement.tsx
import { useEffect, useMemo, useState } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Loader2, MapPin, Pencil, Plus, Search, Trash2, Truck } from "lucide-react";

const API_BASE =
  (import.meta as any).env?.VITE_BASE_URL?.replace(/\/$/, "") ||
  "https://api.jsgallor.com";

type Segment = "all" | "affordable" | "midrange" | "luxury";

type ShippingCost = {
  _id: string;
  city: string;
  pincode?: string;
  amount: number;
  website: Segment;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
};

type ShippingForm = {
  city: string;
  pincode: string;
  amount: string;
  website: Segment;
  isActive: boolean;
};

const defaultForm: ShippingForm = {
  city: "",
  pincode: "",
  amount: "",
  website: "all",
  isActive: true,
};

export default function ShippingCostManagement() {
  const [items, setItems] = useState<ShippingCost[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [query, setQuery] = useState("");
  const [websiteFilter, setWebsiteFilter] = useState<Segment>("all");

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ShippingCost | null>(null);
  const [form, setForm] = useState<ShippingForm>(defaultForm);

  const token =
    localStorage.getItem("admin_token") ||
    localStorage.getItem("token") ||
    "";

  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  const fetchShippingCosts = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/api/admin/shipping-costs`, {
        headers,
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.message || "Failed to fetch shipping costs");
      }

      setItems(Array.isArray(data?.data) ? data.data : []);
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Could not load shipping costs",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchShippingCosts();
  }, []);

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const q = query.trim().toLowerCase();

      const matchesSearch =
        !q ||
        item.city?.toLowerCase().includes(q) ||
        item.pincode?.toLowerCase().includes(q) ||
        item.website?.toLowerCase().includes(q);

      const matchesWebsite =
        websiteFilter === "all" ? true : item.website === websiteFilter;

      return matchesSearch && matchesWebsite;
    });
  }, [items, query, websiteFilter]);

  const openCreate = () => {
    setEditing(null);
    setForm(defaultForm);
    setOpen(true);
  };

  const openEdit = (item: ShippingCost) => {
    setEditing(item);
    setForm({
      city: item.city || "",
      pincode: item.pincode || "",
      amount: String(item.amount ?? ""),
      website: item.website,
      isActive: !!item.isActive,
    });
    setOpen(true);
  };

  const handleSave = async () => {
    try {
      if (!form.city.trim()) {
        toast({
          title: "Validation error",
          description: "City is required",
          variant: "destructive",
        });
        return;
      }

      if (!form.amount || Number(form.amount) < 0) {
        toast({
          title: "Validation error",
          description: "Please enter a valid shipping amount",
          variant: "destructive",
        });
        return;
      }

      if (form.pincode && !/^\d{6}$/.test(form.pincode.trim())) {
        toast({
          title: "Validation error",
          description: "Pincode must be 6 digits",
          variant: "destructive",
        });
        return;
      }

      setSaving(true);

      const payload = {
        city: form.city.trim(),
        pincode: form.pincode.trim() || undefined,
        amount: Number(form.amount),
        website: form.website,
        isActive: form.isActive,
      };

      const url = editing
        ? `${API_BASE}/api/admin/shipping-costs/${editing._id}`
        : `${API_BASE}/api/admin/shipping-costs`;

      const method = editing ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers,
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.message || "Failed to save shipping cost");
      }

      toast({
        title: editing ? "Updated" : "Created",
        description: data?.message || "Shipping cost saved successfully",
      });

      setOpen(false);
      setEditing(null);
      setForm(defaultForm);
      fetchShippingCosts();
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to save shipping cost",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    const ok = window.confirm("Are you sure you want to delete this shipping rule?");
    if (!ok) return;

    try {
      const res = await fetch(`${API_BASE}/api/admin/shipping-costs/${id}`, {
        method: "DELETE",
        headers,
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.message || "Failed to delete shipping rule");
      }

      toast({
        title: "Deleted",
        description: data?.message || "Shipping rule deleted successfully",
      });

      fetchShippingCosts();
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to delete shipping rule",
        variant: "destructive",
      });
    }
  };

  const handleToggleStatus = async (item: ShippingCost) => {
    try {
      const res = await fetch(`${API_BASE}/api/admin/shipping-costs/${item._id}`, {
        method: "PUT",
        headers,
        body: JSON.stringify({
          city: item.city,
          pincode: item.pincode || undefined,
          amount: item.amount,
          website: item.website,
          isActive: !item.isActive,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.message || "Failed to update status");
      }

      toast({
        title: "Updated",
        description: `Shipping rule is now ${!item.isActive ? "active" : "inactive"}`,
      });

      fetchShippingCosts();
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to update status",
        variant: "destructive",
      });
    }
  };

  return (
    <AdminLayout panelType="cap">
      <div className="space-y-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Shipping Cost Management</h1>
            <p className="text-sm text-muted-foreground">
              Manage shipping by website, city, and optional pincode.
            </p>
          </div>

          <Button onClick={openCreate} className="gap-2">
            <Plus className="h-4 w-4" />
            Add Shipping Rule
          </Button>
        </div>

        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="grid gap-3 md:grid-cols-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search by city, pincode, website..."
                  className="pl-9"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </div>

              <div className="flex flex-wrap gap-2">
                {(["all", "affordable", "midrange", "luxury"] as const).map((site) => (
                  <Button
                    key={site}
                    type="button"
                    variant={websiteFilter === site ? "default" : "outline"}
                    className="capitalize"
                    onClick={() => setWebsiteFilter(site)}
                  >
                    {site}
                  </Button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-4">
          {loading ? (
            <Card className="border-0 shadow-sm">
              <CardContent className="p-10 flex items-center justify-center">
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Loading shipping rules...
              </CardContent>
            </Card>
          ) : filteredItems.length === 0 ? (
            <Card className="border-0 shadow-sm">
              <CardContent className="p-10 text-center text-muted-foreground">
                No shipping rules found.
              </CardContent>
            </Card>
          ) : (
            filteredItems.map((item) => (
              <Card key={item._id} className="border-0 shadow-sm">
                <CardContent className="p-4">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="flex items-center gap-2 text-lg font-semibold">
                          <MapPin className="h-4 w-4" />
                          {item.city}
                        </div>

                        <Badge variant="secondary" className="capitalize">
                          {item.website}
                        </Badge>

                        {item.pincode ? (
                          <Badge variant="outline">{item.pincode}</Badge>
                        ) : (
                          <Badge variant="outline">All pincodes</Badge>
                        )}

                        <Badge variant={item.isActive ? "default" : "outline"}>
                          {item.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </div>

                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Truck className="h-4 w-4" />
                        Shipping Amount: ₹{Number(item.amount || 0).toFixed(2)}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <div className="mr-2 flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">Status</span>
                        <Switch
                          checked={item.isActive}
                          onCheckedChange={() => handleToggleStatus(item)}
                        />
                      </div>

                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-2"
                        onClick={() => openEdit(item)}
                      >
                        <Pencil className="h-4 w-4" />
                        Edit
                      </Button>

                      <Button
                        variant="destructive"
                        size="sm"
                        className="gap-2"
                        onClick={() => handleDelete(item._id)}
                      >
                        <Trash2 className="h-4 w-4" />
                        Delete
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editing ? "Edit Shipping Rule" : "Add Shipping Rule"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Website</Label>
              <div className="flex flex-wrap gap-2 pt-2">
                {(["all", "affordable", "midrange", "luxury"] as const).map((site) => (
                  <Button
                    key={site}
                    type="button"
                    variant={form.website === site ? "default" : "outline"}
                    className="capitalize"
                    onClick={() =>
                      setForm((prev) => ({ ...prev, website: site }))
                    }
                  >
                    {site}
                  </Button>
                ))}
              </div>
            </div>

            <div>
              <Label>City</Label>
              <Input
                placeholder="Enter city"
                value={form.city}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, city: e.target.value }))
                }
              />
            </div>

            <div>
              <Label>Optional Pincode</Label>
              <Input
                placeholder="Enter pincode (optional)"
                value={form.pincode}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    pincode: e.target.value.replace(/\D/g, "").slice(0, 6),
                  }))
                }
              />
              <p className="mt-1 text-xs text-muted-foreground">
                Leave empty to apply shipping to all pincodes in this city.
              </p>
            </div>

            <div>
              <Label>Shipping Amount</Label>
              <Input
                type="number"
                placeholder="Enter shipping amount"
                value={form.amount}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, amount: e.target.value }))
                }
              />
            </div>

            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <p className="font-medium">Active</p>
                <p className="text-sm text-muted-foreground">
                  Enable this shipping rule for checkout
                </p>
              </div>
              <Switch
                checked={form.isActive}
                onCheckedChange={(checked) =>
                  setForm((prev) => ({ ...prev, isActive: checked }))
                }
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>

              <Button onClick={handleSave} disabled={saving} className="gap-2">
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                {editing ? "Update" : "Create"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
