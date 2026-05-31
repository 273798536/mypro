import React, { useState } from 'react';
import { History, Plus, Pencil, Trash2, ChevronDown, ChevronRight, GitCompare } from 'lucide-react';
import { HistoryRecord } from '../types';

interface HistoryTimelineProps {
  records: HistoryRecord[];
}

const typeConfig = {
  create: { icon: <Plus size={14} />, color: 'text-emerald-400', bgColor: 'bg-emerald-900/40', label: '创建' },
  update: { icon: <Pencil size={14} />, color: 'text-yellow-400', bgColor: 'bg-yellow-900/40', label: '修改' },
  delete: { icon: <Trash2 size={14} />, color: 'text-red-400', bgColor: 'bg-red-900/40', label: '删除' },
};

const entityConfig = {
  seedPoint: { label: '种子点' },
  vectorField: { label: '向量场' },
};

const HistoryTimeline: React.FC<HistoryTimelineProps> = ({ records }) => {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const formatValue = (value: unknown): string => {
    if (value === null) return 'null';
    if (value === undefined) return 'undefined';
    if (typeof value === 'object') {
      return JSON.stringify(value, null, 2);
    }
    return String(value);
  };

  const findChanges = (
    before: Record<string, unknown> | null,
    after: Record<string, unknown> | null
  ): { key: string; oldVal: string; newVal: string }[] => {
    const changes: { key: string; oldVal: string; newVal: string }[] = [];
    if (!before || !after) return changes;

    const allKeys = new Set([...Object.keys(before), ...Object.keys(after)]);
    allKeys.forEach((key) => {
      const oldVal = formatValue(before[key]);
      const newVal = formatValue(after[key]);
      if (oldVal !== newVal) {
        changes.push({ key, oldVal, newVal });
      }
    });
    return changes;
  };

  return (
    <div className="bg-slate-900/80 backdrop-blur-sm rounded-lg p-4 h-full flex flex-col border border-slate-700">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-cyan-400 flex items-center gap-2">
          <History size={18} />
          历史记录
        </h2>
        <span className="text-xs text-slate-400 bg-slate-800 px-2 py-1 rounded">
          {records.length} 条记录
        </span>
      </div>

      <div className="flex-1 overflow-y-auto pr-1">
        {records.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-slate-500">
            <History size={32} className="mb-2 opacity-50" />
            <p className="text-sm">暂无历史记录</p>
          </div>
        ) : (
          <div className="relative">
            <div className="absolute left-4 top-2 bottom-2 w-0.5 bg-slate-700" />

            {records.map((record, index) => {
              const isExpanded = expandedIds.has(record.id);
              const changes = findChanges(record.before, record.after);

              return (
                <div key={record.id} className="relative pl-10 pb-4">
                  <div
                    className={`absolute left-2 w-5 h-5 rounded-full flex items-center justify-center ${typeConfig[record.type].bgColor} ring-2 ring-slate-900`}
                  >
                    <span className={typeConfig[record.type].color}>
                      {typeConfig[record.type].icon}
                    </span>
                  </div>

                  <div
                    className="bg-slate-800/50 rounded-lg border border-slate-700 hover:border-slate-600 transition-colors cursor-pointer"
                    onClick={() => toggleExpand(record.id)}
                  >
                    <div className="p-3">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <span className={`text-sm font-medium ${typeConfig[record.type].color}`}>
                            {typeConfig[record.type].label}
                          </span>
                          <span className="text-xs text-slate-400 bg-slate-700/50 px-2 py-0.5 rounded">
                            {entityConfig[record.entityType].label}
                          </span>
                        </div>
                        {isExpanded ? (
                          <ChevronDown size={14} className="text-slate-400" />
                        ) : (
                          <ChevronRight size={14} className="text-slate-400" />
                        )}
                      </div>

                      <p className="text-xs text-slate-400 mb-1">
                        {new Date(record.timestamp).toLocaleString()}
                      </p>

                      {record.remark && (
                        <p className="text-xs text-cyan-300 bg-cyan-900/20 px-2 py-1 rounded mt-2">
                          备注: {record.remark}
                        </p>
                      )}
                    </div>

                    {isExpanded && changes.length > 0 && (
                      <div className="border-t border-slate-700 p-3">
                        <div className="flex items-center gap-2 mb-2">
                          <GitCompare size={14} className="text-yellow-400" />
                          <span className="text-xs text-slate-300">变更对比</span>
                        </div>
                        <div className="space-y-2">
                          {changes.map((change) => (
                            <div key={change.key} className="bg-slate-900/50 rounded p-2">
                              <p className="text-xs text-slate-400 mb-1 font-mono">{change.key}</p>
                              <div className="grid grid-cols-2 gap-2 text-xs">
                                <div className="bg-red-900/30 border border-red-800 rounded p-1.5">
                                  <p className="text-red-400 text-xs mb-0.5">之前</p>
                                  <pre className="text-red-300 text-xs overflow-x-auto whitespace-pre-wrap break-all">
                                    {change.oldVal}
                                  </pre>
                                </div>
                                <div className="bg-emerald-900/30 border border-emerald-800 rounded p-1.5">
                                  <p className="text-emerald-400 text-xs mb-0.5">之后</p>
                                  <pre className="text-emerald-300 text-xs overflow-x-auto whitespace-pre-wrap break-all">
                                    {change.newVal}
                                  </pre>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default HistoryTimeline;
