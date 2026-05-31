import { useEffect, useState, useCallback } from 'react'
import { Download, FileText, Printer } from 'lucide-react'
import { useAppStore } from '@/store'
import { useApi } from '@/hooks/useApi'
import CountryFlag from '@/components/CountryFlag'

interface ReportItem {
  country: string
  country_name: string
  period: string
  order_vat: number
  return_vat: number
  net_vat: number
  billed_vat: number
  difference: number
  hasAuditAdjustment: boolean
}

interface ReportPreview {
  period: string
  items: ReportItem[]
  totals: {
    netVat: number
    billedVat: number
    difference: number
  }
  auditAdjustments: {
    id: string
    entityType: string
    entityId: string
    orderId: string
    field: string
    oldValue: string
    newValue: string
    reason: string
    impactAmount: number
    createdAt: string
  }[]
}

export default function Reports() {
  const { selectedPeriod, setSelectedPeriod } = useAppStore()
  const [report, setReport] = useState<ReportPreview | null>(null)
  const [exporting, setExporting] = useState(false)
  const api = useApi()

  const fetchReport = useCallback(() => {
    api.get<{ success: boolean; data: ReportPreview }>(`/api/reports/preview?period=${selectedPeriod}`).then((res) => setReport(res.data)).catch(() => setReport(null))
  }, [selectedPeriod])

  useEffect(() => {
    fetchReport()
  }, [fetchReport])

  const handleExport = async (format: 'csv' | 'pdf') => {
    setExporting(true)
    try {
      const res = await fetch(`/api/reports/export?format=${format}&period=${selectedPeriod}`)
      if (!res.ok) throw new Error('导出失败')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `vat-report-${selectedPeriod}.${format}`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch {
      alert('导出失败，请重试')
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-serif text-navy-500">报表导出</h1>
        <div className="flex items-center gap-3">
          <input
            type="month"
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
            className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-navy-300"
          />
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={() => handleExport('csv')}
          disabled={exporting}
          className="flex items-center gap-2 px-4 py-2 text-sm text-navy-500 border border-navy-200 rounded-lg hover:bg-navy-50 disabled:opacity-50"
        >
          <Download size={16} />
          导出CSV
        </button>
        <button
          onClick={() => handleExport('pdf')}
          disabled={exporting}
          className="flex items-center gap-2 px-4 py-2 text-sm text-white bg-navy-500 rounded-lg hover:bg-navy-600 disabled:opacity-50"
        >
          <FileText size={16} />
          导出PDF
        </button>
        <button
          onClick={() => window.print()}
          className="flex items-center gap-2 px-4 py-2 text-sm text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-50"
        >
          <Printer size={16} />
          打印
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="p-8" style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}>
          <div className="text-center mb-8">
            <h2 className="text-xl font-serif text-navy-500 mb-1">VAT预提报表</h2>
            <p className="text-sm text-gray-500">期间: {selectedPeriod}</p>
          </div>

          <table className="w-full text-sm">
            <thead>
              <tr className="border-b-2 border-navy-200">
                <th className="px-4 py-3 text-left font-semibold text-navy-500">国家</th>
                <th className="px-4 py-3 text-left font-semibold text-navy-500">期间</th>
                <th className="px-4 py-3 text-right font-semibold text-navy-500">订单VAT</th>
                <th className="px-4 py-3 text-right font-semibold text-navy-500">退货VAT</th>
                <th className="px-4 py-3 text-right font-semibold text-navy-500">净VAT</th>
                <th className="px-4 py-3 text-right font-semibold text-navy-500">账单VAT</th>
                <th className="px-4 py-3 text-right font-semibold text-navy-500">差异</th>
              </tr>
            </thead>
            <tbody>
              {report?.items.map((row, i) => (
                <tr
                  key={i}
                  className={`border-b border-gray-100 ${
                    row.hasAuditAdjustment ? 'border-l-4 border-l-amber-500' : ''
                  }`}
                >
                  <td className="px-4 py-2.5">
                    <CountryFlag code={row.country} />
                    <span className="ml-1 text-gray-600">{row.country_name || row.country}</span>
                  </td>
                  <td className="px-4 py-2.5 text-gray-600">{row.period}</td>
                  <td className="px-4 py-2.5 text-right">€{row.order_vat.toLocaleString('zh-CN')}</td>
                  <td className="px-4 py-2.5 text-right">€{row.return_vat.toLocaleString('zh-CN')}</td>
                  <td className="px-4 py-2.5 text-right font-medium">€{row.net_vat.toLocaleString('zh-CN')}</td>
                  <td className="px-4 py-2.5 text-right">€{row.billed_vat.toLocaleString('zh-CN')}</td>
                  <td className={`px-4 py-2.5 text-right font-medium ${row.difference < 0 ? 'text-coral-500' : 'text-emerald-500'}`}>
                    {row.difference < 0 ? '-' : '+'}€{Math.abs(row.difference).toLocaleString('zh-CN')}
                  </td>
                </tr>
              ))}
              {(!report || report.items.length === 0) && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-gray-400">
                    暂无报表数据
                  </td>
                </tr>
              )}
            </tbody>
            {report?.totals && (
              <tfoot>
                <tr className="border-t-2 border-navy-300 bg-gray-50">
                  <td className="px-4 py-3 font-semibold text-navy-500">合计</td>
                  <td className="px-4 py-3"></td>
                  <td className="px-4 py-3"></td>
                  <td className="px-4 py-3"></td>
                  <td className="px-4 py-3 text-right font-semibold text-navy-500">
                    €{report.totals.netVat.toLocaleString('zh-CN')}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-navy-500">
                    €{report.totals.billedVat.toLocaleString('zh-CN')}
                  </td>
                  <td className={`px-4 py-3 text-right font-semibold ${
                    report.totals.difference < 0 ? 'text-coral-500' : 'text-emerald-500'
                  }`}>
                    {report.totals.difference < 0 ? '-' : '+'}€{Math.abs(report.totals.difference).toLocaleString('zh-CN')}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>

          <div className="mt-6 pt-4 border-t border-gray-200 flex items-center justify-between text-xs text-gray-400">
            <span>跨境电商VAT预提系统</span>
            <span>第 1 页</span>
          </div>
        </div>
      </div>
    </div>
  )
}
