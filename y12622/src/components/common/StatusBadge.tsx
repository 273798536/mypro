import React from 'react';
import { cn } from '../../lib/utils';
import type { Severity, Equipment } from '../../types';
import { SEVERITY_LABELS, SEVERITY_COLORS, EQUIPMENT_STATUS_LABELS } from '../../types';

interface SeverityBadgeProps {
  severity: Severity;
  className?: string;
}

export function SeverityBadge({ severity, className }: SeverityBadgeProps) {
  const colorMap: Record<Severity, string> = {
    low: 'bg-amber-100 text-amber-800 border-amber-200',
    medium: 'bg-orange-100 text-orange-800 border-orange-200',
    high: 'bg-red-100 text-red-800 border-red-200',
    critical: 'bg-red-900 text-red-50 border-red-900',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border',
        colorMap[severity],
        className
      )}
    >
      <span
        className="w-2 h-2 rounded-full mr-1.5"
        style={{ backgroundColor: SEVERITY_COLORS[severity] }}
      />
      {SEVERITY_LABELS[severity]}
    </span>
  );
}

interface EquipmentStatusBadgeProps {
  status: Equipment['status'];
  className?: string;
}

export function EquipmentStatusBadge({ status, className }: EquipmentStatusBadgeProps) {
  const colorMap: Record<Equipment['status'], string> = {
    active: 'bg-green-100 text-green-800 border-green-200',
    inactive: 'bg-gray-100 text-gray-800 border-gray-200',
    maintenance: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border',
        colorMap[status],
        className
      )}
    >
      {EQUIPMENT_STATUS_LABELS[status]}
    </span>
  );
}

interface ColorBadgeProps {
  color: string;
  label?: string;
  className?: string;
}

export function ColorBadge({ color, label, className }: ColorBadgeProps) {
  return (
    <span className={cn('inline-flex items-center gap-2', className)}>
      <span
        className="w-4 h-4 rounded border border-gray-300"
        style={{ backgroundColor: color }}
      />
      {label && <span className="text-xs text-gray-600 font-mono">{label}</span>}
    </span>
  );
}
