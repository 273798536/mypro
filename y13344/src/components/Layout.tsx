import { NavLink, Outlet, useLocation } from "react-router-dom"
import { LayoutDashboard, GitCompare, BookOpen } from "lucide-react"

const navItems = [
  { to: "/", label: "指标看板", icon: LayoutDashboard },
  { to: "/compare", label: "版本对比", icon: GitCompare },
  { to: "/guide", label: "使用说明", icon: BookOpen },
]

const breadcrumbMap: Record<string, string> = {
  "/": "指标看板",
  "/compare": "版本对比",
  "/guide": "使用说明",
}

export default function Layout() {
  const location = useLocation()
  const isSampleDetail = location.pathname.startsWith("/sample/")
  const breadcrumbTitle = isSampleDetail
    ? "样本详情"
    : breadcrumbMap[location.pathname] ?? ""

  return (
    <div className="flex h-screen bg-slate-900">
      <aside className="flex w-60 flex-shrink-0 flex-col border-r border-slate-700/60 bg-slate-800">
        <div className="flex h-16 items-center gap-2.5 border-b border-slate-700/60 px-5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-500/20">
            <LayoutDashboard className="h-4 w-4 text-cyan-400" />
          </div>
          <span className="text-base font-semibold text-slate-100">
            排班推荐指标看板
          </span>
        </div>
        <nav className="flex-1 space-y-1 px-3 py-4">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/"}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-slate-700/50 text-cyan-400"
                    : "text-slate-400 hover:bg-slate-700/30 hover:text-slate-200"
                }`
              }
            >
              <item.icon className="h-[18px] w-[18px]" />
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>
      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex h-14 flex-shrink-0 items-center border-b border-slate-700/60 bg-slate-900 px-6">
          <span className="text-sm font-medium text-slate-400">
            {breadcrumbTitle}
          </span>
        </header>
        <main className="flex-1 overflow-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
