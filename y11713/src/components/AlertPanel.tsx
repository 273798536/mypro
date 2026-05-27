import React, { useState } from 'react';
import { AlertTriangle, AlertCircle, Info, X, Check, Eye, ChevronDown, ChevronUp } from 'lucide-react';
import { useRLCStore } from '../store/useRLCStore';
import { AnomalyAlert, AlertType } from '../types';

const alertIcons: Record<AlertType, React.ReactNode> = {
  error: <AlertCircle className="w-5 h-5" />,
  warning: <AlertTriangle className="w-5 h-5" />,
  info: <Info className="w-5 h-5" />,
};

const alertColors: Record<AlertType, { bg: string; border: string; text: string; icon: string }> = {
  error: {
    bg: 'bg-red-500/10',
    border: 'border-red-500/30',
    text: 'text-red-400',
    icon: 'text-red-400',
  },
  warning: {
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/30',
    text: 'text-amber-400',
    icon: 'text-amber-400',
  },
  info: {
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/30',
    text: 'text-blue-400',
    icon: 'text-blue-400',
  },
};

interface AlertItemProps {
  alert: AnomalyAlert;
}

const AlertItem: React.FC<AlertItemProps> = ({ alert }) => {
  const { fixAlert, ignoreAlert, confirmAlert } = useRLCStore();
  const [expanded, setExpanded] = useState(false);
  const colors = alertColors[alert.type];

  if (alert.status === 'fixed' || alert.status === 'ignored') {
    return null;
  }

  return (
    <div
      className={`${colors.bg} ${colors.border} border rounded-xl p-4 transition-all animate-in slide-in-from-left-4 duration-300`}
    >
      <div className="flex items-start gap-3">
        <div className={`${colors.icon} flex-shrink-0 mt-0.5`}>
          {alertIcons[alert.type]}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <h4 className={`font-semibold ${colors.text}`}>{alert.message}</h4>
            <button
              onClick={() => setExpanded(!expanded)}
              className="text-slate-400 hover:text-white transition-colors"
            >
              {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>
          
          {expanded && (
            <div className="mt-3 space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
              <p className="text-sm text-slate-400">{alert.details}</p>
              <p className="text-sm text-slate-300">
                <span className="text-slate-500">建议: </span>
                {alert.suggestion}
              </p>
              
              <div className="flex flex-wrap gap-2 pt-2">
                {alert.autoFixable && (
                  <button
                    onClick={() => fixAlert(alert.id)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600/20 hover:bg-green-600/30 text-green-400 text-sm rounded-lg transition-colors"
                  >
                    <Check className="w-4 h-4" />
                    自动修复
                  </button>
                )}
                <button
                  onClick={() => confirmAlert(alert.id)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 text-sm rounded-lg transition-colors"
                >
                  <Eye className="w-4 h-4" />
                  确认已知
                </button>
                <button
                  onClick={() => ignoreAlert(alert.id)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-600/20 hover:bg-slate-600/30 text-slate-400 text-sm rounded-lg transition-colors"
                >
                  <X className="w-4 h-4" />
                  忽略
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export const AlertPanel: React.FC = () => {
  const { alerts } = useRLCStore();
  const pendingAlerts = alerts.filter((a) => a.status === 'pending' || a.status === 'manual_confirm');

  if (pendingAlerts.length === 0) {
    return null;
  }

  return (
    <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-6 border border-slate-700/50 shadow-xl">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <AlertTriangle className="w-6 h-6 text-amber-400" />
          异常检测
        </h2>
        <span className="px-3 py-1 bg-amber-500/20 text-amber-400 text-sm font-medium rounded-full">
          {pendingAlerts.length} 项待处理
        </span>
      </div>

      <div className="space-y-3">
        {pendingAlerts.map((alert) => (
          <AlertItem key={alert.id} alert={alert} />
        ))}
      </div>
    </div>
  );
};
