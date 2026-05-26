import { useEffect } from 'react'
import { ChevronLeft, ChevronRight, Play, Database } from 'lucide-react'
import { WaterfallScene } from '../components/three/WaterfallScene'
import { DataImportPanel } from '../components/panels/DataImportPanel'
import { ScenarioSwitcher } from '../components/panels/ScenarioSwitcher'
import { DetailPanel } from '../components/panels/DetailPanel'
import { AnomalyBar } from '../components/panels/AnomalyBar'
import { ExportToolbar } from '../components/panels/ExportToolbar'
import { useBondStore } from '../stores/bondStore'
import { useScenarioStore } from '../stores/scenarioStore'
import { useUIStore } from '../stores/uiStore'

export default function MainPage() {
  const leftPanelCollapsed = useUIStore((state) => state.leftPanelCollapsed)
  const rightPanelCollapsed = useUIStore((state) => state.rightPanelCollapsed)
  const toggleLeftPanel = useUIStore((state) => state.toggleLeftPanel)
  const toggleRightPanel = useUIStore((state) => state.toggleRightPanel)

  const loadSampleData = useBondStore((state) => state.loadSampleData)
  const loadSampleScenarios = useScenarioStore((state) => state.loadSampleScenarios)
  const isLoaded = useBondStore((state) => state.isLoaded)

  useEffect(() => {
    loadSampleScenarios()
  }, [loadSampleScenarios])

  const handleLoadSample = () => {
    loadSampleData()
  }

  return (
    <div className="h-screen flex flex-col bg-[#0d1117] text-[#c9d1d9] overflow-hidden">
      <header className="h-12 flex items-center px-4 border-b border-[#21262d] bg-[#0d1117]/95">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded bg-gradient-to-br from-[#00d4aa] to-[#0366d6] flex items-center justify-center">
            <Database size={14} className="text-white" />
          </div>
          <h1 className="text-sm font-semibold text-white">债券现金流瀑布图</h1>
        </div>
        <div className="ml-6 text-xs text-[#6e7681]">
          3D Interactive Bond Cash Flow Waterfall
        </div>
        <div className="ml-auto flex items-center gap-3">
          <ExportToolbar />
        </div>
      </header>

      <ScenarioSwitcher />

      <div className="flex-1 flex relative overflow-hidden">
        <div
          className={`
            border-r border-[#21262d] bg-[#0d1117]/95 transition-all duration-300 ease-out
            ${leftPanelCollapsed ? 'w-0 overflow-hidden' : 'w-72'}
          `}
        >
          <DataImportPanel />
        </div>

        <button
          onClick={toggleLeftPanel}
          className="absolute left-0 top-1/2 -translate-y-1/2 z-10
            w-5 h-12 bg-[#161b22] border border-[#21262d] border-l-0 rounded-r
            flex items-center justify-center text-[#6e7681] hover:text-[#c9d1d9]
            hover:bg-[#21262d] transition-colors"
          style={{ left: leftPanelCollapsed ? 0 : '18rem' }}
        >
          {leftPanelCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>

        <div className="flex-1 relative min-w-0">
          <WaterfallScene />

          {!isLoaded && (
            <div className="absolute inset-0 flex items-center justify-center bg-[#0d1117]/80 backdrop-blur-sm">
              <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[#161b22] border border-[#30363d]
                  flex items-center justify-center">
                  <Play size={24} className="text-[#00d4aa] ml-1" />
                </div>
                <p className="text-sm text-[#8b949e] mb-4">
                  点击左侧面板上传数据文件，或加载示例数据开始分析
                </p>
                <button
                  onClick={handleLoadSample}
                  className="px-4 py-2 rounded bg-[#238636] text-white text-sm
                    hover:bg-[#2ea043] transition-colors flex items-center gap-2 mx-auto"
                >
                  <Database size={14} />
                  加载示例数据
                </button>
              </div>
            </div>
          )}
        </div>

        <button
          onClick={toggleRightPanel}
          className="absolute right-0 top-1/2 -translate-y-1/2 z-10
            w-5 h-12 bg-[#161b22] border border-[#21262d] border-r-0 rounded-l
            flex items-center justify-center text-[#6e7681] hover:text-[#c9d1d9]
            hover:bg-[#21262d] transition-colors"
          style={{ right: rightPanelCollapsed ? 0 : '18rem' }}
        >
          {rightPanelCollapsed ? <ChevronLeft size={14} /> : <ChevronRight size={14} />}
        </button>

        <div
          className={`
            border-l border-[#21262d] bg-[#0d1117]/95 transition-all duration-300 ease-out
            ${rightPanelCollapsed ? 'w-0 overflow-hidden' : 'w-72'}
          `}
        >
          <DetailPanel />
        </div>

        <AnomalyBar />
      </div>
    </div>
  )
}