import { Circle, Check } from "lucide-react"
import { cn } from "@/lib/utils"
import type { StatusChange } from "@shared/types"

interface TraceTimelineProps {
  history: StatusChange[]
}

const statusLabel: Record<string, string> = {
  draft: "草稿",
  reviewed: "已审核",
  approved: "已批准",
  archived: "已归档",
}

function formatTime(iso: string) {
  const d = new Date(iso)
  return d.toLocaleString("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  })
}

export default function TraceTimeline({ history }: TraceTimelineProps) {
  if (history.length === 0) {
    return (
      <div className="py-6 text-center text-sm text-slate-400">
        暂无状态变更记录
      </div>
    )
  }

  return (
    <div className="relative space-y-0">
      {history.map((item, idx) => {
        const isLast = idx === history.length - 1
        const Icon = isLast ? Check : Circle

        return (
          <div key={item.id} className="relative flex gap-3 pb-6 last:pb-0">
            {!isLast && (
              <div className="absolute left-[9px] top-5 h-full w-px bg-slate-200" />
            )}
            <div
              className={cn(
                "z-10 mt-1 flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full",
                isLast
                  ? "bg-sky-500 text-white"
                  : "bg-slate-200 text-slate-500",
              )}
            >
              <Icon className="h-3 w-3" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 text-sm">
                <span className="font-medium text-slate-700">
                  {statusLabel[item.fromStatus] ?? item.fromStatus}
                </span>
                <span className="text-slate-400">→</span>
                <span className="font-medium text-sky-600">
                  {statusLabel[item.toStatus] ?? item.toStatus}
                </span>
              </div>
              <div className="mt-0.5 flex items-center gap-2 text-xs text-slate-400">
                <span>{item.operator}</span>
                <span>·</span>
                <span>{formatTime(item.createdAt)}</span>
              </div>
              {item.comment && (
                <p className="mt-1 text-xs text-slate-500">{item.comment}</p>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
