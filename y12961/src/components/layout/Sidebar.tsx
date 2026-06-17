import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  Waypoints,
  GitCompareArrows,
  ShieldAlert,
  DatabaseBackup,
  ScanLine,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/", label: "总览看板", icon: LayoutDashboard, end: true },
  { to: "/routes", label: "路由明细", icon: Waypoints, end: false },
  { to: "/schema", label: "Schema 对比", icon: GitCompareArrows, end: false },
  { to: "/audit", label: "审计追踪", icon: ShieldAlert, end: false },
  { to: "/backup", label: "备份记录对比", icon: DatabaseBackup, end: false },
];

export default function Sidebar() {
  return (
    <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-line bg-ink-950/60 backdrop-blur-md lg:flex">
      <div className="flex items-center gap-2.5 px-5 py-5">
        <div className="relative flex h-9 w-9 items-center justify-center rounded-lg border border-sky/40 bg-sky/10 text-sky">
          <ScanLine className="h-5 w-5" />
          <span className="absolute -right-0.5 -top-0.5 h-2 w-2 animate-pulseDot rounded-full bg-emerald" />
        </div>
        <div className="leading-tight">
          <div className="text-[13px] font-semibold tracking-tight text-zinc-100">
            分库分表路由检查
          </div>
          <div className="font-mono text-[10px] text-ink-500">
            audit console
          </div>
        </div>
      </div>

      <nav className="mt-2 flex flex-1 flex-col gap-1 px-3">
        {NAV.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              cn(
                "group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] font-medium transition-all",
                isActive
                  ? "bg-sky/10 text-sky"
                  : "text-ink-500 hover:bg-ink-850 hover:text-zinc-200",
              )
            }
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <span className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-full bg-sky shadow-[0_0_8px_rgba(56,189,248,0.8)]" />
                )}
                <item.icon className="h-[18px] w-[18px]" />
                <span>{item.label}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="mx-3 mb-4 rounded-lg border border-line bg-ink-900/60 p-3">
        <div className="font-mono text-[10px] uppercase tracking-wider text-ink-500">
          同一批数据
        </div>
        <p className="mt-1 text-[11px] leading-relaxed text-ink-500">
          图表 · 明细 · 下载 均来自当前批次，不二次拼装
        </p>
      </div>
    </aside>
  );
}
