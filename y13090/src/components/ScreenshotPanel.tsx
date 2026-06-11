import { useState } from 'react';
import { Camera, ChevronDown, ChevronUp, Eye, MapPin, Focus } from 'lucide-react';
import { useReviewStore } from '@/store/reviewStore';
import { clsx } from 'clsx';

export function ScreenshotPanel() {
  const { cameraState, filteredResult, isScreenshotMode, screenshotNote, setScreenshotNote } = useReviewStore();
  const [expanded, setExpanded] = useState(true);
  const [showNote, setShowNote] = useState(false);

  const hasAnomaly = filteredResult.stats.anomalyCount > 0;

  return (
    <div className="bg-steel-800/60 backdrop-blur border border-steel-700 rounded-lg overflow-hidden flex flex-col h-full">
      <div className="px-4 py-3 border-b border-steel-700 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Camera className={clsx('w-4 h-4', isScreenshotMode ? 'text-warning-400 animate-pulse' : 'text-industrial-400')} />
          <h3 className="text-sm font-semibold text-steel-200 tracking-wide">截图说明区</h3>
          <span className="text-[10px] text-steel-500 px-1.5 py-0.5 rounded bg-steel-700/50 font-mono">
            随筛选联动刷新
          </span>
        </div>
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-steel-400 hover:text-steel-200 transition-colors"
        >
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>

      {expanded && (
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="relative flex-1 min-h-[200px] bg-gradient-to-br from-steel-900 via-steel-800 to-industrial-900/30 m-3 rounded-lg border border-steel-700 overflow-hidden">
            <div className="absolute inset-0 bg-grid-pattern bg-grid-40 opacity-30" />

            <div className="absolute top-3 left-3 flex items-center gap-1.5 text-[10px] font-mono text-steel-400 bg-steel-900/70 px-2 py-1 rounded border border-steel-700">
              <Focus className="w-3 h-3" />
              当前结果集 · {filteredResult.stats.total} 条记录
            </div>

            {hasAnomaly && (
              <div className="absolute top-3 right-3 flex items-center gap-1.5 text-[10px] font-mono text-warning-400 bg-warning-500/10 px-2 py-1 rounded border border-warning-500/30">
                <Eye className="w-3 h-3" />
                {filteredResult.stats.anomalyCount} 处异常标注
              </div>
            )}

            <div className="absolute bottom-3 left-3 right-3 space-y-1.5">
              <div className="flex items-center gap-2 text-[10px] font-mono text-steel-400">
                <MapPin className="w-3 h-3" />
                camera position: [{cameraState.position.map(v => v.toFixed(1)).join(', ')}]
              </div>
              <div className="flex items-center gap-2 text-[10px] font-mono text-steel-400">
                <Focus className="w-3 h-3" />
                target: [{cameraState.target.map(v => v.toFixed(1)).join(', ')}] · fov: {cameraState.fov}°
              </div>
            </div>

            {isScreenshotMode && (
              <div className="absolute inset-0 border-4 border-warning-500/60 animate-pulse pointer-events-none">
                <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-warning-400" />
                <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-warning-400" />
                <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-warning-400" />
                <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-warning-400" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-warning-400 text-xs font-mono tracking-widest">
                  SCREENSHOT MODE
                </div>
              </div>
            )}
          </div>

          <div className="px-3 pb-3">
            <button
              onClick={() => setShowNote(!showNote)}
              className="w-full flex items-center justify-between px-3 py-2 text-xs rounded bg-steel-900/60 border border-steel-700 text-steel-400 hover:text-steel-200 hover:border-steel-600 transition-colors"
            >
              <span className="flex items-center gap-1.5">
                <Eye className="w-3.5 h-3.5" />
                查看截图说明（视角参数 + 异常标注）
              </span>
              {showNote ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>

            {showNote && (
              <div className="mt-2 p-3 rounded-lg bg-steel-900/60 border border-steel-700 space-y-2 text-xs">
                <div>
                  <div className="text-steel-500 mb-0.5">截图说明备注</div>
                  <textarea
                    value={screenshotNote}
                    onChange={(e) => setScreenshotNote(e.target.value)}
                    placeholder="记录这张截图的复核要点..."
                    rows={2}
                    className="w-full bg-steel-800 border border-steel-700 rounded px-2 py-1.5 text-steel-200 placeholder-steel-600 focus:outline-none focus:border-industrial-500 resize-none"
                  />
                </div>
                <div>
                  <div className="text-steel-500 mb-0.5">视角参数</div>
                  <div className="font-mono text-steel-300 space-y-0.5 bg-steel-800/50 rounded px-2 py-1.5">
                    <div>position: ({cameraState.position.map(v => v.toFixed(2)).join(', ')})</div>
                    <div>target: ({cameraState.target.map(v => v.toFixed(2)).join(', ')})</div>
                    <div>fov: {cameraState.fov}°</div>
                  </div>
                </div>
                {filteredResult.anomalies.slice(0, 3).length > 0 && (
                  <div>
                    <div className="text-steel-500 mb-0.5">本图异常标注</div>
                    <div className="space-y-1">
                      {filteredResult.anomalies.slice(0, 3).map(a => (
                        <div
                          key={a.id}
                          className={clsx(
                            'px-2 py-1 rounded text-[11px]',
                            a.type === 'name_mismatch'
                              ? 'bg-warning-500/10 text-warning-400 border border-warning-500/20'
                              : 'bg-danger-500/10 text-danger-400 border border-danger-500/20',
                          )}
                        >
                          {a.description}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
