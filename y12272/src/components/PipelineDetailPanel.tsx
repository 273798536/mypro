import { X, FileText, AlertTriangle, Database, Layers, History, Ruler, Hash } from "lucide-react"
import { useStore } from "@/store/useStore"
import { PIPELINE_TYPE_LABELS, RISK_LEVEL_LABELS } from "@/types"

const RISK_COLORS = {
  high: "bg-red-500/20 text-red-400 border-red-500/30",
  medium: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  low: "bg-green-500/20 text-green-400 border-green-500/30",
}

const SOURCE_COLORS = {
  original: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  processed: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",
}

const VERSION_STATUS_COLORS = {
  current: "bg-green-500/20 text-green-400 border-green-500/30",
  superseded: "bg-red-500/20 text-red-400 border-red-500/30",
  draft: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
}

const VERSION_STATUS_LABELS = {
  current: "当前版本",
  superseded: "已取代",
  draft: "草稿",
}

const SOURCE_LABELS = {
  original: "原始材料",
  processed: "处理结果",
}

export default function PipelineDetailPanel() {
  const selectedPipelineId = useStore((s) => s.selectedPipelineId)
  const detailPanelOpen = useStore((s) => s.detailPanelOpen)
  const getPipelineById = useStore((s) => s.getPipelineById)
  const setDetailPanelOpen = useStore((s) => s.setDetailPanelOpen)
  const selectPipeline = useStore((s) => s.selectPipeline)
  const conflicts = useStore((s) => s.conflicts)
  const selectConflict = useStore((s) => s.selectConflict)
  const setSidebarTab = useStore((s) => s.setSidebarTab)

  const pipeline = selectedPipelineId ? getPipelineById(selectedPipelineId) : null

  const involvedConflicts = conflicts.filter((c) =>
    pipeline ? c.involvedPipelines.includes(pipeline.id) : false
  )

  if (!pipeline || !detailPanelOpen) return null

  return (
    <div className="absolute right-80 top-0 bottom-0 w-96 border-l border-[#2a2d36] bg-[#1a1d23] shadow-2xl z-10">
      <div className="flex h-full flex-col">
        <div
          className="flex items-center justify-between border-b border-[#2a2d36] p-4"
          style={{ borderLeftColor: pipeline.color, borderLeftWidth: 4 }}
        >
          <div>
            <h2 className="text-lg font-bold text-zinc-100">{pipeline.name}</h2>
            <p className="font-mono text-xs text-zinc-500">{pipeline.id}</p>
          </div>
          <button
            onClick={() => {
              setDetailPanelOpen(false)
              selectPipeline(null)
            }}
            className="rounded p-1 text-zinc-500 hover:bg-[#2a2d36] hover:text-zinc-300"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="space-y-4 p-4">
            <div className="flex flex-wrap gap-2">
              <span
                className="inline-flex items-center gap-1 rounded border px-2 py-1 text-xs"
                style={{
                  backgroundColor: `${pipeline.color}22`,
                  borderColor: `${pipeline.color}44`,
                  color: pipeline.color,
                }}
              >
                <Layers size={12} />
                {PIPELINE_TYPE_LABELS[pipeline.type]}
              </span>
              <span
                className={`inline-flex items-center gap-1 rounded border px-2 py-1 text-xs ${RISK_COLORS[pipeline.riskLevel]}`}
              >
                <AlertTriangle size={12} />
                {RISK_LEVEL_LABELS[pipeline.riskLevel]}
              </span>
              <span
                className={`inline-flex items-center gap-1 rounded border px-2 py-1 text-xs ${SOURCE_COLORS[pipeline.dataSource]}`}
              >
                <Database size={12} />
                {SOURCE_LABELS[pipeline.dataSource]}
              </span>
            </div>

            <div className="rounded-lg border border-[#2a2d36] bg-[#252830] p-4">
              <h3 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-zinc-400">
                <FileText size={14} />
                图纸版本
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-[10px] text-zinc-500">版本号</p>
                  <p className="font-mono text-sm text-zinc-100">{pipeline.version}</p>
                </div>
                <div>
                  <p className="text-[10px] text-zinc-500">版本状态</p>
                  <span
                    className={`inline-block rounded border px-1.5 py-0.5 text-[10px] ${VERSION_STATUS_COLORS[pipeline.versionStatus]}`}
                  >
                    {VERSION_STATUS_LABELS[pipeline.versionStatus]}
                  </span>
                </div>
                <div className="col-span-2">
                  <p className="text-[10px] text-zinc-500">来源说明</p>
                  <p className="mt-1 text-sm text-zinc-300">{pipeline.sourceDescription}</p>
                </div>
                <div>
                  <p className="text-[10px] text-zinc-500">最后更新</p>
                  <p className="font-mono text-sm text-zinc-100">{pipeline.lastUpdated}</p>
                </div>
              </div>
            </div>

            <div className="rounded-lg border border-[#2a2d36] bg-[#252830] p-4">
              <h3 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-zinc-400">
                <Ruler size={14} />
                物理属性
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-[10px] text-zinc-500">材质</p>
                  <p className="text-sm text-zinc-100">{pipeline.material}</p>
                </div>
                <div>
                  <p className="text-[10px] text-zinc-500">管径</p>
                  <p className="font-mono text-sm text-zinc-100">{pipeline.diameter.toFixed(2)}m</p>
                </div>
              </div>
            </div>

            <div className="rounded-lg border border-[#2a2d36] bg-[#252830] p-4">
              <h3 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-zinc-400">
                <Hash size={14} />
                管段明细
              </h3>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {pipeline.segments.map((seg, i) => (
                  <div
                    key={seg.id}
                    className="flex items-center justify-between rounded border border-[#2a2d36] bg-[#1a1d23] px-2 py-1.5 text-[10px]"
                  >
                    <span className="font-mono text-zinc-500">S{i + 1}</span>
                    <span className="font-mono text-zinc-400">
                      ({seg.startPoint[0].toFixed(1)}, {seg.startPoint[1].toFixed(1)},{" "}
                      {seg.startPoint[2].toFixed(1)})
                    </span>
                    <span className="text-zinc-600">→</span>
                    <span className="font-mono text-zinc-400">
                      ({seg.endPoint[0].toFixed(1)}, {seg.endPoint[1].toFixed(1)},{" "}
                      {seg.endPoint[2].toFixed(1)})
                    </span>
                    <span className="font-mono text-zinc-300">
                      标高 {seg.elevation.toFixed(2)}m
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {involvedConflicts.length > 0 && (
              <div className="rounded-lg border border-red-500/30 bg-red-500/5 p-4">
                <h3 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-red-400">
                  <AlertTriangle size={14} />
                  关联冲突 ({involvedConflicts.length})
                </h3>
                <div className="space-y-2">
                  {involvedConflicts.map((conflict) => (
                    <button
                      key={conflict.id}
                      onClick={() => {
                        selectConflict(conflict.id)
                        setSidebarTab("conflicts")
                      }}
                      className="w-full rounded border border-red-500/20 bg-[#1a1d23] p-2 text-left text-xs hover:bg-red-500/10"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-zinc-400">{conflict.id}</span>
                        <span className="text-[10px] text-red-400">
                          {conflict.type === "elevation_mismatch"
                            ? "标高错配"
                            : conflict.type === "outdated_drawing"
                              ? "旧图未作废"
                              : "管线交叉"}
                        </span>
                      </div>
                      <p className="mt-1 text-zinc-300 line-clamp-1">{conflict.description}</p>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {pipeline.dataSource === "processed" && (
              <div className="rounded-lg border border-cyan-500/30 bg-cyan-500/5 p-4">
                <h3 className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-cyan-400">
                  <History size={14} />
                  数据溯源
                </h3>
                <p className="text-xs text-zinc-400">
                  此数据已处理，基于原始材料进行了修正。请查看协调记录了解变更历史。
                </p>
                <button
                  onClick={() => setSidebarTab("coordination")}
                  className="mt-2 text-xs text-cyan-400 hover:text-cyan-300"
                >
                  查看协调记录 →
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
