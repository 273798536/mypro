import { useMemo, useState, type ReactNode } from 'react'
import { CheckCircle2, FileWarning, Copy, Check, ScrollText, Cpu, FileText } from 'lucide-react'
import { useReviewStore } from '@/store/useReviewStore'
import { PageHeader } from '@/components/PageHeader'
import { SectionCard } from '@/components/SectionCard'
import { StatusStamp } from '@/components/StatusStamp'
import { SourceBadge } from '@/components/SourceBadge'
import { prettyJson } from '@/lib/format'
import type { SampleEvidence, WorkOrder } from '@/types'

type Tab = 'orders' | 'records' | 'responses'

export function Ledger() {
  const { orders, samples } = useReviewStore()
  const [tab, setTab] = useState<Tab>('orders')
  const [copied, setCopied] = useState(false)

  const processed = orders.filter((o) => o.status === 'processed')
  const needs = orders.filter((o) => o.status === 'needs_evidence')
  const conflicts = orders.filter((o) => o.status === 'conflict')
  const pending = orders.filter((o) => o.status === 'pending')

  const deliveryText = useMemo(() => buildDeliveryText(orders, samples), [orders, samples])

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(deliveryText)
    } catch {
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1600)
      return
    }
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1600)
  }

  return (
    <div className="min-h-screen">
      <PageHeader
        index="CASE FILE · 03"
        title="处理台帐与交付"
        subtitle="最终看哪些已处理、哪些还要补证据；交付说明让老唐把工单·处理记录·接口返回对给别人看。"
        actions={
          <button
            onClick={handleCopy}
            className="inline-flex items-center gap-1.5 rounded-[3px] bg-dossier px-3 py-2 text-xs font-600 text-paper-50 transition hover:bg-dossier-600"
          >
            {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            {copied ? '已复制交付说明' : '复制交付说明'}
          </button>
        }
      />

      <div className="space-y-5 p-6 lg:p-8">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <LedgerColumn
            icon={<CheckCircle2 className="h-4 w-4" />}
            title="已处理"
            tone="text-verified"
            border="border-verified/30"
            bg="bg-verified/[0.05]"
            items={processed}
            empty="暂无已处理工单"
          />
          <LedgerColumn
            icon={<FileWarning className="h-4 w-4" />}
            title="还要补证据"
            tone="text-amber-dark"
            border="border-amber/40"
            bg="bg-amber/[0.05]"
            items={needs}
            empty="暂无待补证据"
          />
          <LedgerColumn
            icon={<FileText className="h-4 w-4" />}
            title="待处理 / 冲突"
            tone="text-ink-700"
            border="border-ink-900/15"
            bg="bg-paper-100/60"
            items={[...pending, ...conflicts]}
            empty="暂无"
          />
        </div>

        <SectionCard
          title="交付说明 · 证据链"
          index="DLV"
          accent="text-dossier"
          actions={
            <div className="flex items-center gap-1 rounded-[3px] border border-ink-900/10 bg-paper-100/60 p-0.5">
              <TabBtn active={tab === 'orders'} onClick={() => setTab('orders')} icon={<ScrollText className="h-3.5 w-3.5" />}>
                线上工单
              </TabBtn>
              <TabBtn active={tab === 'records'} onClick={() => setTab('records')} icon={<FileText className="h-3.5 w-3.5" />}>
                处理记录
              </TabBtn>
              <TabBtn active={tab === 'responses'} onClick={() => setTab('responses')} icon={<Cpu className="h-3.5 w-3.5" />}>
                接口返回
              </TabBtn>
            </div>
          }
        >
          <p className="mb-3 text-xs text-ink-500">
            三段证据链，精简交付；风控运营老唐可直接复制对给外部对齐。
          </p>

          {tab === 'orders' && (
            <div className="overflow-hidden rounded-md border border-ink-900/10">
              <table className="w-full text-left text-xs">
                <thead className="bg-paper-200/60 text-[10px] uppercase tracking-wider text-ink-400">
                  <tr>
                    <Th>工单号</Th>
                    <Th>来源</Th>
                    <Th>处理状态</Th>
                    <Th>导入时间</Th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink-900/10">
                  {orders.map((o) => (
                    <tr key={o.orderId} className="hover:bg-paper-200/40">
                      <Td mono>{o.orderId}</Td>
                      <Td><SourceBadge source={o.source} /></Td>
                      <Td><StatusStamp status={o.status} size="sm" /></Td>
                      <Td mono muted>{o.importedAt}</Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {tab === 'records' && (
            <div className="space-y-2">
              {samples
                .filter((s) => s.manualCorrection)
                .map((s) => {
                  const c = s.manualCorrection!
                  return (
                    <div
                      key={s.sampleId}
                      className="rounded-md border border-ink-900/10 bg-paper-100/50 p-3"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono text-[11px] font-700 text-ink-700">
                          {s.sampleId} · {s.studentName}
                        </span>
                        {c.overwritten && (
                          <span className="stamp border-forensic text-forensic">曾被覆盖</span>
                        )}
                      </div>
                      <div className="mt-1.5 flex items-center gap-3 font-mono text-xs">
                        <span className="text-ink-400">
                          机器 <b className="text-dossier">{s.machineScore}</b>
                        </span>
                        <span className="text-ink-300">→</span>
                        <span className="text-ink-400">
                          人工 <b className="text-verified">{c.manualScore}</b>
                        </span>
                        <span className="text-ink-400">· {c.reviewer}</span>
                        <span className="text-ink-400">{c.createdAt}</span>
                      </div>
                      <p className="mt-1 text-xs text-ink-700">{c.reason}</p>
                    </div>
                  )
                })}
            </div>
          )}

          {tab === 'responses' && (
            <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
              {samples.map((s) => (
                <div key={s.sampleId} className="rounded-md border border-ink-900/10">
                  <div className="flex items-center justify-between border-b border-ink-900/10 px-3 py-2">
                    <span className="font-mono text-[11px] font-700 text-ink-700">
                      {s.sampleId}
                    </span>
                    <span className="font-mono text-xs font-700 text-dossier">
                      {s.response.score}
                    </span>
                  </div>
                  <pre className="max-h-48 overflow-auto bg-ink-900/95 p-3 font-mono text-[10px] leading-relaxed text-paper-100">
                    {prettyJson(s.response.payload)}
                  </pre>
                </div>
              ))}
            </div>
          )}
        </SectionCard>
      </div>
    </div>
  )
}

function LedgerColumn({
  icon,
  title,
  tone,
  border,
  bg,
  items,
  empty,
}: {
  icon: ReactNode
  title: string
  tone: string
  border: string
  bg: string
  items: { orderId: string; subject: string; importedAt: string }[]
  empty: string
}) {
  return (
    <div className={`rounded-md border ${border} ${bg} p-4`}>
      <div className="mb-3 flex items-center gap-2">
        <span className={tone}>{icon}</span>
        <h3 className="font-serif text-sm font-700 text-ink-900">{title}</h3>
        <span className="ml-auto font-mono text-sm font-700 text-ink-900">{items.length}</span>
      </div>
      {items.length === 0 ? (
        <p className="py-4 text-center text-[11px] text-ink-400">{empty}</p>
      ) : (
        <ul className="space-y-2">
          {items.map((o) => (
            <li key={o.orderId} className="rounded-[3px] bg-paper-50/70 px-2.5 py-1.5">
              <div className="font-mono text-[11px] font-600 text-ink-700">{o.orderId}</div>
              <p className="mt-0.5 line-clamp-1 text-[11px] text-ink-500">{o.subject}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function TabBtn({
  active,
  onClick,
  icon,
  children,
}: {
  active: boolean
  onClick: () => void
  icon: ReactNode
  children: ReactNode
}) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1 rounded-[2px] px-2.5 py-1 text-[11px] font-600 transition ${
        active ? 'bg-paper-50 text-dossier shadow-stamp' : 'text-ink-500 hover:text-ink-900'
      }`}
    >
      {icon}
      {children}
    </button>
  )
}

function Th({ children }: { children: ReactNode }) {
  return <th className="px-3 py-2 font-500">{children}</th>
}
function Td({
  children,
  mono,
  muted,
}: {
  children: ReactNode
  mono?: boolean
  muted?: boolean
}) {
  return (
    <td className={`px-3 py-2 ${mono ? 'font-mono' : ''} ${muted ? 'text-ink-400' : 'text-ink-700'}`}>
      {children}
    </td>
  )
}

function buildDeliveryText(orders: WorkOrder[], samples: SampleEvidence[]) {
  const lines: string[] = []
  lines.push('【作文批改人工改判 · 交付说明】')
  lines.push('')
  lines.push('一、线上工单')
  orders.forEach((o) => {
    lines.push(`· ${o.orderId} | 来源：${o.source} | 状态：${o.status} | ${o.importedAt}`)
  })
  lines.push('')
  lines.push('二、处理记录（人工改判）')
  samples
    .filter((s) => s.manualCorrection)
    .forEach((s) => {
      const c = s.manualCorrection!
      lines.push(
        `· ${s.sampleId} | ${s.studentName} | 机器 ${s.machineScore} → 人工 ${c.manualScore} | ${c.reviewer} | ${c.createdAt}${c.overwritten ? ' | 曾被新结果覆盖' : ''}`,
      )
      lines.push(`  理由：${c.reason}`)
    })
  lines.push('')
  lines.push('三、接口返回（机器批改）')
  samples.forEach((s) => {
    lines.push(`· ${s.sampleId} | score=${s.response.score} | labels=${s.response.labels.join('、')} | model=${s.response.modelVersion}`)
  })
  return lines.join('\n')
}
