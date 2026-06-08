import { useEffect, useMemo, useRef, useState } from 'react';
import { Play, Pause, SkipBack, SkipForward, Gauge } from 'lucide-react';
import type { Keyframe } from '../../../shared/types';
import { cn } from '@/lib/utils';

interface TimelinePlayerProps {
  startMs: number;
  endMs: number;
  keyframes?: Keyframe[];
  onSeek?: (ms: number) => void;
  className?: string;
}

const SPEED_OPTIONS = [0.5, 1, 2, 4];
const TICK_COUNT = 10;

function formatMs(ms: number) {
  const sign = ms < 0 ? '-' : '';
  const abs = Math.abs(ms);
  const s = Math.floor(abs / 1000);
  const rem = Math.floor(abs % 1000);
  return `${sign}${s}.${String(rem).padStart(3, '0')}s`;
}

function interpolateParams(keyframes: Keyframe[], ms: number): Record<string, number> {
  if (keyframes.length === 0) return {};
  if (keyframes.length === 1) return keyframes[0].params;

  const sorted = [...keyframes].sort((a, b) => a.timestampMs - b.timestampMs);
  if (ms <= sorted[0].timestampMs) return sorted[0].params;
  if (ms >= sorted[sorted.length - 1].timestampMs) return sorted[sorted.length - 1].params;

  let left = sorted[0];
  let right = sorted[sorted.length - 1];
  for (let i = 0; i < sorted.length - 1; i++) {
    if (sorted[i].timestampMs <= ms && ms <= sorted[i + 1].timestampMs) {
      left = sorted[i];
      right = sorted[i + 1];
      break;
    }
  }
  const total = right.timestampMs - left.timestampMs;
  const t = total === 0 ? 0 : (ms - left.timestampMs) / total;
  const out: Record<string, number> = {};
  const keys = new Set([...Object.keys(left.params), ...Object.keys(right.params)]);
  keys.forEach((k) => {
    const lv = left.params[k] ?? 0;
    const rv = right.params[k] ?? lv;
    out[k] = lv + (rv - lv) * t;
  });
  return out;
}

export function TimelinePlayer({
  startMs,
  endMs,
  keyframes = [],
  onSeek,
  className,
}: TimelinePlayerProps) {
  const duration = Math.max(0, endMs - startMs);
  const [currentMs, setCurrentMs] = useState(startMs);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const rafRef = useRef<number | null>(null);
  const lastTickRef = useRef<number | null>(null);

  const sortedKfs = useMemo(
    () => [...keyframes].sort((a, b) => a.timestampMs - b.timestampMs),
    [keyframes],
  );

  const currentParams = useMemo(
    () => interpolateParams(sortedKfs, currentMs),
    [sortedKfs, currentMs],
  );

  const ticks = useMemo(() => {
    const arr: number[] = [];
    for (let i = 0; i <= TICK_COUNT; i++) {
      arr.push(startMs + (duration * i) / TICK_COUNT);
    }
    return arr;
  }, [startMs, duration]);

  useEffect(() => {
    if (!playing) {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
      lastTickRef.current = null;
      return;
    }
    const tick = (ts: number) => {
      if (lastTickRef.current == null) lastTickRef.current = ts;
      const dt = (ts - lastTickRef.current) * speed;
      lastTickRef.current = ts;
      setCurrentMs((prev) => {
        const next = prev + dt;
        if (next >= endMs) {
          setPlaying(false);
          return endMs;
        }
        return next;
      });
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
      lastTickRef.current = null;
    };
  }, [playing, speed, endMs]);

  useEffect(() => {
    onSeek?.(currentMs);
  }, [currentMs, onSeek]);

  const progressPct = duration === 0 ? 0 : ((currentMs - startMs) / duration) * 100;

  const seekTo = (ms: number) => {
    const clamped = Math.max(startMs, Math.min(endMs, ms));
    setCurrentMs(clamped);
  };

  const stepFrame = (dir: -1 | 1) => {
    if (sortedKfs.length === 0) {
      seekTo(currentMs + dir * 100);
      return;
    }
    const idx = sortedKfs.findIndex((k) => k.timestampMs >= currentMs);
    if (dir === 1) {
      if (idx === -1) return;
      const nextIdx = sortedKfs[idx].timestampMs > currentMs ? idx : Math.min(idx + 1, sortedKfs.length - 1);
      seekTo(sortedKfs[nextIdx].timestampMs);
    } else {
      const prevIdx = idx <= 0 ? 0 : sortedKfs[idx].timestampMs === currentMs ? Math.max(idx - 1, 0) : Math.max(idx - 1, 0);
      seekTo(sortedKfs[prevIdx].timestampMs);
    }
  };

  return (
    <div
      className={cn(
        'rounded-lg border border-deep-space-600 bg-gradient-to-b from-deep-space-800 to-deep-space-900 p-5',
        className,
      )}
    >
      <div className="flex items-center gap-4 mb-5">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => stepFrame(-1)}
            className="w-9 h-9 rounded-md bg-deep-space-700 hover:bg-deep-space-600 text-deep-space-100 flex items-center justify-center transition-colors"
            title="上一帧"
          >
            <SkipBack size={16} />
          </button>
          <button
            type="button"
            onClick={() => setPlaying((p) => !p)}
            className="w-11 h-11 rounded-md bg-ice-blue hover:bg-ice-blue-hover text-deep-space-900 flex items-center justify-center transition-colors shadow-glow-ice"
            title={playing ? '暂停' : '播放'}
          >
            {playing ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" />}
          </button>
          <button
            type="button"
            onClick={() => stepFrame(1)}
            className="w-9 h-9 rounded-md bg-deep-space-700 hover:bg-deep-space-600 text-deep-space-100 flex items-center justify-center transition-colors"
            title="下一帧"
          >
            <SkipForward size={16} />
          </button>
        </div>

        <div className="flex items-center gap-1 bg-deep-space-700/60 rounded-md p-0.5">
          {SPEED_OPTIONS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setSpeed(s)}
              className={cn(
                'px-2.5 py-1 text-xs rounded transition-colors',
                speed === s
                  ? 'bg-ice-blue text-deep-space-900 font-medium'
                  : 'text-deep-space-200 hover:text-deep-space-50',
              )}
            >
              {s}x
            </button>
          ))}
        </div>

        <div className="ml-auto flex items-center gap-2 font-mono text-sm text-ice-blue">
          <Gauge size={14} />
          <span>{formatMs(currentMs)}</span>
          <span className="text-deep-space-400">/</span>
          <span className="text-deep-space-300">{formatMs(endMs)}</span>
        </div>
      </div>

      <div className="relative">
        <div className="relative h-10">
          <div className="absolute inset-x-0 top-5 h-2 rounded-full bg-deep-space-700 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-ice-blue to-cyan-300 shadow-glow-ice"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          {sortedKfs.map((kf) => {
            const pct = duration === 0 ? 0 : ((kf.timestampMs - startMs) / duration) * 100;
            return (
              <button
                key={kf.id}
                type="button"
                onClick={() => seekTo(kf.timestampMs)}
                title={`${kf.label} · ${formatMs(kf.timestampMs)}`}
                className="absolute top-5 -translate-y-1/2 -translate-x-1/2 w-3.5 h-3.5 rounded-full bg-amber-warn border-2 border-deep-space-900 hover:scale-125 transition-transform shadow-glow-amber"
                style={{ left: `${pct}%` }}
              />
            );
          })}
          <input
            type="range"
            min={startMs}
            max={endMs}
            step={1}
            value={currentMs}
            onChange={(e) => seekTo(Number(e.target.value))}
            className="absolute inset-x-0 top-0 w-full h-10 opacity-0 cursor-pointer z-10"
          />
          <div
            className="absolute top-5 -translate-y-1/2 -translate-x-1/2 w-5 h-5 rounded-full bg-ice-blue border-2 border-white pointer-events-none shadow-glow-ice"
            style={{ left: `${progressPct}%` }}
          />
        </div>
        <div className="mt-1 flex justify-between px-1 text-[10px] font-mono text-deep-space-400">
          {ticks.map((t, i) => (
            <div key={i} className="flex flex-col items-center">
              <div className="w-px h-2 bg-deep-space-600" />
              <span className="mt-0.5">{formatMs(t)}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-6 rounded-md border border-deep-space-600 bg-deep-space-900/60">
        <div className="px-4 py-2 border-b border-deep-space-600 text-xs font-semibold text-deep-space-200 uppercase tracking-wide">
          实时参数
        </div>
        <div className="p-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {Object.keys(currentParams).length === 0 ? (
            <div className="col-span-full text-sm text-deep-space-400 py-4 text-center">
              暂无参数数据
            </div>
          ) : (
            Object.entries(currentParams).map(([k, v]) => (
              <div key={k} className="flex flex-col">
                <span className="text-xs text-deep-space-400">{k}</span>
                <span className="font-mono text-sm text-ice-blue">
                  {typeof v === 'number' ? v.toFixed(3) : String(v)}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

export default TimelinePlayer;
