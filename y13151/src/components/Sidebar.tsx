import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  FileSpreadsheet,
  Calculator,
  LineChart,
  Handshake,
  Waves,
} from 'lucide-react'

const navItems = [
  { to: '/dashboard', label: '总览', icon: LayoutDashboard },
  { to: '/logs', label: '日志工作台', icon: FileSpreadsheet },
  { to: '/compute', label: '计算改判', icon: Calculator },
  { to: '/chart', label: '图表复盘', icon: LineChart },
  { to: '/handover', label: '交付视图', icon: Handshake },
]

const Sidebar = () => {
  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <div className="flex items-center gap-2">
          <div
            className="w-9 h-9 rounded flex items-center justify-center"
            style={{ background: 'rgba(217, 119, 6, 0.25)' }}
          >
            <Waves size={20} color="#f59e0b" strokeWidth={2} />
          </div>
          <div className="sidebar-logo-text">混响预警工作台</div>
        </div>
      </div>
      <nav className="sidebar-nav">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              'sidebar-nav-item' + (isActive ? ' active' : '')
            }
          >
            <item.icon size={17} strokeWidth={1.8} />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>
      <div className="sidebar-footer">
        <div>v1.0 · 数据自动保存至本地</div>
      </div>
    </aside>
  )
}

export default Sidebar
