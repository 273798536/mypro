import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTaskStore } from '../store/useTaskStore';
import { ReviewLevel, ResultUsability } from '@puzzle/shared';
import StatusBadge from '../components/StatusBadge';
import UsabilityBadge from '../components/UsabilityBadge';

export default function TaskList() {
  const navigate = useNavigate();
  const { tasks, loading, levels, fetchTasks, fetchLevels, createTask } = useTaskStore();
  const [showModal, setShowModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newLevelId, setNewLevelId] = useState('');
  const [levelFilter, setLevelFilter] = useState<string>('all');

  useEffect(() => {
    fetchTasks();
    fetchLevels();
  }, [fetchTasks, fetchLevels]);

  const handleCreateTask = async () => {
    if (!newTitle.trim()) return;
    const taskId = await createTask({
      title: newTitle,
      levelId: newLevelId || undefined,
    });
    if (taskId) {
      setShowModal(false);
      setNewTitle('');
      setNewLevelId('');
      navigate(`/tasks/${taskId}`);
    }
  };

  const filteredTasks = tasks.filter((task) => {
    if (levelFilter === 'all') return true;
    return task.title.includes(levelFilter);
  });

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString('zh-CN');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">任务列表</h2>
          <p className="text-slate-500 mt-1">管理和审核几何拼图任务</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          新建任务
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200">
        <div className="p-4 border-b border-slate-200 flex items-center gap-4">
          <label className="text-sm font-medium text-slate-700">关卡筛选：</label>
          <select
            value={levelFilter}
            onChange={(e) => setLevelFilter(e.target.value)}
            className="px-3 py-1.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">全部关卡</option>
            {levels.map((level: ReviewLevel) => (
              <option key={level.id} value={level.name}>
                {level.name}
              </option>
            ))}
          </select>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-500">
            <svg className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-500" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            加载中...
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">标题</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">状态</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">可用性</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">负责人</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">更新时间</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">未同步</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredTasks.map((task) => (
                  <tr
                    key={task.id}
                    className="hover:bg-slate-50 cursor-pointer transition-colors"
                    onClick={() => navigate(`/tasks/${task.id}`)}
                  >
                    <td className="px-6 py-4">
                      <div className="font-medium text-slate-800">{task.title}</div>
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge status={task.status} />
                    </td>
                    <td className="px-6 py-4">
                      {task.usability ? (
                        <UsabilityBadge type={task.usability as ResultUsability} />
                      ) : (
                        <span className="text-slate-400 text-sm">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">{task.assignee}</td>
                    <td className="px-6 py-4 text-sm text-slate-500">{formatDate(task.updatedAt)}</td>
                    <td className="px-6 py-4">
                      {task.hasUnsyncedChanges ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-700">
                          是
                        </span>
                      ) : (
                        <span className="text-slate-400 text-sm">否</span>
                      )}
                    </td>
                    <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => navigate(`/tasks/${task.id}`)}
                          className="px-3 py-1 text-sm text-blue-600 hover:bg-blue-50 rounded transition-colors"
                        >
                          继续审核
                        </button>
                        <Link
                          to={`/tasks/${task.id}/settlement`}
                          className="px-3 py-1 text-sm text-slate-600 hover:bg-slate-50 rounded transition-colors"
                        >
                          查看结算
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredTasks.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-slate-500">
                      暂无任务数据
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl">
            <h3 className="text-lg font-semibold text-slate-800 mb-4">新建任务</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">任务标题</label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="请输入任务标题"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">选择关卡</label>
                <select
                  value={newLevelId}
                  onChange={(e) => setNewLevelId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">不指定关卡</option>
                  {levels.map((level: ReviewLevel) => (
                    <option key={level.id} value={level.id}>
                      {level.name} - {level.description}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleCreateTask}
                disabled={!newTitle.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
