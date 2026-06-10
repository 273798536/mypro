import { useState, useEffect } from 'react'
import { Download, Shield, ShieldCheck, ShieldAlert, FileText, FileSpreadsheet, RefreshCw } from 'lucide-react'
import { useAppStore } from '@/store'
import StatusBadge from '@/components/StatusBadge'
import { fetchApi, fromSnakeData } from '@/lib/utils'

interface ConsistencyCheckResult {
  isConsistent: boolean
  mismatches: Array<{
    field: string
    uiValue: string
    exportValue: string
  }>
}

export default function ReportExport() {
  const { batches, addToast, setBatches, updateBatch } = useAppStore()
  const [selectedBatchId, setSelectedBatchId] = useState<string>('')
  const [consistency, setConsistency] = useState<ConsistencyCheckResult | null>(null)
  const [format, setFormat] = useState<'pdf' | 'csv'>('pdf')
  const [exporting, setExporting] = useState(false)

  useEffect(() => {
    fetchApi<{ items: any[] }>('/api/batches')
      .then((res) => {
        setBatches(fromSnakeData<any[]>(res.items || []))
      })
      .catch(() => {})
  }, [setBatches])

  const exportableBatches = batches.filter(
    (b) => b.status === 'approved' || b.status === 'exported' || b.status === 'pending_review' || b.status === 'analyzing'
  )
  const selectedBatch = batches.find((b) => b.id === selectedBatchId)

  useEffect(() => {
    if (selectedBatchId) {
      fetchApi<ConsistencyCheckResult>(`/api/batches/${selectedBatchId}/consistency-check`)
        .then(setConsistency)
        .catch(() => setConsistency(null))
    } else {
      setConsistency(null)
    }
  }, [selectedBatchId])

  async function handleExport() {
    if (!selectedBatchId) return
    if (consistency && !consistency.isConsistent) {
      addToast({
        type: 'error',
        message: '导出内容与界面摘要不一致，请先修正差异',
        actionableHint: '请检查以下差异字段',
        missingData: consistency.mismatches.map(
          (m) => `${m.field}: 界面=${m.uiValue}, 导出=${m.exportValue}`
        ),
      })
      return
    }
    setExporting(true)
    try {
      const res = await fetch(`/api/batches/${selectedBatchId}/export`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ format }),
      })
      if (!res.ok) {
        const err = await res.json()
        addToast({
          type: 'error',
          message: err.message || '导出失败',
          actionableHint: err.actionableHint,
        })
        return
      }
      const body = await res.json()
      const exportData = body.data || body
      const fileName = `${selectedBatch?.batchNo || 'report'}.${format === 'csv' ? 'csv' : 'json'}`

      let content = ''
      if (format === 'csv') {
        const rows: string[][] = []
        rows.push(['字段', '值'])
        const flat: Record<string, any> = {}
        function flatten(obj: any, prefix = '') {
          for (const k in obj) {
            const key = prefix ? `${prefix}.${k}` : k
            if (obj[k] !== null && typeof obj[k] === 'object' && !Array.isArray(obj[k])) {
              flatten(obj[k], key)
            } else if (Array.isArray(obj[k])) {
              flat[key] = JSON.stringify(obj[k])
            } else {
              flat[key] = String(obj[k] ?? '')
            }
          }
        }
        flatten(exportData)
        for (const k in flat) rows.push([k, flat[k]])
        content = rows.map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(',')).join('\n')
      } else {
        content = JSON.stringify(exportData, null, 2)
      }

      const blob = new Blob([content], {
        type: format === 'csv' ? 'text/csv;charset=utf-8' : 'application/json;charset=utf-8',
      })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = fileName
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      await fetch(`/api/batches/${selectedBatchId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'exported', operator: 'quality_supervisor' }),
      }).then((r) => {
        if (r.ok) updateBatch(selectedBatchId, { status: 'exported' })
      }).catch(() => {})

      addToast({ type: 'success', message: '报告导出成功' })
    } catch {
      addToast({ type: 'error', message: '导出失败，请重试' })
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-serif text-2xl font-semibold text-indigo-900">
          报告导出
        </h2>
        <p className="text-sm text-cool-gray mt-1">
          预览并导出报告，导出前进行一致性校验
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="space-y-6">
          <section className="bg-white rounded-lg border border-gray-200 p-4">
            <h3 className="font-serif text-base font-semibold text-indigo-900 mb-4">
              批次选择
            </h3>
            <select
              value={selectedBatchId}
              onChange={(e) => setSelectedBatchId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-900/20 focus:border-indigo-900"
            >
              <option value="">请选择批次</option>
              {exportableBatches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.batchNo}
                </option>
              ))}
            </select>

            {exportableBatches.length === 0 && (
              <p className="mt-2 text-xs text-cool-gray">
                暂无可导出的已通过批次
              </p>
            )}
          </section>

          {selectedBatch && (
            <section className="bg-white rounded-lg border border-gray-200 p-4">
              <h3 className="font-serif text-base font-semibold text-indigo-900 mb-3">
                一致性校验
              </h3>
              {consistency === null ? (
                <div className="flex items-center gap-2 text-sm text-cool-gray">
                  <Shield size={18} className="text-cool-gray" />
                  校验中...
                </div>
              ) : consistency.isConsistent ? (
                <div className="flex items-center gap-2 text-sm text-emerald-500 font-medium">
                  <ShieldCheck size={20} />
                  校验通过，导出内容与界面摘要一致
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm text-coral-500 font-medium">
                    <ShieldAlert size={20} />
                    存在不一致，导出已拦截
                  </div>
                  <div className="space-y-2">
                    {consistency.mismatches.map((m, i) => (
                      <div
                        key={i}
                        className="bg-coral-500/5 rounded-lg p-3 text-xs"
                      >
                        <p className="font-medium text-coral-500">
                          {m.field}
                        </p>
                        <div className="flex gap-4 mt-1 text-cool-gray">
                          <span>界面: {m.uiValue}</span>
                          <span>导出: {m.exportValue}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </section>
          )}

          {selectedBatch && (
            <section className="bg-white rounded-lg border border-gray-200 p-4">
              <h3 className="font-serif text-base font-semibold text-indigo-900 mb-3">
                导出格式
              </h3>
              <div className="flex gap-3">
                <button
                  onClick={() => setFormat('pdf')}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium border transition-colors ${
                    format === 'pdf'
                      ? 'bg-indigo-900 text-white border-indigo-900'
                      : 'bg-white text-cool-gray border-gray-300 hover:border-indigo-900/30'
                  }`}
                >
                  <FileText size={16} />
                  JSON
                </button>
                <button
                  onClick={() => setFormat('csv')}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium border transition-colors ${
                    format === 'csv'
                      ? 'bg-indigo-900 text-white border-indigo-900'
                      : 'bg-white text-cool-gray border-gray-300 hover:border-indigo-900/30'
                  }`}
                >
                  <FileSpreadsheet size={16} />
                  CSV
                </button>
              </div>
              <button
                onClick={handleExport}
                disabled={
                  exporting ||
                  !selectedBatchId ||
                  (consistency !== null && !consistency.isConsistent)
                }
                className="mt-4 w-full flex items-center justify-center gap-2 bg-amber-500 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-amber-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Download size={16} />
                {exporting ? '导出中...' : '导出报告'}
              </button>
            </section>
          )}
        </div>

        <div className="lg:col-span-2">
          <section className="bg-white rounded-lg border border-gray-200 p-4">
            <h3 className="font-serif text-base font-semibold text-indigo-900 mb-4">
              报告预览
            </h3>
            {selectedBatch ? (
              <div className="bg-white border border-gray-300 shadow-lg mx-auto max-w-[680px] min-h-[880px] p-12"
                style={{ aspectRatio: '210/297' }}
              >
                <div className="border-b-2 border-indigo-900 pb-4 mb-6">
                  <h4 className="font-serif text-xl font-bold text-indigo-900">
                    质谱碎片归因报告
                  </h4>
                  <p className="text-xs text-cool-gray mt-1">
                    批次号: {selectedBatch.batchNo}
                  </p>
                </div>
                <div className="space-y-4 text-sm">
                  <div className="grid grid-cols-2 gap-x-8 gap-y-2">
                    <div>
                      <span className="text-cool-gray text-xs">状态</span>
                      <div className="mt-0.5">
                        <StatusBadge status={selectedBatch.status} />
                      </div>
                    </div>
                    <div>
                      <span className="text-cool-gray text-xs">称量精度</span>
                      <p className="font-mono mt-0.5">
                        {selectedBatch.weighingPrecision}
                      </p>
                    </div>
                    <div>
                      <span className="text-cool-gray text-xs">创建时间</span>
                      <p className="font-mono mt-0.5">
                        {new Date(selectedBatch.createdAt).toLocaleString(
                          'zh-CN'
                        )}
                      </p>
                    </div>
                    <div>
                      <span className="text-cool-gray text-xs">导出时间</span>
                      <p className="font-mono mt-0.5">
                        {new Date().toLocaleString('zh-CN')}
                      </p>
                    </div>
                  </div>
                  <div className="border-t border-gray-200 pt-4 mt-4">
                    <h5 className="font-serif font-semibold text-indigo-900 mb-2">
                      分析结论
                    </h5>
                    <div className="h-40 bg-gray-50 rounded flex items-center justify-center text-cool-gray text-xs">
                      碎片归因结果将在导出时填充
                    </div>
                  </div>
                  <div className="border-t border-gray-200 pt-4 mt-4">
                    <h5 className="font-serif font-semibold text-indigo-900 mb-2">
                      安全提示
                    </h5>
                    <div className="h-16 bg-amber-500/5 rounded border-l-4 border-amber-500 p-3 text-xs text-cool-gray">
                      安全提示内容将在导出时填充
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center py-24 text-cool-gray text-sm">
                请选择批次以预览报告
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  )
}
