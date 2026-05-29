import { useCallback, useState } from 'react'
import { Download, ChevronDown, FileJson, FileSpreadsheet, Wind } from 'lucide-react'
import { useStore } from '@/store/useStore'
import { exportReport, downloadJsonReport, downloadCsvSummary, generateWindConclusion } from '@/utils/exportReport'
import Scene from '@/components/scene/Scene'
import FilterPanel from '@/components/panels/FilterPanel'
import DetailPanel from '@/components/panels/DetailPanel'
import IssuePanel from '@/components/panels/IssuePanel'

export default function Home() {
  const { voxels, buildings, pedestrianZones, issues, windConclusion } = useStore()
  const [exportMenuOpen, setExportMenuOpen] = useState(false)

  const handleExportJson = useCallback(() => {
    const report = exportReport(
      voxels,
      buildings,
      pedestrianZones,
      issues,
      windConclusion
    )
    downloadJsonReport(report)
    console.log('JSON报告导出完成:', report.summary.windDirectionConclusion)
    setExportMenuOpen(false)
  }, [voxels, buildings, pedestrianZones, issues, windConclusion])

  const handleExportCsv = useCallback(() => {
    const conclusion = generateWindConclusion(issues, voxels)
    downloadCsvSummary(voxels, issues, conclusion)
    console.log('CSV数据导出完成:', conclusion)
    setExportMenuOpen(false)
  }, [voxels, issues])

  return (
    <div className="w-screen h-screen flex flex-col overflow-hidden bg-[#0A0F14]">
      <header className="h-12 flex items-center justify-between px-4 border-b border-[#2D333B] shrink-0">
        <div className="flex items-center gap-3">
          <Wind size={20} className="text-blue-500" />
          <h1 className="text-sm font-medium text-[#E6EDF3]">城市风环境体素图</h1>
          <div className="h-4 w-px bg-[#2D333B]" />
          <div className="text-[11px] text-[#8B949E] max-w-xl truncate">
            {windConclusion}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <button
              onClick={() => setExportMenuOpen(!exportMenuOpen)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-blue-500 hover:bg-blue-600 text-white text-sm transition-colors"
            >
              <Download size={14} />
              导出
              <ChevronDown size={14} />
            </button>

            {exportMenuOpen && (
              <div className="absolute right-0 mt-1 w-48 rounded-md bg-[#1A1F26] border border-[#2D333B] shadow-lg z-50 overflow-hidden">
                <button
                  onClick={handleExportJson}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-[#E6EDF3] hover:bg-[#2D333B] transition-colors"
                >
                  <FileJson size={14} className="text-blue-400" />
                  导出 JSON 报告
                </button>
                <button
                  onClick={handleExportCsv}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-[#E6EDF3] hover:bg-[#2D333B] transition-colors"
                >
                  <FileSpreadsheet size={14} className="text-emerald-400" />
                  导出 CSV 数据
                </button>
              </div>
            )}
          </div>

          <div className="flex items-center gap-1.5 text-[11px] text-[#8B949E]">
            <span>体素:</span>
            <span className="font-mono text-[#E6EDF3]">{voxels.length}</span>
          </div>
        </div>
      </header>

      <div className="flex-1 flex min-h-0">
        <FilterPanel />

        <main className="flex-1 min-w-0 relative">
          <Scene />
        </main>

        <DetailPanel />
      </div>

      <IssuePanel />

      {exportMenuOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setExportMenuOpen(false)}
        />
      )}
    </div>
  )
}
