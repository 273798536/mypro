import { useState } from 'react'
import { Link } from 'react-router-dom'
import { usePumpStore } from '@/store/usePumpStore'
import ImportPanel from '@/components/ImportPanel'
import CalculationResult from '@/components/CalculationResult'
import ManualCorrection from '@/components/ManualCorrection'
import CorrectionTimeline from '@/components/CorrectionTimeline'
import CompareView from '@/components/CompareView'
import SchemeCompare from '@/components/SchemeCompare'
import { Droplets, Wrench, GitCompare, Clock, FileText, RotateCcw, ChevronDown, ChevronUp, Printer } from 'lucide-react'

type TabKey = 'import' | 'correction' | 'compare' | 'schemes'

export default function Home() {
  const { showCorrectionPanel, toggleCorrectionPanel, reset, currentSnapshot, importBatches, params } = usePumpStore()
  const [activeTab, setActiveTab] = useState<TabKey>('import')
  const [timelineCollapsed, setTimelineCollapsed] = useState(false)

  const tabs: { key: TabKey; label: string; icon: React.ReactNode }[] = [
    { key: 'import', label: '增量导入', icon: <Droplets size={16} /> },
    { key: 'correction', label: '手动修正', icon: <Wrench size={16} /> },
    { key: 'compare', label: '快照对比', icon: <GitCompare size={16} /> },
    { key: 'schemes', label: '方案管理', icon: <FileText size={16} /> },
  ]

  return (
    <div className="min-h-screen bg-navy-800">
      <header className="bg-navy-900/80 border-b border-navy-500/20 sticky top-0 z-30 backdrop-blur-md">
        <div className="max-w-screen-2xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-amber to-amber-dark flex items-center justify-center">
              <Droplets size={22} className="text-navy-900" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white tracking-tight">水泵扬程选型器</h1>
              <p className="text-xs text-navy-300">增量导入 · 修正留痕 · 幂等计算 · 方案对比</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-navy-300 font-mono">
              流量: {params.designFlow.value || '—'} {params.designFlow.unit} | 管径: {params.pipeDiameter.value || '—'} {params.pipeDiameter.unit}
            </span>
            {importBatches.length > 0 && (
              <span className="badge-info">{importBatches.length}次导入</span>
            )}
            <button onClick={toggleCorrectionPanel} className={`btn-secondary flex items-center gap-1 ${showCorrectionPanel ? 'border-amber text-amber' : ''}`}>
              <Clock size={14} /> 留痕
            </button>
            <button onClick={reset} className="btn-secondary flex items-center gap-1 text-margin-red hover:text-margin-red">
              <RotateCcw size={14} /> 重置
            </button>
            {currentSnapshot && (
              <Link to="/report" className="btn-primary flex items-center gap-1">
                <Printer size={14} /> 报告
              </Link>
            )}
          </div>
        </div>
      </header>

      <div className="max-w-screen-2xl mx-auto px-6 py-4 flex gap-4">
        <div className="flex-1 min-w-0 space-y-4">
          <nav className="flex gap-1 bg-navy-900/60 rounded-lg p-1">
            {tabs.map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                  activeTab === tab.key
                    ? 'bg-navy-500 text-white shadow-md'
                    : 'text-navy-200 hover:text-white hover:bg-navy-700/50'
                }`}
              >
                {tab.icon} {tab.label}
              </button>
            ))}
          </nav>

          <div className="min-h-[500px]">
            {activeTab === 'import' && <ImportPanel />}
            {activeTab === 'correction' && <ManualCorrection />}
            {activeTab === 'compare' && <CompareView />}
            {activeTab === 'schemes' && <SchemeCompare />}
          </div>
        </div>

        <div className="w-[420px] flex-shrink-0 space-y-4">
          <div>
            <h2 className="text-sm font-bold text-navy-200 mb-2 flex items-center gap-2">
              <Droplets size={14} /> 计算结果
              {currentSnapshot && (
                <span className="text-xs font-normal text-navy-300 ml-auto">
                  {new Date(currentSnapshot.calculatedAt).toLocaleTimeString('zh-CN', { hour12: false })}
                </span>
              )}
            </h2>
            <CalculationResult />
          </div>

          {showCorrectionPanel && (
            <div className="card border-amber/20">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-bold text-amber flex items-center gap-2">
                  <Clock size={14} /> 操作留痕
                </h3>
                <button onClick={() => setTimelineCollapsed(c => !c)} className="text-navy-300 hover:text-white">
                  {timelineCollapsed ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
                </button>
              </div>
              {!timelineCollapsed && (
                <div className="max-h-[400px] overflow-y-auto scrollbar-thin">
                  <CorrectionTimeline />
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
