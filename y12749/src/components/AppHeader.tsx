import { Link, useLocation } from 'react-router-dom';
import { BarChart3, Settings2, FileText, LayoutDashboard, Scale } from 'lucide-react';

export default function AppHeader() {
  const { pathname } = useLocation();
  const navs = [
    { to: '/', label: '工作台', icon: LayoutDashboard },
    { to: '/review', label: '复核结论', icon: Scale },
    { to: '/export', label: '导出报告', icon: FileText },
  ];
  return (
    <header className="no-print bg-navy-600 text-white px-8 py-3 flex items-center justify-between shadow-md">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded bg-white/10 flex items-center justify-center">
          <BarChart3 size={20} />
        </div>
        <div>
          <h1 className="font-serif text-lg leading-tight">竞赛题难度均衡</h1>
          <p className="text-[11px] text-navy-100/80 leading-tight">数据分析员日常复核工具</p>
        </div>
      </div>
      <nav className="flex items-center gap-1">
        {navs.map(({ to, label, icon: Icon }) => {
          const active = pathname === to || (to !== '/' && pathname.startsWith(to));
          return (
            <Link
              key={to}
              to={to}
              className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded text-sm transition-all ${
                active ? 'bg-white/15 text-white' : 'text-navy-100/80 hover:bg-white/5 hover:text-white'
              }`}
            >
              <Icon size={15} />
              {label}
            </Link>
          );
        })}
      </nav>
      <div className="flex items-center gap-2 text-xs text-navy-100/70">
        <Settings2 size={14} />
        <span>v1.0 · 本地模式</span>
      </div>
    </header>
  );
}
