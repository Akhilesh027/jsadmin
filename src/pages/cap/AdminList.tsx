import { useEffect, useMemo, useState } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { DataTable } from "@/components/ui/data-table";
import { StatusBadge } from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";
import { Eye, Edit, Trash2, UserPlus, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "@/hooks/use-toast";

const API_BASE = "https://api.jsgallor.com/api/admin/cap/admins";

type AdminRole =
  | "manufacturer_admin"
  | "vendor_admin"
  | "ecommerce_admin"
  | "cap_admin"
  | string;

type Admin = {
  _id: string;
  name: string;
  email: string;
  mobile: string;
  role: AdminRole;
  isActive?: boolean; // backend uses isActive
  createdAt?: string;
};

const safeJson = async (res: Response) => {
  try {
    return await res.json();
  } catch {
    return {};
  }
};

const formatDateTime = (iso?: string) => {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-IN");
};

export default function AdminList() {
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionId, setActionId] = useState<string | null>(null);

  const token = localStorage.getItem("token");

  const authHeaders = () => ({
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  });

  const fetchAdmins = async () => {
    setLoading(true);
    try {
      const res = await fetch(API_BASE, { headers: authHeaders() });
      const data = await safeJson(res);

      if (!res.ok) throw new Error(data?.message || "Failed to load admins");
      setAdmins(Array.isArray(data) ? data : []);
    } catch (err: any) {
      toast({
        title: "Failed to load admins",
        description: err?.message || "Server error",
        variant: "destructive",
      });
      setAdmins([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdmins();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ✅ toggle active/inactive (requires PATCH /:id/toggle)
  const handleToggleActive = async (admin: Admin) => {
    setActionId(admin._id);
    try {
      const res = await fetch(`${API_BASE}/${admin._id}/toggle`, {
        method: "PATCH",
        headers: authHeaders(),
      });
      const data = await safeJson(res);

      if (!res.ok) throw new Error(data?.message || "Failed to update status");

      const next = data?.admin;
      toast({
        title: next?.isActive ? "Admin Activated" : "Admin Deactivated",
        description: `${admin.name} has been ${next?.isActive ? "activated" : "deactivated"}.`,
      });

      setAdmins((prev) =>
        prev.map((a) => (a._id === admin._id ? next : a))
      );
    } catch (err: any) {
      toast({
        title: "Update failed",
        description: err?.message || "Server error",
        variant: "destructive",
      });
    } finally {
      setActionId(null);
    }
  };

  const handleDelete = async (admin: Admin) => {
    const ok = window.confirm(`Delete admin "${admin.name}"?`);
    if (!ok) return;

    setActionId(admin._id);
    try {
      const res = await fetch(`${API_BASE}/${admin._id}`, {
        method: "DELETE",
        headers: authHeaders(),
      });
      const data = await safeJson(res);

      if (!res.ok) throw new Error(data?.message || "Failed to delete admin");

      toast({
        title: "Admin Deleted",
        description: `${admin.name} has been removed from the system.`,
        variant: "destructive",
      });

      setAdmins((prev) => prev.filter((a) => a._id !== admin._id));
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

  const roleLabels: Record<string, string> = {
    manufacturer_admin: "Manufacturer Admin",
    vendor_admin: "Vendor Admin",
    ecommerce_admin: "Ecommerce Admin",
    cap_admin: "CAP Admin",
  };

  const tableData = useMemo(() => admins, [admins]);

  const columns = [
    {
      key: "name",
      header: "Admin Name",
      render: (admin: Admin) => (
        <div>
          <p className="font-medium text-foreground">{admin.name}</p>
          <p className="text-sm text-muted-foreground">{admin.email}</p>
        </div>
      ),
    },
    {
      key: "mobile",
      header: "Mobile",
      render: (admin: Admin) => admin.mobile || "—",
    },
    {
      key: "role",
      header: "Role",
      render: (admin: Admin) => (
        <span className="text-sm font-medium">
          {roleLabels[admin.role] || admin.role}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (admin: Admin) => (
        <StatusBadge status={admin.isActive ? "active" : "inactive"} />
      ),
    },
    {
      key: "createdAt",
      header: "Created",
      render: (admin: Admin) => formatDateTime(admin.createdAt),
    },
  ];

  const actions = (admin: Admin) => (
    <div className="flex items-center justify-end gap-2">
      <Button variant="ghost" size="icon" className="h-8 w-8" title="View">
        <Eye className="h-4 w-4" />
      </Button>

      {/* ✅ Edit page route updated to use _id */}
      <Link to={`/cap/admins/edit/${admin._id}`}>
        <Button variant="ghost" size="icon" className="h-8 w-8" title="Edit">
          <Edit className="h-4 w-4" />
        </Button>
      </Link>

      {/* ✅ Activate/Deactivate */}
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        disabled={actionId === admin._id}
        onClick={() => handleToggleActive(admin)}
        title={admin.isActive ? "Deactivate" : "Activate"}
      >
        <span
          className={`h-3 w-3 rounded-full ${
            admin.isActive ? "bg-destructive" : "bg-success"
          }`}
        />
      </Button>

      {/* ✅ Delete */}
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 text-destructive hover:text-destructive"
        disabled={actionId === admin._id}
        onClick={() => handleDelete(admin)}
        title="Delete"
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );

  return (
    <AdminLayout
      panelType="cap"
      title="Admin Management"
      subtitle="Manage system administrators"
    >
      <div className="flex items-center justify-between mb-6">
        <Button variant="outline" onClick={fetchAdmins} disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
          Refresh
        </Button>

        {/* ✅ Add page route stays same */}
        <Link to="/cap/admins/add">
          <Button>
            <UserPlus className="h-4 w-4 mr-2" />
            Add New Admin
          </Button>
        </Link>
      </div>

      <DataTable
        data={tableData}
        columns={columns}
        searchKey="name"
        searchPlaceholder="Search admins..."
        actions={actions}
      />
    </AdminLayout>
  );
}
