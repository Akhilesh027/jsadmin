import { cn } from '@/lib/utils';
import { getStatusColor, getPriorityColor } from '@/data/dummyData';

interface StatusBadgeProps {
  status: string;
  variant?: 'status' | 'priority';
}

export function StatusBadge({ status, variant = 'status' }: StatusBadgeProps) {
  const colorClass = variant === 'priority' ? getPriorityColor(status) : getStatusColor(status);
  const label = status.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

  return (
    <span className={cn('badge-status', colorClass)}>
      {label}
    </span>
  );
}
