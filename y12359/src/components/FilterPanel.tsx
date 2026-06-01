import { useStore } from "@/store/useStore"
import { X, Filter, RotateCcw } from "lucide-react"
import type { AnomalyCategory } from "@/types"

const categoryOptions: { value: AnomalyCategory; label: string }[] = [
  { value: "standard_expired", label: "标准过期" },
  { value: "temp_drift", label: "温漂异常" },
  { value: "reading_gap", label: "读数缺口" },
]

export default function FilterPanel() {
  const { filter, setFilter, resetFilter, getAllDeviceNumbers, getAllSignalNames } = useStore()
  const deviceNumbers = getAllDeviceNumbers()
  const signalNames = getAllSignalNames()

  const hasActiveFilter =
    filter.deviceNumbers.length > 0 ||
    filter.signalTypes.length > 0 ||
    filter.anomalyCategories.length > 0 ||
    filter.dateRange !== null

  const toggleArrayItem = <T,>(arr: T[], item: T): T[] =>
    arr.includes(item) ? arr.filter((i) => i !== item) : [...arr, item]

  return (
    <aside className="w-64 shrink-0 border-r border-slate-700/50 bg-slate-900/80 p-5 flex flex-col gap-6 overflow-y-auto">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-slate-200">
          <Filter size={16} strokeWidth={2} />
          <span className="text-sm font-semibold tracking-wide">筛选条件</span>
        </div>
        {hasActiveFilter && (
          <button
            onClick={resetFilter}
            className="flex items-center gap-1 text-xs text-amber-400 hover:text-amber-300 transition-colors"
          >
            <RotateCcw size={12} />
            重置
          </button>
        )}
      </div>

      <section className="flex flex-col gap-2">
        <h4 className="text-xs font-medium text-slate-400 uppercase tracking-wider">异常类别</h4>
        <div className="flex flex-col gap-1.5">
          {categoryOptions.map((opt) => (
            <label
              key={opt.value}
              className={`flex items-center gap-2 px-3 py-1.5 rounded text-sm cursor-pointer transition-all ${
                filter.anomalyCategories.includes(opt.value)
                  ? "bg-amber-400/15 text-amber-300 border border-amber-400/30"
                  : "text-slate-300 hover:bg-slate-800 border border-transparent"
              }`}
            >
              <input
                type="checkbox"
                checked={filter.anomalyCategories.includes(opt.value)}
                onChange={() =>
                  setFilter({ anomalyCategories: toggleArrayItem(filter.anomalyCategories, opt.value) })
                }
                className="sr-only"
              />
              <span
                className={`pointer-events-none w-2.5 h-2.5 rounded-sm border ${
                  filter.anomalyCategories.includes(opt.value)
                    ? "bg-amber-400 border-amber-400"
                    : "border-slate-500"
                }`}
              />
              {opt.label}
            </label>
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-2">
        <h4 className="text-xs font-medium text-slate-400 uppercase tracking-wider">设备编号</h4>
        <div className="flex flex-col gap-1">
          {deviceNumbers.map((dn) => (
            <label
              key={dn}
              className={`flex items-center gap-2 px-3 py-1.5 rounded text-sm cursor-pointer transition-all ${
                filter.deviceNumbers.includes(dn)
                  ? "bg-indigo-500/15 text-indigo-300 border border-indigo-400/30"
                  : "text-slate-300 hover:bg-slate-800 border border-transparent"
              }`}
            >
              <input
                type="checkbox"
                checked={filter.deviceNumbers.includes(dn)}
                onChange={() =>
                  setFilter({ deviceNumbers: toggleArrayItem(filter.deviceNumbers, dn) })
                }
                className="sr-only"
              />
              <span
                className={`pointer-events-none w-2.5 h-2.5 rounded-sm border ${
                  filter.deviceNumbers.includes(dn)
                    ? "bg-indigo-400 border-indigo-400"
                    : "border-slate-500"
                }`}
              />
              {dn}
            </label>
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-2">
        <h4 className="text-xs font-medium text-slate-400 uppercase tracking-wider">标准信号</h4>
        <div className="flex flex-col gap-1">
          {signalNames.map((sn) => (
            <label
              key={sn}
              className={`flex items-center gap-2 px-3 py-1.5 rounded text-sm cursor-pointer transition-all ${
                filter.signalTypes.includes(sn)
                  ? "bg-cyan-500/15 text-cyan-300 border border-cyan-400/30"
                  : "text-slate-300 hover:bg-slate-800 border border-transparent"
              }`}
            >
              <input
                type="checkbox"
                checked={filter.signalTypes.includes(sn)}
                onChange={() =>
                  setFilter({ signalTypes: toggleArrayItem(filter.signalTypes, sn) })
                }
                className="sr-only"
              />
              <span
                className={`pointer-events-none w-2.5 h-2.5 rounded-sm border ${
                  filter.signalTypes.includes(sn)
                    ? "bg-cyan-400 border-cyan-400"
                    : "border-slate-500"
                }`}
              />
              {sn}
            </label>
          ))}
        </div>
      </section>

      {hasActiveFilter && (
        <div className="mt-auto pt-4 border-t border-slate-700/50">
          <div className="flex flex-wrap gap-1.5">
            {filter.anomalyCategories.map((c) => (
              <span
                key={c}
                className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-400/10 text-amber-300 text-xs rounded-full border border-amber-400/20"
              >
                {categoryOptions.find((o) => o.value === c)?.label}
                <button onClick={() => setFilter({ anomalyCategories: filter.anomalyCategories.filter((x) => x !== c) })}>
                  <X size={10} />
                </button>
              </span>
            ))}
            {filter.deviceNumbers.map((dn) => (
              <span
                key={dn}
                className="inline-flex items-center gap-1 px-2 py-0.5 bg-indigo-400/10 text-indigo-300 text-xs rounded-full border border-indigo-400/20"
              >
                {dn}
                <button onClick={() => setFilter({ deviceNumbers: filter.deviceNumbers.filter((x) => x !== dn) })}>
                  <X size={10} />
                </button>
              </span>
            ))}
            {filter.signalTypes.map((sn) => (
              <span
                key={sn}
                className="inline-flex items-center gap-1 px-2 py-0.5 bg-cyan-400/10 text-cyan-300 text-xs rounded-full border border-cyan-400/20"
              >
                {sn}
                <button onClick={() => setFilter({ signalTypes: filter.signalTypes.filter((x) => x !== sn) })}>
                  <X size={10} />
                </button>
              </span>
            ))}
          </div>
        </div>
      )}
    </aside>
  )
}
