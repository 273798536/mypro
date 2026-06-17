import { CheckCircle2, Undo2, Edit3, User } from "lucide-react";
import type { ReviewRecord } from "@/types";
import { actionTypeLabel, formatDateFull } from "@/utils/helpers";
import { cn } from "@/lib/utils";
import { diffWords } from "@/utils/helpers";

interface Props {
  records: ReviewRecord[];
}

const actionStyle = {
  confirm: {
    dot: "bg-moss-500",
    line: "bg-moss-200",
    badge: "bg-moss-50 text-moss-700 border-moss-200",
    icon: CheckCircle2,
  },
  revoke: {
    dot: "bg-crimson-500",
    line: "bg-crimson-200",
    badge: "bg-crimson-50 text-crimson-700 border-crimson-200",
    icon: Undo2,
  },
  modify: {
    dot: "bg-navy-500",
    line: "bg-navy-200",
    badge: "bg-navy-50 text-navy-700 border-navy-200",
    icon: Edit3,
  },
};

export default function Timeline({ records }: Props) {
  if (records.length === 0) {
    return (
      <div className="card p-8 text-center animate-fade-in-up">
        <p className="text-sm text-navy-500">暂无改判历史记录</p>
      </div>
    );
  }

  return (
    <div className="relative pl-4 animate-fade-in-up">
      <div className="absolute left-[14px] top-2 bottom-2 w-px bg-navy-100" />
      <ul className="space-y-5">
        {records.map((r, idx) => {
          const style = actionStyle[r.action_type];
          const Icon = style.icon;
          const diff = diffWords(r.before_summary, r.after_summary);
          return (
            <li
              key={r.id}
              className={cn(
                "relative",
                `animate-fade-in-up stagger-${Math.min(idx + 1, 6)}`
              )}
            >
              <div
                className={cn(
                  "absolute -left-4 top-1 w-7 h-7 rounded-full border-4 border-white flex items-center justify-center shadow-sm z-10",
                  style.dot
                )}
              >
                <Icon
                  className="w-3 h-3 text-white"
                  strokeWidth={2.5}
                />
              </div>
              <div className="ml-5 card p-4 hover:shadow-card-hover transition-shadow">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={cn(
                        "chip border",
                        style.badge
                      )}
                    >
                      {actionTypeLabel(r.action_type)}
                    </span>
                    <span className="inline-flex items-center gap-1 text-xs text-navy-500">
                      <User className="w-3 h-3" strokeWidth={1.75} />
                      {r.operator}
                    </span>
                  </div>
                  <time className="text-xs text-navy-400 font-mono">
                    {formatDateFull(r.created_at)}
                  </time>
                </div>

                {r.before_summary !== r.after_summary && (
                  <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                    <div className="rounded-lg bg-navy-50/60 p-3">
                      <p className="text-[11px] font-semibold text-navy-500 uppercase tracking-wide mb-1.5">
                        变更前摘要
                      </p>
                      <p
                        className="text-navy-700 leading-relaxed"
                        dangerouslySetInnerHTML={{
                          __html: diff.beforeHtml || r.before_summary,
                        }}
                      />
                    </div>
                    <div className="rounded-lg bg-moss-50/50 p-3">
                      <p className="text-[11px] font-semibold text-moss-600 uppercase tracking-wide mb-1.5">
                        变更后摘要
                      </p>
                      <p
                        className="text-navy-700 leading-relaxed"
                        dangerouslySetInnerHTML={{
                          __html: diff.afterHtml || r.after_summary,
                        }}
                      />
                    </div>
                  </div>
                )}

                {r.note && (
                  <div className="mt-3 rounded-lg bg-amber-50/60 border border-amber-100 p-3">
                    <p className="text-[11px] font-semibold text-amber-700 uppercase tracking-wide mb-1">
                      操作说明 / 改判理由
                    </p>
                    <p className="text-sm text-navy-700 leading-relaxed">
                      {r.note}
                    </p>
                  </div>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
