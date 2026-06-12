import { NavLink, Outlet, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Waves,
  AlertTriangle,
  History,
  ClipboardCheck,
  Droplets,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useBuoyStore } from "@/store/useBuoyStore";
import { useMemo } from "react";

const navItems = [
  { to: "/", label: "仪表盘", icon: LayoutDashboard },
  { to: "/buoy", label: "浮标数据", icon: Waves },
  { to: "/warning", label: "水质预警", icon: AlertTriangle },
  { to: "/history", label: "历史回看", icon: History },
  { to: "/review", label: "复核备注", icon: ClipboardCheck },
];

export default function Layout() {
  const records = useBuoyStore((s) => s.records);
  const location = useLocation();

  const stats = useMemo(() => {
    return {
      available: records.filter((r) => r.quality === "available").length,
      pending: records.filter((r) => r.quality === "pending").length,
      recollect: records.filter((r) => r.quality === "recollect").length,
      pendingReview: records.filter((r) => r.reviewStatus === "pending").length,
    };
  }, [records]);

  const total = stats.available + stats.pending + stats.recollect;
  const currentNav = navItems.find(
    (n) =>
      n.to === location.pathname ||
      (n.to !== "/" && location.pathname.startsWith(n.to))
  );

  return (
    <div className="min-h-screen flex">
      <aside className="w-60 flex-shrink-0 h-screen sticky top-0 border-r border-ocean-600/20 bg-ocean-900/40 backdrop-blur-sm">
        <div className="h-16 flex items-center gap-3 px-5 border-b border-ocean-600/20">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-ocean-400 to-ocean-600 flex items-center justify-center shadow-lg shadow-ocean-500/20">
            <Droplets size={22} className="text-white" />
          </div>
          <div>
            <h1 className="font-serif text-base font-semibold text-ocean-50 leading-tight">
              海洋塑料
            </h1>
            <p className="text-xs text-ocean-400">巡查计算工具</p>
          </div>
        </div>

        <nav className="p-3 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              location.pathname === item.to ||
              (item.to !== "/" && location.pathname.startsWith(item.to));
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={cn("nav-item", isActive && "nav-item-active")}
              >
                <Icon size={18} />
                <span>{item.label}</span>
                {item.to === "/review" && stats.pendingReview > 0 && (
                  <span className="ml-auto px-2 py-0.5 rounded-full text-xs font-medium bg-quality-pending/20 text-quality-pending">
                    {stats.pendingReview}
                  </span>
                )}
                {item.to === "/buoy" && stats.recollect > 0 && (
                  <span className="ml-auto px-2 py-0.5 rounded-full text-xs font-medium bg-quality-recollect/20 text-quality-recollect">
                    {stats.recollect}
                  </span>
                )}
              </NavLink>
            );
          })}
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-ocean-600/20">
          <div className="glass-card p-3 space-y-2">
            <p className="text-xs text-ocean-400/70">数据质量速览</p>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1.5 text-ocean-300">
                  <span className="w-2 h-2 rounded-full bg-quality-available" />
                  可用
                </span>
                <span className="font-mono text-ocean-200">{stats.available}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1.5 text-ocean-300">
                  <span className="w-2 h-2 rounded-full bg-quality-pending" />
                  暂缓
                </span>
                <span className="font-mono text-ocean-200">{stats.pending}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1.5 text-ocean-300">
                  <span className="w-2 h-2 rounded-full bg-quality-recollect animate-pulse" />
                  重采
                </span>
                <span className="font-mono text-ocean-200">{stats.recollect}</span>
              </div>
            </div>
          </div>
        </div>
      </aside>

      <main className="flex-1 min-w-0">
        <header className="h-16 sticky top-0 z-30 border-b border-ocean-600/20 bg-ocean-900/70 backdrop-blur-md">
          <div className="h-full px-6 flex items-center justify-between">
            <div>
              <h2 className="font-serif text-lg font-semibold text-ocean-50">
                {currentNav?.label || "仪表盘"}
              </h2>
              <p className="text-xs text-ocean-400/70">
                数据截至 {new Date().toLocaleDateString("zh-CN")}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className="tag bg-ocean-700/50 text-ocean-200 border border-ocean-600/30">
                {total} 条记录
              </span>
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-ocean-400 to-ocean-600 flex items-center justify-center text-xs font-semibold text-white">
                科
              </div>
            </div>
          </div>
        </header>

        <div className="p-6 relative z-10">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
