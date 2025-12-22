import { AdminLayout } from '@/components/layout/AdminLayout';
import { orders, formatCurrency, formatDate, type Order } from '@/data/dummyData';
import { Package, Truck, CheckCircle, Clock, MapPin } from 'lucide-react';
import { cn } from '@/lib/utils';

const statusSteps = [
  { key: 'pending', label: 'Pending', icon: Clock },
  { key: 'packed', label: 'Packed', icon: Package },
  { key: 'shipped', label: 'Shipped', icon: Truck },
  { key: 'in_transit', label: 'In Transit', icon: Truck },
  { key: 'out_for_delivery', label: 'Out for Delivery', icon: MapPin },
  { key: 'delivered', label: 'Delivered', icon: CheckCircle },
];

const getStatusIndex = (status: string) => {
  return statusSteps.findIndex((s) => s.key === status);
};

export default function TrackOrders() {
  const activeOrders = orders.filter((o) => !['delivered', 'rejected'].includes(o.status));

  return (
    <AdminLayout
      panelType="pap-manufacturer"
      title="Track Orders"
      subtitle="Monitor order shipment status"
    >
      <div className="space-y-6">
        {activeOrders.map((order) => {
          const currentIndex = getStatusIndex(order.status);

          return (
            <div key={order.id} className="bg-card rounded-xl border border-border p-6">
              {/* Order Header */}
              <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
                <div>
                  <h3 className="font-semibold text-lg text-foreground">{order.orderNumber}</h3>
                  <p className="text-sm text-muted-foreground">
                    {order.customerName || order.vendorName || order.manufacturerName} • {formatDate(order.createdAt)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-lg">{formatCurrency(order.totalAmount)}</p>
                  <p className="text-sm text-muted-foreground">{order.paymentMode.toUpperCase()}</p>
                </div>
              </div>

              {/* Status Timeline */}
              <div className="relative">
                <div className="flex items-center justify-between">
                  {statusSteps.map((step, index) => {
                    const isCompleted = index <= currentIndex;
                    const isCurrent = index === currentIndex;
                    const Icon = step.icon;

                    return (
                      <div key={step.key} className="flex flex-col items-center flex-1">
                        <div
                          className={cn(
                            'h-10 w-10 rounded-full flex items-center justify-center transition-all duration-300',
                            isCompleted
                              ? 'bg-success text-success-foreground'
                              : 'bg-muted text-muted-foreground',
                            isCurrent && 'ring-4 ring-success/30'
                          )}
                        >
                          <Icon className="h-5 w-5" />
                        </div>
                        <span
                          className={cn(
                            'text-xs mt-2 text-center hidden sm:block',
                            isCompleted ? 'text-foreground font-medium' : 'text-muted-foreground'
                          )}
                        >
                          {step.label}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* Progress Line */}
                <div className="absolute top-5 left-0 right-0 h-0.5 bg-muted -z-10">
                  <div
                    className="h-full bg-success transition-all duration-500"
                    style={{ width: `${(currentIndex / (statusSteps.length - 1)) * 100}%` }}
                  />
                </div>
              </div>

              {/* Order Items */}
              <div className="mt-6 pt-4 border-t border-border">
                <p className="text-sm text-muted-foreground mb-2">Items:</p>
                <div className="flex flex-wrap gap-2">
                  {order.items.map((item, idx) => (
                    <span key={idx} className="px-3 py-1 bg-muted rounded-full text-sm">
                      {item.productName} × {item.quantity}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          );
        })}

        {activeOrders.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No active orders to track</p>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
