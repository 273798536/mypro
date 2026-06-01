import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Calculator,
  FolderTree,
  AlertTriangle,
  FileBarChart,
  Settings
} from 'lucide-react';
import { cn } from '../lib/utils';

const navItems = [
  { path: '/', label: '质检面板', icon: LayoutDashboard },
  { path: '/workbench', label: '卡方检验', icon: Calculator },
  { path: '/classification', label: '智能归类', icon: FolderTree },
  { path: '/diagnosis', label: '异常诊断', icon: AlertTriangle },
  { path: '/report', label: '报告导出', icon: FileBarChart }
];

export function Sidebar() {
  const location = useLocation();

  return (
    <aside className="fixed left-0 top-0 h-screen w-64 bg-gradient-to-b from-slate-900 to-slate-800 text-white shadow-xl z-50">
      <div className="p-6 border-b border-slate-700">
        <h1 className="text-xl font-bold tracking-tight flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-cyan-400 rounded-lg flex items-center justify-center">
            <Calculator size={18} />
          </div>
          卡方质检系统
        </h1>
        <p className="text-xs text-slate-400 mt-1">Chi-Square Quality Control</p>
      </div>

      <nav className="p-4 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={cn(
                'flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 group',
                isActive
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                  : 'text-slate-300 hover:bg-slate-700/50 hover:text-white'
              )}
            >
              <Icon size={20} className={cn(
                'transition-transform duration-200',
                isActive ? 'scale-110' : 'group-hover:scale-110'
              )} />
              <span className="font-medium text-sm">{item.label}</span>
              {isActive && (
                <div className="ml-auto w-1.5 h-1.5 bg-white rounded-full" />
              )}
            </NavLink>
          );
        })}
      </nav>

      <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-slate-700">
        <button className="flex items-center gap-3 px-4 py-3 w-full rounded-lg text-slate-300 hover:bg-slate-700/50 hover:text-white transition-all duration-200">
          <Settings size={20} />
          <span className="font-medium text-sm">系统设置</span>
        </button>
      </div>
    </aside>
  );
}
