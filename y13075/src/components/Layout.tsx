import { Link, NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Database,
  AlertTriangle,
  FileDown,
  Snowflake,
  X,
  RefreshCw,
  Loader2,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { useAppStore } from '@/store/useAppStore';

const NAV_ITEMS = [
  { to: '/overview', label: '复核总览', Icon: LayoutDashboard },
  { to: '/sensors', label: '传感器记录', Icon: Database },
  { to: '/export', label: '报告导出', Icon: FileDown },
];

export default function Layout({ children }: { children: ReactNode }) {
  const { stats, loading, error, reloadAll, initialized } = useAppStore();
  const loc = useLocation();
  const showError = !!error && initialized !== undefined;

  return (
    <div className="min-h-screen flex flex-col bg-[#f6f8fb]">
      {showError ? (
        <div className="bg-status-anomaly text-white shrink-0 border-b border-red-700">
          <div className="px-6 py-2.5 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold">数据加载失败 · 功能不可用</div>
              <div className="text-xs mt-0.5 text-red-100/90 break-all">
                原因：{error}
              </div>
              <div className="text-[11px] mt-1 text-red-100/80">
                可能原因：后端服务未启动（应为端口 3001）、前后端路径不匹配、磁盘无法写入 JSON。
                请先按 README 确认「npm run dev」同时拉起 Vite + Express。
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded text-xs font-medium bg-white/15 hover:bg-white/25 transition disabled:opacity-50"
                onClick={() => reloadAll()}
                disabled={loading}
              >
                {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                重试
              </button>
              <button
                className="inline-flex items-center justify-center w-7 h-7 rounded hover:bg-white/10 transition text-white/80"
                onClick={() => useAppStore.setState({ error: null })}
                title="关闭提示"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <div className="flex flex-1 min-h-0">
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
                  <Icon style={{ width: 18, height: 18 }} />
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
              <div className="text-xs text-brand-100/70 animate-pulse flex items-center gap-1.5">
                <Loader2 className="w-3 h-3 animate-spin" /> 同步中…
              </div>
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
            ) : (
              <div className="text-[11px] text-brand-200/70">尚未初始化数据</div>
            )}
          </div>
        </aside>

        {/* 主内容区 */}
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-14 shrink-0 bg-white border-b border-brand-100 flex items-center px-6 justify-between">
            <div className="flex items-center gap-3">
              <h1 className="text-[15px] font-semibold text-brand-800 font-mono tracking-wide">
                数据中心冷通道空间复核
              </h1>
              {loading ? (
                <span className="chip bg-brand-50 text-brand-500 border border-brand-100">
                  <Loader2 className="w-3 h-3 animate-spin inline mr-1" />
                  正在同步
                </span>
              ) : null}
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
            {!initialized && !loading && !error ? (
              <EmptyState />
            ) : (
              children
            )}
          </main>
        </div>
      </div>
    </div>
  );
}

function EmptyState() {
  const { reloadAll, loading } = useAppStore();
  return (
    <div className="max-w-md mx-auto mt-24 text-center">
      <div className="w-16 h-16 mx-auto mb-4 rounded-xl bg-brand-50 border border-brand-100 flex items-center justify-center">
        <Snowflake className="w-8 h-8 text-brand-500" />
      </div>
      <h2 className="text-lg font-semibold text-brand-800 mb-1">工具尚未初始化</h2>
      <p className="text-sm text-brand-500 mb-4">
        首次使用需要从后端读取并初始化传感器数据。请确保后端服务（端口 3001）已经启动。
      </p>
      <button
        className="btn-primary"
        onClick={() => reloadAll()}
        disabled={loading}
      >
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
        初始化并加载数据
      </button>
    </div>
  );
}
