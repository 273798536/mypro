import { AlertTriangle, ArrowRight, CheckCircle2, XCircle, Clock, Flame } from 'lucide-react';
import type { OperationalError } from '../../shared/types';
import { cn } from '../lib/utils';

interface ErrorAlertProps {
  error: OperationalError;
  onNavigate?: (path: string) => void;
  className?: string;
}

const codeTitles: Record<OperationalError['code'], string> = {
  MISSING_TEMPERATURE_CURVE: '温度曲线缺失',
  INVALID_INPUT: '输入数据无效',
  REAGENT_NOT_FOUND: '试剂未找到',
  DUPLICATE_CONCLUSION: '重复结论冲突',
};

export function ErrorAlert({ error, onNavigate, className }: ErrorAlertProps) {
  return (
    <div
      className={cn(
        'bg-status-anomaly/5 border-l-4 border-status-anomaly',
        'rounded p-5 shadow-card animate-expand-l shadow-[inset_4px_0_0_0_var(--tw-shadow-color)] shadow-status-anomaly',
        className
      )}
    >
      <div className="flex items-start gap-3">
        <div className="shrink-0 w-10 h-10 rounded bg-status-anomaly/10 flex items-center justify-center">
          <AlertTriangle className="w-5 h-5 text-status-anomaly" strokeWidth={1.8} />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-serif text-lg font-semibold text-slate-800 mb-1">
            {error.title || codeTitles[error.code]}
          </h3>
          <p className="text-sm text-slate-600 mb-3">
            {error.relatedResource?.batchNo && (
              <span className="font-mono text-accent-600 font-medium mr-2">
                批次 {error.relatedResource.batchNo}
              </span>
            )}
            处理中断，请按以下步骤操作：
          </p>
          <ol className="space-y-2 mb-4">
            {error.actionableSteps.map((step, idx) => (
              <li key={idx} className="flex gap-2 text-sm text-slate-700">
                <span className="shrink-0 w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center font-mono text-xs text-slate-500">
                  {idx + 1}
                </span>
                <span className="pt-0.5">{step}</span>
              </li>
            ))}
          </ol>
          {error.relatedResource?.navigationPath && onNavigate && (
            <button
              onClick={() => onNavigate(error.relatedResource!.navigationPath!)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-status-anomaly text-white text-sm font-medium rounded hover:bg-accent-600 transition-colors"
            >
              立即处理
              <ArrowRight className="w-4 h-4" strokeWidth={1.8} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export const StatusBadge = ({ status }: { status: 'pending' | 'passed' | 'rejected' | 'error' }) => {
  const map = {
    pending: { cls: 'bg-status-pending/10 text-status-pending border-status-pending/30', label: '待复核', icon: Clock },
    passed: { cls: 'bg-status-passed/10 text-status-passed border-status-passed/30', label: '已通过', icon: CheckCircle2 },
    rejected: { cls: 'bg-status-rejected/10 text-status-rejected border-status-rejected/30', label: '已驳回', icon: XCircle },
    error: { cls: 'bg-status-error/10 text-status-error border-status-error/30', label: '处理失败', icon: Flame },
  };
  const cfg = map[status];
  const Icon = cfg.icon;
  return (
    <span className={cn(
      'inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium border rounded',
      cfg.cls
    )}>
      <Icon className="w-3 h-3" strokeWidth={2} />
      {cfg.label}
    </span>
  );
};

export const BatchStatusBadge = ({ status }: { status: 'normal' | 'attention' | 'anomaly' }) => {
  const map = {
    normal: { cls: 'bg-status-normal/10 text-status-normal border-status-normal/30', label: '正常' },
    attention: { cls: 'bg-status-attention/10 text-status-attention border-status-attention/30', label: '关注' },
    anomaly: { cls: 'bg-status-anomaly/10 text-status-anomaly border-status-anomaly/30', label: '异常' },
  };
  const cfg = map[status];
  return (
    <span className={cn(
      'inline-flex items-center px-2 py-0.5 text-xs font-medium border rounded',
      cfg.cls
    )}>
      {cfg.label}
    </span>
  );
};
