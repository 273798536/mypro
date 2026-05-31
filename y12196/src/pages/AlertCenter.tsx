import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, FileX, ShieldAlert, Truck, Check, X, ExternalLink } from 'lucide-react';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { useStore } from '../store';
import { alertTypeLabels } from '../data/mockData';
import type { AlertType, AlertStatus } from '../types';

const TYPE_TABS: { label: string; value: AlertType | 'all' }[] = [
  { label: '全部', value: 'all' },
  { label: '箱号重复', value: 'duplicate-box' },
  { label: '签收缺失', value: 'missing-signature' },
  { label: '保险过期', value: 'insurance-expiring' },
  { label: '运输延迟', value: 'shipment-delay' },
];

const STATUS_TABS: { label: string; value: AlertStatus }[] = [
  { label: '活跃', value: 'active' },
  { label: '已忽略', value: 'dismissed' },
  { label: '已解决', value: 'resolved' },
];

const typeIconMap: Record<string, React.ElementType> = {
  'alert-triangle': AlertTriangle,
  'file-x': FileX,
  'shield-alert': ShieldAlert,
  'truck': Truck,
};

const severityDot: Record<string, string> = {
  high: 'bg-red-500',
  medium: 'bg-orange-400',
  low: 'bg-yellow-400',
};

const severityBorder: Record<string, string> = {
  high: 'border-l-red-500',
  medium: 'border-l-orange-400',
  low: 'border-l-yellow-400',
};

const severityLabel: Record<string, string> = {
  high: '高',
  medium: '中',
  low: '低',
};

export function AlertCenter() {
  const alerts = useStore((s) => s.alerts);
  const resolveAlert = useStore((s) => s.resolveAlert);
  const dismissAlert = useStore((s) => s.dismissAlert);

  const [typeFilter, setTypeFilter] = useState<AlertType | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<AlertStatus>('active');

  const activeCount = useMemo(
    () => alerts.filter((a) => a.status === 'active').length,
    [alerts],
  );

  const filteredAlerts = useMemo(() => {
    return alerts.filter((a) => {
      const matchesType = typeFilter === 'all' || a.type === typeFilter;
      const matchesStatus = a.status === statusFilter;
      return matchesType && matchesStatus;
    });
  }, [alerts, typeFilter, statusFilter]);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <AlertTriangle size={28} className="text-accent-danger" />
        <h1 className="text-2xl font-bold text-neutral-text">异常预警</h1>
        {activeCount > 0 && (
          <span className="inline-flex items-center justify-center min-w-[24px] h-6 px-2 rounded-full bg-red-100 text-red-700 text-sm font-semibold">
            {activeCount}
          </span>
        )}
      </div>

      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500 font-medium">类型:</span>
          {TYPE_TABS.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setTypeFilter(tab.value)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                typeFilter === tab.value
                  ? 'bg-primary-600 text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-100 border border-neutral-border'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-500 font-medium">状态:</span>
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setStatusFilter(tab.value)}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              statusFilter === tab.value
                ? 'bg-primary-600 text-white'
                : 'bg-white text-gray-600 hover:bg-gray-100 border border-neutral-border'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {filteredAlerts.map((alert) => {
          const typeInfo = alertTypeLabels[alert.type];
          const IconComponent = typeInfo ? typeIconMap[typeInfo.icon] : AlertTriangle;
          const isResolved = alert.status === 'resolved';
          const isDismissed = alert.status === 'dismissed';
          const isInactive = isResolved || isDismissed;

          return (
            <div
              key={alert.id}
              className={`bg-white rounded-lg shadow-card p-4 transition-colors ${
                alert.status === 'active'
                  ? `border-l-4 ${severityBorder[alert.severity]}`
                  : 'opacity-60'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className="flex items-center gap-2 pt-0.5 flex-shrink-0">
                  <span className={`w-2.5 h-2.5 rounded-full ${severityDot[alert.severity]}`} />
                  {IconComponent && (
                    <IconComponent size={18} className={isInactive ? 'text-gray-400' : 'text-primary-600'} />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    {typeInfo && (
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                        isInactive
                          ? 'bg-gray-100 text-gray-400'
                          : 'bg-primary-50 text-primary-700'
                      }`}>
                        {typeInfo.label}
                      </span>
                    )}
                    <span className={`text-xs px-1.5 py-0.5 rounded ${
                      alert.severity === 'high'
                        ? 'bg-red-100 text-red-700'
                        : alert.severity === 'medium'
                          ? 'bg-orange-100 text-orange-700'
                          : 'bg-yellow-100 text-yellow-700'
                    }`}>
                      {severityLabel[alert.severity]}
                    </span>
                    {isResolved && (
                      <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded">已解决</span>
                    )}
                    {isDismissed && (
                      <span className="text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">已忽略</span>
                    )}
                  </div>

                  <p className={`text-sm text-neutral-text ${isResolved ? 'line-through text-gray-400' : ''}`}>
                    {alert.message}
                  </p>

                  <div className="flex items-center gap-4 mt-2">
                    <span className="text-xs text-gray-400">
                      {format(new Date(alert.createdAt), 'yyyy-MM-dd HH:mm', { locale: zhCN })}
                    </span>

                    <Link
                      to={alert.recordLink}
                      className="inline-flex items-center gap-1 text-xs text-primary-600 hover:text-primary-800 font-medium transition-colors"
                    >
                      <ExternalLink size={12} />
                      查看记录
                    </Link>
                  </div>
                </div>

                {alert.status === 'active' && (
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => resolveAlert(alert.id)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 bg-green-50 text-green-700 rounded-md text-sm font-medium hover:bg-green-100 transition-colors"
                    >
                      <Check size={14} />
                      标记已处理
                    </button>
                    <button
                      onClick={() => dismissAlert(alert.id)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 bg-gray-50 text-gray-500 rounded-md text-sm font-medium hover:bg-gray-100 transition-colors"
                    >
                      <X size={14} />
                      忽略
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {filteredAlerts.length === 0 && (
          <div className="text-center py-16 text-gray-400">
            当前筛选条件下没有预警
          </div>
        )}
      </div>
    </div>
  );
}
