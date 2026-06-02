import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import { useStore } from '@/store'
import { cn } from '@/lib/utils'
import type { Correction, Appeal } from '@/store'

const statusBadge: Record<string, string> = { pending: 'badge-yellow', platform_replied: 'badge-blue', confirmed: 'badge-green' }
const statusLabel: Record<string, string> = { pending: '待处理', platform_replied: '平台已回复', confirmed: '已确认' }
const correctionTypeLabel: Record<string, string> = { under_report: '漏报', proportion_change: '比例变更', duplicate_use: '重复使用' }

export default function Corrections() {
  const { corrections, correctionsLoading, appeals, appealsLoading, fetchCorrections, fetchAppeals, createCorrection, createAppeal } = useStore()
  const [tab, setTab] = useState<'corrections' | 'appeals'>('corrections')
  const [showModal, setShowModal] = useState(false)

  useEffect(() => { fetchCorrections(); fetchAppeals() }, [fetchCorrections, fetchAppeals])

  return (
    <div className="space-y-5">
      <div className="flex gap-2">
        {(['corrections', 'appeals'] as const).map((t) => (
          <button
            key={t}
            className={cn('rounded-lg px-4 py-2 text-sm transition-colors', tab === t ? 'text-ink-blue font-medium' : '')}
            style={{ backgroundColor: tab === t ? 'var(--amber-gold)' : 'transparent', color: tab === t ? 'var(--ink-blue)' : 'var(--text-secondary)' }}
            onClick={() => setTab(t)}
          >
            {t === 'corrections' ? '修正记录' : '申诉记录'}
          </button>
        ))}
      </div>

      {tab === 'corrections' ? (
        <CorrectionsTable items={corrections} loading={correctionsLoading} />
      ) : (
        <AppealsTable items={appeals} loading={appealsLoading} />
      )}

      <button className="btn-primary" onClick={() => setShowModal(true)}>
        {tab === 'corrections' ? '新增修正' : '发起申诉'}
      </button>

      {showModal && (
        <Modal
          type={tab}
          onClose={() => setShowModal(false)}
          onSubmit={tab === 'corrections'
            ? (data) => { createCorrection(data); setShowModal(false) }
            : (data) => { createAppeal(data); setShowModal(false) }
          }
        />
      )}
    </div>
  )
}

function CorrectionsTable({ items, loading }: { items: Correction[]; loading: boolean }) {
  if (loading) return <div className="card p-5"><div className="skeleton h-40 w-full" /></div>
  return (
    <div className="card overflow-hidden p-0">
      <table className="w-full">
        <thead>
          <tr className="text-left text-xs" style={{ color: 'var(--text-muted)', borderBottom: '1px solid var(--border-color)' }}>
            <th className="px-4 py-3 font-medium">作品名称</th>
            <th className="px-4 py-3 font-medium">类型</th>
            <th className="px-4 py-3 font-medium">变更前</th>
            <th className="px-4 py-3 font-medium">变更后</th>
            <th className="px-4 py-3 font-medium">说明</th>
            <th className="px-4 py-3 font-medium">操作人</th>
            <th className="px-4 py-3 font-medium">日期</th>
          </tr>
        </thead>
        <tbody>
          {items.map((c) => (
            <tr key={c.id} className="table-row">
              <td className="px-4 py-3 text-sm" style={{ color: 'var(--text-primary)' }}>{c.workTitle}</td>
              <td className="px-4 py-3"><span className="badge-yellow">{correctionTypeLabel[c.type] || c.type}</span></td>
              <td className="px-4 py-3 text-sm" style={{ color: 'var(--coral)' }}>{c.before}</td>
              <td className="px-4 py-3 text-sm" style={{ color: 'var(--emerald)' }}>{c.after}</td>
              <td className="px-4 py-3">
                <span className="rounded px-2 py-0.5 text-xs" style={{ backgroundColor: 'rgba(212, 168, 83, 0.12)', color: 'var(--amber-gold-light)' }}>{c.explanation}</span>
              </td>
              <td className="px-4 py-3 text-sm" style={{ color: 'var(--text-secondary)' }}>{c.operator}</td>
              <td className="px-4 py-3 text-sm" style={{ color: 'var(--text-muted)' }}>{c.date}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function AppealsTable({ items, loading }: { items: Appeal[]; loading: boolean }) {
  if (loading) return <div className="card p-5"><div className="skeleton h-40 w-full" /></div>
  return (
    <div className="card overflow-hidden p-0">
      <table className="w-full">
        <thead>
          <tr className="text-left text-xs" style={{ color: 'var(--text-muted)', borderBottom: '1px solid var(--border-color)' }}>
            <th className="px-4 py-3 font-medium">作品名称</th>
            <th className="px-4 py-3 font-medium">状态</th>
            <th className="px-4 py-3 font-medium">平台回复</th>
            <th className="px-4 py-3 font-medium">结果</th>
            <th className="px-4 py-3 font-medium">说明</th>
          </tr>
        </thead>
        <tbody>
          {items.map((a) => (
            <tr key={a.id} className="table-row">
              <td className="px-4 py-3 text-sm" style={{ color: 'var(--text-primary)' }}>{a.workTitle}</td>
              <td className="px-4 py-3"><span className={cn(statusBadge[a.status])}>{statusLabel[a.status]}</span></td>
              <td className="px-4 py-3 text-sm" style={{ color: 'var(--text-secondary)' }}>{a.platformReply || '-'}</td>
              <td className="px-4 py-3 text-sm" style={{ color: 'var(--text-primary)' }}>{a.result || '-'}</td>
              <td className="px-4 py-3">
                <span className="rounded px-2 py-0.5 text-xs" style={{ backgroundColor: 'rgba(212, 168, 83, 0.12)', color: 'var(--amber-gold-light)' }}>{a.explanation}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function Modal({ type, onClose, onSubmit }: { type: 'corrections' | 'appeals'; onClose: () => void; onSubmit: (data: any) => void }) {
  const [form, setForm] = useState<Record<string, string>>({ workId: '', explanation: '', type: 'under_report', before: '', after: '', correctionId: '' })
  const handleSubmit = (e: React.FormEvent) => { e.preventDefault(); onSubmit(form) }
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}>
      <div className="card w-full max-w-md">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-serif-sc text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
            {type === 'corrections' ? '新增修正' : '发起申诉'}
          </h3>
          <button onClick={onClose} style={{ color: 'var(--text-muted)' }}><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="mb-1 block text-xs" style={{ color: 'var(--text-muted)' }}>作品 ID</label>
            <input className="input w-full" value={form.workId} onChange={(e) => setForm({ ...form, workId: e.target.value })} required />
          </div>
          {type === 'corrections' && (
            <>
              <div>
                <label className="mb-1 block text-xs" style={{ color: 'var(--text-muted)' }}>类型</label>
                <select className="input w-full" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                  <option value="under_report">漏报</option>
                  <option value="proportion_change">比例变更</option>
                  <option value="duplicate_use">重复使用</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs" style={{ color: 'var(--text-muted)' }}>变更前</label>
                <input className="input w-full" value={form.before} onChange={(e) => setForm({ ...form, before: e.target.value })} />
              </div>
              <div>
                <label className="mb-1 block text-xs" style={{ color: 'var(--text-muted)' }}>变更后</label>
                <input className="input w-full" value={form.after} onChange={(e) => setForm({ ...form, after: e.target.value })} />
              </div>
            </>
          )}
          {type === 'appeals' && (
            <div>
              <label className="mb-1 block text-xs" style={{ color: 'var(--text-muted)' }}>修正记录 ID</label>
              <input className="input w-full" value={form.correctionId} onChange={(e) => setForm({ ...form, correctionId: e.target.value })} required />
            </div>
          )}
          <div>
            <label className="mb-1 block text-xs" style={{ color: 'var(--text-muted)' }}>说明</label>
            <textarea className="input w-full" rows={3} value={form.explanation} onChange={(e) => setForm({ ...form, explanation: e.target.value })} required />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" className="btn-secondary" onClick={onClose}>取消</button>
            <button type="submit" className="btn-primary">提交</button>
          </div>
        </form>
      </div>
    </div>
  )
}
