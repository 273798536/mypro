import { useAppStore } from '@/store/useAppStore';
import { History, Upload, Settings, Undo2, CheckCircle, Pause, FileText } from 'lucide-react';

const typeConfig: Record<string, { label: string; Icon: typeof Upload; color: string }> = {
  import: { label: '导入', Icon: Upload, color: 'text-blue-400 bg-blue-500/20' },
  adjust: { label: '调整', Icon: Settings, color: 'text-yellow-400 bg-yellow-500/20' },
  revoke: { label: '撤回', Icon: Undo2, color: 'text-red-400 bg-red-500/20' },
  confirm: { label: '确认', Icon: CheckCircle, color: 'text-green-400 bg-green-500/20' },
  suspend: { label: '挂起', Icon: Pause, color: 'text-orange-400 bg-orange-500/20' },
  report: { label: '报告', Icon: FileText, color: 'text-purple-400 bg-purple-500/20' },
};

export default function HistoryPanel() {
  const { history } = useAppStore();

  const sortedHistory = [...history].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
  );

  const hasRevokedRecords = history.some((h) => h.isRevoked);

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center gap-2 mb-3">
        <History size={16} className="text-slate-400" />
        <span className="text-sm font-medium text-slate-200">操作历史</span>
        <span className="text-xs text-slate-500">{history.length} 条记录</span>
      </div>

      {hasRevokedRecords && (
        <div className="mb-3 p-2 bg-red-500/10 border border-red-500/30 rounded text-xs text-red-400">
          <p>包含 {history.filter((h) => h.isRevoked).length} 条已撤回操作</p>
        </div>
      )}

      <div className="flex-1 overflow-y-auto pr-1">
        <div className="relative">
          <div className="absolute left-3 top-2 bottom-2 w-px bg-slate-700" />

          <div className="space-y-4">
            {sortedHistory.map((record, index) => {
              const config = typeConfig[record.type];
              const isLast = index === sortedHistory.length - 1;

              return (
                <div
                  key={record.id}
                  className={`relative pl-8 ${record.isRevoked ? 'opacity-50' : ''}`}
                >
                  <div
                    className={`absolute left-0 top-1 w-6 h-6 rounded-full flex items-center justify-center ${config.color}`}
                  >
                    <config.Icon size={12} />
                  </div>

                  <div
                    className={`p-2 rounded border transition-colors ${
                      record.type === 'revoke'
                        ? 'bg-red-500/5 border-red-500/20'
                        : record.isRevoked
                          ? 'bg-slate-800/30 border-slate-700/30'
                          : 'bg-slate-800/50 border-slate-700 hover:border-slate-600'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p
                          className={`text-sm ${
                            record.isRevoked
                              ? 'text-slate-500 line-through'
                              : 'text-slate-200'
                          }`}
                        >
                          {record.description}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-slate-500">
                            {record.operator}
                          </span>
                          <span className="text-xs text-slate-600">·</span>
                          <span className="text-xs text-slate-500 font-mono">
                            {record.timestamp}
                          </span>
                        </div>
                      </div>

                      <span
                        className={`text-xs px-1.5 py-0.5 rounded flex-shrink-0 ${
                          record.type === 'revoke'
                            ? 'bg-red-500/20 text-red-400'
                            : 'bg-slate-700 text-slate-400'
                        }`}
                      >
                        {config.label}
                      </span>
                    </div>

                    {record.details && Object.keys(record.details).length > 0 && (
                      <div className="mt-2 pt-2 border-t border-slate-700/50">
                        <p className="text-xs text-slate-500 mb-1">详情</p>
                        <div className="space-y-0.5">
                          {Object.entries(record.details).map(([key, value]) => (
                            <div key={key} className="flex gap-2 text-xs">
                              <span className="text-slate-500 w-20 flex-shrink-0">
                                {key}
                              </span>
                              <span className="text-slate-400 flex-1 truncate">
                                {String(value)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {record.isRevoked && (
                      <div className="mt-2 flex items-center gap-1 text-xs text-slate-500">
                        <Undo2 size={10} />
                        <span>此操作已被撤回</span>
                      </div>
                    )}
                  </div>

                  {!isLast && (
                    <div className="absolute left-3 top-7 bottom-0 w-px bg-slate-700" />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="mt-3 pt-3 border-t border-slate-700">
        <p className="text-xs text-slate-500">
          操作记录不可删除，所有变更均保留完整历史
        </p>
      </div>
    </div>
  );
}
