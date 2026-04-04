import { useEffect, useMemo, useState } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { DataTable } from "@/components/ui/data-table";
import { StatusBadge } from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";
import { Eye, Edit, Trash2, Check } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { Progress } from "@/components/ui/progress";

const API_BASE = "http://localhost:5000"; // change if needed

export type Vendor = {
  _id: string;
  businessName: string;
  ownerName: string;
  mobile: string;
  gstNumber?: string;
  city?: string;
  state?: string;
  totalSpent?: number;
  engagementScore?: number; // 0-100
  status?: "pending" | "approved" | "rejected" | string;
};

const formatCurrency = (amount = 0) => `₹${Number(amount || 0).toLocaleString()}`;

async function safeJson(res: Response) {
  try {
    return await res.json();
  } catch {
    return {};
  }
}

async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem("token"); // or auth_token based on your app
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

  const fetchVendors = async () => {
    setLoading(true);
    try {
      const res = await api<any>("/api/vendor");
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
      // ✅ change route if your backend differs
      const res = await api<any>(`/api/vendor/${vendor._id}/approve`, { method: "PATCH" });

      toast({
        title: "Vendor Approved",
        description: res?.message || `${vendor.businessName} has been approved.`,
      });

      // update UI
      setVendors((prev) =>
        prev.map((v) => (v._id === vendor._id ? { ...v, status: "approved" } : v))
      );
    } catch (err: any) {
      toast({
        title: "Approve failed",
        description: err?.message || "Server error",
        variant: "destructive",
      });
    } finally {
      setActionId(null);
    }
  };

  const handleDelete = async (vendor: Vendor) => {
    const ok = window.confirm(`Delete vendor "${vendor.businessName}"?`);
    if (!ok) return;

    setActionId(vendor._id);
    try {
      // ✅ change route if your backend differs
      const res = await api<any>(`/api/vendor/${vendor._id}`, { method: "DELETE" });

      toast({
        title: "Vendor Deleted",
        description: res?.message || `${vendor.businessName} has been removed.`,
        variant: "destructive",
      });

      setVendors((prev) => prev.filter((v) => v._id !== vendor._id));
    } catch (err: any) {
      toast({
        title: "Delete failed",
        description: err?.message || "Server error",
        variant: "destructive",
      });
    } finally {
      setActionId(null);
    }
  };

  const handleDownload = () => {
    toast({
      title: "Download Started",
      description: "Vendor list download triggered.",
    });
  };

  const columns = useMemo(
    () => [
      {
        key: "businessName",
        header: "Business",
        render: (vendor: Vendor) => (
          <div>
            <p className="font-medium text-foreground">{vendor.businessName}</p>
            <p className="text-sm text-muted-foreground">
              {vendor.city || "-"}, {vendor.state || "-"}
            </p>
          </div>
        ),
      },
      {
        key: "ownerName",
        header: "Owner",
        render: (vendor: Vendor) => (
          <div>
            <p className="text-foreground">{vendor.ownerName}</p>
            <p className="text-sm text-muted-foreground">{vendor.mobile}</p>
          </div>
        ),
      },
      {
        key: "gstNumber",
        header: "GST No.",
        render: (vendor: Vendor) => <span>{vendor.gstNumber || "—"}</span>,
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
          const score = Math.max(0, Math.min(100, Number(vendor.engagementScore || 0)));
          return (
            <div className="flex items-center gap-2">
              <Progress value={score} className="w-16 h-2" />
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
    ],
    []
  );

  const actions = (vendor: Vendor) => (
    <div className="flex items-center justify-end gap-1">
      <Button variant="ghost" size="icon" className="h-8 w-8" title="View">
        <Eye className="h-4 w-4" />
      </Button>

      <Button variant="ghost" size="icon" className="h-8 w-8" title="Edit">
        <Edit className="h-4 w-4" />
      </Button>

      {(vendor.status === "pending" || !vendor.status) && (
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-success hover:text-success"
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
        className="h-8 w-8 text-destructive hover:text-destructive"
        onClick={() => handleDelete(vendor)}
        disabled={actionId === vendor._id}
        title="Delete"
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );

  return (
    <AdminLayout panelType="cap" title="Vendors" subtitle="Manage all registered vendors">
      <div className="flex items-center justify-end pb-3">
        <Button variant="outline" onClick={fetchVendors} disabled={loading}>
          {loading ? "Loading..." : "Refresh"}
        </Button>
      </div>

      <DataTable
        data={vendors}
        columns={columns}
        searchKey="businessName"
        searchPlaceholder="Search vendors..."
        actions={actions}
        onDownload={handleDownload}
      />
    </AdminLayout>
  );
}
