import { Outlet, NavLink } from "react-router-dom";
import { List, FileDown, User } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { to: "/", label: "记录列表", icon: List },
  { to: "/export", label: "报告导出", icon: FileDown },
];

export default function AppLayout() {
  return (
    <div className="flex h-screen bg-surface-secondary">
      <aside className="w-16 bg-primary-700 flex flex-col items-center py-4 gap-2">
        <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center mb-4">
          <span className="text-white font-bold text-lg">救</span>
        </div>
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              cn(
                "w-12 h-12 rounded-lg flex flex-col items-center justify-center gap-0.5 transition-colors",
                isActive
                  ? "bg-white/20 text-white"
                  : "text-white/70 hover:bg-white/10 hover:text-white"
              )
            }
          >
            <item.icon className="w-5 h-5" />
            <span className="text-[10px] leading-none">{item.label.slice(0, 2)}</span>
          </NavLink>
        ))}
      </aside>

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-14 bg-white border-b border-slate-200 flex items-center justify-between px-6">
          <h1 className="text-lg font-semibold text-slate-900">
            救援绳索角度模拟工作台
          </h1>
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-slate-500" />
            <span className="text-sm text-slate-600">当前讲解员：张三</span>
          </div>
        </header>

        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
