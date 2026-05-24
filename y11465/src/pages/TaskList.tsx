import { useEffect, useState } from 'react';
import { useAppStore } from '../store/appStore';
import { RefreshCw, User, AlertTriangle, Play, CheckCircle } from 'lucide-react';
import api from '../services/api';
import { TASK_STATUS_LABELS } from '../../shared/types';

export default function TaskList() {
  const { tasks, fetchTasks, loading } = useAppStore();
  const [filter, setFilter] = useState({ status: '' });

  useEffect(() => {
    fetchTasks(filter as any);
  }, [fetchTasks, filter]);

  const handleRetry = async (id: string) => {
    try {
      await api.tasks.retry(id, { operatedBy: '管理员' });
      fetchTasks(filter as any);
    } catch (error: any) {
      alert(error.message);
    }
  };

  const handleManual = async (id: string, action: string) => {
    const remark = prompt('请输入处理备注：');
    if (!remark) return;
    
    try {
      await api.tasks.manual(id, { action, remark, operatedBy: '管理员' });
      fetchTasks(filter as any);
    } catch (error: any) {
      alert(error.message);
    }
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      PENDING: 'bg-slate-100 text-slate-700',
      PROCESSING: 'bg-blue-100 text-blue-700',
      SUCCESS: 'bg-green-100 text-green-700',
      WAITING_RETRY: 'bg-yellow-100 text-yellow-700',
      WAITING_MANUAL: 'bg-orange-100 text-orange-700',
      PERMANENT_FAILED: 'bg-red-100 text-red-700',
    };
    return colors[status] || 'bg-slate-100 text-slate-700';
  };

  const getStatusIcon = (status: string) => {
    const icons: Record<string, any> = {
      WAITING_RETRY: RefreshCw,
      WAITING_MANUAL: User,
      PERMANENT_FAILED: AlertTriangle,
      SUCCESS: CheckCircle,
    };
    return icons[status];
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">任务监控</h1>
          <p className="text-slate-500 mt-1">监控异步任务执行状态，管理失败重试</p>
        </div>
        <button
          onClick={() => fetchTasks(filter as any)}
          className="flex items-center gap-2 px-4 py-2 border border-slate-200 rounded hover:bg-slate-50"
        >
          <RefreshCw size={16} />
          刷新
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-md p-4 mb-6">
        <div className="flex gap-4">
          <select
            className="px-4 py-2 border border-slate-200 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={filter.status}
            onChange={(e) => setFilter({ ...filter, status: e.target.value })}
          >
            <option value="">全部状态</option>
            <option value="PENDING">待处理</option>
            <option value="PROCESSING">处理中</option>
            <option value="SUCCESS">成功</option>
            <option value="WAITING_RETRY">等重试</option>
            <option value="WAITING_MANUAL">等人工</option>
            <option value="PERMANENT_FAILED">永久失败</option>
          </select>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <table className="w-full">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-5 py-3 text-left text-xs font-semibold text-slate-600 uppercase">任务ID</th>
              <th className="px-5 py-3 text-left text-xs font-semibold text-slate-600 uppercase">类型</th>
              <th className="px-5 py-3 text-left text-xs font-semibold text-slate-600 uppercase">状态</th>
              <th className="px-5 py-3 text-left text-xs font-semibold text-slate-600 uppercase">重试次数</th>
              <th className="px-5 py-3 text-left text-xs font-semibold text-slate-600 uppercase">错误信息</th>
              <th className="px-5 py-3 text-left text-xs font-semibold text-slate-600 uppercase">创建时间</th>
              <th className="px-5 py-3 text-left text-xs font-semibold text-slate-600 uppercase">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr>
                <td colSpan={7} className="px-5 py-10 text-center text-slate-500">加载中...</td>
              </tr>
            ) : tasks.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-5 py-10 text-center text-slate-500">暂无任务</td>
              </tr>
            ) : (
              tasks.map((task: any) => {
                const Icon = getStatusIcon(task.status);
                return (
                  <tr key={task.id} className="hover:bg-slate-50">
                    <td className="px-5 py-4">
                      <span className="font-mono text-xs text-slate-600">{task.id.slice(0, 8)}...</span>
                    </td>
                    <td className="px-5 py-4 text-sm text-slate-700">{task.type}</td>
                    <td className="px-5 py-4">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${getStatusColor(task.status)}`}>
                        {Icon && <Icon size={12} />}
                        {TASK_STATUS_LABELS[task.status as keyof typeof TASK_STATUS_LABELS]}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-sm text-slate-600">
                      {task.retryCount} / {task.maxRetries}
                    </td>
                    <td className="px-5 py-4 text-sm text-red-600 max-w-xs truncate">
                      {task.errorMessage || '-'}
                    </td>
                    <td className="px-5 py-4 text-sm text-slate-500">
                      {new Date(task.createdAt).toLocaleString('zh-CN')}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex gap-2">
                        {task.status === 'WAITING_RETRY' && (
                          <button
                            onClick={() => handleRetry(task.id)}
                            className="flex items-center gap-1 px-2 py-1 bg-yellow-100 text-yellow-700 rounded text-xs hover:bg-yellow-200"
                          >
                            <Play size={12} />
                            立即重试
                          </button>
                        )}
                        {task.status === 'WAITING_MANUAL' && (
                          <>
                            <button
                              onClick={() => handleManual(task.id, 'FIX')}
                              className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs hover:bg-green-200"
                            >
                              标记修复
                            </button>
                            <button
                              onClick={() => handleManual(task.id, 'SKIP')}
                              className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs hover:bg-blue-200"
                            >
                              跳过
                            </button>
                            <button
                              onClick={() => handleManual(task.id, 'CANCEL')}
                              className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs hover:bg-red-200"
                            >
                              取消
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
