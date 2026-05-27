import React, { useEffect, useRef, useState } from 'react';
import { Play, Pause, SkipBack, SkipForward } from 'lucide-react';
import type { Frame } from '../game/types';

interface ReplayBarProps {
  frames: Frame[];
  onChange: (index: number) => void;
  autoPlay?: boolean;
}

const ReplayBar: React.FC<ReplayBarProps> = ({ frames, onChange, autoPlay = false }) => {
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(autoPlay);
  const rafRef = useRef<number>();
  const lastRef = useRef<number>(0);

  useEffect(() => {
    if (!playing || frames.length === 0) return;
    const loop = (t: number) => {
      if (t - lastRef.current > 16) {
        lastRef.current = t;
        setIndex((i) => {
          const next = i + 1;
          if (next >= frames.length) {
            setPlaying(false);
            return i;
          }
          return next;
        });
      }
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [playing, frames]);

  useEffect(() => {
    onChange(index);
  }, [index, onChange]);

  const frame = frames[Math.min(index, frames.length - 1)];
  const speed = frame ? Math.sqrt(frame.vx ** 2 + frame.vy ** 2).toFixed(1) : '0';

  return (
    <div className="bg-slate-900/80 backdrop-blur rounded-xl p-4">
      <div className="flex items-center gap-4">
        <button
          onClick={() => {
            setIndex(0);
            setPlaying(false);
          }}
          className="p-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-white"
        >
          <SkipBack className="w-4 h-4" />
        </button>
        <button
          onClick={() => setPlaying(!playing)}
          className="p-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-white"
        >
          {playing ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
        </button>
        <button
          onClick={() => {
            setIndex(frames.length - 1);
            setPlaying(false);
          }}
          className="p-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-white"
        >
          <SkipForward className="w-4 h-4" />
        </button>
        <div className="flex-1">
          <input
            type="range"
            min={0}
            max={Math.max(0, frames.length - 1)}
            value={index}
            onChange={(e) => {
              setIndex(Number(e.target.value));
              setPlaying(false);
            }}
            className="w-full accent-violet-500"
          />
        </div>
        <div className="text-xs text-slate-300 font-mono whitespace-nowrap">
          t={(frame?.t ?? 0).toFixed(2)}s | v={speed}
        </div>
      </div>
    </div>
  );
};

export default ReplayBar;
