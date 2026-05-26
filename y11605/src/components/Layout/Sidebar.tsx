import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  Users,
  Calculator,
  Layers,
  Download,
  Settings,
} from 'lucide-react'

const navItems = [
  { to: '/', label: '概览', icon: LayoutDashboard },
  { to: '/participants', label: '参与人', icon: Users },
  { to: '/calculation', label: '退款计算', icon: Calculator },
  { to: '/batches', label: '批次管理', icon: Layers },
  { to: '/exports', label: '导出中心', icon: Download },
  { to: '/settings', label: '系统设置', icon: Settings },
]

export default function Sidebar() {
  return (
    <div className="w-64 bg-white border-r border-slate-200 flex flex-col h-screen">
      <div className="h-16 flex items-center px-6 border-b border-slate-200">
        <h1 className="text-lg font-bold text-slate-800">众筹退款分摊</h1>
      </div>
      
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) =>
              `sidebar-item ${isActive ? 'sidebar-item-active' : 'sidebar-item-inactive'}`
            }
          >
            <item.icon className="mr-3 h-5 w-5" />
            {item.label}
          </NavLink>
        ))}
      </nav>
      
      <div className="p-4 border-t border-slate-200">
        <div className="text-xs text-slate-500">
          <p>当前用户：admin</p>
        </div>
      </div>
    </div>
  )
}
