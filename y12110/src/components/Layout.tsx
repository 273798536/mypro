import { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { Database, FlaskConical, BarChart3, AlertTriangle, Menu, X, Building2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { path: '/', label: '数据输入', icon: Database },
  { path: '/experiments', label: '批量实验', icon: FlaskConical },
  { path: '/results', label: '结果分析', icon: BarChart3 },
  { path: '/anomaly', label: '异常场景', icon: AlertTriangle },
];

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <aside
        className={cn(
          'bg-gradient-to-b from-blue-900 to-blue-950 text-white transition-all duration-300 flex flex-col',
          sidebarOpen ? 'w-64' : 'w-16'
        )}
      >
        <div className="h-16 flex items-center justify-between px-4 border-b border-blue-800">
          {sidebarOpen && (
            <div className="flex items-center gap-2">
              <Building2 className="w-6 h-6 text-blue-300" />
              <span className="font-bold text-lg">政务排队模拟</span>
            </div>
          )}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 hover:bg-blue-800 rounded-lg transition-colors"
          >
            {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        <nav className="flex-1 py-4 px-3">
          <ul className="space-y-1">
            {navItems.map((item) => (
              <li key={item.path}>
                <NavLink
                  to={item.path}
                  end={item.path === '/'}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200',
                      isActive
                        ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/30'
                        : 'text-blue-200 hover:bg-blue-800/50 hover:text-white'
                    )
                  }
                >
                  <item.icon className="w-5 h-5 flex-shrink-0" />
                  {sidebarOpen && <span className="text-sm font-medium">{item.label}</span>}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        {sidebarOpen && (
          <div className="p-4 border-t border-blue-800">
            <div className="bg-blue-800/50 rounded-lg p-3">
              <p className="text-xs text-blue-300">排队论M/M/c模型</p>
              <p className="text-xs text-blue-400 mt-1">窗口优化分析工具</p>
            </div>
          </div>
        )}
      </aside>

      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6">
          <h1 className="text-lg font-semibold text-slate-800">
            政务大厅排队论窗口配置实验平台
          </h1>
          <div className="flex items-center gap-4">
            <div className="text-sm text-slate-500">
              管理员
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
