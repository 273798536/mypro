import { NavLink, useLocation } from 'react-router-dom';
import {
  Scissors, Sparkles, ShieldAlert, AlertTriangle, FileDown, Home, Menu
} from 'lucide-react';
import BatchSelector from './BatchSelector';

const navItems = [
  { path: '/', label: '工具面板', icon: Home },
  { path: '/slice', label: '点云切片', icon: Scissors },
  { path: '/outlier', label: '离群点漂浮', icon: Sparkles },
  { path: '/collision', label: '碰撞检测', icon: ShieldAlert },
  { path: '/anomaly', label: '异常处理', icon: AlertTriangle },
  { path: '/export', label: '报告导出', icon: FileDown },
];

export default function TopNav() {
  const location = useLocation();

  return (
    <header className="bg-industrial-800 border-b border-industrial-600 px-6 py-3 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <Menu className="w-5 h-5 text-slate-400" />
        <h1 className="font-mono text-base font-semibold tracking-wide text-slate-100">
          柔性机械臂避障训练 · 计算工具
        </h1>
        <span className="text-xs text-slate-500 font-mono ml-2">v1.0.0</span>
      </div>

      <nav className="flex items-center gap-1">
        {navItems.map(item => {
          const Icon = item.icon;
          const active = location.pathname === item.path;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={`flex items-center gap-2 px-3 py-1.5 text-sm rounded-industrial border transition-all ${
                active
                  ? 'bg-industrial-600 border-slate-400 text-slate-100'
                  : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-industrial-700'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      <div className="flex items-center gap-4">
        <BatchSelector />
      </div>
    </header>
  );
}
