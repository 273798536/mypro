import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { AlertTriangle, Plus, Lock, Copy, AlertCircle, ArrowRight, X, ChevronRight } from 'lucide-react'
import { useAppStore, type QueueItem } from '@/store'

const STATUS: Record<string, { label: string; dot: string }> = {
  pending_review: { label: '待复核', dot: 'bg-yellow-400' }, reviewed: { label: '已复核', dot: 'bg-blue-500' },
  pending_payment: { label: '待兑付', dot: 'bg-amber' }, paid: { label: '已兑付', dot: 'bg-emerald' },
  rejected: { label: '已驳回', dot: 'bg-coral' },
}
const LOCK: Record<string, { label: string; cls: string }> = {
  locked: { label: '已锁定', cls: 'text-emerald' }, pending: { label: '待锁定', cls: 'text-amber' },
  shortfall: { label: '缺口', cls: 'text-coral' },
}
const NEXT: Record<string, string> = { pending_review: 'reviewed', reviewed: 'pending_payment', pending_payment: 'paid' }
const STEPS = ['pending_review', 'reviewed', 'pending_payment', 'paid']
interface DupGroup { event_id: string; count: number }

function PriorityBadge({ score }: { score: number }) {
  const bg = score >= 90 ? 'bg-emerald' : score >= 80 ? 'bg-amber' : 'bg-slate-400'
  return <span className={`inline-block rounded px-2 py-0.5 text-xs font-bold text-white ${bg}`}>{score}</span>
}
function StatusDot({ status }: { status: string }) {
  const s = STATUS[status] ?? { label: status, dot: 'bg-gray-400' }
  return <span className="flex items-center gap-1.5"><span className={`inline-block h-2 w-2 rounded-full ${s.dot}`} />{s.label}</span>
}
function LockBadge({ lock }: { lock: Record<string, unknown> | null }) {
  if (!lock) return <span className="text-xs text-gray-400">未关联</span>
  const m = LOCK[(lock as { status: string }).status] ?? { label: '未知', cls: 'text-gray-400' }
  return <span className={`flex items-center gap-1 text-xs font-medium ${m.cls}`}><Lock size={12} />{m.label}</span>
}

function NewBillModal({ onClose, onSubmit }: { onClose: () => void; onSubmit: (f: Record<string, string>) => void }) {
  const [form, setForm] = useState<Record<string, string>>({
    billNo: '', drawer: '', payee: '', amount: '', dueDate: '', issueDate: '', acceptor: '', createdBy: ''
  })
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) => setForm(f => ({ ...f, [k]: e.target.value }))
  const fields: [string, string][] = [
    ['billNo', '票号'], ['drawer', '出票人'], ['payee', '收款人'], ['amount', '金额(元)'],
    ['dueDate', '到期日'], ['issueDate', '出票日'], ['acceptor', '承兑人'], ['createdBy', '创建人'],
  ]
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="w-full max-w-lg rounded-xl bg-card p-6 shadow-xl" onClick={e => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-navy">新增商票</h3>
          <button onClick={onClose}><X size={18} className="text-slate_text" /></button>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {fields.map(([k, l]) => (
            <div key={k}>
              <label className="mb-1 block text-xs text-slate_text">{l}</label>
              <input value={form[k]} onChange={set(k)} type={k.includes('Date') ? 'date' : 'text'}
                className="w-full rounded border border-border px-2 py-1.5 text-sm" />
            </div>
          ))}
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-lg border border-border px-4 py-2 text-sm">取消</button>
          <button onClick={() => onSubmit(form)} className="rounded-lg bg-navy px-4 py-2 text-sm text-white">提交</button>
        </div>
      </div>
    </div>
  )
}

function DisputeDialog({ onClose, onSubmit }: { onClose: () => void; onSubmit: (r: string, p: string) => void }) {
  const [reason, setReason] = useState('')
  const [reporter, setReporter] = useState('')
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="w-full max-w-md rounded-xl bg-card p-6 shadow-xl" onClick={e => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-navy">标记争议</h3>
          <button onClick={onClose}><X size={18} className="text-slate_text" /></button>
        </div>
        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-xs text-slate_text">争议原因</label>
            <textarea value={reason} onChange={e => setReason(e.target.value)} rows={3}
              className="w-full rounded border border-border px-2 py-1.5 text-sm" />
          </div>
          <div>
            <label className="mb-1 block text-xs text-slate_text">报告人</label>
            <input value={reporter} onChange={e => setReporter(e.target.value)}
              className="w-full rounded border border-border px-2 py-1.5 text-sm" />
          </div>
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-lg border border-border px-4 py-2 text-sm">取消</button>
          <button onClick={() => onSubmit(reason, reporter)} className="rounded-lg bg-coral px-4 py-2 text-sm text-white">确认</button>
        </div>
      </div>
    </div>
  )
}

export default function QueuePage() {
  const navigate = useNavigate()
  const { fetchQueue, selectedBillId, setSelectedBill } = useAppStore()
  const [items, setItems] = useState<QueueItem[]>([])
  const [dups, setDups] = useState<DupGroup[]>([])
  const [sf, setSf] = useState('')
  const [df, setDf] = useState('')
  const [ds, setDs] = useState('')
  const [de, setDe] = useState('')
  const [lf, setLf] = useState('')
  const [showNew, setShowNew] = useState(false)
  const [showDisp, setShowDisp] = useState(false)

  const load = useCallback(async () => {
    const p = new URLSearchParams()
    if (sf) p.set('status', sf); if (df) p.set('drawer', df)
    if (ds) p.set('dueDateStart', ds); if (de) p.set('dueDateEnd', de)
    if (lf) p.set('fundLockStatus', lf)
    const r = await fetch(`/api/bills?${p}`)
    setItems(await r.json())
  }, [sf, df, ds, de, lf])

  useEffect(() => { load() }, [load])
  useEffect(() => { fetch('/api/bills/duplicates').then(r => r.json()).then(setDups).catch(() => {}) }, [])
  const refresh = () => { fetchQueue(); load() }

  const advance = async (b: QueueItem) => {
    const next = NEXT[b.status]; if (!next) return
    await fetch(`/api/bills/${b.id}/status`, { method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: next, operator: '当前用户' }) })
    refresh()
  }
  const reject = async (b: QueueItem) => {
    await fetch(`/api/bills/${b.id}/status`, { method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'rejected', operator: '当前用户' }) })
    refresh()
  }
  const dispute = async (reason: string, reporter: string) => {
    if (!selectedBillId) return
    await fetch(`/api/queue/dispute/${selectedBillId}`, { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason, reporter }) })
    setShowDisp(false); refresh()
  }
  const create = async (form: Record<string, string>) => {
    await fetch('/api/bills', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
    setShowNew(false); refresh()
  }

  const sorted = [...items].sort((a, b) => b.priority_score - a.priority_score || a.due_date.localeCompare(b.due_date))
  const sel = sorted.find(b => b.id === selectedBillId)

  return (
    <div className="animate-fade-in space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-navy">兑付队列看板</h2>
        <button onClick={() => setShowNew(true)}
          className="flex items-center gap-1.5 rounded-lg bg-navy px-4 py-2 text-sm font-medium text-white hover:bg-navy/90">
          <Plus size={16} />新增商票</button>
      </div>

      {dups.length > 0 && (
        <div className="flex items-start gap-3 rounded-lg border border-amber/30 bg-amber/10 px-4 py-3">
          <AlertTriangle size={20} className="mt-0.5 shrink-0 text-amber" />
          <div className="text-sm">
            <span className="font-medium text-amber">发现重复商票：</span>
            {dups.map((g, i) => <span key={i}>{i > 0 && '、'}<button onClick={() => navigate(`/event/${g.event_id}`)}
              className="text-navy underline hover:text-amber">{g.count}张重复</button></span>)}
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-card px-4 py-3">
        <select value={sf} onChange={e => setSf(e.target.value)} className="rounded border border-border px-2 py-1.5 text-sm">
          <option value="">全部状态</option><option value="pending_review">待复核</option><option value="reviewed">已复核</option>
          <option value="pending_payment">待兑付</option><option value="paid">已兑付</option><option value="rejected">已驳回</option>
        </select>
        <input type="date" value={ds} onChange={e => setDs(e.target.value)} className="rounded border border-border px-2 py-1.5 text-sm" />
        <span className="text-xs text-slate_text">至</span>
        <input type="date" value={de} onChange={e => setDe(e.target.value)} className="rounded border border-border px-2 py-1.5 text-sm" />
        <input value={df} onChange={e => setDf(e.target.value)} placeholder="出票人" className="rounded border border-border px-2 py-1.5 text-sm" />
        <select value={lf} onChange={e => setLf(e.target.value)} className="rounded border border-border px-2 py-1.5 text-sm">
          <option value="">资金锁定</option><option value="locked">已锁定</option><option value="pending">待锁定</option>
          <option value="shortfall">缺口</option>
        </select>
      </div>

      <div className="overflow-x-auto rounded-lg border border-border bg-card">
        <table className="w-full text-sm">
          <thead><tr className="border-b border-border bg-surface text-left text-xs font-medium text-slate_text">
            <th className="px-4 py-3">优先级</th><th className="px-4 py-3">票号</th><th className="px-4 py-3">出票人</th>
            <th className="px-4 py-3">金额(万元)</th><th className="px-4 py-3">到期日</th><th className="px-4 py-3">状态</th>
            <th className="px-4 py-3">资金锁</th><th className="px-4 py-3">标记</th><th className="px-4 py-3">事件</th>
          </tr></thead>
          <tbody>
            {sorted.map(b => (
              <tr key={b.id} onClick={() => setSelectedBill(b.id)}
                className={`cursor-pointer border-b border-border transition-colors hover:bg-surface ${selectedBillId === b.id ? 'bg-amber/5' : ''}`}>
                <td className="px-4 py-3"><PriorityBadge score={b.priority_score} /></td>
                <td className="px-4 py-3 font-medium text-navy">{b.bill_no}</td>
                <td className="px-4 py-3">{b.drawer}</td>
                <td className="px-4 py-3 tabular-nums">{(b.amount / 10000).toFixed(2)}</td>
                <td className="px-4 py-3">{b.due_date}</td>
                <td className="px-4 py-3"><StatusDot status={b.status} /></td>
                <td className="px-4 py-3"><LockBadge lock={b.fund_lock} /></td>
                <td className="px-4 py-3"><span className="flex items-center gap-1">
                  {!!b.has_duplicate && <Copy size={14} className="text-amber" />}
                  {!!b.has_dispute && <AlertCircle size={14} className="text-coral" />}</span></td>
                <td className="px-4 py-3"><button onClick={e => { e.stopPropagation(); navigate(`/event/${b.event_id}`) }}
                  className="text-navy hover:text-amber"><ChevronRight size={16} /></button></td>
              </tr>
            ))}
          </tbody>
        </table>
        {sorted.length === 0 && <div className="py-12 text-center text-sm text-slate_text">暂无数据</div>}
      </div>

      {sel && (
        <div className="fixed inset-y-0 right-0 z-40 w-96 overflow-y-auto border-l border-border bg-card shadow-xl">
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <h3 className="font-semibold text-navy">商票详情</h3>
            <button onClick={() => setSelectedBill(null)} className="text-slate_text hover:text-navy"><X size={18} /></button>
          </div>
          <div className="space-y-5 px-5 py-4">
            <div className="space-y-2 text-sm">
              {([['票号', sel.bill_no], ['出票人', sel.drawer], ['收款人', sel.payee],
                ['金额', `${(sel.amount / 10000).toFixed(2)} 万元`], ['到期日', sel.due_date], ['承兑人', sel.acceptor]] as [string, string][]).map(([l, v]) => (
                <div key={l} className="flex justify-between">
                  <span className="text-slate_text">{l}</span>
                  <span className={l === '票号' ? 'font-medium text-navy' : ''}>{v}</span></div>
              ))}
            </div>
            <div className="flex items-center justify-between border-t border-border pt-4">
              {STEPS.map((step, i) => {
                const active = STEPS.indexOf(sel.status)
                return <div key={step} className="flex flex-col items-center gap-1">
                  <div className={`h-3 w-3 rounded-full ${i < active ? 'bg-emerald' : i === active ? 'bg-amber' : 'bg-border'}`} />
                  <span className={`text-xs ${i <= active ? 'font-medium text-navy' : 'text-slate_text'}`}>{STATUS[step].label}</span>
                </div>
              })}
            </div>
            {sel.status === 'rejected' && (
              <div className="flex items-center gap-2 rounded-lg bg-coral/10 px-3 py-2 text-sm text-coral">
                <AlertCircle size={16} />该商票已被驳回</div>
            )}
            <div className="flex gap-2 border-t border-border pt-4">
              {NEXT[sel.status] && <button onClick={() => advance(sel)}
                className="flex-1 rounded-lg bg-navy py-2 text-sm font-medium text-white hover:bg-navy/90">推进状态</button>}
              {sel.status === 'pending_review' && <button onClick={() => reject(sel)}
                className="flex-1 rounded-lg border border-coral py-2 text-sm font-medium text-coral hover:bg-coral/5">驳回</button>}
              <button onClick={() => setShowDisp(true)}
                className="flex-1 rounded-lg border border-amber py-2 text-sm font-medium text-amber hover:bg-amber/5">标记争议</button>
            </div>
            {sel.fund_lock && (
              <div className="rounded-lg border border-border bg-surface p-3 text-sm space-y-1">
                <div className="font-medium text-navy">资金锁定详情</div>
                <div className="flex justify-between"><span className="text-slate_text">锁定金额</span>
                  <span>{(((sel.fund_lock as Record<string, unknown>).locked_amount as number) / 10000).toFixed(2)} 万元</span></div>
                <div className="flex justify-between"><span className="text-slate_text">状态</span><LockBadge lock={sel.fund_lock} /></div>
                <div className="flex justify-between"><span className="text-slate_text">锁定时间</span>
                  <span>{(sel.fund_lock as Record<string, unknown>).locked_at as string}</span></div>
              </div>
            )}
            <button onClick={() => navigate(`/event/${sel.event_id}`)}
              className="flex w-full items-center justify-center gap-1 rounded-lg border border-border py-2 text-sm text-navy hover:bg-surface">
              查看事件详情 <ArrowRight size={14} /></button>
          </div>
        </div>
      )}

      {showNew && <NewBillModal onClose={() => setShowNew(false)} onSubmit={create} />}
      {showDisp && <DisputeDialog onClose={() => setShowDisp(false)} onSubmit={dispute} />}
    </div>
  )
}
