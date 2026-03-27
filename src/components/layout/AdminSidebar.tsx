import { useState, useEffect, useMemo } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Users,
  Factory,
  Store,
  ShoppingCart,
  Ticket,
  FileText,
  ChevronDown,
  ChevronRight,
  Shield,
  Package,
  ClipboardList,
  Truck,
  History,
  Forward,
  UserCircle,
  LogOut,
  Menu,
  X,
  Layers,
  ImageIcon,
  BarChart3,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";

interface NavItem {
  title: string;
  href?: string;
  icon: React.ElementType;
  children?: NavItem[];
}

// Role-specific navigation sets
const coreAdminNav: NavItem[] = [
  { title: "Dashboard", href: "/cap", icon: LayoutDashboard },
  {
    title: "Admin Management",
    icon: Shield,
    children: [
      { title: "All Admins", href: "/cap/admins", icon: Users },
      { title: "Add Admin", href: "/cap/admins/add", icon: UserCircle },
    ],
  },
  {
    title: "Manufacturers",
    icon: Factory,
    children: [
      { title: "All Manufacturers", href: "/cap/manufacturers", icon: Factory },
    ],
  },
  {
    title: "Vendors",
    icon: Store,
    children: [
      { title: "All Vendors", href: "/cap/vendors", icon: Store },
    ],
  },
  { title: "Customers", href: "/cap/customers", icon: Users },
  { title: "Coupons", href: "/cap/coupons", icon: Ticket },
  { title: "Categories", href: "/cap/categories", icon: Layers },
  { title: "Banners", href: "/cap/banners", icon: ImageIcon },
  { title: "Shipping Costs", href: "/admin/shipping-costs", icon: Truck },
  { title: "Estimates", href: "/admin/estimates", icon: FileText },
  { title: "Reports", href: "/cap/reports", icon: FileText },
];

const manufacturerAdminNav: NavItem[] = [
  { title: "Dashboard", href: "/pap/manufacturer", icon: LayoutDashboard },
  { title: "Catalog Approval", href: "/pap/manufacturer/catalog", icon: ClipboardList },
  { title: "Place Orders", href: "/pap/manufacturer/orders/place", icon: Package },
  { title: "Track Orders", href: "/pap/manufacturer/orders/track", icon: Truck },
  { title: "Order History", href: "/pap/manufacturer/orders/history", icon: History },
  { title: "Reports", href: "/pap/manufacturer/reports", icon: BarChart3 },
  { title: "Manufacturer List", href: "/pap/manufacturer/list", icon: Factory },
];

const vendorAdminNav: NavItem[] = [
  { title: "Dashboard", href: "/pap/vendor", icon: LayoutDashboard },
  { title: "Approve Orders", href: "/pap/vendor/orders/approve", icon: ClipboardList },
  { title: "Order History", href: "/pap/vendor/orders/history", icon: History },
  { title: "Track Orders", href: "/pap/vendor/orders/track", icon: Truck },
  { title: "Reports", href: "/pap/vendor/reports", icon: BarChart3 },
  { title: "Vendor List", href: "/pap/vendor/list", icon: Store },
];

const ecommerceAdminNav: NavItem[] = [
  { title: "Dashboard", href: "/eap", icon: LayoutDashboard },
  { title: "Customer Orders", href: "/eap/orders/approve", icon: ShoppingCart },
  { title: "Order History", href: "/eap/orders/history", icon: History },
  { title: "Track Orders", href: "/eap/orders/track", icon: Truck },
  { title: "Reports", href: "/eap/reports", icon: BarChart3 },
  { title: "Legal Pages", href: "/eap/legal-pages", icon: FileText },
  { title: "Customer List", href: "/eap/customers", icon: Users },
];

interface AdminSidebarProps {
  panelType: "cap" | "pap-manufacturer" | "pap-vendor" | "eap";
}

type StoredAdmin = {
  _id?: string;
  name?: string;
  email?: string;
  role?: string;
};

const roleLabel = (role?: string) => {
  if (!role) return "ADMIN";
  return role.replaceAll("_", " ").toUpperCase();
};

// Map role to nav items
const roleToNavItems: Record<string, NavItem[]> = {
  cap_admin: coreAdminNav,
  manufacturer_admin: manufacturerAdminNav,
  vendor_admin: vendorAdminNav,
  ecommerce_admin: ecommerceAdminNav,
};

// Map role to panel title
const roleToTitle: Record<string, string> = {
  cap_admin: "Core Admin Panel",
  manufacturer_admin: "Manufacturer Panel",
  vendor_admin: "Vendor Panel",
  ecommerce_admin: "Ecommerce Panel",
};

export function AdminSidebar({ panelType }: AdminSidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();

  const [expandedItems, setExpandedItems] = useState<string[]>([]);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  // Load admin details from localStorage
  const admin: StoredAdmin = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem("admin") || "{}");
    } catch {
      return {};
    }
  }, []);

  const role = admin?.role || "";
  const isCoreAdmin = role === "cap_admin";

  // Get nav items based on role
  const navItems = useMemo(() => {
    return roleToNavItems[role] || [];
  }, [role]);

  // Panel title based on role
  const panelTitle = useMemo(() => {
    return roleToTitle[role] || "Admin Panel";
  }, [role]);

  // Logout handler
  const handleLogout = () => {
    localStorage.removeItem("Admintoken");
    localStorage.removeItem("admin");
    toast({ title: "Logged out", description: "Token removed successfully." });
    navigate("/login", { replace: true });
  };

  // Auto-expand parent items when a child is active
  useEffect(() => {
    const activePath = location.pathname;
    const itemsToExpand: string[] = [];

    const checkAndExpand = (items: NavItem[]) => {
      items.forEach((item) => {
        if (item.children) {
          const hasActiveChild = item.children.some((child) => child.href === activePath);
          if (hasActiveChild) itemsToExpand.push(item.title);
          checkAndExpand(item.children);
        }
      });
    };

    checkAndExpand(navItems);

    if (itemsToExpand.length > 0) {
      setExpandedItems((prev) => [
        ...prev,
        ...itemsToExpand.filter((item) => !prev.includes(item)),
      ]);
    }
  }, [location.pathname, navItems]);

  const toggleExpanded = (title: string) => {
    setExpandedItems((prev) => (prev.includes(title) ? prev.filter((t) => t !== title) : [...prev, title]));
  };

  const renderNavItem = (item: NavItem, level = 0) => {
    const hasChildren = item.children && item.children.length > 0;
    const isExpanded = expandedItems.includes(item.title);

    const hasActiveChild =
      hasChildren && item.children?.some((child) => location.pathname === child.href);

    if (hasChildren) {
      return (
        <div key={item.title} className="space-y-0.5">
          <button
            onClick={() => toggleExpanded(item.title)}
            className={cn(
              "w-full sidebar-link justify-between",
              (isExpanded || hasActiveChild) && "bg-sidebar-accent/50",
              level > 0 && "pl-8"
            )}
            style={{ paddingLeft: `${level * 0.75 + 1}rem` }}
          >
            <div className="flex items-center gap-3">
              <item.icon className="h-4 w-4 flex-shrink-0" />
              <span className="flex-1 text-left text-sm">{item.title}</span>
            </div>
            {isExpanded ? (
              <ChevronDown className="h-3 w-3 flex-shrink-0" />
            ) : (
              <ChevronRight className="h-3 w-3 flex-shrink-0" />
            )}
          </button>

          {isExpanded && (
            <div className="space-y-0.5">
              {item.children?.map((child) => renderNavItem(child, level + 1))}
            </div>
          )}
        </div>
      );
    }

    return (
      <NavLink
        key={item.title}
        to={item.href || "#"}
        onClick={() => setIsMobileOpen(false)}
        className={({ isActive }) => cn("sidebar-link", isActive && "sidebar-link-active", level > 0 && "pl-8")}
        style={{ paddingLeft: `${level * 0.75 + 1}rem` }}
        end
      >
        <item.icon className="h-4 w-4 flex-shrink-0" />
        <span className="text-sm">{item.title}</span>
      </NavLink>
    );
  };

  return (
    <>
      {/* Mobile Toggle Button */}
      <Button
        variant="ghost"
        size="icon"
        className="fixed top-4 left-4 z-50 lg:hidden bg-sidebar text-sidebar-foreground"
        onClick={() => setIsMobileOpen(!isMobileOpen)}
      >
        {isMobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </Button>

      {/* Overlay */}
      {isMobileOpen && (
        <div className="fixed inset-0 bg-foreground/50 z-40 lg:hidden" onClick={() => setIsMobileOpen(false)} />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed left-0 top-0 z-40 h-screen w-64 bg-sidebar transition-transform duration-300 lg:translate-x-0 flex flex-col",
          isMobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Logo */}
        <div className="flex-shrink-0 h-16 border-b border-sidebar-border px-6">
          <div className="flex h-full items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg gradient-gold">
              <span className="font-display text-lg font-bold text-sidebar-primary-foreground">JG</span>
            </div>
            <div>
              <h1 className="font-display text-lg font-bold text-sidebar-foreground">JS GALLOR</h1>
              <p className="text-xs text-sidebar-foreground/60">{panelTitle}</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex-1 overflow-hidden">
          <nav className="h-full overflow-y-auto p-4 space-y-0.5">
            {navItems.map((item) => renderNavItem(item))}
          </nav>
        </div>

        {/* Bottom */}
        <div className="flex-shrink-0">
          {/* Panel Switcher – only shown to core admins */}
          {isCoreAdmin && (
            <div className="border-t border-sidebar-border p-4">
              <p className="text-xs text-sidebar-foreground/50 mb-2 px-2">Switch Panel</p>
              <div className="space-y-1">
                <NavLink
                  to="/cap"
                  className={({ isActive }) => cn("sidebar-link text-sm", isActive && "sidebar-link-active")}
                  onClick={() => setIsMobileOpen(false)}
                >
                  <Shield className="h-4 w-4" />
                  <span>Core Admin</span>
                </NavLink>

                <NavLink
                  to="/pap/manufacturer"
                  className={({ isActive }) => cn("sidebar-link text-sm", isActive && "sidebar-link-active")}
                  onClick={() => setIsMobileOpen(false)}
                >
                  <Factory className="h-4 w-4" />
                  <span>Manufacturer</span>
                </NavLink>

                <NavLink
                  to="/pap/vendor"
                  className={({ isActive }) => cn("sidebar-link text-sm", isActive && "sidebar-link-active")}
                  onClick={() => setIsMobileOpen(false)}
                >
                  <Store className="h-4 w-4" />
                  <span>Vendor</span>
                </NavLink>

                <NavLink
                  to="/eap"
                  className={({ isActive }) => cn("sidebar-link text-sm", isActive && "sidebar-link-active")}
                  onClick={() => setIsMobileOpen(false)}
                >
                  <ShoppingCart className="h-4 w-4" />
                  <span>Ecommerce</span>
                </NavLink>
              </div>
            </div>
          )}

          {/* User Profile */}
          <div className="border-t border-sidebar-border p-4">
            <div className="flex items-center gap-3 px-2">
              <div className="h-9 w-9 rounded-full bg-sidebar-accent flex items-center justify-center">
                <UserCircle className="h-5 w-5 text-sidebar-foreground" />
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-sidebar-foreground truncate">{admin?.name || "Admin"}</p>
                <p className="text-xs text-sidebar-foreground/50 truncate">{admin?.email || "—"}</p>
                <p className="text-[10px] text-sidebar-foreground/40 truncate mt-0.5">{roleLabel(admin?.role)}</p>
              </div>

              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-sidebar-foreground/70 hover:text-sidebar-foreground"
                onClick={handleLogout}
                title="Logout"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}