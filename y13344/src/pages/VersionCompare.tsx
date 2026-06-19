import { useState, useEffect, useCallback } from "react"
import {
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  RefreshCw,
  AlertCircle,
} from "lucide-react"
import type {
  VersionComparison,
  MetricDiff,
  SampleChanges,
  ThresholdChange,
  CorrectionDiff,
  HumanCorrection,
  VersionSnapshot,
} from "@/types"
import { useStore } from "@/store"
import { fetchComparison, fetchVersions } from "@/utils/api"

type MainTab = "metrics" | "samples" | "thresholds" | "corrections"
type SampleSubTab = "added" | "removed" | "changed"

function Skeleton() {
  return (
    <div className="animate-pulse rounded-lg bg-slate-800 p-4 space-y-3">
      <div className="h-4 w-1/3 rounded bg-slate-700" />
      <div className="h-4 w-2/3 rounded bg-slate-700" />
      <div className="h-4 w-1/2 rounded bg-slate-700" />
    </div>
  )
}

function ChangeIndicator({ change }: { change: number }) {
  if (change > 0) {
    return (
      <span className="inline-flex items-center gap-1 text-emerald-400">
        <ArrowUpRight className="h-3.5 w-3.5" />
        +{change.toFixed(3)}
      </span>
    )
  }
  if (change < 0) {
    return (
      <span className="inline-flex items-center gap-1 text-rose-400">
        <ArrowDownRight className="h-3.5 w-3.5" />
        {change.toFixed(3)}
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 text-slate-400">
      <Minus className="h-3.5 w-3.5" />
      0
    </span>
  )
}

function MetricCard({ diff }: { diff: MetricDiff }) {
  const positive = diff.change > 0
  const negative = diff.change < 0
  const barWidth = Math.min(Math.abs(diff.changePercent), 100)
  const barColor = positive
    ? "bg-emerald-500"
    : negative
      ? "bg-rose-500"
      : "bg-slate-600"

  return (
    <div className="rounded-lg border border-slate-700 bg-slate-800/50 p-4">
      <div className="mb-3 text-sm font-medium text-slate-300">
        {diff.name}
      </div>
      <div className="flex items-center justify-between gap-3">
        <span className="font-mono text-lg text-slate-400">
          {diff.previous.toFixed(3)}
        </span>
        <span className="text-slate-600">→</span>
        <span
          className={`font-mono text-lg ${positive ? "text-emerald-400" : negative ? "text-rose-400" : "text-slate-300"}`}
        >
          {diff.current.toFixed(3)}
        </span>
      </div>
      <div className="mt-3 flex items-center justify-between">
        <ChangeIndicator change={diff.change} />
        <span className="font-mono text-xs text-slate-500">
          {diff.changePercent > 0 ? "+" : ""}
          {diff.changePercent.toFixed(2)}%
        </span>
      </div>
      <div className="mt-2 h-1.5 w-full rounded-full bg-slate-700">
        <div
          className={`h-full rounded-full transition-all ${barColor}`}
          style={{ width: `${barWidth}%` }}
        />
      </div>
    </div>
  )
}

function MetricsOverview({ diffs }: { diffs: MetricDiff[] }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {diffs.map((d) => (
        <MetricCard key={d.name} diff={d} />
      ))}
    </div>
  )
}

function SampleChangesPanel({ changes }: { changes: SampleChanges }) {
  const [subTab, setSubTab] = useState<SampleSubTab>("added")
  const subTabs: { key: SampleSubTab; label: string; count: number }[] = [
    { key: "added", label: "新增", count: changes.added.length },
    { key: "removed", label: "删除", count: changes.removed.length },
    { key: "changed", label: "变化", count: changes.changed.length },
  ]

  return (
    <div>
      <div className="mb-4 flex gap-1 rounded-lg bg-slate-800 p-1">
        {subTabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setSubTab(t.key)}
            className={`flex items-center gap-2 rounded-md px-3 py-1.5 text-sm transition-colors ${
              subTab === t.key
                ? "bg-cyan-500/20 text-cyan-400"
                : "text-slate-400 hover:text-slate-300"
            }`}
          >
            {t.label}
            <span
              className={`rounded-full px-1.5 py-0.5 text-xs font-mono ${
                subTab === t.key
                  ? "bg-cyan-500/30 text-cyan-300"
                  : "bg-slate-700 text-slate-500"
              }`}
            >
              {t.count}
            </span>
          </button>
        ))}
      </div>

      {subTab === "added" && (
        <div className="space-y-1">
          {changes.added.length === 0 ? (
            <p className="text-sm text-slate-500">无新增样本</p>
          ) : (
            changes.added.map((id) => (
              <div
                key={id}
                className="flex items-center gap-2 rounded-md bg-slate-800/50 px-3 py-2"
              >
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                <span className="font-mono text-sm text-slate-300">{id}</span>
              </div>
            ))
          )}
        </div>
      )}

      {subTab === "removed" && (
        <div className="space-y-1">
          {changes.removed.length === 0 ? (
            <p className="text-sm text-slate-500">无删除样本</p>
          ) : (
            changes.removed.map((id) => (
              <div
                key={id}
                className="flex items-center gap-2 rounded-md bg-slate-800/50 px-3 py-2"
              >
                <span className="h-2 w-2 rounded-full bg-rose-500" />
                <span className="font-mono text-sm text-slate-300">{id}</span>
              </div>
            ))
          )}
        </div>
      )}

      {subTab === "changed" && (
        <div className="space-y-1">
          {changes.changed.length === 0 ? (
            <p className="text-sm text-slate-500">无变化样本</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-700 text-left text-slate-500">
                  <th className="pb-2 pr-4 font-medium">样本ID</th>
                  <th className="pb-2 pr-4 font-medium">指标</th>
                  <th className="pb-2 pr-4 font-medium text-right">前一版</th>
                  <th className="pb-2 pr-4 font-medium" />
                  <th className="pb-2 font-medium text-right">当前版</th>
                </tr>
              </thead>
              <tbody>
                {changes.changed.map((c, i) => (
                  <tr
                    key={`${c.sampleId}-${c.metricName}-${i}`}
                    className="border-b border-slate-800"
                  >
                    <td className="py-2 pr-4 font-mono text-slate-300">
                      {c.sampleId}
                    </td>
                    <td className="py-2 pr-4 text-slate-400">
                      {c.metricName}
                    </td>
                    <td className="py-2 pr-4 text-right font-mono text-slate-400">
                      {c.previousValue.toFixed(3)}
                    </td>
                    <td className="py-2 pr-4 text-center text-slate-600">→</td>
                    <td
                      className={`py-2 text-right font-mono ${
                        c.currentValue > c.previousValue
                          ? "text-emerald-400"
                          : c.currentValue < c.previousValue
                            ? "text-rose-400"
                            : "text-slate-300"
                      }`}
                    >
                      {c.currentValue.toFixed(3)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  )
}

function ThresholdDriftTable({
  thresholdChanges,
}: {
  thresholdChanges: ThresholdChange[]
}) {
  const directionIcon = (dir: ThresholdChange["driftDirection"]) => {
    if (dir === "up")
      return <ArrowUpRight className="h-4 w-4 text-rose-400" />
    if (dir === "down")
      return <ArrowDownRight className="h-4 w-4 text-amber-400" />
    return <Minus className="h-4 w-4 text-slate-500" />
  }

  const directionText = (dir: ThresholdChange["driftDirection"]) => {
    if (dir === "up") return "text-rose-400"
    if (dir === "down") return "text-amber-400"
    return "text-slate-500"
  }

  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b border-slate-700 text-left text-slate-500">
          <th className="pb-2 pr-4 font-medium">指标</th>
          <th className="pb-2 pr-4 font-medium text-right">前一版阈值</th>
          <th className="pb-2 pr-4 font-medium text-right">当前版阈值</th>
          <th className="pb-2 pr-4 font-medium text-center">方向</th>
          <th className="pb-2 font-medium text-right">偏移量</th>
        </tr>
      </thead>
      <tbody>
        {thresholdChanges.map((t) => {
          const significant =
            Math.abs(t.driftMagnitude) /
              (t.previousThreshold || 1) >
            0.05
          return (
            <tr
              key={t.metricName}
              className={`border-b border-slate-800 ${significant ? "bg-rose-500/5" : ""}`}
            >
              <td className="py-2 pr-4 text-slate-300">
                {t.metricName}
                {significant && (
                  <span className="ml-2 rounded bg-rose-500/20 px-1.5 py-0.5 text-xs text-rose-400">
                    显著
                  </span>
                )}
              </td>
              <td className="py-2 pr-4 text-right font-mono text-slate-400">
                {t.previousThreshold.toFixed(3)}
              </td>
              <td className="py-2 pr-4 text-right font-mono text-slate-300">
                {t.currentThreshold.toFixed(3)}
              </td>
              <td
                className={`py-2 pr-4 text-center ${directionText(t.driftDirection)}`}
              >
                <span className="inline-flex items-center justify-center">
                  {directionIcon(t.driftDirection)}
                </span>
              </td>
              <td
                className={`py-2 text-right font-mono ${directionText(t.driftDirection)}`}
              >
                {t.driftMagnitude > 0 ? "+" : ""}
                {t.driftMagnitude.toFixed(3)}
              </td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}

function CorrectionRecord({ correction }: { correction: HumanCorrection }) {
  return (
    <div className="flex items-center gap-3 rounded-md bg-slate-800/50 px-3 py-2">
      <span className="text-sm text-slate-300">
        {correction.metricName}
      </span>
      <span className="text-slate-600">·</span>
      <span className="font-mono text-xs text-slate-500">
        {correction.evaluationId}
      </span>
      <span className="text-slate-600">:</span>
      <span className="font-mono text-sm text-rose-400">
        {correction.originalValue.toFixed(3)}
      </span>
      <span className="text-slate-600">→</span>
      <span className="font-mono text-sm text-emerald-400">
        {correction.correctedValue.toFixed(3)}
      </span>
    </div>
  )
}

function CorrectionDiffPanel({ diff }: { diff: CorrectionDiff }) {
  const sections = [
    { key: "added" as const, label: "新增修正", items: diff.added },
    { key: "removed" as const, label: "删除修正", items: diff.removed },
    {
      key: "modified" as const,
      label: "修改修正",
      items: diff.modified,
    },
  ]

  return (
    <div className="space-y-6">
      {sections.map((section) => (
        <div key={section.key}>
          <h3 className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-300">
            {section.label}
            <span className="rounded-full bg-slate-700 px-2 py-0.5 text-xs font-mono text-slate-400">
              {section.items.length}
            </span>
          </h3>
          {section.items.length === 0 ? (
            <p className="text-sm text-slate-500">无记录</p>
          ) : section.key === "modified" ? (
            <div className="space-y-1">
              {diff.modified.map((m) => (
                <div
                  key={m.correctionId}
                  className="flex items-center gap-3 rounded-md bg-slate-800/50 px-3 py-2"
                >
                  <span className="font-mono text-sm text-slate-300">
                    {m.correctionId}
                  </span>
                  <span className="font-mono text-sm text-rose-400">
                    {m.previousValue.toFixed(3)}
                  </span>
                  <span className="text-slate-600">→</span>
                  <span className="font-mono text-sm text-emerald-400">
                    {m.currentValue.toFixed(3)}
                  </span>
                  <span className="text-xs text-slate-500">
                    {m.modifiedAt}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-1">
              {(section.items as HumanCorrection[]).map((c) => (
                <CorrectionRecord
                  key={c.id}
                  correction={c}
                />
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

export default function VersionCompare() {
  const { compareVersions, setCompareVersions } = useStore()
  const [versions, setVersions] = useState<VersionSnapshot[]>([])
  const [comparison, setComparison] = useState<VersionComparison | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [mainTab, setMainTab] = useState<MainTab>("metrics")

  useEffect(() => {
    fetchVersions()
      .then((data) => {
        setVersions(
          data.map((v) => ({
            id: v.id,
            version: v.version,
            createdAt: v.createdAt,
            description: v.description,
          }))
        )
      })
      .catch(() => setError("获取版本列表失败"))
  }, [])

  const loadComparison = useCallback(async () => {
    if (!compareVersions.previous || !compareVersions.current) return
    if (compareVersions.previous === compareVersions.current) return
    setLoading(true)
    setError(null)
    try {
      const data = await fetchComparison(
        compareVersions.previous,
        compareVersions.current
      )
      setComparison(data)
    } catch {
      setError("获取版本对比数据失败")
    } finally {
      setLoading(false)
    }
  }, [compareVersions.previous, compareVersions.current])

  useEffect(() => {
    loadComparison()
  }, [loadComparison])

  const mainTabs: { key: MainTab; label: string }[] = [
    { key: "metrics", label: "指标概览" },
    { key: "samples", label: "样本差异" },
    { key: "thresholds", label: "阈值偏移" },
    { key: "corrections", label: "人工修正" },
  ]

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      <div className="flex items-center gap-3">
        <h1 className="text-xl font-semibold text-slate-100">版本对比</h1>
      </div>

      <div className="flex items-center gap-4 rounded-lg border border-slate-700 bg-slate-800/50 p-4">
        <div className="flex-1">
          <label className="mb-1 block text-xs text-slate-500">前一版</label>
          <select
            value={compareVersions.previous}
            onChange={(e) =>
              setCompareVersions({
                ...compareVersions,
                previous: e.target.value,
              })
            }
            className="w-full rounded-md border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-slate-200 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
          >
            <option value="">选择版本</option>
            {versions.map((v) => (
              <option key={v.id} value={v.version}>
                {v.version}
                {v.description ? ` - ${v.description}` : ""}
              </option>
            ))}
          </select>
        </div>

        <div className="pt-5 text-slate-600">→</div>

        <div className="flex-1">
          <label className="mb-1 block text-xs text-slate-500">当前版</label>
          <select
            value={compareVersions.current}
            onChange={(e) =>
              setCompareVersions({
                ...compareVersions,
                current: e.target.value,
              })
            }
            className="w-full rounded-md border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-slate-200 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
          >
            <option value="">选择版本</option>
            {versions.map((v) => (
              <option key={v.id} value={v.version}>
                {v.version}
                {v.description ? ` - ${v.description}` : ""}
              </option>
            ))}
          </select>
        </div>

        <button
          onClick={loadComparison}
          disabled={
            loading ||
            !compareVersions.previous ||
            !compareVersions.current
          }
          className="mt-5 inline-flex items-center gap-1.5 rounded-md bg-cyan-500/20 px-3 py-2 text-sm text-cyan-400 transition-colors hover:bg-cyan-500/30 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <RefreshCw
            className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`}
          />
          对比
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-400">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      )}

      {loading && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} />
          ))}
        </div>
      )}

      {!loading && !error && comparison && (
        <>
          <div className="flex gap-1 rounded-lg bg-slate-800 p-1">
            {mainTabs.map((t) => (
              <button
                key={t.key}
                onClick={() => setMainTab(t.key)}
                className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                  mainTab === t.key
                    ? "bg-cyan-500/20 text-cyan-400"
                    : "text-slate-400 hover:text-slate-300"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div>
            {mainTab === "metrics" && (
              <MetricsOverview diffs={comparison.metricDiffs} />
            )}
            {mainTab === "samples" && (
              <SampleChangesPanel changes={comparison.sampleChanges} />
            )}
            {mainTab === "thresholds" && (
              <ThresholdDriftTable
                thresholdChanges={comparison.thresholdChanges}
              />
            )}
            {mainTab === "corrections" && (
              <CorrectionDiffPanel diff={comparison.correctionDiffs} />
            )}
          </div>
        </>
      )}

      {!loading && !error && !comparison && (
        <div className="flex flex-col items-center justify-center py-20 text-slate-500">
          <p>请选择两个版本进行对比</p>
        </div>
      )}
    </div>
  )
}
