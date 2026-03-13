import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from "react-router-dom";
import NotFound from "./pages/NotFound";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";

// CAP Pages
import CAPDashboard from "./pages/cap/Dashboard";
import AdminList from "./pages/cap/AdminList";
import AddAdmin from "./pages/cap/AddAdmin";
import ManufacturerList from "./pages/cap/ManufacturerList";
import VendorList from "./pages/cap/VendorList";
import CustomerList from "./pages/cap/CustomerList";
import LoginLogs from "./pages/cap/LoginLogs";

// PAP Manufacturer Pages
import ManufacturerDashboard from "./pages/pap/manufacturer/Dashboard";
import CatalogApproval from "./pages/pap/manufacturer/CatalogApproval";
import PlaceOrder from "./pages/pap/manufacturer/PlaceOrder";
import TrackOrders from "./pages/pap/manufacturer/TrackOrders";
import OrderHistory from "./pages/pap/manufacturer/OrderHistory";
import ForwardCatalogs from "./pages/pap/manufacturer/ForwardCatalogs";

// PAP Vendor Pages
import VendorDashboard from "./pages/pap/vendor/Dashboard";

// EAP Pages
import EcommerceDashboard from "./pages/eap/Dashboard";

// Shared Pages
import { ManufacturerTickets, VendorTickets, CustomerTickets } from "./pages/shared/TicketSystem";
import { ManufacturerPayments, VendorPayments, CustomerPayments } from "./pages/shared/PaymentsPage";
import { CustomerApproveOrders } from "./pages/eap/CustomerApproveOrders";
import CustomerOrderHistory from "./pages/eap/CustomerOrderHistory";
import CustomerOrderTracking from "./pages/eap/CustomerOrderTracking";
import { VendorApproveOrders } from "./pages/pap/vendor/VendorApproveOrders";
import VendorOrderHistory from "./pages/pap/vendor/VendorOrderHistory";
import VendorOrderTracking from "./pages/pap/vendor/VendorOrderTracking";
import CouponManagement from "./pages/cap/CouponManagement";
import CategoryManagement from "./pages/cap/CategoryManagement";
import BannerManagement from "./pages/cap/BannerManagement";
import ReportsOverview from "./pages/cap/ReportsOverview";
import ManufacturerReports from "./pages/pap/manufacturer/ManufacturerReports";
import VendorReports from "./pages/pap/vendor/VendorReports";
import EcommerceReports from "./pages/eap/EcommerceReports";
import LegalPagesManager from "./pages/eap/LegalPagesManager";
import AdminEstimates from "./pages/cap/Estimates";
import ShippingCostManagement from "./pages/cap/ShippingCostManagement";

const queryClient = new QueryClient();

/** ✅ BACKEND LOGIN API */
const AUTH_API = "https://api.jsgallor.com/api/admin/auth/login";

/** ---------------------------
 * Helpers
 * --------------------------*/
const safeJson = async (res: Response) => {
  try {
    return await res.json();
  } catch {
    return {};
  }
};

const isAuthed = () => {
  const token = localStorage.getItem("Admintoken");
  return !!token;
};

/** ---------------------------
 * ✅ Protected Route Wrapper
 * --------------------------*/
function RequireAuth({ children }: { children: JSX.Element }) {
  const location = useLocation();
  if (!isAuthed()) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  return children;
}

/** ---------------------------
 * ✅ Login Page (in same file)
 * --------------------------*/
function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation() as any;

  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ email: "", password: "" });

  useEffect(() => {
    if (isAuthed()) navigate("/cap", { replace: true });
  }, [navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.email.trim() || !form.password.trim()) {
      toast({
        title: "Missing fields",
        description: "Enter email and password.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(AUTH_API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: form.email.trim().toLowerCase(),
          password: form.password,
        }),
      });

      const data = await safeJson(res);
      if (!res.ok) throw new Error(data?.message || "Login failed");

      // ✅ Expected response:
      // { token: "...", admin: {...}, message: "..." }
      localStorage.setItem("Admintoken", data.token);
      if (data.admin) localStorage.setItem("admin", JSON.stringify(data.admin));

      toast({
        title: "Login success",
        description: data?.message || "Welcome back!",
      });

      // redirect to last page if exists
      const redirectTo = location?.state?.from || "/cap";
      navigate(redirectTo, { replace: true });
    } catch (err: any) {
      toast({
        title: "Login failed",
        description: err?.message || "Server error",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-background">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Admin Login</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="admin@company.com"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                required
              />
            </div>

            <Button className="w-full" type="submit" disabled={loading}>
              {loading ? "Signing in..." : "Login"}
            </Button>

            <Button
              className="w-full"
              variant="outline"
              type="button"
              onClick={() => {
                localStorage.removeItem("token");
                localStorage.removeItem("admin");
                toast({ title: "Cleared session" });
              }}
            >
              Clear Session
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

/** ---------------------------
 * App
 * --------------------------*/
const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          {/* ✅ Public */}
          <Route path="/login" element={<LoginPage />} />

          <Route path="/" element={<Navigate to="/cap" replace />} />
          {/* ✅ Protected routes */}
          <Route
            path="/cap"
            element={
              <RequireAuth>
                <CAPDashboard />
              </RequireAuth>
            }
          />
          <Route
            path="/cap/admins"
            element={
              <RequireAuth>
                <AdminList />
              </RequireAuth>
            }
          />
          <Route
            path="/cap/admins/add"
            element={
              <RequireAuth>
                <AddAdmin />
              </RequireAuth>
            }
          />
          <Route
            path="/cap/admins/edit/:id"
            element={
              <RequireAuth>
                <AddAdmin />
              </RequireAuth>
            }
          />
          <Route
            path="/cap/manufacturers"
            element={
              <RequireAuth>
                <ManufacturerList />
              </RequireAuth>
            }
          />
          <Route
            path="/cap/manufacturers/logs"
            element={
              <RequireAuth>
                <LoginLogs />
              </RequireAuth>
            }
          />
          <Route
            path="/cap/vendors"
            element={
              <RequireAuth>
                <VendorList />
              </RequireAuth>
            }
          />
          <Route path="/cap/coupons" element={<CouponManagement />} />
<Route path="/cap/categories" element={<CategoryManagement />} />
<Route path="/cap/banners" element={<BannerManagement />} />
<Route path="/cap/reports" element={<ReportsOverview/>} />

          <Route
            path="/cap/vendors/stats"
            element={
              <RequireAuth>
                <VendorList />
              </RequireAuth>
            }
          />
          <Route
            path="/cap/customers"
            element={
              <RequireAuth>
                <CustomerList />
              </RequireAuth>
            }
          />
          <Route
            path="/cap/logs"
            element={
              <RequireAuth>
                <LoginLogs />
              </RequireAuth>
            }
          />

          {/* PAP Manufacturer */}
          <Route
            path="/pap/manufacturer"
            element={
              <RequireAuth>
                <ManufacturerDashboard />
              </RequireAuth>
            }
          />
          <Route
            path="/pap/manufacturer/catalog"
            element={
              <RequireAuth>
                <CatalogApproval />
              </RequireAuth>
            }
          />
          <Route
            path="/pap/manufacturer/orders/place"
            element={
              <RequireAuth>
                <PlaceOrder />
              </RequireAuth>
            }
          />
          <Route
            path="/pap/manufacturer/orders/track"
            element={
              <RequireAuth>
                <TrackOrders />
              </RequireAuth>
            }
          />
          <Route
            path="/pap/manufacturer/orders/history"
            element={
              <RequireAuth>
                <OrderHistory />
              </RequireAuth>
            }
          />
          <Route
            path="/pap/manufacturer/forward"
            element={
              <RequireAuth>
                <ForwardCatalogs />
              </RequireAuth>
            }
          />
          <Route
            path="/pap/manufacturer/tickets"
            element={
              <RequireAuth>
                <ManufacturerTickets />
              </RequireAuth>
            }
          />
          <Route
            path="/pap/manufacturer/payments"
            element={
              <RequireAuth>
                <ManufacturerPayments />
              </RequireAuth>
            }
          />
          <Route path="/pap/manufacturer/reports" element={<ManufacturerReports />} />

          <Route
            path="/pap/manufacturer/list"
            element={
              <RequireAuth>
                <ManufacturerList />
              </RequireAuth>
            }
          />

          {/* PAP Vendor */}
          <Route
            path="/pap/vendor"
            element={
              <RequireAuth>
                <VendorDashboard />
              </RequireAuth>
            }
          />
          <Route
            path="/pap/vendor/orders/approve"
            element={
              <RequireAuth>
                <VendorApproveOrders />
              </RequireAuth>
            }
          />
          <Route
            path="/pap/vendor/orders/history"
            element={
              <RequireAuth>
                <VendorOrderHistory />
              </RequireAuth>
            }
          />
          <Route
            path="/pap/vendor/orders/track"
            element={
              <RequireAuth>
                <VendorOrderTracking />
              </RequireAuth>
            }
          />
          <Route path="/pap/vendor/reports" element={<VendorReports />} />

          <Route
            path="/pap/vendor/forward"
            element={
              <RequireAuth>
                <ForwardCatalogs />
              </RequireAuth>
            }
          />
          <Route
            path="/pap/vendor/tickets"
            element={
              <RequireAuth>
                <VendorTickets />
              </RequireAuth>
            }
          />
          <Route
            path="/pap/vendor/payments"
            element={
              <RequireAuth>
                <VendorPayments />
              </RequireAuth>
            }
          />
          <Route
            path="/pap/vendor/list"
            element={
              <RequireAuth>
                <VendorList />
              </RequireAuth>
            }
          />

          {/* Ecommerce */}
          <Route
            path="/eap"
            element={
              <RequireAuth>
                <EcommerceDashboard />
              </RequireAuth>
            }
          />
          <Route
            path="/eap/orders/approve"
            element={
              <RequireAuth>
                <CustomerApproveOrders />
              </RequireAuth>
            }
          />
          <Route
            path="/eap/orders/history"
            element={
              <RequireAuth>
                <CustomerOrderHistory />
              </RequireAuth>
            }
          />
          <Route path="/eap/reports" element={<EcommerceReports />} />
<Route path="/eap/legal-pages" element={<LegalPagesManager />} />
<Route path="/admin/estimates" element={<AdminEstimates />} />
<Route path="/admin/shipping-costs" element={<ShippingCostManagement />} />

          <Route
            path="/eap/orders/track"
            element={
              <RequireAuth>
                <CustomerOrderTracking />
              </RequireAuth>
            }
          />
          <Route
            path="/eap/forward"
            element={
              <RequireAuth>
                <ForwardCatalogs />
              </RequireAuth>
            }
          />
          <Route
            path="/eap/tickets"
            element={
              <RequireAuth>
                <CustomerTickets />
              </RequireAuth>
            }
          />
          <Route
            path="/eap/payments"
            element={
              <RequireAuth>
                <CustomerPayments />
              </RequireAuth>
            }
          />
          <Route
            path="/eap/customers"
            element={
              <RequireAuth>
                <CustomerList />
              </RequireAuth>
            }
          />

          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
