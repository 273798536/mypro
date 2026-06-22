import { BrowserRouter as Router, Routes, Route, NavLink } from "react-router-dom"
import FieldAlignment from "@/pages/FieldAlignment"
import Sandbox from "@/pages/Sandbox"
import Review from "@/pages/Review"
import Handover from "@/pages/Handover"
import { GitBranch, FlaskConical, ClipboardCheck, FileOutput } from "lucide-react"

const navItems = [
  { path: "/", label: "字段对齐", icon: GitBranch },
  { path: "/sandbox", label: "计算沙盘", icon: FlaskConical },
  { path: "/review", label: "复核详情", icon: ClipboardCheck },
  { path: "/handover", label: "交接说明", icon: FileOutput },
]

export default function App() {
  return (
    <Router>
      <div className="h-screen flex flex-col bg-[#0f0f1a] text-slate-200">
        <header className="flex items-center h-11 px-4 border-b border-slate-700/50 bg-[#0f0f1a]/95 shrink-0">
          <div className="flex items-center gap-2 mr-6">
            <GitBranch size={16} className="text-cyan-400" />
            <span className="text-sm font-semibold text-slate-100 tracking-wide">割点参数沙盘</span>
            <span className="text-[9px] text-slate-600 ml-1">v0.1</span>
          </div>
          <nav className="flex gap-1">
            {navItems.map(item => (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === "/"}
                className={({ isActive }) =>
                  `flex items-center gap-1.5 px-3 py-1.5 rounded text-xs transition-colors ${
                    isActive
                      ? "bg-cyan-600/20 text-cyan-300 border border-cyan-700/40"
                      : "text-slate-500 hover:text-slate-300 hover:bg-slate-800/50 border border-transparent"
                  }`
                }
              >
                <item.icon size={13} />
                {item.label}
              </NavLink>
            ))}
          </nav>
        </header>
        <main className="flex-1 p-4 overflow-hidden">
          <Routes>
            <Route path="/" element={<FieldAlignment />} />
            <Route path="/sandbox" element={<Sandbox />} />
            <Route path="/review" element={<Review />} />
            <Route path="/handover" element={<Handover />} />
          </Routes>
        </main>
      </div>
    </Router>
  )
}
