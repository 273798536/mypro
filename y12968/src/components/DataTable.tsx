import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, Layers } from 'lucide-react';
import { useLedgerStore } from '@/store/ledgerStore';
import { AnomalyBadge, SeverityBadge, StatusBadge } from './StatusBadges';
import TicketLink from './TicketLink';
import type { RefreshRecord } from '@/types/ledger';

export default function DataTable() {
  const navigate = useNavigate();
  const {
    records,
    selectedIds,
    toggleSelected,
    selectAll,
    clearSelected,
    getFilteredRecords,
    duplicateGroups,
  } = useLedgerStore();

  const filtered = useMemo(() => getFilteredRecords(), [records, getFilteredRecords]);

  const duplicateIds = useMemo(() => {
    const set = new Set<string>();
    duplicateGroups.forEach((g) => g.records.forEach((r) => set.add(r.id)));
    return set;
  }, [duplicateGroups]);

  const duplicateCountMap = useMemo(() => {
    const map = new Map<string, number>();
    duplicateGroups.forEach((g) =>
      g.records.forEach((r) => map.set(r.id, g.records.length)),
    );
    return map;
  }, [duplicateGroups]);

  const allSelected = filtered.length > 0 && filtered.every((r) => selectedIds.includes(r.id));

  const rowLeftBorderClass = (r: RefreshRecord) => {
    if (r.anomaly_type === 'normal') return '';
    if (r.severity === 'critical') return 'border-l-4 border-l-anomaly-critical';
    if (r.severity === 'warning') return 'border-l-4 border-l-anomaly-warning';
    return 'border-l-4 border-l-anomaly-info';
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="px-4 py-2 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs text-slate-600">
        <div className="flex items-center gap-4">
          <span>
            共 <strong className="text-brand">{filtered.length}</strong> 条记录
          </span>
          {selectedIds.length > 0 && (
            <span className="flex items-center gap-1">
              已选 <strong className="text-brand">{selectedIds.length}</strong> 条
              <button onClick={clearSelected} className="text-slate-500 hover:text-brand underline">
                取消选择
              </button>
            </span>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-100 sticky top-0 z-10">
            <tr>
              <th className="w-10 px-3 py-2 text-left">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={(e) =>
                    e.target.checked ? selectAll(filtered.map((r) => r.id)) : clearSelected()
                  }
                  className="w-3.5 h-3.5 accent-brand"
                />
              </th>
              <th className="table-cell text-left font-medium text-slate-600 w-[180px]">视图名称</th>
              <th className="table-cell text-left font-medium text-slate-600 w-[150px]">刷新时间</th>
              <th className="table-cell text-left font-medium text-slate-600 w-[100px]">异常类型</th>
              <th className="table-cell text-left font-medium text-slate-600 w-[80px]">严重度</th>
              <th className="table-cell text-left font-medium text-slate-600 w-[100px]">原始行号</th>
              <th className="table-cell text-left font-medium text-slate-600 w-[180px]">来源表</th>
              <th className="table-cell text-left font-medium text-slate-600 w-[160px]">影响结论</th>
              <th className="table-cell text-left font-medium text-slate-600 w-[130px]">工单编号</th>
              <th className="table-cell text-left font-medium text-slate-600 w-[90px]">状态</th>
              <th className="w-10"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={11} className="px-4 py-16 text-center text-slate-400">
                  <div className="flex flex-col items-center gap-2">
                    <Layers className="w-8 h-8 text-slate-300" />
                    <p>暂无符合条件的记录</p>
                    <p className="text-xs">尝试调整筛选条件或导入新数据</p>
                  </div>
                </td>
              </tr>
            ) : (
              filtered.map((r, idx) => {
                const isDup = duplicateIds.has(r.id);
                return (
                  <tr
                    key={r.id}
                    className={`${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'} hover:bg-blue-50/60 transition-colors ${rowLeftBorderClass(r)} ${
                      isDup ? 'ring-1 ring-inset ring-amber-300' : ''
                    } ${selectedIds.includes(r.id) ? 'bg-blue-50' : ''}`}
                  >
                    <td className="px-3 py-2">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(r.id)}
                        onChange={() => toggleSelected(r.id)}
                        className="w-3.5 h-3.5 accent-brand"
                      />
                    </td>
                    <td className="table-cell">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs text-slate-800">{r.view_name}</span>
                        {isDup && (
                          <span className="px-1.5 py-0.5 text-[10px] bg-amber-100 text-amber-700 border border-amber-300 font-medium">
                            重复{duplicateCountMap.get(r.id)}条
                          </span>
                        )}
                        {r.is_supplement && (
                          <span className="px-1.5 py-0.5 text-[10px] bg-purple-100 text-purple-700 border border-purple-300 font-medium">
                            补录
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="table-cell font-mono text-xs text-slate-600">{r.refresh_time}</td>
                    <td className="table-cell">
                      <AnomalyBadge type={r.anomaly_type} />
                    </td>
                    <td className="table-cell">
                      <SeverityBadge severity={r.severity} />
                    </td>
                    <td className="table-cell font-mono text-xs text-slate-700 bg-slate-100/80">
                      {r.source_row_number || '-'}
                    </td>
                    <td className="table-cell font-mono text-xs text-slate-700">{r.source_table}</td>
                    <td className="table-cell text-slate-600 max-w-[200px] truncate" title={r.conclusion}>
                      {r.conclusion || <span className="text-slate-400">未填写</span>}
                    </td>
                    <td className="table-cell">
                      <TicketLink
                        ticketId={r.ticket_id}
                        ticketSummary={r.ticket_summary}
                        ticketLink={r.ticket_link}
                      />
                    </td>
                    <td className="table-cell">
                      <StatusBadge status={r.status} />
                    </td>
                    <td className="px-2 py-2">
                      <button
                        onClick={() => navigate(`/record/${r.id}`)}
                        className="p-1 text-slate-400 hover:text-brand hover:bg-slate-100 rounded"
                        title="查看详情"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
