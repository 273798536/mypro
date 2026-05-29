import React from 'react';
import { Bell, AlertTriangle, AlertCircle, Info, X } from 'lucide-react';
import { useGameStore } from '../../store/gameStore';
import { Alert } from '../../types';

const alertConfig = {
  danger: {
    icon: <AlertCircle size={14} />,
    bgColor: 'bg-metro-red/10',
    borderColor: 'border-metro-red',
    textColor: 'text-metro-red',
  },
  warning: {
    icon: <AlertTriangle size={14} />,
    bgColor: 'bg-metro-yellow/10',
    borderColor: 'border-metro-yellow',
    textColor: 'text-metro-yellow',
  },
  info: {
    icon: <Info size={14} />,
    bgColor: 'bg-metro-blue/10',
    borderColor: 'border-metro-blue',
    textColor: 'text-metro-blue',
  },
};

export const AlertPanel: React.FC = () => {
  const alerts = useGameStore((state) => state.alerts);
  const clearAlert = useGameStore((state) => state.clearAlert);
  const setSelectedLocation = useGameStore((state) => state.setSelectedLocation);

  const handleAlertClick = (alert: Alert) => {
    if (alert.locationRef) {
      setSelectedLocation(alert.locationRef);
    }
  };

  if (alerts.length === 0) {
    return (
      <div className="metro-panel">
        <div className="flex items-center gap-2 mb-2 pb-2 border-b border-metro-border">
          <Bell className="text-metro-textMuted" size={18} />
          <h3 className="font-mono font-bold text-metro-textMuted text-sm">告警</h3>
        </div>
        <div className="text-center py-4 text-metro-textMuted text-xs">
          暂无告警信息
        </div>
      </div>
    );
  }

  return (
    <div className="metro-panel max-h-48 overflow-hidden flex flex-col">
      <div className="flex items-center gap-2 mb-2 pb-2 border-b border-metro-border">
        <Bell className="text-metro-red animate-pulse" size={18} />
        <h3 className="font-mono font-bold text-metro-text text-sm">告警</h3>
        <span className="ml-auto bg-metro-red text-white text-xs px-2 py-0.5 rounded-full">
          {alerts.length}
        </span>
      </div>
      <div className="flex-1 overflow-y-auto space-y-2 pr-1">
        {alerts.map((alert) => {
          const config = alertConfig[alert.type];
          return (
            <div
              key={alert.id}
              onClick={() => handleAlertClick(alert)}
              className={`p-2 rounded border-l-4 ${config.bgColor} ${config.borderColor} cursor-pointer hover:opacity-80 transition-opacity group`}
            >
              <div className="flex items-start gap-2">
                <span className={config.textColor}>{config.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className={`text-xs font-medium ${config.textColor}`}>
                    {alert.message}
                  </p>
                  {alert.locationRef && (
                    <p className="text-[10px] text-metro-textMuted mt-0.5">
                      点击查看位置
                    </p>
                  )}
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    clearAlert(alert.id);
                  }}
                  className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-metro-border rounded transition-opacity"
                >
                  <X size={12} className="text-metro-textMuted" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
