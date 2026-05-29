import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import {
  Download, FileSpreadsheet, FileText,
  AlertTriangle, Filter, Check, RotateCcw,
} from 'lucide-react'
import { cn, formatCurrency, formatDateTime } from '@/lib/utils'
import { useAppStore } from '@/hooks/useStore'
import ExportValidateModal from '@/components/ExportValidateModal'

type PendingType = '平台手续费' | '优惠券追回'
type StatusFilter = '全部' | '待确认' | '已确认' | '已退回'

interface PendingItem {
  id: string
  refund_case_id: string
  type: string
  source_name: string
  amount: number
  status: string
  created_at: string
  confirmed_at: string | null
}

interface CaseItem {
  id: string
  customer_name: string
  total_amount: number
  status: string
  created_at: string
}

interface ValidateResult {
  caseId: string
  customerName: string
  pass: boolean
  missing: string[]
}

const STATUS_BADGE: Record<string, string> = {
  待确认: 'bg-[#E8813B]/20 text-[#E8813B]',
  已确认: 'bg-emerald-500/20 text-emerald-400',
  已退回: 'bg-white/10 text-[#F5F5F0]/40',
}

const statusFilters: StatusFilter[] = ['全部', '待确认', '已确认', '已退回']

export default function PendingExport() {
  const refreshKey = useAppStore((s) => s.refreshKey)
  const triggerRefresh = useAppStore((s) => s.triggerRefresh)

  const [activeType, setActiveType] = useState<PendingType>('平台手续费')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('全部')
  const [pendingItems, setPendingItems] = useState<PendingItem[]>([])
  const [cases, setCases] = useState<CaseItem[]>([])
  const [selectedCases, setSelectedCases] = useState<Set<string>>(new Set())
  const [validateResults, setValidateResults] = useState<ValidateResult[]>([])
  const [modalOpen, setModalOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [exporting, setExporting] = useState(false)

  const fetchPending = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams({ type: activeType })
    if (statusFilter !== '全部') params.set('status', statusFilter)
    const res = await fetch(`/api/pending?${params}`)
    const json = await res.json()
    if (json.success) setPendingItems(json.data)
    setLoading(false)
  }, [activeType, statusFilter])

  const fetchCases = useCallback(async () => {
    const res = await fetch('/api/cases')
    const json = await res.json()
    if (json.success) setCases(json.data)
  }, [])

  useEffect(() => {
    fetchPending()
  }, [fetchPending, refreshKey])

  useEffect(() => {
    fetchCases()
  }, [fetchCases])

  const pendingCount = pendingItems.filter((i) => i.status === '待确认').length
  const pendingTotal = pendingItems.filter((i) => i.status === '待确认').reduce((s, i) => s + i.amount, 0)

  const handleConfirm = async (id: string) => {
    await fetch(`/api/pending/${id}/confirm`, { method: 'PUT' })
    triggerRefresh()
  }

  const handleReject = async (id: string) => {
    await fetch(`/api/pending/${id}/reject`, { method: 'PUT' })
    triggerRefresh()
  }

  const toggleCase = (id: string) => {
    setSelectedCases((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const selectableCases = cases.filter((c) => c.status === '待确认' || c.status === '已完成')

  const handleExport = async (format: 'xlsx' | 'csv') => {
    if (selectedCases.size === 0) return

    const results: ValidateResult[] = []
    for (const caseId of selectedCases) {
      const c = cases.find((x) => x.id === caseId)
      try {
        const res = await fetch(`/api/export/validate/${caseId}`)
        const json = await res.json()
        results.push({
          caseId,
          customerName: c?.customer_name ?? '',
          pass: json.data?.pass ?? false,
          missing: json.data?.missing ?? [],
        })
      } catch {
        results.push({
          caseId,
          customerName: c?.customer_name ?? '',
          pass: false,
          missing: ['校验请求失败'],
        })
      }
    }

    setValidateResults(results)
    setModalOpen(true)

    if (results.every((r) => r.pass)) {
      doExport(Array.from(selectedCases), format)
    }
  }

  const doExport = async (caseIds: string[], format: 'xlsx' | 'csv') => {
    setExporting(true)
    try {
      const res = await fetch('/api/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ caseIds, format }),
      })
      const blob = new Blob([await res.arrayBuffer()], {
        type: format === 'csv'
          ? 'text/csv; charset=utf-8'
          : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `refund_export_${Date.now()}.${format === 'csv' ? 'csv' : 'xlsx'}`
      a.click()
      URL.revokeObjectURL(url)
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#1A1A2E] p-6 text-[#F5F5F0]">
      <h1 className="mb-6 text-2xl font-bold">待确认区与导出</h1>

      {/* Section A */}
      <section className="mb-8">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-[#E8813B]" />
            <h2 className="text-lg font-semibold">待确认池</h2>
            <span className="ml-2 rounded-full bg-[#E8813B]/20 px-3 py-0.5 text-xs text-[#E8813B]">
              {pendingCount} 项待确认 / {formatCurrency(pendingTotal)}
            </span>
          </div>
        </div>

        <div className="mb-4 flex items-center gap-3">
          <div className="flex rounded-lg border border-white/10 bg-white/5 p-0.5">
            {(['平台手续费', '优惠券追回'] as PendingType[]).map((t) => (
              <button
                key={t}
                onClick={() => setActiveType(t)}
                className={cn(
                  'rounded-md px-4 py-1.5 text-sm transition',
                  activeType === t ? 'bg-[#0F9B8E] text-white' : 'text-[#F5F5F0]/60 hover:text-[#F5F5F0]'
                )}
              >
                {t}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1.5 ml-auto">
            <Filter className="h-4 w-4 text-[#F5F5F0]/40" />
            {statusFilters.map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={cn(
                  'rounded-md px-3 py-1 text-xs transition',
                  statusFilter === s
                    ? 'bg-[#0F9B8E]/20 text-[#0F9B8E]'
                    : 'text-[#F5F5F0]/40 hover:text-[#F5F5F0]/70'
                )}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <p className="py-10 text-center text-sm text-[#F5F5F0]/40">加载中...</p>
        ) : pendingItems.length === 0 ? (
          <p className="py-10 text-center text-sm text-[#F5F5F0]/40">暂无数据</p>
        ) : (
          <div className="space-y-2">
            {pendingItems.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 px-4 py-3 transition hover:border-white/20"
              >
                <div className="flex flex-col gap-0.5">
                  <Link
                    to={`/refund/${item.refund_case_id}`}
                    className="text-sm font-medium text-[#0F9B8E] hover:underline"
                  >
                    关联案件 →
                  </Link>
                  <span className="text-sm text-[#F5F5F0]/70">{item.source_name}</span>
                  <span className="text-base font-semibold">{formatCurrency(item.amount)}</span>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-xs text-[#F5F5F0]/30">{formatDateTime(item.created_at)}</span>
                  <span className={cn('rounded-full px-2.5 py-0.5 text-xs font-medium', STATUS_BADGE[item.status] ?? 'bg-white/10 text-[#F5F5F0]/40')}>
                    {item.status}
                  </span>
                  {item.status === '待确认' && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleConfirm(item.id)}
                        className="flex items-center gap-1 rounded-md bg-[#0F9B8E] px-3 py-1 text-xs font-medium text-white transition hover:bg-[#0d8a7e]"
                      >
                        <Check className="h-3.5 w-3.5" /> 确认
                      </button>
                      <button
                        onClick={() => handleReject(item.id)}
                        className="flex items-center gap-1 rounded-md border border-white/10 px-3 py-1 text-xs text-[#F5F5F0]/50 transition hover:bg-white/5"
                      >
                        <RotateCcw className="h-3.5 w-3.5" /> 退回
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Section B */}
      <section>
        <div className="mb-4 flex items-center gap-2">
          <Download className="h-5 w-5 text-[#0F9B8E]" />
          <h2 className="text-lg font-semibold">导出</h2>
        </div>

        <div className="rounded-lg border border-white/10 bg-white/5 p-4">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-sm text-[#F5F5F0]/60">
              选择案件（仅 待确认 / 已完成 状态可选）
            </span>
            <span className="text-xs text-[#F5F5F0]/30">
              已选 {selectedCases.size} / {selectableCases.length}
            </span>
          </div>

          {selectableCases.length === 0 ? (
            <p className="py-6 text-center text-sm text-[#F5F5F0]/40">无可用案件</p>
          ) : (
            <div className="max-h-56 space-y-1 overflow-y-auto pr-1">
              {selectableCases.map((c) => (
                <label
                  key={c.id}
                  className={cn(
                    'flex cursor-pointer items-center gap-3 rounded-md px-3 py-2 transition',
                    selectedCases.has(c.id) ? 'bg-[#0F9B8E]/10' : 'hover:bg-white/5'
                  )}
                >
                  <input
                    type="checkbox"
                    checked={selectedCases.has(c.id)}
                    onChange={() => toggleCase(c.id)}
                    className="h-4 w-4 accent-[#0F9B8E]"
                  />
                  <span className="flex-1 text-sm">{c.customer_name}</span>
                  <span className="text-xs text-[#F5F5F0]/40">{formatCurrency(c.total_amount)}</span>
                  <span className={cn(
                    'rounded-full px-2 py-0.5 text-xs',
                    c.status === '待确认' ? 'bg-[#E8813B]/20 text-[#E8813B]' : 'bg-emerald-500/20 text-emerald-400'
                  )}>
                    {c.status}
                  </span>
                </label>
              ))}
            </div>
          )}

          <div className="mt-4 flex items-center gap-3 border-t border-white/10 pt-4">
            <button
              disabled={selectedCases.size === 0 || exporting}
              onClick={() => handleExport('xlsx')}
              className="flex items-center gap-2 rounded-lg bg-[#0F9B8E] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#0d8a7e] disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <FileSpreadsheet className="h-4 w-4" /> 导出 Excel
            </button>
            <button
              disabled={selectedCases.size === 0 || exporting}
              onClick={() => handleExport('csv')}
              className="flex items-center gap-2 rounded-lg border border-[#0F9B8E] px-4 py-2 text-sm font-medium text-[#0F9B8E] transition hover:bg-[#0F9B8E]/10 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <FileText className="h-4 w-4" /> 导出 CSV
            </button>
            {exporting && <span className="text-xs text-[#F5F5F0]/40">导出中...</span>}
          </div>
        </div>
      </section>

      <ExportValidateModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        results={validateResults}
        onExportConfirm={() => {
          setModalOpen(false)
          doExport(
            Array.from(selectedCases),
            'xlsx'
          )
        }}
      />
    </div>
  )
}
