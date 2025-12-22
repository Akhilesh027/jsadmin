import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Users,
  Factory,
  Store,
  ShoppingCart,
  Ticket,
  CreditCard,
  FileText,
  Settings,
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
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface NavItem {
  title: string;
  href?: string;
  icon: React.ElementType;
  children?: NavItem[];
}

const coreAdminNav: NavItem[] = [
  { title: 'Dashboard', href: '/cap', icon: LayoutDashboard },
  {
    title: 'Admin Management',
    icon: Shield,
    children: [
      { title: 'All Admins', href: '/cap/admins', icon: Users },
      { title: 'Add Admin', href: '/cap/admins/add', icon: UserCircle },
    ],
  },
  {
    title: 'Manufacturers',
    icon: Factory,
    children: [
      { title: 'All Manufacturers', href: '/cap/manufacturers', icon: Factory },
      { title: 'Activity Logs', href: '/cap/manufacturers/logs', icon: FileText },
    ],
  },
  {
    title: 'Vendors',
    icon: Store,
    children: [
      { title: 'All Vendors', href: '/cap/vendors', icon: Store },
      { title: 'Engagement Stats', href: '/cap/vendors/stats', icon: FileText },
    ],
  },
  { title: 'Customers', href: '/cap/customers', icon: Users },
  { title: 'Login Logs', href: '/cap/logs', icon: FileText },
];

const manufacturerAdminNav: NavItem[] = [
  { title: 'Dashboard', href: '/pap/manufacturer', icon: LayoutDashboard },
  { title: 'Catalog Approval', href: '/pap/manufacturer/catalog', icon: ClipboardList },
  { title: 'Place Orders', href: '/pap/manufacturer/orders/place', icon: Package },
  { title: 'Track Orders', href: '/pap/manufacturer/orders/track', icon: Truck },
  { title: 'Order History', href: '/pap/manufacturer/orders/history', icon: History },
  { title: 'Forward Catalogs', href: '/pap/manufacturer/forward', icon: Forward },
  { title: 'Tickets', href: '/pap/manufacturer/tickets', icon: Ticket },
  { title: 'Payments', href: '/pap/manufacturer/payments', icon: CreditCard },
  { title: 'Manufacturer List', href: '/pap/manufacturer/list', icon: Factory },
];

const vendorAdminNav: NavItem[] = [
  { title: 'Dashboard', href: '/pap/vendor', icon: LayoutDashboard },
  { title: 'Approve Orders', href: '/pap/vendor/orders/approve', icon: ClipboardList },
  { title: 'Order History', href: '/pap/vendor/orders/history', icon: History },
  { title: 'Track Orders', href: '/pap/vendor/orders/track', icon: Truck },
  { title: 'Forward to Mfg', href: '/pap/vendor/forward', icon: Forward },
  { title: 'Tickets', href: '/pap/vendor/tickets', icon: Ticket },
  { title: 'Payments', href: '/pap/vendor/payments', icon: CreditCard },
  { title: 'Vendor List', href: '/pap/vendor/list', icon: Store },
];

const ecommerceAdminNav: NavItem[] = [
  { title: 'Dashboard', href: '/eap', icon: LayoutDashboard },
  { title: 'Customer Orders', href: '/eap/orders/approve', icon: ShoppingCart },
  { title: 'Order History', href: '/eap/orders/history', icon: History },
  { title: 'Track Orders', href: '/eap/orders/track', icon: Truck },
  { title: 'Forward to Mfg', href: '/eap/forward', icon: Forward },
  { title: 'Tickets', href: '/eap/tickets', icon: Ticket },
  { title: 'Payments', href: '/eap/payments', icon: CreditCard },
  { title: 'Customer List', href: '/eap/customers', icon: Users },
];

interface AdminSidebarProps {
  panelType: 'cap' | 'pap-manufacturer' | 'pap-vendor' | 'eap';
}

export function AdminSidebar({ panelType }: AdminSidebarProps) {
  const location = useLocation();
  const [expandedItems, setExpandedItems] = useState<string[]>([]);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const getNavItems = () => {
    switch (panelType) {
      case 'cap':
        return coreAdminNav;
      case 'pap-manufacturer':
        return manufacturerAdminNav;
      case 'pap-vendor':
        return vendorAdminNav;
      case 'eap':
        return ecommerceAdminNav;
      default:
        return [];
    }
  };

  const getPanelTitle = () => {
    switch (panelType) {
      case 'cap':
        return 'Core Admin Panel';
      case 'pap-manufacturer':
        return 'Manufacturer Panel';
      case 'pap-vendor':
        return 'Vendor Panel';
      case 'eap':
        return 'Ecommerce Panel';
      default:
        return 'Admin Panel';
    }
  };

  const toggleExpanded = (title: string) => {
    setExpandedItems((prev) =>
      prev.includes(title) ? prev.filter((t) => t !== title) : [...prev, title]
    );
  };

  const navItems = getNavItems();

  const renderNavItem = (item: NavItem, level = 0) => {
    const hasChildren = item.children && item.children.length > 0;
    const isExpanded = expandedItems.includes(item.title);
    const isActive = item.href ? location.pathname === item.href : false;

    if (hasChildren) {
      return (
        <div key={item.title}>
          <button
            onClick={() => toggleExpanded(item.title)}
            className={cn(
              'w-full sidebar-link',
              isExpanded && 'bg-sidebar-accent/50'
            )}
          >
            <item.icon className="h-5 w-5 flex-shrink-0" />
            <span className="flex-1 text-left">{item.title}</span>
            {isExpanded ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </button>
          {isExpanded && (
            <div className="ml-4 mt-1 space-y-1">
              {item.children?.map((child) => renderNavItem(child, level + 1))}
            </div>
          )}
        </div>
      );
    }

    return (
      <NavLink
        key={item.title}
        to={item.href || '#'}
        onClick={() => setIsMobileOpen(false)}
        className={({ isActive }) =>
          cn('sidebar-link', isActive && 'sidebar-link-active')
        }
      >
        <item.icon className="h-5 w-5 flex-shrink-0" />
        <span>{item.title}</span>
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
        <div
          className="fixed inset-0 bg-foreground/50 z-40 lg:hidden"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed left-0 top-0 z-40 h-screen w-64 bg-sidebar transition-transform duration-300 lg:translate-x-0',
          isMobileOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Logo */}
        <div className="flex h-16 items-center gap-3 border-b border-sidebar-border px-6">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg gradient-gold">
            <span className="font-display text-lg font-bold text-sidebar-primary-foreground">JG</span>
          </div>
          <div>
            <h1 className="font-display text-lg font-bold text-sidebar-foreground">JS GALLOR</h1>
            <p className="text-xs text-sidebar-foreground/60">{getPanelTitle()}</p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-4 space-y-1">
          {navItems.map((item) => renderNavItem(item))}
        </nav>

        {/* Panel Switcher */}
        <div className="border-t border-sidebar-border p-4">
          <p className="text-xs text-sidebar-foreground/50 mb-2 px-2">Switch Panel</p>
          <div className="space-y-1">
            <NavLink
              to="/cap"
              className={({ isActive }) =>
                cn('sidebar-link text-sm', isActive && 'sidebar-link-active')
              }
            >
              <Shield className="h-4 w-4" />
              <span>Core Admin</span>
            </NavLink>
            <NavLink
              to="/pap/manufacturer"
              className={({ isActive }) =>
                cn('sidebar-link text-sm', isActive && 'sidebar-link-active')
              }
            >
              <Factory className="h-4 w-4" />
              <span>Manufacturer</span>
            </NavLink>
            <NavLink
              to="/pap/vendor"
              className={({ isActive }) =>
                cn('sidebar-link text-sm', isActive && 'sidebar-link-active')
              }
            >
              <Store className="h-4 w-4" />
              <span>Vendor</span>
            </NavLink>
            <NavLink
              to="/eap"
              className={({ isActive }) =>
                cn('sidebar-link text-sm', isActive && 'sidebar-link-active')
              }
            >
              <ShoppingCart className="h-4 w-4" />
              <span>Ecommerce</span>
            </NavLink>
          </div>
        </div>

        {/* User Profile */}
        <div className="border-t border-sidebar-border p-4">
          <div className="flex items-center gap-3 px-2">
            <div className="h-9 w-9 rounded-full bg-sidebar-accent flex items-center justify-center">
              <UserCircle className="h-5 w-5 text-sidebar-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-sidebar-foreground truncate">Super Admin</p>
              <p className="text-xs text-sidebar-foreground/50 truncate">admin@jsgallor.com</p>
            </div>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-sidebar-foreground/70 hover:text-sidebar-foreground">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </aside>
    </>
  );
}
