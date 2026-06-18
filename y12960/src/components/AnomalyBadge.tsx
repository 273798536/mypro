import type { AnomalyType, Severity } from '../../shared/types';
import { getAnomalyBadge, severityConfig } from '../utils/formatters';
import {
  CircleSlash,
  Copy,
  FileWarning,
  DatabaseZap,
  AlertTriangle,
} from 'lucide-react';

interface AnomalyBadgeProps {
  type: AnomalyType;
  severity: Severity;
  showIcon?: boolean;
}

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  CircleSlash,
  Copy,
  FileWarning,
  DatabaseZap,
  AlertTriangle,
};

export function AnomalyBadge({ type, severity, showIcon = true }: AnomalyBadgeProps) {
  const config = getAnomalyBadge(type);
  const sevConfig = severityConfig[severity];
  const IconComponent = iconMap[config.icon];

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border text-xs font-medium ${config.className}`}
      title={`${config.label} - ${sevConfig.label}风险`}
    >
      {showIcon && IconComponent && <IconComponent className="w-3 h-3" />}
      {config.label}
      <span
        className={`inline-block w-1.5 h-1.5 rounded-full ${sevConfig.className}`}
        style={{ backgroundColor: sevConfig.dotColor }}
      />
    </span>
  );
}
