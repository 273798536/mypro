import { NavLink, Outlet } from "react-router-dom";
import { ClipboardList, GitMerge, ShieldAlert, FileOutput, LayoutDashboard } from "lucide-react";

const NAV_ITEMS = [
  { to: "/", label: "方案工作台", icon: ClipboardList },
  { to: "/merge", label: "点位归并台", icon: GitMerge },
  { to: "/check", label: "异常卡口", icon: ShieldAlert },
  { to: "/export", label: "导出中心", icon: FileOutput },
  { to: "/handover", label: "交接看板", icon: LayoutDashboard },
];

export default function Layout() {
  return (
    <div className="flex h-screen overflow-hidden">
      <aside className="w-60 flex-shrink-0 flex flex-col" style={{ backgroundColor: "#0F4C54" }}>
        <div className="px-5 py-6 border-b border-white/10">
          <h1 className="font-serif-title text-xl font-bold text-white tracking-wide">菜场卸货</h1>
          <p className="text-teal-100 text-xs mt-1">方案比选管理系统</p>
        </div>
        <nav className="flex-1 py-4 px-3 space-y-1">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/"}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                  isActive ? "bg-white/15 text-white shadow-sm" : "text-teal-100 hover:bg-white/10 hover:text-white"
                }`
              }
            >
              <item.icon size={18} />
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="px-5 py-4 border-t border-white/10">
          <p className="text-teal-100 text-xs">v1.0 · 算法值班人接手即知</p>
        </div>
      </aside>
      <main className="flex-1 overflow-y-auto" style={{ backgroundColor: "#F5F5F0" }}>
        <Outlet />
      </main>
    </div>
  );
}
