import { useMemo, useState } from 'react'
import { TrendingDown, ShieldAlert, Link2, ArrowUpRight } from 'lucide-react'
import { useReviewStore } from '@/store/useReviewStore'
import { PageHeader } from '@/components/PageHeader'
import { SectionCard } from '@/components/SectionCard'
import { EvidenceDrawer } from '@/components/EvidenceDrawer'
import type { SampleEvidence } from '@/types'

export function Analytics() {
  const { samples, orders } = useReviewStore()
  const [evidence, setEvidence] = useState<SampleEvidence | null>(null)

  const stats = useMemo(() => {
    const corrections = samples.filter((s) => s.manualCorrection)
    const overwritten = corrections.filter((s) => s.manualCorrection!.overwritten)
    const conflicts = samples.filter((s) => s.hasLabelConflict)
    const processed = orders.filter((o) => o.status === 'processed').length
    const needs = orders.filter((o) => o.status === 'needs_evidence').length
    const totalImpact = samples.reduce((sum, s) => sum + s.impact, 0)
    const conflictImpact = conflicts.reduce((sum, s) => sum + s.impact, 0)
    return {
      total: samples.length,
      corrections: corrections.length,
      overwritten: overwritten.length,
      conflicts: conflicts.length,
      processed,
      needs,
      conflictRatio: totalImpact ? (conflictImpact / totalImpact) * 100 : 0,
    }
  }, [samples, orders])

  const ranked = useMemo(
    () => [...samples].sort((a, b) => b.impact - a.impact),
    [samples],
  )
  const conflicts = ranked.filter((s) => s.hasLabelConflict)
  const normal = ranked.filter((s) => !s.hasLabelConflict)
  const maxImpact = ranked[0]?.impact ?? 1

  return (
    <div className="min-h-screen">
      <PageHeader
        index="CASE FILE · 02"
        title="改判评审"
        subtitle="不只看总指标，追问哪几条样本把结论拉偏了；标签冲突单独隔离。"
      />

      <div className="space-y-5 p-6 lg:p-8">
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <MetricCard label="样本总数" value={stats.total} tone="text-ink-900" sub="全部取证样本" />
          <MetricCard
            label="人工改判"
            value={stats.corrections}
            tone="text-dossier"
            sub={`其中 ${stats.overwritten} 条曾被覆盖`}
          />
          <MetricCard
            label="标签冲突·已隔离"
            value={stats.conflicts}
            tone="text-forensic"
            sub="不揉进正常结果"
          />
          <MetricCard
            label="已处理 / 待补证据"
            value={`${stats.processed} / ${stats.needs}`}
            tone="text-verified"
            sub="工单处理状态"
          />
        </div>

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_22rem]">
          <SectionCard
            title="样本级影响下钻"
            index="A"
            accent="text-dossier"
            actions={
              <span className="font-mono text-[10px] text-ink-400">
                按「拉偏影响度」降序
              </span>
            }
          >
            <p className="mb-3 text-xs text-ink-500">
              负责人追问的「哪几条样本把结论拉偏了」——条形越长，对总体结论的拉偏越大，可点回样本证据。
            </p>
            <ul className="space-y-2.5">
              {normal.map((s, i) => (
                <li key={s.sampleId}>
                  <button
                    onClick={() => setEvidence(s)}
                    className="group flex w-full items-center gap-3 rounded-[3px] border border-transparent px-2 py-1.5 text-left transition hover:border-ink-900/10 hover:bg-paper-200/50"
                  >
                    <span className="w-5 shrink-0 text-right font-mono text-[11px] font-700 text-ink-400">
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate font-mono text-xs text-ink-700">
                          {s.sampleId} · {s.studentName}
                        </span>
                        <span className="font-mono text-xs font-700 text-forensic">
                          {s.impact.toFixed(1)}
                        </span>
                      </div>
                      <div className="mt-1 h-1.5 w-full overflow-hidden rounded-sm bg-paper-200">
                        <div
                          className="h-full rounded-sm bg-dossier/70 transition-all group-hover:bg-dossier"
                          style={{ width: `${(s.impact / maxImpact) * 100}%` }}
                        />
                      </div>
                    </div>
                    <Link2 className="h-3.5 w-3.5 shrink-0 text-ink-400 transition group-hover:text-dossier" />
                  </button>
                </li>
              ))}
            </ul>
          </SectionCard>

          <SectionCard
            title="标签冲突隔离区"
            index="B"
            accent="text-forensic"
            actions={
              <span className="stamp border-forensic text-forensic">
                不进正常统计
              </span>
            }
            bodyClassName="space-y-3"
          >
            <p className="text-xs text-ink-500">
              负责人最怕标签冲突被揉进正常结果。以下记录已单独拎出，隔离签发。
            </p>
            {conflicts.map((s) => (
              <button
                key={s.sampleId}
                onClick={() => setEvidence(s)}
                className="block w-full rounded-md border border-forensic/40 bg-forensic/[0.04] p-3 text-left transition hover:bg-forensic/10"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-[11px] font-700 text-forensicDark">
                    {s.sampleId}
                  </span>
                  <span className="font-mono text-[11px] font-700 text-forensic">
                    拉偏 {s.impact.toFixed(1)}
                  </span>
                </div>
                <p className="mt-1 text-[11px] leading-relaxed text-ink-700">
                  {s.conflictNote}
                </p>
                <span className="mt-2 inline-flex items-center gap-1 text-[10px] font-600 text-forensic">
                  点回样本证据
                  <ArrowUpRight className="h-3 w-3" />
                </span>
              </button>
            ))}
          </SectionCard>
        </div>

        <SectionCard
          title="冲突对总指标的影响"
          index="C"
          accent="text-forensic"
          bodyClassName="space-y-3"
        >
          <p className="text-xs text-ink-500">
            若把标签冲突样本计入正常结果，总指标会被拉偏；隔离后结论更稳。
          </p>
          <div className="space-y-2">
            <ImpactBar
              label="正常样本合计影响度"
              value={normal.reduce((a, b) => a + b.impact, 0)}
              total={samples.reduce((a, b) => a + b.impact, 0)}
              tone="bg-dossier/70"
            />
            <ImpactBar
              label="冲突样本合计影响度（已隔离）"
              value={conflicts.reduce((a, b) => a + b.impact, 0)}
              total={samples.reduce((a, b) => a + b.impact, 0)}
              tone="bg-forensic/70"
            />
          </div>
          <div className="flex items-center gap-2 rounded-md border border-ink-900/10 bg-paper-100/60 px-3 py-2 text-xs text-ink-500">
            <TrendingDown className="h-4 w-4 text-verified" />
            隔离后，冲突样本对总指标的拉偏占比约
            <span className="font-mono font-700 text-forensic">
              {stats.conflictRatio.toFixed(1)}%
            </span>
            已剔除。
          </div>
          <div className="flex items-center gap-2 rounded-md border border-forensic/30 bg-forensic/5 px-3 py-2 text-xs text-forensicDark">
            <ShieldAlert className="h-4 w-4 shrink-0" />
            冲突结论将单独签发，不并入正常结果统计。
          </div>
        </SectionCard>
      </div>

      <EvidenceDrawer sample={evidence} onClose={() => setEvidence(null)} />
    </div>
  )
}

function MetricCard({
  label,
  value,
  sub,
  tone,
}: {
  label: string
  value: string | number
  sub: string
  tone: string
}) {
  return (
    <div className="dossier-surface relative rounded-md p-4">
      <span className="pointer-events-none absolute inset-0 corner-tick rounded-md" />
      <div className="text-[10px] uppercase tracking-wider text-ink-400">{label}</div>
      <div className={`mt-1 font-serif text-3xl font-900 ${tone}`}>{value}</div>
      <div className="mt-0.5 text-[11px] text-ink-400">{sub}</div>
    </div>
  )
}

function ImpactBar({
  label,
  value,
  total,
  tone,
}: {
  label: string
  value: number
  total: number
  tone: string
}) {
  const pct = total ? (value / total) * 100 : 0
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-xs">
        <span className="text-ink-500">{label}</span>
        <span className="font-mono font-700 text-ink-900">{value.toFixed(1)}</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-sm bg-paper-200">
        <div className={`h-full rounded-sm ${tone}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}
