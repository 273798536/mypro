import { useState } from "react"
import { AlertTriangle, CheckCircle2, Eye, ArrowRightCircle } from "lucide-react"
import { useAuditStore } from "@/store/useAuditStore"

const severityColor: Record<string, string> = {
  high: "bg-red-500/20 text-red-400 border border-red-500/30",
  medium: "bg-amber-500/20 text-amber-400 border border-amber-500/30",
  low: "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30",
}

const severityLabel: Record<string, string> = {
  high: "高",
  medium: "中",
  low: "低",
}

function coverageColor(v: number): string {
  if (v >= 0.8) return "bg-green-500/30 text-green-400"
  if (v >= 0.5) return "bg-amber-500/30 text-amber-400"
  return "bg-red-500/30 text-red-400"
}

function coverageBorder(v: number): string {
  if (v >= 0.8) return "border-green-500/20"
  if (v >= 0.5) return "border-amber-500/20"
  return "border-red-500/20"
}

export default function Diagnosis() {
  const { features, groups, conflicts, resolveConflict, selectFeature } = useAuditStore()
  const [resolvingId, setResolvingId] = useState<string | null>(null)
  const [resolutionText, setResolutionText] = useState("")

  const leakageFeatures = features.filter((f) => f.isLeakage)
  const topFeatures = features.slice(0, 20)
  const groupIds = groups.map((g) => g.groupId)
  const groupNames = groups.map((g) => g.groupName)

  const sparseGroupIds = groups
    .filter((g) => Object.values(g.featureCoverage).some((c) => c < 0.5))
    .map((g) => g.groupId)

  const sortedConflicts = [...conflicts].sort((a, b) => b.detectedAt - a.detectedAt)

  const handleResolve = (id: string) => {
    if (!resolutionText.trim()) return
    resolveConflict(id, resolutionText.trim())
    setResolvingId(null)
    setResolutionText("")
  }

  return (
    <div className="min-h-screen bg-[#0f0f1a] text-[#e4e4e7] p-6 space-y-8">
      <section>
        <h2 className="text-xl font-bold text-amber-400 mb-4 flex items-center gap-2">
          <AlertTriangle className="w-5 h-5" />
          特征泄漏检测
        </h2>
        {leakageFeatures.length === 0 ? (
          <div className="flex items-center gap-2 text-green-400 bg-green-500/10 border border-green-500/30 rounded-lg p-4">
            <CheckCircle2 className="w-5 h-5" />
            <span>未检测到特征泄漏</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {leakageFeatures.map((f) => (
              <div
                key={f.name}
                className="border-2 border-red-500/50 bg-[#1a1a2e] rounded-lg p-4 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-red-300">{f.name}</span>
                  <span className="text-sm text-zinc-400">
                    重要性 {(f.importance * 100).toFixed(1)}%
                  </span>
                </div>
                <p className="text-sm text-zinc-400">{f.leakageReason || "疑似泄漏"}</p>
                <button
                  onClick={() => selectFeature(f.name)}
                  className="flex items-center gap-1 text-xs text-cyan-400 hover:text-cyan-300 transition-colors"
                >
                  <Eye className="w-3.5 h-3.5" />
                  查看明细
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="text-xl font-bold text-cyan-400 mb-4">分组稀疏分析</h2>
        {topFeatures.length === 0 || groups.length === 0 ? (
          <p className="text-zinc-500">暂无数据</p>
        ) : (
          <>
            <div className="overflow-x-auto rounded-lg border border-zinc-700/50">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-[#1a1a2e]">
                    <th className="sticky left-0 bg-[#1a1a2e] px-3 py-2 text-left text-zinc-400 font-medium z-10">
                      特征
                    </th>
                    {groupNames.map((name, i) => (
                      <th key={groupIds[i]} className="px-3 py-2 text-center text-zinc-400 font-medium whitespace-nowrap">
                        {name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {topFeatures.map((f) => (
                    <tr key={f.name} className="border-t border-zinc-800/50">
                      <td className="sticky left-0 bg-[#0f0f1a] px-3 py-2 text-zinc-300 whitespace-nowrap z-10">
                        {f.name}
                      </td>
                      {groupIds.map((gid) => {
                        const cov = f.sparsityByGroup[gid] ?? 0
                        return (
                          <td
                            key={gid}
                            className={`px-3 py-2 text-center border ${coverageBorder(cov)} ${coverageColor(cov)} text-xs font-mono`}
                          >
                            {(cov * 100).toFixed(0)}%
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {sparseGroupIds.length > 0 && (
              <div className="mt-4 bg-red-500/10 border border-red-500/30 rounded-lg p-4">
                <p className="text-red-400 font-medium mb-2">存在稀疏特征的分组：</p>
                <ul className="space-y-1">
                  {groups
                    .filter((g) => sparseGroupIds.includes(g.groupId))
                    .map((g) => (
                      <li key={g.groupId} className="text-sm text-zinc-300 flex items-center gap-2">
                        <ArrowRightCircle className="w-3.5 h-3.5 text-red-400" />
                        {g.groupName}
                        <span className="text-zinc-500">
                          ({Object.values(g.featureCoverage).filter((c) => c < 0.5).length} 个特征覆盖率 &lt;50%)
                        </span>
                      </li>
                    ))}
                </ul>
              </div>
            )}
          </>
        )}
      </section>

      <section>
        <h2 className="text-xl font-bold text-red-400 mb-4">冲突留痕</h2>
        {sortedConflicts.length === 0 ? (
          <p className="text-zinc-500">暂无冲突记录</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-zinc-700/50">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[#1a1a2e]">
                  <th className="px-4 py-2 text-left text-zinc-400 font-medium">发现时间</th>
                  <th className="px-4 py-2 text-left text-zinc-400 font-medium">冲突类型</th>
                  <th className="px-4 py-2 text-left text-zinc-400 font-medium">严重性</th>
                  <th className="px-4 py-2 text-left text-zinc-400 font-medium">描述</th>
                  <th className="px-4 py-2 text-left text-zinc-400 font-medium">涉及数据源</th>
                  <th className="px-4 py-2 text-left text-zinc-400 font-medium">处理结果</th>
                </tr>
              </thead>
              <tbody>
                {sortedConflicts.map((c) => (
                  <tr key={c.id} className="border-t border-zinc-800/50 hover:bg-zinc-800/20">
                    <td className="px-4 py-2 text-zinc-300 whitespace-nowrap">
                      {new Date(c.detectedAt).toLocaleString("zh-CN")}
                    </td>
                    <td className="px-4 py-2 text-zinc-300">{c.type}</td>
                    <td className="px-4 py-2">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${severityColor[c.severity]}`}>
                        {severityLabel[c.severity]}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-zinc-300">{c.description}</td>
                    <td className="px-4 py-2 text-zinc-400 text-xs">
                      {c.relatedSources.map((s, i) => (
                        <span key={i} className="inline-block mr-1">
                          {s.source}@{s.version}
                        </span>
                      ))}
                    </td>
                    <td className="px-4 py-2">
                      {c.resolvedAt ? (
                        <span className="text-green-400 text-xs">{c.resolution}</span>
                      ) : resolvingId === c.id ? (
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={resolutionText}
                            onChange={(e) => setResolutionText(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && handleResolve(c.id)}
                            placeholder="输入处理结果"
                            className="bg-zinc-800 border border-zinc-600 rounded px-2 py-1 text-xs text-zinc-200 w-32 focus:outline-none focus:border-cyan-500"
                            autoFocus
                          />
                          <button
                            onClick={() => handleResolve(c.id)}
                            className="text-xs text-cyan-400 hover:text-cyan-300"
                          >
                            确认
                          </button>
                          <button
                            onClick={() => { setResolvingId(null); setResolutionText("") }}
                            className="text-xs text-zinc-500 hover:text-zinc-400"
                          >
                            取消
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <span className="text-amber-400 text-xs">待处理</span>
                          <button
                            onClick={() => setResolvingId(c.id)}
                            className="text-xs text-cyan-400 hover:text-cyan-300 border border-cyan-500/30 rounded px-2 py-0.5"
                          >
                            处理
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
