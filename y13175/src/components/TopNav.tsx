import { Link, useLocation } from 'react-router-dom';
import { Activity, FileText, Handshake, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function TopNav() {
  const location = useLocation();

  const navItems = [
    { path: '/', label: '复算工作台', icon: Activity },
    { path: '/reports', label: '报告中心', icon: FileText },
    { path: '/handover', label: '换班交接', icon: Handshake },
  ];

  return (
    <header className="h-14 bg-slate-900/90 backdrop-blur-sm border-b border-slate-800 flex items-center justify-between px-6 flex-shrink-0">
      <div className="flex items-center gap-8">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-red-500 to-amber-500 flex items-center justify-center">
            <Activity className="w-5 h-5 text-white" />
          </div>
          <h1 className="text-lg font-semibold text-white tracking-wide">
            激光散斑实验复算系统
          </h1>
        </div>
        <nav className="flex items-center gap-1">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            const Icon = item.icon;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  'flex items-center gap-2 px-4 py-2 rounded-md text-sm transition-all',
                  isActive
                    ? 'bg-slate-800 text-white shadow-inner'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                )}
              >
                <Icon className="w-4 h-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
      <div className="flex items-center gap-4">
        <div className="text-xs text-slate-500">
          当前值班：<span className="text-slate-300">陈博士</span>
        </div>
        <button className="p-2 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition-colors">
          <Settings className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
}
