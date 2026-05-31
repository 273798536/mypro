import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import InputPanel from '@/components/InputPanel'
import DentalViewer from '@/components/DentalViewer'
import DiagnosticPanel from '@/components/DiagnosticPanel'
import ViewToolbar from '@/components/ViewToolbar'
import { useStore } from '@/store/useStore'

export default function Home() {
  const navigate = useNavigate()
  const {
    contactPoints,
    alerts,
    inputFiles,
    dataGaps,
    selectedTooth,
    viewMode,
    showHeatmap,
    setSelectedTooth,
    setViewMode,
    toggleHeatmap,
  } = useStore()

  const [resetKey, setResetKey] = useState(0)

  return (
    <div className="flex h-screen w-screen overflow-hidden">
      <InputPanel inputFiles={inputFiles} />

      <div className="flex-1 relative flex flex-col">
        <ViewToolbar
          viewMode={viewMode}
          showHeatmap={showHeatmap}
          onViewModeChange={setViewMode}
          onToggleHeatmap={toggleHeatmap}
          onResetView={() => setResetKey((k) => k + 1)}
        />

        <div className="flex-1 relative" key={resetKey}>
          <DentalViewer
            showHeatmap={showHeatmap}
            selectedTooth={selectedTooth}
            onSelectTooth={setSelectedTooth}
            viewMode={viewMode}
            contactPoints={contactPoints}
            dataGaps={dataGaps}
          />

          {selectedTooth && (
            <div className="absolute top-16 right-4 z-10 bg-bg-surface/90 backdrop-blur-sm rounded-lg px-3 py-2 border border-mono-dim/20 animate-fade-in">
              <div className="flex items-center gap-2">
                <span className="text-xs text-mono-muted">选中:</span>
                <span className="font-tooth-number text-sm text-upper">#{selectedTooth}</span>
                <button
                  className="text-xs text-mono-dim hover:text-mono ml-2"
                  onClick={() => setSelectedTooth(null)}
                >
                  ✕
                </button>
              </div>
              {contactPoints.filter((cp) => cp.toothNumber === selectedTooth).length > 0 && (
                <div className="mt-1 space-y-0.5">
                  {contactPoints
                    .filter((cp) => cp.toothNumber === selectedTooth)
                    .map((cp) => (
                      <div key={cp.id} className="flex items-center gap-2 text-[10px]">
                        <span className={`w-2 h-2 rounded-full ${cp.jawType === 'upper' ? 'bg-upper' : 'bg-lower'}`} />
                        <span className="text-mono-muted">
                          {cp.jawType === 'upper' ? '上颌' : '下颌'}
                          {cp.isOverlapping && <span className="text-overlap ml-1">重叠</span>}
                          {cp.isMisaligned && <span className="text-misaligned ml-1">错位</span>}
                        </span>
                        <span className="font-tooth-number text-mono-dim">
                          ({cp.positionX.toFixed(2)}, {cp.positionY.toFixed(2)}, {cp.positionZ.toFixed(2)})
                        </span>
                      </div>
                    ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="absolute bottom-4 right-4 z-10">
          <div className="flex items-center gap-3 text-[10px] text-mono-dim bg-bg-surface/70 backdrop-blur-sm rounded-lg px-3 py-1.5 border border-mono-dim/20">
            <span>接触点: {contactPoints.length}</span>
            <span className="w-px h-3 bg-mono-dim/30" />
            <span>诊断: {alerts.length}</span>
            <span className="w-px h-3 bg-mono-dim/30" />
            <span>模式: {viewMode === 'free' ? '自由' : viewMode === 'upperTop' ? '上颌俯视' : viewMode === 'lowerBottom' ? '下颌仰视' : '侧面'}</span>
          </div>
        </div>
      </div>

      <DiagnosticPanel
        alerts={alerts}
        selectedTooth={selectedTooth}
        onSelectTooth={setSelectedTooth}
        onNavigateCorrection={() => navigate('/correction')}
      />
    </div>
  )
}
