import { useStore } from "@/store/useStore"
import { RecordStatus, STATUS_LABELS } from "@/types"
import { Filter, X, RotateCcw } from "lucide-react"

const STATUS_OPTIONS: { value: RecordStatus; label: string }[] = [
  { value: "pending", label: "待处理" },
  { value: "recognized", label: "已识别" },
  { value: "anomaly", label: "异常" },
  { value: "annotated", label: "已批注" },
]

export function FilterPanel() {
  const filter = useStore((s) => s.filter)
  const setFilter = useStore((s) => s.setFilter)
  const resetFilter = useStore((s) => s.resetFilter)
  const hasActiveFilter =
    filter.statuses.length > 0 ||
    filter.hasAnomaly !== null ||
    filter.hasManualAnnotation !== null ||
    filter.dateRange !== null

  const toggleStatus = (status: RecordStatus) => {
    const current = filter.statuses
    const next = current.includes(status)
      ? current.filter((s) => s !== status)
      : [...current, status]
    setFilter({ statuses: next })
  }

  return (
    <div className="bg-studio-card border border-studio-border rounded-lg p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Filter size={14} className="text-studio-amber" />
          <span className="text-sm font-medium text-studio-text">筛选器</span>
        </div>
        {hasActiveFilter && (
          <button
            onClick={resetFilter}
            className="flex items-center gap-1 text-xs text-studio-muted hover:text-studio-coral transition-colors"
          >
            <RotateCcw size={12} />
            重置
          </button>
        )}
      </div>

      <div className="space-y-2">
        <span className="text-xs text-studio-muted">状态</span>
        <div className="flex flex-wrap gap-1.5">
          {STATUS_OPTIONS.map((opt) => {
            const active = filter.statuses.includes(opt.value)
            return (
              <button
                key={opt.value}
                onClick={() => toggleStatus(opt.value)}
                className={`
                  text-xs px-2.5 py-1 rounded transition-all duration-150
                  ${
                    active
                      ? "bg-studio-amber/20 text-studio-amber border border-studio-amber/40"
                      : "bg-studio-surface text-studio-muted border border-studio-border hover:border-studio-muted/50"
                  }
                `}
              >
                {opt.label}
              </button>
            )
          })}
        </div>
      </div>

      <div className="space-y-2">
        <span className="text-xs text-studio-muted">快捷筛选</span>
        <div className="flex flex-wrap gap-1.5">
          <FilterToggle
            label="仅异常"
            active={filter.hasAnomaly === true}
            onClick={() =>
              setFilter({ hasAnomaly: filter.hasAnomaly === true ? null : true })
            }
          />
          <FilterToggle
            label="仅有人工批注"
            active={filter.hasManualAnnotation === true}
            onClick={() =>
              setFilter({
                hasManualAnnotation:
                  filter.hasManualAnnotation === true ? null : true,
              })
            }
          />
        </div>
      </div>

      {hasActiveFilter && (
        <div className="pt-2 border-t border-studio-border">
          <div className="flex items-center gap-1 flex-wrap">
            <span className="text-xs text-studio-muted">已选：</span>
            {filter.statuses.map((s) => (
              <FilterTag
                key={s}
                label={STATUS_LABELS[s]}
                onRemove={() => toggleStatus(s)}
              />
            ))}
            {filter.hasAnomaly && (
              <FilterTag
                label="仅异常"
                onRemove={() => setFilter({ hasAnomaly: null })}
              />
            )}
            {filter.hasManualAnnotation && (
              <FilterTag
                label="仅有人工批注"
                onRemove={() => setFilter({ hasManualAnnotation: null })}
              />
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function FilterToggle({
  label,
  active,
  onClick,
}: {
  label: string
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={`
        text-xs px-2.5 py-1 rounded transition-all duration-150
        ${
          active
            ? "bg-studio-amber/20 text-studio-amber border border-studio-amber/40"
            : "bg-studio-surface text-studio-muted border border-studio-border hover:border-studio-muted/50"
        }
      `}
    >
      {label}
    </button>
  )
}

function FilterTag({
  label,
  onRemove,
}: {
  label: string
  onRemove: () => void
}) {
  return (
    <span className="inline-flex items-center gap-1 text-xs bg-studio-amber/10 text-studio-amber border border-studio-amber/30 px-2 py-0.5 rounded">
      {label}
      <button onClick={onRemove} className="hover:text-studio-coral">
        <X size={10} />
      </button>
    </span>
  )
}
