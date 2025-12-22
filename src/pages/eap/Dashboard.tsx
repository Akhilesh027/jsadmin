import { AdminLayout } from '@/components/layout/AdminLayout';
import { StatCard } from '@/components/ui/stat-card';
import { StatusBadge } from '@/components/ui/status-badge';
import { Button } from '@/components/ui/button';
import { ShoppingCart, Truck, CreditCard, Ticket, Users } from 'lucide-react';
import { orders, customers, tickets, formatCurrency } from '@/data/dummyData';
import { Link } from 'react-router-dom';

export default function EcommerceDashboard() {
  const pendingOrders = orders.filter((o) => o.status === 'pending' && o.customerName).length;
  const activeOrders = orders.filter((o) => !['delivered', 'rejected'].includes(o.status) && o.customerName).length;
  const openTickets = tickets.filter((t) => t.status === 'open' && t.createdByType === 'customer').length;

  return (
    <AdminLayout panelType="eap" title="Ecommerce Panel" subtitle="Manage customer orders and support">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard title="Pending Orders" value={pendingOrders} icon={ShoppingCart} iconClassName="bg-warning/10" />
        <StatCard title="Active Orders" value={activeOrders} icon={Truck} iconClassName="bg-info/10" />
        <StatCard title="Open Tickets" value={openTickets} icon={Ticket} iconClassName="bg-destructive/10" />
        <StatCard title="Total Customers" value={customers.length} icon={Users} iconClassName="bg-success/10" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Link to="/eap/orders/approve" className="stat-card hover:border-primary/50 border border-transparent">
          <p className="font-medium">Customer Orders</p>
          <p className="text-sm text-muted-foreground">{pendingOrders} pending approval</p>
        </Link>
        <Link to="/eap/orders/track" className="stat-card hover:border-primary/50 border border-transparent">
          <p className="font-medium">Track Orders</p>
          <p className="text-sm text-muted-foreground">{activeOrders} in progress</p>
        </Link>
        <Link to="/eap/tickets" className="stat-card hover:border-primary/50 border border-transparent">
          <p className="font-medium">Customer Support</p>
          <p className="text-sm text-muted-foreground">{openTickets} open tickets</p>
        </Link>
        <Link to="/eap/customers" className="stat-card hover:border-primary/50 border border-transparent">
          <p className="font-medium">All Customers</p>
          <p className="text-sm text-muted-foreground">{customers.length} registered</p>
        </Link>
      </div>
    </AdminLayout>
  );
}
