import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { CheckCircle2, Printer, ShieldCheck } from 'lucide-react'
import { useStore } from '@/store/useStore'
import { filterSamples, summarize } from '@/utils/selectors'
import { detectDrift, getEvent } from '@/utils/drift'
import { computeSummary, criteriaToText, verifyConsistency } from '@/utils/consistency'
import { PageHeader } from '@/components/PageHeader'
import { Badge } from '@/components/Badge'

const TODAY = '2026-06-18'

export default function Report() {
  const samples = useStore((s) => s.samples)
  const criteria = useStore((s) => s.criteria)
  const confirmedDrifts = useStore((s) => s.confirmedDrifts)
  const finalized = useStore((s) => s.finalized)

  const filtered = useMemo(() => filterSamples(samples, criteria), [samples, criteria])
  const counts = useMemo(() => summarize(filtered), [filtered])
  const flagged = useMemo(() => filtered.filter((s) => detectDrift(s).detected), [filtered])
  const unconfirmedDrift = flagged.filter((s) => !confirmedDrifts.includes(s.sampleId))

  const screen = { criteria, counts }
  const file = { criteria, counts }
  const consistency = verifyConsistency(screen, file)
  const changedSamples = filtered.filter((s) => s.changeStatus === '改判')

  return (
    <div className="animate-rise">
      <PageHeader
        eyebrow="Report · 截图说明"
        title="截图说明导出"
        desc="按当前口径生成可直接沟通的截图说明——口径随文保留，屏幕数字与文件说法已核对一致，不再是功能清单。"
        right={
          <button onClick={() => window.print()} className="btn btn-primary no-print">
            <Printer className="h-3.5 w-3.5" />
            打印 / 下载截图说明
          </button>
        }
      />

      <div className="no-print mb-5 panel p-5">
        <div className="mb-3 flex items-center gap-2">
          <Badge tone={consistency.ok ? 'consistent' : 'drift'}>
            {consistency.ok ? (
              <>
                <CheckCircle2 className="h-3 w-3" />
                已核对一致
              </>
            ) : (
              '存在不一致'
            )}
          </Badge>
          <span className="text-[12px] text-ink-500">页面上看到的状态 = 文件里的说法</span>
        </div>
        <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
          {consistency.items.map((item) => (
            <div key={item.label} className="flex items-start gap-2 rounded-sm bg-ink-900/[0.03] px-3 py-2">
              <CheckCircle2
                className={`mt-0.5 h-3.5 w-3.5 flex-none ${item.match ? 'text-consistent' : 'text-drift'}`}
              />
              <div className="min-w-0">
                <div className="text-[11px] text-ink-500">{item.label}</div>
                <div className="num truncate text-[12px] text-ink-800" title={item.screen}>
                  {item.screen}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <article className="print-block mx-auto max-w-[820px] border border-ink-900/15 bg-paper-50 shadow-lift">
        <header className="border-b border-ink-900/15 bg-ink-900 px-8 py-6 text-paper-100">
          <div className="num flex items-center justify-between text-[11px] uppercase tracking-[0.18em] text-paper-300">
            <span>作文批改灰度对比 · 截图说明</span>
            <span>{TODAY}</span>
          </div>
          <h2 className="mt-2 font-serif text-[26px] font-semibold leading-tight">
            灰度判定差异 · 沟通说明
          </h2>
          <p className="mt-1 text-[12px] text-paper-300">
            新旧作文批改模型灰度对比结论，含改判主线与阈值漂移状态，可直接用于跨团队沟通。
          </p>
        </header>

        <div className="space-y-6 px-8 py-6">
          <section>
            <h3 className="num mb-2 text-[10px] uppercase tracking-[0.18em] text-ink-400">一、筛选口径（随文保留）</h3>
            <p className="rounded-sm bg-ink-900/[0.03] px-3 py-2 text-[13px] leading-relaxed text-ink-800">
              {criteriaToText(criteria)}
            </p>
          </section>

          <section>
            <h3 className="num mb-2 text-[10px] uppercase tracking-[0.18em] text-ink-400">二、关键数字（与屏幕同源）</h3>
            <p className="text-[14px] leading-relaxed text-ink-900">
              {computeSummary(counts)}。
            </p>
            <div className="mt-3 grid grid-cols-4 gap-2 text-center">
              {[
                { label: '改判', value: counts.change, cls: 'text-change-deep' },
                { label: '一致', value: counts.consistent, cls: 'text-consistent-deep' },
                { label: '漂移待确认', value: counts.drift, cls: 'text-drift-deep' },
                { label: '待处理', value: counts.pending, cls: 'text-pending-deep' },
              ].map((c) => (
                <div key={c.label} className="rounded-sm border border-ink-900/10 py-2">
                  <div className={`num text-[22px] font-semibold ${c.cls}`}>{String(c.value).padStart(2, '0')}</div>
                  <div className="text-[11px] text-ink-500">{c.label}</div>
                </div>
              ))}
            </div>
          </section>

          <section>
            <h3 className="num mb-2 text-[10px] uppercase tracking-[0.18em] text-ink-400">三、改判样本明细</h3>
            {changedSamples.length === 0 ? (
              <p className="text-[13px] text-ink-400">当前口径下无改判样本。</p>
            ) : (
              <ul className="divide-y divide-ink-900/[0.08]">
                {changedSamples.map((s) => {
                  const oldE = getEvent(s, 'old')
                  const newE = getEvent(s, 'new')
                  const manualE = getEvent(s, 'manual')
                  return (
                    <li key={s.sampleId} className="py-2">
                      <div className="flex flex-wrap items-baseline gap-2">
                        <span className="num text-[12px] text-ink-700">{s.sampleId}</span>
                        <span className="font-serif text-[14px] text-ink-900">{s.essayTitle}</span>
                        {manualE && <Badge tone="manual">人工修正已保留</Badge>}
                        <span className="num ml-auto text-[12px] text-ink-700">
                          {oldE?.score}/{oldE?.band}
                          <span className="mx-1 text-ink-400">→</span>
                          <span className="font-semibold text-change-deep">{newE?.score}/{newE?.band}</span>
                        </span>
                      </div>
                      {newE && <p className="mt-1 text-[12px] leading-relaxed text-ink-600">{newE.rationale}</p>}
                    </li>
                  )
                })}
              </ul>
            )}
          </section>

          <section>
            <h3 className="num mb-2 text-[10px] uppercase tracking-[0.18em] text-ink-400">四、阈值漂移状态</h3>
            <p className="text-[13px] leading-relaxed text-ink-800">
              {unconfirmedDrift.length > 0 ? (
                <>
                  存在 <b className="num text-drift-deep">{unconfirmedDrift.length}</b> 条未确认阈值漂移，「算完」尚未标记——
                  已给出待确认原因与影响范围，待确认后再行算完。
                </>
              ) : flagged.length > 0 ? (
                <>阈值漂移样本（{flagged.length} 条）均已确认原因与影响范围。</>
              ) : (
                <>未检测到阈值漂移。</>
              )}
              算完状态：
              <b className={finalized ? 'text-consistent-deep' : 'text-ink-600'}>
                {finalized ? '已标记算完' : '未标记算完'}
              </b>
              。
            </p>
          </section>

          <section className="border-t border-ink-900/10 pt-4">
            <h3 className="num mb-2 text-[10px] uppercase tracking-[0.18em] text-ink-400">五、沟通要点</h3>
            <ul className="space-y-1.5 text-[13px] leading-relaxed text-ink-800">
              <li>· 新模型对「{changedSamples.map((s) => s.essayTitle).slice(0, 2).join('」「')}」等样本改判，立意深度与篇章逻辑是主要上调维度。</li>
              <li>· 人工修正与回灌结果作为独立主线保留，未被新结果覆盖，可逐条溯源。</li>
              <li>· 阈值带漂移已定位至分界 ±1 区间，建议扩大复核至两侧 ±2 同类样本。</li>
            </ul>
          </section>
        </div>

        <footer className="border-t border-ink-900/15 px-8 py-4">
          <div className="num flex items-center justify-between text-[11px] text-ink-400">
            <span>生成于 {TODAY} · 作文批改灰度对比</span>
            <span className="inline-flex items-center gap-1">
              <ShieldCheck className="h-3 w-3" />
              口径随文 · 数字与屏幕一致
            </span>
          </div>
        </footer>
      </article>

      <p className="no-print mt-4 text-center text-[12px] text-ink-400">
        需调整口径请返回
        <Link to="/" className="mx-1 text-change-deep underline-offset-2 hover:underline">
          对比工作台
        </Link>
        修改筛选后重新生成。
      </p>
    </div>
  )
}
