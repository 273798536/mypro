import { GitCommitHorizontal, MessageSquarePlus, Plus } from 'lucide-react';
import type { HistoryEntry } from '../../shared/types';

const ACTION_CONFIG: Record<string, { icon: typeof GitCommitHorizontal; label: string; color: string }> = {
  conclusion_change: { icon: GitCommitHorizontal, label: '改判', color: 'text-[var(--color-accent)]' },
  note_update: { icon: MessageSquarePlus, label: '备注更新', color: 'text-[var(--color-info)]' },
  create: { icon: Plus, label: '创建', color: 'text-[var(--color-success)]' },
};

interface HistoryListProps {
  entries: HistoryEntry[];
}

export default function HistoryList({ entries }: HistoryListProps) {
  if (entries.length === 0) {
    return <div className="text-sm text-[var(--color-text-muted)] text-center py-8">暂无历史记录</div>;
  }

  return (
    <div className="space-y-2">
      {entries.map((entry) => {
        const config = ACTION_CONFIG[entry.action] || ACTION_CONFIG.create;
        const Icon = config.icon;
        return (
          <div key={entry.id} className="animate-fade-in flex items-start gap-3 bg-[var(--color-bg)] rounded-lg p-3">
            <div className={`mt-0.5 ${config.color}`}>
              <Icon size={16} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <span className={`text-xs font-medium ${config.color}`}>{config.label}</span>
                <span className="text-xs text-[var(--color-text-muted)] font-mono">{entry.operator}</span>
              </div>
              <div className="text-sm text-[var(--color-text)]">
                {entry.oldValue && (
                  <span className="text-[var(--color-text-muted)] line-through mr-1">{entry.oldValue}</span>
                )}
                <span>{entry.newValue}</span>
              </div>
              {entry.reason && (
                <div className="text-xs text-[var(--color-text-secondary)] mt-1">原因：{entry.reason}</div>
              )}
            </div>
            <div className="text-xs text-[var(--color-text-muted)] font-mono whitespace-nowrap">
              {new Date(entry.timestamp).toLocaleString('zh-CN')}
            </div>
          </div>
        );
      })}
    </div>
  );
}
