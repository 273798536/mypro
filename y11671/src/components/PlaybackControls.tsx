import { Play, Pause, RotateCcw, SkipForward, Camera, Download } from 'lucide-react';
import { useSimulationStore } from '../store/simulationStore';

interface PlaybackControlsProps {
  onExportImage: () => void;
  onExportConfig: () => void;
}

export function PlaybackControls({ onExportImage, onExportConfig }: PlaybackControlsProps) {
  const isRunning = useSimulationStore(state => state.isRunning);
  const currentTime = useSimulationStore(state => state.currentTime);
  const speedMultiplier = useSimulationStore(state => state.speedMultiplier);
  const setRunning = useSimulationStore(state => state.setRunning);
  const setSpeedMultiplier = useSimulationStore(state => state.setSpeedMultiplier);
  const step = useSimulationStore(state => state.step);
  const reset = useSimulationStore(state => state.reset);

  const handlePlayPause = () => {
    setRunning(!isRunning);
  };

  const handleStep = () => {
    if (!isRunning) {
      step();
    }
  };

  const handleReset = () => {
    reset();
  };

  return (
    <div className="h-full flex flex-col bg-slate-900/90 border-t border-slate-700/50">
      <div className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 bg-slate-800 rounded-lg px-3 py-2">
              <span className="text-slate-500 text-sm">时间:</span>
              <span className="text-cyan-400 font-mono text-lg">
                {currentTime.toFixed(3)}s
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-slate-500 text-sm">速度:</span>
              <select
                value={speedMultiplier}
                onChange={(e) => setSpeedMultiplier(Number(e.target.value))}
                className="bg-slate-800 border border-slate-600 rounded px-2 py-1 text-sm text-slate-200 focus:border-cyan-500 focus:outline-none"
              >
                <option value={0.25}>0.25x</option>
                <option value={0.5}>0.5x</option>
                <option value={1}>1x</option>
                <option value={2}>2x</option>
                <option value={4}>4x</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleReset}
              className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-400 hover:text-slate-200 transition-colors"
              title="重置"
            >
              <RotateCcw className="w-5 h-5" />
            </button>

            <button
              onClick={handleStep}
              disabled={isRunning}
              className="p-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-slate-400 hover:text-slate-200 transition-colors"
              title="单步推进"
            >
              <SkipForward className="w-5 h-5" />
            </button>

            <button
              onClick={handlePlayPause}
              className={`p-3 rounded-lg transition-all ${
                isRunning
                  ? 'bg-amber-500 hover:bg-amber-400 text-white shadow-lg shadow-amber-500/30'
                  : 'bg-cyan-500 hover:bg-cyan-400 text-white shadow-lg shadow-cyan-500/30'
              }`}
              title={isRunning ? '暂停' : '播放'}
            >
              {isRunning ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6" />}
            </button>

            <div className="w-px h-8 bg-slate-700 mx-2" />

            <button
              onClick={onExportImage}
              className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-400 hover:text-slate-200 transition-colors"
              title="导出3D视图"
            >
              <Camera className="w-5 h-5" />
            </button>

            <button
              onClick={onExportConfig}
              className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-400 hover:text-slate-200 transition-colors"
              title="导出参数配置"
            >
              <Download className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
