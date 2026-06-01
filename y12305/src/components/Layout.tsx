import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { Calculator, FileUp, History, GitBranch, AlertTriangle, X } from 'lucide-react';
import { useAppStore } from '../store';

const navItems = [
  { path: '/', label: '核算工作台', icon: Calculator },
  { path: '/import', label: '数据导入', icon: FileUp },
  { path: '/versions', label: '版本追踪', icon: History },
];

export function Layout() {
  const location = useLocation();
  const error = useAppStore((state) => state.error);
  const clearError = useAppStore((state) => state.clearError);

  const showTraceNav = location.pathname.startsWith('/trace/');

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-brand text-white shadow-lg">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center">
                <GitBranch className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-xl font-bold">分段电价逆向核算系统</h1>
                <p className="text-xs text-white/70">版本追踪 · 数据溯源 · 口径清晰</p>
              </div>
            </div>
            <nav className="flex items-center gap-1">
              {navItems.map((item) => (
                <NavLink
                  key={item.path}
                  end={item.path === '/'}
                  to={item.path}
                  className={({ isActive }) =>
                    `flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                      isActive
                        ? 'bg-white/20 text-white'
                        : 'text-white/70 hover:text-white hover:bg-white/10'
                    }`
                  }
                >
                  <item.icon className="w-4 h-4" />
                  {item.label}
                </NavLink>
              ))}
              {showTraceNav && (
                <div className="flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium bg-white/20 text-white">
                  <GitBranch className="w-4 h-4" />
                  数据溯源
                </div>
              )}
            </nav>
          </div>
        </div>
      </header>

      {error && (
        <div className="bg-red-50 border-b border-red-200">
          <div className="container mx-auto px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-red-700">
                <AlertTriangle className="w-4 h-4" />
                <span className="text-sm">{error}</span>
              </div>
              <button
                onClick={clearError}
                className="text-red-500 hover:text-red-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      <main className="flex-1 container mx-auto px-4 py-6">
        <Outlet />
      </main>

      <footer className="bg-slate-800 text-slate-400 py-4 text-sm">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between">
          <p>© 2024 分段电价逆向核算系统</p>
          <p>
            <Link to="/" className="hover:text-white transition-colors">返回首页</Link>
          </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
