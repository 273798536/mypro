import { NavLink, Outlet } from "react-router-dom";
import { Zap, Activity, ThermometerSun, TrendingUp } from "lucide-react";

const navItems = [
  { path: "/", label: "核算工作台", icon: Zap },
  { path: "/results", label: "损耗结果", icon: Activity },
  { path: "/diagnosis", label: "缺测诊断", icon: ThermometerSun },
  { path: "/trends", label: "趋势对比", icon: TrendingUp },
];

export default function Layout() {
  return (
    <div className="flex min-h-screen">
      <aside className="w-56 shrink-0 border-r border-[var(--color-border)] bg-[var(--color-bg-secondary)] flex flex-col">
        <div className="px-5 py-6 border-b border-[var(--color-border)]">
          <h1 className="text-sm font-bold tracking-wide" style={{ color: "var(--color-amber)" }}>
            变压器负载损耗核算
          </h1>
          <p className="text-xs mt-1" style={{ color: "var(--color-text-muted)" }}>
            Transformer Load Loss Calc
          </p>
        </div>
        <nav className="flex-1 py-4 px-3 space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === "/"}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-200 ${
                  isActive
                    ? "bg-[rgba(245,158,11,0.12)] text-[var(--color-amber)] font-medium"
                    : "text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-tertiary)] hover:text-[var(--color-text-primary)]"
                }`
              }
            >
              <item.icon size={16} />
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="px-5 py-4 border-t border-[var(--color-border)]">
          <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
            数据仅在浏览器本地计算
          </p>
        </div>
      </aside>
      <main className="flex-1 overflow-auto p-6">
        <Outlet />
      </main>
    </div>
  );
}
