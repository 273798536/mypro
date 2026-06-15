import { useMemo } from "react"
import { useOceanStore } from "@/store/useOceanStore"

export default function TidalSummary() {
  const { tidalRecords } = useOceanStore()

  const stats = useMemo(() => {
    const valid = tidalRecords.filter((r) => r.tideLevel !== null)
    if (valid.length === 0) {
      return { max: null, min: null, avg: null, count: 0, nullCount: tidalRecords.length }
    }

    const levels = valid.map((r) => r.tideLevel!)
    const max = Math.max(...levels)
    const min = Math.min(...levels)
    const avg = levels.reduce((a, b) => a + b, 0) / levels.length
    const nullCount = tidalRecords.filter((r) => r.tideLevel === null).length
    const duplicateCount = tidalRecords.length - new Set(tidalRecords.map((r) => r.timestamp)).size

    return { max, min, avg, count: valid.length, nullCount, duplicateCount }
  }, [tidalRecords])

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 animate-slide-up">
      <h3 className="font-serif text-sm text-ocean-ink mb-3">潮汐文字摘要</h3>
      <div className="text-sm leading-relaxed text-gray-700 space-y-2">
        <p>
          今日共录入 <span className="font-mono text-ocean-light font-semibold">{stats.count}</span> 条有效潮位记录，
          最高潮位{" "}
          <span className="font-mono text-ocean-light font-semibold">
            {stats.max !== null ? stats.max.toFixed(1) : "—"}m
          </span>
          ，
          最低潮位{" "}
          <span className="font-mono text-ocean-light font-semibold">
            {stats.min !== null ? stats.min.toFixed(1) : "—"}m
          </span>
          ，
          平均潮位{" "}
          <span className="font-mono text-ocean-light font-semibold">
            {stats.avg !== null ? stats.avg.toFixed(1) : "—"}m
          </span>
          。
        </p>
        {stats.nullCount > 0 && (
          <p className="text-ocean-coral">
            ⚠ 存在 <span className="font-mono font-semibold">{stats.nullCount}</span> 条空值记录，需复核补充。
          </p>
        )}
        {(stats.duplicateCount ?? 0) > 0 && (
          <p className="text-ocean-coral">
            ⚠ 检测到 <span className="font-mono font-semibold">{stats.duplicateCount}</span>{" "}
            条时间戳重复记录，需去重确认。
          </p>
        )}
        {stats.nullCount === 0 && (stats.duplicateCount ?? 0) === 0 && (
          <p className="text-ocean-green">
            ✓ 数据质量良好，所有记录完整无重复。
          </p>
        )}
      </div>

      <div className="mt-4 pt-3 border-t border-gray-100 grid grid-cols-3 gap-3">
        <div className="text-center">
          <div className="text-xs text-gray-400 mb-1">最高潮位</div>
          <div className="font-mono text-lg text-ocean-light font-bold">
            {stats.max !== null ? stats.max.toFixed(1) : "—"}
            <span className="text-xs text-gray-400 ml-0.5">m</span>
          </div>
        </div>
        <div className="text-center">
          <div className="text-xs text-gray-400 mb-1">最低潮位</div>
          <div className="font-mono text-lg text-ocean-mid font-bold">
            {stats.min !== null ? stats.min.toFixed(1) : "—"}
            <span className="text-xs text-gray-400 ml-0.5">m</span>
          </div>
        </div>
        <div className="text-center">
          <div className="text-xs text-gray-400 mb-1">平均潮位</div>
          <div className="font-mono text-lg text-ocean-ink font-bold">
            {stats.avg !== null ? stats.avg.toFixed(1) : "—"}
            <span className="text-xs text-gray-400 ml-0.5">m</span>
          </div>
        </div>
      </div>
    </div>
  )
}
