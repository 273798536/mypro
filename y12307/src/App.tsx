import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom'
import { FileInput, LayoutDashboard, Waves } from 'lucide-react'
import EvidenceInput from '@/pages/EvidenceInput'
import Dashboard from '@/pages/Dashboard'
import { useBayesianStore } from '@/store/bayesianStore'
import { cn } from '@/lib/utils'

function Nav() {
  const location = useLocation()
  const alarms = useBayesianStore(s => s.alarms)
  const maintenances = useBayesianStore(s => s.maintenances)
  const warnings = useBayesianStore(s => s.boundaryWarnings)

  return (
    <nav className="flex items-center gap-1 bg-zinc-900/80 border-b border-zinc-700/40 px-4 py-2 backdrop-blur-sm sticky top-0 z-50">
      <div className="flex items-center gap-2 mr-6">
        <Waves size={20} className="text-amber-400" />
        <span className="text-sm font-semibold text-zinc-100 tracking-wide">贝叶斯故障定位</span>
      </div>

      <Link
        to="/"
        className={cn(
          "flex items-center gap-1.5 px-3 py-1.5 rounded text-xs transition-all",
          location.pathname === '/'
            ? "bg-amber-500/15 text-amber-400 border border-amber-500/25"
            : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40"
        )}
      >
        <FileInput size={14} />
        证据录入
        {alarms.length + maintenances.length > 0 && (
          <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] bg-zinc-700/50 text-zinc-300">
            {alarms.length + maintenances.length}
          </span>
        )}
      </Link>

      <Link
        to="/dashboard"
        className={cn(
          "flex items-center gap-1.5 px-3 py-1.5 rounded text-xs transition-all",
          location.pathname === '/dashboard'
            ? "bg-amber-500/15 text-amber-400 border border-amber-500/25"
            : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40"
        )}
      >
        <LayoutDashboard size={14} />
        定位看板
        {warnings.length > 0 && (
          <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] bg-red-500/20 text-red-400">
            {warnings.length}
          </span>
        )}
      </Link>

      <div className="ml-auto flex items-center gap-3 text-[10px] text-zinc-600">
        <span>报警 {alarms.length}</span>
        <span>维修 {maintenances.length}</span>
        <span className={warnings.length > 0 ? "text-red-400" : ""}>警告 {warnings.length}</span>
      </div>
    </nav>
  )
}

function AppLayout() {
  return (
    <div className="min-h-screen bg-[#0f0f1a] text-zinc-100">
      <Nav />
      <main className="max-w-6xl mx-auto px-4 py-6">
        <Routes>
          <Route path="/" element={<EvidenceInput />} />
          <Route path="/dashboard" element={<Dashboard />} />
        </Routes>
      </main>
    </div>
  )
}

export default function App() {
  return (
    <Router>
      <AppLayout />
    </Router>
  )
}
