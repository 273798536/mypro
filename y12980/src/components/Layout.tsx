import { NavLink, Outlet } from 'react-router-dom';
import { 
  Table2, 
  FileUp, 
  DatabaseBackup, 
  FileOutput,
  DatabaseZap,
  LayoutDashboard
} from 'lucide-react';

const navItems = [
  { path: '/', label: '台账列表', icon: Table2, end: true },
  { path: '/import', label: '数据导入', icon: FileUp },
  { path: '/migration', label: '迁移与备份', icon: DatabaseBackup },
  { path: '/export', label: '报告导出', icon: FileOutput },
];

export function Layout() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans">
      <header className="sticky top-0 z-50 bg-slate-900/95 backdrop-blur border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-600 rounded-lg">
                <DatabaseZap className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-white">队列消费幂等台账</h1>
                <p className="text-xs text-slate-400">慢查询与表结构冲突管理平台</p>
              </div>
            </div>
            
            <nav className="hidden md:flex items-center gap-1">
              {navItems.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  end={item.end}
                  className={({ isActive }) =>
                    `flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                      isActive
                        ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/25'
                        : 'text-slate-400 hover:text-white hover:bg-slate-800'
                    }`
                  }
                >
                  <item.icon className="w-4 h-4" />
                  {item.label}
                </NavLink>
              ))}
            </nav>

            <div className="hidden md:flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm">
                D
              </div>
            </div>
          </div>
        </div>
      </header>

      <nav className="md:hidden bg-slate-900 border-b border-slate-800 overflow-x-auto">
        <div className="flex px-4 py-2 gap-2">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.end}
              className={({ isActive }) =>
                `flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  isActive
                    ? 'bg-indigo-600 text-white'
                    : 'text-slate-400 bg-slate-800 hover:text-white'
                }`
              }
            >
              <item.icon className="w-3.5 h-3.5" />
              {item.label}
            </NavLink>
          ))}
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="animate-fade-in-up">
          <Outlet />
        </div>
      </main>

      <footer className="border-t border-slate-800 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-slate-500">
            <div className="flex items-center gap-2">
              <LayoutDashboard className="w-4 h-4" />
              <span>数据库管理员工作台 · 版本 1.0.0</span>
            </div>
            <div className="flex items-center gap-6">
              <span>原始行号保留 · 可追溯设计</span>
              <span className="text-slate-600">|</span>
              <span>© 2026 DBA Platform</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
