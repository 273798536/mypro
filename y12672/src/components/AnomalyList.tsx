import { useState } from 'react';
import { useAppStore } from '../store/appStore';
import { Filter, AlertTriangle, Eye, CheckCircle, Clock } from 'lucide-react';
import type { AnomalyType, Severity, AnomalyStatus } from '../types';

const anomalyTypeLabels: Record<AnomalyType, string> = {
  model_overlap: '模型重叠',
  camera_lost: '相机视角丢失',
  size_exceed: '尺寸超限',
  position_offset: '位置偏移',
};

const severityColors: Record<Severity, string> = {
  high: 'text-red-600 bg-red-50 border-red-200',
  medium: 'text-amber-600 bg-amber-50 border-amber-200',
  low: 'text-yellow-600 bg-yellow-50 border-yellow-200',
};

const statusIcons: Record<AnomalyStatus, typeof AlertTriangle> = {
  pending: Clock,
  processing: Eye,
  processed: CheckCircle,
  reviewed: CheckCircle,
};

export default function AnomalyList() {
  const anomalies = useAppStore((state) => state.anomalies);
  const filters = useAppStore((state) => state.filters);
  const updateFilters = useAppStore((state) => state.updateFilters);
  const setSelectedAnomaly = useAppStore((state) => state.setSelectedAnomaly);
  const selectedAnomaly = useAppStore((state) => state.selectedAnomaly);

  const [showFilters, setShowFilters] = useState(false);

  const filteredAnomalies = anomalies.filter((anomaly) => {
    if (filters.anomalyType.length > 0 && !filters.anomalyType.includes(anomaly.type)) {
      return false;
    }
    if (filters.severity.length > 0 && !filters.severity.includes(anomaly.severity)) {
      return false;
    }
    if (filters.status.length > 0 && !filters.status.includes(anomaly.status)) {
      return false;
    }
    if (filters.importBatch.length > 0 && !filters.importBatch.includes(anomaly.sourceInfo.importBatch)) {
      return false;
    }
    return true;
  });

  const handleTypeFilter = (type: AnomalyType) => {
    const newTypes = filters.anomalyType.includes(type)
      ? filters.anomalyType.filter((t) => t !== type)
      : [...filters.anomalyType, type];
    updateFilters({ anomalyType: newTypes });
  };

  const handleSeverityFilter = (severity: Severity) => {
    const newSeverities = filters.severity.includes(severity)
      ? filters.severity.filter((s) => s !== severity)
      : [...filters.severity, severity];
    updateFilters({ severity: newSeverities });
  };

  const handleStatusFilter = (status: AnomalyStatus) => {
    const newStatuses = filters.status.includes(status)
      ? filters.status.filter((s) => s !== status)
      : [...filters.status, status];
    updateFilters({ status: newStatuses });
  };

  const clearFilters = () => {
    updateFilters({
      anomalyType: [],
      severity: [],
      status: [],
      importBatch: [],
      dateRange: null,
    });
  };

  return (
    <div className="h-full flex flex-col bg-slate-50">
      <div className="bg-white border-b border-slate-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">异常列表</h2>
            <p className="text-sm text-slate-600 mt-1">
              共 {filteredAnomalies.length} 条异常记录
            </p>
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
              showFilters
                ? 'bg-blue-600 text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <Filter className="w-4 h-4" />
            筛选
          </button>
        </div>

        {showFilters && (
          <div className="mt-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-semibold text-slate-700 mb-2">异常类型</h4>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(anomalyTypeLabels).map(([type, label]) => (
                    <button
                      key={type}
                      onClick={() => handleTypeFilter(type as AnomalyType)}
                      className={`px-3 py-1 rounded-full text-sm transition-colors ${
                        filters.anomalyType.includes(type as AnomalyType)
                          ? 'bg-blue-600 text-white'
                          : 'bg-white text-slate-600 border border-slate-300 hover:bg-slate-100'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="text-sm font-semibold text-slate-700 mb-2">严重程度</h4>
                <div className="flex flex-wrap gap-2">
                  {(['high', 'medium', 'low'] as Severity[]).map((severity) => (
                    <button
                      key={severity}
                      onClick={() => handleSeverityFilter(severity)}
                      className={`px-3 py-1 rounded-full text-sm transition-colors ${
                        filters.severity.includes(severity)
                          ? severity === 'high'
                            ? 'bg-red-600 text-white'
                            : severity === 'medium'
                            ? 'bg-amber-600 text-white'
                            : 'bg-yellow-600 text-white'
                          : 'bg-white text-slate-600 border border-slate-300 hover:bg-slate-100'
                      }`}
                    >
                      {severity === 'high' ? '高危' : severity === 'medium' ? '中危' : '低危'}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="text-sm font-semibold text-slate-700 mb-2">处理状态</h4>
                <div className="flex flex-wrap gap-2">
                  {(['pending', 'processing', 'processed', 'reviewed'] as AnomalyStatus[]).map((status) => (
                    <button
                      key={status}
                      onClick={() => handleStatusFilter(status)}
                      className={`px-3 py-1 rounded-full text-sm transition-colors ${
                        filters.status.includes(status)
                          ? 'bg-green-600 text-white'
                          : 'bg-white text-slate-600 border border-slate-300 hover:bg-slate-100'
                      }`}
                    >
                      {status === 'pending'
                        ? '待处理'
                        : status === 'processing'
                        ? '处理中'
                        : status === 'processed'
                        ? '已处理'
                        : '已复核'}
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={clearFilters}
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                清除所有筛选
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto">
        {filteredAnomalies.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-slate-500">
            <AlertTriangle className="w-16 h-16 mb-4 text-slate-300" />
            <p className="text-lg">暂无异常记录</p>
          </div>
        ) : (
          <div className="p-6 space-y-4">
            {filteredAnomalies.map((anomaly) => {
              const StatusIcon = statusIcons[anomaly.status];
              const isSelected = selectedAnomaly?.id === anomaly.id;

              return (
                <div
                  key={anomaly.id}
                  onClick={() => setSelectedAnomaly(anomaly)}
                  className={`bg-white rounded-lg border-2 transition-all cursor-pointer hover:shadow-md ${
                    isSelected
                      ? 'border-blue-500 shadow-md'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <span
                          className={`px-2 py-1 rounded text-xs font-semibold border ${severityColors[anomaly.severity]}`}
                        >
                          {anomaly.severity === 'high'
                            ? '高危'
                            : anomaly.severity === 'medium'
                            ? '中危'
                            : '低危'}
                        </span>
                        <span className="text-sm text-slate-600">
                          {anomalyTypeLabels[anomaly.type]}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <StatusIcon className="w-4 h-4 text-slate-400" />
                        <span className="text-slate-600">
                          {anomaly.status === 'pending'
                            ? '待处理'
                            : anomaly.status === 'processing'
                            ? '处理中'
                            : anomaly.status === 'processed'
                            ? '已处理'
                            : '已复核'}
                        </span>
                      </div>
                    </div>

                    <p className="text-slate-800 mb-3">{anomaly.riskNote}</p>

                    <div className="flex items-center justify-between text-sm text-slate-500">
                      <span>来源: {anomaly.sourceInfo.sourceFile}</span>
                      <span>
                        {new Date(anomaly.createdAt).toLocaleString('zh-CN', {
                          year: 'numeric',
                          month: '2-digit',
                          day: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>

                    {anomaly.processingSuggestion && (
                      <div className="mt-3 pt-3 border-t border-slate-100">
                        <p className="text-sm text-green-700">
                          <span className="font-semibold">处理意见：</span>
                          {anomaly.processingSuggestion}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
