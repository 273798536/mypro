import { DATA_STATUS_LABEL, REVIEW_STATUS_LABEL, DataStatus, ReviewStatus } from '@/types';
import { CheckCircle2, Clock, AlertTriangle, Eye } from 'lucide-react';

const STATUS_STYLES: Record<DataStatus, string> = {
  available: 'bg-emerald-50 text-status-available border-emerald-200',
  pending: 'bg-amber-50 text-status-pending border-amber-200',
  recollect: 'bg-rose-50 text-status-recollect border-rose-200',
};

const REVIEW_STYLES: Record<ReviewStatus, string> = {
  pending: 'bg-violet-50 text-status-review border-violet-200',
  approved: 'bg-emerald-50 text-status-available border-emerald-200',
  rejected: 'bg-rose-50 text-status-recollect border-rose-200',
};

export function DataStatusBadge({ status }: { status: DataStatus }) {
  const icons: Record<DataStatus, React.ReactNode> = {
    available: <CheckCircle2 className="w-3.5 h-3.5" />,
    pending: <Clock className="w-3.5 h-3.5" />,
    recollect: <AlertTriangle className="w-3.5 h-3.5" />,
  };
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-xs font-medium ${STATUS_STYLES[status]}`}>
      {icons[status]}
      {DATA_STATUS_LABEL[status]}
    </span>
  );
}

export function ReviewStatusBadge({ status }: { status: ReviewStatus }) {
  const icons: Record<ReviewStatus, React.ReactNode> = {
    pending: <Eye className="w-3.5 h-3.5" />,
    approved: <CheckCircle2 className="w-3.5 h-3.5" />,
    rejected: <AlertTriangle className="w-3.5 h-3.5" />,
  };
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-xs font-medium ${REVIEW_STYLES[status]}`}>
      {icons[status]}
      {REVIEW_STATUS_LABEL[status]}
    </span>
  );
}
