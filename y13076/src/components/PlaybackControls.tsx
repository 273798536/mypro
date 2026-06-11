import { useEffect, useRef } from 'react';
import { Play, Pause, ChevronLeft, ChevronRight } from 'lucide-react';
import { useStore } from '@/store/useStore';

export default function PlaybackControls() {
  const playback = useStore((s) => s.playback);
  const filterCriteria = useStore((s) => s.filterCriteria);
  const togglePlayback = useStore((s) => s.togglePlayback);
  const setPlaybackSpeed = useStore((s) => s.setPlaybackSpeed);
  const setCurrentTime = useStore((s) => s.setCurrentTime);
  const applyFilters = useStore((s) => s.applyFilters);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const speeds = [0.5, 1, 2, 4];

  useEffect(() => {
    if (playback.isPlaying) {
      intervalRef.current = setInterval(() => {
        setCurrentTime(
          new Date(new Date(playback.currentTime).getTime() + 30000 * playback.speed).toISOString()
        );
        applyFilters();
      }, 1000);
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [playback.isPlaying, playback.speed]);

  const stepForward = () => {
    setCurrentTime(
      new Date(new Date(playback.currentTime).getTime() + 30000).toISOString()
    );
  };

  const stepBackward = () => {
    setCurrentTime(
      new Date(new Date(playback.currentTime).getTime() - 30000).toISOString()
    );
  };

  const start = new Date(filterCriteria.timeRangeStart).getTime();
  const end = new Date(filterCriteria.timeRangeEnd).getTime();
  const current = new Date(playback.currentTime).getTime();
  const progress = end > start ? ((current - start) / (end - start)) * 100 : 0;

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const pct = Number(e.target.value) / 100;
    const newTime = new Date(start + pct * (end - start)).toISOString();
    setCurrentTime(newTime);
  };

  const displayTime = playback.currentTime.slice(11, 16);

  return (
    <div className="h-full bg-[#111827] flex items-center px-4 gap-3 border-t border-gray-800">
      <button
        onClick={togglePlayback}
        className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-800 hover:bg-gray-700 text-white transition-colors"
      >
        {playback.isPlaying ? <Pause size={14} /> : <Play size={14} />}
      </button>

      <button
        onClick={stepBackward}
        className="w-7 h-7 flex items-center justify-center rounded hover:bg-gray-700 text-gray-400 transition-colors"
      >
        <ChevronLeft size={14} />
      </button>
      <button
        onClick={stepForward}
        className="w-7 h-7 flex items-center justify-center rounded hover:bg-gray-700 text-gray-400 transition-colors"
      >
        <ChevronRight size={14} />
      </button>

      <div className="flex items-center gap-1">
        {speeds.map((s) => (
          <button
            key={s}
            onClick={() => setPlaybackSpeed(s)}
            className={`px-2 py-0.5 text-xs rounded transition-colors ${
              playback.speed === s
                ? 'bg-[#00E5A0] text-gray-900 font-semibold'
                : 'bg-gray-800 text-gray-400 hover:text-white'
            }`}
          >
            {s}x
          </button>
        ))}
      </div>

      <div className="flex-1 flex items-center gap-2">
        <input
          type="range"
          min={0}
          max={100}
          value={Math.max(0, Math.min(100, progress))}
          onChange={handleSliderChange}
          className="flex-1 h-1 appearance-none bg-gray-700 rounded-full cursor-pointer accent-[#00E5A0]"
        />
      </div>

      <span className="font-mono text-xs text-[#00E5A0] min-w-[40px] text-right">
        {displayTime}
      </span>
    </div>
  );
}
