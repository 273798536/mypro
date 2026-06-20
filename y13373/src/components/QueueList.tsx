import { useMemo } from "react"
import { useQueueStore } from "@/store/queueStore"
import { formatCost, formatDuration } from "@/utils/export"
import { Checkbox, Badge } from "@/components/Badge"
import type { QueueRecord } from "@/types"

function StatusBadge({ status }: { status: QueueRecord["status"] }) {
  const map = {
    pending: { label: "待复核", variant: "sky" as const },
    confirmed: { label: "已处理", variant: "emerald" as const },
    withdrawn: { label: "已撤回", variant: "amber" as const },
  }
  const s = map[status]
  return <Badge variant={s.variant}>{s.label}</Badge>
}

function TypeBadge({ type }: { type: QueueRecord["type"] }) {
  return type === "failure"
    ? <Badge variant="amber">失败</Badge>
    : <Badge variant="emerald">正常</Badge>
}

export function QueueList() {
  const records = useQueueStore(s => s.records)
  const selectedIds = useQueueStore(s => s.selectedIds)
  const detailId = useQueueStore(s => s.detailId)
  const filterType = useQueueStore(s => s.filterType)
  const filterStatus = useQueueStore(s => s.filterStatus)
  const filterContamination = useQueueStore(s => s.filterContamination)
  const searchQuery = useQueueStore(s => s.searchQuery)
  const toggleSelect = useQueueStore(s => s.toggleSelect)
  const selectAll = useQueueStore(s => s.selectAll)
  const clearSelection = useQueueStore(s => s.clearSelection)
  const setDetailId = useQueueStore(s => s.setDetailId)
  const toggleContamination = useQueueStore(s => s.toggleContamination)
  const confirmRecord = useQueueStore(s => s.confirmRecord)
  const withdrawRecord = useQueueStore(s => s.withdrawRecord)
  const deleteRecord = useQueueStore(s => s.deleteRecord)

  const filtered = useMemo(() => {
    return records.filter(r => {
      if (filterType !== "all" && r.type !== filterType) return false
      if (filterStatus !== "all" && r.status !== filterStatus) return false
      if (filterContamination === "contaminated" && !r.isContaminated) return false
      if (filterContamination === "clean" && r.isContaminated) return false
      if (searchQuery) {
        const q = searchQuery.toLowerCase()
        const searchable = `${r.taskId} ${r.taskName} ${r.model} ${r.dataset} ${r.failureLog}`.toLowerCase()
        if (!searchable.includes(q)) return false
      }
      return true
    })
  }, [records, filterType, filterStatus, filterContamination, searchQuery])

  const allSelected = filtered.length > 0 && filtered.every(r => selectedIds.includes(r.id))

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-800 text-zinc-400 text-xs uppercase tracking-wider">
              <th className="px-3 py-3 text-left w-10">
                <Checkbox
                  checked={allSelected}
                  onChange={allSelected ? clearSelection : selectAll}
                />
              </th>
              <th className="px-3 py-3 text-left">任务ID</th>
              <th className="px-3 py-3 text-left">任务名称</th>
              <th className="px-3 py-3 text-left">类型</th>
              <th className="px-3 py-3 text-left">状态</th>
              <th className="px-3 py-3 text-left">污染</th>
              <th className="px-3 py-3 text-right">GPU成本</th>
              <th className="px-3 py-3 text-right">耗时</th>
              <th className="px-3 py-3 text-left">模型</th>
              <th className="px-3 py-3 text-center w-32">操作</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={10} className="px-3 py-12 text-center text-zinc-500">
                  暂无匹配记录
                </td>
              </tr>
            ) : (
              filtered.map(r => (
                <tr
                  key={r.id}
                  className={`border-b border-zinc-800/60 transition-colors cursor-pointer ${
                    detailId === r.id
                      ? "bg-zinc-800/80"
                      : selectedIds.includes(r.id)
                        ? "bg-zinc-800/40"
                        : "hover:bg-zinc-800/30"
                  }`}
                  onClick={() => setDetailId(detailId === r.id ? null : r.id)}
                >
                  <td className="px-3 py-3" onClick={e => e.stopPropagation()}>
                    <Checkbox
                      checked={selectedIds.includes(r.id)}
                      onChange={() => toggleSelect(r.id)}
                    />
                  </td>
                  <td className="px-3 py-3 font-mono text-xs text-zinc-300">{r.taskId}</td>
                  <td className="px-3 py-3 text-zinc-200 max-w-[200px] truncate">{r.taskName}</td>
                  <td className="px-3 py-3"><TypeBadge type={r.type} /></td>
                  <td className="px-3 py-3"><StatusBadge status={r.status} /></td>
                  <td className="px-3 py-3">
                    {r.isContaminated ? (
                      <Badge variant="rose">污染</Badge>
                    ) : (
                      <span className="text-zinc-600 text-xs">—</span>
                    )}
                  </td>
                  <td className="px-3 py-3 text-right font-mono text-xs text-amber-300">{formatCost(r.gpuCost)}</td>
                  <td className="px-3 py-3 text-right text-xs text-zinc-400">{formatDuration(r.duration)}</td>
                  <td className="px-3 py-3 text-xs text-zinc-400">{r.model}</td>
                  <td className="px-3 py-3" onClick={e => e.stopPropagation()}>
                    <div className="flex items-center justify-center gap-1">
                      <button
                        onClick={() => toggleContamination(r.id)}
                        className={`p-1.5 rounded-lg transition-colors ${
                          r.isContaminated
                            ? "text-rose-400 bg-rose-950/40 hover:bg-rose-900/40"
                            : "text-zinc-500 hover:text-rose-400 hover:bg-zinc-800"
                        }`}
                        title={r.isContaminated ? "取消污染标记" : "标记污染"}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10"/><path d="m9 12 2 2 4-4"/></svg>
                      </button>
                      {r.status === "pending" || r.status === "withdrawn" ? (
                        <button
                          onClick={() => confirmRecord(r.id)}
                          className="p-1.5 rounded-lg text-zinc-500 hover:text-emerald-400 hover:bg-zinc-800 transition-colors"
                          title="确认已处理"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                        </button>
                      ) : (
                        <button
                          onClick={() => withdrawRecord(r.id)}
                          className="p-1.5 rounded-lg text-zinc-500 hover:text-amber-400 hover:bg-zinc-800 transition-colors"
                          title="撤回至待复核"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg>
                        </button>
                      )}
                      <button
                        onClick={() => deleteRecord(r.id)}
                        className="p-1.5 rounded-lg text-zinc-500 hover:text-red-400 hover:bg-zinc-800 transition-colors"
                        title="删除"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
