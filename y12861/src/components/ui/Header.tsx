import { Anchor, FileText, BarChart3 } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';

export function Header() {
  const location = useLocation();

  const navItems = [
    { path: '/', label: '海域概览', icon: Anchor },
    { path: '/review', label: '复核工作台', icon: FileText },
    { path: '/report', label: '复核报告', icon: BarChart3 },
  ];

  return (
    <header className="h-14 bg-slate-900/80 backdrop-blur-md border-b border-slate-700/50 flex items-center justify-between px-6 z-30 relative">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center">
          <Anchor size={18} className="text-white" />
        </div>
        <div>
          <h1 className="text-base font-bold text-white">海钓比赛渔获台账</h1>
          <p className="text-xs text-slate-400">海事复核系统</p>
        </div>
      </div>

      <nav className="flex items-center gap-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all',
                isActive
                  ? 'bg-cyan-500/20 text-cyan-400'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              )}
            >
              <Icon size={16} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="flex items-center gap-3">
        <div className="text-right">
          <div className="text-sm font-medium text-slate-200">海事安全员</div>
          <div className="text-xs text-slate-500">在线</div>
        </div>
        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white text-sm font-bold">
          海
        </div>
      </div>
    </header>
  );
}
