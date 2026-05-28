import React from 'react';
import { AlertTriangle, XCircle, Info } from 'lucide-react';
import type { AnomalyRecord } from '../types/simulation';

interface AnomalyAlertProps {
  anomalies: AnomalyRecord[];
}

const anomalyIcons: Record<AnomalyRecord['type'], React.ReactNode> = {
  unit_error: <XCircle className="w-5 h-5" />,
  velocity_divergence: <AlertTriangle className="w-5 h-5" />,
  model_not_applicable: <Info className="w-5 h-5" />,
  parameter_out_of_range: <AlertTriangle className="w-5 h-5" />,
};

const anomalyTitles: Record<AnomalyRecord['type'], string> = {
  unit_error: '单位错误',
  velocity_divergence: '数值发散',
  model_not_applicable: '模型限制',
  parameter_out_of_range: '参数越界',
};

export const AnomalyAlert: React.FC<AnomalyAlertProps> = ({ anomalies }) => {
  if (anomalies.length === 0) return null;

  return (
    <div className="space-y-3">
      {anomalies.map((anomaly, index) => (
        <div
          key={index}
          className={`p-4 rounded-xl border-2 ${
            anomaly.severity === 'error'
              ? 'bg-red-50 border-red-200'
              : 'bg-amber-50 border-amber-200'
          }`}
        >
          <div className="flex items-start gap-3">
            <div
              className={`p-2 rounded-lg ${
                anomaly.severity === 'error'
                  ? 'bg-red-100 text-red-600'
                  : 'bg-amber-100 text-amber-600'
              }`}
            >
              {anomalyIcons[anomaly.type]}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h4
                  className={`font-semibold ${
                    anomaly.severity === 'error' ? 'text-red-800' : 'text-amber-800'
                  }`}
                >
                  {anomalyTitles[anomaly.type]}
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
                className={`text-sm mt-1 ${
                  anomaly.severity === 'error' ? 'text-red-700' : 'text-amber-700'
                }`}
              >
                {anomaly.message}
              </p>
              <p
                className={`text-sm mt-2 ${
                  anomaly.severity === 'error' ? 'text-red-600' : 'text-amber-600'
                }`}
              >
                💡 {anomaly.suggestion}
              </p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};
