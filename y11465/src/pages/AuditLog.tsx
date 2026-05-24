import { useEffect, useState } from 'react';
import { Search, Clock, User, GitCompare } from 'lucide-react';
import api from '../services/api';

export default function AuditLog() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({ entityType: '', operatedBy: '' });

  useEffect(() => {
    loadLogs();
  }, [filter]);

  const loadLogs = async () => {
    setLoading(true);
    try {
      const result: any = await api.audit.list(filter as any);
      setLogs(result.data);
    } finally {
      setLoading(false);
    }
  };

  const getActionColor = (action: string) => {
    if (action.includes('CREATE')) return 'bg-green-100 text-green-700';
    if (action.includes('UPDATE') || action.includes('MODIFY')) return 'bg-blue-100 text-blue-700';
    if (action.includes('DELETE') || action.includes('CANCEL')) return 'bg-red-100 text-red-700';
    return 'bg-slate-100 text-slate-700';
  };

  const formatValue = (value: any) => {
    if (typeof value === 'object') return JSON.stringify(value, null, 2);
    return String(value);
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">审计追踪</h1>
          <p className="text-slate-500 mt-1">完整记录所有操作历史，谁在什么时候改了什么</p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md p-4 mb-6">
        <div className="flex gap-4 items-center">
          <div className="flex-1 relative">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="搜索操作人..."
              className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={filter.operatedBy}
              onChange={(e) => setFilter({ ...filter, operatedBy: e.target.value })}
            />
          </div>
          <select
            className="px-4 py-2 border border-slate-200 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={filter.entityType}
            onChange={(e) => setFilter({ ...filter, entityType: e.target.value })}
          >
            <option value="">全部类型</option>
            <option value="batch">批次</option>
            <option value="document">单据</option>
            <option value="task">任务</option>
          </select>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md">
        {loading ? (
          <div className="p-10 text-center text-slate-500">加载中...</div>
        ) : logs.length === 0 ? (
          <div className="p-10 text-center text-slate-500">暂无操作记录</div>
        ) : (
          <div className="divide-y divide-slate-100">
            {logs.map((log) => (
              <div key={log.id} className="p-5 hover:bg-slate-50">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${getActionColor(log.action)}`}>
                      {log.action}
                    </span>
                    <span className="text-sm text-slate-500">
                      {log.entityType === 'batch' ? '批次' : log.entityType === 'document' ? '单据' : '任务'}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-slate-500">
                    <span className="flex items-center gap-1">
                      <User size={14} />
                      {log.operatedBy}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock size={14} />
                      {new Date(log.createdAt).toLocaleString('zh-CN')}
                    </span>
                  </div>
                </div>

                {log.reason && (
                  <p className="text-sm text-amber-700 bg-amber-50 px-3 py-2 rounded mb-3">
                    <strong>原因：</strong>{log.reason}
                  </p>
                )}

                {(log.beforeData || log.afterData) && (
                  <div className="mt-4 grid grid-cols-2 gap-4">
                    {log.beforeData && (
                      <div className="bg-red-50 p-3 rounded">
                        <p className="text-xs font-medium text-red-700 mb-2 flex items-center gap-1">
                          <GitCompare size={14} />
                          修改前
                        </p>
                        <pre className="text-xs text-red-600 whitespace-pre-wrap overflow-auto max-h-32">
                          {formatValue(log.beforeData)}
                        </pre>
                      </div>
                    )}
                    {log.afterData && (
                      <div className="bg-green-50 p-3 rounded">
                        <p className="text-xs font-medium text-green-700 mb-2 flex items-center gap-1">
                          <GitCompare size={14} />
                          修改后
                        </p>
                        <pre className="text-xs text-green-600 whitespace-pre-wrap overflow-auto max-h-32">
                          {formatValue(log.afterData)}
                        </pre>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
