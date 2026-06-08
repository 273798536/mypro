import { useMemo } from 'react';

interface TimeEvent {
  ts: number;
  label: string;
}

interface TimeAxisProps {
  value: number;
  onChange: (value: number) => void;
  events?: TimeEvent[];
}

export default function TimeAxis({ value, onChange, events = [] }: TimeAxisProps) {
  const sortedEvents = useMemo(() => {
    return [...events].sort((a, b) => a.ts - b.ts);
  }, [events]);

  return (
    <div className="w-full px-4 py-3 bg-slate-900/90 border-t border-slate-700/50 backdrop-blur-sm">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-slate-400 font-medium">时间轴</span>
          <span className="text-xs text-cyan-400 font-mono">
            {String(Math.floor(value)).padStart(3, '0')} / 100
          </span>
        </div>

        <div className="relative h-8 flex items-center">
          <div className="absolute inset-x-0 h-1 bg-slate-700 rounded-full top-1/2 -translate-y-1/2">
            <div
              className="absolute left-0 h-full bg-gradient-to-r from-cyan-500 to-cyan-400 rounded-full transition-all duration-75"
              style={{ width: `${value}%` }}
            />
          </div>

          {sortedEvents.map((event, idx) => (
            <div
              key={idx}
              className="absolute top-1/2 -translate-y-1/2 group"
              style={{ left: `${event.ts}%` }}
            >
              <div className="w-2.5 h-2.5 rounded-full bg-amber-400 border-2 border-slate-900 shadow-md cursor-pointer hover:scale-150 transition-transform" />
              <div className="absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-1 bg-slate-800 text-[10px] text-slate-200 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none border border-slate-600">
                {event.label}
              </div>
            </div>
          ))}

          <input
            type="range"
            min={0}
            max={100}
            step={1}
            value={value}
            onChange={(e) => onChange(Number(e.target.value))}
            className="absolute inset-x-0 w-full h-8 appearance-none bg-transparent cursor-pointer z-10"
            style={{
              background: 'transparent',
            }}
          />
        </div>

        <div className="flex justify-between mt-1 px-0.5">
          {[0, 25, 50, 75, 100].map((tick) => (
            <span key={tick} className="text-[10px] text-slate-500 font-mono">
              {tick}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
