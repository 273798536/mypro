import { useState } from 'react'
import { Layers, GitBranch, FileText, X, Share2 } from 'lucide-react'
import { GraphScene } from '../components/Scene3D/GraphScene'
import { FilterToolbar } from '../components/Filters/FilterToolbar'
import { DetailPanel } from '../components/Panels/DetailPanel'
import { AlertSidebar, AlertBanner } from '../components/Alerts/AlertSidebar'
import { PathView } from '../components/PathExpansion/PathView'
import { SourceTrace } from '../components/Traceability/SourceTrace'
import { ReportExport } from '../components/Export/ReportExport'
import { useGraphStore } from '../stores/graphStore'

type ViewMode = 'sandbox' | 'path' | 'trace'

export default function Home() {
  const [viewMode, setViewMode] = useState<ViewMode>('sandbox')
  const [pathStartNode, setPathStartNode] = useState<string | null>(null)
  const [showAlerts, setShowAlerts] = useState(true)

  const { selectedNodeId, expandPath, clearPath } = useGraphStore()

  const handleExpandPath = (nodeId: string) => {
    setPathStartNode(nodeId)
    setViewMode('path')
    expandPath(nodeId)
  }

  const handleBackToSandbox = () => {
    setViewMode('sandbox')
    setPathStartNode(null)
    clearPath()
  }

  const handleNodeClickInPath = (nodeId: string) => {
    setPathStartNode(nodeId)
    expandPath(nodeId)
  }

  return (
    <div className="h-screen w-screen bg-[#0a0a1a] flex flex-col overflow-hidden">
      <AlertBanner />

      <header className="h-14 bg-[#0f0f1f] border-b border-gray-800 flex items-center justify-between px-4 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
            <Share2 size={16} className="text-white" />
          </div>
          <div>
            <h1 className="text-white font-bold text-lg">融资担保关系沙盘</h1>
            <p className="text-[10px] text-gray-500 -mt-0.5">真实材料 · 关系追溯 · 风险可视化</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex bg-[#1a1a2e] rounded-lg p-0.5">
            <button
              onClick={() => setViewMode('sandbox')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm transition-colors ${
                viewMode === 'sandbox'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <Layers size={14} />
              关系网络
            </button>
            {selectedNodeId && (
              <button
                onClick={() => handleExpandPath(selectedNodeId)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm transition-colors ${
                  viewMode === 'path'
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <GitBranch size={14} />
                路径展开
              </button>
            )}
            <button
              onClick={() => setViewMode('trace')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm transition-colors ${
                viewMode === 'trace'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <FileText size={14} />
              数据溯源
            </button>
          </div>

          <button
            onClick={() => setShowAlerts(!showAlerts)}
            className={`px-3 py-1.5 rounded-lg text-sm transition-colors flex items-center gap-1 ${
              showAlerts ? 'bg-red-500/20 text-red-400' : 'bg-[#1a1a2e] text-gray-400'
            }`}
          >
            <X size={14} />
            风险预警
          </button>

          <ReportExport />
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {viewMode !== 'trace' && <FilterToolbar />}

        <main className="flex-1 relative">
          {viewMode === 'sandbox' && <GraphScene />}
          {viewMode === 'path' && pathStartNode && (
            <div className="h-full flex flex-col">
              <div className="absolute top-4 left-4 z-10 bg-[#0f0f1f]/90 backdrop-blur px-3 py-2 rounded-lg border border-gray-700">
                <button
                  onClick={handleBackToSandbox}
                  className="text-sm text-blue-400 hover:text-blue-300 flex items-center gap-1"
                >
                  ← 返回关系网络
                </button>
              </div>
              <PathView startNodeId={pathStartNode} onNodeClick={handleNodeClickInPath} />
            </div>
          )}
          {viewMode === 'trace' && (
            <div className="h-full overflow-y-auto">
              <SourceTrace />
            </div>
          )}
        </main>

        {viewMode !== 'trace' && <DetailPanel />}
        {showAlerts && viewMode !== 'trace' && <AlertSidebar />}
      </div>

      <footer className="h-8 bg-[#0f0f1f] border-t border-gray-800 flex items-center justify-between px-4 text-xs text-gray-500 flex-shrink-0">
        <div>
          数据来源：工商登记 · 股权穿透 · 合同库 · 核心系统 · 风控模型 · 尽调团队
        </div>
        <div className="flex items-center gap-4">
          <span>
            企业: {useGraphStore.getState().nodes.filter((n) => n.type === 'enterprise').length}
          </span>
          <span>
            实控人: {useGraphStore.getState().nodes.filter((n) => n.type === 'person').length}
          </span>
          <span>担保合同: {useGraphStore.getState().edges.length}</span>
        </div>
      </footer>
    </div>
  )
}
