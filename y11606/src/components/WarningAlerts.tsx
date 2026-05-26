import { Alert, AlertProps } from 'antd';
import { AlertCircle, AlertTriangle, CheckCircle, Info } from 'lucide-react';
import type { WarningItem } from '@/types';

interface WarningAlertProps {
  warnings: WarningItem[];
}

const iconMap: Record<WarningItem['level'], React.ReactNode> = {
  info: <Info size={18} />,
  warning: <AlertTriangle size={18} />,
  error: <AlertCircle size={18} />,
};

const typeMap: Record<WarningItem['level'], AlertProps['type']> = {
  info: 'info',
  warning: 'warning',
  error: 'error',
};

export default function WarningAlerts({ warnings }: WarningAlertProps) {
  if (warnings.length === 0) return null;

  return (
    <div className="space-y-3">
      {warnings.map((warning, idx) => (
        <Alert
          key={idx}
          type={typeMap[warning.level]}
          showIcon
          icon={iconMap[warning.level]}
          message={warning.message}
          description={warning.details}
          className="rounded-lg"
        />
      ))}
    </div>
  );
}
