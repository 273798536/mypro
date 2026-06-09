import type { Severity, ImpactLevel, DeviceStatus } from '@/types';

const severityConfig: Record<Severity, { label: string; className: string }> = {
  danger: { label: '危险', className: 'bg-rose-500/15 text-rose-400 border-rose-500/40' },
  warning: { label: '警告', className: 'bg-amber-500/15 text-amber-400 border-amber-500/40' },
  info: { label: '提示', className: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/40' },
};

const statusConfig: Record<DeviceStatus, { label: string; className: string }> = {
  normal: { label: '正常', className: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/40' },
  warning: { label: '警告', className: 'bg-amber-500/15 text-amber-400 border-amber-500/40' },
  error: { label: '故障', className: 'bg-rose-500/15 text-rose-400 border-rose-500/40' },
};

const impactConfig: Record<ImpactLevel, { label: string; className: string }> = {
  none: { label: '无影响', className: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/40' },
  low: { label: '轻微', className: 'bg-lime-500/15 text-lime-400 border-lime-500/40' },
  medium: { label: '中等', className: 'bg-amber-500/15 text-amber-400 border-amber-500/40' },
  high: { label: '严重', className: 'bg-rose-500/15 text-rose-400 border-rose-500/40' },
};

export function SeverityBadge({ severity }: { severity: Severity }) {
  const cfg = severityConfig[severity];
  return (
    <span className={`inline-flex items-center rounded border px-1.5 py-0.5 text-[10px] font-bold ${cfg.className}`}>
      {cfg.label}
    </span>
  );
}

export function StatusBadge({ status }: { status: DeviceStatus }) {
  const cfg = statusConfig[status];
  return (
    <span className={`inline-flex items-center rounded border px-1.5 py-0.5 text-[10px] font-bold ${cfg.className}`}>
      {cfg.label}
    </span>
  );
}

export function ImpactBadge({ level }: { level: ImpactLevel }) {
  const cfg = impactConfig[level];
  return (
    <span className={`inline-flex items-center rounded border px-1.5 py-0.5 text-[10px] font-bold ${cfg.className}`}>
      {cfg.label}
    </span>
  );
}
