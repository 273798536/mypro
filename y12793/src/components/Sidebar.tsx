import { useLocation, Link } from 'react-router-dom'
import { FlaskConical, LayoutDashboard, Beaker, Scale, ScanLine, GitBranch, Download } from 'lucide-react'
import { useLabStore } from '@/store/useLabStore'

const navItems = [
  { label: '看板首页', path: '/', icon: LayoutDashboard },
  { label: '浓度换算', path: '/concentration', icon: Beaker },
  { label: '配平计算', path: '/balance', icon: Scale },
  { label: '谱图复核', path: '/spectral', icon: ScanLine },
  { label: '记录溯源', path: '/trace', icon: GitBranch },
]

export default function Sidebar() {
  const location = useLocation()
  const exportAllSummary = useLabStore((s) => s.exportAllSummary)

  const handleExport = () => {
    const data = exportAllSummary()
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `lab-safety-export-${Date.now()}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <aside className="fixed left-0 top-0 w-60 h-screen bg-slate-900 text-white flex flex-col">
      <div className="flex items-center gap-2 px-5 py-5 border-b border-slate-700">
        <FlaskConical size={22} className="text-teal-400" />
        <span className="font-heading font-bold text-lg tracking-wide">实验课安全闯关</span>
      </div>

      <nav className="flex-1 py-4 space-y-1 px-3">
        {navItems.map(({ label, path, icon: Icon }) => {
          const active = location.pathname === path
          return (
            <Link
              key={path}
              to={path}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                active
                  ? 'bg-teal-700 text-white'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Icon size={18} />
              {label}
            </Link>
          )
        })}
      </nav>

      <div className="px-3 pb-4">
        <button
          onClick={handleExport}
          className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
        >
          <Download size={18} />
          数据导出
        </button>
      </div>
    </aside>
  )
}
