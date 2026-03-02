import { useState } from "react";
import { useNavigate } from "react-router-dom";
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

export default function AddAdmin() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState<FormState>({
    name: "",
    email: "",
    mobile: "",
    role: "",
    password: "",
    confirmPassword: "",
  });

  const token = localStorage.getItem("token");

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

    if (formData.password.length < 6) {
      toast({
        title: "Weak password",
        description: "Password must be at least 6 characters.",
        variant: "destructive",
      });
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      toast({
        title: "Password mismatch",
        description: "Password and confirm password must match.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const payload = {
        name,
        email,
        mobile,
        role: formData.role,
        password: formData.password,
      };

      const res = await fetch(API_BASE, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(payload),
      });

      const data = await safeJson(res);
      if (!res.ok) throw new Error(data?.message || "Failed to create admin");

      toast({
        title: "Admin Created",
        description:
          data?.message ||
          `${payload.name} added as ${payload.role.replaceAll("_", " ")}.`,
      });

      // ✅ reset form quickly (optional)
      setFormData({
        name: "",
        email: "",
        mobile: "",
        role: "",
        password: "",
        confirmPassword: "",
      });

      navigate("/cap/admins");
    } catch (err: any) {
      toast({
        title: "Create failed",
        description: err?.message || "Server error",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <AdminLayout
      panelType="cap"
      title="Add New Admin"
      subtitle="Create a new administrator account"
    >
      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Admin Details</CardTitle>
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
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="role">Admin Role</Label>
                <Select
                  value={formData.role}
                  onValueChange={(value) =>
                    setFormData({ ...formData, role: value as AdminRole })
                  }
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

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter password"
                  value={formData.password}
                  onChange={(e) =>
                    setFormData({ ...formData, password: e.target.value })
                  }
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="Confirm password"
                  value={formData.confirmPassword}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      confirmPassword: e.target.value,
                    })
                  }
                  required
                />
              </div>
            </div>

            <div className="flex gap-4">
              <Button type="submit" disabled={loading}>
                {loading ? "Creating..." : "Create Admin"}
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
