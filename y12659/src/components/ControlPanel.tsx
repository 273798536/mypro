import { useEffect, useRef } from 'react';
import { Play, Pause, RotateCcw, Gauge, SkipForward, SkipBack, FileText } from 'lucide-react';
import { useDemoStore } from '@/store/demoStore';
import { formatTime } from '@/utils/collision';
import { TOTAL_DURATION, presetEvents } from '@/data/mockData';
import { useNavigate } from 'react-router-dom';

export default function ControlPanel() {
  const navigate = useNavigate();
  const {
    status, currentTime, playSpeed,
    setStatus, setPlaySpeed, tick, seekTo, restart,
  } = useDemoStore();

  const rafRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);

  useEffect(() => {
    if (status === 'playing') {
      lastTimeRef.current = performance.now();
      const loop = (now: number) => {
        const delta = now - lastTimeRef.current;
        lastTimeRef.current = now;
        tick(delta);
        rafRef.current = requestAnimationFrame(loop);
      };
      rafRef.current = requestAnimationFrame(loop);
    }
    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [status, tick]);

  useEffect(() => {
    if (status === 'finished') {
      navigate('/review');
    }
  }, [status, navigate]);

  const togglePlay = () => {
    if (status === 'idle') setStatus('playing');
    else if (status === 'playing') setStatus('paused');
    else if (status === 'paused') setStatus('playing');
  };

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    if (status === 'playing') setStatus('paused');
    seekTo(val);
  };

  const stepFrame = (dir: 1 | -1) => {
    if (status === 'playing') setStatus('paused');
    seekTo(currentTime + dir * 0.1);
  };

  const progressPct = (currentTime / TOTAL_DURATION) * 100;

  return (
    <div className="bg-mine-panel border-t border-mine-border px-4 py-3">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <button
            onClick={() => stepFrame(-1)}
            disabled={currentTime <= 0}
            className="p-2 rounded bg-mine-card hover:bg-mine-border transition disabled:opacity-40"
            title="后退一帧"
          >
            <SkipBack className="w-4 h-4" />
          </button>
          <button
            onClick={togglePlay}
            className={`p-3 rounded-lg transition font-semibold flex items-center gap-2 ${
              status === 'playing'
                ? 'bg-orange-600 hover:bg-orange-500 text-white shadow-lg shadow-orange-600/30'
                : 'bg-gradient-to-r from-mine-rock to-orange-500 hover:from-orange-500 hover:to-mine-rock text-white shadow-lg shadow-orange-600/30'
            }`}
          >
            {status === 'playing' ? (
              <><Pause className="w-5 h-5" /> 暂停</>
            ) : status === 'paused' ? (
              <><Play className="w-5 h-5" /> 继续</>
            ) : (
              <><Play className="w-5 h-5" /> 开始演示</>
            )}
          </button>
          <button
            onClick={() => stepFrame(1)}
            disabled={currentTime >= TOTAL_DURATION}
            className="p-2 rounded bg-mine-card hover:bg-mine-border transition disabled:opacity-40"
            title="前进一帧"
          >
            <SkipForward className="w-4 h-4" />
          </button>
          <button
            onClick={restart}
            className="p-2 rounded bg-mine-card hover:bg-mine-border transition flex items-center gap-1.5 text-sm"
          >
            <RotateCcw className="w-4 h-4" /> 重开
          </button>
        </div>

        <div className="h-8 w-px bg-mine-border" />

        <div className="flex items-center gap-1.5">
          <Gauge className="w-4 h-4 text-mine-muted" />
          {([0.5, 1, 2] as const).map((s) => (
            <button
              key={s}
              onClick={() => setPlaySpeed(s)}
              className={`px-2.5 py-1 rounded text-xs font-mono transition ${
                playSpeed === s
                  ? 'bg-mine-rock text-white'
                  : 'bg-mine-card text-mine-muted hover:text-white hover:bg-mine-border'
              }`}
            >
              {s}x
            </button>
          ))}
        </div>

        <div className="h-8 w-px bg-mine-border" />

        <div className="flex-1">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 right-0 top-1/2 -translate-y-1/2 h-1.5 rounded-full bg-mine-card overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-blue-500 via-yellow-500 to-red-500 transition-all"
                style={{ width: `${progressPct}%` }}
              />
            </div>
            {presetEvents.map((e) => (
              <div
                key={e.id}
                className="absolute top-1/2 -translate-y-1/2 w-2.5 h-2.5 rotate-45"
                style={{
                  left: `${(e.timestamp / TOTAL_DURATION) * 100}%`,
                  backgroundColor:
                    e.type === 'out-of-bounds' ? '#D7263D' :
                    e.type === 'data-missing' ? '#8B5CF6' :
                    '#F59E0B',
                }}
                title={`${e.timestamp.toFixed(1)}s: ${e.description}`}
              />
            ))}
            <input
              type="range"
              min={0}
              max={TOTAL_DURATION}
              step={0.05}
              value={currentTime}
              onChange={handleSliderChange}
              className="relative w-full appearance-none bg-transparent cursor-pointer h-6 z-10"
              style={{
                WebkitAppearance: 'none',
              }}
            />
          </div>
          <style>{`
            input[type=range]::-webkit-slider-thumb {
              -webkit-appearance: none;
              width: 16px; height: 16px; border-radius: 50%;
              background: #E87722; border: 2px solid #fff;
              cursor: pointer; box-shadow: 0 2px 6px rgba(0,0,0,0.4);
            }
          `}</style>
        </div>

        <div className="h-8 w-px bg-mine-border" />

        <div className="flex items-center gap-3">
          <div className="font-mono text-sm">
            <span className="text-mine-muted">{formatTime(currentTime)}</span>
            <span className="text-mine-muted mx-1">/</span>
            <span className="text-white">{formatTime(TOTAL_DURATION)}</span>
          </div>
          <button
            onClick={() => navigate('/review')}
            className="p-2 rounded bg-mine-card hover:bg-mine-border transition flex items-center gap-1.5 text-sm"
            title="结算与复盘"
          >
            <FileText className="w-4 h-4" /> 结算
          </button>
        </div>
      </div>
    </div>
  );
}
