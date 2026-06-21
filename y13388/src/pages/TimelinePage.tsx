import AppHeader from "@/components/AppHeader";
import ExportDropdown from "@/components/ExportDropdown";
import { useTimelineStore } from "@/store/timelineStore";
import { EVENT_COLORS, EVENT_TYPE, type EventTypeKey } from "@/utils/constants";
import { formatDate, formatRelativeTime } from "@/utils/formatters";
import { useNavigate } from "react-router-dom";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  FilterX,
  GitBranch,
  History,
  Layers,
  MessageSquarePlus,
  Search,
  ShieldAlert,
  Sparkles,
  UserCheck,
} from "lucide-react";

const EVENT_ICONS: Record<EventTypeKey, typeof History> = {
  SAMPLE_CREATED: Layers,
  ALGO_JUDGED: Sparkles,
  GRAY_RELEASED: GitBranch,
  MANUAL_CORRECTED: MessageSquarePlus,
  POLLUTION_MARKED: ShieldAlert,
  DECISION_MADE: UserCheck,
};

export default function TimelinePage() {
  const nav = useNavigate();
  const {
    getFilteredEvents,
    activeTypeFilters,
    keyword,
    toggleType,
    setKeyword,
    resetFilters,
  } = useTimelineStore();
  const events = getFilteredEvents();
  const activeCount = activeTypeFilters.length;

  return (
    <div className="min-h-screen">
      <AppHeader />
      <main className="mx-auto max-w-[1200px] px-6 py-6">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="text-xs uppercase tracking-[0.2em] text-signal-violet/80">Timeline · Audit Trail</div>
            <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-100">
              历史时间线
              <span className="ml-3 align-middle text-sm font-normal text-ink-500">
                页面状态与导出文件保持一致
              </span>
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-500" />
              <input
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder="搜索事件、样本、版本..."
                className="input-field !w-72 pl-8 !py-1.5"
              />
            </div>
            <ExportDropdown context="timeline" />
          </div>
        </div>

        <div className="mb-5 panel p-4">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="section-title mb-2">
                <Activity size={15} className="text-signal-violet" />
                事件类型筛选
                <span className="ml-2 text-[11px] font-normal text-ink-500">
                  已选 {activeCount}/{Object.keys(EVENT_TYPE).length} · 显示 {events.length} 条
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {(Object.keys(EVENT_TYPE) as EventTypeKey[]).map((key) => {
                  const Icon = EVENT_ICONS[key];
                  const color = EVENT_COLORS[key];
                  const active = activeTypeFilters.includes(key);
                  return (
                    <button
                      key={key}
                      onClick={() => toggleType(key)}
                      className={`inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs transition ${
                        active
                          ? `${color.border} ${color.bg} ${color.text}`
                          : "border-ink-600/60 bg-ink-800/40 text-ink-500 hover:border-signal-slate/40 hover:text-slate-300"
                      }`}
                    >
                      <span className={`h-2 w-2 rounded-full ${color.dot}`} />
                      <Icon size={12} />
                      {EVENT_TYPE[key]}
                    </button>
                  );
                })}
              </div>
            </div>
            <button
              onClick={resetFilters}
              className="btn-ghost !py-1.5 !text-xs"
              disabled={activeCount === 0 && !keyword}
            >
              <FilterX size={13} />
              重置筛选
            </button>
          </div>

          <div className="mt-4 border-t border-ink-700/50 pt-3">
            <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-ink-500">
              图例 · 与导出文件字段名一一对应
            </div>
            <div className="grid gap-2 text-[11px] md:grid-cols-3">
              {(Object.keys(EVENT_TYPE) as EventTypeKey[]).map((key) => {
                const color = EVENT_COLORS[key];
                return (
                  <div key={key} className="flex items-center gap-2 rounded border border-ink-700/40 bg-ink-900/30 px-2 py-1.5">
                    <span className={`h-2.5 w-1 rounded ${color.dot}`} />
                    <span className="font-mono text-signal-slate">{key}</span>
                    <span className="text-ink-500">→</span>
                    <span className={`${color.text}`}>{EVENT_TYPE[key]}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="panel overflow-hidden">
          {events.length === 0 ? (
            <div className="py-20 text-center text-sm text-ink-500">
              <History size={30} className="mx-auto mb-2 text-ink-500/60" />
              没有匹配的事件，试试重置筛选条件
            </div>
          ) : (
            <div className="relative">
              <div className="pointer-events-none absolute left-[27px] top-3 bottom-3 w-px bg-gradient-to-b from-signal-cyan/30 via-signal-violet/30 to-signal-amber/30" />
              <ul className="divide-y divide-ink-700/30">
                {events.map((e) => {
                  const color = EVENT_COLORS[e.type];
                  const Icon = EVENT_ICONS[e.type];
                  const isSample = !!e.sampleId;
                  const isVersion = !!e.versionId && !!e.grayConfigId;
                  return (
                    <li key={e.id} className="relative px-6 py-4 pl-16 transition hover:bg-ink-800/40">
                      <div
                        className={`absolute left-5 top-5 grid h-8 w-8 place-items-center rounded-full border-2 ${color.border} bg-ink-900 ${color.bg}`}
                      >
                        <Icon size={14} className={color.text} />
                      </div>
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className={`tag ${color.bg} ${color.text} ${color.border} border`}>
                              {EVENT_TYPE[e.type]}
                            </span>
                            <span className="font-mono text-[10px] text-ink-500 uppercase tracking-wider">
                              {e.type}
                            </span>
                            {isSample && (
                              <button
                                onClick={() => nav(`/sample/${e.sampleId}`)}
                                className="inline-flex items-center gap-1 rounded border border-signal-cyan/30 bg-signal-cyan/10 px-1.5 py-0.5 font-mono text-[11px] text-signal-cyan transition hover:bg-signal-cyan/20"
                              >
                                <Layers size={10} />
                                {e.sampleId}
                              </button>
                            )}
                            {isVersion && (
                              <>
                                <span className="inline-flex items-center gap-1 rounded border border-signal-violet/30 bg-signal-violet/10 px-1.5 py-0.5 font-mono text-[11px] text-signal-violet">
                                  <GitBranch size={10} />
                                  {e.versionId}
                                </span>
                                {e.grayConfigId && (
                                  <span className="inline-flex items-center gap-1 rounded border border-signal-cyan/20 bg-signal-cyan/5 px-1.5 py-0.5 font-mono text-[10px] text-signal-cyanSoft">
                                    {e.grayConfigId}
                                  </span>
                                )}
                              </>
                            )}
                            {e.operator && (
                              <span className="inline-flex items-center gap-1 text-[11px] text-ink-500">
                                <UserCheck size={11} />
                                {e.operator}
                              </span>
                            )}
                          </div>
                          <div className="mt-2 text-sm leading-relaxed text-slate-200">
                            {e.displayLabel}
                          </div>
                          {Object.keys(e.payload).length > 0 && (
                            <div className="mt-2 inline-block max-w-full overflow-x-auto rounded-md border border-ink-700/50 bg-ink-950/50 px-3 py-2">
                              <code className="font-mono text-[11px] text-ink-500 whitespace-pre-wrap break-all">
                                {JSON.stringify(e.payload, null, 0)}
                              </code>
                            </div>
                          )}
                        </div>
                        <div className="shrink-0 text-right">
                          <div className="font-mono text-xs text-slate-300">{formatDate(e.timestamp)}</div>
                          <div className="mt-0.5 text-[11px] text-ink-500">{formatRelativeTime(e.timestamp)}</div>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-3">
          <LegendCard title="样本生成" icon={Layers} accent="cyan" count={events.filter((e) => e.type === "SAMPLE_CREATED").length} />
          <LegendCard title="人工修正 + 污染标记" icon={AlertTriangle} accent="amber" count={events.filter((e) => e.type === "MANUAL_CORRECTED" || e.type === "POLLUTION_MARKED").length} />
          <LegendCard title="放行决策" icon={CheckCircle2} accent="green" count={events.filter((e) => e.type === "DECISION_MADE").length} />
        </div>
      </main>
    </div>
  );
}

function LegendCard({
  title,
  icon: Icon,
  accent,
  count,
}: {
  title: string;
  icon: typeof History;
  accent: "cyan" | "amber" | "green" | "violet" | "red";
  count: number;
}) {
  const cls = {
    cyan: { text: "text-signal-cyan", bg: "bg-signal-cyan/10", border: "border-signal-cyan/30" },
    amber: { text: "text-signal-amber", bg: "bg-signal-amber/10", border: "border-signal-amber/30" },
    green: { text: "text-signal-green", bg: "bg-signal-green/10", border: "border-signal-green/30" },
    violet: { text: "text-signal-violet", bg: "bg-signal-violet/10", border: "border-signal-violet/30" },
    red: { text: "text-signal-red", bg: "bg-signal-red/10", border: "border-signal-red/30" },
  }[accent];
  return (
    <div className="panel p-4">
      <div className="flex items-center gap-3">
        <div className={`grid h-10 w-10 place-items-center rounded-lg border ${cls.border} ${cls.bg}`}>
          <Icon size={18} className={cls.text} />
        </div>
        <div>
          <div className="text-[11px] uppercase tracking-wider text-ink-500">{title}</div>
          <div className={`font-mono text-2xl font-black ${cls.text}`}>{count}</div>
        </div>
      </div>
    </div>
  );
}
