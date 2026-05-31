import { useState, useEffect } from 'react';
import { Search, Clock, User, Music, FileText, Settings, Download, Trash2, Plus, CheckCircle } from 'lucide-react';
import { useStore } from '../store/useStore';
import Loading from '../components/Loading';
import Toast from '../components/Toast';
import type { AuditLog } from '../../shared/types';
import { cn, formatDate } from '../lib/utils';

const ACTION_LABELS: Record<string, string> = {
  create: '创建',
  update: '更新',
  delete: '删除',
  import: '导入',
  match: '匹配',
  resolve: '解决冲突',
  review: '审核',
  export: '导出',
};

const ENTITY_TYPE_LABELS: Record<string, string> = {
  song: '歌曲',
  match_result: '匹配结果',
  conflict: '冲突',
  review: '审核',
  copyright: '版权',
};

const ACTION_ICONS: Record<string, typeof Music> = {
  create: Plus,
  update: Settings,
  delete: Trash2,
  import: Download,
  match: Music,
  resolve: CheckCircle,
  review: FileText,
  export: Download,
};

const ACTION_COLORS: Record<string, string> = {
  create: 'text-emerald-600 bg-emerald-50',
  update: 'text-blue-600 bg-blue-50',
  delete: 'text-red-600 bg-red-50',
  import: 'text-purple-600 bg-purple-50',
  match: 'text-amber-600 bg-amber-50',
  resolve: 'text-orange-600 bg-orange-50',
  review: 'text-indigo-600 bg-indigo-50',
  export: 'text-teal-600 bg-teal-50',
};

export default function History() {
  const {
    auditLogs,
    loading,
    error,
    pagination,
    fetchAuditLogs,
    setError,
  } = useStore();

  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [entityTypeFilter, setEntityTypeFilter] = useState('');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  useEffect(() => {
    fetchAuditLogs({
      action: actionFilter || undefined,
      entityType: entityTypeFilter || undefined,
    });
  }, [actionFilter, entityTypeFilter]);

  const filteredLogs = auditLogs.filter(log => {
    if (!search) return true;
    const details = log.details?.toLowerCase() || '';
    const user = log.userId?.toLowerCase() || '';
    const entityId = log.entityId?.toLowerCase() || '';
    return details.includes(search.toLowerCase()) 
      || user.includes(search.toLowerCase())
      || entityId.includes(search.toLowerCase());
  });

  const getActionIcon = (action: string) => {
    const Icon = ACTION_ICONS[action] || FileText;
    return <Icon className="w-4 h-4" />;
  };

  const getActionColor = (action: string) => {
    return ACTION_COLORS[action] || 'text-slate-600 bg-slate-50';
  };

  return (
    <div className="p-6">
      {toast && (
        <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
      )}
      {error && <Toast message={error} type="error" onClose={() => setError(null)} />}

      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">历史记录</h1>
          <p className="text-slate-500 mt-1">查看所有操作日志和变更历史</p>
        </div>
        <div className="text-sm text-slate-500">
          共 <span className="font-semibold text-slate-700">{pagination.auditLogs.total}</span> 条记录
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-100 mb-6">
        <div className="p-4 border-b border-slate-100">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px] max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                placeholder="搜索操作内容、用户..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <select
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              className="px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
            >
              <option value="">全部操作</option>
              {Object.entries(ACTION_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>

            <select
              value={entityTypeFilter}
              onChange={(e) => setEntityTypeFilter(e.target.value)}
              className="px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
            >
              <option value="">全部类型</option>
              {Object.entries(ENTITY_TYPE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>
        </div>

        {loading && filteredLogs.length === 0 ? (
          <div className="p-12">
            <Loading text="加载中..." />
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Clock className="w-8 h-8 text-slate-400" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900 mb-2">暂无操作记录</h3>
            <p className="text-slate-500">操作后记录会显示在这里</p>
          </div>
        ) : (
          <>
            <div className="divide-y divide-slate-100">
              {filteredLogs.map((log, index) => (
                <div
                  key={log.id}
                  className={cn(
                    'p-4 hover:bg-slate-50 transition-colors',
                    index % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'
                  )}
                >
                  <div className="flex items-start gap-4">
                    <div className={cn(
                      'w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0',
                      getActionColor(log.action)
                    )}>
                      {getActionIcon(log.action)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <span className="font-medium text-slate-900">
                          {ACTION_LABELS[log.action] || log.action}
                        </span>
                        <span className="text-slate-300">·</span>
                        <span className="text-sm text-slate-500">
                          {ENTITY_TYPE_LABELS[log.entityType] || log.entityType}
                        </span>
                        <span className="text-slate-300">·</span>
                        <span className="text-xs font-mono text-slate-400">
                          {log.entityId.slice(0, 8)}
                        </span>
                      </div>
                      <p className="text-sm text-slate-600 mb-1">{log.details}</p>
                      <div className="flex items-center gap-4 text-xs text-slate-400">
                        <span className="inline-flex items-center gap-1">
                          <User className="w-3 h-3" />
                          {log.userId}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatDate(log.timestamp)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between">
              <p className="text-sm text-slate-500">
                共 {pagination.auditLogs.total} 条记录，第 {pagination.auditLogs.page} /{' '}
                {pagination.auditLogs.totalPages} 页
              </p>
              <div className="flex items-center gap-2">
                <button
                  disabled={pagination.auditLogs.page <= 1}
                  onClick={() =>
                    fetchAuditLogs({
                      page: pagination.auditLogs.page - 1,
                      action: actionFilter || undefined,
                      entityType: entityTypeFilter || undefined,
                    })
                  }
                  className="px-3 py-1.5 border border-slate-200 rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 transition-colors"
                >
                  上一页
                </button>
                <button
                  disabled={pagination.auditLogs.page >= pagination.auditLogs.totalPages}
                  onClick={() =>
                    fetchAuditLogs({
                      page: pagination.auditLogs.page + 1,
                      action: actionFilter || undefined,
                      entityType: entityTypeFilter || undefined,
                    })
                  }
                  className="px-3 py-1.5 border border-slate-200 rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 transition-colors"
                >
                  下一页
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
