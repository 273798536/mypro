import { type LucideIcon, TrendingDown, TrendingUp } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  accent: "cyan" | "amber" | "green" | "red" | "violet";
  delta?: { value: string; positive: boolean };
}

const accentMap: Record<StatCardProps["accent"], { icon: string; title: string; glow: string }> = {
  cyan: { icon: "text-signal-cyan bg-signal-cyan/10 border-signal-cyan/30", title: "text-signal-cyan", glow: "group-hover:shadow-[0_0_0_1px_rgba(56,189,248,0.25),0_10px_30px_-10px_rgba(56,189,248,0.25)]" },
  amber: { icon: "text-signal-amber bg-signal-amber/10 border-signal-amber/30", title: "text-signal-amber", glow: "group-hover:shadow-[0_0_0_1px_rgba(245,158,11,0.25),0_10px_30px_-10px_rgba(245,158,11,0.25)]" },
  green: { icon: "text-signal-green bg-signal-green/10 border-signal-green/30", title: "text-signal-green", glow: "group-hover:shadow-[0_0_0_1px_rgba(16,185,129,0.25),0_10px_30px_-10px_rgba(16,185,129,0.25)]" },
  red: { icon: "text-signal-red bg-signal-red/10 border-signal-red/30", title: "text-signal-red", glow: "group-hover:shadow-[0_0_0_1px_rgba(239,68,68,0.25),0_10px_30px_-10px_rgba(239,68,68,0.25)]" },
  violet: { icon: "text-signal-violet bg-signal-violet/10 border-signal-violet/30", title: "text-signal-violet", glow: "group-hover:shadow-[0_0_0_1px_rgba(139,92,246,0.25),0_10px_30px_-10px_rgba(139,92,246,0.25)]" },
};

export default function StatCard({ title, value, subtitle, icon: Icon, accent, delta }: StatCardProps) {
  const style = accentMap[accent];
  return (
    <div className={`stat-card group transition-shadow duration-300 ${style.glow}`}>
      <div className="relative flex items-start justify-between">
        <div>
          <div className={`text-[11px] font-semibold uppercase tracking-wider ${style.title}`}>{title}</div>
          <div className="mt-2 flex items-baseline gap-2">
            <div className="text-3xl font-black font-mono tracking-tight text-slate-100">{value}</div>
            {delta && (
              <div className={`inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${delta.positive ? "bg-signal-green/15 text-signal-green" : "bg-signal-red/15 text-signal-red"}`}>
                {delta.positive ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                {delta.value}
              </div>
            )}
          </div>
          {subtitle && <div className="mt-1 text-xs text-ink-500">{subtitle}</div>}
        </div>
        <div className={`grid h-11 w-11 place-items-center rounded-lg border ${style.icon}`}>
          <Icon size={20} />
        </div>
      </div>
    </div>
  );
}
