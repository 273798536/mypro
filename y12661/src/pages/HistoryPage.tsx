import { useEffect, useMemo, useState } from "react"
import { Link, useParams } from "react-router-dom"
import {
  ArrowLeft,
  History,
  User,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Filter,
  Search,
  RefreshCw,
  FileWarning,
  Zap,
} from "lucide-react"
import { useAppStore } from "@/store/app"
import { formatDateTime, cn } from "@/lib/utils"
import type { ChangeHistory } from "@/types"

const FILTER_FIELDS = [
  { value: "all", label: "全部字段" },
  { value: "status", label: "任务状态" },
  { value: "lengthUnit", label: "长度单位" },
  { value: "lengthValue", label: "长度数值" },
  { value: "widthUnit", label: "宽度单位" },
  { value: "widthValue", label: "宽度数值" },
  { value: "depthUnit", label: "深度单位" },
  { value: "depthValue", label: "深度数值" },
  { value: "collectionTime", label: "采集时间" },
  { value: "processTime", label: "处理时间" },
  { value: "collisionDetected", label: "碰撞检测" },
]

export default function HistoryPage() {
  const { id } = useParams<{ id: string }>()
  const { history, currentTask, fetchHistory, fetchTaskDetail, tasks, fetchTasks } = useAppStore()
  const [selectedTask, setSelectedTask] = useState<string>(id || "")
  const [fieldFilter, setFieldFilter] = useState("all")
  const [keyword, setKeyword] = useState("")

  useEffect(() => {
    fetchTasks()
    if (selectedTask) {
      fetchTaskDetail(selectedTask)
      fetchHistory(selectedTask)
    }
  }, [selectedTask])

  const filtered = useMemo(() => {
    return history.filter((h) => {
      if (fieldFilter !== "all" && h.fieldName !== fieldFilter) return false
      if (keyword) {
        const kw = keyword.toLowerCase()
        return (
          h.oldValue.toLowerCase().includes(kw) ||
          h.newValue.toLowerCase().includes(kw) ||
          h.reason.toLowerCase().includes(kw) ||
          h.operator.toLowerCase().includes(kw) ||
          h.fieldName.toLowerCase().includes(kw)
        )
      }
      return true
    })
  }, [history, fieldFilter, keyword])

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-5 py-3 border-b border-eng-border bg-eng-panel/80">
        <div className="flex items-center gap-4">
          <Link
            to={selectedTask ? `/review/${selectedTask}` : "/"}
            className="eng-btn-ghost text-xs px-2 py-1"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            返回
          </Link>
          <div className="h-6 w-px bg-eng-border" />
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-eng-primary" />
            <span className="font-mono text-sm text-eng-text font-semibold">变更历史追溯</span>
            <span className="text-[10px] text-eng-muted font-mono uppercase tracking-wider">
              CHANGE HISTORY
            </span>
          </div>
          {currentTask && (
            <div className="flex items-center gap-1.5 text-xs text-eng-dim">
              <span>·</span>
              <span className="font-mono text-eng-text">{currentTask.taskNo}</span>
              <span>{currentTask.bridgeName}</span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <select
            value={selectedTask}
            onChange={(e) => setSelectedTask(e.target.value)}
            className="eng-input w-64 text-xs"
          >
            <option value="">选择复核任务...</option>
            {tasks.map((t) => (
              <option key={t.id} value={t.id}>
                {t.taskNo} · {t.bridgeName}
              </option>
            ))}
          </select>
          <button
            onClick={() => selectedTask && fetchHistory(selectedTask)}
            className="eng-btn-ghost text-xs px-2 py-1"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            刷新
          </button>
        </div>
      </div>

      <div className="flex h-full min-h-0">
        {/* Sidebar Filters */}
        <aside className="w-72 flex-shrink-0 border-r border-eng-border bg-eng-panel/50 p-4 overflow-auto">
          <div className="flex items-center gap-2 mb-3">
            <Filter className="w-4 h-4 text-eng-muted" />
            <span className="font-mono text-sm text-eng-text font-semibold">过滤器</span>
          </div>

          <div className="space-y-4">
            <div>
              <div className="eng-label">变更字段</div>
              <div className="flex flex-col gap-1">
                {FILTER_FIELDS.map((f) => (
                  <button
                    key={f.value}
                    onClick={() => setFieldFilter(f.value)}
                    className={cn(
                      "text-left px-2.5 py-1.5 text-xs border transition-all",
                      fieldFilter === f.value
                        ? "border-eng-primary bg-eng-primary/20 text-eng-text"
                        : "border-transparent text-eng-dim hover:bg-eng-card hover:text-eng-text",
                    )}
                  >
                    {f.label}
                    <span className="font-mono text-eng-muted ml-1.5 text-[10px]">
                      {f.value}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="eng-label">关键词搜索</div>
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-eng-muted" />
                <input
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  placeholder="原值/新值/原因/操作人"
                  className="eng-input pl-8 text-xs"
                />
              </div>
            </div>

            <div className="eng-card p-3">
              <div className="text-xs text-eng-muted mb-2">统计</div>
              <div className="grid grid-cols-2 gap-2">
                <StatCell label="总变更" value={history.length} tone="primary" />
                <StatCell
                  label="碰撞影响"
                  value={history.filter((h) => h.collisionChanged).length}
                  tone="warn"
                />
                <StatCell
                  label="单位变更"
                  value={history.filter((h) => h.fieldName.endsWith("Unit")).length}
                  tone="accent"
                />
                <StatCell
                  label="时间变更"
                  value={history.filter((h) => h.fieldName.endsWith("Time")).length}
                  tone="muted"
                />
              </div>
            </div>
          </div>
        </aside>

        {/* Timeline */}
        <main className="flex-1 overflow-auto p-6">
          {!selectedTask ? (
            <div className="flex flex-col items-center justify-center h-full text-eng-muted font-mono">
              <FileWarning className="w-10 h-10 mb-3 opacity-50" />
              <div>请从右上角选择一个复核任务查看历史</div>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-eng-muted font-mono">
              <History className="w-10 h-10 mb-3 opacity-50" />
              <div>暂无符合筛选条件的变更记录</div>
            </div>
          ) : (
            <div className="relative max-w-3xl mx-auto">
              <div className="absolute left-5 top-2 bottom-2 w-px bg-eng-border" />
              <div className="space-y-4">
                {filtered.map((h, idx) => (
                  <HistoryItem key={h.id} h={h} index={filtered.length - idx} />
                ))}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}

function StatCell({
  label,
  value,
  tone,
}: {
  label: string
  value: number
  tone: "primary" | "warn" | "accent" | "muted"
}) {
  const cls =
    tone === "primary"
      ? "text-eng-primary"
      : tone === "warn"
        ? "text-eng-warn"
        : tone === "accent"
          ? "text-eng-accent"
          : "text-eng-text"
  return (
    <div className="eng-card p-2">
      <div className={`font-mono text-lg font-semibold ${cls}`}>{value}</div>
      <div className="text-[10px] text-eng-muted uppercase">{label}</div>
    </div>
  )
}

function HistoryItem({ h, index }: { h: ChangeHistory; index: number }) {
  const isCollision = h.fieldName === "collisionDetected" || h.collisionChanged
  const isUnit = h.fieldName.endsWith("Unit")
  const isStatus = h.fieldName === "status"

  return (
    <div className="relative pl-14">
      <div
        className={cn(
          "absolute left-2.5 top-2 w-6 h-6 border-2 rounded-full flex items-center justify-center",
          isCollision
            ? "bg-eng-warn/20 border-eng-warn text-eng-warn"
            : isUnit
              ? "bg-eng-accent/20 border-eng-accent text-eng-accent"
              : isStatus
                ? "bg-eng-primary/20 border-eng-primary text-eng-primary"
                : "bg-eng-card border-eng-muted text-eng-dim",
        )}
      >
        {isCollision ? (
          <Zap className="w-3 h-3" />
        ) : isUnit ? (
          <AlertTriangle className="w-3 h-3" />
        ) : isStatus ? (
          <CheckCircle2 className="w-3 h-3" />
        ) : (
          <History className="w-3 h-3" />
        )}
      </div>

      <div className="eng-card p-4 hover:border-eng-muted transition-colors">
        <div className="flex items-start justify-between gap-4 mb-2">
          <div>
            <div className="flex items-center gap-2">
              <span className="eng-tag border-eng-primary text-eng-primary bg-eng-primary/10 font-mono text-[10px]">
                #{String(index).padStart(3, "0")}
              </span>
              <span className="font-mono text-xs text-eng-dim uppercase tracking-wider">
                {h.fieldName}
              </span>
              {h.collisionChanged && (
                <span className="eng-tag border-eng-warn text-eng-warn bg-eng-warn/10 gap-1 text-[10px]">
                  <Zap className="w-2.5 h-2.5" />
                  碰撞判定受影响
                </span>
              )}
            </div>
            <div className="text-xs text-eng-muted mt-1 font-mono">
              字段 <span className="text-eng-text">{h.fieldName}</span> 发生变更
            </div>
          </div>
          <div className="text-right flex-shrink-0">
            <div className="flex items-center gap-1.5 text-xs text-eng-dim justify-end">
              <User className="w-3 h-3" />
              {h.operator}
            </div>
            <div className="flex items-center gap-1.5 text-[11px] text-eng-muted font-mono mt-0.5 justify-end">
              <Clock className="w-3 h-3" />
              {formatDateTime(h.operatedAt)}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 mb-3">
          <div className="eng-card p-2.5 bg-eng-bg border-eng-border">
            <div className="text-[10px] text-eng-muted font-mono uppercase mb-1">
              原值 · OLD
            </div>
            <div className="font-mono text-sm text-eng-dim">{h.oldValue || "—"}</div>
          </div>
          <div className="eng-card p-2.5 bg-eng-primary/5 border-eng-primary/30">
            <div className="text-[10px] text-eng-primary font-mono uppercase mb-1">
              新值 · NEW
            </div>
            <div className="font-mono text-sm text-eng-text">{h.newValue || "—"}</div>
          </div>
        </div>

        <div className="flex items-start gap-2 pt-2 border-t border-eng-border/50">
          <AlertTriangle className="w-3.5 h-3.5 text-eng-muted mt-0.5 flex-shrink-0" />
          <div>
            <div className="text-[10px] text-eng-muted font-mono uppercase tracking-wider">
              变更原因
            </div>
            <div className="text-xs text-eng-dim mt-0.5 leading-relaxed">{h.reason}</div>
          </div>
        </div>
      </div>
    </div>
  )
}
