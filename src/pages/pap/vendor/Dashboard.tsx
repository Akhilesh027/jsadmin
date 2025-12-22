import { AdminLayout } from '@/components/layout/AdminLayout';
import { StatCard } from '@/components/ui/stat-card';
import { StatusBadge } from '@/components/ui/status-badge';
import { Button } from '@/components/ui/button';
import { ClipboardList, Truck, CreditCard, Ticket, Store } from 'lucide-react';
import { orders, tickets, formatCurrency, formatDate } from '@/data/dummyData';
import { Link } from 'react-router-dom';

export default function VendorDashboard() {
  const pendingOrders = orders.filter((o) => o.status === 'pending' && o.vendorName).length;
  const activeOrders = orders.filter((o) => !['delivered', 'rejected'].includes(o.status) && o.vendorName).length;
  const openTickets = tickets.filter((t) => t.status === 'open' && t.createdByType === 'vendor').length;

  return (
    <AdminLayout panelType="pap-vendor" title="Vendor Panel" subtitle="Manage vendor operations">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard title="Pending Approvals" value={pendingOrders} icon={ClipboardList} iconClassName="bg-warning/10" />
        <StatCard title="Active Orders" value={activeOrders} icon={Truck} iconClassName="bg-info/10" />
        <StatCard title="Open Tickets" value={openTickets} icon={Ticket} iconClassName="bg-destructive/10" />
        <StatCard title="Total Vendors" value={5} icon={Store} iconClassName="bg-success/10" />
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
