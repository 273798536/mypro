import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { History, FileText, AlertTriangle, Clock, CheckCircle, XCircle, Filter, Eye } from 'lucide-react';
import { useAppStore } from '@/store';
import StatusBadge from '@/components/StatusBadge';
import RiskBadge from '@/components/RiskBadge';
import { cn } from '@/lib/utils';
import type { Task } from '@/types';

export default function HistoryList() {
  const navigate = useNavigate();
  const { tasks, loading, error, fetchTasks, clearError } = useAppStore();
  const [includeDuplicates, setIncludeDuplicates] = useState(false);

  useEffect(() => {
    fetchTasks(includeDuplicates);
  }, [fetchTasks, includeDuplicates]);

  const getRiskLevelColor = (task: Task) => {
    if (!task.totalRiskCount) return 'border-gray-500/30';
    const highRisks = task.totalRiskCount;
    if (highRisks > 2) return 'border-warning/50 bg-warning/5';
    if (highRisks > 0) return 'border-warningYellow/50 bg-warningYellow/5';
    return 'border-success/50 bg-success/5';
  };

  const getSafetyScoreColor = (score?: number) => {
    if (!score) return 'text-gray-500';
    if (score >= 80) return 'text-success';
    if (score >= 60) return 'text-warningYellow';
    if (score >= 40) return 'text-warning';
    return 'text-red-400';
  };

  const sortedTasks = [...tasks].sort((a, b) => 
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-warning/10 border border-warning/30 rounded-lg p-4 flex items-center gap-3">
          <AlertTriangle className="text-warning flex-shrink-0" size={20} />
          <div className="flex-1 text-warning">{error}</div>
          <button onClick={clearError} className="text-gray-400 hover:text-white">
            ✕
          </button>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold">历史计算记录</h2>
          <p className="text-sm text-gray-400 mt-0.5">
            {includeDuplicates ? '显示所有记录（含重复）' : '默认隐藏重复计算记录'}
          </p>
        </div>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={includeDuplicates}
            onChange={(e) => setIncludeDuplicates(e.target.checked)}
            className="w-4 h-4 rounded bg-primaryDark border-accent/30 text-accent focus:ring-accent"
          />
          <span className="text-sm text-gray-300">显示重复计算</span>
        </label>
      </div>

      {loading && sortedTasks.length === 0 ? (
        <div className="text-center py-16 text-gray-400">加载中...</div>
      ) : sortedTasks.length === 0 ? (
        <div className="text-center py-16 bg-primary/30 rounded-xl border border-accent/20">
          <History size={48} className="mx-auto text-gray-500 mb-4" />
          <p className="text-gray-400 mb-2">暂无历史记录</p>
          <p className="text-sm text-gray-500">完成计算后，记录将显示在这里</p>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="hidden md:grid grid-cols-12 gap-4 px-4 py-2 text-xs text-gray-500 border-b border-accent/10">
            <div className="col-span-4">任务名称</div>
            <div className="col-span-2">状态</div>
            <div className="col-span-1 text-center">安全评分</div>
            <div className="col-span-1 text-center">风险项</div>
            <div className="col-span-2 text-center">创建时间</div>
            <div className="col-span-2 text-center">操作</div>
          </div>

          {sortedTasks.map((task) => (
            <div
              key={task.id}
              className={cn(
                'bg-primary/30 rounded-lg border p-4 transition-all hover:bg-primary/50',
                getRiskLevelColor(task),
                task.isDuplicate && 'opacity-60'
              )}
            >
              <div className="md:grid md:grid-cols-12 md:gap-4 md:items-center">
                <div className="col-span-4 mb-3 md:mb-0">
                  <div className="flex items-center gap-2 mb-1">
                    <FileText size={16} className="text-accent" />
                    <span className="font-medium">{task.name}</span>
                    {task.isDuplicate && (
                      <span className="text-xs px-2 py-0.5 bg-gray-500/20 text-gray-400 border border-gray-500/30 rounded">
                        重复
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-gray-500 hidden md:block">{task.id}</div>
                </div>

                <div className="col-span-2 mb-3 md:mb-0">
                  <StatusBadge status={task.status} size="sm" />
                </div>

                <div className="col-span-1 mb-3 md:mb-0 text-center">
                  {task.safetyScore !== undefined ? (
                    <span className={cn('font-semibold', getSafetyScoreColor(task.safetyScore))}>
                      {task.safetyScore.toFixed(0)}
                    </span>
                  ) : (
                    <span className="text-gray-500">-</span>
                  )}
                </div>

                <div className="col-span-1 mb-3 md:mb-0 text-center">
                  {task.totalRiskCount !== undefined && task.totalRiskCount > 0 ? (
                    <span className="text-warning font-semibold">{task.totalRiskCount}</span>
                  ) : (
                    <span className="text-gray-500">-</span>
                  )}
                </div>

                <div className="col-span-2 mb-3 md:mb-0 text-center text-sm text-gray-400">
                  <div className="flex items-center justify-center gap-1">
                    <Clock size={12} />
                    {new Date(task.createdAt).toLocaleDateString('zh-CN')}
                  </div>
                  <div className="text-xs text-gray-500">
                    {new Date(task.createdAt).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>

                <div className="col-span-2 flex items-center justify-center gap-2">
                  <button
                    onClick={() => navigate(`/tasks/${task.id}`)}
                    className="flex items-center gap-1 px-3 py-1.5 text-sm bg-accent/10 hover:bg-accent/20 text-accent rounded transition-colors"
                  >
                    <Eye size={14} />
                    查看
                  </button>
                  {task.status === 'completed' && (
                    <button
                      onClick={() => navigate(`/tasks/${task.id}/report`)}
                      className="flex items-center gap-1 px-3 py-1.5 text-sm bg-success/10 hover:bg-success/20 text-success rounded transition-colors"
                    >
                      <FileText size={14} />
                      报告
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-8 bg-primary/20 rounded-xl border border-accent/10 p-6">
        <h3 className="font-semibold mb-3 flex items-center gap-2">
          <CheckCircle size={18} className="text-success" />
          数据持久性说明
        </h3>
        <div className="text-sm text-gray-400 space-y-2">
          <p>• 所有计算记录通过 SQLite 数据库持久化存储，重启服务后不会丢失</p>
          <p>• 系统基于 SHA-256 内容哈希自动检测重复计算，相同输入不会产生重复结论</p>
          <p>• 重复计算记录在列表中默认隐藏，可通过上方开关显示</p>
          <p>• 所有人工修正操作均会留痕，可在报告中查看完整修正历史</p>
        </div>
      </div>
    </div>
  );
}
