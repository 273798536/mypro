import { ClipboardCheck, CheckCircle2, Clock, AlertOctagon, MapPin } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useReviewStore } from "@/store/reviewStore";
import { STATUS_LABEL, type PointStatus } from "@/types";

const groupStyle: Record<PointStatus, { bg: string; border: string; iconBg: string; text: string }> = {
  processed: {
    bg: "bg-moss-50",
    border: "border-moss-200",
    iconBg: "bg-moss-600",
    text: "text-moss-700",
  },
  pending_site: {
    bg: "bg-amber-50",
    border: "border-amber-200",
    iconBg: "bg-amber-600",
    text: "text-amber-700",
  },
  conflict: {
    bg: "bg-clay-50",
    border: "border-clay-200",
    iconBg: "bg-clay-600",
    text: "text-clay-700",
  },
};

const statusIcon = {
  processed: CheckCircle2,
  pending_site: Clock,
  conflict: AlertOctagon,
};

export default function PrePublicChecklist() {
  const nav = useNavigate();
  const points = useReviewStore((s) => s.points);

  const groups: { key: PointStatus; title: string }[] = [
    { key: "conflict", title: "冲突记录（需优先处理）" },
    { key: "pending_site", title: "待现场看" },
    { key: "processed", title: "已处理" },
  ];

  return (
    <div className="bg-white rounded border border-ink-200 p-5 animate-fade-in-up" style={{ animationDelay: "120ms" }}>
      <h3 className="font-serif text-base font-semibold text-ink-800 mb-4 flex items-center gap-2">
        <ClipboardCheck className="w-4 h-4 text-ink-600" />
        公示前检查清单
        <span className="ml-2 text-xs font-normal text-slate-500">
          （按状态分组，便于公示前逐一过目）
        </span>
      </h3>

      <div className="space-y-5">
        {groups.map((g, gi) => {
          const Icon = statusIcon[g.key];
          const style = groupStyle[g.key];
          const items = points.filter((p) => p.status === g.key);
          return (
            <div key={g.key} className="animate-fade-in-up" style={{ animationDelay: `${140 + gi * 80}ms` }}>
              <div className="flex items-center gap-2 mb-2">
                <span className={`inline-flex items-center justify-center w-6 h-6 rounded ${style.iconBg} text-white`}>
                  <Icon className="w-3.5 h-3.5" />
                </span>
                <span className={`font-semibold text-sm ${style.text}`}>{g.title}</span>
                <span className="text-xs text-slate-500">
                  {STATUS_LABEL[g.key]} · {items.length} 条
                </span>
              </div>

              {items.length === 0 ? (
                <p className="text-xs text-slate-400 italic ml-8">无此类记录</p>
              ) : (
                <ul className={`ml-3 pl-5 border-l-2 ${style.border} space-y-1.5`}>
                  {items.map((p) => (
                    <li
                      key={p.id}
                      onClick={() => nav(`/point/${p.id}`)}
                      className={`flex items-center gap-2 p-2 rounded ${style.bg} hover:brightness-95 cursor-pointer transition-all`}
                    >
                      <MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                      <span className="text-sm font-medium text-ink-800">{p.name}</span>
                      <span className="text-xs text-slate-500 hidden md:inline">· {p.address}</span>
                      {p.hasConflict && (
                        <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded bg-clay-600 text-white font-bold shrink-0">
                          含被覆盖
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
