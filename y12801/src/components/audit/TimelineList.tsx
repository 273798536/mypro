import { ChevronDown, ChevronRight, Filter } from 'lucide-react';
import type { AuditLog } from '@/types';

interface TimelineListProps {
  logs: AuditLog[];
  onFilterChange: (filters: { operator?: string; entityId?: string; dateFrom?: string; dateTo?: string }) => void;
  expandedId: string | null;
  onToggleExpand: (id: string | null) => void;
}

const ENTITY_COLORS: Record<string, string> = {
  batch: 'bg-teal-500',
  review: 'bg-blue-500',
  anomaly: 'bg-amber-500',
};

const ENTITY_LABELS: Record<string, string> = {
  batch: '批次',
  review: '复核',
  anomaly: '异常',
};

function formatTime(iso: string) {
  return new Date(iso).toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
}

export default function TimelineList({
  logs,
  onFilterChange,
  expandedId,
  onToggleExpand,
}: TimelineListProps) {
  const operators = [...new Set(logs.map(l => l.operator))];
  const batches = [...new Set(logs.filter(l => l.entityType === 'batch').map(l => l.entityId))];

  return (
    <div>
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <Filter className="w-4 h-4 text-slate-400" />
        <select
          className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
          defaultValue=""
          onChange={e => onFilterChange({ operator: e.target.value })}
        >
          <option value="">全部操作人</option>
          {operators.map(op => (
            <option key={op} value={op}>{op}</option>
          ))}
        </select>
        <select
          className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
          defaultValue=""
          onChange={e => onFilterChange({ entityId: e.target.value })}
        >
          <option value="">全部批次</option>
          {batches.map(b => (
            <option key={b} value={b}>{b}</option>
          ))}
        </select>
        <input
          type="date"
          className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
          onChange={e => onFilterChange({ dateFrom: e.target.value })}
        />
        <span className="text-slate-400 text-sm">至</span>
        <input
          type="date"
          className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
          onChange={e => onFilterChange({ dateTo: e.target.value })}
        />
      </div>

      <div className="relative pl-6">
        <div className="absolute left-[7px] top-2 bottom-2 w-px bg-slate-200" />

        <div className="space-y-0">
          {logs.map(log => {
            const isExpanded = expandedId === log.id;
            return (
              <div key={log.id} className="relative pb-4">
                <div className={`absolute left-[-21px] top-2 w-3 h-3 rounded-full ${ENTITY_COLORS[log.entityType] || 'bg-slate-400'} ring-2 ring-white`} />

                <button
                  onClick={() => onToggleExpand(isExpanded ? null : log.id)}
                  className="w-full text-left group"
                >
                  <div className="flex items-start gap-2">
                    {isExpanded ? (
                      <ChevronDown className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-slate-400 mt-0.5 shrink-0 group-hover:text-slate-600" />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium text-white ${ENTITY_COLORS[log.entityType] || 'bg-slate-400'}`}>
                          {ENTITY_LABELS[log.entityType] || log.entityType}
                        </span>
                        <span className="text-sm font-medium text-slate-800">{log.action}</span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-slate-500">
                        <span>{log.operator}</span>
                        <span>{formatTime(log.operatedAt)}</span>
                      </div>
                      {!isExpanded && (
                        <p className="text-xs text-slate-400 mt-1 truncate">{log.detail}</p>
                      )}
                    </div>
                  </div>
                </button>

                {isExpanded && (
                  <div className="ml-6 mt-2 bg-slate-50 rounded-lg border border-slate-200 p-4 animate-fade-in">
                    <p className="text-xs text-slate-500 mb-1">{formatDate(log.operatedAt)} {formatTime(log.operatedAt)}</p>
                    <p className="text-sm text-slate-700 mb-3">{log.detail}</p>
                    {log.beforeData && log.afterData && (
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b border-slate-200">
                              <th className="px-3 py-1.5 text-left text-xs font-medium text-slate-500">字段</th>
                              <th className="px-3 py-1.5 text-left text-xs font-medium text-slate-500">变更前</th>
                              <th className="px-3 py-1.5 text-left text-xs font-medium text-slate-500">变更后</th>
                            </tr>
                          </thead>
                          <tbody>
                            {Object.keys({ ...log.beforeData, ...log.afterData }).map(key => {
                              const oldVal = String(log.beforeData?.[key] ?? '-');
                              const newVal = String(log.afterData?.[key] ?? '-');
                              const changed = oldVal !== newVal;
                              return (
                                <tr key={key} className="border-b border-slate-100">
                                  <td className="px-3 py-1.5 text-slate-600 text-xs">{key}</td>
                                  <td className={`px-3 py-1.5 text-xs ${changed ? 'diff-old line-through' : 'text-slate-600'}`}>{oldVal}</td>
                                  <td className={`px-3 py-1.5 text-xs ${changed ? 'diff-new underline' : 'text-slate-600'}`}>{newVal}</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
