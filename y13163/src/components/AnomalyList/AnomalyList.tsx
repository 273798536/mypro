import { useMemo } from 'react';
import { AlertTriangle, AlertCircle, TrendingDown, Ban, CheckCircle, Clock, Eye } from 'lucide-react';
import { useDataStore } from '@/store/useDataStore';
import { useFilterStore } from '@/store/useFilterStore';
import { filterAnomalies, anomalyTypeLabels, anomalyTypeColors, anomalyStatusLabels } from '@/utils/anomaly';
import { formatTimestamp } from '@/utils/format';
import type { AnomalyType } from '@/types';

const anomalyIcons: Record<AnomalyType, typeof AlertTriangle> = {
  extreme: AlertTriangle,
  noise: AlertCircle,
  drift: TrendingDown,
  missing: Ban,
};

const statusIcons = {
  pending: Clock,
  reviewed: Eye,
  resolved: CheckCircle,
};

const statusColors = {
  pending: 'text-warning-orange bg-warning-orange/10',
  reviewed: 'text-cyan-glow bg-cyan-glow/10',
  resolved: 'text-success-green bg-success-green/10',
};

export default function AnomalyList() {
  const { anomalies, buoyData, selectedAnomalyId, selectDataAndAnomaly } = useDataStore();
  const { anomalyTypes, showNoiseOnly, searchKeyword } = useFilterStore();

  const filteredAnomalies = useMemo(() => {
    return filterAnomalies(anomalies, anomalyTypes, showNoiseOnly, searchKeyword);
  }, [anomalies, anomalyTypes, showNoiseOnly, searchKeyword]);

  const getAnomalyDataPoint = (dataId: string) => {
    return buoyData.find((d) => d.id === dataId);
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white">
          异常点列表
          <span className="ml-2 text-sm font-normal text-slate-400">
            ({filteredAnomalies.length}/{anomalies.length})
          </span>
        </h3>
        <div className="flex items-center gap-2 text-xs">
          <div className="flex items-center gap-1 text-warning-orange">
            <Clock className="w-3 h-3" />
            待处理 {anomalies.filter((a) => a.status === 'pending').length}
          </div>
          <div className="flex items-center gap-1 text-cyan-glow">
            <Eye className="w-3 h-3" />
            已复核 {anomalies.filter((a) => a.status === 'reviewed').length}
          </div>
          <div className="flex items-center gap-1 text-success-green">
            <CheckCircle className="w-3 h-3" />
            已解决 {anomalies.filter((a) => a.status === 'resolved').length}
          </div>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-auto space-y-2">
        {filteredAnomalies.length === 0 ? (
          <div className="h-full flex items-center justify-center text-slate-500 text-sm">
            暂无符合条件的异常点
          </div>
        ) : (
          filteredAnomalies.map((anomaly) => {
            const dataPoint = getAnomalyDataPoint(anomaly.dataId);
            const Icon = anomalyIcons[anomaly.type];
            const StatusIcon = statusIcons[anomaly.status];
            const isSelected = selectedAnomalyId === anomaly.id;

            return (
              <div
                key={anomaly.id}
                onClick={() => selectDataAndAnomaly(anomaly.dataId, anomaly.id)}
                className={`p-3 rounded-lg border cursor-pointer transition-all animate-fade-in ${
                  isSelected
                    ? 'bg-cyan-glow/10 border-cyan-glow/50 shadow-lg shadow-cyan-glow/10'
                    : 'bg-slate-800/40 border-slate-700/50 hover:bg-slate-800/60 hover:border-slate-600'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div
                    className="p-2 rounded-lg"
                    style={{ backgroundColor: `${anomalyTypeColors[anomaly.type]}20` }}
                  >
                    <Icon
                      className="w-4 h-4"
                      style={{ color: anomalyTypeColors[anomaly.type] }}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <div className="flex items-center gap-2">
                        <span
                          className="px-2 py-0.5 rounded text-xs font-medium"
                          style={{
                            backgroundColor: `${anomalyTypeColors[anomaly.type]}20`,
                            color: anomalyTypeColors[anomaly.type],
                          }}
                        >
                          {anomalyTypeLabels[anomaly.type]}
                        </span>
                        {anomaly.isSuspectedNoise && (
                          <span className="px-2 py-0.5 rounded text-xs font-medium bg-yellow-500/20 text-yellow-400">
                            疑似噪声
                          </span>
                        )}
                      </div>
                      <span
                        className={`flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${statusColors[anomaly.status]}`}
                      >
                        <StatusIcon className="w-3 h-3" />
                        {anomalyStatusLabels[anomaly.status]}
                      </span>
                    </div>
                    <p className="text-sm text-white mb-1 line-clamp-1">{anomaly.description}</p>
                    <div className="flex items-center justify-between text-xs text-slate-400">
                      <span>{dataPoint ? formatTimestamp(dataPoint.timestamp) : '-'}</span>
                      {dataPoint && (
                        <span>
                          波高 <span className="text-cyan-glow font-mono">{dataPoint.waveHeight.toFixed(2)}m</span>
                          {' · '}
                          误差 <span className="text-warning-orange font-mono">{dataPoint.errorValue.toFixed(3)}m</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
