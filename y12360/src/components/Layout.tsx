import { NavLink } from "react-router-dom"
import { Calculator, List, Download, Droplets } from "lucide-react"

const navItems = [
  { to: "/", label: "计算工作台", icon: Calculator },
  { to: "/records", label: "计算记录", icon: List },
  { to: "/export", label: "报告导出", icon: Download },
]

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3">
          <div className="flex items-center gap-2">
            <Droplets className="h-6 w-6 text-sky-500" />
            <span className="text-lg font-bold text-slate-800">水泵相似律计算</span>
          </div>
          <nav className="flex items-center gap-1">
            {navItems.map((item) => {
              const Icon = item.icon
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === "/"}
                  className={({ isActive }) =>
                    `inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                      isActive
                        ? "bg-sky-50 text-sky-600"
                        : "text-slate-500 hover:bg-slate-100 hover:text-slate-700"
                    }`
                  }
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </NavLink>
              )
            })}
          </nav>
        </div>
      </header>
      <main>{children}</main>
    </div>
  )
}
