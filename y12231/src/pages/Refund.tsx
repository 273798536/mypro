import { useState, useEffect } from 'react'
import { Calculator, FileText, AlertTriangle, Download, CheckCircle } from 'lucide-react'
import { api } from '@/api'
import type { MemberAccount, Package } from '@/types'
import { useFilterStore } from '@/stores/filterStore'

export default function Refund() {
  const [members, setMembers] = useState<MemberAccount[]>([])
  const [packages, setPackages] = useState<Package[]>([])
  const [selectedMemberId, setSelectedMemberId] = useState('')
  const [selectedPackageId, setSelectedPackageId] = useState('')
  const [calcResult, setCalcResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [exportFormat, setExportFormat] = useState('csv')
  const [toast, setToast] = useState('')

  useEffect(() => {
    api.members.list().then(setMembers).catch(() => {})
  }, [])

  useEffect(() => {
    if (selectedMemberId) {
      api.packages.list({ memberId: selectedMemberId }).then(setPackages).catch(() => {})
    } else {
      setPackages([])
    }
    setSelectedPackageId('')
    setCalcResult(null)
  }, [selectedMemberId])

  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(''), 3000)
      return () => clearTimeout(t)
    }
  }, [toast])

  const handleCalculate = async () => {
    if (!selectedPackageId) return
    setLoading(true)
    setCalcResult(null)
    try {
      const res = await api.refund.calculate(selectedPackageId)
      if (res.success) setCalcResult(res.data)
    } catch {
    } finally {
      setLoading(false)
    }
  }

  const handleExport = async (type: string) => {
    try {
      const blob = await api.export.download(type, exportFormat, getFilters())
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      const typeLabel = type === 'normal_details' ? '正常明细' : type === 'exception_details' ? '异常明细' : '退款试算报告'
      a.download = `${typeLabel}_${new Date().toISOString().slice(0, 10)}.${exportFormat}`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      setToast(`${typeLabel}导出成功`)
    } catch {
    }
  }

  const selectedMember = members.find(m => m.id === selectedMemberId)

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      {toast && (
        <div className="fixed top-4 right-4 z-50 flex items-center gap-2 bg-emerald-600 text-white px-4 py-3 rounded-lg shadow-lg text-sm font-medium animate-pulse">
          <CheckCircle className="w-4 h-4" />
          {toast}
        </div>
      )}

      <h1 className="text-2xl font-bold text-slate-800 mb-6">退款试算与导出</h1>

      <div className="flex flex-col lg:flex-row gap-6">
        <div className="w-full lg:w-1/2 space-y-6">
          <div className="table-container p-6">
            <h2 className="text-lg font-semibold text-slate-700 mb-4">退款试算</h2>

            <div className="space-y-3 mb-4">
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">选择会员</label>
                <select
                  className="filter-select w-full"
                  value={selectedMemberId}
                  onChange={e => setSelectedMemberId(e.target.value)}
                >
                  <option value="">请选择会员</option>
                  {members.map(m => (
                    <option key={m.id} value={m.id}>
                      {m.name} ({m.phone}) — 余额 ¥{m.balance.toFixed(2)}
                    </option>
                  ))}
                </select>
              </div>
              {selectedMemberId && packages.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1">选择套餐</label>
                  <select
                    className="filter-select w-full"
                    value={selectedPackageId}
                    onChange={e => setSelectedPackageId(e.target.value)}
                  >
                    <option value="">请选择套餐</option>
                    {packages.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.name} — 剩余{p.remaining_deductions}次 / ¥{p.price.toFixed(2)} ({p.status === 'active' ? '有效' : p.status === 'expired' ? '已过期' : '已用尽'})
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <button
                className="btn-primary whitespace-nowrap"
                disabled={!selectedPackageId || loading}
                onClick={handleCalculate}
              >
                {loading ? '试算中...' : '开始试算'}
              </button>
            </div>

            {calcResult ? (
              <div className="space-y-4">
                <div className="bg-slate-50 rounded-lg p-5 border border-slate-200">
                  <div className="text-sm text-slate-500 mb-1">
                    套餐: <span className="font-medium text-slate-700">{calcResult.packageName}</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-3">
                    <div>
                      <div className="text-xs text-slate-500">套餐价格</div>
                      <div className="text-lg font-semibold text-slate-800">¥{(calcResult.price ?? 0).toFixed(2)}</div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-500">剩余价值</div>
                      <div className="text-lg font-semibold text-slate-800">¥{(calcResult.remainingValue ?? 0).toFixed(2)}</div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-500">建议退款金额</div>
                      <div className="text-2xl font-bold text-teal-700">¥{(calcResult.totalRefundable ?? 0).toFixed(2)}</div>
                    </div>
                  </div>
                </div>

                {calcResult.manualOverrideCount > 0 && (
                  <div className="border border-amber-200 rounded-lg overflow-hidden">
                    <div className="bg-amber-50 px-4 py-3 flex items-center gap-2 border-b border-amber-200">
                      <AlertTriangle className="w-4 h-4 text-orange-500" />
                      <span className="text-sm font-semibold text-amber-800">人工修改影响 ({calcResult.manualOverrideCount}条)</span>
                    </div>
                    <div className="p-4 bg-amber-50/30">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-amber-700">人工修改总影响</span>
                        <span className={`text-lg font-bold ${(calcResult.manualOverrideImpact ?? 0) > 0 ? 'text-emerald-600' : (calcResult.manualOverrideImpact ?? 0) < 0 ? 'text-red-600' : 'text-slate-700'}`}>
                          {(calcResult.manualOverrideImpact ?? 0) > 0 ? '+' : ''}¥{(calcResult.manualOverrideImpact ?? 0).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Calculator className="w-12 h-12 text-slate-300 mb-3" />
                <p className="text-slate-400 text-sm">请选择套餐开始退款试算</p>
              </div>
            )}
          </div>
        </div>

        <div className="w-full lg:w-1/2 space-y-6">
          <div className="table-container p-6">
            <h2 className="text-lg font-semibold text-slate-700 mb-4">导出清单</h2>

            <div className="space-y-4 mb-6">
              <div className="border border-slate-200 rounded-lg p-4 flex items-start gap-4">
                <div className="p-2 bg-slate-50 rounded-lg border border-slate-200">
                  <FileText className="w-5 h-5 text-slate-600" />
                </div>
                <div className="flex-1">
                  <div className="font-medium text-slate-700 text-sm">正常明细</div>
                  <div className="text-xs text-slate-500 mt-0.5">导出所有正常消费流水和扣次明细</div>
                </div>
                <button className="btn-secondary btn-sm" onClick={() => handleExport('normal_details')}>
                  <Download className="w-3.5 h-3.5 inline mr-1" />
                  导出
                </button>
              </div>

              <div className="border border-slate-200 rounded-lg p-4 flex items-start gap-4">
                <div className="p-2 bg-amber-50 rounded-lg border border-amber-200">
                  <AlertTriangle className="w-5 h-5 text-amber-600" />
                </div>
                <div className="flex-1">
                  <div className="font-medium text-slate-700 text-sm">异常明细</div>
                  <div className="text-xs text-slate-500 mt-0.5">导出所有异常清单条目</div>
                </div>
                <button className="btn-secondary btn-sm" onClick={() => handleExport('exception_details')}>
                  <Download className="w-3.5 h-3.5 inline mr-1" />
                  导出
                </button>
              </div>

              <div className="border border-slate-200 rounded-lg p-4 flex items-start gap-4">
                <div className="p-2 bg-teal-50 rounded-lg border border-teal-200">
                  <Calculator className="w-5 h-5 text-teal-600" />
                </div>
                <div className="flex-1">
                  <div className="font-medium text-slate-700 text-sm">退款试算报告</div>
                  <div className="text-xs text-slate-500 mt-0.5">导出当前退款试算结果</div>
                </div>
                <button
                  className="btn-secondary btn-sm"
                  disabled={!calcResult}
                  onClick={() => handleExport('refund_report')}
                >
                  <Download className="w-3.5 h-3.5 inline mr-1" />
                  导出
                </button>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <label className="text-sm font-medium text-slate-600">导出格式</label>
              <select
                className="filter-select"
                value={exportFormat}
                onChange={e => setExportFormat(e.target.value)}
              >
                <option value="csv">CSV</option>
              </select>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
