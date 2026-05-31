import { NavLink, Outlet } from "react-router-dom"
import { PawPrint, LayoutDashboard, Users, Receipt, AlertTriangle, Calculator } from "lucide-react"

const navItems = [
  { to: "/", icon: LayoutDashboard, label: "总览" },
  { to: "/accounts", icon: Users, label: "会员与宠物" },
  { to: "/transactions", icon: Receipt, label: "消费与扣次" },
  { to: "/exceptions", icon: AlertTriangle, label: "异常清单" },
  { to: "/refund", icon: Calculator, label: "退款与导出" },
]

export default function Layout() {
  return (
    <div className="flex min-h-screen">
      <aside className="fixed left-0 top-0 bottom-0 w-64 bg-white border-r border-slate-200 flex flex-col z-10">
        <div className="flex items-center gap-2 px-6 py-5 border-b border-slate-100">
          <PawPrint className="w-6 h-6 text-teal-700" />
          <h1 className="text-lg font-semibold text-teal-700">宠物医院会员预存</h1>
        </div>

        <nav className="flex-1 py-4">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/"}
              className={({ isActive }) =>
                `flex items-center gap-3 px-6 py-2.5 text-sm font-medium transition-colors duration-150 ${
                  isActive
                    ? "bg-teal-50 text-teal-700 border-r-2 border-teal-700"
                    : "text-slate-600 hover:bg-slate-50"
                }`
              }
            >
              <item.icon className="w-4.5 h-4.5" />
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="px-6 py-4 border-t border-slate-100">
          <span className="text-xs text-slate-400">v1.0</span>
        </div>
      </aside>

      <main className="ml-64 flex-1 min-h-screen bg-slate-50 p-6">
        <Outlet />
      </main>
    </div>
  )
}
