import { Badge } from '@/components/ui/badge';

export const PRIORITY_STYLES = {
  high: 'bg-red-100 text-red-700 border-red-200',
  medium: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  low: 'bg-green-100 text-green-700 border-green-200',
};

export const STATUS_STYLES = {
  pending: 'bg-slate-100 text-slate-600 border-slate-200',
  in_progress: 'bg-blue-100 text-blue-700 border-blue-200',
  complete: 'bg-emerald-100 text-emerald-700 border-emerald-200',
};

export const STATUS_LABELS = {
  pending: 'Pending',
  in_progress: 'In Progress',
  complete: 'Complete',
};

export function PriorityBadge({ priority }) {
  return (
    <Badge variant="outline" className={PRIORITY_STYLES[priority] || ''}>
      {priority}
    </Badge>
  );
}

export function StatusBadge({ status }) {
  return (
    <Badge variant="outline" className={STATUS_STYLES[status] || ''}>
      {STATUS_LABELS[status] || status}
    </Badge>
  );
}