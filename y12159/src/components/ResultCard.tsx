import type { JudgmentResult, ResultStatus } from '@/types';
import { AlertTriangle, CheckCircle, XCircle, HelpCircle, ChevronRight } from 'lucide-react';
import StatusBadge from './StatusBadge';
import { cn } from '@/lib/utils';

interface ResultCardProps {
  result: JudgmentResult;
  onClick?: () => void;
  selected?: boolean;
  highlightChanges?: boolean;
}

const statusIcon: Record<ResultStatus, typeof CheckCircle> = {
  PASS: CheckCircle,
  WARNING: AlertTriangle,
  FAIL: XCircle,
  MISSING: HelpCircle,
};

const statusBg: Record<ResultStatus, string> = {
  PASS: 'bg-success/5 border-success/20',
  WARNING: 'bg-warning/5 border-warning/20',
  FAIL: 'bg-danger/5 border-danger/20',
  MISSING: 'bg-industrial-muted/5 border-industrial-muted/20',
};

const statusTextColor: Record<ResultStatus, string> = {
  PASS: 'text-success',
  WARNING: 'text-warning',
  FAIL: 'text-danger',
  MISSING: 'text-industrial-muted',
};

export default function ResultCard({ result, onClick, selected, highlightChanges }: ResultCardProps) {
  const Icon = statusIcon[result.status];

  return (
    <div
      onClick={onClick}
      className={cn(
        'industrial-card p-4 cursor-pointer transition-all duration-150 hover:shadow-xl',
        selected && 'ring-2 ring-primary',
        highlightChanges && result.status !== 'PASS' && 'animate-highlight'
      )}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className={cn('p-2 rounded-sm', statusBg[result.status])}>
            <Icon size={20} className={statusTextColor[result.status]} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-mono font-semibold">{result.sectionId}</h3>
              <StatusBadge status={result.status} />
            </div>
            <p className="text-xs text-industrial-muted">车厢: {result.carNumber}</p>
          </div>
        </div>
        <ChevronRight size={16} className="text-industrial-muted" />
      </div>

      <div className="space-y-2">
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-mono font-bold">
            {isNaN(result.gapValue) ? '--' : result.gapValue.toFixed(3)}
          </span>
          <span className="text-sm text-industrial-muted">{result.unit}</span>
        </div>

        <div className="text-xs text-industrial-muted space-y-1">
          <p className="truncate" title={result.applicableScope}>
            {result.applicableScope}
          </p>
          <p>
            阈值版本: <span className="font-mono">{result.thresholdVersion}</span>
          </p>
        </div>

        {result.failureReason && (
          <div className="mt-2 p-2 bg-danger/5 border border-danger/20 rounded-sm">
            <p className="text-xs text-danger">{result.failureReason}</p>
          </div>
        )}

        {result.anomalies.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {result.anomalies.slice(0, 3).map((anomaly, idx) => (
              <span
                key={idx}
                className={cn(
                  'px-1.5 py-0.5 text-xs rounded-sm',
                  anomaly.severity === 'HIGH'
                    ? 'bg-danger/10 text-danger border border-danger/20'
                    : anomaly.severity === 'MEDIUM'
                    ? 'bg-warning/10 text-warning border border-warning/20'
                    : 'bg-primary/10 text-primary border border-primary/20'
                )}
              >
                {anomaly.type}
              </span>
            ))}
            {result.anomalies.length > 3 && (
              <span className="px-1.5 py-0.5 text-xs text-industrial-muted">
                +{result.anomalies.length - 3}
              </span>
            )}
          </div>
        )}

        <div className="flex items-center justify-between text-xs text-industrial-muted pt-2 border-t border-industrial-border/10">
          <span>{result.hasSpeedData ? '含速度数据' : '无速度数据'}</span>
          <span>{new Date(result.createdAt).toLocaleString()}</span>
        </div>
      </div>
    </div>
  );
}
