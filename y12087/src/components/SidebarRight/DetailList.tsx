import { useCallback, useMemo } from 'react';
import {
  Zap,
  ArrowLeftRight,
  AlertTriangle,
  CheckCircle,
  Clock,
  MapPin,
  Palette,
  Eye,
} from 'lucide-react';
import type { AnomalyRecord, Streamline, AnomalyType } from '@/types';
import { useDetectionStore } from '@/store/detectionStore';
import { useUIStore } from '@/store/uiStore';
import { useVectorFieldStore } from '@/store/vectorFieldStore';
import { useFilteredStreamlines } from '@/hooks/useStreamline';
import { ANOMALY_LABELS, STATUS_COLORS } from '@/utils/color';
import { clsx } from '@/lib/utils';

const ANOMALY_ICONS: Record<AnomalyType, React.ElementType> = {
  explosion: Zap,
  direction_flip: ArrowLeftRight,
  out_of_bounds: AlertTriangle,
};

interface AnomalyItemProps {
  anomaly: AnomalyRecord;
  streamline: Streamline;
  isSelected: boolean;
  isAffected: boolean;
  onClick: () => void;
}

function AnomalyItem({
  anomaly,
  streamline,
  isSelected,
  isAffected,
  onClick,
}: AnomalyItemProps) {
  const Icon = ANOMALY_ICONS[anomaly.type];
  const color = STATUS_COLORS[anomaly.type];

  return (
    <div
      onClick={onClick}
      className={clsx(
        'p-3 rounded-lg cursor-pointer transition-all duration-200 border',
        isSelected
          ? 'bg-slate-700/50 border-blue-500 shadow-lg shadow-blue-500/10'
          : 'bg-slate-800/30 border-slate-700 hover:bg-slate-700/30 hover:border-slate-600',
        isAffected && 'ring-2 ring-cyan-500/50'
      )}
    >
      <div className="flex items-start gap-2">
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: `${color}20` }}
        >
          <Icon size={16} style={{ color }} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span
              className="text-xs font-medium px-2 py-0.5 rounded"
              style={{ backgroundColor: `${color}20`, color }}
            >
              {ANOMALY_LABELS[anomaly.type]}
            </span>
            {isAffected && (
              <span className="text-[10px] text-cyan-400 flex items-center gap-1">
                <Palette size={10} />
                颜色标尺影响
              </span>
            )}
          </div>
          <p className="text-xs text-slate-300 line-clamp-2 mb-2">
            {anomaly.description}
          </p>
          <div className="flex items-center gap-3 text-[10px] text-slate-500 font-mono">
            <span className="flex items-center gap-1">
              <MapPin size={10} />
              ({anomaly.position.map((v) => v.toFixed(2)).join(', ')})
            </span>
            <span className="flex items-center gap-1">
              <Clock size={10} />
              第 {anomaly.pointIndex} 点
            </span>
          </div>
          <div className="mt-2 flex items-center gap-2">
            <div className="flex-1 h-1 bg-slate-700 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${Math.min(100, (anomaly.value / anomaly.threshold) * 100)}%`,
                  backgroundColor: color,
                }}
              />
            </div>
            <span className="text-[10px] text-slate-400 font-mono">
              {anomaly.value.toFixed(2)} / {anomaly.threshold}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

interface NormalItemProps {
  streamline: Streamline;
  isAffected: boolean;
  onClick: () => void;
}

function NormalItem({ streamline, isAffected, onClick }: NormalItemProps) {
  const avgSpeed =
    streamline.points.reduce((sum, p) => sum + p.speed, 0) /
    streamline.points.length;

  return (
    <div
      onClick={onClick}
      className={clsx(
        'p-3 rounded-lg cursor-pointer transition-all duration-200 border',
        'bg-slate-800/30 border-slate-700 hover:bg-slate-700/30 hover:border-slate-600',
        isAffected && 'ring-2 ring-cyan-500/50'
      )}
    >
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 bg-emerald-500/20">
          <CheckCircle size={16} className="text-emerald-400" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-emerald-400">正常</span>
            {isAffected && (
              <span className="text-[10px] text-cyan-400 flex items-center gap-1">
                <Palette size={10} />
                颜色标尺影响
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 text-[10px] text-slate-500 font-mono mt-1">
            <span>点数: {streamline.points.length}</span>
            <span>均速: {avgSpeed.toFixed(3)}</span>
          </div>
        </div>
        <Eye size={14} className="text-slate-500" />
      </div>
    </div>
  );
}

export function DetailList() {
  const currentResult = useDetectionStore((s) => s.currentResult);
  const selectedAnomalyId = useUIStore((s) => s.selectedAnomalyId);
  const selectedStreamlineId = useUIStore((s) => s.selectedStreamlineId);
  const setSelectedAnomalyId = useUIStore((s) => s.setSelectedAnomalyId);
  const setSelectedStreamlineId = useUIStore((s) => s.setSelectedStreamlineId);
  const filterConditions = useVectorFieldStore((s) => s.filterConditions);
  const colorScale = useVectorFieldStore((s) => s.colorScale);

  const filteredStreamlines = useFilteredStreamlines(
    currentResult?.streamlines || [],
    filterConditions
  );

  const { anomalies, normalStreamlines } = useMemo(() => {
    const anomalies: AnomalyRecord[] = [];
    const normal: Streamline[] = [];

    filteredStreamlines.forEach((s) => {
      if (s.anomalies.length > 0) {
        anomalies.push(...s.anomalies);
      } else {
        normal.push(s);
      }
    });

    return { anomalies, normalStreamlines: normal };
  }, [filteredStreamlines]);

  const handleAnomalyClick = useCallback(
    (anomaly: AnomalyRecord) => {
      setSelectedAnomalyId(anomaly.id);
      setSelectedStreamlineId(anomaly.streamlineId);
    },
    [setSelectedAnomalyId, setSelectedStreamlineId]
  );

  const handleNormalClick = useCallback(
    (streamline: Streamline) => {
      setSelectedStreamlineId(streamline.id);
      setSelectedAnomalyId(null);
    },
    [setSelectedStreamlineId, setSelectedAnomalyId]
  );

  if (!currentResult) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="w-16 h-16 rounded-full bg-slate-800/50 flex items-center justify-center mb-4">
          <Zap size={32} className="text-slate-600" />
        </div>
        <h3 className="text-sm font-medium text-slate-400 mb-1">
          暂无检测结果
        </h3>
        <p className="text-xs text-slate-500">
          请点击"运行检测"按钮开始分析
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
          检测明细
        </h3>
        <span className="text-xs text-slate-500">
          共 {anomalies.length + normalStreamlines.length} 条
        </span>
      </div>

      {anomalies.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-[11px] font-medium text-red-400 flex items-center gap-1">
            <AlertTriangle size={12} />
            异常记录 ({anomalies.length})
          </h4>
          <div className="space-y-2 max-h-[40vh] overflow-y-auto pr-1">
            {anomalies.map((anomaly) => {
              const streamline = currentResult.streamlines.find(
                (s) => s.id === anomaly.streamlineId
              );
              if (!streamline) return null;
              return (
                <AnomalyItem
                  key={anomaly.id}
                  anomaly={anomaly}
                  streamline={streamline}
                  isSelected={selectedAnomalyId === anomaly.id}
                  isAffected={!!colorScale && streamline.colorAffected === true}
                  onClick={() => handleAnomalyClick(anomaly)}
                />
              );
            })}
          </div>
        </div>
      )}

      {normalStreamlines.length > 0 &&
        !filterConditions.showOnlyAnomalies && (
          <div className="space-y-2">
            <h4 className="text-[11px] font-medium text-emerald-400 flex items-center gap-1">
              <CheckCircle size={12} />
              正常流线 ({normalStreamlines.length})
            </h4>
            <div className="space-y-2 max-h-[30vh] overflow-y-auto pr-1">
              {normalStreamlines.map((streamline) => (
                <NormalItem
                  key={streamline.id}
                  streamline={streamline}
                  isAffected={!!colorScale && streamline.colorAffected === true}
                  onClick={() => handleNormalClick(streamline)}
                />
              ))}
            </div>
          </div>
        )}
    </div>
  );
}
