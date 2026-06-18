import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { AlertTriangle, ArrowRight, Ban, CheckCircle2, ShieldCheck } from 'lucide-react'
import { useStore } from '@/store/useStore'
import { BAND_THRESHOLDS } from '@/data/types'
import { aggregateDrift, detectDrift, getEvent } from '@/utils/drift'
import { PageHeader } from '@/components/PageHeader'
import { Badge } from '@/components/Badge'

export default function Drift() {
  const samples = useStore((s) => s.samples)
  const confirmedDrifts = useStore((s) => s.confirmedDrifts)
  const confirmDrift = useStore((s) => s.confirmDrift)
  const finalize = useStore((s) => s.finalize)
  const finalized = useStore((s) => s.finalized)

  const agg = useMemo(() => aggregateDrift(samples), [samples])
  const flagged = agg.flagged
  const unconfirmedCount = flagged.filter((s) => !confirmedDrifts.includes(s.sampleId)).length
  const maxBandCount = Math.max(1, ...agg.bands.map((b) => Math.max(b.oldCount, b.newCount)))

  return (
    <div className="animate-rise">
      <PageHeader
        eyebrow="Drift Monitor · 阈值漂移"
        title="阈值漂移监控"
        desc="出现阈值漂移时不要急着算完——先给出待确认原因与影响范围，确认后方可标记「算完」。"
      />

      <div
        className={`mb-5 flex flex-wrap items-center gap-3 rounded-md border px-5 py-4 ${
          finalized
            ? 'border-consistent/30 bg-consistent-soft'
            : 'border-drift/30 bg-drift-soft'
        }`}
      >
        {finalized ? (
          <ShieldCheck className="h-5 w-5 text-consistent-deep" />
        ) : (
          <AlertTriangle className="h-5 w-5 text-drift-deep" />
        )}
        <div className="min-w-0 flex-1">
          <div className="text-[14px] font-semibold text-ink-900">
            {finalized ? '已标记算完：全部漂移已确认' : '「算完」已阻断'}
          </div>
          <div className="text-[12px] text-ink-600">
            {finalized
              ? '所有阈值漂移样本均已确认原因与影响范围，可进入截图说明导出。'
              : `尚有 ${unconfirmedCount} 条阈值漂移待确认，确认前不可标记算完。`}
          </div>
        </div>
        <button
          onClick={() => finalize()}
          disabled={unconfirmedCount > 0}
          className={`btn ${unconfirmedCount > 0 ? 'btn-ghost cursor-not-allowed opacity-50' : 'btn-primary'}`}
        >
          {unconfirmedCount > 0 ? (
            <>
              <Ban className="h-3.5 w-3.5" />
              阻断算完
            </>
          ) : finalized ? (
            <>
              <CheckCircle2 className="h-3.5 w-3.5" />
              已算完
            </>
          ) : (
            <>
              <ShieldCheck className="h-3.5 w-3.5" />
              标记算完
            </>
          )}
        </button>
      </div>

      <div className="mb-5 panel p-5">
        <div className="num mb-4 text-[10px] uppercase tracking-[0.18em] text-ink-400">
          阈值带分布 · 旧模型 vs 新模型
        </div>
        <div className="space-y-3">
          {agg.bands.map((b) => {
            const range = BAND_THRESHOLDS.find((t) => t.band === b.band)
            return (
              <div key={b.band} className="grid grid-cols-[64px_1fr_auto] items-center gap-3">
                <div className="text-[12px] text-ink-700">
                  <span className="font-medium">{b.band}</span>
                  <span className="num ml-1 text-[10px] text-ink-400">
                    {range?.min}–{range?.max}
                  </span>
                </div>
                <div className="space-y-1">
                  <div className="h-2 w-full overflow-hidden rounded-xs bg-ink-900/[0.05]">
                    <div
                      className="h-full origin-left animate-bar rounded-xs bg-ink-400"
                      style={{ width: `${(b.oldCount / maxBandCount) * 100}%` }}
                    />
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-xs bg-ink-900/[0.05]">
                    <div
                      className="h-full origin-left animate-bar rounded-xs bg-change"
                      style={{ width: `${(b.newCount / maxBandCount) * 100}%`, animationDelay: '120ms' }}
                    />
                  </div>
                </div>
                <div className="num flex w-24 items-center justify-end gap-2 text-[12px]">
                  <span className="text-ink-500">{b.oldCount}</span>
                  <span className="text-ink-400">→</span>
                  <span className="font-semibold text-ink-900">{b.newCount}</span>
                  <span className={`w-8 text-right ${b.delta > 0 ? 'text-change-deep' : b.delta < 0 ? 'text-drift-deep' : 'text-ink-400'}`}>
                    {b.delta > 0 ? `+${b.delta}` : b.delta || 0}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
        <div className="mt-3 flex items-center gap-4 border-t border-ink-900/10 pt-3">
          <span className="num flex items-center gap-1.5 text-[11px] text-ink-500">
            <span className="inline-block h-2 w-2 bg-ink-400" /> 旧模型
          </span>
          <span className="num flex items-center gap-1.5 text-[11px] text-change-deep">
            <span className="inline-block h-2 w-2 bg-change" /> 新模型
          </span>
        </div>
      </div>

      <div className="panel overflow-hidden">
        <div className="flex items-center justify-between border-b border-ink-900/10 px-5 py-3">
          <span className="text-[13px] font-semibold text-ink-900">漂移样本清单</span>
          <Badge tone="drift">{flagged.length} 条</Badge>
        </div>
        {flagged.length === 0 ? (
          <div className="py-10 text-center text-[13px] text-ink-400">未检测到阈值漂移。</div>
        ) : (
          <ul className="divide-y divide-ink-900/[0.06]">
            {flagged.map((s) => {
              const flag = detectDrift(s)
              const confirmed = confirmedDrifts.includes(s.sampleId)
              const oldE = getEvent(s, 'old')
              const newE = getEvent(s, 'new')
              return (
                <li key={s.sampleId} className="px-5 py-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link
                      to={`/sample/${s.sampleId}`}
                      className="num text-[13px] font-medium text-ink-900 hover:underline"
                    >
                      {s.sampleId}
                    </Link>
                    <span className="text-[12px] text-ink-500">{s.essayTitle}</span>
                    <span className="num text-[11px] text-ink-400">{s.source}</span>
                    <span className="num ml-auto text-[12px] text-ink-700">
                      {oldE?.score}/{oldE?.band}
                      <ArrowRight className="mx-1 inline h-3 w-3 text-ink-400" />
                      <span className="font-semibold text-drift-deep">{newE?.score}/{newE?.band}</span>
                    </span>
                    {confirmed ? (
                      <Badge tone="consistent">
                        <CheckCircle2 className="h-3 w-3" />
                        已确认
                      </Badge>
                    ) : (
                      <Badge tone="pending">待确认</Badge>
                    )}
                  </div>
                  <div className="mt-2.5 grid grid-cols-1 gap-2 md:grid-cols-2">
                    <div className="rounded-sm bg-drift-soft/50 p-2.5">
                      <div className="num mb-0.5 text-[10px] uppercase tracking-wider text-drift-deep">待确认原因</div>
                      <p className="text-[12px] leading-relaxed text-ink-700">{flag.reason}</p>
                    </div>
                    <div className="rounded-sm bg-pending-soft/40 p-2.5">
                      <div className="num mb-0.5 text-[10px] uppercase tracking-wider text-pending-deep">影响范围</div>
                      <p className="text-[12px] leading-relaxed text-ink-700">{flag.impactScope}</p>
                    </div>
                  </div>
                  {!confirmed && (
                    <button
                      onClick={() => confirmDrift(s.sampleId)}
                      className="btn btn-ghost mt-2.5 border-drift/30 text-drift-deep"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      确认原因与影响范围
                    </button>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}
