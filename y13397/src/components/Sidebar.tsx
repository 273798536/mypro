import { useNavigate, useLocation } from "react-router-dom"
import { LayoutDashboard, GitCompareArrows, FileText } from "lucide-react"

const navItems = [
  { path: "/", label: "回放工作台", icon: LayoutDashboard },
  { path: "/report", label: "报告预览", icon: FileText },
]

export default function Sidebar() {
  const navigate = useNavigate()
  const location = useLocation()

  const isActive = (path: string) => {
    if (path === "/") return location.pathname === "/" || location.pathname.startsWith("/compare")
    return location.pathname === path
  }

  return (
    <aside className="w-64 min-h-screen bg-surface-950 border-r border-surface-700/50 flex flex-col">
      <div className="p-6 border-b border-surface-700/50">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-amber-500/20 flex items-center justify-center">
            <GitCompareArrows className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <h1 className="text-sm font-semibold text-surface-100 leading-tight">影子流量</h1>
            <p className="text-xs text-surface-400">异常回放系统</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon
          const active = isActive(item.path)
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-200 ${
                active
                  ? "bg-amber-500/15 text-amber-400 border border-amber-500/20"
                  : "text-surface-400 hover:text-surface-200 hover:bg-surface-800/50 border border-transparent"
              }`}
            >
              <Icon className="w-4 h-4" />
              {item.label}
            </button>
          )
        })}
      </nav>

      <div className="p-4 border-t border-surface-700/50">
        <div className="px-3 py-2 rounded-lg bg-surface-800/50">
          <p className="text-xs text-surface-500">当前数据</p>
          <p className="text-xs data-font text-surface-300 mt-0.5">4 条回放记录</p>
        </div>
      </div>
    </aside>
  )
}
