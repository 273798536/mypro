import { useSceneStore } from "../../hooks/useSceneStore";
import { timelineDates } from "../../data/mockData";
import { Clock, ChevronLeft, ChevronRight } from "lucide-react";

export default function TimeSlider() {
  const { currentTimeIndex, setCurrentTimeIndex, timelineEvents, filterState } = useSceneStore();

  const currentDate = timelineDates[currentTimeIndex] || timelineDates[0];

  const eventsOnDate = timelineEvents.filter((evt) => {
    const evtDate = evt.timestamp.slice(0, 10);
    const matchesDate = evtDate === currentDate;
    if (!filterState.objectType && !filterState.zone) return matchesDate;
    const hasRelatedMatch = true;
    return matchesDate && hasRelatedMatch;
  });

  const hasCaliberEvent = eventsOnDate.some((e) => e.isCaliberChange);

  return (
    <div className="bg-[#12121E]/95 backdrop-blur-md border-t border-zinc-800/60 px-6 py-3">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1.5">
          <Clock size={14} className="text-copper" />
          <span className="text-[11px] text-zinc-500">时间轴</span>
        </div>

        <button
          onClick={() => setCurrentTimeIndex(Math.max(0, currentTimeIndex - 1))}
          disabled={currentTimeIndex === 0}
          className="p-1 text-zinc-500 hover:text-zinc-300 disabled:opacity-30 transition-colors"
        >
          <ChevronLeft size={16} />
        </button>

        <div className="flex items-center gap-1 flex-1 justify-center">
          {timelineDates.map((date, idx) => (
            <button
              key={date}
              onClick={() => setCurrentTimeIndex(idx)}
              className={`relative flex flex-col items-center px-3 py-1 rounded transition-all ${
                idx === currentTimeIndex
                  ? "bg-copper/20 text-copper"
                  : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              <span className="text-[10px]">{date.slice(5)}</span>
              <span className="text-xs font-mono">{date.slice(0, 4)}</span>
              {eventsOnDate.length > 0 && idx === currentTimeIndex && (
                <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-copper" />
              )}
              {hasCaliberEvent && idx === currentTimeIndex && (
                <span className="absolute -top-1 -left-1 w-2 h-2 rounded-full bg-amber-500" />
              )}
            </button>
          ))}
        </div>

        <button
          onClick={() => setCurrentTimeIndex(Math.min(timelineDates.length - 1, currentTimeIndex + 1))}
          disabled={currentTimeIndex === timelineDates.length - 1}
          className="p-1 text-zinc-500 hover:text-zinc-300 disabled:opacity-30 transition-colors"
        >
          <ChevronRight size={16} />
        </button>

        <div className="flex items-center gap-2 ml-4 pl-4 border-l border-zinc-800/60">
          <span className="text-[11px] text-zinc-500">当日事件</span>
          <span className="text-xs text-zinc-300 font-mono">{eventsOnDate.length}</span>
          {hasCaliberEvent && (
            <span className="text-[10px] text-amber-500 border border-amber-700/50 rounded px-1.5 py-0.5">
              含口径变更
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
