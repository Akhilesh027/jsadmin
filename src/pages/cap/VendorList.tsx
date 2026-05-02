import { useEffect, useMemo, useState } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { DataTable } from "@/components/ui/data-table";
import { StatusBadge } from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";
import { Eye, Edit, Trash2, Check } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "https://api.jsgallor.com";

export type Vendor = {
  _id: string;
  vendorName: string;
  businessName: string;
  email: string;
  phone: string;
  gstNo?: string;
  location?: string;
  category?: string;
  servicesOffered?: string;
  projectsCompleted?: number;
  yearsExp?: number;
  businessDesc?: string;
  businessType?: string;
  status?: "pending" | "approved" | "rejected";
  totalSpent?: number;
  engagementScore?: number;
  createdAt?: string;
  updatedAt?: string;
};

const formatCurrency = (amount = 0) => `₹${Number(amount || 0).toLocaleString()}`;
const formatDate = (dateStr?: string) =>
  dateStr ? new Date(dateStr).toLocaleDateString() : "-";

async function safeJson(res: Response) {
  try {
    return await res.json();
  } catch {
    return {};
  }
}

async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem("token"); // vendor token (or admin)
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });
  const data = await safeJson(res);
  if (!res.ok) throw new Error((data as any)?.message || "Request failed");
  return data as T;
}

function normalizeVendors(res: any): Vendor[] {
  if (Array.isArray(res)) return res;
  if (Array.isArray(res?.vendors)) return res.vendors;
  if (Array.isArray(res?.data)) return res.data;
  return [];
}

export default function VendorList() {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionId, setActionId] = useState<string | null>(null);
  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  const fetchVendors = async () => {
    setLoading(true);
    try {
      // ✅ Updated to /api/admin/all
      const res = await api<any>("/api/admin/all");
      const list = normalizeVendors(res);
      setVendors(list);
    } catch (err: any) {
      toast({
        title: "Failed to load vendors",
        description: err?.message || "Server error",
        variant: "destructive",
      });
      setVendors([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVendors();
  }, []);

  const handleApprove = async (vendor: Vendor) => {
    setActionId(vendor._id);
    try {
      await api(`/api/admin/${vendor._id}/approve`, { method: "PATCH" });
      toast({ title: "Vendor Approved", description: `${vendor.businessName} has been approved.` });
      setVendors((prev) =>
        prev.map((v) => (v._id === vendor._id ? { ...v, status: "approved" } : v))
      );
    } catch (err: any) {
      toast({ title: "Approve failed", description: err?.message, variant: "destructive" });
    } finally {
      setActionId(null);
    }
  };

  const handleDelete = async (vendor: Vendor) => {
    if (!window.confirm(`Delete vendor "${vendor.businessName}"?`)) return;
    setActionId(vendor._id);
    try {
      await api(`/api/admin/${vendor._id}`, { method: "DELETE" });
      toast({ title: "Vendor Deleted", description: `${vendor.businessName} removed.` });
      setVendors((prev) => prev.filter((v) => v._id !== vendor._id));
    } catch (err: any) {
      toast({ title: "Delete failed", description: err?.message, variant: "destructive" });
    } finally {
      setActionId(null);
    }
  };

  const handleViewDetails = (vendor: Vendor) => {
    setSelectedVendor(vendor);
    setDetailsOpen(true);
  };

  const columns = useMemo(
    () => [
      {
        key: "businessName",
        header: "Business",
        render: (vendor: Vendor) => (
          <div>
            <p className="font-medium text-foreground">{vendor.businessName}</p>
            <p className="text-sm text-muted-foreground">{vendor.vendorName}</p>
          </div>
        ),
      },
      {
        key: "contact",
        header: "Contact",
        render: (vendor: Vendor) => (
          <div>
            <p>{vendor.phone}</p>
            <p className="text-sm text-muted-foreground">{vendor.email}</p>
          </div>
        ),
      },
      {
        key: "location",
        header: "Location",
        render: (vendor: Vendor) => <span>{vendor.location || "—"}</span>,
      },
      {
        key: "category",
        header: "Category",
        render: (vendor: Vendor) => <span>{vendor.category || "—"}</span>,
      },
      {
        key: "services",
        header: "Services",
        render: (vendor: Vendor) => (
          <span className="max-w-[200px] truncate block">{vendor.servicesOffered || "—"}</span>
        ),
      },
      {
        key: "projects",
        header: "Projects",
        render: (vendor: Vendor) => <span>{vendor.projectsCompleted || 0}</span>,
      },
      {
        key: "totalSpent",
        header: "Total Spent",
        render: (vendor: Vendor) => (
          <span className="font-medium">{formatCurrency(vendor.totalSpent || 0)}</span>
        ),
      },
      {
        key: "engagementScore",
        header: "Engagement",
        render: (vendor: Vendor) => {
          const score = Math.min(100, Math.max(0, Number(vendor.engagementScore || 0)));
          return (
            <div className="flex items-center gap-2 min-w-[100px]">
              <Progress value={score} className="h-2" />
              <span className="text-sm">{score}%</span>
            </div>
          );
        },
      },
      {
        key: "status",
        header: "Status",
        render: (vendor: Vendor) => <StatusBadge status={vendor.status || "pending"} />,
      },
      {
        key: "createdAt",
        header: "Registered",
        render: (vendor: Vendor) => <span>{formatDate(vendor.createdAt)}</span>,
      },
    ],
    []
  );

  const actions = (vendor: Vendor) => (
    <div className="flex items-center justify-end gap-1">
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        title="View Details"
        onClick={() => handleViewDetails(vendor)}
      >
        <Eye className="h-4 w-4" />
      </Button>
      <Button variant="ghost" size="icon" className="h-8 w-8" title="Edit">
        <Edit className="h-4 w-4" />
      </Button>
      {(vendor.status === "pending" || !vendor.status) && (
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-green-600 hover:text-green-700"
          onClick={() => handleApprove(vendor)}
          disabled={actionId === vendor._id}
          title="Approve"
        >
          <Check className="h-4 w-4" />
        </Button>
      )}
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 text-destructive"
        onClick={() => handleDelete(vendor)}
        disabled={actionId === vendor._id}
        title="Delete"
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );

  const searchKeys = ["businessName", "vendorName", "email", "phone", "location", "category"];

  return (
    <AdminLayout panelType="cap" title="Vendors" subtitle="Manage all registered vendors">
      <div className="flex items-center justify-end gap-2 pb-3">
        <Button variant="outline" onClick={fetchVendors} disabled={loading}>
          {loading ? "Loading..." : "Refresh"}
        </Button>
      </div>

      <DataTable
        data={vendors}
        columns={columns}
        searchKey={searchKeys}
        searchPlaceholder="Search vendors by name, email, phone, location..."
        actions={actions}
        onDownload={() => {
          toast({ title: "Download Started", description: "Vendor list download triggered." });
        }}
      />

      {/* Vendor Details Modal */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Vendor Details</DialogTitle>
          </DialogHeader>
          {selectedVendor && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Business Name</p>
                  <p className="font-medium">{selectedVendor.businessName}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Vendor Name</p>
                  <p>{selectedVendor.vendorName}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Email</p>
                  <p>{selectedVendor.email}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Phone</p>
                  <p>{selectedVendor.phone}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">GST No.</p>
                  <p>{selectedVendor.gstNo || "—"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Location</p>
                  <p>{selectedVendor.location || "—"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Category</p>
                  <p>{selectedVendor.category || "—"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Business Type</p>
                  <p>{selectedVendor.businessType || "—"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Services Offered</p>
                  <p>{selectedVendor.servicesOffered || "—"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Projects Completed</p>
                  <p>{selectedVendor.projectsCompleted || 0}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Years of Experience</p>
                  <p>{selectedVendor.yearsExp || 0}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Business Description</p>
                  <p className="break-words">{selectedVendor.businessDesc || "—"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  <StatusBadge status={selectedVendor.status || "pending"} />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Registered On</p>
                  <p>{formatDate(selectedVendor.createdAt)}</p>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}