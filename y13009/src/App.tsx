import { useEffect } from 'react'
import { Routes, Route, Link, useLocation } from 'react-router-dom'
import { FileText, Home, RefreshCw, BarChart3 } from 'lucide-react'
import Dashboard from '@/pages/Dashboard'
import ReportPage from '@/pages/ReportPage'
import { useStore } from '@/store/useStore'

export default function App() {
  const init = useStore(s => s.init)
  const location = useLocation()

  useEffect(() => {
    init()
  }, [init])

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-ink-800 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <BarChart3 size={24} />
            <h1 className="font-serif text-xl tracking-wide">ABS 现金流风险预警</h1>
          </div>
          <nav className="flex items-center gap-1 text-sm">
            <Link
              to="/"
              className={`flex items-center gap-1.5 px-4 py-2 rounded transition-all ${
                location.pathname === '/'
                  ? 'bg-white/15 text-white'
                  : 'text-white/70 hover:bg-white/10 hover:text-white'
              }`}
            >
              <Home size={16} />
              <span>主控面板</span>
            </Link>
            <Link
              to="/report"
              className={`flex items-center gap-1.5 px-4 py-2 rounded transition-all ${
                location.pathname === '/report'
                  ? 'bg-white/15 text-white'
                  : 'text-white/70 hover:bg-white/10 hover:text-white'
              }`}
            >
              <FileText size={16} />
              <span>Markdown 报告</span>
            </Link>
            <a
              href="#help"
              onClick={(e) => {
                e.preventDefault()
                alert(
                  [
                    '【启动】打开首页即自动加载本地数据。',
                    '【重跑】在主控面板点击「重跑全部」，所有未撤回记录回到待确认状态。',
                    '【查看 Markdown 报告】切换至「Markdown 报告」页，可预览或下载 .md 文件，内容与页面状态一致。',
                  ].join('\n\n'),
                )
              }}
              className="flex items-center gap-1.5 px-4 py-2 rounded text-white/70 hover:bg-white/10 hover:text-white transition-all ml-2"
            >
              <RefreshCw size={16} />
              <span>使用说明</span>
            </a>
          </nav>
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-6">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/report" element={<ReportPage />} />
        </Routes>
      </main>

      <footer className="border-t border-slate-200 py-4 text-center text-xs text-slate-500 bg-white/60">
        本地数据存储于浏览器 localStorage · 数据仅供本机使用
      </footer>
    </div>
  )
}
