import { useState } from 'react';
import { cn } from '@/lib/utils';
import type { SlowQueryLog } from '@/types';
import { formatDateTime, formatNumber } from '@/data/mockData';
import { Clock, Plus, Send, Database } from 'lucide-react';

interface SlowQueryFormProps {
  logs: SlowQueryLog[];
  onAddLog: (log: {
    queryId: string;
    executionTime: number;
    startTime: string;
    sqlContent: string;
    operator: string;
  }) => void;
}

export function SlowQueryForm({ logs, onAddLog }: SlowQueryFormProps) {
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    queryId: '',
    executionTime: '',
    startTime: '',
    sqlContent: '',
    operator: 'DBA-CurrentUser',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.queryId || !formData.executionTime || !formData.startTime || !formData.sqlContent) {
      return;
    }
    onAddLog({
      queryId: formData.queryId,
      executionTime: parseFloat(formData.executionTime),
      startTime: formData.startTime,
      sqlContent: formData.sqlContent,
      operator: formData.operator,
    });
    setFormData({
      queryId: '',
      executionTime: '',
      startTime: '',
      sqlContent: '',
      operator: 'DBA-CurrentUser',
    });
    setShowForm(false);
  };

  const sortedLogs = [...logs].sort(
    (a, b) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime()
  );

  return (
    <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
      <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-orange-100 rounded-lg">
            <Clock className="w-5 h-5 text-orange-600" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-900">慢查询日志补录</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              补录后将重新计算归档状态，报告也会同步更新
            </p>
          </div>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className={cn(
            'inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md',
            'border border-slate-200 text-slate-700',
            'hover:bg-slate-100 transition-colors'
          )}
        >
          <Plus className="w-3.5 h-3.5" />
          补录日志
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="p-4 border-b border-slate-200 bg-orange-50/30">
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-slate-500 mb-1.5">查询ID</label>
                <input
                  type="text"
                  value={formData.queryId}
                  onChange={(e) => setFormData({ ...formData, queryId: e.target.value })}
                  placeholder="如：QRY-20260618-001"
                  className={cn(
                    'w-full px-3 py-2 text-sm border border-slate-200 rounded-md',
                    'bg-white focus:outline-none focus:ring-2 focus:ring-orange-200'
                  )}
                />
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1.5">执行时间(秒)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.executionTime}
                  onChange={(e) => setFormData({ ...formData, executionTime: e.target.value })}
                  placeholder="如：12.5"
                  className={cn(
                    'w-full px-3 py-2 text-sm border border-slate-200 rounded-md',
                    'bg-white focus:outline-none focus:ring-2 focus:ring-orange-200'
                  )}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-slate-500 mb-1.5">开始时间</label>
                <input
                  type="datetime-local"
                  value={formData.startTime}
                  onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                  className={cn(
                    'w-full px-3 py-2 text-sm border border-slate-200 rounded-md',
                    'bg-white focus:outline-none focus:ring-2 focus:ring-orange-200'
                  )}
                />
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1.5">操作人</label>
                <input
                  type="text"
                  value={formData.operator}
                  onChange={(e) => setFormData({ ...formData, operator: e.target.value })}
                  className={cn(
                    'w-full px-3 py-2 text-sm border border-slate-200 rounded-md',
                    'bg-white focus:outline-none focus:ring-2 focus:ring-orange-200'
                  )}
                />
              </div>
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1.5">SQL内容</label>
              <textarea
                value={formData.sqlContent}
                onChange={(e) => setFormData({ ...formData, sqlContent: e.target.value })}
                placeholder="SELECT * FROM payments WHERE created_at BETWEEN ..."
                className={cn(
                  'w-full px-3 py-2 text-sm border border-slate-200 rounded-md font-mono',
                  'bg-white focus:outline-none focus:ring-2 focus:ring-orange-200',
                  'resize-none min-h-[80px]'
                )}
              />
            </div>
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className={cn(
                  'px-4 py-2 text-sm text-slate-600 rounded-md',
                  'hover:bg-slate-100 transition-colors'
                )}
              >
                取消
              </button>
              <button
                type="submit"
                disabled={
                  !formData.queryId ||
                  !formData.executionTime ||
                  !formData.startTime ||
                  !formData.sqlContent
                }
                className={cn(
                  'inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-md',
                  'bg-orange-600 text-white',
                  'hover:bg-orange-700 transition-colors',
                  'disabled:opacity-50 disabled:cursor-not-allowed'
                )}
              >
                <Send className="w-3.5 h-3.5" />
                补录并重新计算
              </button>
            </div>
          </div>
        </form>
      )}

      {logs.length === 0 ? (
        <div className="p-8 text-center">
          <div className="text-slate-300 mb-2">
            <Database className="w-10 h-10 mx-auto" />
          </div>
          <p className="text-sm text-slate-500">暂无慢查询日志</p>
          <p className="text-xs text-slate-400 mt-1">
            如分页顺序异常或数据缺失，可在此补录相关慢查询日志
          </p>
        </div>
      ) : (
        <div className="divide-y divide-slate-100">
          {sortedLogs.map((log) => (
            <div key={log.id} className="p-4">
              <div className="flex items-start justify-between gap-4 mb-2">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded">
                    {log.queryId}
                  </span>
                  <span
                    className={cn(
                      'font-mono text-xs px-2 py-0.5 rounded',
                      log.executionTime > 10
                        ? 'bg-red-100 text-red-700'
                        : 'bg-amber-100 text-amber-700'
                    )}
                  >
                    {log.executionTime}s
                  </span>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-xs text-slate-500">操作人：{log.operator}</p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {formatDateTime(log.recordedAt)}
                  </p>
                </div>
              </div>
              <div className="bg-slate-900 rounded-md p-3 overflow-x-auto">
                <pre className="text-xs text-slate-100 font-mono whitespace-pre-wrap break-all">
                  {log.sqlContent}
                </pre>
              </div>
              <div className="mt-2 flex items-center gap-4 text-xs text-slate-500">
                <span>开始时间：{formatDateTime(log.startTime)}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
