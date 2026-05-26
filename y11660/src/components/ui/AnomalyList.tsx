import { useState } from 'react';
import {
  AlertTriangle,
  AlertCircle,
  AlertOctagon,
  ChevronDown,
  ChevronUp,
  Eye,
  FileWarning,
} from 'lucide-react';
import { useAppStore, useAnomalyStats } from '@/store/useAppStore';
import { getAnomalyTypeLabel, getAnomalySeverityColor } from '@/utils/anomalyDetector';
import type { ProcessedDataPoint } from '@/types';

export const AnomalyList = () => {
  const { dataPoints, setSelectedPoint, selectedPoint } = useAppStore();
  const stats = useAnomalyStats();
  const [expanded, setExpanded] = useState(true);

  const anomalyPoints = dataPoints.filter((p) => p.anomalies.length > 0);

  const handlePointClick = (point: ProcessedDataPoint) => {
    setSelectedPoint(point.id === selectedPoint?.id ? null : point);
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical':
        return <AlertOctagon size={14} className="text-red-500" />;
      case 'error':
        return <AlertCircle size={14} className="text-orange-500" />;
      default:
        return <AlertTriangle size={14} className="text-yellow-500" />;
    }
  };

  return (
    <div className="bg-slate-800/90 backdrop-blur-sm rounded-lg border border-slate-700 overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-4 hover:bg-slate-700/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <FileWarning size={18} className="text-rose-400" />
          <span className="font-semibold text-white">异常检测</span>
          <span className="px-2 py-0.5 bg-rose-600 text-white text-xs rounded-full">
            {stats.withAnomalies}
          </span>
        </div>
        {expanded ? (
          <ChevronUp size={18} className="text-slate-400" />
        ) : (
          <ChevronDown size={18} className="text-slate-400" />
        )}
      </button>

      {expanded && (
        <div className="p-4 pt-0">
          <div className="grid grid-cols-2 gap-2 mb-4">
            <StatCard label="缺失报价" value={stats.missingQuotes} color="text-yellow-400" />
            <StatCard label="异常尖峰" value={stats.spikes} color="text-red-400" />
            <StatCard label="到期错层" value={stats.expirationMismatches} color="text-orange-400" />
            <StatCard label="全局异常" value={stats.outliers} color="text-amber-400" />
          </div>

          <div className="space-y-2 max-h-64 overflow-y-auto">
            {anomalyPoints.length === 0 ? (
              <div className="text-center py-8 text-slate-500">
                <Eye size={32} className="mx-auto mb-2 opacity-50" />
                <p className="text-sm">未检测到异常</p>
              </div>
            ) : (
              anomalyPoints.slice(0, 20).map((point) => {
                const maxSeverity = point.anomalies.reduce(
                  (max, a) => {
                    const order = { warning: 1, error: 2, critical: 3 };
                    return order[a.severity] > order[max.severity] ? a : max;
                  },
                  point.anomalies[0]
                );

                return (
                  <button
                    key={point.id}
                    onClick={() => handlePointClick(point)}
                    className={`w-full text-left p-3 rounded-lg transition-colors ${
                      selectedPoint?.id === point.id
                        ? 'bg-cyan-900/50 border border-cyan-500'
                        : 'bg-slate-900/50 hover:bg-slate-700/50 border border-transparent'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        {getSeverityIcon(maxSeverity.severity)}
                        <div>
                          <div className="text-sm font-medium text-white">
                            K={point.strikePrice} | {point.expirationDate.slice(5)}
                          </div>
                          <div className="text-xs text-slate-400">
                            IV: {(point.impliedVolatility * 100).toFixed(1)}%
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <span
                          className="text-xs px-2 py-0.5 rounded"
                          style={{
                            backgroundColor: getAnomalySeverityColor(maxSeverity.severity) + '30',
                            color: getAnomalySeverityColor(maxSeverity.severity),
                          }}
                        >
                          {point.anomalies.length} 项
                        </span>
                      </div>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1">
                      {point.anomalies.slice(0, 2).map((a) => (
                        <span
                          key={a.id}
                          className="text-xs text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded"
                        >
                          {getAnomalyTypeLabel(a.type)}
                        </span>
                      ))}
                      {point.anomalies.length > 2 && (
                        <span className="text-xs text-slate-500">
                          +{point.anomalies.length - 2}
                        </span>
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </div>

          {anomalyPoints.length > 20 && (
            <div className="mt-2 text-center text-xs text-slate-500">
              显示前 20 条，共 {anomalyPoints.length} 条异常
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const StatCard = ({ label, value, color }: { label: string; value: number; color: string }) => (
  <div className="bg-slate-900/50 rounded-lg p-2">
    <div className={`text-xl font-bold ${color}`}>{value}</div>
    <div className="text-xs text-slate-500">{label}</div>
  </div>
);
