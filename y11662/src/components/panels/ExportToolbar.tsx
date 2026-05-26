import { Download, Image, FileSpreadsheet, FileText, Loader2 } from 'lucide-react'
import { useBondStore } from '../../stores/bondStore'
import { useScenarioStore } from '../../stores/scenarioStore'
import { exportToCSV, exportReport, downloadFile, exportPNG } from '../../utils/exportUtils'
import { useState } from 'react'

export function ExportToolbar() {
  const cashFlows = useBondStore((state) => state.cashFlows)
  const holdings = useBondStore((state) => state.holdings)
  const scenarios = useScenarioStore((state) => state.scenarios)
  const activeScenarioId = useScenarioStore((state) => state.activeScenarioId)
  const correctionHistory = useBondStore((state) => state.correctionHistory)

  const [isExporting, setIsExporting] = useState(false)
  const [exportStatus, setExportStatus] = useState<string | null>(null)

  const handleExportPNG = () => {
    setIsExporting(true)
    setExportStatus('正在生成PNG截图...')

    setTimeout(() => {
      try {
        const canvas = document.querySelector('canvas')
        if (canvas) {
          exportPNG(canvas, 'bond-waterfall.png')
          setExportStatus('PNG导出成功')
        } else {
          setExportStatus('未找到3D画布')
        }
      } catch (error) {
        setExportStatus(`导出失败: ${error instanceof Error ? error.message : '未知错误'}`)
      }

      setIsExporting(false)
      setTimeout(() => setExportStatus(null), 3000)
    }, 500)
  }

  const handleExportCSV = () => {
    if (!activeScenarioId) {
      setExportStatus('请先选择利率情景')
      setTimeout(() => setExportStatus(null), 3000)
      return
    }

    setIsExporting(true)
    setExportStatus('正在导出CSV...')

    try {
      const csv = exportToCSV(cashFlows, holdings, activeScenarioId)
      downloadFile(csv, `bond-cashflows-${new Date().toISOString().split('T')[0]}.csv`, 'text/csv')
      setExportStatus('CSV导出成功')
    } catch (error) {
      setExportStatus(`导出失败: ${error instanceof Error ? error.message : '未知错误'}`)
    }

    setIsExporting(false)
    setTimeout(() => setExportStatus(null), 3000)
  }

  const handleExportReport = () => {
    if (!activeScenarioId) {
      setExportStatus('请先选择利率情景')
      setTimeout(() => setExportStatus(null), 3000)
      return
    }

    setIsExporting(true)
    setExportStatus('正在生成分析报告...')

    try {
      const report = exportReport(
        cashFlows,
        holdings,
        scenarios,
        activeScenarioId,
        correctionHistory
      )
      downloadFile(report, `bond-analysis-report-${new Date().toISOString().split('T')[0]}.txt`, 'text/plain')
      setExportStatus('报告导出成功')
    } catch (error) {
      setExportStatus(`导出失败: ${error instanceof Error ? error.message : '未知错误'}`)
    }

    setIsExporting(false)
    setTimeout(() => setExportStatus(null), 3000)
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={handleExportPNG}
        disabled={isExporting}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs
          bg-[#21262d] text-[#8b949e] hover:bg-[#30363d] hover:text-[#c9d1d9]
          disabled:opacity-50 disabled:cursor-not-allowed
          transition-colors border border-[#30363d]"
      >
        {isExporting && exportStatus?.includes('PNG') ? (
          <Loader2 size={12} className="animate-spin" />
        ) : (
          <Image size={12} />
        )}
        PNG截图
      </button>

      <button
        onClick={handleExportCSV}
        disabled={isExporting}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs
          bg-[#21262d] text-[#8b949e] hover:bg-[#30363d] hover:text-[#c9d1d9]
          disabled:opacity-50 disabled:cursor-not-allowed
          transition-colors border border-[#30363d]"
      >
        {isExporting && exportStatus?.includes('CSV') ? (
          <Loader2 size={12} className="animate-spin" />
        ) : (
          <FileSpreadsheet size={12} />
        )}
        导出CSV
      </button>

      <button
        onClick={handleExportReport}
        disabled={isExporting}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs
          bg-[#238636] text-white hover:bg-[#2ea043]
          disabled:opacity-50 disabled:cursor-not-allowed
          transition-colors"
      >
        {isExporting && exportStatus?.includes('报告') ? (
          <Loader2 size={12} className="animate-spin" />
        ) : (
          <FileText size={12} />
        )}
        生成报告
      </button>

      {exportStatus && (
        <span className={`text-xs px-2 py-1 rounded ${
          exportStatus.includes('成功')
            ? 'bg-[#238636]/20 text-[#2ea043]'
            : exportStatus.includes('失败') || exportStatus.includes('请先')
            ? 'bg-[#f85149]/20 text-[#f85149]'
            : 'bg-[#58a6ff]/20 text-[#58a6ff]'
        }`}>
          {exportStatus}
        </span>
      )}
    </div>
  )
}