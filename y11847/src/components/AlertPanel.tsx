import React, { useState } from 'react';
import { Alert } from '../types/game';
import { getAlertIcon, getAlertTitle } from '../utils/calcEngine';

interface AlertPanelProps {
  alerts: Alert[];
  onConfirm: (alertId: string) => void;
}

export const AlertPanel: React.FC<AlertPanelProps> = ({ alerts, onConfirm }) => {
  const [expandedAlert, setExpandedAlert] = useState<string | null>(null);

  if (alerts.length === 0) {
    return (
      <div className="bg-gray-800 rounded-lg p-4 border border-gray-600">
        <h3 className="text-lg font-bold text-white mb-2 border-b border-gray-600 pb-2">
          ⚠️ 待确认问题
        </h3>
        <div className="text-gray-400 text-sm py-4 text-center">
          ✓ 当前无待确认问题
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-800 rounded-lg p-4 border-2 border-red-500 shadow-lg shadow-red-500/20">
      <h3 className="text-lg font-bold text-red-400 mb-3 border-b border-red-500/50 pb-2 flex items-center gap-2">
        <span className="animate-pulse">⚠️</span>
        待确认问题 ({alerts.length})
        <span className="ml-auto text-xs bg-red-500 text-white px-2 py-0.5 rounded">
          请确认
        </span>
      </h3>

      <div className="space-y-3 max-h-64 overflow-y-auto">
        {alerts.map((alert, index) => (
          <div
            key={alert.id}
            className={`
              rounded-lg border-2 p-3 transition-all duration-300
              ${alert.severity === 'critical'
                ? 'bg-red-900/50 border-red-500 animate-pulse'
                : 'bg-yellow-900/50 border-yellow-500'}
              ${expandedAlert === alert.id ? 'ring-2 ring-white' : ''}
            `}
            style={{
              animationDelay: `${index * 0.1}s`,
            }}
          >
            <div
              className="flex items-start gap-3 cursor-pointer"
              onClick={() => setExpandedAlert(expandedAlert === alert.id ? null : alert.id)}
            >
              <span className="text-2xl">{getAlertIcon(alert.type)}</span>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span
                    className={`font-bold ${
                      alert.severity === 'critical' ? 'text-red-300' : 'text-yellow-300'
                    }`}
                  >
                    {getAlertTitle(alert.type)}
                  </span>
                  <span
                    className={`text-xs px-2 py-0.5 rounded ${
                      alert.severity === 'critical'
                        ? 'bg-red-500 text-white'
                        : 'bg-yellow-500 text-black'
                    }`}
                  >
                    {alert.severity === 'critical' ? '严重' : '警告'}
                  </span>
                </div>
                <p className="text-gray-200 text-sm mt-1">{alert.message}</p>

                {expandedAlert === alert.id && (
                  <div className="mt-3 pt-3 border-t border-white/20">
                    <p className="text-xs text-gray-400">
                      发生于第 {alert.stepIndex} 步
                    </p>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onConfirm(alert.id);
                      }}
                      className="mt-2 w-full bg-white/10 hover:bg-white/20 text-white text-sm py-1.5 px-3 rounded transition-colors"
                    >
                      ✓ 已确认并继续
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
