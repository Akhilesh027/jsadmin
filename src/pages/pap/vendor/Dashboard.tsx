import { useEffect, useState } from 'react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { StatCard } from '@/components/ui/stat-card';
import { StatusBadge } from '@/components/ui/status-badge';
import { Button } from '@/components/ui/button';
import { ClipboardList, Truck, CreditCard, Ticket, Store } from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from '@/hooks/use-toast';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'https://api.jsgallor.com';

async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem('token');
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.message || 'Request failed');
  return data as T;
}

export default function VendorDashboard() {
  const [totalVendors, setTotalVendors] = useState(0);
  const [pendingVendors, setPendingVendors] = useState(0);
  const [loading, setLoading] = useState(true);

  // Placeholder for orders/tickets – replace with real API calls when available
  const [pendingOrders, setPendingOrders] = useState(0);
  const [activeOrders, setActiveOrders] = useState(0);
  const [openTickets, setOpenTickets] = useState(0);

  useEffect(() => {
    const fetchVendorStats = async () => {
      try {
        setLoading(true);
        const res = await api<any>('/api/admins/all');
        const vendors = Array.isArray(res) ? res : res.vendors || [];
        setTotalVendors(vendors.length);
        setPendingVendors(vendors.filter((v: any) => v.status === 'pending').length);
      } catch (err: any) {
        toast({ title: 'Failed to load vendor stats', description: err.message, variant: 'destructive' });
      } finally {
        setLoading(false);
      }
    };
    fetchVendorStats();

    // TODO: Replace with actual API calls for orders/tickets
    // Example: fetch('/api/orders/pending').then(...)
    setPendingOrders(0);
    setActiveOrders(0);
    setOpenTickets(0);
  }, []);

  return (
    <AdminLayout panelType="pap-vendor" title="Vendor Panel" subtitle="Manage vendor operations">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          title="Pending Approvals"
          value={loading ? '...' : pendingVendors}
          icon={ClipboardList}
          iconClassName="bg-warning/10"
        />
        <StatCard title="Active Orders" value={activeOrders} icon={Truck} iconClassName="bg-info/10" />
        <StatCard title="Open Tickets" value={openTickets} icon={Ticket} iconClassName="bg-destructive/10" />
        <StatCard title="Total Vendors" value={loading ? '...' : totalVendors} icon={Store} iconClassName="bg-success/10" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Link to="/pap/vendor/orders/approve" className="stat-card hover:border-primary/50 border border-transparent">
          <p className="font-medium">Approve Orders</p>
          <p className="text-sm text-muted-foreground">{pendingOrders} pending</p>
        </Link>
        <Link to="/pap/vendor/orders/track" className="stat-card hover:border-primary/50 border border-transparent">
          <p className="font-medium">Track Orders</p>
          <p className="text-sm text-muted-foreground">{activeOrders} in progress</p>
        </Link>
        <Link to="/pap/vendor/tickets" className="stat-card hover:border-primary/50 border border-transparent">
          <p className="font-medium">Support Tickets</p>
          <p className="text-sm text-muted-foreground">{openTickets} open</p>
        </Link>
        <Link to="/pap/vendor/forward" className="stat-card hover:border-primary/50 border border-transparent">
          <p className="font-medium">Forward to Mfg</p>
          <p className="text-sm text-muted-foreground">Process orders</p>
        </Link>
      </div>
    </AdminLayout>
  );
}