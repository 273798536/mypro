import React from 'react';
import { cn } from '@/lib/utils';
import type { RiskLevel } from '@/types';
import { riskColors, riskLabels } from '@/utils/color';

interface BadgeProps {
  variant?: RiskLevel | 'default' | 'success' | 'warning' | 'error';
  children: React.ReactNode;
  className?: string;
}

const variantColors: Record<string, string> = {
  default: 'bg-gray-700 text-gray-200',
  success: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  warning: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  error: 'bg-red-500/20 text-red-400 border-red-500/30',
  low: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  medium: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  high: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  critical: 'bg-red-500/20 text-red-400 border-red-500/30',
};

export const Badge: React.FC<BadgeProps> = ({
  variant = 'default',
  children,
  className,
}) => {
  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border',
        variantColors[variant] || variantColors.default,
        className
      )}
    >
      {children}
    </span>
  );
};

export const RiskBadge: React.FC<{ level: RiskLevel; className?: string }> = ({
  level,
  className,
}) => (
  <span
    className={cn(
      'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium',
      className
    )}
    style={{
      backgroundColor: `${riskColors[level]}20`,
      color: riskColors[level],
      border: `1px solid ${riskColors[level]}40`,
    }}
  >
    <span
      className="w-1.5 h-1.5 rounded-full mr-1.5 animate-pulse"
      style={{ backgroundColor: riskColors[level] }}
    />
    {riskLabels[level]}
  </span>
);
