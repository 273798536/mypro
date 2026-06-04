import { useState } from "react"
import { RotateCcw } from "lucide-react"

export interface FilterValues {
  status: string
  type: string
  batchId: string
  offlineOnly: boolean
}

interface AnomalyFilterProps {
  types: string[]
  batches: string[]
  onChange: (filters: FilterValues) => void
}

const STATUS_OPTIONS = [
  { value: "", label: "全部" },
  { value: "pending", label: "待确认" },
  { value: "approved", label: "已通过" },
  { value: "rejected", label: "已驳回" },
  { value: "resolved", label: "已处理" },
]

const defaults = (): FilterValues => ({
  status: "",
  type: "",
  batchId: "",
  offlineOnly: false,
})

export default function AnomalyFilter({ types, batches, onChange }: AnomalyFilterProps) {
  const [filters, setFilters] = useState<FilterValues>(defaults())

  const update = (partial: Partial<FilterValues>) => {
    const next = { ...filters, ...partial }
    setFilters(next)
    onChange(next)
  }

  const reset = () => {
    const d = defaults()
    setFilters(d)
    onChange(d)
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <div className="flex flex-wrap items-center gap-4">
        <SelectField
          label="状态"
          value={filters.status}
          options={STATUS_OPTIONS}
          onChange={(v) => update({ status: v })}
        />
        <SelectField
          label="类型"
          value={filters.type}
          options={[{ value: "", label: "全部" }, ...types.map((t) => ({ value: t, label: t }))]}
          onChange={(v) => update({ type: v })}
        />
        <SelectField
          label="批次"
          value={filters.batchId}
          options={[{ value: "", label: "全部" }, ...batches.map((b) => ({ value: b, label: b }))]}
          onChange={(v) => update({ batchId: v })}
        />

        <div className="ml-auto flex items-center gap-3">
          <label className="flex items-center gap-1.5 text-sm text-gray-600 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={filters.offlineOnly}
              onChange={(e) => update({ offlineOnly: e.target.checked })}
              className="rounded border-gray-300 text-warn focus:ring-warn"
            />
            离线素材缺失
          </label>
          <button
            onClick={reset}
            className="flex items-center gap-1 rounded px-2 py-1 text-sm text-gray-500 hover:bg-gray-100 transition-colors"
          >
            <RotateCcw size={14} />
            重置
          </button>
        </div>
      </div>
    </div>
  )
}

function SelectField({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: string
  options: { value: string; label: string }[]
  onChange: (v: string) => void
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-8 shrink-0 text-sm text-gray-500">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded border border-gray-300 bg-white px-2 py-1 text-sm focus:border-warn focus:outline-none"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  )
}
