import { NavLink } from 'react-router-dom'
import { FlaskConical, ClipboardCheck, History, GitCompareArrows, FileText } from 'lucide-react'

const navItems = [
  { to: '/', label: '分类检索', icon: FlaskConical },
  { to: '/review', label: '异常复核', icon: ClipboardCheck },
  { to: '/audit', label: '审计追踪', icon: History },
  { to: '/compare', label: '结论对比', icon: GitCompareArrows },
  { to: '/report', label: '分类报告', icon: FileText },
]

export default function Sidebar() {
  return (
    <aside className="flex w-56 flex-col border-r border-slate-200 bg-teal-950 text-white">
      <div className="flex items-center gap-3 px-5 py-6">
        <FlaskConical className="h-7 w-7 text-amber-accent" />
        <div>
          <h1 className="font-serif text-base font-bold leading-tight">生物课</h1>
          <p className="text-xs text-teal-300">分类检索器</p>
        </div>
      </div>

      <nav className="mt-2 flex-1 space-y-1 px-3">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-white/15 text-amber-accent'
                  : 'text-teal-200 hover:bg-white/10 hover:text-white'
              }`
            }
          >
            <item.icon className="h-4.5 w-4.5" />
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-white/10 px-5 py-4">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-accent/20 text-xs font-bold text-amber-accent">
            陈
          </div>
          <div>
            <p className="text-sm font-medium">陈志远</p>
            <p className="text-xs text-teal-300">育种专员</p>
          </div>
        </div>
      </div>
    </aside>
  )
}
