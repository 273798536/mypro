import { useMemo } from 'react';
import { Play, Pause, ChevronLeft, ChevronRight } from 'lucide-react';
import { useProjectionStore } from '@/store/projectionStore';
import type { TimelineVersion } from '@/types';

interface Props {
  currentBatchId: string | null;
  onChange: (batchId: string) => void;
  playing: boolean;
  onTogglePlay: () => void;
}

export default function TimelineSlider({
  currentBatchId,
  onChange,
  playing,
  onTogglePlay,
}: Props) {
  const versions = useProjectionStore((s) => s.versions);

  const sorted = useMemo(
    () => [...versions].sort((a, b) => a.importedAt.localeCompare(b.importedAt)),
    [versions],
  );

  if (sorted.length === 0) return null;

  const currentIdx = Math.max(
    0,
    sorted.findIndex((v) => v.batchId === currentBatchId),
  );
  const current: TimelineVersion = sorted[currentIdx] ?? sorted[0];

  const min = 0;
  const max = sorted.length - 1;

  const stepTo = (i: number) => {
    const clamped = Math.min(max, Math.max(min, i));
    onChange(sorted[clamped].batchId);
  };

  return (
    <div className="border-t border-panel-border bg-panel-surface px-6 py-4">
      <div className="flex items-center gap-4">
        <button
          onClick={() => stepTo(currentIdx - 1)}
          disabled={currentIdx === 0}
          className="btn-ghost disabled:opacity-30 p-1.5"
          title="上一版本"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        <button
          onClick={onTogglePlay}
          className={`w-9 h-9 border flex items-center justify-center transition-colors ${
            playing
              ? 'bg-amber-500 border-amber-500 text-zinc-900'
              : 'border-panel-border bg-panel-bg text-zinc-300 hover:bg-panel-hover'
          }`}
        >
          {playing ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
        </button>

        <button
          onClick={() => stepTo(currentIdx + 1)}
          disabled={currentIdx === max}
          className="btn-ghost disabled:opacity-30 p-1.5"
          title="下一版本"
        >
          <ChevronRight className="w-4 h-4" />
        </button>

        <div className="flex-1 relative h-10">
          <div className="absolute top-1/2 left-0 right-0 h-1 bg-panel-border" />
          {sorted.map((v, i) => {
            const left = `${(i / max) * 100}%`;
            const active = v.batchId === current.batchId;
            return (
              <button
                key={v.batchId}
                onClick={() => onChange(v.batchId)}
                className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 group"
                style={{ left }}
              >
                <span
                  className={`block w-3 h-3 border-2 transition-all ${
                    active
                      ? 'bg-amber-500 border-amber-500 w-4 h-4'
                      : 'bg-panel-bg border-zinc-500 group-hover:border-amber-500/60'
                  }`}
                />
                <span className="absolute top-5 left-1/2 -translate-x-1/2 whitespace-nowrap text-[10px] font-mono text-zinc-500 group-hover:text-zinc-300">
                  {new Date(v.importedAt).toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' })}
                </span>
              </button>
            );
          })}
          <input
            type="range"
            min={min}
            max={max}
            value={currentIdx}
            onChange={(e) => stepTo(Number(e.target.value))}
            className="absolute inset-0 w-full opacity-0 cursor-pointer"
          />
        </div>

        <div className="w-80 shrink-0 panel px-3 py-2">
          <div className="flex items-center justify-between mb-0.5">
            <span className="text-xs font-medium text-zinc-200">{current.note}</span>
            <span className="data-mono text-[10px] text-amber-400">{current.batchId.slice(-4)}</span>
          </div>
          <div className="flex items-center gap-3 text-[10px] text-zinc-500">
            <span>
              {new Date(current.importedAt).toLocaleString('zh-CN', {
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </span>
            <span>记录 {current.recordCount}</span>
            <span className="text-amber-400">异常 {current.anomalyCount}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
