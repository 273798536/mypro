import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  AlertTriangle,
  History,
  ListChecks,
  Anchor,
} from 'lucide-react';

const navItems = [
  { path: '/batches', label: '碰撞预审', icon: LayoutDashboard },
  { path: '/anomalies', label: '异常队列', icon: AlertTriangle },
  { path: '/history', label: '改判历史', icon: History },
];

export default function Layout({ children }: { children: React.ReactNode }) {
  const location = useLocation();

  return (
    <div className="min-h-screen flex flex-col bg-industrial-bg text-industrial-text">
      <header className="h-14 border-b border-industrial-border bg-industrial-panel flex items-center px-6 gap-6 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-alert-orange rounded-sm flex items-center justify-center">
            <Anchor className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="font-mono text-sm font-bold tracking-wide">
              WHARF-DSS
            </div>
            <div className="text-[10px] text-industrial-muted -mt-0.5">
              码头危险品库碰撞预审
            </div>
          </div>
        </div>

        <nav className="flex items-center gap-1 ml-6">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active =
              location.pathname === item.path ||
              location.pathname.startsWith(item.path + '/');
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={
                  'flex items-center gap-2 px-4 py-2 rounded-sm text-sm transition-all ' +
                  (active
                    ? 'bg-alert-orange/20 text-alert-orange border border-alert-orange/30'
                    : 'text-industrial-muted hover:text-industrial-text hover:bg-slate-700/40')
                }
              >
                <Icon className="w-4 h-4" />
                <span>{item.label}</span>
                {item.path === '/anomalies' && (
                  <span className="ml-1 px-1.5 py-0.5 text-[10px] bg-alert-red text-white rounded-sm font-mono">
                    LIVE
                  </span>
                )}
              </NavLink>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-3">
          <div className="flex items-center gap-2 text-xs text-industrial-muted">
            <ListChecks className="w-3.5 h-3.5" />
            <span>操作员：</span>
            <span className="text-industrial-text font-medium">
              方案经理-小赵
            </span>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-auto">{children}</main>

      <footer className="h-8 border-t border-industrial-border bg-industrial-panel flex items-center px-6 text-[11px] text-industrial-muted font-mono shrink-0">
        <span>SYSTEM STATUS: </span>
        <span className="text-alert-green ml-1">● NORMAL</span>
        <span className="mx-3">|</span>
        <span>数据库：SQLite (data/wharf_collision.db)</span>
        <span className="mx-3">|</span>
        <span>原始坐标保留策略：</span>
        <span className="text-alert-orange">不自动清洗脏数据</span>
      </footer>
    </div>
  );
}
