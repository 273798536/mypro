import { useState } from 'react'
import { useReviewStore } from '@/store/useReviewStore'
import { PageHeader } from '@/components/PageHeader'
import { OrderList } from '@/components/workbench/OrderList'
import { SampleDetail } from '@/components/workbench/SampleDetail'
import { CorrectionPanel } from '@/components/workbench/CorrectionPanel'
import { EvidenceDrawer } from '@/components/EvidenceDrawer'
import type { SampleEvidence } from '@/types'

export function Workbench() {
  const { orders, samples, selectedSampleId } = useReviewStore()
  const [evidence, setEvidence] = useState<SampleEvidence | null>(null)

  const selected = samples.find((s) => s.sampleId === selectedSampleId) ?? null
  const pendingCount = orders.filter((o) => o.status === 'pending').length

  return (
    <div className="flex h-screen flex-col">
      <PageHeader
        index="CASE FILE · 01"
        title="复核工作台"
        subtitle="从线上工单翻起，逐条点回样本证据，人工修正不被新结果盖掉。"
        meta={
          <div className="hidden items-center gap-4 md:flex">
            <MetaItem k="工单" v={orders.length} />
            <MetaItem k="待处理" v={pendingCount} tone="text-amber-dark" />
          </div>
        }
      />
      <div className="grid min-h-0 flex-1 grid-cols-1 md:grid-cols-[20rem_minmax(0,1fr)_22rem]">
        <div className="border-r border-ink-900/10">
          <OrderList orders={orders} selectedSampleId={selectedSampleId} />
        </div>
        <div className="border-r border-ink-900/10">
          <SampleDetail sample={selected} onOpenEvidence={setEvidence} />
        </div>
        <div className="hidden md:block">
          <CorrectionPanel sample={selected} />
        </div>
      </div>
      <EvidenceDrawer sample={evidence} onClose={() => setEvidence(null)} />
    </div>
  )
}

function MetaItem({ k, v, tone = 'text-ink-900' }: { k: string; v: number; tone?: string }) {
  return (
    <div className="text-right">
      <div className={`font-mono text-lg font-700 ${tone}`}>{v}</div>
      <div className="text-[10px] uppercase tracking-wider text-ink-400">{k}</div>
    </div>
  )
}
