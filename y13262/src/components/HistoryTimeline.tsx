import { useState } from 'react';
import {
  Check,
  X,
  PenLine,
  GitMerge,
  Undo2,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import type { ConfirmationAction, ConfirmationLog } from '../../shared/types';

const actionConfig: Record<ConfirmationAction, { label: string; icon: typeof Check; color: string }> = {
  confirm: { label: '确认归并', icon: Check, color: 'var(--color-success)' },
  unconfirm: { label: '取消确认', icon: X, color: 'var(--color-danger)' },
  edit_note: { label: '编辑备注', icon: PenLine, color: 'var(--color-accent)' },
  merge: { label: '创建归并', icon: GitMerge, color: 'var(--color-primary)' },
  unmerge: { label: '取消归并', icon: Undo2, color: 'var(--color-danger)' },
};

interface HistoryTimelineProps {
  logs: ConfirmationLog[];
}

export default function HistoryTimeline({ logs }: HistoryTimelineProps) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const toggle = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  if (logs.length === 0) {
    return (
      <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
        暂无历史记录
      </p>
    );
  }

  return (
    <div className="relative">
      {logs.map((log, idx) => {
        const config = actionConfig[log.action];
        const Icon = config.icon;
        const isExpanded = expanded.has(log.id);
        const isLast = idx === logs.length - 1;

        return (
          <div key={log.id} className="flex gap-4">
            <div className="flex flex-col items-center">
              <div
                className="flex h-8 w-8 items-center justify-center rounded-full border-2 bg-white"
                style={{ borderColor: config.color }}
              >
                <Icon size={14} style={{ color: config.color }} />
              </div>
              {!isLast && (
                <div className="w-0.5 flex-1 min-h-[24px]" style={{ backgroundColor: 'var(--color-border)' }} />
              )}
            </div>

            <div className="flex-1 pb-6">
              <div
                className="cursor-pointer rounded-lg border p-3 transition-colors hover:bg-white/50"
                style={{ borderColor: 'var(--color-border)' }}
                onClick={() => toggle(log.id)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium" style={{ color: config.color }}>
                      {config.label}
                    </span>
                    <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                      {log.operator}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                      {new Date(log.operated_at).toLocaleString('zh-CN')}
                    </span>
                    {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  </div>
                </div>

                {isExpanded && (
                  <div className="mt-3 space-y-2 border-t pt-3" style={{ borderColor: 'var(--color-border)' }}>
                    {log.action === 'confirm' && (
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-xs font-medium mb-1" style={{ color: 'var(--color-danger)' }}>
                            变更前
                          </p>
                          <pre className="text-xs whitespace-pre-wrap rounded p-2" style={{ backgroundColor: 'var(--color-bg)' }}>
                            {JSON.stringify(log.before_snapshot, null, 2)}
                          </pre>
                        </div>
                        <div>
                          <p className="text-xs font-medium mb-1" style={{ color: 'var(--color-success)' }}>
                            变更后
                          </p>
                          <pre className="text-xs whitespace-pre-wrap rounded p-2" style={{ backgroundColor: 'var(--color-bg)' }}>
                            {JSON.stringify(log.after_snapshot, null, 2)}
                          </pre>
                        </div>
                      </div>
                    )}
                    {(log.action === 'edit_note') && (
                      <div className="space-y-1">
                        <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                          旧值: <span className="font-mono">{String(log.before_snapshot.note || '')}</span>
                        </p>
                        <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                          新值: <span className="font-mono">{String(log.after_snapshot.note || '')}</span>
                        </p>
                      </div>
                    )}
                    <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                      {log.merge_group_id ? `归并组: ${log.merge_group_id}` : log.complaint_id ? `投诉: ${log.complaint_id}` : '全局操作'}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
