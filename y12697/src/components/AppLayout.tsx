import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { Database, ArrowLeft } from 'lucide-react';

export default function AppLayout() {
  const location = useLocation();
  const showBack = !['/', ''].includes(location.pathname);

  return (
    <div className="min-h-screen bg-charcoal-950 text-charcoal-100 flex flex-col">
      <header className="border-b border-charcoal-800 bg-charcoal-900/80 backdrop-blur sticky top-0 z-40">
        <div className="h-14 px-6 flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Database className="w-5 h-5 text-alert-orange" />
            <span className="font-mono text-base font-semibold tracking-wide">
              数据库锁等待拓扑<span className="text-charcoal-500"> · </span>
              <span className="text-charcoal-400 font-normal text-sm">施工交底工作台</span>
            </span>
          </div>
          <nav className="ml-8 flex items-center gap-1 text-sm">
            <NavLink
              to="/"
              end
              className={({ isActive }) =>
                `px-3 py-1.5 rounded-sm transition-colors ${
                  isActive ? 'bg-industrial-800 text-white border-b-2 border-alert-orange' : 'text-charcoal-400 hover:text-white hover:bg-charcoal-800'
                }`
              }
            >
              截图清单
            </NavLink>
          </nav>
          {showBack && (
            <Link to="/" className="ml-auto btn-ghost">
              <ArrowLeft className="w-4 h-4" />
              返回清单
            </Link>
          )}
        </div>
      </header>
      <main className="flex-1">
        <Outlet />
      </main>
      <footer className="border-t border-charcoal-800 py-3 px-6 text-xs text-charcoal-500 flex items-center justify-between">
        <span className="font-mono">DB-LOCK-TOPOLOGY · v1.0.0</span>
        <span>剖切与参数共用同一处理记录 · 历史可追溯 · 报告一键导出</span>
      </footer>
    </div>
  );
}
