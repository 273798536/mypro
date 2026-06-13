import { Archive, CheckCircle, MessageSquare } from 'lucide-react';
import type { RecordType } from '@/types';
import { recordTypeLabels, recordTypeTextColors, recordTypeBgColors } from '@/utils/format';

interface AttributionCardProps {
  type: RecordType;
  count: number;
  percentage: number;
  weight: number;
}

const iconMap: Record<RecordType, typeof Archive> = {
  old_note: Archive,
  normal: CheckCircle,
  verbal: MessageSquare,
};

export default function AttributionCard({
  type,
  count,
  percentage,
  weight,
}: AttributionCardProps) {
  const Icon = iconMap[type];

  return (
    <div
      className={`p-4 rounded-lg border ${recordTypeBgColors[type]} transition-transform hover:scale-[1.02] hover:shadow-lg`}
    >
      <div className="flex items-start justify-between mb-3">
        <div className={`p-2 rounded-lg bg-slate-900/50 ${recordTypeTextColors[type]}`}>
          <Icon size={20} />
        </div>
        <span className={`text-2xl font-bold font-mono ${recordTypeTextColors[type]}`}>
          {percentage}%
        </span>
      </div>

      <div className="text-slate-200 font-medium mb-1">
        {recordTypeLabels[type]}
      </div>

      <div className="flex items-center gap-4 text-xs text-slate-400">
        <span>{count} 条记录</span>
        <span>权重 {weight}</span>
      </div>

      <div className="mt-3 h-1.5 bg-slate-800 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${percentage}%`,
            background: type === 'old_note'
              ? '#f59e0b'
              : type === 'normal'
              ? '#10b981'
              : '#0ea5e9',
          }}
        />
      </div>
    </div>
  );
}
