import { AdminLayout } from '@/components/layout/AdminLayout';
import { DataTable } from '@/components/ui/data-table';
import { StatusBadge } from '@/components/ui/status-badge';
import { Button } from '@/components/ui/button';
import { orders, formatCurrency, formatDate, type Order } from '@/data/dummyData';
import { Check, X, Eye } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface ApproveOrdersProps {
  panelType: 'pap-vendor' | 'eap';
  partyKey: 'vendorName' | 'customerName';
  title: string;
}

function ApproveOrdersBase({ panelType, partyKey, title }: ApproveOrdersProps) {
  const pendingOrders = orders.filter((o) => o.status === 'pending' && o[partyKey]);

  const handleApprove = (order: Order) => {
    toast({ title: 'Order Approved', description: `${order.orderNumber} has been approved.` });
  };

  const handleReject = (order: Order) => {
    toast({ title: 'Order Rejected', description: `${order.orderNumber} has been rejected.`, variant: 'destructive' });
  };

  const columns = [
    { key: 'orderNumber', header: 'Order ID', render: (o: Order) => <span className="font-mono">{o.orderNumber}</span> },
    { key: 'party', header: partyKey === 'vendorName' ? 'Vendor' : 'Customer', render: (o: Order) => o[partyKey] },
    { key: 'items', header: 'Items', render: (o: Order) => o.items.map(i => i.productName).join(', ') },
    { key: 'totalAmount', header: 'Amount', render: (o: Order) => <span className="font-semibold">{formatCurrency(o.totalAmount)}</span> },
    { key: 'paymentMode', header: 'Payment', render: (o: Order) => <span className="uppercase">{o.paymentMode}</span> },
    { key: 'status', header: 'Status', render: (o: Order) => <StatusBadge status={o.status} /> },
  ];

  const actions = (order: Order) => (
    <div className="flex gap-1">
      <Button variant="ghost" size="icon" className="h-8 w-8 text-success" onClick={() => handleApprove(order)}><Check className="h-4 w-4" /></Button>
      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleReject(order)}><X className="h-4 w-4" /></Button>
    </div>
  );

  return (
    <AdminLayout panelType={panelType} title={title} subtitle="Review and approve orders">
      <DataTable data={pendingOrders} columns={columns} searchKey="orderNumber" actions={actions} />
    </AdminLayout>
  );
}

export function VendorApproveOrders() {
  return <ApproveOrdersBase panelType="pap-vendor" partyKey="vendorName" title="Approve Vendor Orders" />;
}

export function CustomerApproveOrders() {
  return <ApproveOrdersBase panelType="eap" partyKey="customerName" title="Approve Customer Orders" />;
}
