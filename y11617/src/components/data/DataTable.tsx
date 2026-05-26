import React, { useState, useMemo } from 'react';
import { Edit3, Trash2, Clock, Search, Filter } from 'lucide-react';
import { useCashflowStore } from '../../store/useCashflowStore';
import {
  CASHFLOW_TYPE_LABELS,
  PRIORITY_LABELS,
  TYPE_COLORS,
  PRIORITY_COLORS
} from '../../types';
import type { CashflowEntry, CashflowType, Priority } from '../../types';
import { format, parseISO } from 'date-fns';

interface DataTableProps {
  onEditEntry: (entry: CashflowEntry) => void;
}

export default function DataTable({ onEditEntry }: DataTableProps) {
  const currentScenario = useCashflowStore(state => state.currentScenario);
  const deleteEntry = useCashflowStore(state => state.deleteEntry);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<CashflowType | 'all'>('all');
  const [filterPriority, setFilterPriority] = useState<Priority | 'all'>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const entries = currentScenario?.entries || [];

  const filteredEntries = useMemo(() => {
    return entries.filter(entry => {
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        if (
          !entry.description.toLowerCase().includes(term) &&
          !entry.source.toLowerCase().includes(term)
        ) {
          return false;
        }
      }
      if (filterType !== 'all' && entry.type !== filterType) return false;
      if (filterPriority !== 'all' && entry.priority !== filterPriority) return false;
      return true;
    }).sort((a, b) => a.date.localeCompare(b.date));
  }, [entries, searchTerm, filterType, filterPriority]);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="p-4 border-b border-gray-100">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-800">数据列表</h3>
          <span className="text-sm text-gray-500">共 {filteredEntries.length} 条</span>
        </div>

        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-48">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="搜索描述或来源..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary"
            />
          </div>

          <select
            value={filterType}
            onChange={e => setFilterType(e.target.value as CashflowType | 'all')}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary"
          >
            <option value="all">全部类型</option>
            {Object.entries(CASHFLOW_TYPE_LABELS).map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>

          <select
            value={filterPriority}
            onChange={e => setFilterPriority(e.target.value as Priority | 'all')}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary"
          >
            <option value="all">全部优先级</option>
            {Object.entries(PRIORITY_LABELS).map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                日期
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                类型
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                描述
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                金额
              </th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                优先级
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                来源
              </th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                状态
              </th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                操作
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filteredEntries.map(entry => (
              <React.Fragment key={entry.id}>
                <tr
                  className={`hover:bg-gray-50 transition-colors ${
                    entry.isDelayed ? 'bg-yellow-50/50' : ''
                  }`}
                >
                  <td className="px-4 py-3 text-sm text-gray-900 font-mono">
                    {entry.date}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`px-2 py-0.5 rounded text-xs border ${TYPE_COLORS[entry.type]}`}
                    >
                      {CASHFLOW_TYPE_LABELS[entry.type]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900 max-w-48 truncate">
                    {entry.description || '-'}
                  </td>
                  <td
                    className={`px-4 py-3 text-sm font-mono font-medium text-right ${
                      entry.direction === 'in' ? 'text-green-600' : 'text-red-600'
                    }`}
                  >
                    {entry.direction === 'in' ? '+' : '-'}
                    {entry.amount.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span
                      className={`px-2 py-0.5 rounded text-xs ${PRIORITY_COLORS[entry.priority]}`}
                    >
                      {PRIORITY_LABELS[entry.priority]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {entry.source}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {entry.isDelayed ? (
                      <span className="inline-flex items-center gap-1 text-xs text-yellow-700">
                        <Clock size={12} />
                        延期
                      </span>
                    ) : (
                      <span className="text-xs text-green-600">正常</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        onClick={() => setExpandedId(expandedId === entry.id ? null : entry.id)}
                        className="p-1 hover:bg-gray-100 rounded transition-colors text-gray-500 hover:text-gray-700"
                        title="历史"
                      >
                        <Clock size={14} />
                      </button>
                      <button
                        onClick={() => onEditEntry(entry)}
                        className="p-1 hover:bg-gray-100 rounded transition-colors text-gray-500 hover:text-brand-primary"
                        title="编辑"
                      >
                        <Edit3 size={14} />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm('确定删除这条数据？')) {
                            deleteEntry(entry.id);
                          }
                        }}
                        className="p-1 hover:bg-red-50 rounded transition-colors text-gray-500 hover:text-red-500"
                        title="删除"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
                {expandedId === entry.id && entry.revisionHistory.length > 0 && (
                  <tr className="bg-gray-50">
                    <td colSpan={8} className="px-4 py-3">
                      <div className="text-xs text-gray-600">
                        <div className="font-medium mb-2">修正历史 ({entry.revisionHistory.length})</div>
                        <div className="space-y-1 pl-3 border-l-2 border-gray-300">
                          {entry.revisionHistory.slice().reverse().map((rev, idx) => (
                            <div key={idx} className="text-xs">
                              <span className="text-gray-400">
                                {format(parseISO(rev.timestamp), 'yyyy-MM-dd HH:mm')}
                              </span>
                              {' - '}
                              <span className="text-gray-600">{rev.field}</span>
                              {rev.reason && <span className="text-gray-400"> ({rev.reason})</span>}
                            </div>
                          ))}
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>

      {filteredEntries.length === 0 && (
        <div className="py-12 text-center text-gray-500">
          <Filter size={32} className="mx-auto mb-2 text-gray-300" />
          <p>没有匹配的数据</p>
        </div>
      )}
    </div>
  );
}