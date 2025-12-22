import { AdminLayout } from '@/components/layout/AdminLayout';
import { DataTable } from '@/components/ui/data-table';
import { StatusBadge } from '@/components/ui/status-badge';
import { Button } from '@/components/ui/button';
import { admins, type Admin } from '@/data/dummyData';
import { Eye, Edit, Trash2, UserPlus } from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from '@/hooks/use-toast';

export default function AdminList() {
  const handleDeactivate = (admin: Admin) => {
    toast({
      title: admin.status === 'active' ? 'Admin Deactivated' : 'Admin Activated',
      description: `${admin.name} has been ${admin.status === 'active' ? 'deactivated' : 'activated'}.`,
    });
  };

  const handleDelete = (admin: Admin) => {
    toast({
      title: 'Admin Deleted',
      description: `${admin.name} has been removed from the system.`,
      variant: 'destructive',
    });
  };

  const roleLabels: Record<string, string> = {
    manufacturer_admin: 'Manufacturer Admin',
    vendor_admin: 'Vendor Admin',
    ecommerce_admin: 'Ecommerce Admin',
  };

  const columns = [
    {
      key: 'name',
      header: 'Admin Name',
      render: (admin: Admin) => (
        <div>
          <p className="font-medium text-foreground">{admin.name}</p>
          <p className="text-sm text-muted-foreground">{admin.email}</p>
        </div>
      ),
    },
    {
      key: 'mobile',
      header: 'Mobile',
    },
    {
      key: 'role',
      header: 'Role',
      render: (admin: Admin) => (
        <span className="text-sm font-medium">{roleLabels[admin.role]}</span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (admin: Admin) => <StatusBadge status={admin.status} />,
    },
    {
      key: 'createdAt',
      header: 'Created',
    },
  ];

  const actions = (admin: Admin) => (
    <div className="flex items-center justify-end gap-2">
      <Button variant="ghost" size="icon" className="h-8 w-8">
        <Eye className="h-4 w-4" />
      </Button>
      <Link to={`/cap/admins/edit/${admin.id}`}>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <Edit className="h-4 w-4" />
        </Button>
      </Link>
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        onClick={() => handleDeactivate(admin)}
      >
        <span className={`h-3 w-3 rounded-full ${admin.status === 'active' ? 'bg-destructive' : 'bg-success'}`} />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 text-destructive hover:text-destructive"
        onClick={() => handleDelete(admin)}
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );

  return (
    <AdminLayout panelType="cap" title="Admin Management" subtitle="Manage system administrators">
      <div className="flex justify-end mb-6">
        <Link to="/cap/admins/add">
          <Button>
            <UserPlus className="h-4 w-4 mr-2" />
            Add New Admin
          </Button>
        </Link>
      </div>

      <DataTable
        data={admins}
        columns={columns}
        searchKey="name"
        searchPlaceholder="Search admins..."
        actions={actions}
      />
    </AdminLayout>
  );
}
