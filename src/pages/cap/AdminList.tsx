import { useEffect, useMemo, useState } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { DataTable } from "@/components/ui/data-table";
import { StatusBadge } from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Eye, Edit, Trash2, UserPlus, Loader2, X } from "lucide-react";
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
  isActive?: boolean;
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

const roleLabels: Record<string, string> = {
  manufacturer_admin: "Manufacturer Admin",
  vendor_admin: "Vendor Admin",
  ecommerce_admin: "Ecommerce Admin",
  cap_admin: "CAP Admin",
};

const roleOptions = Object.entries(roleLabels).map(([value, label]) => ({
  value,
  label,
}));

export default function AdminList() {
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionId, setActionId] = useState<string | null>(null);
  const [selectedAdmin, setSelectedAdmin] = useState<Admin | null>(null);
  const [viewOpen, setViewOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState<Partial<Admin>>({});
  const [editLoading, setEditLoading] = useState(false);

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
  }, []);

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

  const handleView = (admin: Admin) => {
    setSelectedAdmin(admin);
    setViewOpen(true);
  };

  const handleEdit = (admin: Admin) => {
    setSelectedAdmin(admin);
    setEditForm({
      name: admin.name,
      email: admin.email,
      mobile: admin.mobile,
      role: admin.role,
      isActive: admin.isActive,
    });
    setEditOpen(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAdmin) return;

    setEditLoading(true);
    try {
      const res = await fetch(`${API_BASE}/${selectedAdmin._id}`, {
        method: "PUT",
        headers: authHeaders(),
        body: JSON.stringify(editForm),
      });
      const data = await safeJson(res);
      if (!res.ok) throw new Error(data?.message || "Failed to update admin");
      const updated = data?.admin;
      toast({
        title: "Admin Updated",
        description: `${updated.name}'s details have been updated.`,
      });
      setAdmins((prev) =>
        prev.map((a) => (a._id === selectedAdmin._id ? updated : a))
      );
      setEditOpen(false);
    } catch (err: any) {
      toast({
        title: "Update failed",
        description: err?.message || "Server error",
        variant: "destructive",
      });
    } finally {
      setEditLoading(false);
    }
  };

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
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        title="View"
        onClick={() => handleView(admin)}
      >
        <Eye className="h-4 w-4" />
      </Button>

      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        title="Edit"
        onClick={() => handleEdit(admin)}
      >
        <Edit className="h-4 w-4" />
      </Button>

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
          {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          Refresh
        </Button>
        <Link to="/cap/admins/add">
          <Button>
            <UserPlus className="h-4 w-4 mr-2" />
            Add New Admin
          </Button>
        </Link>
      </div>

      <DataTable
        data={admins}
        columns={columns}
        searchKey="name"
        searchPlaceholder="Search admins..."
        actions={actions}
      />

      {/* View Modal */}
      <Dialog open={viewOpen} onOpenChange={setViewOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Admin Details</DialogTitle>
            <DialogDescription>View administrator information</DialogDescription>
          </DialogHeader>
          {selectedAdmin && (
            <div className="space-y-4">
              <div>
                <Label className="text-muted-foreground">Name</Label>
                <p className="font-medium">{selectedAdmin.name}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Email</Label>
                <p className="font-medium">{selectedAdmin.email}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Mobile</Label>
                <p className="font-medium">{selectedAdmin.mobile || "—"}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Role</Label>
                <p className="font-medium">
                  {roleLabels[selectedAdmin.role] || selectedAdmin.role}
                </p>
              </div>
              <div>
                <Label className="text-muted-foreground">Status</Label>
                <p className="font-medium">
                  {selectedAdmin.isActive ? "Active" : "Inactive"}
                </p>
              </div>
              <div>
                <Label className="text-muted-foreground">Created At</Label>
                <p className="font-medium">
                  {formatDateTime(selectedAdmin.createdAt)}
                </p>
              </div>
            </div>
          )}
          <div className="flex justify-end">
            <Button variant="outline" onClick={() => setViewOpen(false)}>
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Modal */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Admin</DialogTitle>
            <DialogDescription>Update administrator details</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEditSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Full Name</Label>
              <Input
                id="edit-name"
                value={editForm.name || ""}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                required
                disabled={editLoading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-email">Email</Label>
              <Input
                id="edit-email"
                type="email"
                value={editForm.email || ""}
                onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                required
                disabled={editLoading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-mobile">Mobile</Label>
              <Input
                id="edit-mobile"
                value={editForm.mobile || ""}
                onChange={(e) => setEditForm({ ...editForm, mobile: e.target.value })}
                disabled={editLoading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-role">Role</Label>
              <Select
                value={editForm.role}
                onValueChange={(val) => setEditForm({ ...editForm, role: val })}
                disabled={editLoading}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  {roleOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="edit-status"
                checked={editForm.isActive === true}
                onCheckedChange={(checked) =>
                  setEditForm({ ...editForm, isActive: checked === true })
                }
                disabled={editLoading}
              />
              <Label htmlFor="edit-status">Active</Label>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditOpen(false)}
                disabled={editLoading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={editLoading}>
                {editLoading ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : null}
                Save Changes
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}