import { Eye, History, Download, CheckSquare, Square } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { StatusBadge } from '../common/StatusBadge';
import { VersionTag } from '../common/VersionTag';
import { IconButton } from '../common/IconButton';
import { formatDateTime, formatNumber } from '../../utils/formatters';

export function BatchTable() {
  const {
    getFilteredBatches,
    openReviewDrawer,
    openTimelineModal,
    toggleSelect,
    selectedIds,
    selectAllVisible,
    clearSelection,
    exportBatches,
  } = useAppStore();

  const batches = getFilteredBatches();
  const visibleIds = batches.map((b) => b.id);
  const allSelected =
    visibleIds.length > 0 && visibleIds.every((id) => selectedIds.has(id));

  return (
    <div className="bg-white border-2 border-ink-200">
      <div className="flex items-center justify-between px-4 py-3 border-b-2 border-ink-200 bg-ink-50">
        <div className="flex items-center gap-3">
          <h2 className="font-display text-base font-bold text-ink-800">
            计算批次明细
          </h2>
          <span className="text-xs font-mono text-ink-500">
            共 {batches.length} 条
          </span>
          {selectedIds.size > 0 && (
            <span className="px-2 py-0.5 bg-ink-700 text-white text-[11px] font-mono">
              已选 {selectedIds.size}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {selectedIds.size > 0 && (
            <IconButton
              variant="primary"
              icon={<Download size={14} />}
              onClick={() => exportBatches(Array.from(selectedIds))}
            >
              导出选中
            </IconButton>
          )}
          {selectedIds.size > 0 && (
            <IconButton variant="ghost" onClick={clearSelection}>
              清空选择
            </IconButton>
          )}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full table-zebra text-sm">
          <thead>
            <tr className="bg-ink-700 text-white text-left">
              <th className="w-10 px-3 py-2.5">
                <button
                  onClick={() =>
                    allSelected ? clearSelection() : selectAllVisible(visibleIds)
                  }
                  className="text-white hover:text-ink-200 transition-colors"
                >
                  {allSelected ? <CheckSquare size={16} /> : <Square size={16} />}
                </button>
              </th>
              <th className="px-3 py-2.5 font-mono text-[11px] uppercase tracking-wider font-medium">
                批次号
              </th>
              <th className="px-3 py-2.5 font-mono text-[11px] uppercase tracking-wider font-medium">
                板书版本
              </th>
              <th className="px-3 py-2.5 font-mono text-[11px] uppercase tracking-wider font-medium">
                处理人
              </th>
              <th className="px-3 py-2.5 font-mono text-[11px] uppercase tracking-wider font-medium">
                状态
              </th>
              <th className="px-3 py-2.5 font-mono text-[11px] uppercase tracking-wider font-medium text-right">
                计算结果
              </th>
              <th className="px-3 py-2.5 font-mono text-[11px] uppercase tracking-wider font-medium">
                来源
              </th>
              <th className="px-3 py-2.5 font-mono text-[11px] uppercase tracking-wider font-medium">
                更新时间
              </th>
              <th className="px-3 py-2.5 font-mono text-[11px] uppercase tracking-wider font-medium text-right">
                操作
              </th>
            </tr>
          </thead>
          <tbody>
            {batches.length === 0 ? (
              <tr>
                <td
                  colSpan={9}
                  className="px-4 py-16 text-center text-ink-400 font-mono text-sm"
                >
                  没有符合筛选条件的批次
                </td>
              </tr>
            ) : (
              batches.map((batch) => {
                const checked = selectedIds.has(batch.id);
                return (
                  <tr
                    key={batch.id}
                    className="border-t border-ink-100 hover:bg-ink-50 transition-colors"
                  >
                    <td className="px-3 py-3">
                      <button
                        onClick={() => toggleSelect(batch.id)}
                        className="text-ink-500 hover:text-ink-800"
                      >
                        {checked ? <CheckSquare size={16} /> : <Square size={16} />}
                      </button>
                    </td>
                    <td className="px-3 py-3 font-mono text-xs font-semibold text-ink-800">
                      {batch.id}
                    </td>
                    <td className="px-3 py-3">
                      <VersionTag
                        version={batch.boardVersion}
                        notation={batch.notationSystem}
                      />
                    </td>
                    <td className="px-3 py-3 font-mono text-sm text-ink-700">
                      {batch.handler}
                    </td>
                    <td className="px-3 py-3">
                      <StatusBadge status={batch.status} />
                    </td>
                    <td className="px-3 py-3 text-right font-mono text-sm font-bold text-ink-800 tabular-nums">
                      {formatNumber(batch.resultValue)}
                      <span className="ml-0.5 text-xs font-normal text-ink-400">
                        {batch.unit}
                      </span>
                    </td>
                    <td className="px-3 py-3 font-mono text-xs text-ink-600 max-w-[200px] truncate" title={batch.sourceBoard}>
                      {batch.sourceBoard}
                    </td>
                    <td className="px-3 py-3 font-mono text-xs text-ink-500">
                      {formatDateTime(batch.updatedAt)}
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex justify-end gap-1.5">
                        <IconButton
                          size="sm"
                          icon={<Eye size={13} />}
                          onClick={() => openReviewDrawer(batch.id)}
                        >
                          复核
                        </IconButton>
                        <IconButton
                          size="sm"
                          variant="ghost"
                          icon={<History size={13} />}
                          onClick={() => openTimelineModal(batch.id)}
                        >
                          时间线
                        </IconButton>
                      </div>
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
