import { AlertTriangle, AlertCircle, Info } from 'lucide-react';
import { ActionableError } from '../types';
import { useAppStore } from '../store';
import { formatDateTime } from '../mock/data';

interface ActionableErrorCardProps {
  error: ActionableError;
}

export default function ActionableErrorCard({ error }: ActionableErrorCardProps) {
  const { resolveError } = useAppStore();

  const getIcon = () => {
    switch (error.severity) {
      case 'error':
        return <AlertTriangle className="w-5 h-5 text-data-recollect" />;
      case 'warning':
        return <AlertCircle className="w-5 h-5 text-data-suspended" />;
      case 'info':
        return <Info className="w-5 h-5 text-ocean-400" />;
    }
  };

  const getBorderColor = () => {
    switch (error.severity) {
      case 'error':
        return 'border-l-data-recollect';
      case 'warning':
        return 'border-l-data-suspended';
      case 'info':
        return 'border-l-ocean-500';
    }
  };

  const getButtonClass = (type: 'primary' | 'secondary' | 'danger') => {
    switch (type) {
      case 'primary':
        return 'btn-primary text-sm py-1.5 px-3';
      case 'secondary':
        return 'btn-secondary text-sm py-1.5 px-3';
      case 'danger':
        return 'btn-danger text-sm py-1.5 px-3';
    }
  };

  return (
    <div
      className={`glass-panel p-4 border-l-4 ${getBorderColor()} transition-all hover:shadow-lg hover:shadow-ocean-500/10`}
    >
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 mt-0.5">{getIcon()}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-1">
            <h4 className="text-sm font-medium text-ocean-100">{error.message}</h4>
            <span className="text-xs text-ocean-400 font-mono flex-shrink-0">
              {formatDateTime(error.timestamp)}
            </span>
          </div>
          
          <p className="text-xs text-ocean-400 font-mono mb-3">
            错误代码: {error.code}
          </p>

          {Object.keys(error.context).length > 0 && (
            <div className="bg-ocean-900/50 rounded-lg p-3 mb-3">
              <p className="text-xs text-ocean-300 mb-2 font-medium">上下文信息：</p>
              <div className="grid grid-cols-2 gap-2 text-xs">
                {Object.entries(error.context).map(([key, value]) => (
                  <div key={key} className="flex gap-2">
                    <span className="text-ocean-400">{key}:</span>
                    <span className="text-ocean-200 font-mono">
                      {Array.isArray(value) ? value.join(', ') : String(value)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            {error.actions.map((action, index) => (
              <button
                key={index}
                onClick={() => resolveError(error.id, action.handler)}
                className={getButtonClass(action.type)}
              >
                {action.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
