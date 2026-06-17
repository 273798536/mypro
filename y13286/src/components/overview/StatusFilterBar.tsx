import { useMemo } from "react";
import { CheckCircle2, Clock, AlertTriangle, MapPin } from "lucide-react";
import { useReviewStore } from "@/store/reviewStore";
import { STATUS_LABEL, type PointStatus } from "@/types";

const items: { key: PointStatus | "all"; icon: typeof MapPin; color: string }[] = [
  { key: "all", icon: MapPin, color: "ink" },
  { key: "processed", icon: CheckCircle2, color: "moss" },
  { key: "pending_site", icon: Clock, color: "amber" },
  { key: "conflict", icon: AlertTriangle, color: "clay" },
];

const colorMap: Record<string, { active: string; inactive: string }> = {
  ink: { active: "bg-ink-700 text-white border-ink-700", inactive: "bg-white text-ink-700 border-ink-200 hover:border-ink-400" },
  moss: { active: "bg-moss-700 text-white border-moss-700", inactive: "bg-white text-moss-700 border-moss-200 hover:border-moss-400" },
  amber: { active: "bg-amber-600 text-white border-amber-600", inactive: "bg-white text-amber-700 border-amber-200 hover:border-amber-400" },
  clay: { active: "bg-clay-600 text-white border-clay-600", inactive: "bg-white text-clay-700 border-clay-200 hover:border-clay-400" },
};

const countBg: Record<string, { active: string; inactive: { bg: string; color: string } }> = {
  ink: { active: "bg-ink-800/30 text-ink-100", inactive: { bg: "#e8eff7", color: "#1e3a5f" } },
  moss: { active: "bg-white/25 text-white", inactive: { bg: "#dff0e5", color: "#15803d" } },
  amber: { active: "bg-white/25 text-white", inactive: { bg: "#fff2d9", color: "#d97706" } },
  clay: { active: "bg-white/25 text-white", inactive: { bg: "#fde7e4", color: "#b03421" } },
};

export default function StatusFilterBar() {
  const activeStatus = useReviewStore((s) => s.activeStatus);
  const setActiveStatus = useReviewStore((s) => s.setActiveStatus);
  const points = useReviewStore((s) => s.points);

  const counts = useMemo(
    () =>
      points.reduce(
        (acc, p) => {
          acc.all += 1;
          if (p.status === "processed") acc.processed += 1;
          else if (p.status === "pending_site") acc.pending_site += 1;
          else if (p.status === "conflict") acc.conflict += 1;
          return acc;
        },
        { all: 0, processed: 0, pending_site: 0, conflict: 0 },
      ),
    [points],
  );

  return (
    <div className="flex items-center gap-3 flex-wrap">
      {items.map((it, i) => {
        const Icon = it.icon;
        const active = activeStatus === it.key;
        const c = colorMap[it.color];
        const cb = countBg[it.color];
        return (
          <button
            key={it.key}
            onClick={() => setActiveStatus(it.key)}
            className={`flex items-center gap-2.5 px-5 py-2.5 rounded border-2 font-medium text-sm transition-all animate-fade-in-up ${
              active ? c.active : c.inactive
            }`}
            style={{ animationDelay: `${i * 50}ms` }}
          >
            <Icon className="w-4 h-4" />
            <span>{STATUS_LABEL[it.key]}</span>
            <span
              className="text-xs px-2 py-0.5 rounded-full font-bold"
              style={active ? undefined : { backgroundColor: cb.inactive.bg, color: cb.inactive.color }}
            >
              {counts[it.key]}
            </span>
          </button>
        );
      })}
    </div>
  );
}
