import { NavLink, Outlet } from "react-router-dom";
import { Ship, ClipboardCheck, GitCompareArrows } from "lucide-react";

const navItems = [
  { to: "/", label: "数据录入", icon: Ship },
  { to: "/results", label: "校验结果", icon: ClipboardCheck },
  { to: "/compare", label: "方案对比", icon: GitCompareArrows },
];

export default function Layout() {
  return (
    <div className="flex h-screen bg-slate-50 font-body">
      <nav className="w-56 flex-shrink-0 bg-navy text-white flex flex-col">
        <div className="px-5 py-6 border-b border-white/10">
          <h1 className="font-display text-lg leading-tight tracking-wide">
            无人船
            <br />
            浮态校验
          </h1>
          <p className="text-xs text-teal-300 mt-1 font-body">
            USV Stability Check
          </p>
        </div>

        <ul className="flex-1 py-4 space-y-1 px-3">
          {navItems.map(({ to, label, icon: Icon }) => (
            <li key={to}>
              <NavLink
                to={to}
                end={to === "/"}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-200 ${
                    isActive
                      ? "bg-teal-500/20 text-teal-300 font-medium"
                      : "text-slate-300 hover:bg-white/5 hover:text-white"
                  }`
                }
              >
                <Icon size={18} />
                {label}
              </NavLink>
            </li>
          ))}
        </ul>

        <div className="px-5 py-4 border-t border-white/10">
          <p className="text-[10px] text-slate-500">
            v1.0 · 船模社工具
          </p>
        </div>
      </nav>

      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}
