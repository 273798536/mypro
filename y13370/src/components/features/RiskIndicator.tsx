import React from 'react';
import { AlertOctagon, ShieldAlert, AlertTriangle, Shield } from 'lucide-react';
import type { RiskLevel } from '@/types';

interface Props {
  level: RiskLevel;
  size?: 'sm' | 'md';
}

const cfg: Record<RiskLevel, { text: string; Icon: React.ElementType; color: string; bg: string; border: string }> = {
  high: {
    text: '高风险', Icon: AlertOctagon, color: 'text-danger',
    bg: 'bg-danger/15', border: 'border-danger/50'
  },
  medium: {
    text: '中风险', Icon: AlertTriangle, color: 'text-amber',
    bg: 'bg-amber/15', border: 'border-amber/50'
  },
  low: {
    text: '低风险', Icon: Shield, color: 'text-emerald',
    bg: 'bg-emerald/15', border: 'border-emerald/50'
  }
};

export const RiskIndicator: React.FC<Props> = ({ level, size = 'md' }) => {
  const c = cfg[level];
  const Icon = c.Icon;
  const iconSize = size === 'sm' ? 12 : 14;
  return (
    <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border ${c.bg} ${c.border} ${
      level === 'high' ? 'animate-pulse-amber glow-ring-red' : ''
    }`}>
      <Icon className={`${c.color}`} strokeWidth={2.5} style={{ width: iconSize, height: iconSize }} />
      <span className={`${c.color} font-mono text-[11px] font-bold`}>{c.text}</span>
    </div>
  );
};
