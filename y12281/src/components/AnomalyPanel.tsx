import { useState } from 'react';
import { AlertTriangle, ChevronUp, ChevronDown, Filter, X } from 'lucide-react';
import useAppStore from '@/store/useAppStore';
import type { AnomalyType, AnomalySeverity, AnomalyStatus } from '@/types';

export default function AnomalyPanel() {
  const [isExpanded, setIsExpanded] = useState(true);
  const [typeFilter, setTypeFilter] = useState<AnomalyType | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<AnomalyStatus | 'all'>('all');
  const [severityFilter, setSeverityFilter] = useState<AnomalySeverity | 'all'>('all');

  const anomalies = useAppStore((state) => state.anomalies);
  const regions = useAppStore((state) => state.regions);
  const selectRegion = useAppStore((state) => state.selectRegion);
  const updateAnomalyStatus = useAppStore((state) => state.updateAnomalyStatus);

  const filteredAnomalies = anomalies.filter((a) => {
    if (typeFilter !== 'all' && a.type !== typeFilter) return false;
    if (statusFilter !== 'all' && a.status !== statusFilter) return false;
    if (severityFilter !== 'all' && a.severity !== severityFilter) return false;
    return true;
  });

  const typeLabels: Record<AnomalyType, string> = {
    overlap: '区域重叠',
    missing_month: '数据缺失',
    extreme_value: '极端值',
    partial_data: '数据不完整',
  };

  const severityColors: Record<AnomalySeverity, string> = {
    low: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    medium: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
    high: 'bg-red-500/20 text-red-400 border-red-500/30',
  };

  const statusLabels: Record<AnomalyStatus, string> = {
    pending: '待确认',
    confirmed: '已确认',
    resolved: '已处理',
    dismissed: '已忽略',
  };

  const getRegionName = (regionId: string) => {
    return regions.find((r) => r.id === regionId)?.name || regionId;
  };

  return (
    <div className="absolute bottom-24 left-4 right-88 z-10">
      <div className="bg-slate-900/95 backdrop-blur-md rounded-xl border border-slate-700/50 overflow-hidden">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full p-3 flex items-center justify-between hover:bg-slate-800/50 transition-colors"
        >
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-400" />
            <span className="font-semibold text-white">异常清单</span>
            <span className="px-2 py-0.5 bg-red-500/20 text-red-400 text-xs rounded-full">
              {filteredAnomalies.filter((a) => a.status === 'pending').length} 待处理
            </span>
            <span className="text-slate-500 text-sm">共 {filteredAnomalies.length} 条</span>
          </div>
          {isExpanded ? (
            <ChevronDown className="w-5 h-5 text-slate-400" />
          ) : (
            <ChevronUp className="w-5 h-5 text-slate-400" />
          )}
        </button>

        {isExpanded && (
          <>
            <div className="px-3 pb-2 flex items-center gap-2 border-b border-slate-700/50">
              <Filter className="w-4 h-4 text-slate-500" />
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value as AnomalyType | 'all')}
                className="bg-slate-800 text-slate-300 text-xs px-2 py-1 rounded border border-slate-700 outline-none"
              >
                <option value="all">全部类型</option>
                {Object.entries(typeLabels).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as AnomalyStatus | 'all')}
                className="bg-slate-800 text-slate-300 text-xs px-2 py-1 rounded border border-slate-700 outline-none"
              >
                <option value="all">全部状态</option>
                {Object.entries(statusLabels).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
              <select
                value={severityFilter}
                onChange={(e) => setSeverityFilter(e.target.value as AnomalySeverity | 'all')}
                className="bg-slate-800 text-slate-300 text-xs px-2 py-1 rounded border border-slate-700 outline-none"
              >
                <option value="all">全部级别</option>
                <option value="low">低</option>
                <option value="medium">中</option>
                <option value="high">高</option>
              </select>
            </div>

            <div className="max-h-48 overflow-y-auto">
              {filteredAnomalies.length === 0 ? (
                <div className="p-4 text-center text-slate-500 text-sm">暂无异常记录</div>
              ) : (
                filteredAnomalies.map((anomaly) => (
                  <div
                    key={anomaly.id}
                    className={`p-3 border-b border-slate-700/30 hover:bg-slate-800/30 transition-colors ${severityColors[anomaly.severity]}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <button
                            onClick={() => selectRegion(anomaly.regionId)}
                            className="text-xs font-semibold text-blue-400 hover:text-blue-300 hover:underline"
                          >
                            {getRegionName(anomaly.regionId)}
                          </button>
                          <span className="text-xs px-1.5 py-0.5 bg-slate-700 rounded">
                            {typeLabels[anomaly.type]}
                          </span>
                          <span className="text-xs px-1.5 py-0.5 bg-slate-700/50 rounded">
                            {statusLabels[anomaly.status]}
                          </span>
                          {anomaly.month && (
                            <span className="text-xs text-slate-500">2024年{anomaly.month}月</span>
                          )}
                        </div>
                        <p className="text-xs text-slate-300">{anomaly.description}</p>
                        {anomaly.judgment && (
                          <p className="text-xs text-slate-400 mt-1">
                            判断：{anomaly.judgment}
                          </p>
                        )}
                      </div>
                      {anomaly.status === 'pending' && (
                        <div className="flex gap-1">
                          <button
                            onClick={() => updateAnomalyStatus(anomaly.id, 'confirmed', '批量确认')}
                            className="text-xs px-2 py-1 bg-blue-500/30 hover:bg-blue-500/50 text-blue-300 rounded transition-colors"
                          >
                            确认
                          </button>
                          <button
                            onClick={() => updateAnomalyStatus(anomaly.id, 'dismissed')}
                            className="text-xs p-1 hover:bg-slate-600 rounded transition-colors"
                          >
                            <X className="w-3 h-3 text-slate-400" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
