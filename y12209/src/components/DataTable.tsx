import React, { useState } from 'react';
import { ChevronDown, ChevronUp, CheckCircle2 } from 'lucide-react';
import { MatchRecord } from '../types';
import { RiskBadge } from './RiskBadge';
import { DetailPanel } from './DetailPanel';
import { statusLabels } from '../data/mockData';

interface DataTableProps {
  records: MatchRecord[];
  selectedIds: Set<string>;
  onSelect: (recordId: string, selected: boolean) => void;
  onSelectAll: (selected: boolean) => void;
  onConfirmSingle: (recordId: string) => void;
  confirmingId: string | null;
}

function formatAmount(amount: number): string {
  return (amount / 10000).toFixed(2) + '万';
}

export const DataTable: React.FC<DataTableProps> = ({
  records,
  selectedIds,
  onSelect,
  onSelectAll,
  onConfirmSingle,
  confirmingId
}) => {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const toggleExpand = (recordId: string) => {
    const newExpanded = new Set(expandedIds);
    if (newExpanded.has(recordId)) {
      newExpanded.delete(recordId);
    } else {
      newExpanded.add(recordId);
    }
    setExpandedIds(newExpanded);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'bg-emerald-900/40 text-emerald-300 border-emerald-700';
      case 'matched':
        return 'bg-blue-900/40 text-blue-300 border-blue-700';
      case 'unmatched':
        return 'bg-slate-700 text-slate-300 border-slate-600';
      case 'exception':
        return 'bg-rose-900/40 text-rose-300 border-rose-700';
      default:
        return 'bg-slate-700 text-slate-300 border-slate-600';
    }
  };

  const allSelected = records.length > 0 && records.every(r => selectedIds.has(r.recordId));

  return (
    <div className="bg-slate-800/30 border border-slate-700 rounded-lg overflow-hidden">
      <table className="w-full">
        <thead>
          <tr className="bg-slate-800/80 border-b border-slate-700">
            <th className="w-10 px-3 py-3">
              <input
                type="checkbox"
                checked={allSelected}
                onChange={(e) => onSelectAll(e.target.checked)}
                className="w-4 h-4 rounded border-slate-600 bg-slate-900 text-blue-600 focus:ring-blue-500 focus:ring-offset-slate-800"
              />
            </th>
            <th className="w-10 px-3 py-3"></th>
            <th className="px-3 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
              记录编号
            </th>
            <th className="px-3 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
              项目名称
            </th>
            <th className="px-3 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
              批次号
            </th>
            <th className="px-3 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
              匹配状态
            </th>
            <th className="px-3 py-3 text-right text-xs font-medium text-slate-400 uppercase tracking-wider">
              应补贴
            </th>
            <th className="px-3 py-3 text-right text-xs font-medium text-slate-400 uppercase tracking-wider">
              到账金额
            </th>
            <th className="px-3 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
              到账日期
            </th>
            <th className="px-3 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
              风险
            </th>
            <th className="px-3 py-3 text-center text-xs font-medium text-slate-400 uppercase tracking-wider">
              操作
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-700/50">
          {records.map((record, index) => (
            <React.Fragment key={record.recordId}>
              <tr
                className={`${
                  index % 2 === 0 ? 'bg-slate-900/30' : 'bg-slate-800/20'
                } hover:bg-slate-700/30 transition-colors ${
                  expandedIds.has(record.recordId) ? 'bg-slate-700/40' : ''
                }`}
              >
                <td className="px-3 py-3">
                  <input
                    type="checkbox"
                    checked={selectedIds.has(record.recordId)}
                    onChange={(e) => onSelect(record.recordId, e.target.checked)}
                    className="w-4 h-4 rounded border-slate-600 bg-slate-900 text-blue-600 focus:ring-blue-500 focus:ring-offset-slate-800"
                  />
                </td>
                <td className="px-3 py-3">
                  <button
                    onClick={() => toggleExpand(record.recordId)}
                    className="p-1 hover:bg-slate-600 rounded transition-colors"
                  >
                    {expandedIds.has(record.recordId) ? (
                      <ChevronUp className="w-4 h-4 text-slate-400" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-slate-400" />
                    )}
                  </button>
                </td>
                <td className="px-3 py-3 text-sm font-mono text-slate-300">
                  {record.recordId}
                </td>
                <td className="px-3 py-3 text-sm text-slate-200 max-w-xs truncate">
                  {record.project.projectName}
                </td>
                <td className="px-3 py-3 text-sm font-mono text-slate-300">
                  {record.batch.batchNo}
                </td>
                <td className="px-3 py-3">
                  <span className={`inline-flex items-center px-2 py-0.5 text-xs font-medium border rounded ${getStatusColor(record.matchStatus)}`}>
                    {statusLabels[record.matchStatus]}
                  </span>
                </td>
                <td className="px-3 py-3 text-sm text-right text-slate-300 font-mono">
                  {formatAmount(record.batch.subsidyAmount)}
                </td>
                <td className="px-3 py-3 text-sm text-right text-emerald-400 font-mono font-medium">
                  {formatAmount(record.payment.paymentAmount)}
                </td>
                <td className="px-3 py-3 text-sm text-slate-300">
                  {record.payment.paymentDate}
                </td>
                <td className="px-3 py-3">
                  <div className="flex flex-wrap gap-1">
                    {record.risks.length > 0 ? (
                      record.risks.map((risk) => (
                        <RiskBadge key={risk.riskId} riskType={risk.riskType} />
                      ))
                    ) : (
                      <span className="text-xs text-slate-500">—</span>
                    )}
                  </div>
                </td>
                <td className="px-3 py-3 text-center">
                  {record.matchStatus !== 'confirmed' ? (
                    <button
                      onClick={() => onConfirmSingle(record.recordId)}
                      disabled={confirmingId === record.recordId}
                      className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-white bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 disabled:text-blue-400 rounded transition-colors"
                    >
                      <CheckCircle2 className="w-3 h-3" />
                      {confirmingId === record.recordId ? '确认中' : '确认'}
                    </button>
                  ) : (
                    <span className="text-xs text-emerald-400">
                      {record.confirmedBy}
                      <br />
                      <span className="text-slate-500">{record.confirmedAt?.split(' ')[0]}</span>
                    </span>
                  )}
                </td>
              </tr>
              {expandedIds.has(record.recordId) && (
                <tr>
                  <td colSpan={11} className="p-0">
                    <DetailPanel record={record} />
                  </td>
                </tr>
              )}
            </React.Fragment>
          ))}
          {records.length === 0 && (
            <tr>
              <td colSpan={11} className="px-3 py-12 text-center text-slate-500">
                暂无符合条件的记录
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

export default DataTable;
