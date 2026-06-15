import { ScreenshotRecord, VersionSnapshot } from "@/types"
import { GitBranch, Zap, PenLine, RefreshCw } from "lucide-react"

const TRIGGER_CONFIG: Record<
  VersionSnapshot["trigger"],
  { label: string; color: string; icon: React.ReactNode }
> = {
  initial_recognition: {
    label: "初次识别",
    color: "text-studio-mint",
    icon: <Zap size={12} />,
  },
  manual_annotation: {
    label: "人工批注",
    color: "text-studio-amber",
    icon: <PenLine size={12} />,
  },
  rescan: {
    label: "重扫",
    color: "text-studio-text",
    icon: <RefreshCw size={12} />,
  },
}

export function VersionTimeline({ record }: { record: ScreenshotRecord }) {
  if (record.versions.length === 0) {
    return (
      <div className="bg-studio-card border border-studio-border rounded-lg p-4">
        <div className="flex items-center gap-2">
          <GitBranch size={14} className="text-studio-muted" />
          <span className="text-sm font-medium text-studio-muted">版本追踪</span>
        </div>
        <p className="text-xs text-studio-muted/60 mt-1">尚无版本记录</p>
      </div>
    )
  }

  return (
    <div className="bg-studio-card border border-studio-border rounded-lg p-4">
      <div className="flex items-center gap-2 mb-3">
        <GitBranch size={14} className="text-studio-muted" />
        <span className="text-sm font-medium text-studio-text">版本追踪</span>
        <span className="text-xs text-studio-muted">（{record.versions.length} 个版本）</span>
      </div>
      <div className="space-y-0">
        {record.versions.map((v, i) => {
          const config = TRIGGER_CONFIG[v.trigger]
          const isLast = i === record.versions.length - 1
          return (
            <div key={v.versionId} className="flex gap-3">
              <div className="flex flex-col items-center">
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center ${
                    isLast ? "bg-studio-amber/20" : "bg-studio-surface"
                  }`}
                >
                  <span className={config.color}>{config.icon}</span>
                </div>
                {!isLast && (
                  <div className="w-px flex-1 bg-studio-border my-1" />
                )}
              </div>
              <div className="flex-1 pb-4">
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-medium ${config.color}`}>
                    {config.label}
                  </span>
                  <span className="text-xs text-studio-muted">
                    {new Date(v.timestamp).toLocaleString("zh-CN")}
                  </span>
                </div>
                <div className="text-xs text-studio-text-dim mt-1 space-y-0.5">
                  <div>
                    参与人：{v.data.participants.join("、") || "（无）"}
                  </div>
                  <div>
                    分账：
                    {v.data.shares
                      .map((s) => `${s.name} ${Math.round(s.ratio * 100)}%`)
                      .join("　") || "（无）"}
                  </div>
                  <div>类型：{v.data.introType || "（无）"}</div>
                  <div className="flex gap-3 mt-0.5">
                    {v.annotationApplied && (
                      <span className="text-studio-amber">✓ 含人工批注</span>
                    )}
                    {v.notesIncluded && (
                      <span className="text-studio-mint">✓ 含备注</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
