import { useReviewStore } from '@/store/useReviewStore';
import {
  FolderOpen,
  Clock,
  CheckCircle,
  AlertTriangle,
  Play,
  Archive,
  Plus,
  MoreVertical,
} from 'lucide-react';
import { formatDateTime, relativeTime } from '@/utils/format';

export function SessionsPage() {
  const { session, resetSession } = useReviewStore();

  const sessions = [session];

  const statusConfig = {
    active: {
      label: '进行中',
      className: 'bg-cyan-accent/20 text-cyan-accent',
      icon: Play,
    },
    completed: {
      label: '已完成',
      className: 'bg-emerald-400/20 text-emerald-400',
      icon: CheckCircle,
    },
    archived: {
      label: '已归档',
      className: 'bg-slate-500/20 text-slate-400',
      icon: Archive,
    },
  };

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="flex-shrink-0 p-6 border-b border-slate-700/50 glass-strong">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-display text-xl font-bold text-white">
              会话管理
            </h2>
            <p className="text-sm text-slate-400 mt-1">
              管理所有复核会话，恢复历史工作
            </p>
          </div>
          <button
            onClick={resetSession}
            className="flex items-center gap-2 px-4 py-2 bg-cyan-accent/20 hover:bg-cyan-accent/30 text-cyan-accent text-sm font-medium rounded-lg transition-colors"
          >
            <Plus size={16} />
            新建会话
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-4xl mx-auto">
          <div className="grid gap-4">
            {sessions.map((s) => {
              const status = statusConfig[s.status];
              const StatusIcon = status.icon;
              const reviewedCount = s.samples.filter(
                (sample) => sample.reviewStatus === 'confirmed',
              ).length;
              const progress =
                s.samples.length > 0
                  ? (reviewedCount / s.samples.length) * 100
                  : 0;

              return (
                <div
                  key={s.id}
                  className="glass rounded-xl p-5 hover:bg-slate-700/20 transition-colors cursor-pointer group"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-accent/30 to-blue-500/30 flex items-center justify-center">
                        <FolderOpen
                          size={24}
                          className="text-cyan-accent"
                        />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-base font-semibold text-slate-100 group-hover:text-white transition-colors">
                            {s.name}
                          </h3>
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-full ${status.className}`}
                          >
                            <StatusIcon size={10} />
                            {status.label}
                          </span>
                        </div>
                        <p className="text-sm text-slate-400 mt-1">
                          {s.samples.length} 个样本 · {s.modelVersions.length}{' '}
                          个模型版本
                        </p>
                      </div>
                    </div>

                    <button className="p-1 text-slate-500 hover:text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity">
                      <MoreVertical size={18} />
                    </button>
                  </div>

                  <div className="mt-4 pt-4 border-t border-slate-700/50">
                    <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
                      <span>复核进度</span>
                      <span>
                        {reviewedCount} / {s.samples.length} (
                        {progress.toFixed(0)}%)
                      </span>
                    </div>
                    <div className="h-2 bg-slate-700/50 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-cyan-accent to-emerald-400 rounded-full transition-all duration-500"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>

                  <div className="mt-4 flex items-center gap-4 text-xs text-slate-500">
                    <div className="flex items-center gap-1">
                      <Clock size={12} />
                      <span>创建于 {formatDateTime(s.createdAt)}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock size={12} />
                      <span>更新于 {relativeTime(s.updatedAt)}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-8 p-4 rounded-xl border border-dashed border-slate-700 bg-slate-800/20 text-center">
            <p className="text-sm text-slate-400 mb-2">关于数据存储</p>
            <p className="text-xs text-slate-500">
              所有数据均保存在浏览器本地（localStorage），清除浏览器数据会导致丢失。
              <br />
              建议定期导出CSV备份重要数据。
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
