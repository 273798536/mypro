import { Play, Pause, SkipBack, SkipForward, RotateCcw, Gauge } from 'lucide-react';
import { usePlaybackStore } from '../../stores/usePlaybackStore';
import { useDataStore } from '../../stores/useDataStore';
import dayjs from 'dayjs';

export function PlaybackControls() {
  const { isPlaying, currentTime, duration, speed, togglePlay, seek, setSpeed, reset } =
    usePlaybackStore();
  const { trajectories } = useDataStore();

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  const robotIds = Array.from(new Set(trajectories.map((t) => t.robotId)));

  const formatTime = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  };

  const startTime =
    trajectories.length > 0 ? Math.min(...trajectories.map((t) => t.timestamp)) : Date.now();

  const currentTimestamp = startTime + currentTime;

  return (
    <div className="absolute bottom-0 left-0 right-0 bg-gray-900/95 backdrop-blur border-t border-gray-700 px-6 py-4">
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2">
          <button
            onClick={reset}
            className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
            title="重置"
          >
            <RotateCcw className="w-4 h-4 text-gray-400" />
          </button>
          <button
            onClick={() => seek(Math.max(0, (currentTime - 5000) / duration))}
            className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
            title="后退5秒"
          >
            <SkipBack className="w-4 h-4 text-gray-400" />
          </button>
          <button
            onClick={togglePlay}
            className="p-3 bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors"
            title={isPlaying ? '暂停' : '播放'}
          >
            {isPlaying ? (
              <Pause className="w-5 h-5 text-white" />
            ) : (
              <Play className="w-5 h-5 text-white" />
            )}
          </button>
          <button
            onClick={() => seek(Math.min(1, (currentTime + 5000) / duration))}
            className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
            title="前进5秒"
          >
            <SkipForward className="w-4 h-4 text-gray-400" />
          </button>
        </div>

        <div className="flex-1">
          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-400 w-16 text-right font-mono">
              {formatTime(currentTime)}
            </span>
            <div className="flex-1 relative">
              <input
                type="range"
                min="0"
                max="100"
                value={progress}
                onChange={(e) => seek(Number(e.target.value) / 100)}
                className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                style={{
                  background: `linear-gradient(to right, #3B82F6 ${progress}%, #374151 ${progress}%)`,
                }}
              />
              <div
                className="absolute top-0 h-2 bg-blue-500 rounded-lg pointer-events-none"
                style={{ width: `${progress}%` }}
              />
            </div>
            <span className="text-xs text-gray-400 w-16 font-mono">{formatTime(duration)}</span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Gauge className="w-4 h-4 text-gray-400" />
            <select
              value={speed}
              onChange={(e) => setSpeed(Number(e.target.value))}
              className="bg-gray-700 border border-gray-600 rounded px-2 py-1 text-sm text-gray-300 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value={0.5}>0.5x</option>
              <option value={1}>1x</option>
              <option value={2}>2x</option>
              <option value={4}>4x</option>
              <option value={8}>8x</option>
            </select>
          </div>

          <div className="text-right">
            <div className="text-sm text-white font-mono">
              {dayjs(currentTimestamp).format('HH:mm:ss')}
            </div>
            <div className="text-xs text-gray-500">
              {robotIds.length} 台机器人运行中
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
