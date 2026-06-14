import { FileText, LayoutDashboard, ShieldCheck } from 'lucide-react'
import { NavLink } from 'react-router-dom'

const navItems = [
  { to: '/', label: '报告生成', icon: FileText },
  { to: '/summary', label: '排班摘要', icon: LayoutDashboard },
  { to: '/verify', label: '设备校验', icon: ShieldCheck },
]

export default function Sidebar() {
  return (
    <aside className="fixed left-0 top-0 z-40 flex h-screen w-56 flex-col border-r border-[#1B3A5C]/15 bg-[#0F2640]">
      <div className="flex items-center gap-3 px-5 py-6">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#2D9B83]">
          <FileText className="h-5 w-5 text-white" />
        </div>
        <div>
          <h1 className="text-sm font-bold text-white leading-tight">滑轮组张力</h1>
          <p className="text-[10px] text-[#8BA3BF]">报告导出系统</p>
        </div>
      </div>

      <nav className="mt-2 flex-1 space-y-1 px-3">
        {navItems.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200 ${
                isActive
                  ? 'bg-[#2D9B83]/20 text-[#2D9B83]'
                  : 'text-[#8BA3BF] hover:bg-[#1B3A5C]/40 hover:text-white'
              }`
            }
          >
            <Icon className="h-4 w-4" />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-[#1B3A5C]/30 px-5 py-4">
        <p className="text-[10px] text-[#5A7A9A]">维修班组专用 v1.0</p>
      </div>
    </aside>
  )
}
