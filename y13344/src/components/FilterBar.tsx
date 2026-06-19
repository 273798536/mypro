import { useEffect, useState } from "react"
import { RotateCcw } from "lucide-react"
import { useStore } from "@/store"
import { fetchVersions } from "@/utils/api"

const metricOptions = [
  { value: "", label: "全部" },
  { value: "准确率", label: "准确率" },
  { value: "召回率", label: "召回率" },
  { value: "F1分数", label: "F1分数" },
  { value: "响应时间", label: "响应时间" },
]

export default function FilterBar() {
  const { filter, setFilter, resetFilter } = useStore()
  const [versions, setVersions] = useState<{ version: string }[]>([])

  useEffect(() => {
    fetchVersions()
      .then((data) => setVersions(data))
      .catch(() => {})
  }, [])

  return (
    <div className="flex flex-wrap items-center gap-4 rounded-xl bg-slate-800/80 px-5 py-4 backdrop-blur">
      <select
        value={filter.version ?? ""}
        onChange={(e) => setFilter({ version: e.target.value || undefined })}
        className="rounded-lg border border-slate-600/50 bg-slate-700/50 px-3 py-2 text-sm text-slate-200 outline-none focus:border-cyan-500"
      >
        <option value="">全部版本</option>
        {versions.map((v) => (
          <option key={v.version} value={v.version}>
            {v.version}
          </option>
        ))}
      </select>

      <input
        type="date"
        value={filter.dateFrom ?? ""}
        onChange={(e) => setFilter({ dateFrom: e.target.value || undefined })}
        className="rounded-lg border border-slate-600/50 bg-slate-700/50 px-3 py-2 text-sm text-slate-200 outline-none focus:border-cyan-500"
      />

      <span className="text-slate-500">~</span>

      <input
        type="date"
        value={filter.dateTo ?? ""}
        onChange={(e) => setFilter({ dateTo: e.target.value || undefined })}
        className="rounded-lg border border-slate-600/50 bg-slate-700/50 px-3 py-2 text-sm text-slate-200 outline-none focus:border-cyan-500"
      />

      <select
        value={filter.metricType ?? ""}
        onChange={(e) => setFilter({ metricType: e.target.value || undefined })}
        className="rounded-lg border border-slate-600/50 bg-slate-700/50 px-3 py-2 text-sm text-slate-200 outline-none focus:border-cyan-500"
      >
        {metricOptions.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>

      <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-300">
        <span>人工修正</span>
        <button
          role="switch"
          aria-checked={filter.hasHumanCorrection ?? false}
          onClick={() =>
            setFilter({
              hasHumanCorrection: filter.hasHumanCorrection ? undefined : true,
            })
          }
          className={`relative h-5 w-9 rounded-full transition-colors ${
            filter.hasHumanCorrection ? "bg-cyan-500" : "bg-slate-600"
          }`}
        >
          <span
            className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white transition-transform ${
              filter.hasHumanCorrection ? "translate-x-4" : "translate-x-0"
            }`}
          />
        </button>
      </label>

      <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-300">
        <span>阈值漂移</span>
        <button
          role="switch"
          aria-checked={filter.hasThresholdDrift ?? false}
          onClick={() =>
            setFilter({
              hasThresholdDrift: filter.hasThresholdDrift ? undefined : true,
            })
          }
          className={`relative h-5 w-9 rounded-full transition-colors ${
            filter.hasThresholdDrift ? "bg-rose-500" : "bg-slate-600"
          }`}
        >
          <span
            className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white transition-transform ${
              filter.hasThresholdDrift ? "translate-x-4" : "translate-x-0"
            }`}
          />
        </button>
      </label>

      <button
        onClick={resetFilter}
        className="ml-auto flex items-center gap-1 rounded-lg bg-slate-700/50 px-3 py-2 text-sm text-slate-400 transition-colors hover:bg-slate-600/50 hover:text-slate-200"
      >
        <RotateCcw size={14} />
        重置
      </button>
    </div>
  )
}
