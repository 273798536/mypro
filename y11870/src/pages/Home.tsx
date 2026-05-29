import { ControlPanel } from '../components/ControlPanel';
import { WaterSurface3D } from '../components/WaterSurface3D';
import { WaterSurface2D } from '../components/WaterSurface2D';
import { WarningSystem, WarningBanner } from '../components/WarningSystem';
import { useSimulationLoop } from '../hooks/useSimulationLoop';
import { useSimulationStore } from '../store/useSimulationStore';

export default function Home() {
  useSimulationLoop();
  const viewMode = useSimulationStore((state) => state.viewMode);
  const allWarnings = useSimulationStore((state) => state.warnings);
  const hasWarnings = allWarnings.some((w) => !w.dismissed);

  return (
    <div className={`h-screen w-screen flex bg-gray-950 text-white overflow-hidden ${hasWarnings ? 'pt-10' : ''}`}>
      <WarningBanner />
      <WarningSystem />

      <ControlPanel />

      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 flex overflow-hidden">
          {viewMode === '3d' && (
            <div className="flex-1 relative">
              <WaterSurface3D />
              <div className="absolute bottom-4 left-4 bg-black/50 px-3 py-2 rounded text-xs text-gray-300">
                <p>3D视图 - 拖动旋转，滚轮缩放</p>
              </div>
            </div>
          )}

          {viewMode === '2d' && (
            <div className="flex-1 flex items-center justify-center p-4">
              <div className="relative w-full max-w-2xl aspect-square">
                <WaterSurface2D />
                <div className="absolute bottom-2 left-2 bg-black/50 px-2 py-1 rounded text-xs text-gray-300">
                  <p>2D俯视图 - 蓝色越深波幅越大</p>
                </div>
              </div>
            </div>
          )}

          {viewMode === 'split' && (
            <>
              <div className="flex-1 relative border-r border-gray-700">
                <WaterSurface3D />
                <div className="absolute bottom-2 left-2 bg-black/50 px-2 py-1 rounded text-xs text-gray-300">
                  3D视图
                </div>
              </div>
              <div className="flex-1 flex items-center justify-center p-4">
                <div className="relative w-full aspect-square max-w-lg">
                  <WaterSurface2D />
                  <div className="absolute bottom-2 left-2 bg-black/50 px-2 py-1 rounded text-xs text-gray-300">
                    2D俯视图
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        <div className="h-16 bg-gray-900 border-t border-gray-700 flex items-center px-4">
          <TimelineBar />
        </div>
      </div>
    </div>
  );
}

function TimelineBar() {
  const isPlaying = useSimulationStore((state) => state.simulation.isPlaying);
  const time = useSimulationStore((state) => state.simulation.time);
  const setPlaying = useSimulationStore((state) => state.setPlaying);
  const setTime = useSimulationStore((state) => state.setTime);

  const maxTime = 60;
  const progress = Math.min((time / maxTime) * 100, 100);

  return (
    <div className="flex items-center gap-4 w-full">
      <button
        onClick={() => setPlaying(!isPlaying)}
        className="w-10 h-10 flex items-center justify-center rounded-full bg-cyan-600 hover:bg-cyan-700 transition-colors"
      >
        {isPlaying ? (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <rect x="6" y="4" width="4" height="16" />
            <rect x="14" y="4" width="4" height="16" />
          </svg>
        ) : (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <polygon points="5,3 19,12 5,21" />
          </svg>
        )}
      </button>

      <div className="flex-1 relative">
        <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-cyan-500 transition-all duration-100"
            style={{ width: `${progress}%` }}
          />
        </div>
        <input
          type="range"
          min={0}
          max={maxTime}
          step={0.1}
          value={time % maxTime}
          onChange={(e) => setTime(parseFloat(e.target.value))}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
      </div>

      <div className="text-sm text-gray-400 font-mono w-24 text-right">
        {(time % maxTime).toFixed(1)}s
      </div>

      <button
        onClick={() => setTime(0)}
        className="px-3 py-1 text-sm bg-gray-700 hover:bg-gray-600 rounded transition-colors"
      >
        重置
      </button>
    </div>
  );
}
