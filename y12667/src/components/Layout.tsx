import { Link, Outlet, useLocation } from 'react-router-dom';
import { LayoutDashboard, FileText, History, AlertTriangle, Download } from 'lucide-react';

export default function Layout() {
  const location = useLocation();

  const navItems = [
    { path: '/', label: '模拟记录', icon: LayoutDashboard, exact: true },
    { path: '/about', label: '关于说明', icon: FileText, exact: true },
  ];

  const isActive = (path: string, exact?: boolean) => {
    if (exact) return location.pathname === path;
    return location.pathname.startsWith(path);
  };

  return (
    <div className="min-h-screen flex bg-slate-900">
      <aside className="w-60 bg-slate-850 border-r border-slate-700 flex flex-col">
        <div className="p-5 border-b border-slate-700">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded bg-safety-orange/20 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-safety-orange" />
            </div>
            <div>
              <h1 className="font-mono font-bold text-sm text-white">救援绳索角度模拟</h1>
              <p className="text-xs text-slate-400">RESCUE ROPE SIM</p>
            </div>
          </div>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path, item.exact);
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-3 py-2.5 rounded text-sm transition-colors ${
                  active
                    ? 'bg-safety-orange/15 text-safety-orange border-l-2 border-safety-orange'
                    : 'text-slate-300 hover:bg-slate-700/50 hover:text-white'
                }`}
              >
                <Icon className="w-4 h-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="p-4 border-t border-slate-700">
          <div className="text-xs text-slate-500">
            <p>展馆讲解员工作台</p>
            <p className="mt-1">版本 v1.0.0</p>
          </div>
        </div>
      </aside>
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}

export { History, Download };
