import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Upload, FileText, AlertTriangle, Play, Trash2, Copy, Zap } from 'lucide-react';
import { useAppStore } from '@/store';
import StatusBadge from '@/components/StatusBadge';
import RiskBadge from '@/components/RiskBadge';
import { cn } from '@/lib/utils';
import type { Task } from '@/types';

export default function TaskList() {
  const navigate = useNavigate();
  const { tasks, loading, error, fetchTasks, createTask, deleteTask, cloneTask, importDirtySample, clearError } = useAppStore();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTaskName, setNewTaskName] = useState('');
  const [importingSample, setImportingSample] = useState(false);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const handleCreateTask = async () => {
    if (!newTaskName.trim()) return;
    const task = await createTask(newTaskName.trim());
    if (task) {
      setShowCreateModal(false);
      setNewTaskName('');
      navigate(`/tasks/${task.id}`);
    }
  };

  const handleImportDirtySample = async () => {
    setImportingSample(true);
    const task = await importDirtySample();
    if (task) {
      navigate(`/tasks/${task.id}`);
    }
    setImportingSample(false);
  };

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

      <div className="flex flex-wrap gap-3">
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-5 py-2.5 bg-accent hover:bg-accentDark text-primaryDark font-medium rounded-lg transition-colors"
        >
          <Plus size={18} />
          新建任务
        </button>
        <button
          onClick={handleImportDirtySample}
          disabled={importingSample}
          className="flex items-center gap-2 px-5 py-2.5 bg-warning hover:bg-warningLight text-white font-medium rounded-lg transition-colors disabled:opacity-50"
        >
          <Zap size={18} />
          {importingSample ? '导入中...' : '导入逆风突变脏样例'}
        </button>
      </div>

      {loading && tasks.length === 0 ? (
        <div className="text-center py-16 text-gray-400">加载中...</div>
      ) : tasks.length === 0 ? (
        <div className="text-center py-16 bg-primary/30 rounded-xl border border-accent/20">
          <FileText size={48} className="mx-auto text-gray-500 mb-4" />
          <p className="text-gray-400 mb-2">暂无任务</p>
          <p className="text-sm text-gray-500">点击"新建任务"或导入脏样例开始</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {tasks.map((task) => (
            <div
              key={task.id}
              className={cn(
                'bg-primary/30 rounded-xl border p-5 transition-all hover:bg-primary/50 cursor-pointer',
                getRiskLevelColor(task),
                task.isDuplicate && 'opacity-60'
              )}
              onClick={() => navigate(`/tasks/${task.id}`)}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="font-semibold text-lg">{task.name}</h3>
                    <StatusBadge status={task.status} size="sm" />
                    {task.isDuplicate && (
                      <span className="text-xs px-2 py-0.5 bg-gray-500/20 text-gray-400 border border-gray-500/30 rounded">
                        重复计算
                      </span>
                    )}
                  </div>
                  <div className="text-sm text-gray-400 mb-3">
                    {task.id} · {new Date(task.createdAt).toLocaleString('zh-CN')}
                  </div>
                  <div className="flex flex-wrap gap-6 text-sm">
                    {task.safetyScore !== undefined && (
                      <div>
                        <span className="text-gray-500">安全评分: </span>
                        <span className={cn('font-medium', getSafetyScoreColor(task.safetyScore))}>
                          {task.safetyScore.toFixed(0)}/100
                        </span>
                      </div>
                    )}
                    {task.totalRiskCount !== undefined && (
                      <div>
                        <span className="text-gray-500">风险项: </span>
                        <span className="text-warning font-medium">{task.totalRiskCount}</span>
                      </div>
                    )}
                    {task.packageCount !== undefined && (
                      <div>
                        <span className="text-gray-500">数据包: </span>
                        <span className="text-accent font-medium">{task.packageCount}</span>
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex gap-2 ml-4" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={() => navigate(`/tasks/${task.id}`)}
                    className="p-2 rounded-lg bg-accent/10 hover:bg-accent/20 text-accent transition-colors"
                    title="查看详情"
                  >
                    <FileText size={18} />
                  </button>
                  {task.status === 'pending' && (
                    <button
                      onClick={() => navigate(`/tasks/${task.id}`)}
                      className="p-2 rounded-lg bg-success/10 hover:bg-success/20 text-success transition-colors"
                      title="开始计算"
                    >
                      <Play size={18} />
                    </button>
                  )}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      cloneTask(task.id);
                    }}
                    className="p-2 rounded-lg bg-gray-500/10 hover:bg-gray-500/20 text-gray-400 hover:text-white transition-colors"
                    title="克隆任务"
                  >
                    <Copy size={18} />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm('确定删除此任务？')) {
                        deleteTask(task.id);
                      }
                    }}
                    className="p-2 rounded-lg bg-warning/10 hover:bg-warning/20 text-warning transition-colors"
                    title="删除任务"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showCreateModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-primary border border-accent/30 rounded-xl p-6 w-full max-w-md">
            <h3 className="text-xl font-semibold mb-4">新建任务</h3>
            <input
              type="text"
              value={newTaskName}
              onChange={(e) => setNewTaskName(e.target.value)}
              placeholder="输入任务名称..."
              className="w-full px-4 py-3 bg-primaryDark border border-accent/20 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-accent mb-4"
              autoFocus
              onKeyDown={(e) => e.key === 'Enter' && handleCreateTask()}
            />
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleCreateTask}
                disabled={!newTaskName.trim()}
                className="px-5 py-2 bg-accent hover:bg-accentDark text-primaryDark font-medium rounded-lg transition-colors disabled:opacity-50"
              >
                创建
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
