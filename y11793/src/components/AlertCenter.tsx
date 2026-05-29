import React, { useMemo } from 'react';
import { AlertTriangle, AlertOctagon, XCircle, Clock, Thermometer, Gauge, ChevronDown, ChevronUp } from 'lucide-react';
import { useFittingStore, type Alert } from '@/store/fittingStore';
import { cn } from '@/lib/utils';

interface AlertGroup {
  severity: 'fatal' | 'severe' | 'warning';
  label: string;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
  borderColor: string;
}

const severityConfig: AlertGroup[] = [
  {
    severity: 'fatal',
    label: '致命',
    icon: <XCircle size={16} />,
    color: 'text-red-400',
    bgColor: 'bg-red-900/20',
    borderColor: 'border-red-800/50',
  },
  {
    severity: 'severe',
    label: '严重',
    icon: <AlertOctagon size={16} />,
    color: 'text-orange-400',
    bgColor: 'bg-orange-900/20',
    borderColor: 'border-orange-800/50',
  },
  {
    severity: 'warning',
    label: '警告',
    icon: <AlertTriangle size={16} />,
    color: 'text-yellow-400',
    bgColor: 'bg-yellow-900/20',
    borderColor: 'border-yellow-800/50',
  },
];

const categoryConfig = {
  sampling_gap: { icon: <Clock size={14} />, label: '采样缺口' },
  temperature_drift: { icon: <Thermometer size={14} />, label: '温度漂移' },
  parameter_divergence: { icon: <Gauge size={14} />, label: '参数发散' },
};

function parseAlertDetails(alert: Alert): { gapStart?: number; gapEnd?: number; driftRate?: number; parameterName?: string } {
  const details: ReturnType<typeof parseAlertDetails> = {};
  
  if (alert.category === 'sampling_gap') {
    const gapMatch = alert.message.match(/第(\d+)点间隔([\d.]+)s/);
    if (gapMatch) {
      details.gapStart = parseInt(gapMatch[1]);
      details.gapEnd = parseInt(gapMatch[1]) + 1;
    }
  } else if (alert.category === 'temperature_drift') {
    const driftMatch = alert.message.match(/变化率([\d.]+)°C\/min/);
    if (driftMatch) {
      details.driftRate = parseFloat(driftMatch[1]);
    }
    const indexMatch = alert.message.match(/第(\d+)点/);
    if (indexMatch) {
      details.gapStart = parseInt(indexMatch[1]);
    }
  } else if (alert.category === 'parameter_divergence') {
    const paramMatch = alert.message.match(/参数(\w+)超出边界/);
    if (paramMatch) {
      details.parameterName = paramMatch[1];
    }
  }
  
  return details;
}

interface AlertItemProps {
  alert: Alert;
}

function AlertItem({ alert }: AlertItemProps) {
  const config = severityConfig.find(s => s.severity === alert.severity)!;
  const category = categoryConfig[alert.category];
  const details = parseAlertDetails(alert);

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  return (
    <div className={cn(
      'p-3 rounded-lg border transition-all hover:brightness-110',
      config.bgColor,
      config.borderColor
    )}>
      <div className="flex items-start gap-2">
        <div className={cn('mt-0.5', config.color)}>
          {category.icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={cn('text-xs font-medium px-1.5 py-0.5 rounded', config.bgColor, config.color)}>
              {category.label}
            </span>
            <span className={cn('text-xs font-medium', config.color)}>
              {config.label}
            </span>
            <span className="text-xs text-gray-500 ml-auto">
              {formatTime(alert.timestamp)}
            </span>
          </div>
          <p className="text-sm text-gray-300 mb-1">{alert.message}</p>
          {(details.gapStart !== undefined || details.driftRate !== undefined || details.parameterName) && (
            <div className="text-xs text-gray-400 space-y-0.5">
              {details.gapStart !== undefined && details.gapEnd !== undefined && (
                <p>位置: 第{details.gapStart} ~ {details.gapEnd}个采样点</p>
              )}
              {details.driftRate !== undefined && (
                <p>漂移速率: {details.driftRate.toFixed(2)}°C/min</p>
              )}
              {details.parameterName && (
                <p>发散参数: {details.parameterName}</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function AlertCenter() {
  const { alerts } = useFittingStore();
  const [expanded, setExpanded] = React.useState(true);

  const groupedAlerts = useMemo(() => {
    return severityConfig.map(config => ({
      ...config,
      alerts: alerts.filter(a => a.severity === config.severity && !a.resolved),
    }));
  }, [alerts]);

  const totalAlerts = alerts.filter(a => !a.resolved).length;

  if (totalAlerts === 0) {
    return (
      <div className="bg-[#16162a] border border-[#2a2a4e] rounded-lg">
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full flex items-center justify-between p-3"
        >
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-500" />
            <span className="text-sm font-medium text-gray-400">告警中心</span>
            <span className="text-xs text-gray-500">运行正常</span>
          </div>
          {expanded ? <ChevronUp size={16} className="text-gray-500" /> : <ChevronDown size={16} className="text-gray-500" />}
        </button>
        {expanded && (
          <div className="px-3 pb-3">
            <div className="text-center py-4 text-gray-500 text-sm">
              暂无告警
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="bg-[#16162a] border border-[#2a2a4e] rounded-lg overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-3 hover:bg-[#1a1a2e] transition-colors"
      >
        <div className="flex items-center gap-2">
          <AlertTriangle size={16} className="text-yellow-400" />
          <span className="text-sm font-medium text-gray-300">告警中心</span>
          <span className="text-xs px-1.5 py-0.5 bg-yellow-900/30 text-yellow-400 rounded">
            {totalAlerts} 条告警
          </span>
        </div>
        {expanded ? <ChevronUp size={16} className="text-gray-500" /> : <ChevronDown size={16} className="text-gray-500" />}
      </button>
      
      {expanded && (
        <div className="px-3 pb-3 space-y-4 max-h-64 overflow-y-auto">
          {groupedAlerts.map(group => (
            group.alerts.length > 0 && (
              <div key={group.severity} className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className={group.color}>{group.icon}</div>
                  <span className={cn('text-xs font-medium', group.color)}>
                    {group.label} ({group.alerts.length})
                  </span>
                </div>
                <div className="space-y-2">
                  {group.alerts.map(alert => (
                    <AlertItem key={alert.id} alert={alert} />
                  ))}
                </div>
              </div>
            )
          ))}
        </div>
      )}
    </div>
  );
}
