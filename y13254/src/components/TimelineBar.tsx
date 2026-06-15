import { ChevronLeft, ChevronRight } from "lucide-react";
import { useStore } from "../store";

function formatDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function parseDate(dateStr: string): Date {
  return new Date(dateStr + "T00:00:00");
}

function getDateLabel(dateStr: string): string {
  const d = parseDate(dateStr);
  const weekdays = ["日", "一", "二", "三", "四", "五", "六"];
  return `${d.getMonth() + 1}/${d.getDate()} 周${weekdays[d.getDay()]}`;
}

export default function TimelineBar({ className = "" }: { className?: string }) {
  const timelineDate = useStore((s) => s.timelineDate);
  const setTimelineDate = useStore((s) => s.setTimelineDate);
  const items = useStore((s) => s.items);

  const current = parseDate(timelineDate);
  const dates: string[] = [];
  for (let i = -6; i <= 6; i++) {
    const d = new Date(current);
    d.setDate(d.getDate() + i);
    dates.push(formatDate(d));
  }

  const updateDateByOffset = (offset: number) => {
    const d = new Date(current);
    d.setDate(d.getDate() + offset);
    setTimelineDate(formatDate(d));
  };

  const itemDates = new Set(
    items.map((item) => new Date(item.updatedAt).toISOString().slice(0, 10)),
  );

  const currentMonthYear = `${current.getFullYear()}年${current.getMonth() + 1}月`;

  return (
    <div className={`${className} bg-white flex items-center px-4 gap-4`}>
      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={() => updateDateByOffset(-1)}
          className="w-8 h-8 rounded-md border border-slate-200 flex items-center justify-center hover:bg-slate-50 transition-all text-slate-600"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <div className="w-28 text-center">
          <div className="text-sm font-semibold text-night-600">{currentMonthYear}</div>
          <div className="text-xs text-slate-400">时间轴</div>
        </div>
        <button
          onClick={() => updateDateByOffset(1)}
          className="w-8 h-8 rounded-md border border-slate-200 flex items-center justify-center hover:bg-slate-50 transition-all text-slate-600"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 h-full flex items-center justify-center gap-1 overflow-x-auto">
        {dates.map((dateStr) => {
          const isActive = dateStr === timelineDate;
          const hasNode = itemDates.has(dateStr);
          return (
            <button
              key={dateStr}
              onClick={() => setTimelineDate(dateStr)}
              className="relative flex flex-col items-center px-3 py-2 min-w-[72px] rounded-md transition-all"
            >
              <div
                className={`px-2.5 py-1 rounded-full text-xs font-medium transition-all ${
                  isActive
                    ? "bg-night-500 text-white"
                    : hasNode
                    ? "bg-amber-50 text-amber-700 hover:bg-amber-100"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                {getDateLabel(dateStr)}
              </div>
              <div className="h-4 flex items-center justify-center mt-1">
                {hasNode && (
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      isActive ? "bg-white" : "bg-market-500"
                    }`}
                  />
                )}
              </div>
            </button>
          );
        })}
      </div>

      <div className="flex items-center gap-2 shrink-0 text-xs text-slate-400">
        <span className="w-1.5 h-1.5 rounded-full bg-market-500" />
        <span>关键节点 {itemDates.size}</span>
      </div>
    </div>
  );
}
