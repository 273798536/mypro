import { useState } from 'react';
import { AlertTriangle, XCircle, ChevronDown, ChevronUp, AlertCircle } from 'lucide-react';
import { useResultStore } from '@/store/resultStore';
import { usePathStore } from '@/store/pathStore';
import { getAnomalyTypeLabel, getSeverityLabel, getSeverityColor } from '@/utils/math/anomalyDetection';
import type { Anomaly } from '@/types';
import { cn } from '@/lib/utils';

export function AlertPanel() {
  const { getAllAnomalies } = useResultStore();
  const { paths } = usePathStore();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'error' | 'warning'>('all');

  const anomalies = getAllAnomalies();
  const filteredAnomalies =
    filter === 'all'
      ? anomalies
      : anomalies.filter((a) => a.severity === filter);

  const errorCount = anomalies.filter((a) => a.severity === 'error').length;
  const warningCount = anomalies.filter((a) => a.severity === 'warning').length;

  const getPathName = (anomaly: Anomaly) => {
    const result = useResultStore.getState().results.find((r) => r.id === anomaly.resultId);
    if (!result) return '未知路径';
    const path = paths.find((p) => p.id === result.pathId);
    return path?.name || '未知路径';
  };

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  if (anomalies.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
        <div className="px-4 py-3 bg-slate-50 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-slate-600" />
          <span className="font-medium text-slate-800">异常检测</span>
        </div>
        <div className="p-4 text-center text-slate-500 text-sm">
          <AlertCircle className="w-8 h-8 mx-auto mb-2 text-green-500" />
          暂无异常数据
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
      <div className="px-4 py-3 bg-slate-50 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-slate-600" />
          <span className="font-medium text-slate-800">异常检测</span>
          {errorCount > 0 && (
            <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs rounded-full">
              {errorCount} 错误
            </span>
          )}
          {warningCount > 0 && (
            <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-xs rounded-full">
              {warningCount} 警告
            </span>
          )}
        </div>
        <div className="flex gap-1">
          {(['all', 'error', 'warning'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                'px-2 py-0.5 text-xs rounded transition-colors',
                filter === f
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-slate-500 hover:bg-slate-100'
              )}
            >
              {f === 'all' ? '全部' : f === 'error' ? '错误' : '警告'}
            </button>
          ))}
        </div>
      </div>

      <div className="max-h-60 overflow-y-auto">
        {filteredAnomalies.length === 0 ? (
          <div className="p-4 text-center text-slate-500 text-sm">
            暂无匹配的异常
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredAnomalies.map((anomaly) => (
              <div
                key={anomaly.id}
                className={cn(
                  'border-l-4 transition-colors',
                  anomaly.severity === 'error'
                    ? 'border-red-500 bg-red-50/50'
                    : 'border-amber-500 bg-amber-50/50'
                )}
              >
                <button
                  onClick={() => toggleExpand(anomaly.id)}
                  className="w-full p-3 text-left flex items-start gap-2 hover:bg-white/50 transition-colors"
                >
                  <div className="flex-shrink-0 mt-0.5">
                    {anomaly.severity === 'error' ? (
                      <XCircle className="w-4 h-4 text-red-500" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-amber-500" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span
                        className="text-sm font-medium"
                        style={{ color: getSeverityColor(anomaly.severity) }}
                      >
                        [{getSeverityLabel(anomaly.severity)}] {getAnomalyTypeLabel(anomaly.type)}
                      </span>
                      {expandedId === anomaly.id ? (
                        <ChevronUp className="w-4 h-4 text-slate-400" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-slate-400" />
                      )}
                    </div>
                    <div className="text-xs text-slate-600 mt-0.5">
                      路径: {getPathName(anomaly)}
                    </div>
                    {expandedId === anomaly.id && (
                      <div className="mt-2 p-2 bg-white rounded text-xs text-slate-700 border border-slate-200">
                        {anomaly.description}
                        {anomaly.positionX !== undefined &&
                          anomaly.positionY !== undefined && (
                            <div className="mt-1 font-mono text-slate-500">
                              位置: ({anomaly.positionX.toFixed(2)}, {anomaly.positionY.toFixed(2)})
                            </div>
                          )}
                      </div>
                    )}
                  </div>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="px-4 py-2 bg-slate-50 text-xs text-slate-500 border-t">
        注意: 含有错误的积分结果已标记，不建议纳入正常分析
      </div>
    </div>
  );
}
