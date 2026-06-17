import { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { 
  LayoutDashboard, 
  FileText, 
  AlertTriangle, 
  Download, 
  Menu, 
  X,
  ChevronRight
} from 'lucide-react';
import { cn } from '../lib/utils';

const navItems = [
  { path: '/', label: '指标总览', icon: LayoutDashboard },
  { path: '/tickets', label: '工单明细', icon: FileText },
  { path: '/exceptions', label: '异常处理', icon: AlertTriangle },
  { path: '/export', label: '数据导出', icon: Download },
];

export default function Layout() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <aside 
        className={cn(
          "bg-slate-900 text-white transition-all duration-300 flex flex-col",
          sidebarCollapsed ? "w-20" : "w-64"
        )}
      >
        <div className="h-16 flex items-center justify-between px-4 border-b border-slate-700">
          {!sidebarCollapsed && (
            <h1 className="text-lg font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
              客服摘要指标看板
            </h1>
          )}
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
          >
            {sidebarCollapsed ? <Menu size={20} /> : <X size={20} />}
          </button>
        </div>
        
        <nav className="flex-1 py-4">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 px-4 py-3 mx-2 rounded-lg transition-all duration-200 group",
                  isActive 
                    ? "bg-blue-600 text-white shadow-lg shadow-blue-600/30" 
                    : "text-slate-400 hover:text-white hover:bg-slate-800"
                )
              }
            >
              <item.icon size={20} className="shrink-0" />
              {!sidebarCollapsed && (
                <span className="font-medium">{item.label}</span>
              )}
              {!sidebarCollapsed && (
                <ChevronRight 
                  size={16} 
                  className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity" 
                />
              )}
            </NavLink>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center font-bold">
              评
            </div>
            {!sidebarCollapsed && (
              <div>
                <p className="font-medium text-sm">评测负责人</p>
                <p className="text-xs text-slate-400">admin@example.com</p>
              </div>
            )}
          </div>
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0">
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 shadow-sm">
          <div>
            <h2 className="text-xl font-semibold text-slate-800">
              {navItems.find(item => item.path === window.location.pathname)?.label || '指标总览'}
            </h2>
            <p className="text-xs text-slate-500">
              数据更新时间：{new Date().toLocaleString('zh-CN', { hour12: false })}
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-sm font-medium text-slate-700">数据范围</p>
              <p className="text-xs text-slate-500">2026-06-15 至 2026-06-17</p>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-auto p-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
