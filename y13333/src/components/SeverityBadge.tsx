import type { Severity } from '@shared/types';

interface SeverityBadgeProps {
  severity: Severity;
}

const severityConfig: Record<Severity, { label: string; color: string }> = {
  high: { label: '高', color: 'text-red-600 bg-red-50' },
  medium: { label: '中', color: 'text-amber-600 bg-amber-50' },
  low: { label: '低', color: 'text-green-600 bg-green-50' },
};

function SeverityBadge({ severity }: SeverityBadgeProps) {
  const config = severityConfig[severity];
  
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${config.color}`}>
      {config.label}
    </span>
  );
}

export default SeverityBadge;
