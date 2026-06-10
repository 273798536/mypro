import type { CalculationStatus, BatchStatus } from '../../shared/types';
import { CheckCircle2, XCircle, Clock, AlertOctagon } from 'lucide-react';

const statusMap: Record<CalculationStatus | BatchStatus, { label: string; bg: string; text: string; icon: typeof Clock | typeof CheckCircle2 | typeof XCircle | typeof AlertOctagon; ring: string }> = {
  pending: { label: '待复核', bg: 'bg-amber-50', text: 'text-amber-700', ring: 'ring-amber-600/20', icon: Clock },
  passed: { label: '已通过', bg: 'bg-emerald-50', text: 'text-emerald-700', ring: 'ring-emerald-600/20', icon: CheckCircle2 },
  rejected: { label: '已驳回', bg: 'bg-rose-50', text: 'text-rose-700', ring: 'ring-rose-600/20', icon: XCircle },
  error: { label: '处理失败', bg: 'bg-rose-50', text: 'text-rose-700', ring: 'ring-rose-600/20', icon: AlertOctagon },
  normal: { label: '正常', bg: 'bg-emerald-50', text: 'text-emerald-700', ring: 'ring-emerald-600/20', icon: CheckCircle2 },
  attention: { label: '关注', bg: 'bg-amber-50', text: 'text-amber-700', ring: 'ring-amber-600/20', icon: Clock },
  anomaly: { label: '异常', bg: 'bg-orange-50', text: 'text-orange-700', ring: 'ring-orange-600/20', icon: AlertOctagon },
};

interface Props {
  status: CalculationStatus | BatchStatus;
  size?: 'sm' | 'md';
}

export default function StatusBadge({ status, size = 'sm' }: Props) {
  const cfg = statusMap[status];
  const Icon = cfg.icon;
  const sz = size === 'sm' ? 'text-[11px] px-2 py-0.5' : 'text-xs px-2.5 py-1';
  return (
    <span className={`inline-flex items-center gap-1 ${sz} rounded-none font-medium ${cfg.bg} ${cfg.text} ring-1 ring-inset ${cfg.ring}`}>
      <Icon size={size === 'sm' ? 12 : 14} strokeWidth={2} />
      {cfg.label}
    </span>
  );
}
