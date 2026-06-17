import type { FinalDecision } from '../types';

interface Props {
  status?: FinalDecision | null;
  label?: string;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
}

const CONFIG: Record<Exclude<FinalDecision, null>, { label: string; icon: string; color: string; glow: string }> = {
  APPROVED: {
    label: '可直接用',
    icon: '🟢',
    color: 'bg-status-approved/15 text-status-approved border-status-approved/40',
    glow: 'glow-approved',
  },
  REVIEW_REQUIRED: {
    label: '待MLOps复核',
    icon: '🟡',
    color: 'bg-status-review/15 text-status-review border-status-review/40',
    glow: 'glow-review',
  },
  RERUN: {
    label: '需重新评测',
    icon: '🔴',
    color: 'bg-status-rerun/15 text-status-rerun border-status-rerun/40',
    glow: 'glow-rerun',
  },
};

export default function StatusBadge({ status, label, size = 'sm', showIcon = true }: Props) {
  const key = status || 'REVIEW_REQUIRED';
  const cfg = CONFIG[key] || CONFIG.REVIEW_REQUIRED;
  const sizeCls =
    size === 'lg' ? 'px-3 py-1.5 text-sm font-medium'
    : size === 'md' ? 'px-2.5 py-1 text-xs'
    : 'px-2 py-0.5 text-[11px]';
  return (
    <span
      className={`inline-flex items-center gap-1 rounded border font-mono whitespace-nowrap ${cfg.color} ${cfg.glow} ${sizeCls}`}
    >
      {showIcon && <span className="leading-none">{cfg.icon}</span>}
      <span>{label || cfg.label}</span>
    </span>
  );
}
