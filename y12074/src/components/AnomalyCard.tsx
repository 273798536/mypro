import { AlertTriangle, Gauge, Package, Check, Clock } from 'lucide-react';
import type { AnomalyEvent, AnomalyType } from '@/types';
import {
  getAnomalyTypeLabel,
  getAnomalyTypeColor,
  getSeverityLabel,
  getSeverityColor,
} from '@/utils/anomalyDetector';
import { formatTime } from '@/utils/reportGenerator';
import { cn } from '@/lib/utils';

interface AnomalyCardProps {
  anomaly: AnomalyEvent;
  isSelected: boolean;
  onSelect: () => void;
  onReview: (reviewed: boolean) => void;
}

const getTypeIcon = (type: AnomalyType) => {
  switch (type) {
    case 'height_mismatch':
      return <Package size={18} />;
    case 'speed_over':
      return <Gauge size={18} />;
    case 'stacked':
      return <AlertTriangle size={18} />;
    default:
      return <AlertTriangle size={18} />;
  }
};

export function AnomalyCard({ anomaly, isSelected, onSelect, onReview }: AnomalyCardProps) {
  const typeColor = getAnomalyTypeColor(anomaly.type);
  const severityColor = getSeverityColor(anomaly.severity);

  const deviation = anomaly.actualValue > anomaly.expectedValue
    ? `+${((anomaly.actualValue / anomaly.expectedValue - 1) * 100).toFixed(0)}%`
    : `-${((anomaly.expectedValue / anomaly.actualValue - 1) * 100).toFixed(0)}%`;

  return (
    <div
      className={cn(
        'bg-gray-800/80 rounded-lg border transition-all duration-200 cursor-pointer hover:bg-gray-800',
        isSelected ? 'border-blue-500 ring-2 ring-blue-500/30' : 'border-gray-700 hover:border-gray-600',
        !anomaly.reviewed && 'border-l-4'
      )}
      style={!anomaly.reviewed ? { borderLeftColor: typeColor } : {}}
      onClick={onSelect}
    >
      <div className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <div
              className="p-2 rounded-lg"
              style={{ backgroundColor: `${typeColor}20`, color: typeColor }}
            >
              {getTypeIcon(anomaly.type)}
            </div>
            <div>
              <h4 className="font-semibold text-white text-sm">
                {getAnomalyTypeLabel(anomaly.type)}
              </h4>
              <div className="flex items-center gap-2 mt-0.5">
                <span
                  className="text-xs px-2 py-0.5 rounded-full"
                  style={{ backgroundColor: `${severityColor}20`, color: severityColor }}
                >
                  {getSeverityLabel(anomaly.severity)}
                </span>
                <span className="text-gray-500 text-xs">
                  位置: {anomaly.position.toFixed(2)}m
                </span>
              </div>
            </div>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onReview(!anomaly.reviewed);
            }}
            className={cn(
              'p-1.5 rounded transition-colors',
              anomaly.reviewed
                ? 'bg-green-500/20 text-green-400'
                : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
            )}
            title={anomaly.reviewed ? '取消复核' : '标记已复核'}
          >
            {anomaly.reviewed ? <Check size={14} /> : <Clock size={14} />}
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2 mb-3">
          <div className="bg-gray-900/50 rounded p-2">
            <div className="text-gray-500 text-xs mb-1">标准值</div>
            <div className="text-white font-mono text-sm">
              {anomaly.expectedValue}
              {anomaly.type === 'height_mismatch' ? 'm' : anomaly.type === 'speed_over' ? 'm/s' : 'm/s'}
            </div>
          </div>
          <div className="bg-gray-900/50 rounded p-2">
            <div className="text-gray-500 text-xs mb-1">实际值</div>
            <div className="font-mono text-sm" style={{ color: typeColor }}>
              {anomaly.actualValue}
              {anomaly.type === 'height_mismatch' ? 'm' : anomaly.type === 'speed_over' ? 'm/s' : 'm/s'}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between text-xs">
          <span className="text-gray-400">偏差: <span style={{ color: typeColor }}>{deviation}</span></span>
          <span className="text-gray-500">{anomaly.luggageIds.length}件行李</span>
        </div>

        <p className="text-gray-400 text-xs mt-3 line-clamp-2">{anomaly.description}</p>

        <div className="mt-3 pt-3 border-t border-gray-700 flex items-center justify-between">
          <span className="text-gray-500 text-xs">{formatTime(anomaly.timestamp)}</span>
          <span className={cn('text-xs', anomaly.reviewed ? 'text-green-400' : 'text-yellow-400')}>
            {anomaly.reviewed ? '✓ 已复核' : '⚠ 待复核'}
          </span>
        </div>
      </div>
    </div>
  );
}
