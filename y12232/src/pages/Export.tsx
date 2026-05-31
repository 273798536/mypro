import { useState, useEffect, useCallback } from 'react'
import { getVerifyList, exportReport, exportList, downloadFile } from '@/api'
import type { VerificationRecord, VerifyStatus } from '@/types'
import DataTable from '@/components/DataTable'
import type { Column } from '@/components/DataTable'
import StatusBadge from '@/components/StatusBadge'
import IssueBadge from '@/components/IssueBadge'
import { cn } from '@/lib/utils'
import { Download, FileSpreadsheet, FileDown, ClipboardList, AlertTriangle, CheckCircle2, Clock, Loader2 } from 'lucide-react'

type ExportType = 'report' | 'subsidy' | 'issues'

interface ExportOption {
  key: ExportType
  title: string
  description: string
  icon: typeof FileSpreadsheet
}

const exportOptions: ExportOption[] = [
  { key: 'report', title: '核验报告', description: '包含所有问题标记的完整核验报告', icon: FileSpreadsheet },
  { key: 'subsidy', title: '补贴发放清单', description: '通过核验的补贴发放明细', icon: ClipboardList },
  { key: 'issues', title: '问题清单', description: '所有问题记录的详细列表', icon: AlertTriangle },
]

interface ExportRecord {
  filename: string
  type: ExportType
  createdAt: string
  status: string
}

export default function ExportPage() {
  const [selectedType, setSelectedType] = useState<ExportType>('report')
  const [exporting, setExporting] = useState(false)
  const [previewData, setPreviewData] = useState<VerificationRecord[]>([])
  const [previewTotal, setPreviewTotal] = useState(0)
  const [previewPage, setPreviewPage] = useState(1)
  const [loading, setLoading] = useState(false)
  const [history, setHistory] = useState<ExportRecord[]>([])

  const fetchPreview = useCallback(async () => {
    setLoading(true)
    try {
      const statusFilter: VerifyStatus | undefined = selectedType === 'subsidy' ? 'passed' : undefined
      const data = await getVerifyList({ page: previewPage, pageSize: 5, status: statusFilter })
      setPreviewData(data.data)
      setPreviewTotal(data.total)
    } catch {
      setPreviewData([])
    } finally {
      setLoading(false)
    }
  }, [selectedType, previewPage])

  useEffect(() => { fetchPreview() }, [fetchPreview])

  async function handleExport() {
    setExporting(true)
    try {
      let result: { filename: string }
      if (selectedType === 'report') {
        result = await exportReport()
      } else {
        result = await exportList()
      }
      setHistory((prev) => [{
        filename: result.filename,
        type: selectedType,
        createdAt: new Date().toISOString(),
        status: 'completed',
      }, ...prev])
      await downloadFile(result.filename)
    } catch { /* ignore */ } finally {
      setExporting(false)
    }
  }

  const previewColumns: Column<VerificationRecord>[] = [
    { key: 'farmerName', title: '农户姓名', width: 80 },
    { key: 'plotNo', title: '地块编号', width: 100 },
    {
      key: 'declaredArea', title: '申报面积', width: 90,
      render: (_v, r) => <span className="font-mono text-xs">{r.declaredArea.toFixed(2)}</span>,
    },
    {
      key: 'verifiedArea', title: '核验面积', width: 90,
      render: (_v, r) => <span className="font-mono text-xs font-medium">{r.verifiedArea.toFixed(2)}</span>,
    },
    {
      key: 'issues', title: '问题', width: 140,
      render: (_v, r) => (
        <div className="flex flex-wrap gap-1">
          {r.issues?.length > 0 ? r.issues.map((iss) => <IssueBadge key={iss.id} type={iss.type} />) : <span className="text-xs text-gray-300">-</span>}
        </div>
      ),
    },
    {
      key: 'status', title: '状态', width: 80,
      render: (_v, r) => <StatusBadge status={r.status} />,
    },
  ]

  function formatTime(timeStr: string) {
    return new Date(timeStr).toLocaleString('zh-CN', {
      month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
    })
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h2 className="text-xl font-serif font-semibold text-primary">导出管理</h2>
        <p className="text-sm text-gray-500 mt-1">生成核验报告和补贴发放清单</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {exportOptions.map((opt) => {
          const Icon = opt.icon
          return (
            <button
              key={opt.key}
              onClick={() => { setSelectedType(opt.key); setPreviewPage(1) }}
              className={cn(
                'card p-5 text-left transition-all duration-200 hover:shadow-md',
                selectedType === opt.key ? 'ring-2 ring-primary border-primary' : 'hover:border-primary/30'
              )}
            >
              <div className={cn(
                'w-10 h-10 rounded-lg flex items-center justify-center mb-3',
                selectedType === opt.key ? 'bg-primary text-white' : 'bg-gray-100 text-gray-500'
              )}>
                <Icon className="w-5 h-5" />
              </div>
              <h4 className="text-sm font-medium text-gray-800">{opt.title}</h4>
              <p className="text-xs text-gray-400 mt-1">{opt.description}</p>
            </button>
          )
        })}
      </div>

      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-medium text-gray-700">数据预览</h3>
            <p className="text-xs text-gray-400 mt-0.5">
              {selectedType === 'subsidy' ? '仅展示已通过记录' : '展示全部记录'} · 共 {previewTotal} 条
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 text-xs text-gray-500">
              <FileDown className="w-3.5 h-3.5" />
              Excel 格式
            </span>
            <button
              onClick={handleExport}
              disabled={exporting}
              className="btn-primary inline-flex items-center gap-2 text-sm"
            >
              {exporting ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> 导出中...</>
              ) : (
                <><Download className="w-4 h-4" /> 导出</>
              )}
            </button>
          </div>
        </div>

        <DataTable<VerificationRecord>
          columns={previewColumns}
          data={previewData}
          total={previewTotal}
          page={previewPage}
          pageSize={5}
          onPageChange={setPreviewPage}
          rowKey="id"
          loading={loading}
        />
      </div>

      {history.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-gray-700 mb-3">历史导出记录</h3>
          <div className="space-y-2">
            {history.map((record, idx) => (
              <div key={idx} className="card px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <FileSpreadsheet className="w-4 h-4 text-success" />
                  <div>
                    <p className="text-sm text-gray-700">{record.filename}</p>
                    <p className="text-xs text-gray-400">
                      {formatTime(record.createdAt)} · {exportOptions.find((o) => o.key === record.type)?.title}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-success" />
                  <button
                    onClick={() => downloadFile(record.filename)}
                    className="text-xs text-primary hover:underline"
                  >
                    重新下载
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
