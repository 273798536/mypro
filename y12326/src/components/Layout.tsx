import { NavLink, Outlet } from "react-router-dom"
import { LayoutDashboard, BarChart3, ShieldAlert, FileDown } from "lucide-react"

const navItems = [
  { to: "/", icon: LayoutDashboard, label: "审计工作台", end: true },
  { to: "/importance", icon: BarChart3, label: "特征重要性", end: false },
  { to: "/diagnosis", icon: ShieldAlert, label: "风险诊断", end: false },
  { to: "/report", icon: FileDown, label: "报告导出", end: false },
]

export default function Layout() {
  return (
    <div className="flex h-screen overflow-hidden">
      <aside className="fixed left-0 top-0 h-screen w-56 bg-[#12121f] border-r border-[#2a2a3e] flex flex-col z-10">
        <div className="flex items-center gap-2 px-5 py-5 border-b border-[#2a2a3e]">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-amber-500" />
          <span className="text-base font-semibold text-zinc-100 tracking-wide">
            RF特征审计
          </span>
        </div>

        <nav className="flex-1 py-4 flex flex-col gap-1 px-3">
          {navItems.map(({ to, icon: Icon, label, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-amber-500/10 text-amber-400 border-l-[3px] border-amber-400 pl-[9px]"
                    : "text-zinc-400 hover:text-zinc-200 hover:bg-white/5 border-l-[3px] border-transparent pl-[9px]"
                }`
              }
            >
              <Icon size={18} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="px-5 py-4 border-t border-[#2a2a3e]">
          <p className="text-[11px] text-zinc-600">v1.0.0</p>
        </div>
      </aside>

      <main className="ml-56 flex-1 bg-[#0f0f1a] p-6 overflow-auto">
        <Outlet />
      </main>
    </div>
  )
}
