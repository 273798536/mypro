import { NavLink, Outlet } from "react-router-dom";
import {
  LayoutGrid,
  Search,
  AlertTriangle,
  FlaskConical,
  FileDown,
} from "lucide-react";

const navItems = [
  { to: "/", label: "筛查总览", icon: LayoutGrid },
  { to: "/review", label: "异常复核", icon: AlertTriangle },
  { to: "/cultures", label: "培养记录", icon: FlaskConical },
  { to: "/reports", label: "报告导出", icon: FileDown },
];

export default function AppLayout() {
  return (
    <div className="flex min-h-screen bg-surface">
      <aside className="w-60 bg-white border-r border-stone-200 flex flex-col fixed h-full z-10">
        <div className="px-6 py-5 border-b border-stone-100">
          <h1 className="font-serif text-lg text-brand-dark tracking-tight">
            宏基因组污染筛查
          </h1>
          <p className="text-xs text-stone-400 mt-0.5 font-sans">
            Metagenomic Contamination Screening
          </p>
        </div>
        <nav className="flex-1 py-4 px-3 space-y-1">
          {navItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === "/"}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors duration-150 ${
                  isActive
                    ? "bg-brand-50 text-brand"
                    : "text-stone-500 hover:bg-stone-50 hover:text-stone-700"
                }`
              }
            >
              <Icon size={18} strokeWidth={1.8} />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="px-6 py-4 border-t border-stone-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-brand-100 flex items-center justify-center">
              <span className="text-xs font-semibold text-brand">技</span>
            </div>
            <div>
              <p className="text-sm font-medium text-stone-700">张技师</p>
              <p className="text-xs text-stone-400">实验室技师</p>
            </div>
          </div>
        </div>
      </aside>
      <main className="flex-1 ml-60">
        <div className="max-w-6xl mx-auto px-8 py-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
