import { NavLink, Outlet } from "react-router-dom";
import { Activity, Gauge as GaugeIcon, ScrollText, GitCompareArrows } from "lucide-react";
import { useAppStore } from "@/store/useAppStore";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/workbench", label: "对齐工作台", sub: "Workbench", icon: Activity },
  { to: "/replay", label: "评测回放", sub: "Replay", icon: GitCompareArrows },
  { to: "/report", label: "报告总览", sub: "Report", icon: ScrollText },
];

export function AppLayout() {
  const samples = useAppStore((s) => s.samples);
  const leaks = useAppStore((s) => s.leaks);
  const lastExportedAt = useAppStore((s) => s.lastExportedAt);

  const dirty = samples.filter((s) => s.status === "dirty").length;
  const leakCount = leaks.length;
  const overall =
    samples.reduce((acc, s) => acc + Math.max(0, 1 - Math.abs(s.offlineMetric - s.onlineMetric)), 0) /
    Math.max(1, samples.length);

  return (
    <div className="relative z-10 flex h-full min-h-0">
      <aside className="hidden w-60 shrink-0 flex-col border-r border-ink-800 bg-ink-950/60 backdrop-blur-md md:flex">
        <div className="flex items-center gap-2.5 px-5 py-5">
          <div className="relative flex h-8 w-8 items-center justify-center rounded-md border border-signal-500/40 bg-signal-500/10">
            <GaugeIcon className="h-4 w-4 text-signal-300" />
            <span className="absolute -right-0.5 -top-0.5 h-1.5 w-1.5 animate-pulse-soft rounded-full bg-signal-400" />
          </div>
          <div className="leading-tight">
            <div className="font-serif text-lg leading-none text-ink-100">指标对齐台</div>
            <div className="font-mono text-[9px] uppercase tracking-[0.2em] text-ink-500">
              offline · online align
            </div>
          </div>
        </div>

        <nav className="mt-2 flex flex-col gap-0.5 px-3">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                cn(
                  "group flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                  isActive
                    ? "border border-signal-500/30 bg-signal-500/10 text-signal-100"
                    : "border border-transparent text-ink-400 hover:bg-ink-850 hover:text-ink-200",
                )
              }
            >
              <item.icon className="h-4 w-4" />
              <span className="flex-1">{item.label}</span>
              <span className="font-mono text-[9px] uppercase tracking-wider text-ink-600 group-hover:text-ink-500">
                {item.sub}
              </span>
            </NavLink>
          ))}
        </nav>

        <div className="mx-3 mt-5 rounded-lg border border-ink-800 bg-ink-900/50 p-3">
          <div className="field-label mb-2">全局对齐度</div>
          <div className="flex items-end gap-1">
            <span
              className={cn(
                "num font-mono text-2xl font-semibold leading-none",
                overall >= 0.9 ? "text-signal-300" : overall >= 0.75 ? "text-warn-400" : "text-danger-400",
              )}
            >
              {(overall * 100).toFixed(0)}
            </span>
            <span className="mb-0.5 font-mono text-xs text-ink-500">%</span>
          </div>
          <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-ink-800">
            <div
              className="h-full rounded-full bg-signal-400"
              style={{ width: `${overall * 100}%` }}
            />
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2 font-mono text-[10px]">
            <div className="rounded border border-ink-800 bg-ink-850 px-2 py-1.5">
              <div className="text-ink-500">脏样本</div>
              <div className="num text-base text-warn-300">{dirty}</div>
            </div>
            <div className="rounded border border-ink-800 bg-ink-850 px-2 py-1.5">
              <div className="text-ink-500">泄漏</div>
              <div className="num text-base text-danger-300">{leakCount}</div>
            </div>
          </div>
        </div>

        <div className="mt-auto px-5 py-4">
          <div className="font-mono text-[9px] uppercase tracking-wider text-ink-600">
            {lastExportedAt ? `last export · ${lastExportedAt}` : "未导出报告"}
          </div>
          <div className="mt-1 font-mono text-[9px] text-ink-700">v3.3 · 训练组只读可分享</div>
        </div>
      </aside>

      <main className="flex min-w-0 flex-1 flex-col">
        <Outlet />
      </main>
    </div>
  );
}
