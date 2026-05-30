import { Play, Pause, SkipBack, SkipForward, RotateCcw } from 'lucide-react';
import { useAttitudeStore } from '../../store/useAttitudeStore';
import { PLAYBACK_SPEEDS } from '../../utils/constants';

export const PlaybackControls = () => {
  const {
    playbackState,
    togglePlay,
    prevFrame,
    nextFrame,
    goToFrame,
    setPlaybackState,
    resetToDefault,
  } = useAttitudeStore();

  const handleSpeedChange = (speed: number) => {
    setPlaybackState({ speed });
  };

  return (
    <div
      className="flex items-center gap-4 px-4 py-3 rounded-lg border"
      style={{
        backgroundColor: 'rgba(10, 22, 40, 0.95)',
        borderColor: '#1e3a5f',
      }}
    >
      <div className="flex items-center gap-1">
        <button
          onClick={resetToDefault}
          className="p-2 rounded hover:bg-slate-700/50 transition-colors"
          style={{ color: '#e8f4ff' }}
          title="重置"
        >
          <RotateCcw size={18} />
        </button>

        <button
          onClick={prevFrame}
          disabled={playbackState.currentFrame === 0}
          className="p-2 rounded hover:bg-slate-700/50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          style={{ color: '#e8f4ff' }}
          title="上一帧"
        >
          <SkipBack size={18} />
        </button>

        <button
          onClick={togglePlay}
          className="p-3 rounded-full hover:bg-blue-600/30 transition-colors"
          style={{
            backgroundColor: playbackState.isPlaying ? 'rgba(24, 144, 255, 0.3)' : 'rgba(24, 144, 255, 0.2)',
            color: '#1890ff',
          }}
          title={playbackState.isPlaying ? '暂停' : '播放'}
        >
          {playbackState.isPlaying ? <Pause size={20} /> : <Play size={20} />}
        </button>

        <button
          onClick={nextFrame}
          disabled={playbackState.currentFrame >= playbackState.totalFrames - 1}
          className="p-2 rounded hover:bg-slate-700/50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          style={{ color: '#e8f4ff' }}
          title="下一帧"
        >
          <SkipForward size={18} />
        </button>
      </div>

      <div className="h-8 w-px bg-slate-700" />

      <div className="flex items-center gap-2">
        <span className="text-xs opacity-70" style={{ color: '#e8f4ff' }}>
          速度
        </span>
        <div className="flex gap-1">
          {PLAYBACK_SPEEDS.map((speed) => (
            <button
              key={speed}
              onClick={() => handleSpeedChange(speed)}
              className={`px-2 py-1 text-xs rounded transition-colors ${
                playbackState.speed === speed
                  ? 'bg-blue-600 text-white'
                  : 'hover:bg-slate-700/50'
              }`}
              style={{
                color: playbackState.speed === speed ? '#ffffff' : '#e8f4ff',
              }}
            >
              {speed}x
            </button>
          ))}
        </div>
      </div>

      <div className="ml-auto text-sm font-mono" style={{ color: '#e8f4ff' }}>
        {playbackState.currentFrame + 1} / {playbackState.totalFrames || '-'}
      </div>
    </div>
  );
};
