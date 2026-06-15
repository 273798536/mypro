import { ScreenshotRecord, STATUS_LABELS } from "@/types"
import { useStore } from "@/store/useStore"
import { RecognizedResultCard } from "./RecognizedResult"
import { ManualAnnotationCard } from "./ManualAnnotation"
import { NotesCard } from "./NotesCard"
import { VersionTimeline } from "./VersionTimeline"
import { X, FileQuestion } from "lucide-react"

export function DetailPanel() {
  const selectedId = useStore((s) => s.selectedId)
  const records = useStore((s) => s.records)
  const selectRecord = useStore((s) => s.selectRecord)

  const selected = selectedId ? records.find((r) => r.id === selectedId) ?? null : null

  if (!selected) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-studio-muted gap-3">
        <FileQuestion size={48} className="text-studio-border" />
        <span className="text-sm">选择左侧截图查看详情</span>
        <span className="text-xs text-studio-muted/60">
          复核人：此处查看识别结果、添加批注、追踪版本
        </span>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-serif text-base font-semibold text-studio-text">
            {selected.fileName}
          </h2>
          <div className="flex items-center gap-2 mt-1">
            <span
              className={`text-xs px-2 py-0.5 rounded ${
                selected.status === "anomaly"
                  ? "bg-studio-coral/15 text-studio-coral"
                  : selected.status === "annotated"
                  ? "bg-studio-amber/15 text-studio-amber"
                  : selected.status === "recognized"
                  ? "bg-studio-mint/15 text-studio-mint"
                  : "bg-studio-muted/15 text-studio-muted"
              }`}
            >
              {STATUS_LABELS[selected.status]}
            </span>
            {selected.isBoundarySample && (
              <span className="text-xs bg-studio-coral/10 text-studio-coral px-2 py-0.5 rounded">
                边界样本
              </span>
            )}
          </div>
        </div>
        <button
          onClick={() => selectRecord(null)}
          className="text-studio-muted hover:text-studio-text transition-colors"
        >
          <X size={18} />
        </button>
      </div>

      <RecognizedResultCard record={selected} />
      <ManualAnnotationCard record={selected} />
      <NotesCard record={selected} />
      <VersionTimeline record={selected} />
    </div>
  )
}
