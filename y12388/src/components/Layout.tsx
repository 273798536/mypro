import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import {
  ListMusic, FileText, Download, Settings, Menu, X, Music2, History } from 'lucide-react'
import { cn } from '@/lib/utils'

const navItems = [
  { path: '/', label: '报名列表', icon: ListMusic },
  { path: '/export', label: '导出中心', icon: Download },
  { path: '/settings', label: '系统设置', icon: Settings },
]

export default function Layout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const location = useLocation()

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* 侧边栏 */}
      <aside
        className={cn(
          'bg-gradient-to-b from-primary-800 to-primary-900 text-white transition-all duration-300 flex flex-col',
          sidebarOpen ? 'w-64' : 'w-20'
        )}
      >
        {/* Logo区域 */}
        <div className="p-6 border-b border-primary-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-accent-orange rounded-lg flex items-center justify-center">
              <Music2 className="w-6 h-6 text-white" />
            </div>
            {sidebarOpen && (
              <div>
                <h1 className="font-display text-lg font-bold">考级审核</h1>
                <p className="text-primary-200 text-xs">乐器考级报名工作台</p>
              </div>
            )}
          </div>
        </div>

        {/* 导航菜单 */}
        <nav className="flex-1 p-4 space-y-2">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = location.pathname === item.path
            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  'flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200',
                  isActive
                    ? 'bg-primary-700 text-white shadow-lg'
                    : 'text-primary-200 hover:bg-primary-700/50 hover:text-white'
                )}
              >
                <Icon className="w-5 h-5" />
                {sidebarOpen && <span className="font-medium">{item.label}</span>}
              </Link>
            )
          })}
        </nav>

        {/* 折叠按钮 */}
        <div className="p-4 border-t border-primary-700">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="w-full flex items-center justify-center p-2 rounded-lg hover:bg-primary-700/50 transition-colors"
          >
            {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </aside>

      {/* 主内容区 */}
      <main className="flex-1 flex flex-col min-h-screen overflow-hidden">
        {/* 顶部栏 */}
        <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="font-display text-xl font-semibold text-primary-800">
              {navItems.find((item) => item.path === location.pathname)?.label || '报名列表'}
            </h2>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-slate-500">
              {new Date().toLocaleDateString('zh-CN', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                weekday: 'long',
              })}
            </span>
          </div>
        </header>

        {/* 页面内容 */}
        <div className="flex-1 overflow-auto p-6">
          {children}
        </div>
      </main>
    </div>
  )
}
