import { Link, useLocation } from 'react-router-dom'
import { Music, Home, ListTodo, GitBranch, FileText } from 'lucide-react'

export default function Navbar() {
  const location = useLocation()

  const navItems = [
    { path: '/', label: '曲谱管理', icon: Home },
    { path: '/tasks', label: '同步任务', icon: ListTodo },
    { path: '/trace', label: '追溯查询', icon: GitBranch },
  ]

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/'
    return location.pathname.startsWith(path)
  }

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-navy-900/90 backdrop-blur-md border-b border-gold-500/20">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-gold-400 to-gold-600 flex items-center justify-center group-hover:scale-105 transition-transform">
              <Music className="w-6 h-6 text-navy-900" />
            </div>
            <div>
              <h1 className="font-display text-lg font-semibold text-gold-400">
                曲谱批注同步器
              </h1>
              <p className="text-xs text-navy-400">Score Annotation Sync</p>
            </div>
          </Link>

          <div className="flex items-center gap-1">
            {navItems.map((item) => {
              const Icon = item.icon
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-200 ${
                    isActive(item.path)
                      ? 'bg-gold-500/20 text-gold-400'
                      : 'text-navy-300 hover:text-gold-400 hover:bg-navy-800/50'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="text-sm font-medium">{item.label}</span>
                </Link>
              )
            })}
          </div>

          <div className="flex items-center gap-3">
            <button className="p-2 rounded-lg text-navy-400 hover:text-gold-400 hover:bg-navy-800/50 transition-colors">
              <FileText className="w-5 h-5" />
            </button>
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-gold-400 to-gold-600 flex items-center justify-center text-navy-900 font-semibold text-sm">
              乐
            </div>
          </div>
        </div>
      </div>
    </nav>
  )
}
