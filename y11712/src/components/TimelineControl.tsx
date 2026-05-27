import { Play, Pause, SkipBack, SkipForward, FastForward, Rewind } from 'lucide-react';
import { useSimulationStore } from '../store/simulationStore';

export default function TimelineControl() {
  const {
    temperatureField,
    currentTimeStep,
    grid,
    params,
    isRunning,
    isComputing,
    progress,
    runSimulation,
    pauseSimulation,
    stepForward,
    stepBackward,
    setCurrentTimeStep,
  } = useSimulationStore();

  const totalSteps = grid.nt;
  const currentTime = currentTimeStep * params.timeStep;

  if (temperatureField.length === 0) {
    return (
      <div className="h-16 bg-slate-900 border-t border-slate-700 flex items-center justify-center px-4">
        {isComputing ? (
          <div className="flex items-center gap-3">
            <div className="w-48 h-2 bg-slate-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-500 transition-all duration-100"
                style={{ width: `${progress * 100}%` }}
              />
            </div>
            <span className="text-sm text-slate-400">计算中 {Math.round(progress * 100)}%</span>
          </div>
        ) : (
          <button
            onClick={runSimulation}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium transition-colors"
          >
            <Play size={16} />
            开始模拟
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="h-16 bg-slate-900 border-t border-slate-700 flex items-center px-4 gap-4">
      <div className="flex items-center gap-1">
        <button
          onClick={() => setCurrentTimeStep(0)}
          className="p-1.5 hover:bg-slate-700 rounded transition-colors text-slate-400 hover:text-slate-200"
          title="跳转到开始"
        >
          <SkipBack size={16} />
        </button>
        <button
          onClick={stepBackward}
          className="p-1.5 hover:bg-slate-700 rounded transition-colors text-slate-400 hover:text-slate-200"
          title="上一步"
        >
          <Rewind size={16} />
        </button>
        <button
          onClick={isRunning ? pauseSimulation : () => setCurrentTimeStep(currentTimeStep)}
          className="p-2 hover:bg-slate-700 rounded transition-colors text-slate-200"
          title={isRunning ? '暂停' : '播放'}
        >
          {isRunning ? <Pause size={18} /> : <Play size={18} />}
        </button>
        <button
          onClick={stepForward}
          className="p-1.5 hover:bg-slate-700 rounded transition-colors text-slate-400 hover:text-slate-200"
          title="下一步"
        >
          <FastForward size={16} />
        </button>
        <button
          onClick={() => setCurrentTimeStep(totalSteps - 1)}
          className="p-1.5 hover:bg-slate-700 rounded transition-colors text-slate-400 hover:text-slate-200"
          title="跳转到末尾"
        >
          <SkipForward size={16} />
        </button>
      </div>

      <div className="flex-1 flex items-center gap-3">
        <span className="text-xs text-slate-400 font-mono w-16">
          {currentTime.toFixed(4)}s
        </span>
        <input
          type="range"
          min={0}
          max={totalSteps - 1}
          value={currentTimeStep}
          onChange={(e) => setCurrentTimeStep(parseInt(e.target.value))}
          className="flex-1 h-1 bg-slate-700 rounded-full appearance-none cursor-pointer
            [&::-webkit-slider-thumb]:appearance-none
            [&::-webkit-slider-thumb]:w-3
            [&::-webkit-slider-thumb]:h-3
            [&::-webkit-slider-thumb]:bg-blue-500
            [&::-webkit-slider-thumb]:rounded-full
            [&::-webkit-slider-thumb]:cursor-pointer"
        />
        <span className="text-xs text-slate-400 font-mono w-20 text-right">
          {currentTimeStep + 1}/{totalSteps}
        </span>
      </div>

      <div className="flex items-center gap-4 text-xs text-slate-400">
        <span>总时长: {params.totalTime.toFixed(2)}s</span>
        <span>步长: {params.timeStep.toExponential(1)}s</span>
      </div>
    </div>
  );
}
