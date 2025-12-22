import { AdminLayout } from '@/components/layout/AdminLayout';
import { StatCard } from '@/components/ui/stat-card';
import { StatusBadge } from '@/components/ui/status-badge';
import { Button } from '@/components/ui/button';
import {
  ClipboardList,
  Package,
  Truck,
  CreditCard,
  Ticket,
  Factory,
  TrendingUp,
} from 'lucide-react';
import {
  catalogItems,
  orders,
  tickets,
  payments,
  formatCurrency,
  formatDate,
} from '@/data/dummyData';
import { Link } from 'react-router-dom';

export default function ManufacturerDashboard() {
  const pendingCatalogs = catalogItems.filter((c) => c.status === 'pending').length;
  const activeOrders = orders.filter((o) => !['delivered', 'rejected'].includes(o.status)).length;
  const openTickets = tickets.filter((t) => t.status === 'open' && t.createdByType === 'manufacturer').length;
  const pendingPayments = payments.filter((p) => p.status === 'pending' && p.partyType === 'manufacturer').length;

  return (
    <AdminLayout
      panelType="pap-manufacturer"
      title="Manufacturer Panel"
      subtitle="Manage manufacturer operations"
    >
      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          title="Pending Catalogs"
          value={pendingCatalogs}
          icon={ClipboardList}
          iconClassName="bg-warning/10"
        />
        <StatCard
          title="Active Orders"
          value={activeOrders}
          icon={Package}
          iconClassName="bg-info/10"
        />
        <StatCard
          title="Open Tickets"
          value={openTickets}
          icon={Ticket}
          iconClassName="bg-destructive/10"
        />
        <StatCard
          title="Pending Payments"
          value={pendingPayments}
          icon={CreditCard}
          iconClassName="bg-success/10"
        />
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Link to="/pap/manufacturer/catalog" className="stat-card hover:border-primary/50 border border-transparent">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-warning/10 flex items-center justify-center">
              <ClipboardList className="h-5 w-5 text-warning" />
            </div>
            <div>
              <p className="font-medium">Review Catalogs</p>
              <p className="text-sm text-muted-foreground">{pendingCatalogs} pending approval</p>
            </div>
          </div>
        </Link>
        <Link to="/pap/manufacturer/orders/place" className="stat-card hover:border-primary/50 border border-transparent">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Package className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="font-medium">Place Order</p>
              <p className="text-sm text-muted-foreground">Create purchase order</p>
            </div>
          </div>
        </Link>
        <Link to="/pap/manufacturer/orders/track" className="stat-card hover:border-primary/50 border border-transparent">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-info/10 flex items-center justify-center">
              <Truck className="h-5 w-5 text-info" />
            </div>
            <div>
              <p className="font-medium">Track Orders</p>
              <p className="text-sm text-muted-foreground">{activeOrders} in progress</p>
            </div>
          </div>
        </Link>
        <Link to="/pap/manufacturer/forward" className="stat-card hover:border-primary/50 border border-transparent">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-success/10 flex items-center justify-center">
              <TrendingUp className="h-5 w-5 text-success" />
            </div>
            <div>
              <p className="font-medium">Forward Catalogs</p>
              <p className="text-sm text-muted-foreground">To website or vendors</p>
            </div>
          </div>
        </Link>
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Catalogs */}
        <div className="bg-card rounded-xl border border-border p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">Recent Catalog Submissions</h3>
            <Link to="/pap/manufacturer/catalog">
              <Button variant="ghost" size="sm">View All</Button>
            </Link>
          </div>
          <div className="space-y-3">
            {catalogItems.slice(0, 4).map((item) => (
              <div key={item.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-lg bg-muted flex items-center justify-center">
                    <Factory className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">{item.productName}</p>
                    <p className="text-xs text-muted-foreground">{item.manufacturerName}</p>
                  </div>
                </div>
                <StatusBadge status={item.status} />
              </div>
            ))}
          </div>
        </div>

        {/* Recent Tickets */}
        <div className="bg-card rounded-xl border border-border p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">Manufacturer Tickets</h3>
            <Link to="/pap/manufacturer/tickets">
              <Button variant="ghost" size="sm">View All</Button>
            </Link>
          </div>
          <div className="space-y-3">
            {tickets
              .filter((t) => t.createdByType === 'manufacturer')
              .slice(0, 3)
              .map((ticket) => (
                <div key={ticket.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                  <div>
                    <p className="font-medium text-sm">{ticket.ticketNumber}</p>
                    <p className="text-xs text-muted-foreground line-clamp-1">{ticket.subject}</p>
                  </div>
                  <div className="text-right">
                    <StatusBadge status={ticket.status} />
                    <p className="text-xs text-muted-foreground mt-1">{formatDate(ticket.createdAt)}</p>
                  </div>
                </div>
              ))}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
