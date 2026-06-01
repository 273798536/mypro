import { Link } from 'react-router-dom'
import DataImport from '@/components/DataImport'
import WaveformChart from '@/components/WaveformChart'
import TimelinePanel from '@/components/TimelinePanel'
import DamagePhotoStrip from '@/components/DamagePhotoStrip'
import ConflictPanel from '@/components/ConflictPanel'
import PlaybackControls from '@/components/PlaybackControls'
import { useSeismicStore } from '@/store/useSeismicStore'
import { Activity, ChevronRight } from 'lucide-react'

export default function Workbench() {
  const dataLoaded = useSeismicStore((s) => s.dataLoaded)
  const accelerationData = useSeismicStore((s) => s.accelerationData)
  const displacementData = useSeismicStore((s) => s.displacementData)
  const damagePhotos = useSeismicStore((s) => s.damagePhotos)
  const traceLinks = useSeismicStore((s) => s.traceLinks)
  const conflicts = useSeismicStore((s) => s.conflicts)

  const accelCount = accelerationData.length
  const dispCount = displacementData.length
  const photoCount = damagePhotos.length

  return (
    <div className="min-h-screen bg-[#0F1923] flex flex-col">
      <header className="h-14 bg-steel-900 border-b border-steel-700 flex items-center px-6 shrink-0">
        <Activity className="w-5 h-5 text-signal mr-3" />
        <h1 className="text-lg font-semibold text-slate-100 tracking-wide">
          振动台地震波回放系统
        </h1>
        <div className="ml-auto flex items-center gap-4 text-xs font-mono text-steel-500">
          {accelCount > 0 && (
            <span className="text-signal">加速度 {accelCount}点</span>
          )}
          {dispCount > 0 && (
            <span className="text-displacement">位移 {dispCount}点</span>
          )}
          {photoCount > 0 && (
            <span className="text-photo">照片 {photoCount}张</span>
          )}
          {conflicts.length > 0 && (
            <span className="text-warn">冲突 {conflicts.length}项</span>
          )}
        </div>
      </header>

      <main className="flex-1 flex flex-col overflow-hidden">
        {!dataLoaded ? (
          <div className="flex-1 flex items-center justify-center">
            <DataImport />
          </div>
        ) : (
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="flex-1 flex overflow-hidden">
              <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
                <div className="flex-1 min-h-0 p-4">
                  <WaveformChart />
                </div>
                <div className="shrink-0">
                  <DamagePhotoStrip />
                </div>
              </div>
              <aside className="w-72 bg-steel-900 border-l border-steel-700 overflow-y-auto shrink-0 flex flex-col">
                <TimelinePanel />
                {traceLinks.length > 0 && (
                  <div className="border-t border-steel-700 p-3">
                    <h3 className="text-xs font-semibold text-steel-500 uppercase tracking-wider mb-2">
                      峰值结果 ({traceLinks.length})
                    </h3>
                    <div className="space-y-1 max-h-48 overflow-y-auto">
                      {traceLinks.slice(0, 20).map((link) => (
                        <Link
                          key={link.resultId}
                          to={`/trace/${link.resultId}`}
                          className="flex items-center gap-2 px-2 py-1.5 rounded text-xs hover:bg-steel-800 transition-colors group"
                        >
                          <span
                            className={`w-2 h-2 rounded-full shrink-0 ${
                              link.peakExtraction.channel === 'acceleration'
                                ? 'bg-signal'
                                : 'bg-displacement'
                            }`}
                          />
                          <span className="font-mono text-slate-300 truncate">
                            {link.peakExtraction.value.toFixed(2)}
                            {link.peakExtraction.channel === 'acceleration'
                              ? ' m/s²'
                              : ' mm'}
                          </span>
                          {link.conflicts.length > 0 && (
                            <span className="text-warn text-[10px]">
                              !{link.conflicts.length}
                            </span>
                          )}
                          <ChevronRight className="w-3 h-3 text-steel-600 ml-auto group-hover:text-signal transition-colors" />
                        </Link>
                      ))}
                      {traceLinks.length > 20 && (
                        <p className="text-[10px] text-steel-600 px-2">
                          还有 {traceLinks.length - 20} 条...
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </aside>
            </div>
            <div className="shrink-0">
              <PlaybackControls />
            </div>
            <div className="shrink-0">
              <ConflictPanel />
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
