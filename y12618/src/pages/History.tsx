import { useEffect } from 'react';
import {
  Plus,
  Pencil,
  Trash2,
  GitMerge,
  Clock,
} from 'lucide-react';
import { useStore } from '@/store';
import type { HistoryEntry } from '@/api';

const actionIcon = (action: HistoryEntry['action']) => {
  switch (action) {
    case 'create':
      return <Plus className="h-4 w-4" />;
    case 'update':
      return <Pencil className="h-4 w-4" />;
    case 'delete':
      return <Trash2 className="h-4 w-4" />;
    case 'merge':
      return <GitMerge className="h-4 w-4" />;
    default:
      return <Clock className="h-4 w-4" />;
  }
};

const actionColor = (action: HistoryEntry['action']) => {
  switch (action) {
    case 'create':
      return 'bg-moss/15 text-moss';
    case 'update':
      return 'bg-amber/15 text-amber-dark';
    case 'delete':
      return 'bg-terracotta/15 text-terracotta';
    case 'merge':
      return 'bg-ink/10 text-ink';
    default:
      return 'bg-slate-custom/10 text-slate-custom';
  }
};

const actionLabel = (action: HistoryEntry['action']) => {
  switch (action) {
    case 'create':
      return '创建';
    case 'update':
      return '更新';
    case 'delete':
      return '删除';
    case 'merge':
      return '合并';
    default:
      return '操作';
  }
};

const entityTypeLabel = (entityType: HistoryEntry['entityType']) => {
  switch (entityType) {
    case 'level':
      return '关卡';
    case 'violation':
      return '违例';
    case 'conclusion':
      return '结论';
    case 'draft':
      return '草稿';
    default:
      return entityType;
  }
};

export default function History() {
  const { history, fetchHistory, loading } = useStore();

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-slate-custom">加载中...</div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="font-serif text-2xl font-semibold text-ink">历史记录</h2>

      {history.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-custom">
          <Clock className="mb-3 h-12 w-12 opacity-30" />
          <p>暂无历史记录</p>
        </div>
      ) : (
        <div className="relative pl-8">
          <div className="absolute left-3 top-0 bottom-0 w-0.5 bg-ink/10" />

          <div className="space-y-6">
            {history.map((entry) => (
              <div key={entry.id} className="relative">
                <div
                  className={`absolute -left-5 top-1 flex h-8 w-8 items-center justify-center rounded-full ${actionColor(entry.action)}`}
                >
                  {actionIcon(entry.action)}
                </div>

                <div className="card ml-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className={`badge ${actionColor(entry.action)}`}>
                        {actionLabel(entry.action)}
                      </span>
                      <span className="text-xs text-slate-custom">
                        {entityTypeLabel(entry.entityType)}
                      </span>
                    </div>
                    <span className="text-xs text-slate-custom/60">
                      {new Date(entry.createdAt).toLocaleString('zh-CN')}
                    </span>
                  </div>

                  <p className="text-sm font-medium text-ink">{entry.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
