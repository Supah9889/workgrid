import { Badge } from '@/components/ui/badge';

const PRIORITY_STYLES = {
  high: 'bg-red-100 text-red-700 border-red-200',
  medium: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  low: 'bg-green-100 text-green-700 border-green-200',
};

const STATUS_STYLES = {
  pending: 'bg-slate-100 text-slate-600 border-slate-200',
  picked_up: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  en_route: 'bg-blue-100 text-blue-700 border-blue-200',
  delivered: 'bg-green-100 text-green-700 border-green-200',
};

const STATUS_LABELS = {
  pending: 'Pending',
  picked_up: 'Picked Up',
  en_route: 'En Route',
  delivered: 'Delivered',
};

export function PriorityBadge({ priority }) {
  return (
    <Badge variant="outline" className={PRIORITY_STYLES[priority] || PRIORITY_STYLES.medium}>
      {priority ? priority.charAt(0).toUpperCase() + priority.slice(1) : 'Medium'}
    </Badge>
  );
}

export function StatusBadge({ status }) {
  return (
    <Badge variant="outline" className={STATUS_STYLES[status] || STATUS_STYLES.pending}>
      {STATUS_LABELS[status] || 'Pending'}
    </Badge>
  );
}
