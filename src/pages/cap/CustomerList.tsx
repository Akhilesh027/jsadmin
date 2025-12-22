import { AdminLayout } from '@/components/layout/AdminLayout';
import { DataTable } from '@/components/ui/data-table';
import { customers, formatCurrency, formatDate, type Customer } from '@/data/dummyData';
import { Eye, ShoppingBag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';

export default function CustomerList() {
  const handleDownload = () => {
    toast({
      title: 'Download Started',
      description: 'Customer data is being downloaded.',
    });
  };

  const columns = [
    {
      key: 'name',
      header: 'Customer',
      render: (customer: Customer) => (
        <div>
          <p className="font-medium text-foreground">{customer.name}</p>
          <p className="text-sm text-muted-foreground">{customer.email}</p>
        </div>
      ),
    },
    {
      key: 'mobile',
      header: 'Mobile',
    },
    {
      key: 'city',
      header: 'Location',
      render: (customer: Customer) => `${customer.city}, ${customer.state}`,
    },
    {
      key: 'totalOrders',
      header: 'Orders',
      render: (customer: Customer) => (
        <div className="flex items-center gap-2">
          <ShoppingBag className="h-4 w-4 text-muted-foreground" />
          <span>{customer.totalOrders}</span>
        </div>
      ),
    },
    {
      key: 'lifetimeSpend',
      header: 'Lifetime Spend',
      render: (customer: Customer) => (
        <span className="font-medium">{formatCurrency(customer.lifetimeSpend)}</span>
      ),
    },
    {
      key: 'lastOrderDate',
      header: 'Last Order',
      render: (customer: Customer) => formatDate(customer.lastOrderDate),
    },
  ];

  const actions = (customer: Customer) => (
    <div className="flex items-center justify-end gap-2">
      <Button variant="ghost" size="icon" className="h-8 w-8">
        <Eye className="h-4 w-4" />
      </Button>
    </div>
  );

  return (
    <AdminLayout panelType="cap" title="Customers" subtitle="View all registered customers">
      <DataTable
        data={customers}
        columns={columns}
        searchKey="name"
        searchPlaceholder="Search customers..."
        actions={actions}
        onDownload={handleDownload}
      />
    </AdminLayout>
  );
}
