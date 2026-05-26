import { format, parseISO } from 'date-fns';
import { X, Clock, AlertTriangle, Edit3, Trash2 } from 'lucide-react';
import { useCashflowStore } from '../../store/useCashflowStore';
import StressBadge from '../common/StressBadge';
import {
  CASHFLOW_TYPE_LABELS,
  PRIORITY_LABELS,
  TYPE_COLORS,
  PRIORITY_COLORS
} from '../../types';
import type { CashflowEntry } from '../../types';
import { useState } from 'react';

interface DayDetailDrawerProps {
  date: Date;
  onClose: () => void;
  onEditEntry: (entry: CashflowEntry) => void;
}

export default function DayDetailDrawer({ date, onClose, onEditEntry }: DayDetailDrawerProps) {
  const dateStr = format(date, 'yyyy-MM-dd');
  const dailySummary = useCashflowStore(state => state.getDailySummary(dateStr));
  const deleteEntry = useCashflowStore(state => state.deleteEntry);
  const markAsDelayed = useCashflowStore(state => state.markAsDelayed);
  const [showHistoryId, setShowHistoryId] = useState<string | null>(null);

  if (!dailySummary) {
    return (
      <div className="fixed inset-0 bg-black/30 z-50" onClick={onClose}>
        <div className="absolute right-0 top-0 h-full w-96 bg-white shadow-xl p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">{format(date, 'yyyy年MM月dd日')}</h3>
            <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
              <X size={18} />
            </button>
          </div>
          <p className="text-gray-500 text-sm">当日无现金流数据</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/30 z-50" onClick={onClose}>
      <div
        className="absolute right-0 top-0 h-full w-96 bg-white shadow-xl overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-white border-b border-gray-100 p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-gray-800">{format(date, 'yyyy年MM月dd日')}</h3>
            <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded transition-colors">
              <X size={18} />
            </button>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center mb-3">
            <div className="bg-green-50 rounded-lg p-2">
              <div className="text-xs text-green-600">流入</div>
              <div className="font-mono font-semibold text-green-700">
                {dailySummary.inflow.toLocaleString()}
              </div>
            </div>
            <div className="bg-red-50 rounded-lg p-2">
              <div className="text-xs text-red-600">流出</div>
              <div className="font-mono font-semibold text-red-700">
                {dailySummary.outflow.toLocaleString()}
              </div>
            </div>
            <div className="bg-blue-50 rounded-lg p-2">
              <div className="text-xs text-blue-600">余额</div>
              <div className="font-mono font-semibold text-blue-700">
                {dailySummary.balance.toLocaleString()}
              </div>
            </div>
          </div>

          {dailySummary.stressLevel !== 'none' && (
            <StressBadge
              level={dailySummary.stressLevel}
              reasons={dailySummary.stressReasons}
            />
          )}
        </div>

        <div className="p-4 space-y-3">
          <div className="text-sm font-medium text-gray-600 mb-2">
            当日条目 ({dailySummary.entries.length})
          </div>

          {dailySummary.entries.map(entry => (
            <div
              key={entry.id}
              className={`border rounded-lg p-3 transition-all ${
                entry.isDelayed ? 'border-yellow-300 bg-yellow-50/50' : 'border-gray-200'
              }`}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span
                    className={`px-2 py-0.5 rounded text-xs border ${TYPE_COLORS[entry.type]}`}
                  >
                    {CASHFLOW_TYPE_LABELS[entry.type]}
                  </span>
                  <span
                    className={`px-1.5 py-0.5 rounded text-xs ${PRIORITY_COLORS[entry.priority]}`}
                  >
                    {PRIORITY_LABELS[entry.priority]}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => onEditEntry(entry)}
                    className="p-1 hover:bg-gray-100 rounded transition-colors text-gray-500"
                    title="编辑"
                  >
                    <Edit3 size={14} />
                  </button>
                  <button
                    onClick={() => deleteEntry(entry.id)}
                    className="p-1 hover:bg-red-50 rounded transition-colors text-gray-500 hover:text-red-500"
                    title="删除"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              <div className="text-sm font-medium text-gray-800 mb-1">
                {entry.description || '未命名'}
              </div>

              <div className="flex items-center justify-between text-sm">
                <span
                  className={`font-mono font-semibold ${
                    entry.direction === 'in' ? 'text-green-600' : 'text-red-600'
                  }`}
                >
                  {entry.direction === 'in' ? '+' : '-'}
                  {entry.amount.toLocaleString()}
                </span>
                <span className="text-xs text-gray-400">来源: {entry.source}</span>
              </div>

              {entry.isDelayed && (
                <div className="mt-2 p-2 bg-yellow-50 rounded text-xs text-yellow-800">
                  <div className="flex items-center gap-1 mb-1">
                    <Clock size={12} />
                    <span className="font-medium">已延期</span>
                  </div>
                  {entry.delayNote && <p>{entry.delayNote}</p>}
                  {entry.originalDate && (
                    <p className="text-yellow-600">原定: {entry.originalDate}</p>
                  )}
                </div>
              )}

              {entry.revisionHistory.length > 0 && (
                <div className="mt-2">
                  <button
                    onClick={() =>
                      setShowHistoryId(showHistoryId === entry.id ? null : entry.id)
                    }
                    className="text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1"
                  >
                    <Clock size={12} />
                    修正历史 ({entry.revisionHistory.length})
                  </button>
                  {showHistoryId === entry.id && (
                    <div className="mt-2 space-y-1 pl-3 border-l-2 border-gray-200">
                      {entry.revisionHistory.slice().reverse().map((rev, idx) => (
                        <div key={idx} className="text-xs text-gray-500">
                          <span className="text-gray-400">
                            {format(parseISO(rev.timestamp), 'MM-dd HH:mm')}
                          </span>
                          : {rev.field} {rev.reason ? `(${rev.reason})` : ''}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {!entry.isDelayed && entry.type === 'receivable' && (
                <button
                  onClick={() => markAsDelayed(entry.id, '手动标记延期')}
                  className="mt-2 text-xs text-yellow-600 hover:text-yellow-700 flex items-center gap-1"
                >
                  <AlertTriangle size={12} />
                  标记为延期
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}