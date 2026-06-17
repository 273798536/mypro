import { useRef, useState, useMemo } from 'react'
import { useStore, ImportFeedback } from '@/store'
import {
  Upload,
  FileJson,
  Download,
  Plus,
  AlertOctagon,
  XCircle,
  CheckCircle2,
  RotateCcw,
  AlertTriangle,
  X,
  FileCheck,
  FileX,
} from 'lucide-react'
import WithdrawModal from '@/components/WithdrawModal'

export default function OverviewPage() {
  const {
    data,
    importData,
    importFeedback,
    clearImportFeedback,
    exportReport,
    resetAll,
  } = useStore()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [dragActive, setDragActive] = useState(false)
  const [showWithdrawModal, setShowWithdrawModal] = useState(false)
  const [parseError, setParseError] = useState<string | null>(null)

  const handleFileUpload = (file: File) => {
    setParseError(null)
    const reader = new FileReader()
    reader.onload = (e) => {
      let json: unknown
      try {
        json = JSON.parse(e.target?.result as string)
      } catch {
        setParseError('JSON 解析失败，请确认文件内容是合法 JSON')
        return
      }
      importData(json, file.name)
    }
    reader.onerror = () => {
      setParseError('文件读取失败')
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
    if (!json) return
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `heat-pump-report-${data?.meta.report_date || 'latest'}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const dataSourceLabel = useMemo(() => {
    if (!importFeedback || importFeedback.status === 'info') {
      return '未加载数据'
    }
    if (importFeedback.status === 'error') {
      return `上次导入失败: ${importFeedback.fileName}`
    }
    return importFeedback.fileName
  }, [importFeedback])

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
            disabled={!data}
            className="flex items-center gap-2 px-4 py-2 bg-warning-500 text-industrial-900 rounded text-sm font-mono font-medium hover:bg-warning-400 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Plus className="w-4 h-4" />
            补撤回记录
          </button>
          <button
            onClick={handleExport}
            disabled={!data}
            className="flex items-center gap-2 px-4 py-2 bg-industrial-700 text-white rounded text-sm font-mono border border-industrial-600 hover:bg-industrial-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Download className="w-4 h-4" />
            导出报告
          </button>
          <button
            onClick={resetAll}
            className="flex items-center gap-2 px-4 py-2 bg-industrial-800 text-industrial-600 rounded text-sm font-mono border border-industrial-700 hover:text-white transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            重置
          </button>
        </div>
      </header>

      {/* Import zone + feedback panel */}
      <div className="space-y-3">
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
            accept=".json,application/json"
            className="hidden"
            onChange={(e) => {
              if (e.target.files?.[0]) handleFileUpload(e.target.files[0])
              e.target.value = ''
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
          <div className="flex items-center justify-center gap-2 mt-4">
            <FileJson className="w-4 h-4 text-industrial-600" />
            <span className="font-mono text-xs text-industrial-600">
              当前数据来源: {dataSourceLabel}
            </span>
          </div>
        </div>

        {parseError && (
          <FeedbackBanner
            tone="error"
            title="导入失败"
            lines={[parseError]}
            onClose={setParseError}
          />
        )}

        {importFeedback?.status === 'success' && (
          <FeedbackBanner
            tone="success"
            title={`已导入: ${importFeedback.fileName}`}
            lines={[
              `铭牌 ${importFeedback.counts.nameplate} 条 · 符号错误 ${importFeedback.counts.symbol_errors} 处 · 撤回记录 ${importFeedback.counts.withdraw_records} 条 · 计算步骤 ${importFeedback.counts.calculation_steps} 步`,
              ...importFeedback.warnings.map(w => `⚠ ${w}`),
            ]}
            onClose={() => clearImportFeedback()}
          />
        )}

        {importFeedback?.status === 'error' && (
          <FeedbackBanner
            tone="error"
            title={`导入失败: ${importFeedback.fileName}`}
            lines={importFeedback.errors}
            onClose={() => clearImportFeedback()}
          />
        )}
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-4 gap-5">
        <SummaryCard
          label="撤回记录"
          value={data?.meta.withdraw_count || 0}
          unit="条"
          icon={<RotateCcw className="w-5 h-5" />}
          accent="warning"
          trend={data?.meta.withdraw_count ? '见下方时间线' : '无撤回'}
        />
        <SummaryCard
          label="符号错误"
          value={data?.meta.symbol_error_count || 0}
          unit="处"
          icon={<AlertOctagon className="w-5 h-5" />}
          accent="red"
          trend="已在异常审查区单独拎出"
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
          {!data || (data.withdraw_records.length === 0 && data.symbol_errors.length === 0) ? (
            <div className="py-8 text-center font-mono text-xs text-industrial-600">
              暂无变化记录 · 导入旧材料或补一条撤回记录后显示
            </div>
          ) : (
            <>
              {data.withdraw_records.slice().reverse().map((r) => (
                <div
                  key={r.id}
                  className="flex gap-4 p-3 bg-industrial-800/50 rounded border-l-2 border-warning-500"
                >
                  <div className="flex-shrink-0 w-28">
                    <p className="font-mono text-xs text-warning-500">WITHDRAW</p>
                    <p className="font-mono text-xs text-industrial-600 mt-1">
                      {r.timestamp}
                    </p>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white font-mono break-words">{r.reason}</p>
                    {r.supplementary_note && (
                      <p className="text-xs text-industrial-600 mt-1 font-mono break-words">
                        后补说明: {r.supplementary_note}
                      </p>
                    )}
                    <p className="text-xs text-industrial-600 mt-1 font-mono">
                      操作人: {r.operator} · 设备: {r.related_device}
                    </p>
                  </div>
                </div>
              ))}
              {data.symbol_errors.map((e) => (
                <div
                  key={`sym-${e.id}`}
                  className="flex gap-4 p-3 bg-industrial-800/50 rounded border-l-2 border-status-red"
                >
                  <div className="flex-shrink-0 w-28">
                    <p className="font-mono text-xs text-status-red">SYMBOL_ERR</p>
                    <p className="font-mono text-xs text-industrial-600 mt-1">
                      铭牌行 #{e.nameplate_row}
                    </p>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white font-mono break-words">
                      {e.param_name}:{' '}
                      <span className="line-through text-status-red">
                        {e.original_value}
                      </span>{' '}
                      <span className="text-status-green">→ {e.corrected_value}</span>
                    </p>
                    <p className="text-xs text-industrial-600 mt-1 font-mono break-words">
                      {e.direction}
                    </p>
                    <p className="text-xs text-warning-500 mt-1 font-mono break-words">
                      影响: {e.impact_scope}
                    </p>
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      </div>

      {showWithdrawModal && (
        <WithdrawModal onClose={() => setShowWithdrawModal(false)} />
      )}
    </div>
  )
}

function FeedbackBanner({
  tone,
  title,
  lines,
  onClose,
}: {
  tone: 'success' | 'error'
  title: string
  lines: string[]
  onClose: (v: any) => void
}) {
  const color =
    tone === 'success'
      ? {
          border: 'border-status-green/30',
          bg: 'bg-status-green/10',
          text: 'text-status-green',
          icon: FileCheck,
        }
      : {
          border: 'border-status-red/30',
          bg: 'bg-status-red/10',
          text: 'text-status-red',
          icon: FileX,
        }
  const Icon = color.icon
  return (
    <div
      className={`rounded-lg border ${color.border} ${color.bg} p-4 flex gap-4`}
    >
      <Icon className={`w-5 h-5 flex-shrink-0 mt-0.5 ${color.text}`} />
      <div className="flex-1 min-w-0">
        <p className={`font-mono text-sm font-semibold ${color.text} mb-1`}>
          {title}
        </p>
        <ul className="space-y-0.5">
          {lines.map((line, i) => (
            <li
              key={i}
              className={`font-mono text-xs ${
                line.startsWith('⚠') ? 'text-warning-500' : 'text-white/80'
              } break-words`}
            >
              {line.startsWith('⚠') ? (
                <>
                  <AlertTriangle className="w-3 h-3 inline mr-1 -mt-0.5" />
                  {line.slice(2)}
                </>
              ) : (
                line
              )}
            </li>
          ))}
        </ul>
      </div>
      <button
        onClick={() => onClose(tone === 'success' ? null : '')}
        className="text-industrial-600 hover:text-white transition-colors flex-shrink-0"
        aria-label="关闭提示"
      >
        <X className="w-4 h-4" />
      </button>
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
        <span className="font-mono text-xs text-industrial-600 text-right leading-snug">
          {trend}
        </span>
      </div>
      <p className="font-display text-xs text-industrial-600 mb-1 uppercase tracking-wider">
        {label}
      </p>
      <p className="font-display font-bold">
        <span className={`text-4xl ${accentMap[accent].split(' ')[0]}`}>
          {value}
        </span>
        <span className="text-lg text-industrial-600 ml-1">{unit}</span>
      </p>
    </div>
  )
}
