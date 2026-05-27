import { useState, useMemo, Fragment } from "react"
import { Search, ChevronDown, ChevronRight } from "lucide-react"
import type { AuditEntry } from "@/types"
import { useStore } from "@/store/useStore"

function detectConflicts(entries: AuditEntry[]): Set<string> {
  const conflicts = new Set<string>()
  const grouped = new Map<string, AuditEntry[]>()

  entries.forEach((entry) => {
    const key = `${entry.itemId}::${entry.field}`
    if (!grouped.has(key)) grouped.set(key, [])
    grouped.get(key)!.push(entry)
  })

  grouped.forEach((group) => {
    const sorted = [...group].sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    )
    for (let i = 0; i < sorted.length - 1; i++) {
      if (sorted[i].newValue !== sorted[i + 1].oldValue) {
        conflicts.add(sorted[i + 1].id)
      }
    }
  })

  return conflicts
}

export function AuditLog() {
  const auditLog = useStore((s) => s.auditLog)
  const [search, setSearch] = useState("")
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())

  const sorted = useMemo(
    () =>
      [...auditLog].sort(
        (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      ),
    [auditLog]
  )

  const filtered = useMemo(
    () =>
      search.trim()
        ? sorted.filter((e) =>
            e.itemId.toLowerCase().includes(search.trim().toLowerCase())
          )
        : sorted,
    [sorted, search]
  )

  const conflicts = useMemo(() => detectConflicts(sorted), [sorted])

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const formatTime = (ts: string) => {
    const d = new Date(ts)
    return d.toLocaleString("zh-CN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="搜索数据ID..."
          className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white/90 placeholder:text-white/30 focus:outline-none focus:border-[#4fc3f7]/50"
        />
      </div>

      <div className="overflow-x-auto rounded-lg border border-white/10">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-white/5 text-white/60 text-left">
              <th className="px-4 py-3 w-8" />
              <th className="px-4 py-3">时间</th>
              <th className="px-4 py-3">数据ID</th>
              <th className="px-4 py-3">修正字段</th>
              <th className="px-4 py-3">原始值</th>
              <th className="px-4 py-3">新值</th>
              <th className="px-4 py-3">修正原因</th>
              <th className="px-4 py-3">操作人</th>
              <th className="px-4 py-3 w-8" />
            </tr>
          </thead>
          <tbody>
            {filtered.map((entry, idx) => {
              const isEven = idx % 2 === 0
              const isExpanded = expandedIds.has(entry.id)
              const isConflict = conflicts.has(entry.id)

              return (
                <Fragment key={entry.id}>
                  <tr
                    className={`cursor-pointer transition-colors hover:bg-white/5 ${
                      isEven ? "bg-[#1e2440]" : "bg-[#232a4a]"
                    }`}
                    onClick={() => toggleExpand(entry.id)}
                  >
                    <td className="px-4 py-3">
                      {isConflict ? (
                        <span className="relative group">
                          <span className="inline-block w-2.5 h-2.5 rounded-full bg-red-500" />
                          <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 bg-red-900 text-red-200 text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                            数据冲突
                          </span>
                        </span>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 text-white/70 whitespace-nowrap">
                      {formatTime(entry.timestamp)}
                    </td>
                    <td className="px-4 py-3 text-[#4fc3f7] font-mono text-xs">
                      {entry.itemId}
                    </td>
                    <td className="px-4 py-3 text-white/80">{entry.field}</td>
                    <td className="px-4 py-3 text-white/50 font-mono">
                      {entry.oldValue ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-white/80 font-mono">
                      {entry.newValue ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-white/60 max-w-[200px] truncate">
                      {entry.reason}
                    </td>
                    <td className="px-4 py-3 text-white/70">{entry.operator}</td>
                    <td className="px-4 py-3">
                      {isExpanded ? (
                        <ChevronDown className="w-4 h-4 text-white/40" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-white/40" />
                      )}
                    </td>
                  </tr>
                  {isExpanded && (
                    <tr
                      className={
                        isEven ? "bg-[#1a1f38]" : "bg-[#1f2545]"
                      }
                    >
                      <td colSpan={9} className="px-8 py-4">
                        <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
                          <div>
                            <span className="text-white/40">记录ID：</span>
                            <span className="text-white/70 font-mono">
                              {entry.id}
                            </span>
                          </div>
                          <div>
                            <span className="text-white/40">完整时间戳：</span>
                            <span className="text-white/70">
                              {new Date(entry.timestamp).toISOString()}
                            </span>
                          </div>
                          <div>
                            <span className="text-white/40">原始值：</span>
                            <span className="text-white/70">
                              {String(entry.oldValue)}
                            </span>
                          </div>
                          <div>
                            <span className="text-white/40">新值：</span>
                            <span className="text-white/70">
                              {String(entry.newValue)}
                            </span>
                          </div>
                          <div className="col-span-2">
                            <span className="text-white/40">修正原因：</span>
                            <span className="text-white/70">{entry.reason}</span>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              )
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={9} className="px-4 py-12 text-center text-white/30">
                  暂无审计日志记录
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
