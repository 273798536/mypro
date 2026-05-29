import { useState } from 'react';
import {
  Tag,
  AlertTriangle,
  TrendingDown,
  XCircle,
  Bug,
  AlertCircle,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { AnomalyItem, ANOMALY_TYPE_LABELS } from '@/types';
import { getSeverityColor, getSeverityBgColor } from '@/utils/anomalyDetection';

interface AnomalyItemCardProps {
  anomaly: AnomalyItem;
}

const getAnomalyIcon = (type: string) => {
  switch (type) {
    case 'promotion': return Tag;
    case 'low_sample': return AlertTriangle;
    case 'under_coverage': return TrendingDown;
    case 'bad_forecast': return XCircle;
    case 'logic_error': return Bug;
    default: return AlertCircle;
  }
};

export default function AnomalyItemCard({ anomaly }: AnomalyItemCardProps) {
  const [expanded, setExpanded] = useState(false);
  const Icon = getAnomalyIcon(anomaly.type);
  const typeLabel = ANOMALY_TYPE_LABELS[anomaly.type];
  const severityColor = getSeverityColor(anomaly.severity);
  const severityBgColor = getSeverityBgColor(anomaly.severity);

  const row = anomaly.rowData;
  const hasRowData = row.rowNumber > 0;

  return (
    <div
      className={`
        bg-white rounded-lg border border-neutral-200 overflow-hidden
        transition-all duration-200 hover:shadow-md
        ${anomaly.severity === 'high' ? 'border-l-4 border-l-red-500' : ''}
        ${anomaly.severity === 'medium' ? 'border-l-4 border-l-yellow-400' : ''}
      `}
    >
      <div
        className="p-3 cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-start gap-3">
          <div className={`w-8 h-8 rounded-lg ${severityBgColor} flex items-center justify-center flex-shrink-0`}>
            <Icon className={severityColor} size={16} />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className={`px-2 py-0.5 rounded text-xs font-medium ${severityBgColor} ${severityColor}`}>
                {typeLabel}
              </span>
              <span className="text-xs text-neutral-400">
                {anomaly.severity === 'high' ? '严重' : anomaly.severity === 'medium' ? '中等' : '轻微'}
              </span>
              {hasRowData && (
                <span className="text-xs text-neutral-400 ml-auto">
                  第 {row.rowNumber} 行
                </span>
              )}
            </div>
            <p className="text-sm text-neutral-700 line-clamp-2">
              {anomaly.description}
            </p>
            <p className="text-xs text-neutral-400 mt-1">
              品类: {anomaly.category || '未分类'}
            </p>
          </div>

          <button className="text-neutral-400 hover:text-neutral-600 p-1">
            {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        </div>
      </div>

      {expanded && hasRowData && (
        <div className="px-3 pb-3 pt-0 border-t border-neutral-100 bg-neutral-50">
          <div className="pt-3 grid grid-cols-2 gap-2 text-xs">
            <div>
              <span className="text-neutral-400">预测值:</span>
              <span className="ml-2 font-medium text-neutral-700">{row.forecast ?? '空'}</span>
            </div>
            <div>
              <span className="text-neutral-400">真实销量:</span>
              <span className="ml-2 font-medium text-neutral-700">{row.actual ?? '空'}</span>
            </div>
            <div>
              <span className="text-neutral-400">预测下限:</span>
              <span className="ml-2 font-medium text-neutral-700">{row.lowerBound ?? '空'}</span>
            </div>
            <div>
              <span className="text-neutral-400">预测上限:</span>
              <span className="ml-2 font-medium text-neutral-700">{row.upperBound ?? '空'}</span>
            </div>
            {row.date && (
              <div className="col-span-2">
                <span className="text-neutral-400">日期:</span>
                <span className="ml-2 font-medium text-neutral-700">{row.date}</span>
              </div>
            )}
            {row.remark && (
              <div className="col-span-2">
                <span className="text-neutral-400">备注:</span>
                <span className="ml-2 font-medium text-neutral-700">{row.remark}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
