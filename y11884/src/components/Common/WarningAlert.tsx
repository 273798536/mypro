import React from 'react';
import { useAppStore, storeActions } from '../../store/appStore';
import { AlertTriangle, X, Info, CheckCircle } from 'lucide-react';

const WarningAlert: React.FC = () => {
  const warnings = useAppStore((state) => state.warnings);

  const getIcon = (type: string) => {
    switch (type) {
      case 'error':
        return <AlertTriangle className="w-4 h-4 text-red-500" />;
      case 'warning':
        return <AlertTriangle className="w-4 h-4 text-amber-500" />;
      default:
        return <Info className="w-4 h-4 text-blue-500" />;
    }
  };

  const getBgColor = (type: string) => {
    switch (type) {
      case 'error':
        return 'bg-red-50 border-red-200';
      case 'warning':
        return 'bg-amber-50 border-amber-200';
      default:
        return 'bg-blue-50 border-blue-200';
    }
  };

  if (warnings.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 space-y-2 max-w-sm">
      {warnings.map((warning) => (
        <div
          key={warning.id}
          className={`p-3 rounded-lg border shadow-lg flex items-start gap-3 animate-slide-in ${getBgColor(
            warning.type
          )}`}
        >
          {getIcon(warning.type)}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-800">
              {warning.message}
            </p>
            {warning.details && (
              <p className="text-xs text-gray-500 mt-1">
                {warning.details}
              </p>
            )}
          </div>
          <button
            onClick={() => storeActions.removeWarning(warning.id)}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );
};

export default WarningAlert;

