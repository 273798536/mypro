
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTaskStore } from '../store/taskStore';
import { StatusBadge, SourceTypeBadge } from '../components/StatusBadge';
import type { TaskStatus, SourceType } from '../../shared/types';
import { Search, Filter, Eye } from 'lucide-react';

export function QueueList() {
  const navigate = useNavigate();
  const { tasks, fetchTasks, loading } = useTaskStore();
  const [statusFilter, setStatusFilter] = useState<TaskStatus | ''>('');
  const [sourceFilter, setSourceFilter] = useState<SourceType | ''>('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchTasks({
      status: statusFilter || undefined,
      sourceType: sourceFilter || undefined,
    });
  }, [fetchTasks, statusFilter, sourceFilter]);

  const filteredTasks = tasks.filter(task => 
    search === '' || 
    task.sourceFile.toLowerCase().includes(search.toLowerCase()) ||
    task.id.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-semibold text-slate-800">队列任务</h3>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <div className="flex items-center gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="搜索文件名或任务ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div className="flex items-center gap-2">
            <Filter size={18} className="text-slate-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as TaskStatus | '')}
              className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">全部状态</option>
              <option value="pending">排队中</option>
              <option value="processing">处理中</option>
              <option value="waiting_retry">等重试</option>
              <option value="waiting_manual">等人工</option>
              <option value="permanent_failed">永久失败</option>
              <option value="success">成功</option>
              <option value="closed">已关闭</option>
            </select>

            <select
              value={sourceFilter}
              onChange={(e) => setSourceFilter(e.target.value as SourceType | '')}
              className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">全部来源</option>
              <option value="recharge">充值流水</option>
              <option value="refund">退款申请</option>
              <option value="store_transfer">门店交接表</option>
              <option value="supplier_statement">供应商对账单</option>
            </select>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">任务ID</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">来源类型</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">来源文件</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">行号</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">金额</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">重试次数</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">状态</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {loading ? (
              <tr>
                <td colSpan={8} className="px-6 py-8 text-center text-slate-400">加载中...</td>
              </tr>
            ) : filteredTasks.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-6 py-8 text-center text-slate-400">暂无任务</td>
              </tr>
            ) : (
              filteredTasks.map((task) => (
                <tr key={task.id} className="hover:bg-slate-50">
                  <td className="px-6 py-4 text-sm font-mono text-slate-600">{task.id.slice(0, 8)}...</td>
                  <td className="px-6 py-4"><SourceTypeBadge type={task.sourceType} /></td>
                  <td className="px-6 py-4 text-sm text-slate-600 max-w-xs truncate">{task.sourceFile}</td>
                  <td className="px-6 py-4 text-sm text-slate-600">{task.sourceLine}</td>
                  <td className="px-6 py-4 text-sm font-medium text-slate-800">¥{String(task.standardData.amount)}</td>
                  <td className="px-6 py-4">
                    <span className={`text-sm ${task.retryCount > 0 ? 'text-amber-600' : 'text-slate-400'}`}>
                      {task.retryCount}/{task.maxRetries}
                    </span>
                  </td>
                  <td className="px-6 py-4"><StatusBadge status={task.status} /></td>
                  <td className="px-6 py-4">
                    <button
                      onClick={() => navigate(`/queue/${task.id}`)}
                      className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
                    >
                      <Eye size={18} />
                    </button>
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
