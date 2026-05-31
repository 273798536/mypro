import { useState } from 'react'
import { FileText, Banknote, Lock, AlertTriangle, Download, Send, Info, CheckCircle, X } from 'lucide-react'

interface ReportData {
  id: string
  generated_at: string
  total_bills: number
  total_amount: number
  locked_amount: number
  shortfalls: number
  duplicates: number
  disputes: number
  fund_lock_methodology: string
}

interface ReportItem {
  id: string
  bill_no: string
  drawer: string
  amount: number
  due_date: string
  status: string
  priority_score: number
  fund_lock_status: string | null
  has_duplicate: number
  has_dispute: number
  event_id: string
}

interface TransferRecord {
  id: string
  from_user: string
  to_user: string
  fund_lock_note: string
  transferred_at: string
}

const STATUS_MAP: Record<string, string> = {
  pending_review: '待复核',
  reviewed: '已复核',
  pending_payment: '待兑付',
  paid: '已兑付',
  rejected: '已驳回',
}

const FUND_LOCK_MAP: Record<string, string> = {
  locked: '已锁定',
  pending: '待锁定',
  shortfall: '缺口',
}

const TRANSFER_USERS = ['刘复核', '陈资金', '张运营', '李运营', '王运营']

const fmt = (v: number) => (v / 10000).toFixed(2)

export default function ReportPage() {
  const [report, setReport] = useState<ReportData | null>(null)
  const [items, setItems] = useState<ReportItem[]>([])
  const [transfers, setTransfers] = useState<TransferRecord[]>([])
  const [loading, setLoading] = useState(false)
  const [showTransfer, setShowTransfer] = useState(false)
  const [fromUser, setFromUser] = useState('当前用户')
  const [toUser, setToUser] = useState('')
  const [fundLockNote, setFundLockNote] = useState('')
  const [transferMsg, setTransferMsg] = useState('')

  const generateReport = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/reports/generate')
      const data = await res.json()
      setReport(data.report)
      setItems(data.items)
      fetchTransfers(data.report.id)
    } finally {
      setLoading(false)
    }
  }

  const fetchTransfers = async (reportId: string) => {
    try {
      const res = await fetch(`/api/reports/${reportId}/transfers`)
      if (res.ok) {
        const data = await res.json()
        setTransfers(data)
      }
    } catch {
      setTransfers([])
    }
  }

  const handleExport = (format: string) => {
    if (!report) return
    window.open(`/api/reports/${report.id}/export?format=${format}`, '_blank')
  }

  const handleTransfer = async () => {
    if (!report || !toUser) return
    const res = await fetch(`/api/reports/${report.id}/transfer`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fromUser, toUser, fundLockNote }),
    })
    if (res.ok) {
      const record = await res.json()
      setTransfers((prev) => [...prev, record])
      setTransferMsg('转交成功')
      setTimeout(() => {
        setShowTransfer(false)
        setTransferMsg('')
        setToUser('')
      }, 1200)
    }
  }

  const openTransferDialog = () => {
    setFundLockNote(report?.fund_lock_methodology ?? '')
    setFromUser('当前用户')
    setToUser('')
    setTransferMsg('')
    setShowTransfer(true)
  }

  const anomalyTotal = report ? report.shortfalls + report.duplicates + report.disputes : 0

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-navy">队列报告</h2>
          <p className="mt-1 text-sm text-slate_text">队列统计与报告生成</p>
        </div>
        <button
          onClick={generateReport}
          disabled={loading}
          className="flex items-center gap-2 rounded-lg bg-navy px-4 py-2 text-sm text-white hover:bg-navy/90 disabled:opacity-50"
        >
          <FileText className="h-4 w-4" />
          {loading ? '生成中...' : '生成报告'}
        </button>
      </div>

      {report && (
        <>
          <div className="grid grid-cols-4 gap-4">
            <div className="rounded-lg border border-border bg-card p-4">
              <div className="flex items-center gap-2 text-slate_text"><FileText className="h-4 w-4" /><span className="text-xs">总票据数</span></div>
              <p className="mt-2 text-2xl font-semibold text-navy">{report.total_bills}</p>
            </div>
            <div className="rounded-lg border border-border bg-card p-4">
              <div className="flex items-center gap-2 text-slate_text"><Banknote className="h-4 w-4" /><span className="text-xs">总金额</span></div>
              <p className="mt-2 text-2xl font-semibold text-navy">{fmt(report.total_amount)}<span className="ml-1 text-sm font-normal text-slate_text">万元</span></p>
            </div>
            <div className="rounded-lg border border-border bg-card p-4">
              <div className="flex items-center gap-2 text-slate_text"><Lock className="h-4 w-4" /><span className="text-xs">已锁定金额</span></div>
              <p className="mt-2 text-2xl font-semibold text-emerald">{fmt(report.locked_amount)}<span className="ml-1 text-sm font-normal text-slate_text">万元</span></p>
            </div>
            <div className="rounded-lg border border-border bg-card p-4">
              <div className="flex items-center gap-2 text-slate_text"><AlertTriangle className="h-4 w-4" /><span className="text-xs">异常合计</span></div>
              <p className="mt-2 text-2xl font-semibold text-coral">{anomalyTotal}</p>
            </div>
          </div>

          <div className="rounded-lg border border-amber/30 bg-amber/5 p-4">
            <div className="flex items-start gap-2">
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-amber" />
              <div>
                <p className="text-sm font-medium text-navy">资金锁定口径</p>
                <p className="mt-1 text-sm text-slate_text">{report.fund_lock_methodology}</p>
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-border bg-card p-4">
            <h3 className="text-sm font-medium text-navy">异常明细</h3>
            <div className="mt-3 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate_text">资金缺口</span>
                <span className="rounded-full bg-coral/10 px-2.5 py-0.5 text-xs font-medium text-coral">{report.shortfalls}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate_text">重复票据</span>
                <span className="rounded-full bg-coral/10 px-2.5 py-0.5 text-xs font-medium text-coral">{report.duplicates}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate_text">争议票据</span>
                <span className="rounded-full bg-amber/10 px-2.5 py-0.5 text-xs font-medium text-amber">{report.disputes}</span>
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-border bg-card">
            <div className="border-b border-border px-4 py-3">
              <h3 className="text-sm font-medium text-navy">报告明细</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs text-slate_text">
                    <th className="px-4 py-2">优先级</th>
                    <th className="px-4 py-2">票号</th>
                    <th className="px-4 py-2">出票人</th>
                    <th className="px-4 py-2">金额(万元)</th>
                    <th className="px-4 py-2">到期日</th>
                    <th className="px-4 py-2">状态</th>
                    <th className="px-4 py-2">资金锁定</th>
                    <th className="px-4 py-2">标记</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={item.id} className="border-b border-border/50 hover:bg-surface">
                      <td className="px-4 py-2 font-mono">{item.priority_score}</td>
                      <td className="px-4 py-2">{item.bill_no}</td>
                      <td className="px-4 py-2">{item.drawer}</td>
                      <td className="px-4 py-2">{fmt(item.amount)}</td>
                      <td className="px-4 py-2">{item.due_date}</td>
                      <td className="px-4 py-2">
                        <span className="rounded-full bg-navy/10 px-2 py-0.5 text-xs text-navy">
                          {STATUS_MAP[item.status] ?? item.status}
                        </span>
                      </td>
                      <td className="px-4 py-2">
                        <span className={`rounded-full px-2 py-0.5 text-xs ${item.fund_lock_status === 'locked' ? 'bg-emerald/10 text-emerald' : item.fund_lock_status === 'shortfall' ? 'bg-coral/10 text-coral' : 'bg-amber/10 text-amber'}`}>
                          {item.fund_lock_status ? (FUND_LOCK_MAP[item.fund_lock_status] ?? item.fund_lock_status) : '-'}
                        </span>
                      </td>
                      <td className="px-4 py-2">
                        <div className="flex gap-1">
                          {item.has_duplicate === 1 && <span className="rounded bg-coral/10 px-1.5 py-0.5 text-xs text-coral">重复</span>}
                          {item.has_dispute === 1 && <span className="rounded bg-amber/10 px-1.5 py-0.5 text-xs text-amber">争议</span>}
                          {item.fund_lock_status === 'shortfall' && <span className="rounded bg-coral/10 px-1.5 py-0.5 text-xs text-coral">缺口</span>}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex gap-3">
            <button onClick={() => handleExport('xlsx')} className="flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-sm text-navy hover:bg-surface">
              <Download className="h-4 w-4" />导出 Excel
            </button>
            <button onClick={() => handleExport('pdf')} className="flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-sm text-navy hover:bg-surface">
              <Download className="h-4 w-4" />导出 PDF
            </button>
            <button onClick={openTransferDialog} className="flex items-center gap-2 rounded-lg bg-amber px-4 py-2 text-sm text-white hover:bg-amber/90">
              <Send className="h-4 w-4" />转交同事
            </button>
          </div>

          {transfers.length > 0 && (
            <div className="rounded-lg border border-border bg-card p-4">
              <h3 className="text-sm font-medium text-navy">转交记录</h3>
              <div className="mt-3 space-y-2">
                {transfers.map((t) => (
                  <div key={t.id} className="flex items-center gap-2 rounded bg-surface p-2 text-sm">
                    <CheckCircle className="h-4 w-4 text-emerald" />
                    <span className="text-slate_text">{t.from_user}</span>
                    <span className="text-slate_text">→</span>
                    <span className="font-medium text-navy">{t.to_user}</span>
                    <span className="ml-auto text-xs text-slate_text">{t.transferred_at}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {showTransfer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setShowTransfer(false)}>
          <div className="w-full max-w-md rounded-lg bg-card p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-navy">转交报告</h3>
              <button onClick={() => setShowTransfer(false)} className="text-slate_text hover:text-navy"><X className="h-5 w-5" /></button>
            </div>
            <div className="mt-4 space-y-4">
              <div>
                <label className="text-sm text-slate_text">转交人</label>
                <input value={fromUser} onChange={(e) => setFromUser(e.target.value)} className="mt-1 w-full rounded border border-border px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="text-sm text-slate_text">接收人</label>
                <select value={toUser} onChange={(e) => setToUser(e.target.value)} className="mt-1 w-full rounded border border-border px-3 py-2 text-sm">
                  <option value="">请选择</option>
                  {TRANSFER_USERS.map((u) => <option key={u} value={u}>{u}</option>)}
                </select>
              </div>
              <div>
                <label className="text-sm text-slate_text">资金锁定说明</label>
                <textarea value={fundLockNote} onChange={(e) => setFundLockNote(e.target.value)} rows={3} className="mt-1 w-full rounded border border-border px-3 py-2 text-sm" />
              </div>
              {transferMsg && <p className="text-sm text-emerald">{transferMsg}</p>}
              <button onClick={handleTransfer} disabled={!toUser} className="w-full rounded-lg bg-amber py-2 text-sm text-white hover:bg-amber/90 disabled:opacity-50">确认转交</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
