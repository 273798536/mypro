import { useState } from 'react'
import {
  Download,
  FileJson,
  FileSpreadsheet,
  Clock,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ArrowRightLeft,
  FileText,
} from 'lucide-react'
import { useAppStore } from '@/store/appStore'
import { cn } from '@/lib/utils'

export default function ExportPage() {
  const computeResult = useAppStore((s) => s.computeResult)
  const currentBatchId = useAppStore((s) => s.currentBatchId)
  const buoyData = useAppStore((s) => s.buoyData)
  const corrections = useAppStore((s) => s.corrections)

  const [format, setFormat] = useState<'csv' | 'json'>('csv')
  const [showCompare, setShowCompare] = useState(false)

  const previousBatch = {
    id: 'batch_1718456789000',
    createdAt: '2026-06-15T10:00:00Z',
    hs: 1.5,
    tp: 8.8,
    riskLevel: 'medium',
    waterQualityAlert: 'normal',
  }

  const generateFilename = () => {
    const dateStr = new Date().toISOString().slice(0, 10)
    const batchShort = currentBatchId?.slice(-8) || 'unknown'
    return `ocean_wave_spectrum_${dateStr}_${batchShort}.${format}`
  }

  const getRiskLabel = (level?: string) => {
    switch (level) {
      case 'high': return '高风险'
      case 'medium': return '中风险'
      case 'low': return '低风险'
      default: return '待评估'
    }
  }

  const getAlertLabel = (level?: string) => {
    switch (level) {
      case 'warning': return '水质预警'
      case 'watch': return '水质关注'
      case 'normal': return '水质正常'
      default: return '待评估'
    }
  }

  const handleDownload = () => {
    if (!computeResult) return

    let content = ''
    let mimeType = ''

    if (format === 'json') {
      const exportData = {
        batchId: currentBatchId,
        timestamp: computeResult.timestamp,
        parameters: {
          hs: computeResult.parameters.hs,
          tp: computeResult.parameters.tp,
          spectrumType: computeResult.parameters.spectrumType,
          windWaveRatio: computeResult.parameters.windWaveRatio,
          swellRatio: computeResult.parameters.swellRatio,
          dominantDirection: computeResult.parameters.dominantDirection,
        },
        riskLevel: computeResult.riskLevel,
        waterQualityAlert: computeResult.waterQualityAlert,
        processingRecordId: computeResult.processingRecordId,
        corrections: corrections.map(c => ({
          type: c.type,
          reason: c.reason,
          correctedBy: c.correctedBy,
          createdAt: c.createdAt,
        })),
      }
      content = JSON.stringify(exportData, null, 2)
      mimeType = 'application/json'
    } else {
      const rows: string[] = []
      rows.push('参数,数值,单位,说明')
      rows.push(`有效波高 Hs,${computeResult.parameters.hs.value},${computeResult.parameters.hs.unit},"${computeResult.parameters.hs.explanation}"`)
      rows.push(`谱峰周期 Tp,${computeResult.parameters.tp.value},${computeResult.parameters.tp.unit},"${computeResult.parameters.tp.explanation}"`)
      rows.push(`谱型分类,${computeResult.parameters.spectrumType.value},,"${computeResult.parameters.spectrumType.explanation}"`)
      rows.push(`风浪占比,${(Number(computeResult.parameters.windWaveRatio.value) * 100).toFixed(1)}%,,"${computeResult.parameters.windWaveRatio.explanation}"`)
      rows.push(`涌浪占比,${(Number(computeResult.parameters.swellRatio.value) * 100).toFixed(1)}%,,"${computeResult.parameters.swellRatio.explanation}"`)
      rows.push(`主波向,${computeResult.parameters.dominantDirection.value},${computeResult.parameters.dominantDirection.unit},"${computeResult.parameters.dominantDirection.explanation}"`)
      rows.push('')
      rows.push(`风险等级,${getRiskLabel(computeResult.riskLevel)},,`)
      rows.push(`水质预警,${getAlertLabel(computeResult.waterQualityAlert)},,`)
      rows.push(`处理记录ID,${computeResult.processingRecordId},,`)
      rows.push(`批次号,${currentBatchId},,`)
      rows.push(`计算时间,${computeResult.timestamp},,`)
      content = rows.join('\n')
      mimeType = 'text/csv; charset=utf-8'
    }

    const blob = new Blob([format === 'csv' ? '\uFEFF' + content : content], { type: mimeType })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = generateFilename()
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-800">下载导出</h2>
          <p className="text-sm text-slate-500 mt-1">
            文件名带时间戳与批次标识，可区分本次运行与上次运行
          </p>
        </div>
      </div>

      <div className="grid grid-cols-5 gap-6">
        <div className="col-span-3 space-y-5">
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h3 className="text-sm font-semibold text-slate-700 mb-4">导出格式</h3>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setFormat('csv')}
                className={cn(
                  'p-4 rounded-lg border-2 flex items-center gap-3 transition-all text-left',
                  format === 'csv'
                    ? 'border-tide-500 bg-tide-50'
                    : 'border-slate-200 hover:border-slate-300'
                )}
              >
                <div className={cn(
                  'w-10 h-10 rounded-lg flex items-center justify-center',
                  format === 'csv' ? 'bg-tide-500 text-white' : 'bg-slate-100 text-slate-400'
                )}>
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <div>
                  <div className={cn('text-sm font-medium', format === 'csv' ? 'text-tide-700' : 'text-slate-700')}>
                    CSV 表格
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">适合船队查看，Excel 可直接打开</div>
                </div>
              </button>
              <button
                onClick={() => setFormat('json')}
                className={cn(
                  'p-4 rounded-lg border-2 flex items-center gap-3 transition-all text-left',
                  format === 'json'
                    ? 'border-deep-500 bg-deep-50'
                    : 'border-slate-200 hover:border-slate-300'
                )}
              >
                <div className={cn(
                  'w-10 h-10 rounded-lg flex items-center justify-center',
                  format === 'json' ? 'bg-deep-500 text-white' : 'bg-slate-100 text-slate-400'
                )}>
                  <FileJson className="w-5 h-5" />
                </div>
                <div>
                  <div className={cn('text-sm font-medium', format === 'json' ? 'text-deep-700' : 'text-slate-700')}>
                    JSON 数据
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">适合系统对接，结构化数据完整</div>
                </div>
              </button>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-slate-700">文件名预览</h3>
              <span className="text-xs text-slate-400">自动生成</span>
            </div>
            <div className="bg-slate-50 rounded-lg p-4 font-mono text-sm text-slate-700 break-all border border-slate-200">
              {generateFilename()}
            </div>
            <div className="mt-3 text-xs text-slate-500 space-y-1">
              <p>· 文件名包含日期和批次号后 8 位，可区分每次运行</p>
              <p>· CSV 文件带 UTF-8 BOM，Excel 打开不乱码</p>
              <p>· 内容简洁，不花哨，重点突出核心参数与解释</p>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                <ArrowRightLeft className="w-4 h-4 text-deep-500" />
                与上次运行对比
              </h3>
              <button
                onClick={() => setShowCompare(!showCompare)}
                className="text-xs text-deep-600 hover:text-deep-700 flex items-center gap-1"
              >
                {showCompare ? '收起' : '展开'}
                {showCompare ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>
            </div>

            {showCompare && (
              <div className="space-y-3">
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div className="text-slate-400">参数</div>
                  <div className="text-slate-500 text-center">上次</div>
                  <div className="text-tide-600 font-medium text-center">本次</div>
                </div>
                {computeResult ? (
                  <>
                    <div className="grid grid-cols-3 gap-2 py-2 border-t border-slate-100 text-sm">
                      <div className="text-slate-600">有效波高</div>
                      <div className="text-center text-slate-500">{previousBatch.hs} m</div>
                      <div className="text-center font-medium text-slate-800">
                        {computeResult.parameters.hs.value} m
                        <span className={cn(
                          'ml-1 text-xs',
                          Number(computeResult.parameters.hs.value) > previousBatch.hs
                            ? 'text-coral-500'
                            : 'text-tide-500'
                        )}>
                          {Number(computeResult.parameters.hs.value) > previousBatch.hs ? '↑' : '↓'}
                          {Math.abs(Number(computeResult.parameters.hs.value) - previousBatch.hs).toFixed(1)}
                        </span>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2 py-2 border-t border-slate-100 text-sm">
                      <div className="text-slate-600">谱峰周期</div>
                      <div className="text-center text-slate-500">{previousBatch.tp} s</div>
                      <div className="text-center font-medium text-slate-800">
                        {computeResult.parameters.tp.value} s
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2 py-2 border-t border-slate-100 text-sm">
                      <div className="text-slate-600">风险等级</div>
                      <div className="text-center">
                        <span className={`px-2 py-0.5 rounded text-xs ${
                          previousBatch.riskLevel === 'high' ? 'bg-coral-100 text-coral-700' :
                          previousBatch.riskLevel === 'medium' ? 'bg-amber-100 text-amber-700' :
                          'bg-tide-100 text-tide-700'
                        }`}>
                          {getRiskLabel(previousBatch.riskLevel)}
                        </span>
                      </div>
                      <div className="text-center">
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                          computeResult.riskLevel === 'high' ? 'bg-coral-100 text-coral-700' :
                          computeResult.riskLevel === 'medium' ? 'bg-amber-100 text-amber-700' :
                          'bg-tide-100 text-tide-700'
                        }`}>
                          {getRiskLabel(computeResult.riskLevel)}
                        </span>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2 py-2 border-t border-slate-100 text-sm">
                      <div className="text-slate-600">批次时间</div>
                      <div className="text-center text-slate-500 text-xs">{previousBatch.createdAt}</div>
                      <div className="text-center text-slate-700 text-xs">{computeResult.timestamp}</div>
                    </div>
                  </>
                ) : (
                  <div className="text-center text-slate-400 text-sm py-4">请先执行计算</div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="col-span-2 space-y-5">
          <div className="bg-gradient-to-br from-deep-600 to-deep-800 rounded-xl p-5 text-white">
            <h3 className="text-sm font-medium text-deep-200 mb-4">当前批次概览</h3>

            {computeResult ? (
              <div className="space-y-4">
                <div>
                  <div className="text-3xl font-bold">
                    {computeResult.parameters.hs.value}
                    <span className="text-lg font-normal text-deep-300 ml-1">m</span>
                  </div>
                  <div className="text-deep-300 text-xs mt-1">有效波高</div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-white/10 rounded-lg p-3">
                    <div className="text-lg font-semibold">{computeResult.parameters.tp.value}<span className="text-xs font-normal ml-1">s</span></div>
                    <div className="text-deep-300 text-xs">谱峰周期</div>
                  </div>
                  <div className="bg-white/10 rounded-lg p-3">
                    <div className="text-lg font-semibold">{(Number(computeResult.parameters.windWaveRatio.value) * 100).toFixed(0)}%</div>
                    <div className="text-deep-300 text-xs">风浪占比</div>
                  </div>
                </div>

                <div className="flex gap-2">
                  <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                    computeResult.riskLevel === 'high' ? 'bg-coral-500/20 text-coral-300 border border-coral-500/30' :
                    computeResult.riskLevel === 'medium' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' :
                    'bg-tide-500/20 text-tide-300 border border-tide-500/30'
                  }`}>
                    {getRiskLabel(computeResult.riskLevel)}
                  </span>
                  <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                    computeResult.waterQualityAlert === 'warning' ? 'bg-coral-500/20 text-coral-300 border border-coral-500/30' :
                    computeResult.waterQualityAlert === 'watch' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' :
                    'bg-tide-500/20 text-tide-300 border border-tide-500/30'
                  }`}>
                    {getAlertLabel(computeResult.waterQualityAlert)}
                  </span>
                </div>

                <div className="pt-4 border-t border-deep-500/30">
                  <button
                    onClick={handleDownload}
                    disabled={!computeResult}
                    className={cn(
                      'w-full py-3 rounded-lg font-medium flex items-center justify-center gap-2 transition-all',
                      computeResult
                        ? 'bg-tide-500 text-white hover:bg-tide-400 shadow-lg shadow-tide-500/30'
                        : 'bg-deep-500/50 text-deep-400 cursor-not-allowed'
                    )}
                  >
                    <Download className="w-4 h-4" />
                    下载 {format.toUpperCase()} 文件
                  </button>
                </div>

                <div className="text-xs text-deep-400 font-mono break-all">
                  {currentBatchId}
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-deep-400">
                <FileText className="w-10 h-10 mx-auto mb-3 opacity-50" />
                <p className="text-sm">请先在计算工作台执行计算</p>
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h3 className="text-sm font-semibold text-slate-700 mb-3">下载说明</h3>
            <ul className="space-y-2 text-xs text-slate-500">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-tide-500 shrink-0 mt-0.5" />
                <span>文件名包含日期与批次号，可区分不同运行</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-tide-500 shrink-0 mt-0.5" />
                <span>内容简洁不花哨，核心参数 + 自然语言解释</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-tide-500 shrink-0 mt-0.5" />
                <span>关联处理记录 ID，方便验收回查</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-tide-500 shrink-0 mt-0.5" />
                <span>风险分层与水质预警共用同一处理记录</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
