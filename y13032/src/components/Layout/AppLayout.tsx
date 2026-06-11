import type { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  ScrollText,
  AlertTriangle,
  FileDown,
  User,
} from 'lucide-react';

interface AppLayoutProps {
  children: ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  const location = useLocation();
  const today = new Date().toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long',
  });

  const navItems = [
    { path: '/', label: '对账仪表盘', icon: LayoutDashboard },
    { path: '/transaction/tx-005', label: '重点复核流水', icon: ScrollText },
  ];

  return (
    <div className="min-h-screen flex">
      <aside className="w-60 shrink-0 bg-navy-700 text-cream border-r border-navy-800 flex flex-col">
        <div className="px-5 py-6 border-b border-navy-600/50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-sm bg-amber flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-white" strokeWidth={2.2} />
            </div>
            <div>
              <div className="font-serif text-base font-semibold tracking-wider">
                供应链预付款
              </div>
              <div className="text-[11px] text-navy-200 tracking-widest">
                口径对账 · 风控复核
              </div>
            </div>
          </div>
          <div className="divider-pattern mt-5 opacity-40" />
        </div>

        <nav className="flex-1 py-4 px-3 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              item.path === '/'
                ? location.pathname === '/'
                : location.pathname.startsWith('/transaction');
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-3 py-2 rounded-sm text-sm transition-colors ${
                  isActive
                    ? 'bg-navy-600 text-white shadow-inner'
                    : 'text-navy-200 hover:bg-navy-600/50 hover:text-white'
                }`}
              >
                <Icon className="w-4 h-4" strokeWidth={1.8} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="px-4 py-4 border-t border-navy-600/50">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-navy-500 flex items-center justify-center">
              <User className="w-4 h-4 text-cream" strokeWidth={1.8} />
            </div>
            <div className="min-w-0">
              <div className="text-sm font-medium truncate">小林</div>
              <div className="text-[11px] text-navy-300">风控复核岗</div>
            </div>
          </div>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 shrink-0 border-b border-navy-100 bg-white/70 backdrop-blur-sm px-8 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div
              className="w-1 h-6 bg-amber rounded-sm"
              aria-hidden="true"
            />
            <h1 className="font-serif text-xl font-semibold text-navy-700 tracking-wide">
              供应链预付款口径对账工作台
            </h1>
            <span className="chip bg-navy-50 text-navy-500 border border-navy-100">
              {today}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/transaction/tx-005" className="btn-secondary text-sm">
              <FileDown className="w-4 h-4" strokeWidth={1.8} />
              导出复核说明
            </Link>
          </div>
        </header>
        <main className="flex-1 overflow-auto px-8 py-6">{children}</main>
      </div>
    </div>
  );
}
