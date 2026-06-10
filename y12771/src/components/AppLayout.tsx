import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { Upload, LayoutDashboard, Tags, FileDown, FlaskConical, History, AlertTriangle } from 'lucide-react';
import { useBatchStore } from '../store/batchStore';

const navItems = [
  { to: '/', label: '数据上传', icon: Upload, end: true },
  { to: '/dashboard', label: '批次报告看板', icon: LayoutDashboard },
  { to: '/annotation', label: '官能团标注', icon: Tags },
  { to: '/export', label: '报告导出', icon: FileDown },
];

export default function AppLayout() {
  const batch = useBatchStore((s) => s.currentBatch);
  const confirmed = batch.annotations.filter((a) => a.confirmed).length;
  const total = batch.annotations.length;
  const issues = batch.dataQuality.filter((d) => d.severity !== 'info').length;
  const loc = useLocation();

  return (
    <div className="flex min-h-screen bg-ink-50 grain-bg">
      <aside className="sticky top-0 flex h-screen w-64 flex-col border-r border-ink-100 bg-white">
        <div className="flex items-center gap-3 border-b border-ink-100 px-5 py-5">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-ink-800 to-ink-600 text-white shadow-md">
            <FlaskConical size={20} />
          </div>
          <div>
            <div className="font-serif text-lg font-semibold text-ink-900 leading-tight">IR 官能团标注</div>
            <div className="text-xs text-ink-500">学生实验分析工作台</div>
          </div>
        </div>

        <nav className="flex-1 space-y-1 px-3 py-4">
          {navItems.map(({ to, label, icon: Icon, end }) => {
            const active = end ? loc.pathname === to : loc.pathname.startsWith(to);
            return (
              <NavLink
                key={to}
                to={to}
                className={`flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-all ${
                  active
                    ? 'bg-ink-800 text-white shadow-card'
                    : 'text-ink-600 hover:bg-ink-50 hover:text-ink-900'
                }`}
              >
                <Icon size={18} />
                <span>{label}</span>
              </NavLink>
            );
          })}
        </nav>

        <div className="border-t border-ink-100 p-4">
          <div className="rounded-lg bg-ink-50 p-3">
            <div className="mb-1.5 text-xs font-medium text-ink-500">当前批次</div>
            <div className="mb-2 truncate text-sm font-semibold text-ink-900">{batch.batchName}</div>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1 text-ink-500"><History size={12} /> 标注进度</span>
                <span className="font-medium text-moss-700">{confirmed}/{total}</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-ink-100">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-moss-400 to-moss-600 transition-all"
                  style={{ width: `${total ? (confirmed / total) * 100 : 0}%` }}
                />
              </div>
              {issues > 0 && (
                <div className="flex items-center gap-1 pt-1 text-xs text-amber-700">
                  <AlertTriangle size={12} /> 需关注 {issues} 项数据质量
                </div>
              )}
            </div>
          </div>
        </div>
      </aside>

      <main className="flex-1 overflow-x-hidden">
        <div className="container py-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
