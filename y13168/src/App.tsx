import { useState } from 'react'
import { BrowserRouter as Router, Routes, Route, NavLink } from 'react-router-dom'
import Workspace from '@/pages/Workspace'
import Trace from '@/pages/Trace'
import Report from '@/pages/Report'
import { Activity, FileSearch, Settings, HelpCircle, MapPin, AlertTriangle, Download } from 'lucide-react'

const navItems = [
  { to: '/', label: '归因工作台', icon: Activity },
  { to: '/trace', label: '材料溯源', icon: FileSearch },
  { to: '/report', label: '参数与报告', icon: Settings },
]

const cheatSheetItems = [
  { icon: MapPin, title: '样例在哪', desc: '工作台点电机零件，拉时间轴' },
  { icon: AlertTriangle, title: '异常在哪', desc: '材料溯源页看口径不一致' },
  { icon: Download, title: '结果怎么导出', desc: '参数与报告页导CSV明细' },
]

export default function App() {
  const [cheatSheetOpen, setCheatSheetOpen] = useState(false)

  return (
    <Router>
      <div className="flex h-screen bg-[#0F1724] text-gray-200 overflow-hidden">
        <nav className="w-[56px] flex flex-col items-center py-4 gap-1 bg-[#0A1020] border-r border-[#1B2A4A] relative">
          <div className="w-8 h-8 rounded bg-[#FF6B35] flex items-center justify-center text-white font-bold text-xs mb-6">
            扭
          </div>
          {navItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `w-10 h-10 rounded-lg flex items-center justify-center transition-all duration-200 ${
                  isActive
                    ? 'bg-[#1B2A4A] text-[#FF6B35] shadow-lg shadow-[#FF6B35]/10'
                    : 'text-gray-500 hover:text-gray-300 hover:bg-[#1B2A4A]/50'
                }`
              }
              title={label}
            >
              <Icon size={18} />
            </NavLink>
          ))}
          <div className="mt-auto">
            <button
              onClick={() => setCheatSheetOpen(!cheatSheetOpen)}
              className={`w-10 h-10 rounded-lg flex items-center justify-center transition-all duration-200 ${
                cheatSheetOpen
                  ? 'bg-[#1B2A4A] text-[#2ECC71] shadow-lg shadow-[#2ECC71]/10'
                  : 'text-gray-500 hover:text-gray-300 hover:bg-[#1B2A4A]/50'
              }`}
              title="值班小抄"
            >
              <HelpCircle size={18} />
            </button>
          </div>

          {cheatSheetOpen && (
            <div className="absolute left-14 bottom-4 z-50 w-56 rounded-lg border border-[#2A3F6A] bg-[#1B2A4A] shadow-xl p-3 space-y-2">
              <p className="text-xs font-semibold text-[#2ECC71] mb-2">值班小抄 · 3秒上手</p>
              {cheatSheetItems.map(({ icon: Icon, title, desc }, i) => (
                <div key={i} className="flex items-start gap-2">
                  <Icon size={14} className="text-[#FF6B35] shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-medium text-white">{title}</p>
                    <p className="text-[11px] text-gray-400">{desc}</p>
                  </div>
                </div>
              ))}
              <div className="pt-2 border-t border-[#2A3F6A] mt-2">
                <p className="text-[10px] text-gray-500">小宋接班专用 · 别写成大段说明</p>
              </div>
            </div>
          )}
        </nav>
        <main className="flex-1 overflow-hidden">
          <Routes>
            <Route path="/" element={<Workspace />} />
            <Route path="/trace" element={<Trace />} />
            <Route path="/report" element={<Report />} />
          </Routes>
        </main>
      </div>
    </Router>
  )
}
