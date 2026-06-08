import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import {
  Search,
  Filter,
  Eye,
  Download,
  AlertTriangle,
  RefreshCw,
  CheckCircle2,
  Clock,
  XCircle,
} from "lucide-react"
import { useAppStore } from "@/store/app"
import { StatusTag } from "@/components/ui/StatusTag"
import { cn } from "@/lib/utils"
import { formatTime } from "@/lib/utils"
import type { TaskStatus } from "@/types"
import { TASK_STATUS_LABEL } from "@/types"

const STATUS_OPTIONS: (TaskStatus | "all")[] = ["all", "pending", "reviewing", "passed", "conflict"]

export default function TaskList() {
  const { tasks, tasksLoading, filters, setFilters, fetchTasks } = useAppStore()
  const [searchInput, setSearchInput] = useState(filters.keyword || "")

  useEffect(() => {
    fetchTasks()
  }, [])

  const stats = {
    total: tasks.length,
    pending: tasks.filter((t) => t.status === "pending").length,
    conflict: tasks.filter((t) => t.status === "conflict").length,
    passed: tasks.filter((t) => t.status === "passed").length,
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-end justify-between px-6 pt-5 pb-4">
        <div>
          <h1 className="font-mono text-xl text-eng-text font-semibold tracking-wide flex items-center gap-2">
            <span className="text-eng-muted">[</span>
            复核任务清单
            <span className="text-eng-muted">]</span>
          </h1>
          <p className="text-xs text-eng-muted mt-1 font-mono">
            // REVIEW TASK INVENTORY · 统一时间、截图、模型口径
          </p>
        </div>
        <div className="flex items-center gap-5">
          <StatBox icon={Clock} label="待复核" value={stats.pending} tone="muted" />
          <StatBox icon={XCircle} label="有冲突" value={stats.conflict} tone="warn" />
          <StatBox icon={CheckCircle2} label="已通过" value={stats.passed} tone="pass" />
          <StatBox icon={Eye} label="总计" value={stats.total} tone="primary" />
        </div>
      </div>

      <div className="mx-6 eng-panel p-4 mb-4">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-1.5 text-xs text-eng-muted font-mono uppercase tracking-wider">
            <Filter className="w-3.5 h-3.5" />
            筛选
          </div>

          <div className="flex items-center gap-1">
            {STATUS_OPTIONS.map((opt) => {
              const active = (filters.status || "all") === opt
              return (
                <button
                  key={opt}
                  onClick={() =>
                    setFilters({ status: opt === "all" ? undefined : (opt as TaskStatus) })
                  }
                  className={cn(
                    "px-3 py-1 text-xs font-mono border transition-all",
                    active
                      ? "border-eng-primary bg-eng-primary/20 text-eng-text"
                      : "border-eng-border text-eng-dim hover:border-eng-muted hover:text-eng-text",
                  )}
                >
                  {opt === "all" ? "全部" : TASK_STATUS_LABEL[opt as TaskStatus]}
                </button>
              )
            })}
          </div>

          <div className="h-6 w-px bg-eng-border mx-2" />

          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-eng-muted" />
            <input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && setFilters({ keyword: searchInput })}
              placeholder="任务编号 / 桥梁名称 / 桥梁编号..."
              className="w-full bg-eng-bg border border-eng-border pl-9 pr-20 py-1.5 text-sm text-eng-text focus:outline-none focus:border-eng-primary font-mono"
            />
            <button
              onClick={() => setFilters({ keyword: searchInput })}
              className="absolute right-1 top-1/2 -translate-y-1/2 px-2.5 py-0.5 text-xs border border-eng-border text-eng-dim hover:border-eng-primary hover:text-eng-text transition-colors font-mono"
            >
              查询
            </button>
          </div>

          <button
            onClick={() => fetchTasks()}
            className="eng-btn-ghost"
            disabled={tasksLoading}
          >
            <RefreshCw className={cn("w-4 h-4", tasksLoading && "animate-spin")} />
            刷新
          </button>
        </div>
      </div>

      <div className="flex-1 mx-6 mb-6 eng-panel overflow-hidden flex flex-col">
        <div className="overflow-auto flex-1">
          <table className="w-full text-sm">
            <thead className="bg-eng-card/80 sticky top-0 z-10">
              <tr className="text-left text-xs text-eng-muted font-mono uppercase tracking-wider">
                <th className="px-4 py-3 font-medium">任务编号</th>
                <th className="px-4 py-3 font-medium">桥梁名称</th>
                <th className="px-4 py-3 font-medium">桥梁编号</th>
                <th className="px-4 py-3 font-medium text-center">裂缝数</th>
                <th className="px-4 py-3 font-medium">提交人</th>
                <th className="px-4 py-3 font-medium">提交时间</th>
                <th className="px-4 py-3 font-medium">状态</th>
                <th className="px-4 py-3 font-medium">异常标记</th>
                <th className="px-4 py-3 font-medium text-right">操作</th>
              </tr>
            </thead>
            <tbody>
              {tasksLoading ? (
                <tr>
                  <td colSpan={9} className="px-4 py-16 text-center text-eng-muted font-mono">
                    <RefreshCw className="w-6 h-6 mx-auto mb-2 animate-spin" />
                    加载任务数据中...
                  </td>
                </tr>
              ) : tasks.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-16 text-center text-eng-muted font-mono">
                    暂无符合条件的复核任务
                  </td>
                </tr>
              ) : (
                tasks.map((t, i) => (
                  <tr
                    key={t.id}
                    className={cn(
                      "border-t border-eng-border transition-colors hover:bg-eng-card/60",
                      i % 2 === 1 && "bg-eng-bg/30",
                      t.status === "conflict" && "bg-eng-warn/5",
                    )}
                  >
                    <td className="px-4 py-3 font-mono text-eng-text">{t.taskNo}</td>
                    <td className="px-4 py-3 text-eng-text">{t.bridgeName}</td>
                    <td className="px-4 py-3 font-mono text-eng-dim">{t.bridgeCode}</td>
                    <td className="px-4 py-3 text-center font-mono text-eng-text">{t.crackCount}</td>
                    <td className="px-4 py-3 text-eng-dim">{t.submitter}</td>
                    <td className="px-4 py-3 text-eng-dim font-mono text-xs">
                      {formatTime(t.submittedAt)}
                    </td>
                    <td className="px-4 py-3">
                      <StatusTag status={t.status} />
                    </td>
                    <td className="px-4 py-3">
                      {t.hasBadData ? (
                        <span className="eng-tag border-eng-danger text-eng-danger bg-eng-danger/10 gap-1">
                          <AlertTriangle className="w-3 h-3" />
                          疑似坏数据
                        </span>
                      ) : (
                        <span className="text-eng-muted text-xs font-mono">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link to={`/review/${t.id}`} className="eng-btn text-xs px-2.5 py-1">
                          <Eye className="w-3.5 h-3.5" />
                          复核详情
                        </Link>
                        <Link to={`/review/${t.id}/history`} className="eng-btn-ghost text-xs px-2.5 py-1">
                          历史
                        </Link>
                        <Link to={`/export`} className="eng-btn-ghost text-xs px-2.5 py-1">
                          <Download className="w-3.5 h-3.5" />
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="px-4 py-2.5 border-t border-eng-border flex items-center justify-between bg-eng-card/50 text-xs text-eng-muted font-mono">
          <span>// 共 {tasks.length} 条记录 · 仅展示本页任务</span>
          <span>LAST SYNC: {new Date().toLocaleTimeString("zh-CN", { hour12: false })}</span>
        </div>
      </div>
    </div>
  )
}

function StatBox({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: any
  label: string
  value: number
  tone: "muted" | "warn" | "pass" | "primary"
}) {
  const toneMap = {
    muted: "text-eng-muted border-eng-muted/40",
    warn: "text-eng-warn border-eng-warn/40",
    pass: "text-eng-pass border-eng-pass/40",
    primary: "text-eng-primary border-eng-primary/40",
  }
  return (
    <div className={cn("flex items-center gap-2.5 border px-3.5 py-2 bg-eng-card", toneMap[tone])}>
      <Icon className="w-4 h-4" />
      <div className="leading-tight">
        <div className="font-mono text-lg font-semibold">{value}</div>
        <div className="text-[10px] uppercase tracking-wider">{label}</div>
      </div>
    </div>
  )
}
