import { Play, Pause, SkipBack, SkipForward, Volume2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { SectionFrame } from '@shared/types';

interface Props {
  totalFrames: number;
  sections: SectionFrame[];
  currentFrame: number;
  onChange: (frame: number) => void;
}

export default function TimePlayback({ totalFrames, sections, currentFrame, onChange }: Props) {
  const [playing, setPlaying] = useState(false);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    if (playing) {
      timerRef.current = window.setInterval(() => {
        onChange((currentFrame + 1) % totalFrames);
      }, 800);
    }
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [playing, currentFrame, totalFrames, onChange]);

  const sectionFrames = new Set(sections.map((s) => s.frameIndex));

  return (
    <div className="bg-slate-850 border-t border-slate-700 px-4 py-3">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1">
          <button
            onClick={() => onChange(Math.max(0, currentFrame - 1))}
            className="p-1.5 rounded hover:bg-slate-700 text-slate-300 transition-colors"
            title="上一帧"
          >
            <SkipBack className="w-4 h-4" />
          </button>
          <button
            onClick={() => setPlaying((p) => !p)}
            className="p-2 rounded bg-safety-orange/20 text-safety-orange hover:bg-safety-orange/30 transition-colors"
            title={playing ? '暂停' : '播放'}
          >
            {playing ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          </button>
          <button
            onClick={() => onChange(Math.min(totalFrames - 1, currentFrame + 1))}
            className="p-1.5 rounded hover:bg-slate-700 text-slate-300 transition-colors"
            title="下一帧"
          >
            <SkipForward className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 relative">
          <div className="h-8 relative">
            <input
              type="range"
              min={0}
              max={totalFrames - 1}
              value={currentFrame}
              onChange={(e) => onChange(parseInt(e.target.value, 10))}
              className="absolute inset-0 w-full opacity-0 cursor-pointer z-10"
            />
            <div className="absolute inset-y-1/2 left-0 right-0 h-1 -translate-y-1/2 bg-slate-700 rounded">
              <div
                className="h-full bg-safety-orange rounded transition-all"
                style={{ width: `${(currentFrame / Math.max(1, totalFrames - 1)) * 100}%` }}
              />
            </div>
            <div className="absolute inset-y-0 left-0 right-0 flex items-center justify-between pointer-events-none px-0.5">
              {Array.from({ length: totalFrames }).map((_, i) => (
                <div key={i} className="flex flex-col items-center">
                  <div
                    className={`w-1.5 h-1.5 rounded-full ${
                      i === currentFrame
                        ? 'bg-safety-orange scale-125'
                        : sectionFrames.has(i)
                        ? 'bg-safety-blue'
                        : 'bg-slate-600'
                    } transition-all`}
                  />
                </div>
              ))}
            </div>
          </div>
          <div className="flex justify-between mt-1 text-[10px] font-mono text-slate-500">
            <span>0s</span>
            <span>{Math.floor((totalFrames * 300) / 60)}:{String(((totalFrames * 300) % 60) / 10).padStart(2, '0')}0</span>
          </div>
        </div>

        <div className="flex items-center gap-3 text-xs font-mono">
          <div className="flex items-center gap-1.5 text-slate-400">
            <span className="w-1.5 h-1.5 rounded-full bg-safety-blue" />
            剖切帧
          </div>
          <div className="px-2 py-1 rounded bg-slate-700 text-slate-200">
            帧 {currentFrame + 1} / {totalFrames}
          </div>
        </div>
      </div>
    </div>
  );
}
