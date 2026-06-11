import { Link, NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Database,
  AlertTriangle,
  FileDown,
  Snowflake,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { useAppStore } from '@/store/useAppStore';

const NAV_ITEMS = [
  { to: '/overview', label: '复核总览', Icon: LayoutDashboard },
  { to: '/sensors', label: '传感器记录', Icon: Database },
  { to: '/export', label: '报告导出', Icon: FileDown },
];

export default function Layout({ children }: { children: ReactNode }) {
  const { stats, loading } = useAppStore();
  const loc = useLocation();

  return (
    <div className="min-h-screen flex bg-[#f6f8fb]">
      {/* 侧边导航 */}
      <aside className="w-60 shrink-0 bg-brand-600 text-brand-50 flex flex-col">
        <div className="h-16 flex items-center gap-2.5 px-5 border-b border-brand-500/40">
          <div className="w-9 h-9 rounded-md bg-brand-50/10 flex items-center justify-center border border-brand-500/40">
            <Snowflake className="w-5 h-5 text-cyan-200" />
          </div>
          <div className="leading-tight">
            <div className="font-mono text-[13px] font-semibold tracking-wide">冷通道复核</div>
            <div className="text-[11px] text-brand-200/80">Cold-Aisle Review</div>
          </div>
        </div>

        <nav className="flex-1 py-4 px-3 space-y-1">
          {NAV_ITEMS.map(({ to, label, Icon }) => {
            const active =
              loc.pathname === to || (to !== '/overview' && loc.pathname.startsWith(to));
            return (
              <NavLink
                key={to}
                to={to}
                className={
                  'flex items-center gap-2.5 px-3 py-2.5 rounded-md text-sm transition ' +
                  (active
                    ? 'bg-brand-500 text-white shadow-inner'
                    : 'text-brand-100/90 hover:bg-brand-500/50 hover:text-white')
                }
              >
                <Icon className="w-4.5 h-4.5" style={{ width: 18, height: 18 }} />
                <span>{label}</span>
                {to === '/sensors' && stats && stats.dirty_count > 0 ? (
                  <span className="ml-auto chip bg-status-anomaly/90 text-white text-[10px] px-1.5 py-0.5">
                    {stats.dirty_count}
                  </span>
                ) : null}
              </NavLink>
            );
          })}
        </nav>

        <div className="p-4 border-t border-brand-500/40 space-y-1.5">
          <div className="text-[11px] uppercase tracking-wider text-brand-200/70">状态概览</div>
          {loading ? (
            <div className="text-xs text-brand-100/70 animate-pulse">加载中…</div>
          ) : stats ? (
            <div className="grid grid-cols-2 gap-1.5 text-[11px]">
              <div className="rounded bg-brand-500/40 px-2 py-1.5 border border-brand-500/60">
                <div className="text-brand-100/80">异常</div>
                <div className="font-mono text-base font-semibold">{stats.total_anomalies}</div>
              </div>
              <div className="rounded bg-status-pending/90 px-2 py-1.5">
                <div className="text-white/85">待确认</div>
                <div className="font-mono text-base font-semibold text-white">{stats.pending_count}</div>
              </div>
            </div>
          ) : null}
        </div>
      </aside>

      {/* 主内容区 */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-14 shrink-0 bg-white border-b border-brand-100 flex items-center px-6 justify-between">
          <div>
            <h1 className="text-[15px] font-semibold text-brand-800 font-mono tracking-wide">
              数据中心冷通道空间复核
            </h1>
          </div>
          <div className="flex items-center gap-2">
            {stats?.dirty_count ? (
              <Link to="/sensors" className="chip bg-red-50 text-status-anomaly border border-red-200 hover:bg-red-100">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>{stats.dirty_count} 条脏数据（保留原始值）</span>
              </Link>
            ) : null}
            <span className="chip bg-brand-50 text-brand-600 border border-brand-100">
              v0.1 · 本地持久化
            </span>
          </div>
        </header>

        <main className="flex-1 overflow-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
