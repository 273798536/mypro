import { NavLink, useLocation } from "react-router-dom";
import {
  AlertTriangle,
  BarChart3,
  Battery,
  Box,
  Clock,
  FileSpreadsheet,
  LayoutDashboard,
  X,
} from "lucide-react";
import { useAppStore, useStats } from "../../store/appStore";
import { clsx } from "clsx";

const NAV_ITEMS = [
  { key: "dashboard", to: "/", label: "工作台", icon: LayoutDashboard, hint: "首页总览" },
  { key: "3d", to: "/3d-panel", label: "3D联动面板", icon: Box, hint: "点选+时间轴+日志" },
  { key: "history", to: "/history/batt_17", label: "历史追溯", icon: Clock, hint: "备注&截图版本" },
  { key: "anomaly", to: "/anomaly", label: "异常隔离中心", icon: AlertTriangle, hint: "方向异常+跳变" },
  { key: "export", to: "/export", label: "报告导出", icon: FileSpreadsheet, hint: "样例+队列" },
];

export function Sidebar() {
  const location = useLocation();
  const activeNav = useAppStore((s) => s.ui.activeNav);
  const setActiveNav = useAppStore((s) => s.setActiveNav);
  const stats = useStats();

  const activeKey =
    NAV_ITEMS.find((n) =>
      n.to === "/" ? location.pathname === "/" : location.pathname.startsWith(n.to),
    )?.key ?? activeNav;

  return (
    <aside className="flex h-full w-64 shrink-0 flex-col border-r border-deepspace-700/60 bg-deepspace-900/70">
      <div className="flex items-center gap-3 border-b border-deepspace-700/50 px-5 py-5">
        <div className="relative flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-cyber-500/30 to-cyber-500/5 shadow-glow-cyber">
          <Battery className="h-5 w-5 text-cyber-400" />
          <span className="absolute -right-1 -top-1 h-2.5 w-2.5 animate-pulseglow rounded-full bg-alert-500"></span>
        </div>
        <div className="flex flex-col">
          <span className="font-mono text-sm font-bold tracking-wider text-cyber-400">
            BR<span className="text-slate-200">·Analyzer</span>
          </span>
          <span className="text-[10px] uppercase tracking-[0.18em] text-slate-500">
            Battery Resistance
          </span>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <div className="section-title px-2 pb-3">主导航</div>
        <ul className="space-y-1">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = activeKey === item.key;
            return (
              <li key={item.key}>
                <NavLink
                  to={item.to}
                  onClick={() => setActiveNav(item.key)}
                  className={clsx(
                    "group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-all",
                    isActive
                      ? "bg-gradient-to-r from-cyber-500/15 to-transparent text-cyber-300 shadow-[inset_2px_0_0_0_#00D4AA]"
                      : "text-slate-400 hover:bg-deepspace-800/60 hover:text-slate-200",
                  )}
                >
                  <Icon
                    className={clsx(
                      "h-4 w-4",
                      isActive ? "text-cyber-400" : "text-slate-500 group-hover:text-cyber-400/70",
                    )}
                  />
                  <span className="flex-1 font-medium">{item.label}</span>
                  {item.key === "anomaly" && (
                    <span className="chip-alert !py-0 !text-[10px]">
                      {stats.directionAnomalies + stats.jumps}
                    </span>
                  )}
                  {item.key === "dashboard" && stats.unaudited > 0 && (
                    <span className="chip-amber !py-0 !text-[10px]">{stats.unaudited}</span>
                  )}
                </NavLink>
              </li>
            );
          })}
        </ul>

        <div className="mt-8 section-title px-2 pb-3">当前批次</div>
        <div className="mx-1 rounded-lg border border-deepspace-700/50 bg-deepspace-800/40 p-3">
          <div className="flex items-center justify-between">
            <span className="font-mono text-xs text-cyber-400">B20260612-03</span>
            <span className="chip-cyber !text-[10px]">进行中</span>
          </div>
          <div className="mt-2 space-y-1.5 text-xs text-slate-400">
            <div className="flex justify-between">
              <span>电池总数</span>
              <span className="data-value text-slate-200">80</span>
            </div>
            <div className="flex justify-between">
              <span>待审核记录</span>
              <span className="data-value text-amberx-400">{stats.unaudited}</span>
            </div>
          </div>
          <div className="divider-line my-3"></div>
          <div className="flex items-center gap-2">
            <BarChart3 className="h-3.5 w-3.5 text-cyber-400/70" />
            <span className="text-[11px] text-slate-400">批次完成度 78%</span>
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-deepspace-700/60">
            <div
              className="h-full rounded-full bg-gradient-to-r from-cyber-500 to-cyber-400"
              style={{ width: "78%" }}
            ></div>
          </div>
        </div>
      </nav>

      <div className="border-t border-deepspace-700/50 px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-aurora-500/60 to-aurora-500/20 font-mono text-xs font-bold text-white">
            LS
          </div>
          <div className="flex-1 min-w-0">
            <div className="truncate text-xs font-medium text-slate-200">李老师 / 现场</div>
            <div className="truncate text-[10px] text-slate-500">权限：审核 + 导出</div>
          </div>
          <button className="rounded-md p-1 text-slate-500 hover:bg-deepspace-800 hover:text-slate-300">
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
