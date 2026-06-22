import { AlertTriangle, XCircle, Info, Lightbulb, ChevronDown, ChevronUp } from "lucide-react";
import { useTopologyStore } from "../store/topologyStore";
import { useState } from "react";
import type { AlertItem } from "../types/topology";

const levelStyle: Record<AlertItem["level"], { ring: string; icon: React.ElementType; bg: string; dot: string }> = {
  error: {
    ring: "border-rose-200 bg-rose-50",
    icon: XCircle,
    bg: "bg-rose-500",
    dot: "text-rose-600",
  },
  warning: {
    ring: "border-amber-200 bg-amber-50",
    icon: AlertTriangle,
    bg: "bg-amber-500",
    dot: "text-amber-600",
  },
  info: {
    ring: "border-sky-200 bg-sky-50",
    icon: Info,
    bg: "bg-sky-500",
    icon_r: Info,
    dot: "text-sky-600",
  } as never,
};

export default function AlertsPanel() {
  const { alerts, records, toggleSelect } = useTopologyStore();
  const [expandedId, setExpandedId] = useState<string | null>(alerts[0]?.id || null);

  return (
    <section className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-amber-500" />
          <h2 className="text-sm font-semibold text-slate-800">复核告警 / 连续异常提示</h2>
        </div>
        <span className="text-xs text-slate-500">
          共 {alerts.length} 条 · 不要孤立处理，先看批次级原因
        </span>
      </div>
      <ul className="divide-y divide-slate-100">
        {alerts.map((a) => {
          const style = levelStyle[a.level];
          const Icon = style.icon;
          const open = expandedId === a.id;
          const recMap = Object.fromEntries(records.map((r) => [r.id, r]));
          return (
            <li key={a.id} className={`${style.ring} border-0 border-b last:border-b-0`}>
              <button
                onClick={() => setExpandedId(open ? null : a.id)}
                className="w-full px-4 py-3 flex items-start gap-3 text-left"
              >
                <div className={`h-7 w-7 rounded-full ${style.bg} text-white flex items-center justify-center flex-shrink-0`}>
                  <Icon className="h-3.5 w-3.5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-medium text-slate-800">{a.title}</span>
                    <span className="text-[11px] text-slate-500">{a.timestamp}</span>
                  </div>
                  <div className="mt-1 text-xs text-slate-600 line-clamp-2">
                    {a.detail}
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    {a.affectedRecords.map((rid) => {
                      const r = recMap[rid];
                      return (
                        <span
                          key={rid}
                          className="text-[11px] px-1.5 py-0.5 rounded-md bg-white/70 border border-white text-slate-700 hover:bg-white cursor-pointer"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleSelect(rid);
                            const el = document.getElementById(`row-${rid}`);
                            el?.scrollIntoView({ behavior: "smooth", block: "center" });
                          }}
                        >
                          {r?.sampleNo || rid}
                        </span>
                      );
                    })}
                  </div>
                </div>
                <div className="text-slate-500 pt-0.5">
                  {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </div>
              </button>
              {open && (
                <div className="px-4 pb-4 pl-14">
                  <div className="rounded-lg bg-white/80 border border-white p-3">
                    <div className="flex items-start gap-2 text-xs">
                      <Lightbulb className="h-3.5 w-3.5 text-amber-500 flex-shrink-0 mt-0.5" />
                      <div>
                        <div className="font-medium text-slate-800 mb-1">处理建议：</div>
                        <div className="text-slate-600 leading-relaxed">{a.suggestion}</div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
