import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { AlertTriangle, ArrowRight } from 'lucide-react'
import { useStore } from '@/store/useStore'
import { PageHeader } from '@/components/PageHeader'
import { SummaryCards } from '@/components/SummaryCards'
import { FilterPanel } from '@/components/FilterPanel'
import { SampleTable } from '@/components/SampleTable'
import { filterSamples, summarize, uniqueGrades, uniqueSources } from '@/utils/selectors'
import { detectDrift } from '@/utils/drift'

export default function Workbench() {
  const samples = useStore((s) => s.samples)
  const criteria = useStore((s) => s.criteria)
  const setCriteria = useStore((s) => s.setCriteria)
  const resetCriteria = useStore((s) => s.resetCriteria)
  const confirmedDrifts = useStore((s) => s.confirmedDrifts)

  const filtered = useMemo(() => filterSamples(samples, criteria), [samples, criteria])
  const counts = useMemo(() => summarize(filtered), [filtered])
  const sources = useMemo(() => uniqueSources(samples), [samples])
  const grades = useMemo(() => uniqueGrades(samples), [samples])
  const unconfirmedDrift = useMemo(
    () => samples.filter((s) => detectDrift(s).detected && !confirmedDrifts.includes(s.sampleId)),
    [samples, confirmedDrifts],
  )

  return (
    <div className="animate-rise">
      <PageHeader
        eyebrow="Workbench · 灰度对比"
        title="对比工作台"
        desc="逐条核对新旧模型判定差异。人工修正作为独立主线层保留、不被新结果覆盖；筛选口径随导出保留，与屏幕数字同源。"
        right={
          <Link to="/report" className="btn btn-primary">
            生成截图说明
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        }
      />

      {unconfirmedDrift.length > 0 && (
        <Link
          to="/drift"
          className="mb-5 flex items-center gap-3 rounded-md border border-drift/30 bg-drift-soft px-4 py-3 transition-colors hover:bg-drift-soft/70"
        >
          <AlertTriangle className="h-4 w-4 flex-none text-drift-deep" />
          <span className="text-[13px] text-drift-deep">
            检测到 <b className="num">{unconfirmedDrift.length}</b> 条阈值漂移，已阻断「算完」——不要急着算完，先到阈值漂移监控确认待确认原因与影响范围。
          </span>
          <ArrowRight className="ml-auto h-4 w-4 flex-none text-drift-deep" />
        </Link>
      )}

      <div className="mb-5">
        <SummaryCards counts={counts} />
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[220px_1fr]">
        <FilterPanel
          criteria={criteria}
          sources={sources}
          grades={grades}
          onChange={setCriteria}
          onReset={resetCriteria}
        />
        <SampleTable samples={filtered} />
      </div>
    </div>
  )
}
