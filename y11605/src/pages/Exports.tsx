import { useEffect, useState } from 'react'
import { Download, FileSpreadsheet, FileText, History, Calendar, Filter } from 'lucide-react'
import { api } from '../lib/api'
import { toast } from '../components/UI/Toast'
import Modal from '../components/UI/Modal'
import type { ExportRecord, RefundBatch } from '../../shared/types'

export default function Exports() {
  const [records, setRecords] = useState<ExportRecord[]>([])
  const [batches, setBatches] = useState<RefundBatch[]>([])
  const [loading, setLoading] = useState(false)
  const [showExportModal, setShowExportModal] = useState(false)
  const [exportType, setExportType] = useState<'refund_detail' | 'allocation_report'>('refund_detail')
  const [selectedBatchId, setSelectedBatchId] = useState('')
  const [exporting, setExporting] = useState(false)

  useEffect(() => {
    fetchRecords()
    fetchBatches()
  }, [])

  const fetchRecords = async () => {
    setLoading(true)
    try {
      const result = await api.exports.list()
      setRecords(result.records)
    } catch (error) {
      toast.error('获取导出记录失败')
    } finally {
      setLoading(false)
    }
  }

  const fetchBatches = async () => {
    try {
      const result = await api.batches.list()
      setBatches(result.batches)
    } catch (error) {
      toast.error('获取批次列表失败')
    }
  }

  const handleExport = async () => {
    if (exportType === 'allocation_report' && !selectedBatchId) {
      toast.warning('请选择批次')
      return
    }

    setExporting(true)
    try {
      if (exportType === 'refund_detail') {
        await api.exports.refundDetails({})
      } else {
        await api.exports.allocationReport({ batchId: selectedBatchId })
      }
      toast.success('导出成功，文件将自动下载')
      setShowExportModal(false)
      fetchRecords()
    } catch (error) {
      toast.error((error as Error).message)
    } finally {
      setExporting(false)
    }
  }

  const handleDownload = (id: string) => {
    api.exports.download(id)
    toast.success('开始下载')
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  }

  const typeLabels: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
    refund_detail: {
      label: '退款明细',
      icon: <FileSpreadsheet className="h-4 w-4" />,
      color: 'text-blue-600 bg-blue-50',
    },
    allocation_report: {
      label: '分摊报告',
      icon: <FileText className="h-4 w-4" />,
      color: 'text-green-600 bg-green-50',
    },
    audit_log: {
      label: '审计日志',
      icon: <History className="h-4 w-4" />,
      color: 'text-purple-600 bg-purple-50',
    },
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">导出中心</h1>
          <p className="text-sm text-slate-500 mt-1">导出退款明细和分摊报告，支持Excel格式</p>
        </div>
        <button
          onClick={() => setShowExportModal(true)}
          className="btn btn-primary"
        >
          <Download className="h-4 w-4 mr-2" />
          新建导出
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <FileSpreadsheet className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">退款明细</p>
              <p className="text-lg font-semibold text-slate-900">
                {records.filter((r) => r.type === 'refund_detail').length}
              </p>
            </div>
          </div>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <FileText className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">分摊报告</p>
              <p className="text-lg font-semibold text-slate-900">
                {records.filter((r) => r.type === 'allocation_report').length}
              </p>
            </div>
          </div>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <History className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">审计日志</p>
              <p className="text-lg font-semibold text-slate-900">
                {records.filter((r) => r.type === 'audit_log').length}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead>
              <tr>
                <th className="table-header py-3 px-4">文件类型</th>
                <th className="table-header py-3 px-4">关联批次</th>
                <th className="table-header py-3 px-4">文件大小</th>
                <th className="table-header py-3 px-4">导出人</th>
                <th className="table-header py-3 px-4">导出时间</th>
                <th className="table-header py-3 px-4">操作</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-200">
              {loading ? (
                <tr>
                  <td colSpan={6} className="table-cell text-center text-slate-500">
                    加载中...
                  </td>
                </tr>
              ) : records.length === 0 ? (
                <tr>
                  <td colSpan={6} className="table-cell text-center text-slate-500">
                    暂无导出记录
                  </td>
                </tr>
              ) : (
                records.map((record) => {
                  const typeInfo = typeLabels[record.type] || typeLabels.refund_detail
                  return (
                    <tr key={record.id} className="hover:bg-slate-50">
                      <td className="table-cell py-3 px-4">
                        <div className="flex items-center gap-2">
                          <span className={`p-1.5 rounded ${typeInfo.color}`}>
                            {typeInfo.icon}
                          </span>
                          <span className="font-medium">{typeInfo.label}</span>
                        </div>
                      </td>
                      <td className="table-cell py-3 px-4">
                        {record.batchId || '-'}
                      </td>
                      <td className="table-cell py-3 px-4 font-mono text-sm">
                        {formatFileSize(record.fileSize)}
                      </td>
                      <td className="table-cell py-3 px-4">{record.createdBy}</td>
                      <td className="table-cell py-3 px-4 text-sm text-slate-500">
                        {new Date(record.createdAt).toLocaleString('zh-CN')}
                      </td>
                      <td className="table-cell py-3 px-4">
                        <button
                          onClick={() => handleDownload(record.id)}
                          className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                          title="下载"
                        >
                          <Download className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        title="新建导出"
        footer={
          <div className="flex justify-end gap-3">
            <button onClick={() => setShowExportModal(false)} className="btn btn-secondary">
              取消
            </button>
            <button
              onClick={handleExport}
              disabled={exporting}
              className="btn btn-primary"
            >
              {exporting ? '导出中...' : '导出'}
            </button>
          </div>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="label">导出类型</label>
            <div className="space-y-2">
              <label className="flex items-center gap-3 p-3 border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-50">
                <input
                  type="radio"
                  name="exportType"
                  value="refund_detail"
                  checked={exportType === 'refund_detail'}
                  onChange={(e) => setExportType(e.target.value as any)}
                  className="text-slate-800 focus:ring-slate-500"
                />
                <div>
                  <div className="font-medium">退款明细</div>
                  <div className="text-sm text-slate-500">导出所有参与人的退款明细数据</div>
                </div>
              </label>
              <label className="flex items-center gap-3 p-3 border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-50">
                <input
                  type="radio"
                  name="exportType"
                  value="allocation_report"
                  checked={exportType === 'allocation_report'}
                  onChange={(e) => setExportType(e.target.value as any)}
                  className="text-slate-800 focus:ring-slate-500"
                />
                <div>
                  <div className="font-medium">分摊报告</div>
                  <div className="text-sm text-slate-500">按批次导出分摊汇总报告</div>
                </div>
              </label>
            </div>
          </div>

          {exportType === 'allocation_report' && (
            <div>
              <label className="label">选择批次</label>
              <select
                value={selectedBatchId}
                onChange={(e) => setSelectedBatchId(e.target.value)}
                className="input"
              >
                <option value="">请选择批次</option>
                {batches.map((batch) => (
                  <option key={batch.id} value={batch.id}>
                    {batch.name} ({batch.status})
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="p-3 bg-blue-50 rounded-lg text-sm text-blue-700">
            <p>导出文件将保存为 Excel 格式，包含完整的金额明细和异常标记。</p>
          </div>
        </div>
      </Modal>
    </div>
  )
}
