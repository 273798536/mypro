import { Link } from 'react-router-dom';
import { Calendar, User, FlaskConical, ChevronRight, AlertTriangle, CheckCircle2, XCircle } from 'lucide-react';
import type { GCRecord } from '@/types';
import { StatusBadge } from '@/components/common/UIComponents';
import { formatDateTime, formatNumber } from '@/utils/format';
import { cn } from '@/lib/utils';

interface RecordCardProps {
  record: GCRecord;
  index?: number;
}

export function RecordCard({ record, index = 0 }: RecordCardProps) {
  const statusColor = {
    ready: 'bg-success-500',
    needs_review: 'bg-warning-500',
    invalid: 'bg-danger-500',
  }[record.status];

  const statusIcon = {
    ready: <CheckCircle2 className="w-3.5 h-3.5" />,
    needs_review: <AlertTriangle className="w-3.5 h-3.5" />,
    invalid: <XCircle className="w-3.5 h-3.5" />,
  }[record.status];

  const peakQuality = record.peaks.filter(p => p.dataQuality !== 'normal').length;
  const pct = record.calculationResult?.finalResult;

  return (
    <Link
      to={`/records/${record.id}`}
      className={cn(
        'card card-hover flex overflow-hidden opacity-0 animate-fade-in-up',
        `stagger-${Math.min(index + 1, 6)}`,
      )}
      style={{ animationFillMode: 'forwards' }}
    >
      <div className={cn('w-1.5 shrink-0', statusColor)} />
      <div className="flex-1 p-5 flex flex-col gap-3 min-w-0">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-mono text-sm font-semibold text-lab-700">{record.batchNumber}</span>
              <StatusBadge status={record.status} size="sm" />
            </div>
            <h3 className="font-serif text-base font-medium text-lab-900 truncate">{record.sampleName}</h3>
          </div>
          <ChevronRight className="w-5 h-5 text-zinc-400 shrink-0 mt-1" />
        </div>

        {pct !== undefined && (
          <div className="flex items-baseline gap-2">
            <span className="font-serif text-2xl font-semibold text-lab-800">{formatNumber(pct)}</span>
            <span className="text-sm text-zinc-500">% 主含量</span>
            {record.calculationResult && (
              <span className={cn(
                'ml-auto text-xs',
                Math.abs(record.calculationResult.totalPercentage - 100) < 1 ? 'text-success-600' : 'text-warning-600',
              )}>
                配平 {formatNumber(record.calculationResult.totalPercentage)}%
              </span>
            )}
          </div>
        )}

        {peakQuality > 0 && (
          <div className="flex items-center gap-1.5 text-xs text-warning-700 bg-warning-50 px-2 py-1 rounded-md w-fit">
            <AlertTriangle className="w-3 h-3" />
            <span>检测到 {peakQuality} 处数据质量问题</span>
          </div>
        )}

        <div className="flex items-center gap-4 pt-2 mt-auto text-xs text-zinc-500 border-t border-lab-50">
          <span className="flex items-center gap-1">
            <FlaskConical className="w-3.5 h-3.5" />
            {record.peaks.length} 个峰
          </span>
          <span className="flex items-center gap-1">
            <User className="w-3.5 h-3.5" />
            {record.operator}
          </span>
          <span className="flex items-center gap-1 ml-auto">
            <Calendar className="w-3.5 h-3.5" />
            {formatDateTime(record.updatedAt)}
          </span>
        </div>
      </div>
    </Link>
  );
}

export default RecordCard;
