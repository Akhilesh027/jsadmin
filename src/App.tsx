import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";

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
import { VendorApproveOrders, CustomerApproveOrders } from "./pages/shared/ApproveOrders";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Navigate to="/cap" replace />} />
          
          {/* Core Admin Panel */}
          <Route path="/cap" element={<CAPDashboard />} />
          <Route path="/cap/admins" element={<AdminList />} />
          <Route path="/cap/admins/add" element={<AddAdmin />} />
          <Route path="/cap/admins/edit/:id" element={<AddAdmin />} />
          <Route path="/cap/manufacturers" element={<ManufacturerList />} />
          <Route path="/cap/manufacturers/logs" element={<LoginLogs />} />
          <Route path="/cap/vendors" element={<VendorList />} />
          <Route path="/cap/vendors/stats" element={<VendorList />} />
          <Route path="/cap/customers" element={<CustomerList />} />
          <Route path="/cap/logs" element={<LoginLogs />} />
          
          {/* Portal Admin - Manufacturer */}
          <Route path="/pap/manufacturer" element={<ManufacturerDashboard />} />
          <Route path="/pap/manufacturer/catalog" element={<CatalogApproval />} />
          <Route path="/pap/manufacturer/orders/place" element={<PlaceOrder />} />
          <Route path="/pap/manufacturer/orders/track" element={<TrackOrders />} />
          <Route path="/pap/manufacturer/orders/history" element={<OrderHistory />} />
          <Route path="/pap/manufacturer/forward" element={<ForwardCatalogs />} />
          <Route path="/pap/manufacturer/tickets" element={<ManufacturerTickets />} />
          <Route path="/pap/manufacturer/payments" element={<ManufacturerPayments />} />
          <Route path="/pap/manufacturer/list" element={<ManufacturerList />} />
          
          {/* Portal Admin - Vendor */}
          <Route path="/pap/vendor" element={<VendorDashboard />} />
          <Route path="/pap/vendor/orders/approve" element={<VendorApproveOrders />} />
          <Route path="/pap/vendor/orders/history" element={<OrderHistory />} />
          <Route path="/pap/vendor/orders/track" element={<TrackOrders />} />
          <Route path="/pap/vendor/forward" element={<ForwardCatalogs />} />
          <Route path="/pap/vendor/tickets" element={<VendorTickets />} />
          <Route path="/pap/vendor/payments" element={<VendorPayments />} />
          <Route path="/pap/vendor/list" element={<VendorList />} />
          
          {/* Ecommerce Admin Panel */}
          <Route path="/eap" element={<EcommerceDashboard />} />
          <Route path="/eap/orders/approve" element={<CustomerApproveOrders />} />
          <Route path="/eap/orders/history" element={<OrderHistory />} />
          <Route path="/eap/orders/track" element={<TrackOrders />} />
          <Route path="/eap/forward" element={<ForwardCatalogs />} />
          <Route path="/eap/tickets" element={<CustomerTickets />} />
          <Route path="/eap/payments" element={<CustomerPayments />} />
          <Route path="/eap/customers" element={<CustomerList />} />
          
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
