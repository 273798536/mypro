import type { ActionableErrorResp } from '../types';

interface Props {
  error: ActionableErrorResp;
  title?: string;
  onRetry?: () => void;
}

export default function ActionableError({ error, title = '请求处理失败', onRetry }: Props) {
  return (
    <div className="rounded-xl border border-status-rerun/40 bg-status-rerun/5 p-5 space-y-3 fade-in-up">
      <div className="flex items-start gap-3">
        <div className="text-2xl leading-none">🛠️</div>
        <div className="flex-1">
          <div className="font-semibold text-status-rerun">{title}</div>
          <div className="mt-1 text-sm text-text-primary">
            <span className="font-mono text-[11px] px-1.5 py-0.5 rounded bg-bg-tertiary text-status-rerun mr-2">
              {error.error_code}
            </span>
            {error.message}
          </div>
        </div>
        {onRetry && (
          <button
            onClick={onRetry}
            className="px-3 py-1.5 rounded border border-border hover:border-accent hover:text-accent text-xs transition-colors"
          >
            ⟳ 重试
          </button>
        )}
      </div>
      {error.action && (
        <div className="ml-9 rounded-lg border border-border bg-bg-tertiary p-3">
          <div className="text-[11px] uppercase tracking-wider text-status-review mb-1.5 flex items-center gap-1">
            <span>💡</span> 修复建议（可操作步骤）
          </div>
          <div className="text-sm whitespace-pre-wrap text-text-primary font-mono leading-6 break-all">
            {error.action}
          </div>
        </div>
      )}
      <div className="ml-9 text-[10px] text-text-secondary font-mono">
        request_id: {error.request_id}
      </div>
    </div>
  );
}
