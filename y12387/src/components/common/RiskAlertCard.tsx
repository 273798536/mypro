import { AlertTriangle, X } from 'lucide-react';
import { RiskAlert } from '@/types';

interface RiskAlertCardProps {
  alert: RiskAlert;
  onDismiss: () => void;
  onClick: () => void;
}

const severityConfig = {
  high: { bg: 'bg-danger/10', border: 'border-danger/30', text: 'text-danger', label: '高风险' },
  medium: { bg: 'bg-warning/10', border: 'border-warning/30', text: 'text-warning', label: '中风险' },
  low: { bg: 'bg-accent/10', border: 'border-accent/30', text: 'text-accent', label: '低风险' },
};

export const RiskAlertCard = ({ alert, onDismiss, onClick }: RiskAlertCardProps) => {
  const config = severityConfig[alert.severity];

  return (
    <div
      className={`p-4 rounded-lg border ${config.bg} ${config.border} cursor-pointer hover:shadow-lg transition-all duration-200`}
      onClick={onClick}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <AlertTriangle className={`w-5 h-5 ${config.text}`} />
          <div>
            <span className={`text-xs font-medium ${config.text}`}>
              {config.label}
            </span>
            <p className="text-sm text-gray-300 mt-1">{alert.message}</p>
          </div>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDismiss();
          }}
          className="p-1 rounded hover:bg-white/10 transition-colors"
        >
          <X className="w-4 h-4 text-gray-400" />
        </button>
      </div>
    </div>
  );
};
