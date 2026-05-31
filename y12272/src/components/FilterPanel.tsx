import { Search } from "lucide-react"
import { useStore } from "@/store/useStore"
import {
  PIPELINE_TYPE_LABELS,
  PIPELINE_COLORS,
  RISK_LEVEL_LABELS,
} from "@/types"
import type { PipelineType, RiskLevel } from "@/types"

const PIPELINE_TYPES: PipelineType[] = [
  "gas",
  "electric",
  "stormwater",
  "watersupply",
  "telecom",
]
const RISK_LEVELS: RiskLevel[] = ["high", "medium", "low"]

export default function FilterPanel() {
  const filter = useStore((s) => s.filter)
  const pipelines = useStore((s) => s.pipelines)
  const togglePipelineType = useStore((s) => s.togglePipelineType)
  const toggleRiskLevel = useStore((s) => s.toggleRiskLevel)
  const setFilter = useStore((s) => s.setFilter)
  const getFilteredPipelines = useStore((s) => s.getFilteredPipelines)

  const filtered = getFilteredPipelines()

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="rounded-lg border border-[#2a2d36] bg-[#252830] p-3">
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-zinc-400">
          管线类型
        </h3>
        <div className="flex flex-col gap-2">
          {PIPELINE_TYPES.map((type) => (
            <label
              key={type}
              className="flex cursor-pointer items-center gap-2 text-sm text-zinc-300 hover:text-zinc-100"
            >
              <input
                type="checkbox"
                checked={filter.pipelineTypes.includes(type)}
                onChange={() => togglePipelineType(type)}
                className="h-3.5 w-3.5 rounded border-[#2a2d36] bg-[#1e2028] accent-blue-500"
              />
              <span
                className="inline-block h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: PIPELINE_COLORS[type] }}
              />
              <span>{PIPELINE_TYPE_LABELS[type]}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="rounded-lg border border-[#2a2d36] bg-[#252830] p-3">
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-zinc-400">
          风险等级
        </h3>
        <div className="flex flex-col gap-2">
          {RISK_LEVELS.map((level) => (
            <label
              key={level}
              className="flex cursor-pointer items-center gap-2 text-sm text-zinc-300 hover:text-zinc-100"
            >
              <input
                type="checkbox"
                checked={filter.riskLevels.includes(level)}
                onChange={() => toggleRiskLevel(level)}
                className="h-3.5 w-3.5 rounded border-[#2a2d36] bg-[#1e2028] accent-blue-500"
              />
              <span>{RISK_LEVEL_LABELS[level]}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="rounded-lg border border-[#2a2d36] bg-[#252830] p-3">
        <label className="flex cursor-pointer items-center justify-between text-sm text-zinc-300">
          <span>仅显示冲突管线</span>
          <button
            role="switch"
            aria-checked={filter.showConflictsOnly}
            onClick={() =>
              setFilter({ showConflictsOnly: !filter.showConflictsOnly })
            }
            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
              filter.showConflictsOnly ? "bg-blue-500" : "bg-[#2a2d36]"
            }`}
          >
            <span
              className={`inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform ${
                filter.showConflictsOnly ? "translate-x-4.5" : "translate-x-0.5"
              }`}
            />
          </button>
        </label>
      </div>

      <div className="rounded-lg border border-[#2a2d36] bg-[#252830] p-3">
        <div className="relative">
          <Search
            size={14}
            className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-500"
          />
          <input
            type="text"
            value={filter.searchQuery}
            onChange={(e) => setFilter({ searchQuery: e.target.value })}
            placeholder="搜索管线名称/ID..."
            className="w-full rounded-md border border-[#2a2d36] bg-[#1e2028] py-1.5 pl-8 pr-3 text-sm text-zinc-300 placeholder-zinc-600 outline-none focus:border-blue-500"
          />
        </div>
      </div>

      <div className="rounded-lg border border-[#2a2d36] bg-[#252830] p-3">
        <div className="flex items-center justify-between text-xs">
          <span className="text-zinc-500">筛选结果</span>
          <span className="text-zinc-300">
            <span className="font-semibold text-blue-400">{filtered.length}</span>
            <span className="text-zinc-500"> / {pipelines.length}</span>
          </span>
        </div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[#1e2028]">
          <div
            className="h-full rounded-full bg-blue-500 transition-all"
            style={{
              width: `${pipelines.length ? (filtered.length / pipelines.length) * 100 : 0}%`,
            }}
          />
        </div>
      </div>
    </div>
  )
}
