import { Outlet, NavLink, useLocation } from 'react-router-dom';
import { LayoutDashboard, FileStack, GitCompareArrows, ScrollText } from 'lucide-react';
import { cn } from '@/lib/utils';

function useBatchId(): string | null {
  const { pathname } = useLocation();
  const m = pathname.match(/^\/batches\/([^/]+)/);
  return m ? m[1] : null;
}

export function Layout() {
  const batchId = useBatchId();

  const navCls = ({ isActive }: { isActive: boolean }) =>
    cn(
      'flex items-center gap-2.5 rounded-sm px-3 py-2 text-sm transition-colors',
      isActive
        ? 'bg-teal-tint text-teal font-medium'
        : 'text-ink-soft hover:bg-paper-200',
    );

  return (
    <div className="min-h-screen flex flex-col">
      <header className="h-14 border-b border-ink/10 bg-paper-50/80 backdrop-blur-sm flex items-center px-6 sticky top-0 z-30">
        <div className="flex items-baseline gap-3">
          <h1 className="font-display text-lg text-ink">标注员一致性复盘</h1>
          <span className="text-[11px] text-ink-muted tracking-wide">
            可反查 · 重启可查
          </span>
        </div>
        <div className="ml-auto font-mono text-[11px] text-ink-faint">
          Consistency Review Ledger
        </div>
      </header>

      <div className="flex flex-1">
        <aside className="w-56 shrink-0 border-r border-ink/10 bg-paper-100/60 flex flex-col py-4 px-3 gap-1">
          <NavLink to="/" className={navCls} end>
            <LayoutDashboard size={16} /> 复盘工作台
          </NavLink>

          {batchId && (
            <>
              <div className="px-3 pt-4 pb-1 text-[10px] uppercase tracking-widest text-ink-faint">
                当前批次
              </div>
              <NavLink to={`/batches/${batchId}`} className={navCls}>
                <FileStack size={16} /> 批次详情
              </NavLink>
              <NavLink to={`/batches/${batchId}/report`} className={navCls}>
                <ScrollText size={16} /> 报告与对比
              </NavLink>
            </>
          )}

          <div className="mt-auto px-3 py-2 flex items-center gap-1.5 text-[11px] text-ink-faint">
            <GitCompareArrows size={13} />
            <span>结论可反查至切分清单</span>
          </div>
        </aside>

        <main className="flex-1 min-w-0 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
