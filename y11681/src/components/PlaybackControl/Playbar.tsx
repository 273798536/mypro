import { useTrajectoryStore } from '@/store/useTrajectoryStore';
import { Play, Pause, SkipBack, SkipForward, Volume2 } from 'lucide-react';

export function PlaybackControl() {
  const {
    currentResult,
    playbackProgress,
    playbackSpeed,
    isPlaying,
    setPlaybackProgress,
    setPlaybackSpeed,
    togglePlay,
  } = useTrajectoryStore();

  if (!currentResult) {
    return (
      <div className="glass-panel rounded-lg p-3 text-center text-gray-500 text-sm">
        计算弹道后可使用回放控制
      </div>
    );
  }

  const currentIndex = Math.floor(currentResult.points.length * playbackProgress);
  const currentPoint = currentResult.points[currentIndex];
  const currentTime = currentPoint ? currentPoint.t : 0;

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPlaybackProgress(parseFloat(e.target.value) / 100);
  };

  const skipBack = () => {
    setPlaybackProgress(Math.max(0, playbackProgress - 0.1));
  };

  const skipForward = () => {
    setPlaybackProgress(Math.min(1, playbackProgress + 0.1));
  };

  const speedOptions = [0.25, 0.5, 1, 2, 4];

  return (
    <div className="glass-panel rounded-lg p-3 space-y-3">
      <div className="flex items-center gap-3">
        <button
          onClick={skipBack}
          className="p-1.5 rounded hover:bg-golf-teal/20 transition-colors"
          title="后退10%"
        >
          <SkipBack size={14} className="text-golf-green" />
        </button>

        <button
          onClick={togglePlay}
          className="p-2 rounded-full bg-golf-teal hover:bg-golf-green transition-colors"
        >
          {isPlaying ? (
            <Pause size={16} className="text-golf-dark" />
          ) : (
            <Play size={16} className="text-golf-dark ml-0.5" />
          )}
        </button>

        <button
          onClick={skipForward}
          className="p-1.5 rounded hover:bg-golf-teal/20 transition-colors"
          title="前进10%"
        >
          <SkipForward size={14} className="text-golf-green" />
        </button>

        <div className="flex-1">
          <input
            type="range"
            min={0}
            max={100}
            value={playbackProgress * 100}
            onChange={handleSliderChange}
            className="w-full"
          />
        </div>

        <div className="text-xs text-golf-green font-mono min-w-[80px] text-right">
          {currentTime.toFixed(2)}s
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Volume2 size={12} className="text-gray-500" />
        <div className="flex gap-1">
          {speedOptions.map((speed) => (
            <button
              key={speed}
              onClick={() => setPlaybackSpeed(speed)}
              className={`px-2 py-1 rounded text-xs transition-colors ${
                playbackSpeed === speed
                  ? 'bg-golf-teal text-golf-dark font-semibold'
                  : 'text-gray-400 hover:bg-golf-teal/20'
              }`}
            >
              {speed}x
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
