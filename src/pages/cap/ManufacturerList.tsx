import { AdminLayout } from '@/components/layout/AdminLayout';
import { DataTable } from '@/components/ui/data-table';
import { StatusBadge } from '@/components/ui/status-badge';
import { Button } from '@/components/ui/button';
import { manufacturers, formatCurrency, type Manufacturer } from '@/data/dummyData';
import { Eye, Edit, Trash2, Check, X, Download } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

export default function ManufacturerList() {
  const handleApprove = (mfg: Manufacturer) => {
    toast({
      title: 'Manufacturer Approved',
      description: `${mfg.companyName} has been approved.`,
    });
  };

  const handleReject = (mfg: Manufacturer) => {
    toast({
      title: 'Manufacturer Rejected',
      description: `${mfg.companyName} has been rejected.`,
      variant: 'destructive',
    });
  };

  const handleDelete = (mfg: Manufacturer) => {
    toast({
      title: 'Manufacturer Deleted',
      description: `${mfg.companyName} has been removed.`,
      variant: 'destructive',
    });
  };

  const handleDownload = () => {
    toast({
      title: 'Download Started',
      description: 'Manufacturer list is being downloaded as Excel.',
    });
  };

  const columns = [
    {
      key: 'companyName',
      header: 'Company',
      render: (mfg: Manufacturer) => (
        <div>
          <p className="font-medium text-foreground">{mfg.companyName}</p>
          <p className="text-sm text-muted-foreground">{mfg.city}, {mfg.state}</p>
        </div>
      ),
    },
    {
      key: 'contactPerson',
      header: 'Contact',
      render: (mfg: Manufacturer) => (
        <div>
          <p className="text-foreground">{mfg.contactPerson}</p>
          <p className="text-sm text-muted-foreground">{mfg.mobile}</p>
        </div>
      ),
    },
    {
      key: 'gstNumber',
      header: 'GST No.',
    },
    {
      key: 'catalogCount',
      header: 'Catalogs',
      render: (mfg: Manufacturer) => (
        <span className="font-medium">{mfg.catalogCount}</span>
      ),
    },
    {
      key: 'totalRevenue',
      header: 'Revenue',
      render: (mfg: Manufacturer) => (
        <span className="font-medium">{formatCurrency(mfg.totalRevenue)}</span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (mfg: Manufacturer) => <StatusBadge status={mfg.status} />,
    },
  ];

  const actions = (mfg: Manufacturer) => (
    <div className="flex items-center justify-end gap-1">
      <Button variant="ghost" size="icon" className="h-8 w-8">
        <Eye className="h-4 w-4" />
      </Button>
      <Button variant="ghost" size="icon" className="h-8 w-8">
        <Edit className="h-4 w-4" />
      </Button>
      {mfg.status === 'pending' && (
        <>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-success hover:text-success"
            onClick={() => handleApprove(mfg)}
          >
            <Check className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-destructive hover:text-destructive"
            onClick={() => handleReject(mfg)}
          >
            <X className="h-4 w-4" />
          </Button>
        </>
      )}
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 text-destructive hover:text-destructive"
        onClick={() => handleDelete(mfg)}
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );

  return (
    <AdminLayout
      panelType="cap"
      title="Manufacturers"
      subtitle="Manage all registered manufacturers"
    >
      <DataTable
        data={manufacturers}
        columns={columns}
        searchKey="companyName"
        searchPlaceholder="Search manufacturers..."
        actions={actions}
        onDownload={handleDownload}
      />
    </AdminLayout>
  );
}
