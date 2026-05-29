import React, { useMemo } from 'react';
import { Clock, ArrowRight, Settings, Edit3 } from 'lucide-react';
import { useFittingStore, type CorrectionTrace } from '@/store/fittingStore';
import { cn } from '@/lib/utils';

interface TimelineItemProps {
  trace: CorrectionTrace;
  isLast: boolean;
}

function TimelineItem({ trace, isLast }: TimelineItemProps) {
  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const getFieldLabel = (field: string): string => {
    const labels: Record<string, string> = {
      'samplingIntervalMs': '采样间隔',
      'initialParams.R0': '初始R0',
      'initialParams.R1': '初始R1',
      'initialParams.C1': '初始C1',
      'initialParams.ocv': '初始OCV',
      'initialParams.tau1': '初始τ1',
    };
    return labels[field] || field;
  };

  const getFieldUnit = (field: string): string => {
    if (field === 'samplingIntervalMs') return 'ms';
    if (field.includes('R0') || field.includes('R1')) return 'Ω';
    if (field.includes('C1')) return 'F';
    if (field.includes('ocv')) return 'V';
    if (field.includes('tau1')) return 's';
    return '';
  };

  const formatValue = (value: string, field: string): string => {
    const num = parseFloat(value);
    const unit = getFieldUnit(field);
    if (isNaN(num)) return value;
    if (Math.abs(num) >= 1e-3 && Math.abs(num) < 1e3) {
      return `${num.toFixed(6)}${unit}`;
    }
    return `${num.toExponential(4)}${unit}`;
  };

  return (
    <div className="relative pl-6 pb-4">
      {!isLast && (
        <div className="absolute left-2.5 top-4 bottom-0 w-px bg-[#2a2a4e]" />
      )}
      <div className="absolute left-0 top-1.5 w-5 h-5 rounded-full bg-[#16162a] border-2 border-[#00d4ff] flex items-center justify-center">
        <Edit3 size={10} className="text-[#00d4ff]" />
      </div>
      
      <div className="bg-[#0f0f1e] border border-[#2a2a4e] rounded-lg p-3 hover:border-[#3a3a5e] transition-colors">
        <div className="flex items-center gap-2 mb-2">
          <Settings size={12} className="text-[#ff8c00]" />
          <span className="text-sm font-medium text-[#ff8c00]">
            {getFieldLabel(trace.field)}
          </span>
          <span className="text-xs text-gray-500 ml-auto flex items-center gap-1">
            <Clock size={10} />
            {formatTime(trace.timestamp)}
          </span>
        </div>
        
        <div className="flex items-center gap-2 mb-2">
          <span className="text-sm font-mono text-gray-400">
            {formatValue(trace.beforeValue, trace.field)}
          </span>
          <ArrowRight size={14} className="text-[#00d4ff]" />
          <span className="text-sm font-mono text-[#00d4ff]">
            {formatValue(trace.afterValue, trace.field)}
          </span>
        </div>
        
        <div className="text-xs text-gray-500 bg-[#16162a] rounded px-2 py-1">
          {trace.reason}
        </div>
      </div>
    </div>
  );
}

interface CorrectionTimelineProps {
  corrections?: CorrectionTrace[];
  maxItems?: number;
}

export default function CorrectionTimeline({ corrections: propCorrections, maxItems }: CorrectionTimelineProps = {}) {
  const storeCorrections = useFittingStore(state => state.corrections);
  const corrections = propCorrections || storeCorrections;

  const sortedCorrections = useMemo(() => {
    const sorted = [...corrections].sort((a, b) => b.timestamp - a.timestamp);
    return maxItems ? sorted.slice(0, maxItems) : sorted;
  }, [corrections, maxItems]);

  if (sortedCorrections.length === 0) {
    return (
      <div className="bg-[#16162a] border border-[#2a2a4e] rounded-lg p-4">
        <h3 className="text-sm font-medium text-gray-400 mb-2 flex items-center gap-2">
          <Clock size={14} />
          修正痕迹
        </h3>
        <div className="text-center py-4 text-gray-500 text-sm">
          暂无修正记录
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#16162a] border border-[#2a2a4e] rounded-lg p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-gray-300 flex items-center gap-2">
          <Clock size={14} className="text-[#00d4ff]" />
          修正痕迹
        </h3>
        <span className="text-xs text-gray-500">
          共 {corrections.length} 条记录
        </span>
      </div>
      
      <div className={cn(
        'space-y-1',
        !maxItems && corrections.length > 5 && 'max-h-80 overflow-y-auto pr-2'
      )}>
        {sortedCorrections.map((trace, index) => (
          <TimelineItem
            key={trace.id}
            trace={trace}
            isLast={index === sortedCorrections.length - 1}
          />
        ))}
      </div>
      
      {maxItems && corrections.length > maxItems && (
        <div className="text-center pt-2 text-xs text-gray-500">
          另有 {corrections.length - maxItems} 条记录
        </div>
      )}
    </div>
  );
}
