import { ScreenshotRecord } from "@/types"
import { Eye, Users, PieChart, Tag } from "lucide-react"

export function RecognizedResultCard({ record }: { record: ScreenshotRecord }) {
  const data = record.manualAnnotation
    ? record.manualAnnotation.overrideData
    : record.recognizedData

  if (!data && !record.recognizedData) {
    return (
      <div className="bg-studio-card border border-studio-coral/30 rounded-lg p-4">
        <div className="flex items-center gap-2 mb-2">
          <Eye size={14} className="text-studio-coral" />
          <span className="text-sm font-medium text-studio-coral">识别结果</span>
        </div>
        <p className="text-sm text-studio-muted">
          无法识别 — 截图模糊或信息不完整，请添加人工批注
        </p>
      </div>
    )
  }

  const displayData = record.manualAnnotation
    ? record.manualAnnotation.overrideData
    : record.recognizedData!

  return (
    <div
      className={`bg-studio-card border rounded-lg p-4 ${
        record.manualAnnotation
          ? "border-studio-amber/30"
          : "border-studio-border"
      }`}
    >
      <div className="flex items-center gap-2 mb-3">
        <Eye
          size={14}
          className={record.manualAnnotation ? "text-studio-amber" : "text-studio-mint"}
        />
        <span
          className={`text-sm font-medium ${
            record.manualAnnotation ? "text-studio-amber" : "text-studio-mint"
          }`}
        >
          {record.manualAnnotation ? "当前生效（人工批注覆盖）" : "识别结果"}
        </span>
      </div>

      {record.manualAnnotation && record.recognizedData && (
        <div className="mb-3 p-2 bg-studio-surface rounded border border-studio-border">
          <span className="text-xs text-studio-muted block mb-1">原始识别（已覆盖）</span>
          <OldDataDisplay data={record.recognizedData} />
        </div>
      )}

      <div className="space-y-2">
        <DataRow
          icon={<Users size={12} />}
          label="参与人"
          value={displayData.participants.join("、")}
        />
        <DataRow
          icon={<PieChart size={12} />}
          label="分账比例"
          value={displayData.shares
            .map((s) => `${s.name} ${Math.round(s.ratio * 100)}%`)
            .join("　")}
        />
        <DataRow
          icon={<Tag size={12} />}
          label="片头类型"
          value={displayData.introType}
        />
      </div>
    </div>
  )
}

function DataRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode
  label: string
  value: string
}) {
  return (
    <div className="flex items-start gap-2">
      <span className="text-studio-muted mt-0.5">{icon}</span>
      <span className="text-xs text-studio-muted w-16 flex-shrink-0">{label}</span>
      <span className="text-sm text-studio-text">{value}</span>
    </div>
  )
}

function OldDataDisplay({ data }: { data: { participants: string[]; shares: { name: string; ratio: number }[]; introType: string } }) {
  return (
    <div className="text-xs text-studio-muted/70 space-y-0.5">
      <div>参与人：{data.participants.join("、")}</div>
      <div>分账：{data.shares.map((s) => `${s.name} ${Math.round(s.ratio * 100)}%`).join("　")}</div>
      <div>类型：{data.introType}</div>
    </div>
  )
}
