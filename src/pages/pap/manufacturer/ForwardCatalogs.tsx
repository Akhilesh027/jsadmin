import { useEffect, useMemo, useState } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Send, Package, Edit, Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const API_BASE = "https://api.jsgallor.com";

type CatalogStatus = "pending" | "approved" | "rejected";

type ApiCatalog = {
  _id: string;
  productName: string;
  price: number;
  shortDescription?: string;
  deliveryTime?: string;
  status: CatalogStatus;

  // optional (depends on backend)
  manufacturer?: { _id: string; companyName: string } | string;
  manufacturerName?: string; // fallback
  image?: string;
};

type ApiVendor = {
  _id: string;
  businessName: string;
  city?: string;
  status?: "pending" | "approved" | "rejected";
};

type ForwardType = "website" | "vendor";

const safeJson = async (res: Response) => {
  try {
    return await res.json();
  } catch {
    return {};
  }
};

const formatCurrency = (amount = 0) => `₹${Number(amount || 0).toLocaleString()}`;

const getToken = () => localStorage.getItem("token") || ""; // if admin auth enabled

export default function ForwardCatalogs() {
  const [catalogs, setCatalogs] = useState<ApiCatalog[]>([]);
  const [vendors, setVendors] = useState<ApiVendor[]>([]);
  const [loadingCatalogs, setLoadingCatalogs] = useState(false);
  const [loadingVendors, setLoadingVendors] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [selectedItem, setSelectedItem] = useState<ApiCatalog | null>(null);
  const [forwardModalOpen, setForwardModalOpen] = useState(false);

  const [forwardType, setForwardType] = useState<ForwardType>("website");
  const [websiteTier, setWebsiteTier] = useState<string>("");
  const [selectedVendor, setSelectedVendor] = useState<string>("");

  // editable fields
  const [editData, setEditData] = useState({
    title: "",
    price: "",
    shortDescription: "",
    deliveryTime: "",
  });

  const approvedCatalogs = useMemo(
    () => catalogs.filter((c) => c.status === "approved"),
    [catalogs]
  );

  const approvedVendors = useMemo(
    () => vendors.filter((v) => (v.status || "approved") === "approved"),
    [vendors]
  );

  /** ---------- API: Fetch Approved Catalogs ---------- */
  const fetchApprovedCatalogs = async () => {
    try {
      setLoadingCatalogs(true);

      // ✅ backend suggestion
      // GET /api/admin/catalogs?status=approved
      const res = await fetch(`${API_BASE}/api/admin/catalogs?status=approved`, {
        headers: {
          Authorization: `Bearer ${getToken()}`, // remove if no admin auth
        },
      });

      const data = await safeJson(res);
      if (!res.ok || !data?.success) {
        throw new Error(data?.message || "Failed to load catalogs");
      }

      setCatalogs(Array.isArray(data.catalogs) ? data.catalogs : []);
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to load catalogs",
        variant: "destructive",
      });
      setCatalogs([]);
    } finally {
      setLoadingCatalogs(false);
    }
  };

  /** ---------- API: Fetch Approved Vendors ---------- */
  const fetchApprovedVendors = async () => {
    try {
      setLoadingVendors(true);

      // ✅ backend suggestion
      // GET /api/admin/vendors?status=approved
      const res = await fetch(`${API_BASE}/api/admin/vendors?status=approved`, {
        headers: {
          Authorization: `Bearer ${getToken()}`, // remove if no admin auth
        },
      });

      const data = await safeJson(res);
      if (!res.ok || !data?.success) {
        throw new Error(data?.message || "Failed to load vendors");
      }

      setVendors(Array.isArray(data.vendors) ? data.vendors : []);
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to load vendors",
        variant: "destructive",
      });
      setVendors([]);
    } finally {
      setLoadingVendors(false);
    }
  };

  useEffect(() => {
    fetchApprovedCatalogs();
    fetchApprovedVendors();
  }, []);

  /** ---------- Open Modal ---------- */
  const handleForward = (item: ApiCatalog) => {
    setSelectedItem(item);
    setForwardModalOpen(true);

    // reset selections
    setForwardType("website");
    setWebsiteTier("");
    setSelectedVendor("");

    // set editable defaults
    setEditData({
      title: item.productName || "",
      price: String(item.price ?? ""),
      shortDescription: item.shortDescription || "",
      deliveryTime: item.deliveryTime || "",
    });
  };

  /** ---------- Submit Forward ---------- */
  const handleSubmitForward = async () => {
    if (!selectedItem) return;

    // validations
    if (!editData.title.trim()) {
      toast({ title: "Error", description: "Title is required", variant: "destructive" });
      return;
    }
    if (!editData.price || Number(editData.price) <= 0) {
      toast({ title: "Error", description: "Price must be valid", variant: "destructive" });
      return;
    }

    if (forwardType === "website" && !websiteTier) {
      toast({ title: "Error", description: "Please select a website category", variant: "destructive" });
      return;
    }

    if (forwardType === "vendor" && !selectedVendor) {
      toast({ title: "Error", description: "Please select a vendor", variant: "destructive" });
      return;
    }

    try {
      setSubmitting(true);

      const res = await fetch(`${API_BASE}/api/admin/products/${selectedItem._id}/forward-website`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getToken()}`, // remove if no admin auth
        },
        body: JSON.stringify({
          forwardType,
          websiteTier: forwardType === "website" ? websiteTier : undefined,
          vendorId: forwardType === "vendor" ? selectedVendor : undefined,
          overrides: {
            productName: editData.title.trim(),
            price: Number(editData.price),
            shortDescription: editData.shortDescription?.trim() || "",
            deliveryTime: editData.deliveryTime?.trim() || "",
          },
        }),
      });

      const data = await safeJson(res);

      if (!res.ok || !data?.success) {
        throw new Error(data?.message || "Failed to forward catalog");
      }

      toast({
        title: "Catalog Forwarded",
        description:
          forwardType === "website"
            ? `Added to website category: ${websiteTier}`
            : "Sent to vendor successfully",
      });

      setForwardModalOpen(false);
      setSelectedItem(null);

      // refresh catalogs (optional)
      fetchApprovedCatalogs();
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to forward catalog",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const manufacturerLabel = (item: ApiCatalog) => {
    if (item.manufacturerName) return item.manufacturerName;
    if (typeof item.manufacturer === "object" && item.manufacturer?.companyName) return item.manufacturer.companyName;
    return "—";
  };

  return (
    <AdminLayout
      panelType="pap-manufacturer"
      title="Forward Catalogs"
      subtitle="Forward approved catalogs to website or vendors"
    >
      {/* Top actions */}
      <div className="flex items-center gap-3 mb-5">
        <Button variant="outline" onClick={fetchApprovedCatalogs} disabled={loadingCatalogs}>
          {loadingCatalogs ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
          Refresh Catalogs
        </Button>
        <Button variant="outline" onClick={fetchApprovedVendors} disabled={loadingVendors}>
          {loadingVendors ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
          Refresh Vendors
        </Button>
      </div>

      {/* Catalog cards */}
      {loadingCatalogs ? (
        <div className="flex items-center justify-center py-12 text-muted-foreground gap-2">
          <Loader2 className="h-5 w-5 animate-spin" />
          Loading catalogs...
        </div>
      ) : approvedCatalogs.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Package className="h-12 w-12 mx-auto mb-3 opacity-50" />
          <p>No approved catalogs found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {approvedCatalogs.map((item) => (
            <div key={item._id} className="bg-card rounded-xl border border-border overflow-hidden">
              <div className="h-40 bg-muted flex items-center justify-center">
                <Package className="h-12 w-12 text-muted-foreground/50" />
              </div>
              <div className="p-4">
                <h3 className="font-semibold text-foreground line-clamp-1">{item.productName}</h3>
                <p className="text-sm text-muted-foreground mb-2">{manufacturerLabel(item)}</p>
                <p className="text-lg font-bold mb-4">{formatCurrency(item.price)}</p>

                <Button className="w-full" onClick={() => handleForward(item)}>
                  <Send className="h-4 w-4 mr-2" />
                  Forward Catalog
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Forward Modal */}
      <Dialog open={forwardModalOpen} onOpenChange={setForwardModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Forward Catalog</DialogTitle>
          </DialogHeader>

          {selectedItem && (
            <div className="space-y-6">
              <div className="p-4 bg-muted/50 rounded-lg">
                <p className="font-medium">{selectedItem.productName}</p>
                <p className="text-sm text-muted-foreground">{formatCurrency(selectedItem.price)}</p>
              </div>

              <Tabs
                value={forwardType}
                onValueChange={(v) => setForwardType(v as ForwardType)}
              >
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="website">Forward to Website</TabsTrigger>
                  <TabsTrigger value="vendor">Forward to Vendor</TabsTrigger>
                </TabsList>

                <TabsContent value="website" className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label>Select Category</Label>
                    <RadioGroup value={websiteTier} onValueChange={setWebsiteTier}>
                      <div className="flex items-center space-x-2 p-3 rounded-lg border hover:bg-muted/50">
                        <RadioGroupItem value="affordable" id="affordable" />
                        <Label htmlFor="affordable" className="flex-1 cursor-pointer">
                          <span className="font-medium">Affordable</span>
                          <p className="text-sm text-muted-foreground">Budget-friendly collection</p>
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2 p-3 rounded-lg border hover:bg-muted/50">
                        <RadioGroupItem value="mid_range" id="mid_range" />
                        <Label htmlFor="mid_range" className="flex-1 cursor-pointer">
                          <span className="font-medium">Mid-Range</span>
                          <p className="text-sm text-muted-foreground">Premium quality selection</p>
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2 p-3 rounded-lg border hover:bg-muted/50">
                        <RadioGroupItem value="luxury" id="luxury" />
                        <Label htmlFor="luxury" className="flex-1 cursor-pointer">
                          <span className="font-medium">Luxury</span>
                          <p className="text-sm text-muted-foreground">Exclusive high-end pieces</p>
                        </Label>
                      </div>
                    </RadioGroup>
                  </div>
                </TabsContent>

                <TabsContent value="vendor" className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label>Select Vendor</Label>
                    <Select value={selectedVendor} onValueChange={setSelectedVendor}>
                      <SelectTrigger>
                        <SelectValue placeholder={loadingVendors ? "Loading..." : "Choose vendor"} />
                      </SelectTrigger>
                      <SelectContent>
                        {approvedVendors.map((vendor) => (
                          <SelectItem key={vendor._id} value={vendor._id}>
                            {vendor.businessName} {vendor.city ? `- ${vendor.city}` : ""}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </TabsContent>
              </Tabs>

              {/* Edit Fields */}
              <div className="space-y-4 border-t pt-4">
                <p className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Edit className="h-4 w-4" />
                  Edit before forwarding (optional)
                </p>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Title</Label>
                    <Input
                      value={editData.title}
                      onChange={(e) => setEditData((p) => ({ ...p, title: e.target.value }))}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Price (₹)</Label>
                    <Input
                      type="number"
                      value={editData.price}
                      onChange={(e) => setEditData((p) => ({ ...p, price: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Short Description</Label>
                  <Input
                    value={editData.shortDescription}
                    onChange={(e) => setEditData((p) => ({ ...p, shortDescription: e.target.value }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Delivery Time</Label>
                  <Input
                    value={editData.deliveryTime}
                    onChange={(e) => setEditData((p) => ({ ...p, deliveryTime: e.target.value }))}
                  />
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setForwardModalOpen(false)} disabled={submitting}>
              Cancel
            </Button>

            <Button onClick={handleSubmitForward} disabled={submitting}>
              {submitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
              Forward Catalog
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
