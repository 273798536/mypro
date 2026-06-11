import { NavLink, Outlet } from 'react-router-dom'
import { LayoutDashboard, Anchor, Shield, Copy, Camera } from 'lucide-react'

const navItems = [
  { path: '/', label: '看板概览', icon: LayoutDashboard },
  { path: '/buoy-data', label: '浮标数据', icon: Anchor },
  { path: '/risk-layer', label: '风险分层', icon: Shield },
  { path: '/duplicate', label: '重复上报', icon: Copy },
  { path: '/inspection', label: '巡检照片', icon: Camera },
]

export default function Layout() {
  return (
    <div className="flex min-h-screen">
      <nav className="w-56 bg-ocean-950 border-r border-ocean-700/50 flex flex-col shrink-0">
        <div className="px-5 py-6 border-b border-ocean-700/50">
          <h1 className="text-lg font-semibold text-teal tracking-wide">近岸水质异常</h1>
          <p className="text-xs text-ocean-400 mt-1">看板计算工具</p>
        </div>
        <div className="flex-1 py-4">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-5 py-3 text-sm transition-all duration-200 ${
                  isActive
                    ? 'bg-teal/10 text-teal border-r-2 border-teal'
                    : 'text-ocean-300 hover:text-ocean-100 hover:bg-ocean-900/50'
                }`
              }
            >
              <item.icon size={18} />
              {item.label}
            </NavLink>
          ))}
        </div>
        <div className="px-5 py-4 border-t border-ocean-700/50 text-xs text-ocean-500">
          v1.0 · 课题组内部
        </div>
      </nav>
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  )
}
