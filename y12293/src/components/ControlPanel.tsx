import { useEffect } from 'react';
import { RotateCw, Sliders, Play, Pause, RotateCcw, GitCompare } from 'lucide-react';
import { useAppStore } from '@/store/appStore';

export function ControlPanel() {
  const {
    rotationAxis,
    setRotationAxis,
    solidParams,
    setSolidParams,
    isPlaying,
    setPlaying,
    playbackSpeed,
    setPlaybackSpeed,
    playbackProgress,
    setPlaybackProgress,
    reset,
    comparisonFunction,
    setComparison,
    currentFunction
  } = useAppStore();

  useEffect(() => {
    if (!isPlaying) return;

    let progress = playbackProgress;
    const interval = setInterval(() => {
      progress = progress + playbackSpeed * 0.01;
      if (progress >= 1) progress = 0;
      setPlaybackProgress(progress);
    }, 16);

    return () => clearInterval(interval);
  }, [isPlaying, playbackSpeed, playbackProgress, setPlaybackProgress]);

  const handleAxisChange = (axis: 'x' | 'y') => {
    setRotationAxis({ ...rotationAxis, axis });
  };

  return (
    <div className="card p-4 space-y-5">
      <div className="flex items-center gap-2">
        <Sliders className="w-5 h-5 text-primary-400" />
        <h3 className="font-semibold text-white">参数控制</h3>
      </div>

      <div className="space-y-3">
        <label className="text-sm text-gray-400">旋转轴</label>
        <div className="flex gap-2">
          {(['x', 'y'] as const).map((axis) => (
            <button
              key={axis}
              onClick={() => handleAxisChange(axis)}
              className={`flex-1 py-2 px-4 rounded-lg font-semibold transition-all flex items-center justify-center gap-2 ${
                rotationAxis.axis === axis
                  ? 'bg-primary-500 text-dark-900 glow-border'
                  : 'bg-dark-700 text-gray-300 hover:bg-dark-600 border border-gray-600'
              }`}
            >
              <RotateCw className="w-4 h-4" />
              {axis.toUpperCase()} 轴
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <label className="text-sm text-gray-400">切片数量</label>
          <span className="text-sm font-mono text-primary-400">{solidParams.slices}</span>
        </div>
        <input
          type="range"
          min="8"
          max="128"
          value={solidParams.slices}
          onChange={(e) => setSolidParams({ ...solidParams, slices: parseInt(e.target.value) })}
          className="w-full"
        />
        {solidParams.slices < 16 && (
          <p className="text-xs text-warning-400">
            ⚠️ 切片数过低，可能导致显示质量不佳
          </p>
        )}
      </div>

      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <label className="text-sm text-gray-400">计算精度</label>
          <span className="text-sm font-mono text-primary-400">{solidParams.precision}</span>
        </div>
        <input
          type="range"
          min="20"
          max="500"
          step="10"
          value={solidParams.precision}
          onChange={(e) => setSolidParams({ ...solidParams, precision: parseInt(e.target.value) })}
          className="w-full"
        />
      </div>

      <div className="space-y-3">
        <label className="text-sm text-gray-400">动画播放</label>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setPlaying(!isPlaying)}
            className={`p-2 rounded-lg transition-all ${
              isPlaying
                ? 'bg-primary-500 text-dark-900'
                : 'bg-dark-700 text-gray-300 hover:bg-dark-600'
            }`}
          >
            {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
          </button>
          <div className="flex-1">
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={playbackProgress}
              onChange={(e) => setPlaybackProgress(parseFloat(e.target.value))}
              className="w-full"
            />
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-400">速度:</span>
          <input
            type="range"
            min="0.5"
            max="3"
            step="0.5"
            value={playbackSpeed}
            onChange={(e) => setPlaybackSpeed(parseFloat(e.target.value))}
            className="flex-1"
          />
          <span className="text-xs font-mono text-primary-400 w-8">{playbackSpeed}x</span>
        </div>
      </div>

      <div className="pt-2 border-t border-gray-700 space-y-2">
        <div className="flex gap-2">
          <button
            onClick={() => {
              if (comparisonFunction) {
                setComparison(null);
              } else {
                setComparison({ ...currentFunction, id: 'comparison-' + Date.now() });
              }
            }}
            className={`flex-1 py-2 px-3 rounded-lg text-sm transition-all flex items-center justify-center gap-2 ${
              comparisonFunction
                ? 'bg-green-600 text-white'
                : 'btn-secondary'
            }`}
          >
            <GitCompare className="w-4 h-4" />
            {comparisonFunction ? '清除对比' : '设为对比'}
          </button>
          <button
            onClick={reset}
            className="flex-1 py-2 px-3 rounded-lg text-sm btn-secondary flex items-center justify-center gap-2"
          >
            <RotateCcw className="w-4 h-4" />
            重置
          </button>
        </div>
      </div>
    </div>
  );
}
