import { AdminLayout } from '@/components/layout/AdminLayout';
import { DataTable } from '@/components/ui/data-table';
import { loginLogs, type LoginLog } from '@/data/dummyData';
import { Monitor, Smartphone, Globe } from 'lucide-react';

export default function LoginLogs() {
  const getDeviceIcon = (device: string) => {
    if (device.toLowerCase().includes('android') || device.toLowerCase().includes('ios')) {
      return <Smartphone className="h-4 w-4 text-muted-foreground" />;
    }
    return <Monitor className="h-4 w-4 text-muted-foreground" />;
  };

  const columns = [
    {
      key: 'adminName',
      header: 'Admin',
      render: (log: LoginLog) => (
        <div>
          <p className="font-medium text-foreground">{log.adminName}</p>
          <p className="text-sm text-muted-foreground">{log.email}</p>
        </div>
      ),
    },
    {
      key: 'loginTime',
      header: 'Login Time',
      render: (log: LoginLog) => (
        <span className="text-sm font-mono">{log.loginTime}</span>
      ),
    },
    {
      key: 'logoutTime',
      header: 'Logout Time',
      render: (log: LoginLog) => (
        <span className="text-sm font-mono">
          {log.logoutTime || (
            <span className="text-success font-sans">Active Session</span>
          )}
        </span>
      ),
    },
    {
      key: 'device',
      header: 'Device',
      render: (log: LoginLog) => (
        <div className="flex items-center gap-2">
          {getDeviceIcon(log.device)}
          <span className="text-sm">{log.device}</span>
        </div>
      ),
    },
    {
      key: 'ipAddress',
      header: 'IP Address',
      render: (log: LoginLog) => (
        <span className="font-mono text-sm">{log.ipAddress}</span>
      ),
    },
    {
      key: 'location',
      header: 'Location',
      render: (log: LoginLog) => (
        <div className="flex items-center gap-2">
          <Globe className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm">{log.location}</span>
        </div>
      ),
    },
  ];

  return (
    <AdminLayout panelType="cap" title="Login Logs" subtitle="Track admin login activity">
      <DataTable
        data={loginLogs}
        columns={columns}
        searchKey="adminName"
        searchPlaceholder="Search by admin name..."
      />
    </AdminLayout>
  );
}
