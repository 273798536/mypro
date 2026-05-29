
import { useEffect } from 'react';
import { useTaskStore } from '../store/taskStore';
import { StatusBadge, SourceTypeBadge } from '../components/StatusBadge';
import { Skull, RefreshCw, Eye } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function DeadLetterPage() {
  const navigate = useNavigate();
  const { deadLetters, fetchDeadLetters, reviveDeadLetter, loading } = useTaskStore();

  useEffect(() => {
    fetchDeadLetters();
  }, [fetchDeadLetters]);

  const handleRevive = async (id: string) => {
    if (confirm('确定要恢复此死信任务吗？它将进入等人工状态。')) {
      await reviveDeadLetter(id);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-semibold text-slate-800">死信队列</h3>
          <p className="text-sm text-slate-500">永久失败的任务，可人工恢复处理</p>
        </div>
        <button
          onClick={() => fetchDeadLetters()}
          className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200"
        >
          <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
          刷新
        </button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full">
          <thead className="bg-red-50 border-b border-red-100">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-red-600 uppercase tracking-wider">任务ID</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-red-600 uppercase tracking-wider">来源类型</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-red-600 uppercase tracking-wider">来源文件</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-red-600 uppercase tracking-wider">金额</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-red-600 uppercase tracking-wider">失败时间</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-red-600 uppercase tracking-wider">状态</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-red-600 uppercase tracking-wider">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {loading ? (
              <tr>
                <td colSpan={7} className="px-6 py-8 text-center text-slate-400">加载中...</td>
              </tr>
            ) : deadLetters.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-12 text-center">
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center">
                      <Skull className="text-slate-400" size={28} />
                    </div>
                    <p className="text-slate-400">暂无死信任务</p>
                  </div>
                </td>
              </tr>
            ) : (
              deadLetters.map((task) => (
                <tr key={task.id} className="hover:bg-slate-50">
                  <td className="px-6 py-4 text-sm font-mono text-slate-600">{task.id.slice(0, 8)}...</td>
                  <td className="px-6 py-4"><SourceTypeBadge type={task.sourceType} /></td>
                  <td className="px-6 py-4 text-sm text-slate-600 max-w-xs truncate">{task.sourceFile}</td>
                  <td className="px-6 py-4 text-sm font-medium text-slate-800">¥{String(task.standardData.amount)}</td>
                  <td className="px-6 py-4 text-sm text-slate-500">
                    {task.processedAt ? new Date(task.processedAt).toLocaleString('zh-CN') : '-'}
                  </td>
                  <td className="px-6 py-4"><StatusBadge status={task.status} /></td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => navigate(`/queue/${task.id}`)}
                        className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
                        title="查看详情"
                      >
                        <Eye size={18} />
                      </button>
                      <button
                        onClick={() => handleRevive(task.id)}
                        disabled={loading}
                        className="p-2 text-slate-400 hover:text-green-600 hover:bg-green-50 rounded-lg disabled:opacity-50"
                        title="恢复处理"
                      >
                        <RefreshCw size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
