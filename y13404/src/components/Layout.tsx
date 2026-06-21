import React from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { LayoutDashboard, AlertTriangle, FileBarChart, BookOpen } from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { path: '/dashboard', label: '首页看板', icon: LayoutDashboard },
  { path: '/anomaly', label: '异常明细', icon: AlertTriangle },
  { path: '/report', label: '报告汇总', icon: FileBarChart },
];

const Layout: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex">
      <aside className="w-64 bg-slate-900 text-white flex flex-col shadow-2xl">
        <div className="p-6 border-b border-slate-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center shadow-lg">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-bold text-lg tracking-tight" style={{ fontFamily: "'Playfair Display', serif" }}>
                拓扑路径
              </h1>
              <p className="text-xs text-slate-400">报告讲解系统</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 group',
                  isActive
                    ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-500/30'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                )
              }
            >
              <item.icon className={cn(
                'w-5 h-5 transition-transform duration-200',
                'group-hover:scale-110'
              )} />
              <span className="font-medium text-sm">{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-700">
          <div className="bg-slate-800 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white font-bold text-sm">
                叶
              </div>
              <div>
                <p className="text-sm font-medium">老叶（复核员）</p>
                <p className="text-xs text-slate-400">数学教研团队</p>
              </div>
            </div>
          </div>
        </div>
      </aside>

      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white/80 backdrop-blur-sm border-b border-slate-200 px-8 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-slate-800" style={{ fontFamily: "'Playfair Display', serif" }}>
              拓扑路径报告讲解
            </h2>
            <p className="text-sm text-slate-500">基于真实工作流的系统化复核流程</p>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-xs text-slate-400">
              最后计算：{new Date().toLocaleString('zh-CN')}
            </span>
          </div>
        </header>

        <div className="flex-1 overflow-auto p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default Layout;
