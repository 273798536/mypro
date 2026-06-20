import React from 'react';
import type { ChangeType } from '@/types';
import { Plus, Minus, ArrowRightLeft, Minus as Dash } from 'lucide-react';

interface Props {
  changeType: ChangeType;
  size?: 'sm' | 'md';
}

const config: Record<ChangeType, { bg: string; color: string; label: string; Icon: React.ElementType }> = {
  added: { bg: 'bg-emerald/15 text-emerald border-emerald/40', color: 'text-emerald', label: '新增', Icon: Plus },
  removed: { bg: 'bg-danger/15 text-danger border-danger/40', color: 'text-danger', label: '删除', Icon: Minus },
  modified: { bg: 'bg-amber/15 text-amber border-amber/40', color: 'text-amber', label: '修改', Icon: ArrowRightLeft },
  unchanged: { bg: 'bg-elevated text-muted border-border-emphasis', color: 'text-muted', label: '不变', Icon: Dash }
};

export const DiffBadge: React.FC<Props> = ({ changeType, size = 'sm' }) => {
  const c = config[changeType];
  const Icon = c.Icon;
  return (
    <span className={`inline-flex items-center gap-1 ${size === 'sm' ? 'chip !py-0.5 !px-2 !text-[10px]' : 'chip'} ${c.bg} border`}>
      <Icon className={size === 'sm' ? 'w-2.5 h-2.5' : 'w-3 h-3'} strokeWidth={2.5} />
      <span className="font-semibold">{c.label}</span>
    </span>
  );
};
