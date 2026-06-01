import { NavLink, useLocation } from 'react-router-dom'
import { Network, Upload, Cpu, GitBranch, Link2 } from 'lucide-react'
import { useStore } from '@/store'

const navItems = [
  { to: '/import', icon: Upload, label: '数据导入' },
  { to: '/cluster', icon: Cpu, label: '聚类分析' },
  { to: '/graph', icon: GitBranch, label: '可视化图' },
  { to: '/trace', icon: Link2, label: '结果溯源' },
]

export default function Sidebar() {
  const location = useLocation()
  const datasetVersion = useStore((s) => s.datasetVersion)

  return (
    <aside className="fixed left-0 top-0 w-56 h-full bg-bg-card flex flex-col">
      <div className="flex items-center gap-2 px-5 py-5">
        <Network className="w-6 h-6 text-[#00d4aa]" />
        <span className="text-white font-bold text-base">谱聚类社群拆分</span>
      </div>

      <nav className="flex-1 px-3 space-y-1">
        {navItems.map(({ to, icon: Icon, label }) => {
          const isActive = location.pathname === to
          return (
            <NavLink
              key={to}
              to={to}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                isActive
                  ? 'bg-[#00d4aa]/10 text-[#00d4aa] border-l-[3px] border-[#00d4aa]'
                  : 'text-[#8b95b0] hover:bg-white/5 hover:text-white border-l-[3px] border-transparent'
              }`}
            >
              <Icon className="w-4.5 h-4.5" />
              <span className="text-sm">{label}</span>
            </NavLink>
          )
        })}
      </nav>

      <div className="px-5 py-4 border-t border-white/5">
        <span className="text-xs text-[#8b95b0]">数据集版本</span>
        <p className="text-xs text-[#8b95b0]/70 mt-0.5">{datasetVersion}</p>
      </div>
    </aside>
  )
}
