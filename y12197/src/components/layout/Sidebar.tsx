import { ListMusic, Upload, Settings } from 'lucide-react'
import { NavLink } from 'react-router-dom'

const navItems = [
  { to: '/', label: '歌单列表', icon: ListMusic },
  { to: '/import', label: '导入歌单', icon: Upload },
  { to: '/settings', label: '约束设置', icon: Settings },
]

export default function Sidebar() {
  return (
    <aside className="fixed left-0 top-14 bottom-0 z-40 w-56 border-r border-pale bg-white">
      <nav className="flex flex-col py-2">
        {navItems.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-2.5 text-sm ${
                isActive ? 'bg-navy text-white' : 'text-charcoal hover:bg-cream'
              }`
            }
          >
            <Icon className="h-4 w-4" />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>
    </aside>
  )
}
