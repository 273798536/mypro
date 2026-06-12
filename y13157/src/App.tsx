import { Routes, Route, NavLink } from 'react-router-dom'
import ReplayHome from '@/pages/ReplayHome'
import ComparePage from '@/pages/ComparePage'
import ReviewPage from '@/pages/ReviewPage'
import TeacherView from '@/pages/TeacherView'
import HandoverView from '@/pages/HandoverView'
import { Activity, GitCompare, ClipboardCheck, Users, UserCog } from 'lucide-react'

const navItems = [
  { to: '/', label: '参数回放', Icon: Activity },
  { to: '/compare', label: '版本对比', Icon: GitCompare },
  { to: '/review', label: '复核一页通', Icon: ClipboardCheck },
  { to: '/teacher', label: '老师视图', Icon: Users },
  { to: '/handover', label: '师傅接班', Icon: UserCog },
]

function App() {
  return (
    <div className="min-h-screen flex">
      <aside className="w-56 bg-industrial-card border-r border-industrial-border flex flex-col">
        <div className="px-5 py-4 border-b border-industrial-border">
          <h1 className="text-lg font-bold text-industrial-blue tracking-wide">
            热泵循环
          </h1>
          <p className="text-xs text-industrial-muted mt-1">参数回放系统</p>
        </div>
        <nav className="flex-1 py-3 space-y-1">
          {navItems.map(({ to, label, Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                [
                  'flex items-center gap-3 px-5 py-2.5 text-sm transition-colors',
                  isActive
                    ? 'bg-industrial-blue/20 text-white border-l-2 border-industrial-blue'
                    : 'text-industrial-muted hover:text-white hover:bg-white/5 border-l-2 border-transparent',
                ].join(' ')
              }
            >
              <Icon size={18} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="px-5 py-3 border-t border-industrial-border text-xs text-industrial-muted">
          v0.1.0 · 现场试跑版
        </div>
      </aside>
      <main className="flex-1 overflow-auto">
        <Routes>
          <Route path="/" element={<ReplayHome />} />
          <Route path="/compare" element={<ComparePage />} />
          <Route path="/review" element={<ReviewPage />} />
          <Route path="/teacher" element={<TeacherView />} />
          <Route path="/handover" element={<HandoverView />} />
        </Routes>
      </main>
    </div>
  )
}

export default App
