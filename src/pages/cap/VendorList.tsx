import { AdminLayout } from '@/components/layout/AdminLayout';
import { DataTable } from '@/components/ui/data-table';
import { StatusBadge } from '@/components/ui/status-badge';
import { Button } from '@/components/ui/button';
import { vendors, formatCurrency, type Vendor } from '@/data/dummyData';
import { Eye, Edit, Trash2, Check, X } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { Progress } from '@/components/ui/progress';

export default function VendorList() {
  const handleApprove = (vendor: Vendor) => {
    toast({
      title: 'Vendor Approved',
      description: `${vendor.businessName} has been approved.`,
    });
  };

  const handleDelete = (vendor: Vendor) => {
    toast({
      title: 'Vendor Deleted',
      description: `${vendor.businessName} has been removed.`,
      variant: 'destructive',
    });
  };

  const handleDownload = () => {
    toast({
      title: 'Download Started',
      description: 'Vendor list is being downloaded as Excel.',
    });
  };

  const columns = [
    {
      key: 'businessName',
      header: 'Business',
      render: (vendor: Vendor) => (
        <div>
          <p className="font-medium text-foreground">{vendor.businessName}</p>
          <p className="text-sm text-muted-foreground">{vendor.city}, {vendor.state}</p>
        </div>
      ),
    },
    {
      key: 'ownerName',
      header: 'Owner',
      render: (vendor: Vendor) => (
        <div>
          <p className="text-foreground">{vendor.ownerName}</p>
          <p className="text-sm text-muted-foreground">{vendor.mobile}</p>
        </div>
      ),
    },
    {
      key: 'gstNumber',
      header: 'GST No.',
    },
    {
      key: 'totalSpent',
      header: 'Total Spent',
      render: (vendor: Vendor) => (
        <span className="font-medium">{formatCurrency(vendor.totalSpent)}</span>
      ),
    },
    {
      key: 'engagementScore',
      header: 'Engagement',
      render: (vendor: Vendor) => (
        <div className="flex items-center gap-2">
          <Progress value={vendor.engagementScore} className="w-16 h-2" />
          <span className="text-sm">{vendor.engagementScore}%</span>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (vendor: Vendor) => <StatusBadge status={vendor.status} />,
    },
  ];

  const actions = (vendor: Vendor) => (
    <div className="flex items-center justify-end gap-1">
      <Button variant="ghost" size="icon" className="h-8 w-8">
        <Eye className="h-4 w-4" />
      </Button>
      <Button variant="ghost" size="icon" className="h-8 w-8">
        <Edit className="h-4 w-4" />
      </Button>
      {vendor.status === 'pending' && (
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-success hover:text-success"
          onClick={() => handleApprove(vendor)}
        >
          <Check className="h-4 w-4" />
        </Button>
      )}
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 text-destructive hover:text-destructive"
        onClick={() => handleDelete(vendor)}
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );

  return (
    <AdminLayout panelType="cap" title="Vendors" subtitle="Manage all registered vendors">
      <DataTable
        data={vendors}
        columns={columns}
        searchKey="businessName"
        searchPlaceholder="Search vendors..."
        actions={actions}
        onDownload={handleDownload}
      />
    </AdminLayout>
  );
}
