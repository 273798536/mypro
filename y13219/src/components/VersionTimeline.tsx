import { useStore, VersionSnapshot } from '@/store/useStore'
import { GitCommitHorizontal, ArrowRight } from 'lucide-react'

export default function VersionTimeline() {
  const versions = useStore((s) => s.versions)
  const selectedVersionA = useStore((s) => s.selectedVersionA)
  const selectedVersionB = useStore((s) => s.selectedVersionB)
  const setSelectedVersionA = useStore((s) => s.setSelectedVersionA)
  const setSelectedVersionB = useStore((s) => s.setSelectedVersionB)

  const handleNodeClick = (id: string) => {
    if (!selectedVersionA) {
      setSelectedVersionA(id)
    } else if (!selectedVersionB) {
      setSelectedVersionB(id)
    } else {
      setSelectedVersionA(id)
      setSelectedVersionB(null)
    }
  }

  const versionA = versions.find((v) => v.id === selectedVersionA)
  const versionB = versions.find((v) => v.id === selectedVersionB)

  return (
    <div className="mt-8">
      <h3 className="text-sm font-medium text-driftwood mb-4">版本时间线</h3>

      <div className="flex items-start gap-0 overflow-x-auto pb-4">
        {versions.map((v, i) => {
          const isSelectedA = v.id === selectedVersionA
          const isSelectedB = v.id === selectedVersionB
          return (
            <div key={v.id} className="flex items-start shrink-0">
              <button
                onClick={() => handleNodeClick(v.id)}
                className={`flex flex-col items-center gap-1.5 px-3 py-2 rounded-lg transition-colors ${
                  isSelectedA || isSelectedB
                    ? 'bg-amber/10 ring-2 ring-amber/40'
                    : 'hover:bg-sandstone/40'
                }`}
              >
                <div
                  className={`w-3 h-3 rounded-full border-2 ${
                    isSelectedA ? 'bg-amber border-amber' : isSelectedB ? 'bg-moss border-moss' : 'bg-white border-driftwood'
                  }`}
                />
                <span className="text-xs font-medium text-inkstone max-w-[120px] text-center leading-tight">
                  {v.label}
                </span>
                <span className="text-[10px] text-driftwood">
                  {new Date(v.createdAt).toLocaleDateString('zh-CN')}
                </span>
              </button>
              {i < versions.length - 1 && (
                <div className="flex items-center h-3 mt-2.5">
                  <div className="w-8 h-px bg-driftwood/30" />
                  <GitCommitHorizontal size={12} className="text-driftwood/50 -mx-1" />
                  <div className="w-8 h-px bg-driftwood/30" />
                </div>
              )}
            </div>
          )
        })}
      </div>

      <p className="text-xs text-driftwood/60 mb-3">
        点击两个版本节点进行对比（先选旧版，再选新版）
      </p>

      {versionA && versionB && <VersionDiff versionA={versionA} versionB={versionB} />}
    </div>
  )
}

function VersionDiff({ versionA, versionB }: { versionA: VersionSnapshot; versionB: VersionSnapshot }) {
  const allEntryIds = new Set([
    ...versionA.entries.map((e) => e.id),
    ...versionB.entries.map((e) => e.id),
  ])

  return (
    <div className="bg-white rounded-lg border border-sandstone/60 overflow-hidden">
      <div className="px-4 py-2.5 bg-parchment/60 border-b border-sandstone/40 flex items-center gap-3 text-xs">
        <span className="text-amber font-medium">{versionA.label}</span>
        <ArrowRight size={14} className="text-driftwood" />
        <span className="text-moss font-medium">{versionB.label}</span>
      </div>
      <div className="p-4 space-y-2">
        {Array.from(allEntryIds).map((id) => {
          const a = versionA.entries.find((e) => e.id === id)
          const b = versionB.entries.find((e) => e.id === id)
          const diffs: string[] = []

          if (a && b) {
            if (a.revenueShareRatio !== b.revenueShareRatio) diffs.push(`分账：${a.revenueShareRatio}%→${b.revenueShareRatio}%`)
            if (a.status !== b.status) diffs.push(`状态：${a.status}→${b.status}`)
            const aPeriod = a.authorizationPeriod ? `${a.authorizationPeriod.start}~${a.authorizationPeriod.end}` : '无'
            const bPeriod = b.authorizationPeriod ? `${b.authorizationPeriod.start}~${b.authorizationPeriod.end}` : '无'
            if (aPeriod !== bPeriod) diffs.push(`期限：${aPeriod}→${bPeriod}`)
          } else if (!a) {
            diffs.push('新增条目')
          } else if (!b) {
            diffs.push('已删除')
          }

          if (diffs.length === 0) {
            return (
              <div key={id} className="text-xs text-driftwood flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-sage/40" />
                <span>{a?.songName || b?.songName}</span>
                <span className="text-driftwood/50">无变化</span>
              </div>
            )
          }

          return (
            <div key={id} className="text-xs bg-amber/5 border border-amber/15 rounded px-3 py-2">
              <span className="font-medium text-inkstone">{a?.songName || b?.songName}</span>
              <div className="mt-1 space-y-0.5">
                {diffs.map((d, i) => (
                  <p key={i} className="text-amber">{d}</p>
                ))}
              </div>
            </div>
          )
        })}

        {versionB.overrides.length > versionA.overrides.length && (
          <div className="text-xs text-amber mt-2 pt-2 border-t border-sandstone/40">
            新增 {versionB.overrides.length - versionA.overrides.length} 条改判记录
          </div>
        )}
      </div>
    </div>
  )
}
