import { useRef, useState } from 'react'
import { useStore } from '@/store'
import {
  Upload,
  FileJson,
  Download,
  Plus,
  TrendingUp,
  AlertOctagon,
  XCircle,
  CheckCircle2,
  RotateCcw,
} from 'lucide-react'
import { ReportData } from '@/types'
import WithdrawModal from '@/components/WithdrawModal'

export default function OverviewPage() {
  const { data, importData, exportReport, loadMockData } = useStore()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [dragActive, setDragActive] = useState(false)
  const [showWithdrawModal, setShowWithdrawModal] = useState(false)
  const [importStatus, setImportStatus] = useState<string>('')

  const handleFileUpload = (file: File) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const json = JSON.parse(e.target?.result as string) as ReportData
        importData(json)
        setImportStatus(`✓ 已导入: ${file.name}`)
      } catch {
        setImportStatus('✗ 文件格式错误，请使用标准JSON')
      }
    }
    reader.readAsText(file)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragActive(false)
    if (e.dataTransfer.files?.[0]) {
      handleFileUpload(e.dataTransfer.files[0])
    }
  }

  const handleExport = () => {
    const json = exportReport()
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `heat-pump-report-${data?.meta.report_date || 'latest'}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="p-8 space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-2xl font-bold text-white">
            热泵循环报告 / OVERVIEW
          </h2>
          <p className="text-sm text-industrial-600 mt-1 font-mono">
            SESSION: 周一早会前复核 · {data?.meta.report_date || '--'}
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setShowWithdrawModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-warning-500 text-industrial-900 rounded text-sm font-mono font-medium hover:bg-warning-400 transition-colors"
          >
            <Plus className="w-4 h-4" />
            补撤回记录
          </button>
          <button
            onClick={handleExport}
            className="flex items-center gap-2 px-4 py-2 bg-industrial-700 text-white rounded text-sm font-mono border border-industrial-600 hover:bg-industrial-600 transition-colors"
          >
            <Download className="w-4 h-4" />
            导出报告
          </button>
          <button
            onClick={loadMockData}
            className="flex items-center gap-2 px-4 py-2 bg-industrial-800 text-industrial-600 rounded text-sm font-mono border border-industrial-700 hover:text-white transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            重置
          </button>
        </div>
      </header>

      {/* Import zone */}
      <div
        onDragOver={(e) => {
          e.preventDefault()
          setDragActive(true)
        }}
        onDragLeave={() => setDragActive(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all ${
          dragActive
            ? 'border-status-green bg-status-green/10'
            : 'border-industrial-700 bg-industrial-900/50 hover:border-industrial-600'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          className="hidden"
          onChange={(e) => {
            if (e.target.files?.[0]) handleFileUpload(e.target.files[0])
          }}
        />
        <Upload className="w-10 h-10 text-industrial-600 mx-auto mb-3" />
        <p className="font-mono text-sm text-white">
          拖拽旧材料 JSON 到此处，或
          <span className="text-warning-500 mx-1">点击选择文件</span>
        </p>
        <p className="font-mono text-xs text-industrial-600 mt-2">
          支持格式: heat-pump-report-*.json
        </p>
        {importStatus && (
          <p className={`font-mono text-xs mt-3 ${importStatus.startsWith('✓') ? 'text-status-green' : 'text-status-red'}`}>
            {importStatus}
          </p>
        )}
        <div className="flex items-center justify-center gap-2 mt-4">
          <FileJson className="w-4 h-4 text-industrial-600" />
          <span className="font-mono text-xs text-industrial-600">
            当前数据来源: built-in mock / demo_dataset.json
          </span>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-4 gap-5">
        <SummaryCard
          label="撤回记录"
          value={data?.meta.withdraw_count || 0}
          unit="条"
          icon={<RotateCcw className="w-5 h-5" />}
          accent="warning"
          trend="+1 本次新增"
        />
        <SummaryCard
          label="符号错误"
          value={data?.meta.symbol_error_count || 0}
          unit="处"
          icon={<AlertOctagon className="w-5 h-5" />}
          accent="red"
          trend="已单独拎出"
        />
        <SummaryCard
          label="坏数据标记"
          value={data?.meta.bad_data_count || 0}
          unit="行"
          icon={<XCircle className="w-5 h-5" />}
          accent="yellow"
          trend="已指向铭牌原始行"
        />
        <SummaryCard
          label="备注对齐率"
          value={Math.round((data?.meta.remark_match_rate || 0) * 100)}
          unit="%"
          icon={<CheckCircle2 className="w-5 h-5" />}
          accent="green"
          trend={`共 ${data?.nameplate.length || 0} 条记录`}
        />
      </div>

      {/* Change log preview */}
      <div className="bg-industrial-900/50 border border-grid-line rounded-lg">
        <div className="px-5 py-3 border-b border-grid-line flex items-center justify-between">
          <h3 className="font-display font-bold text-white text-sm">
            本次变化摘要 / CHANGE LOG
          </h3>
          <span className="text-xs font-mono text-industrial-600 cursor-blink">
            LIVE
          </span>
        </div>
        <div className="p-5 space-y-3">
          {data?.withdraw_records.slice(-2).reverse().map((r) => (
            <div
              key={r.id}
              className="flex gap-4 p-3 bg-industrial-800/50 rounded border-l-2 border-warning-500"
            >
              <div className="flex-shrink-0 w-24">
                <p className="font-mono text-xs text-warning-500">WITHDRAW</p>
                <p className="font-mono text-xs text-industrial-600 mt-1">
                  {r.timestamp}
                </p>
              </div>
              <div className="flex-1">
                <p className="text-sm text-white font-mono">{r.reason}</p>
                {r.supplementary_note && (
                  <p className="text-xs text-industrial-600 mt-1 font-mono">
                    后补说明: {r.supplementary_note}
                  </p>
                )}
                <p className="text-xs text-industrial-600 mt-1 font-mono">
                  操作人: {r.operator} · 设备: {r.related_device}
                </p>
              </div>
            </div>
          ))}
          {data?.symbol_errors.map((e) => (
            <div
              key={`sym-${e.id}`}
              className="flex gap-4 p-3 bg-industrial-800/50 rounded border-l-2 border-status-red"
            >
              <div className="flex-shrink-0 w-24">
                <p className="font-mono text-xs text-status-red">SYMBOL_ERR</p>
                <p className="font-mono text-xs text-industrial-600 mt-1">
                  铭牌行 #{e.nameplate_row}
                </p>
              </div>
              <div className="flex-1">
                <p className="text-sm text-white font-mono">
                  {e.param_name}: <span className="line-through text-status-red">{e.original_value}</span>{' '}
                  <span className="text-status-green">→ {e.corrected_value}</span>
                </p>
                <p className="text-xs text-industrial-600 mt-1 font-mono">
                  {e.direction}
                </p>
                <p className="text-xs text-warning-500 mt-1 font-mono">
                  影响: {e.impact_scope}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {showWithdrawModal && (
        <WithdrawModal onClose={() => setShowWithdrawModal(false)} />
      )}
    </div>
  )
}

function SummaryCard({
  label,
  value,
  unit,
  icon,
  accent,
  trend,
}: {
  label: string
  value: number
  unit: string
  icon: React.ReactNode
  accent: 'warning' | 'red' | 'yellow' | 'green'
  trend: string
}) {
  const accentMap = {
    warning: 'text-warning-500 border-warning-500/30',
    red: 'text-status-red border-status-red/30',
    yellow: 'text-status-yellow border-status-yellow/30',
    green: 'text-status-green border-status-green/30',
  }
  return (
    <div
      className={`bg-industrial-900/50 border rounded-lg p-5 card-hover ${accentMap[accent]}`}
    >
      <div className="flex items-start justify-between mb-4">
        <span className={`${accentMap[accent].split(' ')[0]}`}>{icon}</span>
        <span className="font-mono text-xs text-industrial-600">{trend}</span>
      </div>
      <p className="font-display text-xs text-industrial-600 mb-1 uppercase tracking-wider">
        {label}
      </p>
      <p className="font-display font-bold">
        <span className={`text-4xl ${accentMap[accent].split(' ')[0]}`}>{value}</span>
        <span className="text-lg text-industrial-600 ml-1">{unit}</span>
      </p>
    </div>
  )
}
