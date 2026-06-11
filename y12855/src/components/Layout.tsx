import {
  Calendar as CalendarIcon,
  Compass,
  Droplets,
  FileWarning,
  LayoutDashboard,
  Waves,
} from "lucide-react";
import { NavLink, Outlet, useLocation } from "react-router-dom";

const NAV_ITEMS = [
  { to: "/", label: "投喂日历", icon: CalendarIcon, end: true },
  { to: "/drift-calculator", label: "轨迹漂移计算", icon: Compass },
  { to: "/trajectory-cleaning", label: "轨迹清洗", icon: Waves },
  { to: "/water-quality", label: "水质预警溯源", icon: Droplets },
  { to: "/audit-trail", label: "修正留痕中心", icon: FileWarning },
];

export default function Layout() {
  const loc = useLocation();
  return (
    <div className="min-h-screen bg-steel-50 flex">
      <aside className="w-60 shrink-0 bg-ocean-800 text-white flex flex-col shadow-xl">
        <div className="px-5 py-5 border-b border-ocean-700">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-ocean-400 to-ocean-600 flex items-center justify-center shadow-inner">
              <LayoutDashboard className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="font-serif font-semibold text-base tracking-wide">
                海洋牧场投喂日历
              </div>
              <div className="text-[11px] text-ocean-200/70 tracking-widest">
                MARINE RANCH DISPATCH
              </div>
            </div>
          </div>
        </div>
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `nav-item ${isActive ? "nav-item-active" : ""}`
              }
            >
              <item.icon className="w-4 h-4 shrink-0" />
              <span className="truncate">{item.label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="px-4 py-4 border-t border-ocean-700 text-[11px] text-ocean-200/60 space-y-1">
          <div className="font-semibold text-ocean-100/80">调度员</div>
          <div>陈志远 · DIS-20314</div>
          <div className="text-ocean-300/40 pt-1">
            最后登录：2026-06-12 09:30
          </div>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="bg-white border-b border-steel-100 px-8 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-ocean-500">
            {NAV_ITEMS.find((n) =>
              n.end
                ? loc.pathname === n.to
                : loc.pathname.startsWith(n.to),
            ) ? (
              <>
                <span>投喂日历</span>
                <span className="text-ocean-300">/</span>
                <span className="text-ocean-800 font-medium">
                  {
                    NAV_ITEMS.find((n) =>
                      n.end
                        ? loc.pathname === n.to
                        : loc.pathname.startsWith(n.to),
                    )?.label
                  }
                </span>
              </>
            ) : (
              <span className="text-ocean-500">海洋牧场投喂日历</span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <span className="chip bg-ocean-50 text-ocean-700 border border-ocean-100">
              今日 · 2026-06-12 · 周五
            </span>
          </div>
        </header>
        <main className="flex-1 overflow-auto px-8 py-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
