import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";

const API_BASE = "https://api.jsgallor.com/api/admin/cap/admins";

type AdminRole =
  | "manufacturer_admin"
  | "vendor_admin"
  | "ecommerce_admin"
  | "cap_admin";

type Admin = {
  _id: string;
  name: string;
  email: string;
  mobile: string;
  role: AdminRole;
  isActive?: boolean;
  createdAt?: string;
};

type FormState = {
  name: string;
  email: string;
  mobile: string;
  role: AdminRole | "";
  password: string;
  confirmPassword: string;
};

const safeJson = async (res: Response) => {
  try {
    return await res.json();
  } catch {
    return {};
  }
};

export default function AdminForm() {
  const navigate = useNavigate();
  const { id } = useParams(); // e.g., /cap/admins/edit/:id
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [formData, setFormData] = useState<FormState>({
    name: "",
    email: "",
    mobile: "",
    role: "",
    password: "",
    confirmPassword: "",
  });

  const isEdit = !!id;
  const token = localStorage.getItem("token");

  const authHeaders = () => ({
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  });

  // Fetch admin data if editing
  useEffect(() => {
    if (!isEdit) return;

    const fetchAdmin = async () => {
      setFetching(true);
      try {
        const res = await fetch(`${API_BASE}/${id}`, {
          headers: authHeaders(),
        });
        const data = await safeJson(res);
        if (!res.ok) throw new Error(data?.message || "Failed to load admin");
        const admin = data.admin || data; // adjust based on your API response shape
        if (admin) {
          setFormData({
            name: admin.name || "",
            email: admin.email || "",
            mobile: admin.mobile || "",
            role: admin.role || "",
            password: "",
            confirmPassword: "",
          });
        }
      } catch (err: any) {
        toast({
          title: "Failed to load admin",
          description: err?.message || "Server error",
          variant: "destructive",
        });
        navigate("/cap/admins");
      } finally {
        setFetching(false);
      }
    };

    fetchAdmin();
  }, [id, isEdit, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const name = formData.name.trim();
    const email = formData.email.trim().toLowerCase();
    const mobile = formData.mobile.trim();

    if (!name || !email || !mobile) {
      toast({
        title: "Missing fields",
        description: "Please fill name, email and mobile.",
        variant: "destructive",
      });
      return;
    }

    if (!formData.role) {
      toast({
        title: "Role required",
        description: "Please select an admin role.",
        variant: "destructive",
      });
      return;
    }

    // Password validation only for create or when password is provided in edit
    const password = formData.password.trim();
    if (!isEdit && password.length < 6) {
      toast({
        title: "Weak password",
        description: "Password must be at least 6 characters.",
        variant: "destructive",
      });
      return;
    }

    if (password && password !== formData.confirmPassword.trim()) {
      toast({
        title: "Password mismatch",
        description: "Password and confirm password must match.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const payload: any = {
        name,
        email,
        mobile,
        role: formData.role,
      };

      // Include password only if provided (for edit) or always for create
      if (!isEdit || password) {
        payload.password = password;
      }

      let url = API_BASE;
      let method = "POST";
      if (isEdit) {
        url = `${API_BASE}/${id}`;
        method = "PUT";
      }

      const res = await fetch(url, {
        method,
        headers: authHeaders(),
        body: JSON.stringify(payload),
      });

      const data = await safeJson(res);
      if (!res.ok) throw new Error(data?.message || "Failed to save admin");

      toast({
        title: isEdit ? "Admin Updated" : "Admin Created",
        description: isEdit
          ? `${name} details updated.`
          : `${name} added as ${payload.role.replaceAll("_", " ")}.`,
      });

      navigate("/cap/admins");
    } catch (err: any) {
      toast({
        title: isEdit ? "Update failed" : "Create failed",
        description: err?.message || "Server error",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return (
      <AdminLayout
        panelType="cap"
        title={isEdit ? "Edit Admin" : "Add New Admin"}
        subtitle={isEdit ? "Loading admin data..." : "Create a new administrator account"}
      >
        <Card className="max-w-2xl">
          <CardContent className="py-12 text-center">
            <p>Loading...</p>
          </CardContent>
        </Card>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout
      panelType="cap"
      title={isEdit ? "Edit Admin" : "Add New Admin"}
      subtitle={
        isEdit
          ? "Update administrator details"
          : "Create a new administrator account"
      }
    >
      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>{isEdit ? "Admin Details" : "Admin Details"}</CardTitle>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  placeholder="Enter full name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  required
                  disabled={loading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="admin@company.com"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  required
                  disabled={loading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="mobile">Mobile Number</Label>
                <Input
                  id="mobile"
                  placeholder="+91 98765 43210"
                  value={formData.mobile}
                  onChange={(e) =>
                    setFormData({ ...formData, mobile: e.target.value })
                  }
                  required
                  disabled={loading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="role">Admin Role</Label>
                <Select
                  value={formData.role}
                  onValueChange={(value) =>
                    setFormData({ ...formData, role: value as AdminRole })
                  }
                  disabled={loading}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="manufacturer_admin">
                      Manufacturer Panel Admin
                    </SelectItem>
                    <SelectItem value="vendor_admin">
                      Vendor Panel Admin
                    </SelectItem>
                    <SelectItem value="ecommerce_admin">
                      Ecommerce Panel Admin
                    </SelectItem>
                    <SelectItem value="cap_admin">CAP Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Password fields – optional for edit */}
              <div className="space-y-2">
                <Label htmlFor="password">
                  Password {isEdit && "(leave blank to keep unchanged)"}
                </Label>
                <Input
                  id="password"
                  type="password"
                  placeholder={isEdit ? "New password (optional)" : "Enter password"}
                  value={formData.password}
                  onChange={(e) =>
                    setFormData({ ...formData, password: e.target.value })
                  }
                  required={!isEdit}
                  disabled={loading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">
                  Confirm Password {isEdit && "(if changing)"}
                </Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder={isEdit ? "Confirm new password" : "Confirm password"}
                  value={formData.confirmPassword}
                  onChange={(e) =>
                    setFormData({ ...formData, confirmPassword: e.target.value })
                  }
                  required={!isEdit}
                  disabled={loading}
                />
              </div>
            </div>

            <div className="flex gap-4">
              <Button type="submit" disabled={loading}>
                {loading
                  ? isEdit
                    ? "Updating..."
                    : "Creating..."
                  : isEdit
                  ? "Update Admin"
                  : "Create Admin"}
              </Button>

              <Button
                type="button"
                variant="outline"
                onClick={() => navigate("/cap/admins")}
                disabled={loading}
              >
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </AdminLayout>
  );
}