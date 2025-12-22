import { AdminLayout } from '@/components/layout/AdminLayout';
import { StatCard } from '@/components/ui/stat-card';
import { DataTable } from '@/components/ui/data-table';
import { StatusBadge } from '@/components/ui/status-badge';
import { Button } from '@/components/ui/button';
import {
  Factory,
  Store,
  Users,
  ShoppingCart,
  Ticket,
  CreditCard,
  TrendingUp,
  Clock,
  Eye,
} from 'lucide-react';
import {
  dashboardStats,
  orders,
  tickets,
  formatCurrency,
  formatDate,
  type Order,
  type Ticket as TicketType,
} from '@/data/dummyData';
import { Link } from 'react-router-dom';

export default function CAPDashboard() {
  const recentOrders = orders.slice(0, 5);
  const recentTickets = tickets.slice(0, 3);

  return (
    <AdminLayout panelType="cap" title="Dashboard" subtitle="Welcome back, Super Admin">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-8">
        <StatCard
          title="Manufacturers"
          value={dashboardStats.totalManufacturers}
          icon={Factory}
          trend={{ value: 12, isPositive: true }}
          iconClassName="gradient-gold"
        />
        <StatCard
          title="Vendors"
          value={dashboardStats.totalVendors}
          icon={Store}
          trend={{ value: 8, isPositive: true }}
          iconClassName="gradient-navy"
        />
        <StatCard
          title="Customers"
          value={dashboardStats.totalCustomers.toLocaleString('en-IN')}
          icon={Users}
          trend={{ value: 15, isPositive: true }}
        />
        <StatCard
          title="Total Orders"
          value={dashboardStats.totalOrders.toLocaleString('en-IN')}
          icon={ShoppingCart}
          trend={{ value: 23, isPositive: true }}
        />
        <StatCard
          title="Open Tickets"
          value={dashboardStats.totalTickets}
          icon={Ticket}
          trend={{ value: 5, isPositive: false }}
        />
        <StatCard
          title="Revenue"
          value={formatCurrency(dashboardStats.totalPayments)}
          icon={CreditCard}
          trend={{ value: 18, isPositive: true }}
        />
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 mb-8">
        <Link to="/cap/admins/add" className="stat-card flex items-center gap-4 hover:border-primary/50 border border-transparent">
          <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
            <Users className="h-6 w-6 text-primary" />
          </div>
          <div>
            <p className="font-semibold text-foreground">Add New Admin</p>
            <p className="text-sm text-muted-foreground">Create admin account</p>
          </div>
        </Link>
        <Link to="/cap/manufacturers" className="stat-card flex items-center gap-4 hover:border-primary/50 border border-transparent">
          <div className="h-12 w-12 rounded-xl bg-warning/10 flex items-center justify-center">
            <Clock className="h-6 w-6 text-warning" />
          </div>
          <div>
            <p className="font-semibold text-foreground">{dashboardStats.pendingApprovals} Pending</p>
            <p className="text-sm text-muted-foreground">Awaiting approval</p>
          </div>
        </Link>
        <Link to="/cap/vendors" className="stat-card flex items-center gap-4 hover:border-primary/50 border border-transparent">
          <div className="h-12 w-12 rounded-xl bg-success/10 flex items-center justify-center">
            <TrendingUp className="h-6 w-6 text-success" />
          </div>
          <div>
            <p className="font-semibold text-foreground">{dashboardStats.activeOrders} Active</p>
            <p className="text-sm text-muted-foreground">Orders in progress</p>
          </div>
        </Link>
        <Link to="/cap/logs" className="stat-card flex items-center gap-4 hover:border-primary/50 border border-transparent">
          <div className="h-12 w-12 rounded-xl bg-info/10 flex items-center justify-center">
            <Eye className="h-6 w-6 text-info" />
          </div>
          <div>
            <p className="font-semibold text-foreground">View Logs</p>
            <p className="text-sm text-muted-foreground">Admin activity</p>
          </div>
        </Link>
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Recent Orders */}
        <div className="bg-card rounded-xl border border-border p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-foreground">Recent Orders</h3>
            <Link to="/eap/orders/history">
              <Button variant="ghost" size="sm">View All</Button>
            </Link>
          </div>
          <div className="space-y-4">
            {recentOrders.map((order) => (
              <div key={order.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                <div>
                  <p className="font-medium text-foreground">{order.orderNumber}</p>
                  <p className="text-sm text-muted-foreground">
                    {order.customerName || order.vendorName || order.manufacturerName}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-medium text-foreground">{formatCurrency(order.totalAmount)}</p>
                  <StatusBadge status={order.status} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Tickets */}
        <div className="bg-card rounded-xl border border-border p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-foreground">Recent Tickets</h3>
            <Link to="/pap/manufacturer/tickets">
              <Button variant="ghost" size="sm">View All</Button>
            </Link>
          </div>
          <div className="space-y-4">
            {recentTickets.map((ticket) => (
              <div key={ticket.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                <div>
                  <p className="font-medium text-foreground">{ticket.ticketNumber}</p>
                  <p className="text-sm text-muted-foreground line-clamp-1">{ticket.subject}</p>
                </div>
                <div className="text-right">
                  <StatusBadge status={ticket.priority} variant="priority" />
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
