import { NavLink, Outlet } from "react-router-dom"
import { Waves, ClipboardCheck, FileText } from "lucide-react"

const navItems = [
  { to: "/", label: "潮汐计算", icon: Waves },
  { to: "/review", label: "数据复核", icon: ClipboardCheck },
  { to: "/report", label: "复核报告", icon: FileText },
]

export default function Layout() {
  return (
    <div className="flex min-h-screen bg-ocean-surface">
      <aside className="w-56 bg-ocean-deep flex flex-col shrink-0">
        <div className="px-5 py-6 border-b border-white/10">
          <h1 className="font-serif text-lg text-white leading-tight">
            海洋课堂
          </h1>
          <p className="text-ocean-light text-xs mt-1 font-light tracking-wide">
            洋流沙盘
          </p>
        </div>

        <nav className="flex-1 py-4">
          {navItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === "/"}
              className={({ isActive }) =>
                `flex items-center gap-3 px-5 py-3 text-sm transition-all duration-200 ${
                  isActive
                    ? "bg-white/10 text-ocean-light border-r-2 border-ocean-light"
                    : "text-white/60 hover:text-white/90 hover:bg-white/5"
                }`
              }
            >
              <Icon size={18} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="px-5 py-4 border-t border-white/10">
          <div className="flex items-center gap-2 text-white/40 text-xs">
            <div className="w-2 h-2 rounded-full bg-ocean-light animate-pulse-coral" />
            <span>数据实时同步</span>
          </div>
        </div>
      </aside>

      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  )
}
