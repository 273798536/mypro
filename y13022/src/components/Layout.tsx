import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import {
  FileSpreadsheet,
  Home,
  Layers3,
  Upload,
  Download,
  User,
} from 'lucide-react';
import { useReconciliationStore } from '@/store/useReconciliationStore';

const nav = [
  { to: '/', label: '对账列表', icon: Home },
  { to: '/import', label: '材料导入', icon: Upload },
  { to: '/export', label: '导出中心', icon: Download },
];

export function Layout() {
  const loc = useLocation();
  const operator = useReconciliationStore((s) => s.operator);
  const crumbs: Array<{ label: string; to?: string }> = [{ label: '期货基差口径对账', to: '/' }];
  if (loc.pathname.startsWith('/reconciliation/')) {
    crumbs.push({ label: '对账详情' });
  } else if (loc.pathname === '/import') {
    crumbs.push({ label: '材料导入' });
  } else if (loc.pathname === '/export') {
    crumbs.push({ label: '导出中心' });
  }

  return (
    <div className="relative z-10 flex h-full min-h-screen flex-col">
      <header className="flex items-center justify-between border-b border-ink-700 bg-ink-900/80 px-8 py-4 backdrop-blur">
        <div className="flex items-center gap-6">
          <Link to="/" className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-sm border-2 border-amber-gold bg-amber-gold/10 text-amber-gold shadow-glow-amber">
              <Layers3 size={18} strokeWidth={2.2} />
            </div>
            <div>
              <h1 className="font-serif text-lg font-semibold tracking-wider text-ink-100">
                期货基差口径对账
              </h1>
              <p className="text-[10px] uppercase tracking-[0.18em] text-ink-400">
                Futures Basis Reconciliation Console
              </p>
            </div>
          </Link>
          <nav className="hidden items-center gap-1 border-l border-ink-700 pl-6 md:flex">
            {nav.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === '/'}
                  className={({ isActive }) =>
                    'group flex items-center gap-2 rounded-sm border px-3 py-1.5 text-sm transition-all duration-200 ' +
                    (isActive
                      ? 'border-amber-gold/60 bg-amber-gold/10 text-amber-gold shadow-glow-amber'
                      : 'border-ink-700 text-ink-300 hover:border-ink-500 hover:bg-ink-800 hover:text-ink-100')
                  }
                >
                  <Icon size={15} strokeWidth={1.8} />
                  {item.label}
                </NavLink>
              );
            })}
          </nav>
        </div>
        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-2 text-ink-300">
            {crumbs.map((c, i) => (
              <span key={i} className="flex items-center gap-2">
                {c.to ? (
                  <Link to={c.to} className="hover:text-amber-gold">
                    {c.label}
                  </Link>
                ) : (
                  <span className="text-ink-100">{c.label}</span>
                )}
                {i < crumbs.length - 1 && <span className="text-ink-600">/</span>}
              </span>
            ))}
          </div>
          <div className="flex items-center gap-2 rounded-sm border border-ink-700 bg-ink-800 px-3 py-1.5">
            <User size={14} className="text-amber-gold" />
            <span className="font-medium text-ink-200">{operator}</span>
          </div>
        </div>
      </header>

      <main className="relative flex-1">
        <Outlet />
      </main>

      <footer className="border-t border-ink-700 bg-ink-900/80 px-8 py-3 text-[11px] text-ink-500">
        <div className="flex items-center justify-between">
          <span>
            <FileSpreadsheet size={12} className="mr-1.5 inline" />
            清算运营工作台 · 数据本地持久化存储
          </span>
          <span>v0.1 · {new Date().toISOString().slice(0, 10)}</span>
        </div>
      </footer>
    </div>
  );
}
