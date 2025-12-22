import { ReactNode } from 'react';
import { AdminSidebar } from './AdminSidebar';
import { AdminHeader } from './AdminHeader';

interface AdminLayoutProps {
  children: ReactNode;
  panelType: 'cap' | 'pap-manufacturer' | 'pap-vendor' | 'eap';
  title: string;
  subtitle?: string;
}

export function AdminLayout({ children, panelType, title, subtitle }: AdminLayoutProps) {
  return (
    <div className="min-h-screen bg-background">
      <AdminSidebar panelType={panelType} />
      <div className="lg:ml-64">
        <AdminHeader title={title} subtitle={subtitle} />
        <main className="p-4 md:p-6 lg:p-8 animate-fade-in">
          {children}
        </main>
      </div>
    </div>
  );
}
