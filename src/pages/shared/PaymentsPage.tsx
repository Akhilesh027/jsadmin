import { AdminLayout } from '@/components/layout/AdminLayout';
import { DataTable } from '@/components/ui/data-table';
import { StatusBadge } from '@/components/ui/status-badge';
import { payments, formatCurrency, formatDate, type Payment } from '@/data/dummyData';
import { ArrowDownLeft, ArrowUpRight, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface PaymentsPageProps {
  panelType: 'pap-manufacturer' | 'pap-vendor' | 'eap';
  partyType: 'manufacturer' | 'vendor' | 'customer';
}

export default function PaymentsPage({ panelType, partyType }: PaymentsPageProps) {
  const filteredPayments = payments.filter((p) => p.partyType === partyType);

  const handleDownload = () => {
    toast({
      title: 'Receipt Downloaded',
      description: 'Payment receipt has been downloaded.',
    });
  };

  const columns = [
    {
      key: 'transactionId',
      header: 'Transaction ID',
      render: (payment: Payment) => (
        <span className="font-mono text-sm">{payment.transactionId}</span>
      ),
    },
    {
      key: 'partyName',
      header: partyType === 'manufacturer' ? 'Manufacturer' : partyType === 'vendor' ? 'Vendor' : 'Customer',
    },
    {
      key: 'type',
      header: 'Type',
      render: (payment: Payment) => (
        <div className="flex items-center gap-2">
          {payment.type === 'incoming' ? (
            <ArrowDownLeft className="h-4 w-4 text-success" />
          ) : (
            <ArrowUpRight className="h-4 w-4 text-destructive" />
          )}
          <span className={cn(
            'font-medium',
            payment.type === 'incoming' ? 'text-success' : 'text-destructive'
          )}>
            {payment.type === 'incoming' ? 'Received' : 'Paid'}
          </span>
        </div>
      ),
    },
    {
      key: 'amount',
      header: 'Amount',
      render: (payment: Payment) => (
        <span className="font-semibold">{formatCurrency(payment.amount)}</span>
      ),
    },
    {
      key: 'paymentMethod',
      header: 'Method',
      render: (payment: Payment) => (
        <span className="capitalize">{payment.paymentMethod.replace('_', ' ')}</span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (payment: Payment) => <StatusBadge status={payment.status} />,
    },
    {
      key: 'date',
      header: 'Date',
      render: (payment: Payment) => formatDate(payment.date),
    },
  ];

  const actions = (payment: Payment) => (
    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleDownload}>
      <Download className="h-4 w-4" />
    </Button>
  );

  const title = partyType === 'manufacturer' ? 'Manufacturer Payments' :
                partyType === 'vendor' ? 'Vendor Payments' : 'Customer Payments';

  return (
    <AdminLayout panelType={panelType} title={title} subtitle="Track payment transactions">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-card rounded-xl border border-border p-4">
          <p className="text-sm text-muted-foreground">Total Received</p>
          <p className="text-2xl font-bold text-success">
            {formatCurrency(
              filteredPayments
                .filter((p) => p.type === 'incoming' && p.status === 'completed')
                .reduce((sum, p) => sum + p.amount, 0)
            )}
          </p>
        </div>
        <div className="bg-card rounded-xl border border-border p-4">
          <p className="text-sm text-muted-foreground">Total Paid</p>
          <p className="text-2xl font-bold text-destructive">
            {formatCurrency(
              filteredPayments
                .filter((p) => p.type === 'outgoing' && p.status === 'completed')
                .reduce((sum, p) => sum + p.amount, 0)
            )}
          </p>
        </div>
        <div className="bg-card rounded-xl border border-border p-4">
          <p className="text-sm text-muted-foreground">Pending</p>
          <p className="text-2xl font-bold text-warning">
            {formatCurrency(
              filteredPayments
                .filter((p) => p.status === 'pending')
                .reduce((sum, p) => sum + p.amount, 0)
            )}
          </p>
        </div>
      </div>

      <DataTable
        data={filteredPayments}
        columns={columns}
        searchKey="transactionId"
        searchPlaceholder="Search transactions..."
        actions={actions}
      />
    </AdminLayout>
  );
}

export function ManufacturerPayments() {
  return <PaymentsPage panelType="pap-manufacturer" partyType="manufacturer" />;
}

export function VendorPayments() {
  return <PaymentsPage panelType="pap-vendor" partyType="vendor" />;
}

export function CustomerPayments() {
  return <PaymentsPage panelType="eap" partyType="customer" />;
}
