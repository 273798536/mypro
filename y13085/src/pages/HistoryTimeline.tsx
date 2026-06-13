import { useSceneStore } from "../hooks/useSceneStore";
import { STATUS_LABEL_MAP, EVENT_TYPE_LABEL_MAP } from "../data/types";
import type { TimelineEvent } from "../data/types";
import ExportButton from "../components/common/ExportButton";
import CaliberChangeTag from "../components/panels/CaliberChangeTag";
import { Link } from "react-router-dom";
import {
  ArrowLeft,
  AlertTriangle,
  Package,
  RotateCcw,
  PenLine,
  CheckCircle2,
  MessageSquare,
  CircleDot,
} from "lucide-react";

const EVENT_ICONS: Record<string, React.ReactNode> = {
  import: <Package size={14} />,
  retraction: <RotateCcw size={14} />,
  modification: <PenLine size={14} />,
  confirm: <CheckCircle2 size={14} />,
  note: <MessageSquare size={14} />,
};

const STATUS_COLORS: Record<string, string> = {
  confirmed: "text-emerald-400 bg-emerald-900/20 border-emerald-700/30",
  pending: "text-amber-400 bg-amber-900/20 border-amber-700/30",
  retracted: "text-red-400 bg-red-900/20 border-red-700/30",
  modified: "text-blue-400 bg-blue-900/20 border-blue-700/30",
};

export default function HistoryTimeline() {
  const { timelineEvents, pendingConfirms, lightObjects, materials } = useSceneStore();

  const sorted = [...timelineEvents].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  const unresolvedPending = pendingConfirms.filter((pc) => !pc.resolved);

  const grouped = sorted.reduce<Record<string, TimelineEvent[]>>((acc, evt) => {
    const date = evt.timestamp.slice(0, 10);
    if (!acc[date]) acc[date] = [];
    acc[date].push(evt);
    return acc;
  }, {});

  return (
    <div className="min-h-screen bg-[#0E0E1A] text-zinc-200">
      <header className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 bg-[#12121E]/95 backdrop-blur-md border-b border-zinc-800/60">
        <div className="flex items-center gap-4">
          <Link
            to="/"
            className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            <ArrowLeft size={14} />
            返回工作台
          </Link>
          <div className="w-px h-5 bg-zinc-800/60" />
          <h1 className="text-base font-serif text-zinc-100">历史时间线</h1>
        </div>
        <ExportButton
          events={timelineEvents}
          materials={materials}
          pendingConfirms={pendingConfirms}
        />
      </header>

      <div className="max-w-4xl mx-auto px-6 py-8">
        {unresolvedPending.length > 0 && (
          <div className="mb-8 bg-amber-900/10 border border-amber-700/30 rounded-lg p-5">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle size={16} className="text-amber-500" />
              <h3 className="text-sm font-semibold text-amber-400">
                待确认事项 ({unresolvedPending.length})
              </h3>
            </div>
            <div className="space-y-3">
              {unresolvedPending.map((pc) => (
                <div
                  key={pc.id}
                  className="bg-amber-900/10 border border-amber-700/20 rounded px-4 py-3"
                >
                  <p className="text-sm text-zinc-200">{pc.reason}</p>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {pc.impactScope.map((scope, idx) => (
                      <span
                        key={idx}
                        className="text-[11px] text-amber-400 bg-amber-900/20 px-2 py-0.5 rounded"
                      >
                        {scope}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-8">
          {Object.entries(grouped).map(([date, events]) => (
            <div key={date}>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-2.5 h-2.5 rounded-full bg-copper" />
                <h2 className="text-sm font-semibold text-copper">{date}</h2>
                <span className="text-[11px] text-zinc-600">
                  {events.length} 条记录
                </span>
              </div>

              <div className="ml-1.25 border-l-2 border-zinc-800/60 pl-6 space-y-0">
                {events.map((evt) => {
                  const light = lightObjects.find(
                    (l) => l.id === evt.relatedObjectId
                  );
                  return (
                    <div
                      key={evt.id}
                      className={`relative py-4 border-b border-zinc-800/30 last:border-0 ${
                        evt.isCaliberChange
                          ? "border-l-2 border-l-amber-500 -ml-[2px]"
                          : ""
                      }`}
                    >
                      <div className="absolute -left-[31px] top-5 w-2 h-2 rounded-full bg-zinc-700" />

                      <div className="flex items-start gap-3">
                        <span
                          className={`mt-0.5 ${
                            evt.isCaliberChange ? "text-amber-500" : "text-zinc-500"
                          }`}
                        >
                          {EVENT_ICONS[evt.type] || <CircleDot size={14} />}
                        </span>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm text-zinc-200">
                              {evt.description}
                            </span>
                            <span
                              className={`text-[10px] px-1.5 py-0.5 rounded border ${
                                STATUS_COLORS[evt.status]
                              }`}
                            >
                              {STATUS_LABEL_MAP[evt.status]}
                            </span>
                            <CaliberChangeTag changed={evt.isCaliberChange} />
                          </div>
                          <div className="flex items-center gap-3 mt-1.5">
                            <span className="text-[11px] text-zinc-600 font-mono">
                              {evt.timestamp.slice(11, 16)}
                            </span>
                            <span className="text-[10px] text-zinc-600">
                              {EVENT_TYPE_LABEL_MAP[evt.type]}
                            </span>
                            {light && (
                              <span className="text-[10px] text-zinc-600">
                                关联: {light.name}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
