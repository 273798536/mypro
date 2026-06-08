import { Play, Pause, SkipBack, SkipForward, Bookmark, ChevronRight } from 'lucide-react';
import { useState } from 'react';
import { useExportStore } from '@/store/useExportStore';

export default function TimeSlider() {
  const timestamps = useExportStore((s) => s.timestamps);
  const current = useExportStore((s) => s.currentTimestamp);
  const setCurrent = useExportStore((s) => s.setCurrentTimestamp);
  const conclusions = useExportStore((s) => s.conclusions);
  const jumpToConclusion = useExportStore((s) => s.jumpToConclusion);
  const activeConclusionId = useExportStore((s) => s.activeConclusionId);

  const [playing, setPlaying] = useState(false);

  const currentIdx = timestamps.indexOf(current);
  const hasPrev = currentIdx > 0;
  const hasNext = currentIdx < timestamps.length - 1;

  const step = (delta: number) => {
    const next = Math.max(0, Math.min(timestamps.length - 1, currentIdx + delta));
    setCurrent(timestamps[next]);
  };

  const togglePlay = () => {
    setPlaying(!playing);
    if (!playing) {
      let i = currentIdx;
      const timer = setInterval(() => {
        i++;
        if (i >= timestamps.length) {
          clearInterval(timer);
          setPlaying(false);
          return;
        }
        setCurrent(timestamps[i]);
      }, 1500);
      (togglePlay as any)._timer = timer;
    } else if ((togglePlay as any)._timer) {
      clearInterval((togglePlay as any)._timer);
    }
  };

  return (
    <div className="panel-ocean px-3 py-2 flex items-center gap-3">
      <div className="flex items-center gap-1">
        <button
          className="btn-ocean p-1.5"
          disabled={!hasPrev}
          onClick={() => step(-1)}
        >
          <SkipBack className="w-3.5 h-3.5" />
        </button>
        <button className="btn-ocean-primary p-1.5" onClick={togglePlay}>
          {playing ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
        </button>
        <button
          className="btn-ocean p-1.5"
          disabled={!hasNext}
          onClick={() => step(1)}
        >
          <SkipForward className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="flex-1 relative">
        <input
          type="range"
          min={0}
          max={Math.max(0, timestamps.length - 1)}
          value={currentIdx}
          onChange={(e) => setCurrent(timestamps[Number(e.target.value)])}
          className="w-full accent-data-cyan"
        />
        <div className="flex justify-between mt-1 text-[10px] font-mono text-slate-500">
          {timestamps.map((ts, i) => {
            const c = conclusions.find((cc) => cc.timestamp === ts);
            return (
              <div key={ts} className="flex flex-col items-center">
                <span className={current === ts ? 'text-data-cyan' : ''}>{ts.slice(11, 16)}</span>
                {c && (
                  <button
                    onClick={() => jumpToConclusion(c.id)}
                    className={`mt-0.5 flex items-center gap-0.5 px-1 py-0.5 rounded ${
                      activeConclusionId === c.id
                        ? 'bg-data-cyan/20 text-data-cyan'
                        : 'text-slate-400 hover:text-data-cyan'
                    }`}
                    title={c.conclusionText}
                  >
                    <Bookmark className="w-2.5 h-2.5" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="text-[11px] font-mono text-slate-400 min-w-[100px] text-right">
        {current ? current.slice(0, 16).replace('T', ' ') : '-'}
      </div>
    </div>
  );
}

export function ConclusionList() {
  const conclusions = useExportStore((s) => s.conclusions);
  const activeConclusionId = useExportStore((s) => s.activeConclusionId);
  const jumpToConclusion = useExportStore((s) => s.jumpToConclusion);
  const setCurrent = useExportStore((s) => s.setCurrentTimestamp);

  return (
    <div className="panel-ocean p-3 flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <Bookmark className="w-4 h-4 text-data-cyan" />
        <span className="text-sm font-semibold text-slate-200">时间-结论联动</span>
      </div>
      <div className="space-y-1.5">
        {conclusions.map((c) => (
          <div
            key={c.id}
            onClick={() => { jumpToConclusion(c.id); setCurrent(c.timestamp); }}
            className={`rounded border px-2 py-1.5 cursor-pointer transition-all ${
              activeConclusionId === c.id
                ? 'border-data-cyan/60 bg-data-cyan/5 shadow-glow-cyan'
                : 'border-ocean-700 bg-ocean-800/40 hover:border-ocean-500'
            }`}
          >
            <div className="flex items-center gap-1.5">
              <span className="font-mono text-[11px] text-data-cyan">{c.timestamp.slice(11, 16)}</span>
              <span className="text-[10px] text-slate-500">·</span>
              <span className="text-[11px] font-mono text-data-green">v={c.parameterValue.toFixed(2)}</span>
              <ChevronRight className="w-3 h-3 ml-auto text-slate-500" />
            </div>
            <div className="text-[11px] text-slate-300 mt-0.5">{c.conclusionText}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
