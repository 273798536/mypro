import { useEffect, useState, useCallback, Fragment } from 'react'
import { Upload, RefreshCw, ChevronDown, ChevronRight } from 'lucide-react'
import { useAppStore } from '@/store'
import { useApi } from '@/hooks/useApi'
import CountryFlag from '@/components/CountryFlag'
import ImportModal from '@/components/ImportModal'

interface ReconciliationRow {
  id: string
  country: string
  period: string
  order_vat: number
  return_vat: number
  net_vat: number
  billed_vat: number
  difference: number
  status: string
  updated_at: string
}

function getDiffColor(diff: number, rate: number) {
  if (Math.abs(rate) < 0.5) return 'text-emerald-500'
  if (Math.abs(rate) < 5) return 'text-amber-500'
  return 'text-coral-500'
}

function getDiffBg(rate: number) {
  if (Math.abs(rate) < 0.5) return 'bg-emerald-50'
  if (Math.abs(rate) < 5) return 'bg-amber-50'
  return 'bg-coral-50'
}

function calcDiffRate(row: ReconciliationRow): number | null {
  if (row.billed_vat > 0) return (row.difference / row.billed_vat) * 100
  return null
}

export default function Reconciliation() {
  const { selectedPeriod } = useAppStore()
  const [rows, setRows] = useState<ReconciliationRow[]>([])
  const [expandedRow, setExpandedRow] = useState<string | null>(null)
  const [importOpen, setImportOpen] = useState(false)
  const api = useApi()

  const fetchData = useCallback(() => {
    const params = new URLSearchParams()
    if (selectedPeriod) params.set('period', selectedPeriod)
    api.get<{ success: boolean; data: ReconciliationRow[] }>(`/api/vat-accruals?${params}`).then((res) => setRows(res.data)).catch(() => setRows([]))
  }, [selectedPeriod])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const toggleRow = (key: string) => {
    setExpandedRow((prev) => (prev === key ? null : key))
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-serif text-navy-500">账单核对</h1>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchData}
            className="p-2 rounded-lg hover:bg-gray-100"
          >
            <RefreshCw size={16} className="text-gray-400" />
          </button>
          <button
            onClick={() => setImportOpen(true)}
            className="flex items-center gap-2 px-4 py-2 text-sm text-white bg-navy-500 rounded-lg hover:bg-navy-600"
          >
            <Upload size={16} />
            导入账单
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="px-4 py-3 w-8"></th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">国家</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">期间</th>
                <th className="px-4 py-3 text-right font-medium text-gray-500">预提VAT</th>
                <th className="px-4 py-3 text-right font-medium text-gray-500">账单VAT</th>
                <th className="px-4 py-3 text-right font-medium text-gray-500">差异</th>
                <th className="px-4 py-3 text-right font-medium text-gray-500">差异率</th>
                <th className="px-4 py-3 text-center font-medium text-gray-500">状态</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const key = `${row.country}-${row.period}`
                const isExpanded = expandedRow === key
                const diffRate = calcDiffRate(row)
                const diffRateValue = diffRate ?? 0
                return (
                  <Fragment key={key}>
                    <tr
                      key={key}
                      className={`border-b border-gray-50 hover:bg-gray-50/50 cursor-pointer ${getDiffBg(diffRateValue)}`}
                      onClick={() => toggleRow(key)}
                    >
                      <td className="px-4 py-3">
                        {isExpanded ? (
                          <ChevronDown size={16} className="text-gray-400" />
                        ) : (
                          <ChevronRight size={16} className="text-gray-400" />
                        )}
                      </td>
                      <td className="px-4 py-3"><CountryFlag code={row.country} /></td>
                      <td className="px-4 py-3 text-gray-600">{row.period}</td>
                      <td className="px-4 py-3 text-right text-gray-600">€{row.net_vat.toLocaleString('zh-CN')}</td>
                      <td className="px-4 py-3 text-right text-gray-600">€{row.billed_vat.toLocaleString('zh-CN')}</td>
                      <td className={`px-4 py-3 text-right font-medium ${getDiffColor(row.difference, diffRateValue)}`}>
                        {row.difference < 0 ? '-' : '+'}€{Math.abs(row.difference).toLocaleString('zh-CN')}
                      </td>
                      <td className={`px-4 py-3 text-right font-medium ${getDiffColor(row.difference, diffRateValue)}`}>
                        {diffRate !== null ? `${diffRate.toFixed(2)}%` : 'N/A'}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${
                          Math.abs(diffRateValue) < 0.5
                            ? 'bg-emerald-50 text-emerald-600'
                            : Math.abs(diffRateValue) < 5
                            ? 'bg-amber-50 text-amber-600'
                            : 'bg-coral-50 text-coral-600'
                        }`}>
                          {Math.abs(diffRateValue) < 0.5 ? '匹配' : Math.abs(diffRateValue) < 5 ? '小差异' : '大差异'}
                        </span>
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr key={`${key}-detail`}>
                        <td colSpan={8} className="px-8 py-4 bg-gray-50/50">
                          <div className="grid grid-cols-2 gap-6">
                            <div>
                              <h4 className="text-sm font-medium text-navy-500 mb-2">订单VAT明细</h4>
                              <div className="space-y-1 text-xs text-gray-600">
                                <div className="flex justify-between">
                                  <span>订单VAT合计</span>
                                  <span className="font-medium">€{row.order_vat.toLocaleString('zh-CN')}</span>
                                </div>
                              </div>
                            </div>
                            <div>
                              <h4 className="text-sm font-medium text-navy-500 mb-2">退货VAT明细</h4>
                              <div className="space-y-1 text-xs text-gray-600">
                                <div className="flex justify-between">
                                  <span>退货VAT合计</span>
                                  <span className="font-medium">€{row.return_vat.toLocaleString('zh-CN')}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                )
              })}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-gray-400">
                    暂无核对数据
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <ImportModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        title="导入平台账单"
        apiEndpoint="/api/bills/import"
        dataKey="bills"
        onImported={fetchData}
      />
    </div>
  )
}
