import { useMemo } from "react"
import { useStore } from "@/store/useStore"
import { BarChart3, AlertTriangle, PenLine, Clock } from "lucide-react"
import { STATUS_LABELS } from "@/types"
import { applyFilter, buildFilterCriteriaText } from "@/utils/storage"

export function SummaryBar() {
  const records = useStore((s) => s.records)
  const filter = useStore((s) => s.filter)

  const { filtered, criteriaText } = useMemo(() => {
    const filtered = applyFilter(records, filter)
    const criteriaText = buildFilterCriteriaText(filter)
    return { filtered, criteriaText }
  }, [records, filter])

  const summary = useMemo(() => {
    return {
      total: filtered.length,
      anomaly: filtered.filter((r) => r.status === "anomaly").length,
      annotated: filtered.filter((r) => r.manualAnnotation !== null).length,
      pending: filtered.filter((r) => r.status === "pending").length,
    }
  }, [filtered])

  const activeFilters: string[] = []
  if (filter.statuses.length > 0 && filter.statuses.length < 4) {
    activeFilters.push(filter.statuses.map((s) => STATUS_LABELS[s]).join("、"))
  }
  if (filter.hasAnomaly) activeFilters.push("仅异常")
  if (filter.hasManualAnnotation) activeFilters.push("仅有人工批注")
  if (filter.dateRange) activeFilters.push(`${filter.dateRange.start} ~ ${filter.dateRange.end}`)

  return (
    <div className="sticky top-0 z-30 bg-studio-surface border-b border-studio-border px-6 py-3 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <h1 className="font-serif text-lg font-semibold text-studio-amber tracking-wide">
          播客片头分账对齐
        </h1>
        {activeFilters.length > 0 && (
          <div className="flex items-center gap-1.5 ml-3">
            <span className="text-xs text-studio-muted">筛选口径：</span>
            {activeFilters.map((f, i) => (
              <span
                key={i}
                className="text-xs bg-studio-card border border-studio-border text-studio-text-dim px-2 py-0.5 rounded"
              >
                {f}
              </span>
            ))}
          </div>
        )}
      </div>
      <div className="flex items-center gap-4">
        <StatChip
          icon={<BarChart3 size={14} />}
          label="总数"
          value={summary.total}
          color="text-studio-text"
        />
        <StatChip
          icon={<AlertTriangle size={14} />}
          label="异常"
          value={summary.anomaly}
          color="text-studio-coral"
        />
        <StatChip
          icon={<PenLine size={14} />}
          label="已批注"
          value={summary.annotated}
          color="text-studio-amber"
        />
        <StatChip
          icon={<Clock size={14} />}
          label="待处理"
          value={summary.pending}
          color="text-studio-muted"
        />
      </div>
    </div>
  )
}

function StatChip({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode
  label: string
  value: number
  color: string
}) {
  return (
    <div className="flex items-center gap-1.5 bg-studio-card border border-studio-border rounded px-3 py-1.5">
      <span className={color}>{icon}</span>
      <span className="text-xs text-studio-muted">{label}</span>
      <span className={`text-sm font-semibold ${color}`}>{value}</span>
    </div>
  )
}
