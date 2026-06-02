import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  FileDown,
  FileText,
  FileSpreadsheet,
  Check,
  AlertCircle,
  ArrowLeft,
  Zap,
  Download,
} from 'lucide-react'
import { useAppStore } from '@/store'
import type { ReportConfig } from '@/types'
import { generatePDFReport, generateExcelReport, downloadBlob } from '@/utils/reportGenerator'

export default function ExportPage() {
  const navigate = useNavigate()
  const { collisions, speedRecords, massTable, importedFiles, videoNotes } = useAppStore()

  const speedSource = importedFiles.find((f) => f.type === 'speed')?.name || '未导入'
  const massSource = importedFiles.find((f) => f.type === 'mass')?.name || '未导入'

  const [config, setConfig] = useState<ReportConfig>({
    includeRawData: true,
    includeCalculationSteps: true,
    includeAnomalies: true,
    includeCharts: true,
    format: 'pdf',
  })

  const [isExporting, setIsExporting] = useState(false)
  const [exportSuccess, setExportSuccess] = useState(false)

  const handleExport = async () => {
    if (collisions.length === 0) {
      return
    }

    setIsExporting(true)
    setExportSuccess(false)

    try {
      await new Promise((resolve) => setTimeout(resolve, 500))

      let blob: Blob
      let filename: string

      if (config.format === 'pdf') {
        blob = generatePDFReport(collisions, config, speedSource, massSource, videoNotes)
        filename = `动量复盘报告_${new Date().toISOString().slice(0, 10)}.pdf`
      } else {
        blob = generateExcelReport(collisions, config, speedRecords, massTable, videoNotes)
        filename = `动量复盘报告_${new Date().toISOString().slice(0, 10)}.xlsx`
      }

      downloadBlob(blob, filename)
      setExportSuccess(true)
    } catch (error) {
      console.error('导出失败:', error)
    } finally {
      setIsExporting(false)
    }
  }

  if (collisions.length === 0) {
    return (
      <div className="text-center py-20 animate-fade-in-up">
        <div className="w-20 h-20 mx-auto mb-6 bg-slate-100 rounded-full flex items-center justify-center">
          <Zap className="w-10 h-10 text-slate-400" />
        </div>
        <h2 className="text-xl font-semibold text-slate-700 mb-2">暂无数据可导出</h2>
        <p className="text-slate-500 mb-6">请先导入数据并进行分析</p>
        <button
          onClick={() => navigate('/')}
          className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors inline-flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          前往数据导入
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-8 animate-fade-in-up max-w-3xl mx-auto">
      <div>
        <h2 className="text-2xl font-bold text-slate-800">报告导出</h2>
        <p className="mt-2 text-slate-600">
          配置导出选项，生成包含完整分析结果的报告文件
        </p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
          <h3 className="font-semibold text-slate-800 flex items-center gap-2">
            <FileText className="w-5 h-5" />
            导出格式
          </h3>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={() => setConfig({ ...config, format: 'pdf' })}
              className={`p-4 rounded-xl border-2 transition-all ${
                config.format === 'pdf'
                  ? 'border-primary-500 bg-primary-50'
                  : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                    config.format === 'pdf' ? 'bg-primary-500' : 'bg-slate-200'
                  }`}
                >
                  <FileText
                    className={`w-6 h-6 ${
                      config.format === 'pdf' ? 'text-white' : 'text-slate-500'
                    }`}
                  />
                </div>
                <div className="text-left">
                  <div
                    className={`font-medium ${
                      config.format === 'pdf' ? 'text-primary-700' : 'text-slate-800'
                    }`}
                  >
                    PDF 文档
                  </div>
                  <div className="text-sm text-slate-500">适合打印和分享</div>
                </div>
              </div>
            </button>
            <button
              onClick={() => setConfig({ ...config, format: 'excel' })}
              className={`p-4 rounded-xl border-2 transition-all ${
                config.format === 'excel'
                  ? 'border-primary-500 bg-primary-50'
                  : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                    config.format === 'excel' ? 'bg-primary-500' : 'bg-slate-200'
                  }`}
                >
                  <FileSpreadsheet
                    className={`w-6 h-6 ${
                      config.format === 'excel' ? 'text-white' : 'text-slate-500'
                    }`}
                  />
                </div>
                <div className="text-left">
                  <div
                    className={`font-medium ${
                      config.format === 'excel' ? 'text-primary-700' : 'text-slate-800'
                    }`}
                  >
                    Excel 表格
                  </div>
                  <div className="text-sm text-slate-500">适合进一步数据分析</div>
                </div>
              </div>
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
          <h3 className="font-semibold text-slate-800 flex items-center gap-2">
            <FileDown className="w-5 h-5" />
            报告内容
          </h3>
        </div>
        <div className="p-6 space-y-4">
          <label className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50 cursor-pointer transition-colors">
            <input
              type="checkbox"
              checked={config.includeRawData}
              onChange={(e) => setConfig({ ...config, includeRawData: e.target.checked })}
              className="w-5 h-5 text-primary-600 rounded focus:ring-primary-500"
            />
            <div>
              <div className="font-medium text-slate-800">包含原始数据</div>
              <div className="text-sm text-slate-500">在报告中包含速度记录和质量表的原始数据</div>
            </div>
          </label>

          <label className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50 cursor-pointer transition-colors">
            <input
              type="checkbox"
              checked={config.includeCalculationSteps}
              onChange={(e) =>
                setConfig({ ...config, includeCalculationSteps: e.target.checked })
              }
              className="w-5 h-5 text-primary-600 rounded focus:ring-primary-500"
            />
            <div>
              <div className="font-medium text-slate-800">包含计算步骤</div>
              <div className="text-sm text-slate-500">在报告中包含详细的动量和能量计算过程</div>
            </div>
          </label>

          <label className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50 cursor-pointer transition-colors">
            <input
              type="checkbox"
              checked={config.includeAnomalies}
              onChange={(e) => setConfig({ ...config, includeAnomalies: e.target.checked })}
              className="w-5 h-5 text-primary-600 rounded focus:ring-primary-500"
            />
            <div>
              <div className="font-medium text-slate-800">包含异常说明</div>
              <div className="text-sm text-slate-500">
                在报告中包含质量缺失、方向反号、能量损失等异常的详细说明
              </div>
            </div>
          </label>

          <label className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50 cursor-pointer transition-colors">
            <input
              type="checkbox"
              checked={config.includeCharts}
              onChange={(e) => setConfig({ ...config, includeCharts: e.target.checked })}
              className="w-5 h-5 text-primary-600 rounded focus:ring-primary-500"
            />
            <div>
              <div className="font-medium text-slate-800">包含图表</div>
              <div className="text-sm text-slate-500">在报告中包含动量和能量的可视化图表</div>
            </div>
          </label>
        </div>
      </div>

      <div className="bg-blue-50 rounded-xl p-6 border border-blue-200">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="font-medium text-blue-800">报告预览</h4>
            <div className="mt-2 text-sm text-blue-700 space-y-1">
              <p>• 碰撞事件数量: {collisions.length} 次</p>
              <p>• 异常数量: {collisions.reduce((s, c) => s + c.anomalies.length, 0)} 个</p>
              <p>• 数据来源: {speedSource} + {massSource}</p>
              <p>• 导出格式: {config.format.toUpperCase()}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-center gap-4">
        <button
          onClick={() => navigate('/analysis')}
          className="px-6 py-3 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition-colors inline-flex items-center gap-2"
        >
          <ArrowLeft className="w-5 h-5" />
          返回分析
        </button>
        <button
          onClick={handleExport}
          disabled={isExporting}
          className={`px-8 py-3 rounded-lg font-medium transition-all duration-200 inline-flex items-center gap-2 ${
            isExporting
              ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
              : 'bg-primary-600 text-white hover:bg-primary-700 shadow-lg shadow-primary-500/30'
          }`}
        >
          {isExporting ? (
            <>
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              导出中...
            </>
          ) : exportSuccess ? (
            <>
              <Check className="w-5 h-5" />
              导出成功
            </>
          ) : (
            <>
              <Download className="w-5 h-5" />
              导出报告
            </>
          )}
        </button>
      </div>

      <div className="bg-amber-50 rounded-xl p-6 border border-amber-200">
        <h4 className="font-medium text-amber-800 mb-3">报告包含的信息</h4>
        <div className="text-sm text-amber-700 space-y-2">
          <p>
            <strong>1. 概览信息</strong>: 碰撞次数统计、异常汇总、数据来源说明
          </p>
          <p>
            <strong>2. 计算结果</strong>: 每次碰撞的动量对比、能量损失、动量守恒验证结果
          </p>
          {config.includeAnomalies && (
            <p>
              <strong>3. 异常说明</strong>: 质量缺失、方向反号、能量损失过大的详细解释和涉及小球
            </p>
          )}
          {config.includeCalculationSteps && (
            <p>
              <strong>4. 计算追溯</strong>: 从原始数据到最终结果的完整计算链路，包含公式和中间结果
            </p>
          )}
          {config.includeRawData && (
            <p>
              <strong>5. 原始数据</strong>: 速度记录和质量表的原始数据，便于后续复核
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
