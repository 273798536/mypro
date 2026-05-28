import { X, Clock, RotateCcw, Filter } from 'lucide-react';
import { useNetworkStore } from '../store/networkStore';
import { AuditLogEntry } from '../types';

interface HistoryPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export function HistoryPanel({ isOpen, onClose }: HistoryPanelProps) {
  const { currentScenario } = useNetworkStore();
  const { auditLog } = currentScenario;

  const actionLabels: Record<AuditLogEntry['action'], string> = {
    create: '创建',
    update: '更新',
    delete: '删除',
    import: '导入',
    analyze: '分析'
  };

  const actionColors: Record<AuditLogEntry['action'], string> = {
    create: 'text-green-600 bg-green-50',
    update: 'text-blue-600 bg-blue-50',
    delete: 'text-red-600 bg-red-50',
    import: 'text-purple-600 bg-purple-50',
    analyze: 'text-amber-600 bg-amber-50'
  };

  const targetTypeLabels: Record<AuditLogEntry['targetType'], string> = {
    node: '节点',
    edge: '线路',
    demand: '供需点',
    scenario: '情景'
  };

  const formatValue = (value: any): string => {
    if (value === null || value === undefined) return '-';
    if (typeof value === 'object') return JSON.stringify(value).slice(0, 30);
    return String(value);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-y-0 right-0 w-96 bg-white shadow-2xl z-50 flex flex-col border-l border-slate-200">
      <div className="flex items-center justify-between p-4 border-b border-slate-200">
        <div className="flex items-center gap-2">
          <Clock className="w-5 h-5 text-slate-500" />
          <h2 className="text-lg font-semibold text-slate-800">修改历史</h2>
        </div>
        <div className="flex items-center gap-2">
          <button className="p-1 hover:bg-slate-100 rounded-lg">
            <Filter className="w-4 h-4 text-slate-500" />
          </button>
          <button
            onClick={onClose}
            className="p-1 hover:bg-slate-100 rounded-lg"
          >
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>
      </div>

      <div className="p-4 border-b border-slate-100 bg-slate-50">
        <div className="text-sm text-slate-600">
          共 <span className="font-semibold">{auditLog.length}</span> 条记录
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {auditLog.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-slate-400">
            <RotateCcw className="w-12 h-12 mb-3 opacity-50" />
            <p className="text-sm">暂无修改记录</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {[...auditLog].reverse().map((log) => (
              <div key={log.id} className="p-4 hover:bg-slate-50 transition-colors">
                <div className="flex items-start gap-3">
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${actionColors[log.action]}`}>
                    {actionLabels[log.action]}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-slate-700">
                      {targetTypeLabels[log.targetType]}: {log.targetId.slice(0, 8)}...
                    </div>
                    {log.field && (
                      <div className="mt-1 text-xs text-slate-500">
                        <span className="font-medium">{log.field}</span>: 
                        <span className="line-through text-red-500 mx-1">{formatValue(log.oldValue)}</span>
                        <span className="text-green-600">→ {formatValue(log.newValue)}</span>
                      </div>
                    )}
                    <div className="mt-2 flex items-center justify-between text-xs text-slate-400">
                      <span>{new Date(log.timestamp).toLocaleString()}</span>
                      {log.source && (
                        <span className="bg-slate-100 px-2 py-0.5 rounded">
                          来源: {log.source}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
