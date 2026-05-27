import { AlertTriangle, AlertCircle, Info, CheckCircle2, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { SplitException } from '@/types';

interface ExceptionAlertProps {
  exceptions: SplitException[];
  onResolve?: (id: string) => void;
  onDismiss?: (id: string) => void;
}

const exceptionTypeLabels: Record<SplitException['type'], string> = {
  multi_invoice: '一款多票',
  fee_deduct_inner: '手续费内扣',
  invoice_dispute: '发票争议',
  amount_mismatch: '金额不匹配',
};

const exceptionLevelConfig = {
  error: {
    bg: 'bg-red-50',
    border: 'border-red-200',
    text: 'text-red-800',
    icon: 'text-red-500',
    badge: 'bg-red-100 text-red-700',
  },
  warning: {
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    text: 'text-amber-800',
    icon: 'text-amber-500',
    badge: 'bg-amber-100 text-amber-700',
  },
  info: {
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    text: 'text-blue-800',
    icon: 'text-blue-500',
    badge: 'bg-blue-100 text-blue-700',
  },
};

const LevelIcon = ({ level }: { level: SplitException['level'] }) => {
  const iconClass = cn('h-5 w-5', exceptionLevelConfig[level].icon);
  if (level === 'error') return <AlertCircle className={iconClass} />;
  if (level === 'warning') return <AlertTriangle className={iconClass} />;
  return <Info className={iconClass} />;
};

export default function ExceptionAlert({
  exceptions,
  onResolve,
  onDismiss,
}: ExceptionAlertProps) {
  const unresolvedExceptions = exceptions.filter((e) => !e.resolved);

  if (unresolvedExceptions.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-slate-800 flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-amber-500" />
          异常提示 ({unresolvedExceptions.length})
        </h3>
      </div>

      <div className="space-y-2">
        {unresolvedExceptions.map((exception) => {
          const config = exceptionLevelConfig[exception.level];
          return (
            <div
              key={exception.id}
              className={cn(
                'p-4 rounded-lg border transition-all',
                config.bg,
                config.border
              )}
            >
              <div className="flex items-start gap-3">
                <LevelIcon level={exception.level} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className={cn(
                        'px-2 py-0.5 text-xs font-medium rounded-full',
                        config.badge
                      )}
                    >
                      {exceptionTypeLabels[exception.type]}
                    </span>
                  </div>
                  <p className={cn('text-sm', config.text)}>
                    {exception.message}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  {onResolve && (
                    <button
                      onClick={() => onResolve(exception.id)}
                      className="p-1.5 rounded hover:bg-white/50 transition-colors"
                      title="标记已解决"
                    >
                      <CheckCircle2 className="h-4 w-4 text-slate-500" />
                    </button>
                  )}
                  {onDismiss && (
                    <button
                      onClick={() => onDismiss(exception.id)}
                      className="p-1.5 rounded hover:bg-white/50 transition-colors"
                      title="忽略"
                    >
                      <X className="h-4 w-4 text-slate-500" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
