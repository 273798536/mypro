import { Clock, User, AlertOctagon, CheckCircle2 } from "lucide-react";
import type { VersionRecord } from "@/types";

interface Props {
  versions: VersionRecord[];
}

const nodeStyle: Record<VersionRecord["nodeType"], string> = {
  processed: "processed",
  pending: "pending",
  conflict: "conflict",
};

export default function VersionTimeline({ versions }: Props) {
  const sorted = [...versions].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );

  return (
    <div className="bg-white rounded border border-ink-200 p-5 animate-fade-in-up" style={{ animationDelay: "80ms" }}>
      <h3 className="font-serif text-base font-semibold text-ink-800 mb-4 flex items-center gap-2">
        <Clock className="w-4 h-4 text-ink-600" />
        历史版本时间线
        <span className="ml-2 text-xs font-normal text-slate-500">（时间倒序，新→旧）</span>
      </h3>

      <div className="relative pl-5 border-l-2 border-ink-200 space-y-5">
        {sorted.map((v) => (
          <div
            key={v.id}
            className={`timeline-node ${nodeStyle[v.nodeType]} relative transition-all hover:pl-1 ${
              v.isOverridden ? "opacity-60" : ""
            }`}
          >
            <div
              className={`p-3 rounded border ${
                v.isOverridden
                  ? "bg-clay-50 border-clay-200"
                  : v.nodeType === "pending"
                    ? "bg-amber-50 border-amber-200"
                    : "bg-moss-50/40 border-moss-200"
              }`}
            >
              <div className="flex items-start justify-between gap-2 mb-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h4
                    className={`font-semibold text-sm ${
                      v.isOverridden ? "line-through text-slate-500" : "text-ink-800"
                    }`}
                  >
                    {v.versionLabel}
                  </h4>
                  {v.isOverridden && (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-clay-600 text-white">
                      <AlertOctagon className="w-3 h-3" />
                      已被覆盖
                    </span>
                  )}
                  {!v.isOverridden && v.nodeType === "processed" && (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-moss-600 text-white">
                      <CheckCircle2 className="w-3 h-3" />
                      当前有效
                    </span>
                  )}
                </div>
                <span className="text-[11px] text-slate-500 shrink-0">{v.createdAt}</span>
              </div>

              <p
                className={`text-sm leading-relaxed mb-2 ${
                  v.isOverridden ? "line-through text-slate-500" : "text-ink-700"
                }`}
              >
                {v.content}
              </p>

              {v.overrideNote && (
                <div className="p-2 rounded bg-white border border-clay-300 border-dashed">
                  <p className="text-[11px] font-semibold text-clay-700 mb-0.5">被覆盖说明</p>
                  <p className="text-xs text-clay-800 leading-relaxed">{v.overrideNote}</p>
                </div>
              )}

              <div className="flex items-center gap-1 mt-2 text-[11px] text-slate-500">
                <User className="w-3 h-3" />
                {v.author}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
