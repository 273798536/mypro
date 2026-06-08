import type { AvailabilityStatus, AnomalyType, AnomalySeverity } from '@/types';
import { ANOMALY_LABELS, STATUS_LABELS } from '@/types';

const statusColors: Record<AvailabilityStatus, string> = {
  usable: 'bg-status-usable/15 text-status-usable border-status-usable/40',
  review_needed: 'bg-status-review/15 text-hall-textDim border-status-review/50',
  unusable: 'bg-status-unusable/15 text-status-unusable border-status-unusable/40',
};

const statusDotColors: Record<AvailabilityStatus, string> = {
  usable: 'bg-status-usable',
  review_needed: 'bg-status-review',
  unusable: 'bg-status-unusable',
};

export function StatusBadge({ status }: { status: AvailabilityStatus }) {
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium border ${statusColors[status]}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${statusDotColors[status]}`} />
      {STATUS_LABELS[status]}
    </span>
  );
}

const anomalyColors: Record<AnomalySeverity, string> = {
  warning: 'bg-anomaly-warn/15 text-anomaly-warn border-anomaly-warn/40',
  error: 'bg-anomaly-error/15 text-anomaly-error border-anomaly-error/40',
};

export function AnomalyTag({ type, severity }: { type: AnomalyType; severity: AnomalySeverity }) {
  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-medium border ${anomalyColors[severity]}`}>
      {ANOMALY_LABELS[type]}
    </span>
  );
}

export function SectionTitle({ children, right }: { children: React.ReactNode; right?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between mb-3">
      <h3 className="text-sm font-semibold text-hall-text font-display tracking-wide">{children}</h3>
      {right}
    </div>
  );
}

export function EmptyState({ icon, title, desc }: { icon?: React.ReactNode; title: string; desc?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-10 px-6 text-center">
      {icon && <div className="text-hall-textMute mb-3">{icon}</div>}
      <div className="text-sm font-medium text-hall-textDim mb-1">{title}</div>
      {desc && <div className="text-xs text-hall-textMute/70">{desc}</div>}
    </div>
  );
}
