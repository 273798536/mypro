import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { FileText, ArrowRight, Lock, Unlock, Send, AlertTriangle, ChevronLeft, CheckCircle } from 'lucide-react'

interface TimelineItem {
  id: string
  type: string
  reference_no: string
  description: string
  operator: string
  timestamp: string
}

interface Diagnosis {
  id: string
  anomaly_type: string
  trigger_material: string
  trigger_reference: string
  current_blocker: string
  next_action: string
  next_material_needed: string
  resolved_at: string | null
}

interface EventData {
  id: string
  event_no: string
  title: string
  anomaly_type: string | null
  status: string
  timeline: TimelineItem[]
  anomaly_diagnosis: Diagnosis | null
  linked_bills: Record<string, unknown>[]
  linked_cash_plans: Record<string, unknown>[]
  linked_payment_applications: Record<string, unknown>[]
}

const TYPE_ICON: Record<string, typeof FileText> = {
  bill_registration: FileText, status_change: ArrowRight, fund_lock: Lock,
  payment_application: Send, anomaly_detected: AlertTriangle, fund_release: Unlock,
  dispute_raised: AlertTriangle, diagnosis_resolved: CheckCircle,
}

const STATUS_LABEL: Record<string, { label: string; cls: string }> = {
  open: { label: '待处理', cls: 'bg-coral/10 text-coral' },
  in_progress: { label: '进行中', cls: 'bg-amber/10 text-amber' },
  resolved: { label: '已解决', cls: 'bg-emerald/10 text-emerald' },
  closed: { label: '已关闭', cls: 'bg-slate_text/10 text-slate_text' },
}

const BILL_STATUS: Record<string, string> = {
  pending_review: '待复核', reviewed: '已复核', pending_payment: '待兑付', paid: '已兑付', rejected: '已驳回',
}

export default function EventDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [event, setEvent] = useState<EventData | null>(null)
  const [resolving, setResolving] = useState(false)

  useEffect(() => {
    if (!id) return
    fetch(`/api/events/${id}`).then(r => r.json()).then(setEvent)
  }, [id])

  const resolveDiagnosis = async () => {
    if (!id) return
    setResolving(true)
    await fetch(`/api/events/${id}/diagnosis`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ resolved_at: new Date().toISOString().slice(0, 19).replace('T', ' ') }),
    })
    const updated = await fetch(`/api/events/${id}`).then(r => r.json())
    setEvent(updated)
    setResolving(false)
  }

  if (!event) return <div className="py-16 text-center text-sm text-slate_text">加载中...</div>

  const st = STATUS_LABEL[event.status] ?? { label: event.status, cls: 'bg-slate_text/10 text-slate_text' }
  const diag = event.anomaly_diagnosis

  const statusChanges = event.timeline.filter(t => t.type === 'status_change')

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex items-center gap-3">
        <Link to="/events" className="flex items-center gap-1 text-sm text-slate_text hover:text-navy">
          <ChevronLeft size={16} />返回
        </Link>
      </div>

      <div className="flex items-center gap-3">
        <h2 className="text-xl font-semibold text-navy">{event.title}</h2>
        <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${st.cls}`}>{st.label}</span>
        <span className="font-mono text-xs text-slate_text">{event.event_no}</span>
      </div>

      {diag && (
        <div className="grid grid-cols-3 gap-4">
          <div className="rounded-lg border border-coral/30 bg-coral/5 p-4">
            <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-coral">触发材料</div>
            <p className="text-sm font-medium text-navy">{diag.trigger_material}</p>
            <p className="mt-1 text-xs text-slate_text">参考号：{diag.trigger_reference}</p>
          </div>
          <div className="rounded-lg border border-amber/30 bg-amber/5 p-4">
            <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-amber">当前卡点</div>
            <p className="text-sm font-medium text-navy">{diag.current_blocker}</p>
          </div>
          <div className="rounded-lg border border-emerald/30 bg-emerald/5 p-4">
            <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-emerald">下一步</div>
            <p className="text-sm font-medium text-navy">{diag.next_action}</p>
            <p className="mt-1 text-xs text-slate_text">需补材料：{diag.next_material_needed}</p>
          </div>
        </div>
      )}

      {diag && !diag.resolved_at && (
        <button
          onClick={resolveDiagnosis}
          disabled={resolving}
          className="flex items-center gap-2 rounded-lg bg-emerald px-4 py-2 text-sm text-white hover:bg-emerald/90 disabled:opacity-50"
        >
          <CheckCircle size={16} />{resolving ? '处理中...' : '标记已解决'}
        </button>
      )}

      {statusChanges.length > 0 && (
        <div className="rounded-lg border border-border bg-card p-4">
          <h3 className="mb-3 text-sm font-medium text-navy">状态追溯路径</h3>
          <div className="flex flex-wrap items-center gap-2">
            {statusChanges.map((item, i) => (
              <div key={item.id} className="flex items-center gap-2">
                {i > 0 && <ArrowRight size={12} className="text-slate_text/40" />}
                <div className="rounded bg-surface px-2 py-1 text-xs">
                  <span className="font-medium text-navy">{item.description}</span>
                  <span className="ml-2 text-slate_text">{item.operator}</span>
                  <span className="ml-2 text-slate_text/60">{item.timestamp}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 space-y-0">
          <div className="rounded-lg border border-border bg-card p-4">
            <h3 className="mb-4 text-sm font-medium text-navy">事件时间线</h3>
            <div className="space-y-0">
              {event.timeline.map((item) => {
                const Icon = TYPE_ICON[item.type] ?? FileText
                return (
                  <div key={item.id} className="flex gap-3 pb-4">
                    <div className="flex flex-col items-center">
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-navy/10">
                        <Icon size={14} className="text-navy" />
                      </div>
                      <div className="mt-1 flex-1 border-l border-border" />
                    </div>
                    <div className="min-w-0 flex-1 pb-2">
                      <p className="text-sm text-navy">{item.description}</p>
                      <div className="mt-1 flex items-center gap-2 text-xs text-slate_text">
                        <span className="font-mono">{item.reference_no}</span>
                        <span>·</span>
                        <span>{item.operator}</span>
                        <span>·</span>
                        <span>{item.timestamp}</span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        <div className="space-y-4">
          {event.linked_bills.length > 0 && (
            <div className="rounded-lg border border-border bg-card p-4">
              <h3 className="mb-3 text-sm font-medium text-navy">关联商票</h3>
              <div className="space-y-2">
                {event.linked_bills.map((b) => (
                  <div key={b.id as string} className="rounded bg-surface p-2 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-navy">{b.bill_no as string}</span>
                      <span className="text-xs text-slate_text">{BILL_STATUS[b.status as string] ?? (b.status as string)}</span>
                    </div>
                    <p className="text-xs text-slate_text">{b.drawer as string} · {((b.amount as number) / 10000).toFixed(2)}万元</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {event.linked_cash_plans.length > 0 && (
            <div className="rounded-lg border border-border bg-card p-4">
              <h3 className="mb-3 text-sm font-medium text-navy">关联现金计划</h3>
              <div className="space-y-2">
                {event.linked_cash_plans.map((cp) => (
                  <div key={cp.id as string} className="rounded bg-surface p-2 text-sm">
                    <div className="font-medium text-navy">{cp.plan_no as string}</div>
                    <p className="text-xs text-slate_text">{cp.period as string} · 可用 {((cp.available_amount as number) / 10000).toFixed(2)}万元</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {event.linked_payment_applications.length > 0 && (
            <div className="rounded-lg border border-border bg-card p-4">
              <h3 className="mb-3 text-sm font-medium text-navy">关联兑付申请</h3>
              <div className="space-y-2">
                {event.linked_payment_applications.map((pa) => (
                  <div key={pa.id as string} className="rounded bg-surface p-2 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-navy">{pa.application_no as string}</span>
                      <span className="text-xs text-slate_text">{pa.status as string}</span>
                    </div>
                    <p className="text-xs text-slate_text">{((pa.amount as number) / 10000).toFixed(2)}万元 · {pa.applicant as string}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
