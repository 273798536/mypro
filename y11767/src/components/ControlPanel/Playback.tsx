import { Play, Pause, RotateCcw, SkipBack, SkipForward, Camera } from 'lucide-react';
import { useExperimentStore } from '../../store/useExperimentStore';
import { cn } from '../../utils/cn';
import { captureScreenshot, downloadDataURL, formatTimestamp } from '../../utils/export';

const SPEED_OPTIONS = [0.25, 0.5, 1, 2, 4];

export function PlaybackControls() {
  const isPlaying = useExperimentStore((state) => state.isPlaying);
  const isPaused = useExperimentStore((state) => state.isPaused);
  const playbackSpeed = useExperimentStore((state) => state.playbackSpeed);
  const currentTime = useExperimentStore((state) => state.currentTime);
  const duration = useExperimentStore((state) => state.duration);
  const playbackFrames = useExperimentStore((state) => state.playbackFrames);
  const frameIndex = useExperimentStore((state) => state.frameIndex);
  const recordingMode = useExperimentStore((state) => state.recordingMode);

  console.log('[DEBUG] PlaybackControls rendering, isPlaying:', isPlaying, 'currentTime:', currentTime.toFixed(2));

  const setPlaying = useExperimentStore((state) => state.setPlaying);
  const setPaused = useExperimentStore((state) => state.setPaused);
  const setPlaybackSpeed = useExperimentStore((state) => state.setPlaybackSpeed);
  const resetBalls = useExperimentStore((state) => state.resetBalls);
  const seekToFrame = useExperimentStore((state) => state.seekToFrame);
  const saveRecord = useExperimentStore((state) => state.saveRecord);

  const handlePlayPause = () => {
    if (recordingMode === 'playback' && playbackFrames.length > 0) {
      setPlaying(true);
    } else {
      if (isPlaying && !isPaused) {
        setPaused(true);
      } else if (isPaused) {
        setPaused(false);
      } else {
        setPlaying(true);
      }
    }
  };

  const handleReset = () => {
    resetBalls();
  };

  const handleScreenshot = async () => {
    try {
      const screenshot = await captureScreenshot('experiment-canvas');
      saveRecord(screenshot);
      downloadDataURL(screenshot, `experiment-${formatTimestamp(Date.now())}.png`);
    } catch (error) {
      console.error('截图失败:', error);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value);
    if (recordingMode === 'playback' && playbackFrames.length > 0) {
      const frameIdx = Math.floor((value / duration) * playbackFrames.length);
      seekToFrame(frameIdx);
    }
  };

  const progress = isPlaying
    ? currentTime
    : recordingMode === 'playback' && playbackFrames.length > 0
      ? (frameIndex / playbackFrames.length) * duration
      : currentTime;

  return (
    <div className="bg-space-800 rounded-lg p-4 border border-space-700">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-white/70">回放控制</h3>
        <span className="text-xs mono-text text-cyber-400">
          {progress.toFixed(2)}s / {duration}s
        </span>
      </div>

      <div className="mb-4">
        <input
          type="range"
          min={0}
          max={duration}
          step={0.01}
          value={progress}
          onChange={handleSeek}
          className="w-full"
          disabled={isPlaying && recordingMode === 'live'}
        />
      </div>

      <div className="flex items-center justify-center gap-2 mb-4">
        <button
          onClick={handleReset}
          className="p-2 rounded-lg bg-space-700 hover:bg-space-600 transition-colors"
          title="重置"
        >
          <RotateCcw size={18} />
        </button>

        <button
          onClick={handlePlayPause}
          className={cn(
            "p-3 rounded-lg transition-colors",
            isPlaying && !isPaused
              ? "bg-alert-orange hover:bg-alert-orange/80"
              : "bg-cyber-500 hover:bg-cyber-400 text-space-950"
          )}
        >
          {isPlaying && !isPaused ? <Pause size={20} /> : <Play size={20} />}
        </button>

        <button
          onClick={handleScreenshot}
          className="p-2 rounded-lg bg-space-700 hover:bg-space-600 transition-colors"
          title="截图并保存"
        >
          <Camera size={18} />
        </button>
      </div>

      <div className="flex items-center justify-center gap-1">
        <span className="text-xs text-white/50 mr-2">速度:</span>
        {SPEED_OPTIONS.map((speed) => (
          <button
            key={speed}
            onClick={() => setPlaybackSpeed(speed)}
            className={cn(
              "px-2 py-1 text-xs rounded transition-colors",
              playbackSpeed === speed
                ? "bg-cyber-500 text-space-950"
                : "bg-space-700 hover:bg-space-600"
            )}
          >
            {speed}x
          </button>
        ))}
      </div>

      <div className="mt-3 text-xs text-center text-white/40">
        模式: {recordingMode === 'live' ? '实时模拟' : '回放模式'} |
        帧数: {playbackFrames.length}
      </div>
    </div>
  );
}
