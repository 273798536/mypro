import { useMemo } from "react"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts"
import { X, AlertTriangle, ChevronRight } from "lucide-react"
import { useAuditStore } from "@/store/useAuditStore"
import type { FeatureEntry } from "@/types"

const GC = ["#06b6d4","#8b5cf6","#10b981","#f97316","#ec4899","#6366f1","#14b8a6","#eab308"]

function CustomTooltip({ active, payload }: {
  active?: boolean
  payload?: Array<{ payload: { name: string; importance: number; isLeakage: boolean }; value: number }>
}) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  return (
    <div className="rounded-lg border border-[#2a2a3e] bg-[#1a1a2e] px-3 py-2 shadow-xl">
      <p className="text-sm font-semibold text-[#e4e4e7]">{d.name}</p>
      <p className="text-xs text-[#a1a1aa]">重要性: <span className="text-[#f59e0b]">{d.importance.toFixed(4)}</span></p>
      {d.isLeakage && <p className="mt-1 flex items-center gap-1 text-xs text-[#ef4444]"><AlertTriangle size={12} /> 泄漏特征</p>}
    </div>
  )
}

export default function Importance() {
  const features = useAuditStore((s) => s.features)
  const groups = useAuditStore((s) => s.groups)
  const samples = useAuditStore((s) => s.samples)
  const selectedFeature = useAuditStore((s) => s.selectedFeature)
  const detailDrawerOpen = useAuditStore((s) => s.detailDrawerOpen)
  const selectFeature = useAuditStore((s) => s.selectFeature)

  const chartData = useMemo(() =>
    [...features].sort((a, b) => b.importance - a.importance).slice(0, 30).map((f) => ({
      name: f.name, importance: f.importance, isLeakage: f.isLeakage,
    })), [features])

  const selectedEntry = useMemo<FeatureEntry | null>(
    () => features.find((f) => f.name === selectedFeature) ?? null, [features, selectedFeature])

  const distributionBins = useMemo(() => {
    if (!selectedEntry) return []
    const vals = samples.map((s) => s.features[selectedEntry.name]).filter((v): v is number => typeof v === "number")
    if (!vals.length) return []
    const mn = Math.min(...vals), mx = Math.max(...vals)
    if (mn === mx) return [{ bin: String(mn), count: vals.length }]
    const n = 15, step = (mx - mn) / n
    return Array.from({ length: n }, (_, i) => {
      const lo = mn + i * step, hi = lo + step
      return { bin: `${lo.toFixed(1)}`, count: vals.filter((v) => i === n - 1 ? v >= lo && v <= hi : v >= lo && v < hi).length }
    })
  }, [selectedEntry, samples])

  const filteredSamples = useMemo(() => {
    if (!selectedEntry) return []
    const gf = useAuditStore.getState().selectedGroup
    let r = samples
    if (gf) r = r.filter((s) => s.groupId === gf)
    return r.slice(0, 20)
  }, [selectedEntry, samples])

  const top5 = useMemo(() => [...features].sort((a, b) => b.importance - a.importance).slice(0, 5), [features])

  const selGroup = useAuditStore((s) => s.selectedGroup)
  const selectGroup = useAuditStore((s) => s.selectGroup)

  return (
    <div className="flex h-full gap-4 p-4">
      <div className="flex-[3] min-w-0">
        <h2 className="mb-3 text-lg font-bold text-[#e4e4e7]">特征重要性排名</h2>
        <div className="rounded-xl border border-[#2a2a3e] bg-[#1a1a2e] p-4">
          {chartData.length === 0 ? (
            <div className="flex h-64 items-center justify-center text-[#71717a]">暂无特征数据，请先导入训练数据</div>
          ) : (
            <ResponsiveContainer width="100%" height={Math.max(chartData.length * 26 + 40, 300)}>
              <BarChart data={chartData} layout="vertical" margin={{ top: 5, right: 20, bottom: 5, left: 0 }}
                onClick={(e) => { if (e?.activePayload?.[0]?.payload?.name) selectFeature(e.activePayload[0].payload.name) }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2a2a3e" horizontal={false} />
                <XAxis type="number" tick={{ fill: "#71717a", fontSize: 11 }} stroke="#2a2a3e" />
                <YAxis type="category" dataKey="name" width={120} tick={{ fill: "#a1a1aa", fontSize: 11 }} stroke="#2a2a3e" />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(255,255,255,0.03)" }} />
                <Bar dataKey="importance" radius={[0, 4, 4, 0]}>
                  {chartData.map((e, i) => <Cell key={i} fill={e.isLeakage ? "#ef4444" : "#f59e0b"} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div className="flex-[2] min-w-0">
        <h2 className="mb-3 text-lg font-bold text-[#e4e4e7]">{selectedEntry ? `${selectedEntry.name} - 分组对比` : "分组概览"}</h2>
        <div className="rounded-xl border border-[#2a2a3e] bg-[#1a1a2e] p-4">
          {groups.length === 0 ? (
            <div className="flex h-40 items-center justify-center text-[#71717a]">暂无分组数据</div>
          ) : selectedEntry ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="inline-block h-3 w-3 rounded-full" style={{ backgroundColor: selectedEntry.isLeakage ? "#ef4444" : "#f59e0b" }} />
                <span className="font-semibold text-[#e4e4e7]">{selectedEntry.name}</span>
                {selectedEntry.isLeakage && <span className="rounded bg-[#ef4444]/20 px-1.5 py-0.5 text-xs text-[#ef4444]">泄漏</span>}
              </div>
              <p className="text-sm text-[#a1a1aa]">重要性: <span className="text-[#f59e0b]">{selectedEntry.importance.toFixed(4)}</span></p>
              <div className="space-y-2">
                {groups.map((g, i) => {
                  const cov = selectedEntry.sparsityByGroup[g.groupId] ?? 0
                  const pct = (cov * 100).toFixed(1)
                  return (
                    <div key={g.groupId} className="flex items-center gap-2">
                      <span className="inline-block h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: GC[i % GC.length] }} />
                      <span className="w-28 truncate text-sm text-[#e4e4e7]">{g.groupName}</span>
                      <div className="flex-1 h-2 rounded-full bg-[#2a2a3e]">
                        <div className="h-full rounded-full transition-all" style={{ width: `${Math.max(Number(pct), 1)}%`, backgroundColor: cov < 0.3 ? "#ef4444" : GC[i % GC.length] }} />
                      </div>
                      <span className="w-12 text-right text-xs text-[#a1a1aa]">{pct}%</span>
                    </div>
                  )
                })}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {top5.map((f) => (
                <div key={f.name} className="cursor-pointer rounded-lg border border-[#2a2a3e] bg-[#0f0f1a] p-3 transition-colors hover:border-[#f59e0b]/40" onClick={() => selectFeature(f.name)}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: f.isLeakage ? "#ef4444" : "#f59e0b" }} />
                      <span className="text-sm font-medium text-[#e4e4e7]">{f.name}</span>
                      {f.isLeakage && <AlertTriangle size={12} className="text-[#ef4444]" />}
                    </div>
                    <ChevronRight size={14} className="text-[#71717a]" />
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {groups.map((g, i) => {
                      const cov = f.sparsityByGroup[g.groupId] ?? 0
                      return <span key={g.groupId} className="rounded-full px-2 py-0.5 text-xs" style={{ backgroundColor: `${GC[i % GC.length]}20`, color: GC[i % GC.length] }}>{g.groupName} {(cov * 100).toFixed(0)}%</span>
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className={`fixed inset-y-0 right-0 z-50 w-96 transform border-l border-[#2a2a3e] bg-[#1a1a2e] shadow-2xl transition-transform duration-300 ${detailDrawerOpen && selectedEntry ? "translate-x-0" : "translate-x-full"}`}>
        {selectedEntry && (
          <div className="flex h-full flex-col p-5">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-[#e4e4e7]">特征详情</h3>
              <button onClick={() => selectFeature(null)} className="rounded-lg p-1.5 text-[#71717a] transition-colors hover:bg-[#2a2a3e] hover:text-[#e4e4e7]"><X size={18} /></button>
            </div>
            <div className="mt-4 space-y-2">
              <p className="text-sm text-[#a1a1aa]">名称: <span className="font-medium text-[#e4e4e7]">{selectedEntry.name}</span></p>
              <p className="text-sm text-[#a1a1aa]">重要性: <span className="font-medium text-[#f59e0b]">{selectedEntry.importance.toFixed(4)}</span></p>
              <div className="flex items-center gap-2 text-sm">
                <span className="text-[#a1a1aa]">泄漏状态:</span>
                {selectedEntry.isLeakage
                  ? <span className="flex items-center gap-1 rounded bg-[#ef4444]/20 px-2 py-0.5 text-[#ef4444]"><AlertTriangle size={12} /> 是</span>
                  : <span className="rounded bg-[#10b981]/20 px-2 py-0.5 text-[#10b981]">否</span>}
              </div>
              {selectedEntry.isLeakage && selectedEntry.leakageReason && (
                <p className="text-sm text-[#a1a1aa]">原因: <span className="text-[#ef4444]">{selectedEntry.leakageReason}</span></p>
              )}
            </div>
            <div className="mt-5">
              <p className="mb-2 text-sm font-medium text-[#e4e4e7]">值分布</p>
              {distributionBins.length > 0 ? (
                <ResponsiveContainer width="100%" height={140}>
                  <BarChart data={distributionBins} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#2a2a3e" vertical={false} />
                    <XAxis dataKey="bin" tick={{ fill: "#71717a", fontSize: 9 }} stroke="#2a2a3e" />
                    <YAxis tick={{ fill: "#71717a", fontSize: 9 }} stroke="#2a2a3e" />
                    <Bar dataKey="count" fill="#06b6d4" radius={[2, 2, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : <p className="text-xs text-[#71717a]">无数值数据可展示</p>}
            </div>
            <div className="mt-5">
              <p className="mb-2 text-sm font-medium text-[#e4e4e7]">分组筛选</p>
              <div className="flex flex-wrap gap-2">
                <button onClick={() => selectGroup(null)} className={`rounded-lg px-3 py-1.5 text-xs transition-colors ${selGroup === null ? "bg-[#f59e0b]/20 text-[#f59e0b]" : "bg-[#2a2a3e] text-[#a1a1aa] hover:text-[#e4e4e7]"}`}>全部</button>
                {groups.map((g, i) => (
                  <button key={g.groupId} onClick={() => selectGroup(g.groupId)}
                    className={`rounded-lg px-3 py-1.5 text-xs transition-colors ${selGroup === g.groupId ? "text-white" : "bg-[#2a2a3e] text-[#a1a1aa] hover:text-[#e4e4e7]"}`}
                    style={selGroup === g.groupId ? { backgroundColor: GC[i % GC.length] } : {}}>{g.groupName}</button>
                ))}
              </div>
            </div>
            <div className="mt-5 flex-1 overflow-auto">
              <p className="mb-2 text-sm font-medium text-[#e4e4e7]">样本预览</p>
              {filteredSamples.length === 0 ? (
                <p className="text-xs text-[#71717a]">无匹配样本</p>
              ) : (
                <div className="space-y-1.5">
                  {filteredSamples.map((s) => (
                    <div key={s.id} className="flex items-center justify-between rounded-lg bg-[#0f0f1a] px-3 py-2">
                      <span className="text-xs text-[#a1a1aa]">{s.id}</span>
                      <span className="text-xs font-medium text-[#06b6d4]">
                        {typeof s.features[selectedEntry.name] === "number" ? (s.features[selectedEntry.name] as number).toFixed(2) : String(s.features[selectedEntry.name] ?? "-")}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
