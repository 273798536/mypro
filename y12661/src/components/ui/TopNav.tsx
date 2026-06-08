import { Link, NavLink, useLocation } from "react-router-dom"
import { Search, User, FileWarning, History, Download, LayoutGrid } from "lucide-react"
import { cn } from "@/lib/utils"

const NAV_ITEMS = [
  { to: "/", label: "复核列表", icon: LayoutGrid },
  { to: "/export", label: "下载导出", icon: Download },
]

export function TopNav() {
  const location = useLocation()
  const inDetail = location.pathname.startsWith("/review/")

  return (
    <header className="h-14 border-b border-eng-border bg-eng-panel flex items-center justify-between px-5 relative z-30">
      <div className="flex items-center gap-6">
        <Link to="/" className="flex items-center gap-2 group">
          <div className="w-8 h-8 border-2 border-eng-primary flex items-center justify-center">
            <FileWarning className="w-4 h-4 text-eng-primary" strokeWidth={2.5} />
          </div>
          <div className="leading-tight">
            <div className="font-mono text-sm text-eng-text font-semibold tracking-wide group-hover:text-eng-primary transition-colors">
              桥梁裂缝点云复核
            </div>
            <div className="text-[10px] text-eng-muted font-mono uppercase tracking-widest">
              BRIDGE CRACK POINT CLOUD REVIEW
            </div>
          </div>
        </Link>

        <nav className="flex items-center gap-1 ml-4">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon
            const active =
              item.to === "/"
                ? location.pathname === "/" && !inDetail
                : location.pathname.startsWith(item.to)
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 text-sm border transition-all",
                  active
                    ? "border-eng-primary bg-eng-primary/20 text-eng-text"
                    : "border-transparent text-eng-dim hover:text-eng-text hover:bg-eng-card",
                )}
              >
                <Icon className="w-4 h-4" />
                {item.label}
              </NavLink>
            )
          })}
          {inDetail && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 text-sm border border-eng-warn/40 bg-eng-warn/10 text-eng-warn ml-2">
              <History className="w-4 h-4" />
              复核详情模式
            </div>
          )}
        </nav>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-eng-muted" />
          <input
            type="text"
            placeholder="任务编号 / 桥梁名称..."
            className="bg-eng-bg border border-eng-border pl-9 pr-3 py-1.5 text-sm w-64 focus:outline-none focus:border-eng-primary font-mono text-eng-text placeholder:text-eng-muted"
          />
        </div>
        <div className="flex items-center gap-2 border border-eng-border px-3 py-1.5 bg-eng-card">
          <div className="w-6 h-6 rounded-full bg-eng-primary/30 border border-eng-primary flex items-center justify-center">
            <User className="w-3.5 h-3.5 text-eng-primary" />
          </div>
          <div className="leading-tight">
            <div className="text-sm text-eng-text">展馆讲解员-赵</div>
            <div className="text-[10px] text-eng-muted font-mono uppercase">operator</div>
          </div>
        </div>
      </div>
    </header>
  )
}
