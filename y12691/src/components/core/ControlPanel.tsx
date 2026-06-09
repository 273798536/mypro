import { Play, Pause, RotateCcw, Flag, History, FastForward, Rewind } from 'lucide-react';
import { useAppStore } from '../../stores/appStore';

export function ControlPanel() {
  const {
    phase, isPlaying, playbackSpeed, togglePlay, setPlaybackSpeed, reset, settle, startReview,
  } = useAppStore();

  const phaseLabels: Record<string, string> = {
    idle: '待开始',
    playing: '进行中',
    paused: '已暂停',
    settled: '已结算',
    reviewing: '复盘中',
  };

  const phaseColors: Record<string, string> = {
    idle: '#4A90A4',
    playing: '#4ECDC4',
    paused: '#FFE66D',
    settled: '#5C9CE6',
    reviewing: '#FFA502',
  };

  const speeds = [0.5, 1, 2, 4];

  return (
    <div className="glass-card rounded-xl p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h3 className="font-display text-lg text-gradient">操作控制</h3>
          <div className="px-3 py-1 rounded-full text-xs font-medium bg-bg-tertiary border border-ice-blue/30">
            <span
              className="inline-block w-2 h-2 rounded-full mr-2 animate-pulse"
              style={{ backgroundColor: phaseColors[phase] }}
            />
            {phaseLabels[phase]}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={togglePlay}
          disabled={phase === 'settled' || phase === 'reviewing'}
          className="btn-primary flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isPlaying ? <Pause size={18} /> : <Play size={18} />}
          {isPlaying ? '暂停' : '开始'}
        </button>

        <button
          onClick={reset}
          className="btn-secondary flex items-center gap-2"
        >
          <RotateCcw size={18} />
          重开
        </button>

        <button
          onClick={settle}
          disabled={phase === 'settled' || phase === 'reviewing'}
          className="btn-success flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Flag size={18} />
          结算
        </button>

        <button
          onClick={startReview}
          className="btn-secondary flex items-center gap-2"
        >
          <History size={18} />
          复盘
        </button>
      </div>

      <div className="pt-3 border-t border-ice-blue/20">
        <div className="flex items-center justify-between">
          <span className="text-sm text-text-secondary">播放速度</span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPlaybackSpeed(Math.max(0.5, playbackSpeed / 2))}
              className="p-2 rounded-lg hover:bg-bg-tertiary transition-colors disabled:opacity-50"
              disabled={playbackSpeed <= 0.5}
            >
              <Rewind size={16} className="text-text-secondary" />
            </button>
            {speeds.map(speed => (
              <button
                key={speed}
                onClick={() => setPlaybackSpeed(speed)}
                className={`px-2 py-1 rounded text-xs font-medium transition-all ${
                  playbackSpeed === speed
                    ? 'bg-ice-blue text-white'
                    : 'text-text-secondary hover:bg-bg-tertiary'
                }`}
              >
                {speed}x
              </button>
            ))}
            <button
              onClick={() => setPlaybackSpeed(Math.min(4, playbackSpeed * 2))}
              className="p-2 rounded-lg hover:bg-bg-tertiary transition-colors disabled:opacity-50"
              disabled={playbackSpeed >= 4}
            >
              <FastForward size={16} className="text-text-secondary" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
