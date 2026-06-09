import { NavLink } from 'react-router-dom'
import { List, Settings } from 'lucide-react'

const navItems = [
  { to: '/records', label: '记录列表', icon: List },
]

function Sidebar() {
  return (
    <aside className="w-64 bg-bg-card border-r border-border flex flex-col">
      <div className="h-16 flex items-center px-6 border-b border-border">
        <span className="text-lg font-bold text-text-primary">管理系统</span>
      </div>
      <nav className="flex-1 py-4">
        <ul className="space-y-1 px-3">
          {navItems.map((item) => {
            const Icon = item.icon
            return (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-colors ${
                      isActive
                        ? 'bg-primary text-white'
                        : 'text-text-secondary hover:bg-bg-dark hover:text-text-primary'
                    }`
                  }
                >
                  <Icon size={18} />
                  <span>{item.label}</span>
                </NavLink>
              </li>
            )
          })}
        </ul>
      </nav>
      <div className="border-t border-border p-4">
        <div className="flex items-center gap-3 px-3 py-2 text-sm text-text-muted">
          <Settings size={18} />
          <span>设置</span>
        </div>
      </div>
    </aside>
  )
}

export default Sidebar
