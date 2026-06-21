import { NavLink } from 'react-router-dom'
import { LayoutDashboard, List, GitCompareArrows } from 'lucide-react'

const navItems = [
  { to: '/', icon: LayoutDashboard, label: '看板总览' },
  { to: '/detail', icon: List, label: '明细列表' },
  { to: '/compare', icon: GitCompareArrows, label: '版本对比' },
]

export default function Sidebar() {
  return (
    <aside className="fixed left-0 top-0 bottom-0 w-56 bg-[#0D1B2A] flex flex-col z-50">
      <div className="px-5 py-6 border-b border-white/10">
        <h1 className="text-[#E0E7EF] font-bold text-base tracking-wide" style={{ fontFamily: "'Source Serif 4', serif" }}>
          影子流量成本看板
        </h1>
        <p className="text-[#7B8FA3] text-xs mt-1">训练数据质量追踪</p>
      </div>

      <nav className="flex-1 py-4 space-y-1 px-3">
        {navItems.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-200 ${
                isActive
                  ? 'bg-[#1B3A4B] text-[#7DD3FC] shadow-md shadow-[#1B3A4B]/50'
                  : 'text-[#7B8FA3] hover:bg-[#132D42] hover:text-[#B0C4D8]'
              }`
            }
          >
            <item.icon size={18} strokeWidth={1.8} />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="px-5 py-4 border-t border-white/10">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-[#1B3A4B] flex items-center justify-center text-[#7DD3FC] text-xs font-bold">
            值
          </div>
          <div>
            <p className="text-[#B0C4D8] text-xs font-medium">算法值班人</p>
            <p className="text-[#5A7080] text-[10px]">在线</p>
          </div>
        </div>
      </div>
    </aside>
  )
}
