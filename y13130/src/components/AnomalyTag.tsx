import { AnomalyType } from '@/types';
import { Ban, Divide, CircleDot, HelpCircle } from 'lucide-react';

const config: Record<AnomalyType, { label: string; cls: string; Icon: typeof Ban }> = {
  empty_set: {
    label: '空集合',
    cls: 'bg-red-50 text-red-700 border border-red-200',
    Icon: Ban,
  },
  division_by_zero: {
    label: '除零边界',
    cls: 'bg-amber-50 text-amber-700 border border-amber-200',
    Icon: Divide,
  },
  normal: {
    label: '正常',
    cls: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
    Icon: CircleDot,
  },
  other: {
    label: '其他',
    cls: 'bg-paper-100 text-ink-700 border border-paper-200',
    Icon: HelpCircle,
  },
};

export default function AnomalyTag({ type, size = 'md' }: { type: AnomalyType; size?: 'sm' | 'md' }) {
  const { label, cls, Icon } = config[type];
  const px = size === 'sm' ? 'px-1.5 py-0.5 text-[10px]' : 'px-2 py-0.5 text-xs';
  return (
    <span className={`tag ${cls} ${px}`}>
      <Icon size={size === 'sm' ? 11 : 13} />
      {label}
    </span>
  );
}
