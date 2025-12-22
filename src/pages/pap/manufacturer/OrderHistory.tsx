import { AdminLayout } from '@/components/layout/AdminLayout';
import { DataTable } from '@/components/ui/data-table';
import { StatusBadge } from '@/components/ui/status-badge';
import { orders, formatCurrency, formatDate, type Order } from '@/data/dummyData';
import { Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function OrderHistory() {
  const columns = [
    {
      key: 'orderNumber',
      header: 'Order ID',
      render: (order: Order) => (
        <span className="font-mono font-medium">{order.orderNumber}</span>
      ),
    },
    {
      key: 'party',
      header: 'Party',
      render: (order: Order) => (
        <div>
          <p className="font-medium">{order.manufacturerName || order.vendorName || order.customerName}</p>
        </div>
      ),
    },
    {
      key: 'items',
      header: 'Items',
      render: (order: Order) => (
        <span className="text-sm">{order.items.map((i) => i.productName).join(', ')}</span>
      ),
    },
    {
      key: 'totalAmount',
      header: 'Amount',
      render: (order: Order) => (
        <span className="font-medium">{formatCurrency(order.totalAmount)}</span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (order: Order) => <StatusBadge status={order.status} />,
    },
    {
      key: 'createdAt',
      header: 'Date',
      render: (order: Order) => formatDate(order.createdAt),
    },
  ];

  const actions = (order: Order) => (
    <Button variant="ghost" size="icon" className="h-8 w-8">
      <Eye className="h-4 w-4" />
    </Button>
  );

  return (
    <AdminLayout
      panelType="pap-manufacturer"
      title="Order History"
      subtitle="View all manufacturer orders"
    >
      <DataTable
        data={orders}
        columns={columns}
        searchKey="orderNumber"
        searchPlaceholder="Search orders..."
        actions={actions}
      />
    </AdminLayout>
  );
}
