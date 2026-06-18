import { useMemo, useState } from 'react';
import { useReviewStore } from '@/store/useReviewStore';
import type { HistoryRecord, HistoryType } from '@/types';
import {
  Clock,
  Upload,
  CheckCircle,
  AlertTriangle,
  MessageSquare,
  Edit3,
  ShieldAlert,
  ChevronDown,
  ChevronUp,
  Filter,
  Search,
} from 'lucide-react';
import { formatDateTime, relativeTime } from '@/utils/format';

const typeConfig: Record<
  HistoryType,
  { icon: typeof Clock; label: string; color: string; bgColor: string }
> = {
  import: {
    icon: Upload,
    label: '数据导入',
    color: 'text-cyan-accent',
    bgColor: 'bg-cyan-accent/20',
  },
  review: {
    icon: CheckCircle,
    label: '复核确认',
    color: 'text-emerald-400',
    bgColor: 'bg-emerald-400/20',
  },
  boundary_mark: {
    icon: AlertTriangle,
    label: '标记边界',
    color: 'text-amber-warn',
    bgColor: 'bg-amber-warn/20',
  },
  boundary_unmark: {
    icon: AlertTriangle,
    label: '取消边界',
    color: 'text-slate-400',
    bgColor: 'bg-slate-400/20',
  },
  note_add: {
    icon: MessageSquare,
    label: '添加备注',
    color: 'text-blue-400',
    bgColor: 'bg-blue-400/20',
  },
  verdict_change: {
    icon: Edit3,
    label: '改判',
    color: 'text-rose-alert',
    bgColor: 'bg-rose-alert/20',
  },
  attribute_edit: {
    icon: Edit3,
    label: '属性修改',
    color: 'text-rose-alert',
    bgColor: 'bg-rose-alert/20',
  },
  leak_flag: {
    icon: ShieldAlert,
    label: '泄漏预警',
    color: 'text-rose-alert',
    bgColor: 'bg-rose-alert/20',
  },
};

export function HistoryPage() {
  const { session } = useReviewStore();
  const [filterType, setFilterType] = useState<HistoryType | 'all'>('all');
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filteredHistory = useMemo(() => {
    let result = session.history;

    if (filterType !== 'all') {
      result = result.filter((h) => h.type === filterType);
    }

    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (h) =>
          h.sampleName?.toLowerCase().includes(q) ||
          h.operator.toLowerCase().includes(q) ||
          (h.reason && h.reason.toLowerCase().includes(q)),
      );
    }

    return result;
  }, [session.history, filterType, search]);

  const groupedByDate = useMemo(() => {
    const groups: Record<string, HistoryRecord[]> = {};
    filteredHistory.forEach((record) => {
      const date = new Date(record.timestamp).toLocaleDateString('zh-CN');
      if (!groups[date]) groups[date] = [];
      groups[date].push(record);
    });
    return groups;
  }, [filteredHistory]);

  const types: { key: HistoryType | 'all'; label: string }[] = [
    { key: 'all', label: '全部' },
    { key: 'import', label: '导入' },
    { key: 'review', label: '复核' },
    { key: 'boundary_mark', label: '边界标记' },
    { key: 'note_add', label: '备注' },
    { key: 'attribute_edit', label: '属性修改' },
    { key: 'leak_flag', label: '泄漏预警' },
  ];

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="flex-shrink-0 p-6 border-b border-slate-700/50 glass-strong">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-display text-xl font-bold text-white">
              历史时间线
            </h2>
            <p className="text-sm text-slate-400 mt-1">
              所有操作记录完整留痕，支持追溯和审计
            </p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-cyan-accent font-display">
              {session.history.length}
            </div>
            <div className="text-xs text-slate-500">条操作记录</div>
          </div>
        </div>

        <div className="flex items-center gap-4 mt-4">
          <div className="relative flex-1 max-w-xs">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
            />
            <input
              type="text"
              placeholder="搜索样本名、操作人、原因..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm bg-slate-800/50 border border-slate-700/50 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-accent/50"
            />
          </div>

          <div className="flex items-center gap-1 flex-wrap">
            {types.map((t) => (
              <button
                key={t.key}
                onClick={() => setFilterType(t.key)}
                className={`px-3 py-1.5 text-xs rounded-md transition-colors ${
                  filterType === t.key
                    ? 'bg-cyan-accent/20 text-cyan-accent'
                    : 'text-slate-400 hover:text-slate-300 hover:bg-slate-700/50'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {Object.entries(groupedByDate).length === 0 ? (
          <div className="h-full flex items-center justify-center text-slate-500">
            暂无历史记录
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(groupedByDate).map(([date, records]) => (
              <div key={date}>
                <div className="flex items-center gap-3 mb-4">
                  <div className="text-sm font-medium text-slate-300">
                    {date}
                  </div>
                  <div className="flex-1 h-px bg-slate-700/50" />
                  <div className="text-xs text-slate-500">
                    {records.length} 条记录
                  </div>
                </div>

                <div className="relative pl-8">
                  <div className="absolute left-[11px] top-0 bottom-0 w-px bg-slate-700" />

                  <div className="space-y-4">
                    {records.map((record) => {
                      const config = typeConfig[record.type];
                      const Icon = config.icon;
                      const isExpanded = expandedId === record.id;

                      return (
                        <div key={record.id} className="relative">
                          <div
                            className={`absolute -left-8 top-3 w-6 h-6 rounded-full ${config.bgColor} ${config.color} flex items-center justify-center border-2 border-deep-ocean z-10`}
                          >
                            <Icon size={12} />
                          </div>

                          <div
                            onClick={() =>
                              setExpandedId(isExpanded ? null : record.id)
                            }
                            className="glass rounded-lg p-4 cursor-pointer hover:bg-slate-700/30 transition-colors"
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex items-center gap-3">
                                <span
                                  className={`px-2 py-0.5 text-xs rounded ${config.bgColor} ${config.color} font-medium`}
                                >
                                  {config.label}
                                </span>
                                {record.sampleName && (
                                  <span className="text-sm text-slate-200 font-medium">
                                    {record.sampleName}
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-3">
                                <span className="text-xs text-slate-400">
                                  {relativeTime(record.timestamp)}
                                </span>
                                {isExpanded ? (
                                  <ChevronUp
                                    size={16}
                                    className="text-slate-500"
                                  />
                                ) : (
                                  <ChevronDown
                                    size={16}
                                    className="text-slate-500"
                                  />
                                )}
                              </div>
                            </div>

                            <div className="mt-2 flex items-center gap-4 text-xs text-slate-500">
                              <span>操作人：{record.operator}</span>
                              {record.reason && (
                                <span className="text-slate-400">
                                  原因：{record.reason}
                                </span>
                              )}
                            </div>

                            {isExpanded && (
                              <div className="mt-4 pt-4 border-t border-slate-700/50 grid grid-cols-2 gap-4 animate-fade-in">
                                <div>
                                  <div className="text-xs text-slate-500 mb-1.5">
                                    变更前
                                  </div>
                                  <pre className="text-xs text-slate-400 bg-slate-800/50 p-3 rounded-lg font-mono overflow-x-auto">
                                    {JSON.stringify(record.before, null, 2)}
                                  </pre>
                                </div>
                                <div>
                                  <div className="text-xs text-slate-500 mb-1.5">
                                    变更后
                                  </div>
                                  <pre className="text-xs text-slate-400 bg-slate-800/50 p-3 rounded-lg font-mono overflow-x-auto">
                                    {JSON.stringify(record.after, null, 2)}
                                  </pre>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
