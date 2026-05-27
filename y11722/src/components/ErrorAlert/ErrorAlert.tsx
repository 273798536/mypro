import React from 'react';
import { AlertTriangle, XCircle, Lightbulb, X } from 'lucide-react';
import { Anomaly } from '../../types';

interface ErrorAlertProps {
  anomalies: Anomaly[];
  onDismiss?: (index: number) => void;
}

export const ErrorAlert: React.FC<ErrorAlertProps> = ({ anomalies, onDismiss }) => {
  if (anomalies.length === 0) return null;

  const getAnomalyTitle = (type: Anomaly['type']) => {
    switch (type) {
      case 'critical_angle':
        return '临界角误判';
      case 'angle_unit':
        return '角度单位问题';
      case 'force_direction':
        return '力方向问题';
      case 'data_conflict':
        return '数据冲突';
      default:
        return '异常';
    }
  };

  return (
    <div className="space-y-3">
      {anomalies.map((anomaly, index) => (
        <div
          key={index}
          className={`rounded-xl p-4 transition-all animate-fade-in ${
            anomaly.severity === 'error'
              ? 'bg-red-50 border border-red-200'
              : 'bg-amber-50 border border-amber-200'
          }`}
        >
          <div className="flex items-start gap-3">
            <div
              className={`p-2 rounded-lg flex-shrink-0 ${
                anomaly.severity === 'error' ? 'bg-red-100' : 'bg-amber-100'
              }`}
            >
              {anomaly.severity === 'error' ? (
                <XCircle className="w-5 h-5 text-red-500" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-amber-500" />
              )}
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <h4
                  className={`font-bold ${
                    anomaly.severity === 'error' ? 'text-red-800' : 'text-amber-800'
                  }`}
                >
                  {getAnomalyTitle(anomaly.type)}
                </h4>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full ${
                    anomaly.severity === 'error'
                      ? 'bg-red-200 text-red-700'
                      : 'bg-amber-200 text-amber-700'
                  }`}
                >
                  {anomaly.severity === 'error' ? '错误' : '警告'}
                </span>
              </div>
              
              <p
                className={`text-sm mt-2 ${
                  anomaly.severity === 'error' ? 'text-red-700' : 'text-amber-700'
                }`}
              >
                {anomaly.message}
              </p>
              
              <div
                className={`mt-3 flex items-start gap-2 p-3 rounded-lg ${
                  anomaly.severity === 'error' ? 'bg-red-100/50' : 'bg-amber-100/50'
                }`}
              >
                <Lightbulb className="w-4 h-4 text-yellow-500 flex-shrink-0 mt-0.5" />
                <p
                  className={`text-sm ${
                    anomaly.severity === 'error' ? 'text-red-600' : 'text-amber-600'
                  }`}
                >
                  <span className="font-medium">建议：</span>
                  {anomaly.suggestion}
                </p>
              </div>
            </div>
            
            {onDismiss && (
              <button
                onClick={() => onDismiss(index)}
                className="p-1 rounded hover:bg-white/50 transition-colors flex-shrink-0"
              >
                <X className="w-4 h-4 text-slate-400" />
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};
