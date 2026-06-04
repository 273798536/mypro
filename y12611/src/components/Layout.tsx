import { NavLink, Outlet } from 'react-router-dom';
import { Upload, AlertTriangle, FileBarChart, LayoutDashboard, MapPin } from 'lucide-react';
import { cn } from '../lib/utils';

const navItems = [
  { path: '/', label: '数据导入', icon: Upload },
  { path: '/anomalies', label: '异常筛选', icon: AlertTriangle },
  { path: '/report', label: '报告导出', icon: FileBarChart },
];

export default function Layout() {
  return (
    <div className="min-h-screen bg-ocean-surface flex">
      <aside className="w-64 bg-white border-r border-ocean-border flex flex-col">
        <div className="p-6 border-b border-ocean-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary-800 rounded-lg flex items-center justify-center">
              <MapPin className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-serif font-bold text-primary-900 text-lg">海岸线描边器</h1>
              <p className="text-xs text-ocean-textLight">Coastline Editor</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-2">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200',
                  isActive
                    ? 'bg-primary-50 text-primary-700 font-medium shadow-sm'
                    : 'text-ocean-text hover:bg-ocean-surface hover:text-primary-600'
                )
              }
            >
              <item.icon className="w-5 h-5" />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="p-4 border-t border-ocean-border">
          <div className="bg-ocean-surface rounded-lg p-4">
            <div className="flex items-center gap-2 text-sm text-ocean-textLight mb-2">
              <LayoutDashboard className="w-4 h-4" />
              <span>系统状态</span>
            </div>
            <p className="text-xs text-ocean-textLight">当前版本 v1.0.0</p>
          </div>
        </div>
      </aside>

      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 bg-white border-b border-ocean-border flex items-center justify-between px-6">
          <h2 className="font-serif text-xl font-semibold text-ocean-text">
            {navItems.find(item => item.path === window.location.pathname)?.label || '海岸线变化描边器'}
          </h2>
          <div className="flex items-center gap-4">
            <span className="text-sm text-ocean-textLight">训练员模式</span>
            <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
              <span className="text-sm font-medium text-primary-700">编</span>
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
