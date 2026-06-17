import React from 'react';
import { AlertTriangle, Clock, Filter, ChevronDown, ChevronUp } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { AnomalyTypeBadge, SeverityBadge, StatusBadge } from '@/components/common/StatusBadge';
import type { Anomaly, AnomalyType, AnomalySeverity } from '@/types';

interface AnomalyListProps {
  onSelectAnomaly: (anomaly: Anomaly) => void;
}

export const AnomalyList: React.FC<AnomalyListProps> = ({ onSelectAnomaly }) => {
  const { anomalies, selectedAnomalyId, setSelectedAnomalyId } = useAppStore();
  const [filterType, setFilterType] = React.useState<AnomalyType | 'all'>('all');
  const [filterSeverity, setFilterSeverity] = React.useState<AnomalySeverity | 'all'>('all');
  const [isExpanded, setIsExpanded] = React.useState(true);

  const filteredAnomalies = anomalies.filter((a) => {
    if (filterType !== 'all' && a.type !== filterType) return false;
    if (filterSeverity !== 'all' && a.severity !== filterSeverity) return false;
    return true;
  });

  const formatTime = (date: Date) => {
    return new Date(date).toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const typeOptions: { value: AnomalyType | 'all'; label: string }[] = [
    { value: 'all', label: '全部类型' },
    { value: 'unit_mismatch', label: '单位混写' },
    { value: 'direction_reversal', label: '方向反转' },
    { value: 'threshold', label: '阈值超限' },
  ];

  const severityOptions: { value: AnomalySeverity | 'all'; label: string }[] = [
    { value: 'all', label: '全部级别' },
    { value: 'critical', label: '严重' },
    { value: 'warning', label: '警告' },
    { value: 'info', label: '提示' },
  ];

  return (
    <div className="h-full flex flex-col bg-deep-sea-600/50 border border-deep-sea-500 rounded-lg overflow-hidden">
      <div
        className="p-3 border-b border-deep-sea-500 flex items-center justify-between cursor-pointer hover:bg-deep-sea-600/50 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-alert-orange" />
          <h3 className="font-medium text-deep-sea-100">异常列表</h3>
          <span className="px-2 py-0.5 text-xs bg-alert-red/20 text-alert-red rounded-full">
            {anomalies.length}
          </span>
        </div>
        {isExpanded ? (
          <ChevronUp className="w-5 h-5 text-deep-sea-400" />
        ) : (
          <ChevronDown className="w-5 h-5 text-deep-sea-400" />
        )}
      </div>

      {isExpanded && (
        <>
          <div className="p-2 border-b border-deep-sea-500 flex gap-2">
            <div className="flex items-center gap-1 flex-1">
              <Filter className="w-4 h-4 text-deep-sea-400" />
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value as AnomalyType | 'all')}
                className="flex-1 text-xs bg-deep-sea-700 border border-deep-sea-500 rounded px-2 py-1 text-deep-sea-100 focus:outline-none focus:border-ocean-400"
              >
                {typeOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            <select
              value={filterSeverity}
              onChange={(e) => setFilterSeverity(e.target.value as AnomalySeverity | 'all')}
              className="text-xs bg-deep-sea-700 border border-deep-sea-500 rounded px-2 py-1 text-deep-sea-100 focus:outline-none focus:border-ocean-400"
            >
              {severityOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex-1 overflow-y-auto scrollbar-thin">
            {filteredAnomalies.length === 0 ? (
              <div className="p-8 text-center text-deep-sea-400">
                <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">暂无符合条件的异常</p>
              </div>
            ) : (
              <div className="divide-y divide-deep-sea-500">
                {filteredAnomalies.map((anomaly) => (
                  <button
                    key={anomaly.id}
                    onClick={() => {
                      setSelectedAnomalyId(anomaly.id);
                      onSelectAnomaly(anomaly);
                    }}
                    className={`w-full text-left p-3 transition-colors ${
                      anomaly.id === selectedAnomalyId
                        ? 'bg-ocean-500/20 border-l-2 border-ocean-400'
                        : 'hover:bg-deep-sea-600/50 border-l-2 border-transparent'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <AnomalyTypeBadge type={anomaly.type} />
                        <SeverityBadge severity={anomaly.severity} />
                        <StatusBadge status={anomaly.status} />
                      </div>
                      <span className="text-xs text-deep-sea-400 font-mono flex-shrink-0">
                        {formatTime(anomaly.timestamp)}
                      </span>
                    </div>
                    <p className="text-sm text-deep-sea-100 line-clamp-2">
                      {anomaly.explanation}
                    </p>
                    <div className="mt-2 text-xs text-deep-sea-400">
                      {anomaly.type !== 'direction_reversal' && (
                        <span className="font-mono">
                          {anomaly.data.value.toFixed(2)} {anomaly.data.unit}
                        </span>
                      )}
                      {anomaly.data.direction && (
                        <span className={anomaly.type !== 'direction_reversal' ? 'ml-2' : ''}>方向: {anomaly.data.direction}</span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};
