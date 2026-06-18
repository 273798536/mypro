import { NavLink, Outlet } from 'react-router-dom';
import { Database, Search, GitCompare, FileDown, Sparkles } from 'lucide-react';
import { useLedgerStore } from '@/store/ledgerStore';

export default function Layout() {
  const { records, isFirstVisit, loadSampleData, markFirstVisitDone } = useLedgerStore();
  const anomalyCount = records.filter((r) => r.anomaly_type !== 'normal').length;

  const navItems = [
    { to: '/', label: '台账列表', icon: Database, badge: anomalyCount > 0 ? anomalyCount : undefined },
    { to: '/review', label: '复核面板', icon: GitCompare },
    { to: '/export', label: '报告导出', icon: FileDown },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      {isFirstVisit && records.length === 0 && (
        <div className="bg-amber-50 border-b border-amber-200 px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-amber-800">
            <Sparkles className="w-4 h-4" />
            <span>首次打开，建议先加载示例数据查看备份缺口等典型记录的完整格式</span>
          </div>
          <div className="flex gap-2">
            <button
              onClick={loadSampleData}
              className="px-3 py-1 text-xs bg-amber-600 text-white hover:bg-amber-700 transition-colors"
            >
              加载示例数据
            </button>
            <button
              onClick={markFirstVisitDone}
              className="px-3 py-1 text-xs border border-amber-300 text-amber-700 hover:bg-amber-100 transition-colors"
            >
              暂不加载
            </button>
          </div>
        </div>
      )}

      <header className="bg-brand text-white px-6 py-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <Search className="w-6 h-6 text-amber-400" />
          <div>
            <h1 className="font-serif text-lg font-semibold tracking-wide">物化视图刷新台账</h1>
            <p className="text-xs text-slate-400">MV Refresh Ledger · 异常追踪与结论追溯</p>
          </div>
        </div>
        <nav className="flex items-center gap-1">
          {navItems.map(({ to, label, icon: Icon, badge }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-2 px-4 py-2 text-sm transition-colors ${
                  isActive ? 'bg-brand-light text-white' : 'text-slate-300 hover:text-white hover:bg-brand-light/60'
                }`
              }
            >
              <Icon className="w-4 h-4" />
              <span>{label}</span>
              {badge !== undefined && (
                <span className="ml-1 px-1.5 py-0.5 text-xs bg-amber-500 text-brand rounded-sm font-medium">
                  {badge}
                </span>
              )}
            </NavLink>
          ))}
        </nav>
      </header>

      <main className="flex-1">
        <Outlet />
      </main>
    </div>
  );
}
