import React from 'react';
import { Check, X, Clock, AlertCircle } from 'lucide-react';
import type { ConsistencyStatus } from '@/types';

interface Props {
  status: ConsistencyStatus;
  size?: 'sm' | 'md';
  showLabel?: boolean;
}

const statusMap: Record<ConsistencyStatus, { color: string; bg: string; ring: string; label: string }> = {
  consistent: {
    color: 'text-emerald',
    bg: 'bg-emerald/15',
    ring: 'glow-ring-emerald',
    label: '一致'
  },
  inconsistent: {
    color: 'text-danger',
    bg: 'bg-danger/15',
    ring: 'glow-ring-red',
    label: '不一致'
  },
  pending: {
    color: 'text-muted',
    bg: 'bg-elevated',
    ring: '',
    label: '待校验'
  }
};

export const ConsistencyBadge: React.FC<Props> = ({ status, size = 'md', showLabel = true }) => {
  const cfg = statusMap[status];
  const iconSize = size === 'sm' ? 12 : 14;
  const pad = size === 'sm' ? 'p-0.5' : 'p-1';

  return (
    <div className={`inline-flex items-center gap-1.5 ${size === 'sm' ? '' : 'chip'}`} style={size === 'sm' ? { background: 'transparent', border: 'none', padding: 0 } : undefined}>
      <div className={`${pad} rounded-md ${cfg.bg} ${cfg.ring} relative`}>
        {status === 'consistent' && <Check className={`w-${iconSize/4} h-${iconSize/4} ${cfg.color} animate-draw-check`} strokeWidth={3} />}
        {status === 'inconsistent' && <X className={`w-[${iconSize}px] h-[${iconSize}px] ${cfg.color}`} strokeWidth={3} style={{ width: iconSize, height: iconSize }} />}
        {status === 'pending' && <Clock className={`w-[${iconSize}px] h-[${iconSize}px] ${cfg.color}`} strokeWidth={2} style={{ width: iconSize, height: iconSize }} />}
      </div>
      {showLabel && (
        <span className={`text-[10px] font-mono font-medium ${cfg.color}`}>{cfg.label}</span>
      )}
    </div>
  );
};
