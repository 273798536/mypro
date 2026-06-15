import { useMemo } from "react"
import { useStore } from "@/store/useStore"
import { ScreenshotRecord, STATUS_LABELS, RecordStatus } from "@/types"
import { Image, AlertTriangle, Flag } from "lucide-react"
import { applyFilter } from "@/utils/storage"

const STATUS_COLORS: Record<RecordStatus, string> = {
  pending: "bg-studio-muted",
  recognized: "bg-studio-mint",
  anomaly: "bg-studio-coral",
  annotated: "bg-studio-amber",
}

export function ScreenshotList() {
  const records = useStore((s) => s.records)
  const filter = useStore((s) => s.filter)
  const selectedId = useStore((s) => s.selectedId)
  const selectRecord = useStore((s) => s.selectRecord)

  const filtered = useMemo(() => applyFilter(records, filter), [records, filter])

  return (
    <div className="flex flex-col gap-2 overflow-y-auto flex-1 pr-1">
      {filtered.length === 0 && (
        <div className="text-center text-studio-muted text-sm py-8">
          无匹配截图
        </div>
      )}
      {filtered.map((r) => (
        <ScreenshotCard
          key={r.id}
          record={r}
          selected={r.id === selectedId}
          onSelect={() => selectRecord(r.id === selectedId ? null : r.id)}
        />
      ))}
    </div>
  )
}

function ScreenshotCard({
  record,
  selected,
  onSelect,
}: {
  record: ScreenshotRecord
  selected: boolean
  onSelect: () => void
}) {
  const isAnomaly = record.status === "anomaly"

  return (
    <button
      onClick={onSelect}
      className={`
        w-full text-left rounded-lg border p-3 transition-all duration-150
        ${
          selected
            ? "border-studio-amber bg-studio-amber/10 shadow-[0_0_12px_rgba(240,165,0,0.1)]"
            : "border-studio-border bg-studio-card hover:border-studio-muted/50"
        }
        ${isAnomaly ? "animate-pulse-coral" : ""}
      `}
    >
      <div className="flex items-start gap-3">
        <div
          className={`
            w-10 h-10 rounded flex items-center justify-center flex-shrink-0
            ${record.recognizedData ? "bg-studio-surface" : "bg-studio-coral/10"}
          `}
        >
          {record.recognizedData ? (
            <Image size={18} className="text-studio-muted" />
          ) : (
            <AlertTriangle size={18} className="text-studio-coral" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm text-studio-text truncate font-medium">
            {record.fileName}
          </div>
          <div className="flex items-center gap-2 mt-1">
            <span
              className={`inline-block w-2 h-2 rounded-full ${STATUS_COLORS[record.status]}`}
            />
            <span className="text-xs text-studio-muted">
              {STATUS_LABELS[record.status]}
            </span>
            {record.manualAnnotation && (
              <span className="text-xs text-studio-amber flex items-center gap-0.5">
                <PenLineIcon />
                批注
              </span>
            )}
            {record.isBoundarySample && (
              <span className="text-xs text-studio-coral flex items-center gap-0.5">
                <Flag size={10} />
                边界
              </span>
            )}
          </div>
          <div className="text-xs text-studio-muted/60 mt-0.5">
            {new Date(record.uploadTime).toLocaleDateString("zh-CN")}
          </div>
        </div>
      </div>
    </button>
  )
}

function PenLineIcon() {
  return (
    <svg
      width="10"
      height="10"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </svg>
  )
}
