import { AlertTriangle, AlertCircle, Info, ChevronDown, ChevronUp, Lightbulb } from 'lucide-react';
import { useState } from 'react';
import { useAppStore } from '@/store';
import { hasErrors, hasWarnings } from '@/utils/validator';

const RiskAlerts = () => {
  const { alerts } = useAppStore();
  const [expanded, setExpanded] = useState(true);

  const errors = alerts.filter(a => a.type === 'error');
  const warnings = alerts.filter(a => a.type === 'warning');
  const infos = alerts.filter(a => a.type === 'info');

  if (alerts.length === 0) return null;

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />;
      case 'warning':
        return <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0" />;
      default:
        return <Info className="w-4 h-4 text-blue-400 flex-shrink-0" />;
    }
  };

  const getAlertStyles = (type: string) => {
    switch (type) {
      case 'error':
        return 'bg-red-500/10 border-red-500/30';
      case 'warning':
        return 'bg-amber-500/10 border-amber-500/30';
      default:
        return 'bg-blue-500/10 border-blue-500/30';
    }
  };

  return (
    <div className="bg-slate-800/50 rounded-xl overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-slate-700/30 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className={`p-1.5 rounded-lg ${
            hasErrors(alerts) ? 'bg-red-500/20' : hasWarnings(alerts) ? 'bg-amber-500/20' : 'bg-blue-500/20'
          }`}>
            <AlertTriangle className={`w-4 h-4 ${
              hasErrors(alerts) ? 'text-red-400' : hasWarnings(alerts) ? 'text-amber-400' : 'text-blue-400'
            }`} />
          </div>
          <div className="text-left">
            <span className="text-white font-medium text-sm">风险提示</span>
            <div className="flex items-center gap-2 text-xs">
              {errors.length > 0 && (
                <span className="text-red-400">{errors.length} 错误</span>
              )}
              {warnings.length > 0 && (
                <span className="text-amber-400">{warnings.length} 警告</span>
              )}
              {infos.length > 0 && (
                <span className="text-blue-400">{infos.length} 提示</span>
              )}
            </div>
          </div>
        </div>
        {expanded ? (
          <ChevronUp className="w-4 h-4 text-slate-400" />
        ) : (
          <ChevronDown className="w-4 h-4 text-slate-400" />
        )}
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-2">
          {alerts.map((alert, index) => (
            <div
              key={index}
              className={`p-3 rounded-lg border ${getAlertStyles(alert.type)}`}
            >
              <div className="flex items-start gap-2">
                {getAlertIcon(alert.type)}
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white">{alert.message}</p>
                  <div className="flex items-start gap-1 mt-2 text-xs text-slate-400">
                    <Lightbulb className="w-3 h-3 mt-0.5 flex-shrink-0" />
                    <span>{alert.suggestion}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default RiskAlerts;
