import {
  AlertTriangle,
  XCircle,
  AlertOctagon,
  FileWarning,
  CheckCircle2,
  Clock,
  HelpCircle,
} from 'lucide-react';
import type {
  AnomalyType,
  CollisionStatus,
  BatchStatus,
} from '../../shared/types';
import {
  ANOMALY_TYPE_LABELS,
  COLLISION_STATUS_LABELS,
  BATCH_STATUS_LABELS,
} from '../../shared/types';
import { cn } from '@/lib/utils';

export function AnomalyTypeBadge({ type }: { type: AnomalyType }) {
  const colorMap: Record<AnomalyType, string> = {
    overlap: 'bg-alert-red/20 text-alert-red border-alert-red/50',
    out_of_bounds: 'bg-alert-yellow/20 text-alert-yellow border-alert-yellow/50',
    missing_coord: 'bg-alert-orange/20 text-alert-orange border-alert-orange/50',
    format_error: 'bg-purple-500/20 text-purple-300 border-purple-500/50',
  };
  const iconMap: Record<AnomalyType, React.ReactNode> = {
    overlap: <AlertTriangle className="w-3 h-3 mr-1" />,
    out_of_bounds: <AlertOctagon className="w-3 h-3 mr-1" />,
    missing_coord: <XCircle className="w-3 h-3 mr-1" />,
    format_error: <FileWarning className="w-3 h-3 mr-1" />,
  };
  return (
    <span className={cn('industrial-badge border', colorMap[type])}>
      {iconMap[type]}
      {ANOMALY_TYPE_LABELS[type]}
    </span>
  );
}

export function CollisionStatusBadge({ status }: { status: CollisionStatus }) {
  const colorMap: Record<CollisionStatus, string> = {
    confirmed: 'bg-alert-red/20 text-alert-red border-alert-red/50',
    false_positive: 'bg-alert-green/20 text-alert-green border-alert-green/50',
    needs_review: 'bg-alert-yellow/20 text-alert-yellow border-alert-yellow/50',
  };
  const iconMap: Record<CollisionStatus, React.ReactNode> = {
    confirmed: <XCircle className="w-3 h-3 mr-1" />,
    false_positive: <CheckCircle2 className="w-3 h-3 mr-1" />,
    needs_review: <Clock className="w-3 h-3 mr-1" />,
  };
  return (
    <span className={cn('industrial-badge border', colorMap[status])}>
      {iconMap[status]}
      {COLLISION_STATUS_LABELS[status]}
    </span>
  );
}

export function BatchStatusBadge({ status }: { status: BatchStatus }) {
  const colorMap: Record<BatchStatus, string> = {
    pending: 'bg-alert-yellow/20 text-alert-yellow border-alert-yellow/50',
    rejudged: 'bg-alert-indigo/20 text-alert-indigo border-alert-indigo/50',
    completed: 'bg-alert-green/20 text-alert-green border-alert-green/50',
  };
  const iconMap: Record<BatchStatus, React.ReactNode> = {
    pending: <Clock className="w-3 h-3 mr-1" />,
    rejudged: <HelpCircle className="w-3 h-3 mr-1" />,
    completed: <CheckCircle2 className="w-3 h-3 mr-1" />,
  };
  return (
    <span className={cn('industrial-badge border', colorMap[status])}>
      {iconMap[status]}
      {BATCH_STATUS_LABELS[status]}
    </span>
  );
}
