import { NavLink, useLocation } from 'react-router-dom';
import { LayoutDashboard, Search, FileCheck, Clock, FileOutput, GitBranch } from 'lucide-react';
import { useStore } from '@/store';

const NAV_ITEMS = [
  { path: '/', label: '分析工作台', icon: LayoutDashboard },
  { path: '/review', label: '批量复核中心', icon: FileCheck, badgeKey: 'pendingReview' as const },
  { path: '/draft', label: '草稿增量管理', icon: Clock, badgeKey: 'draft' as const },
  { path: '/export', label: '报告导出', icon: FileOutput },
];

interface SidebarProps {
  pendingReviewCount: number;
  draftCount: number;
}

function Sidebar({ pendingReviewCount, draftCount }: SidebarProps) {
  const location = useLocation();
  return (
    <aside className="w-60 shrink-0 h-screen bg-deep-900/80 border-r border-accent-cyan/10 flex flex-col">
      <div className="px-5 py-5 border-b border-accent-cyan/10">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-accent-cyan to-accent-cyan-light flex items-center justify-center shadow-[0_0_16px_rgba(0,180,216,0.5)]">
            <GitBranch className="w-5 h-5 text-deep-900" strokeWidth={2.5} />
          </div>
          <div>
            <div className="font-mono text-sm font-bold text-neutral-50 leading-tight">FlowBottleneck</div>
            <div className="text-[10px] text-neutral-300 tracking-wider">网络流瓶颈定位</div>
          </div>
        </div>
      </div>

      <nav className="flex-1 py-4 px-3 space-y-1">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          let badge: number | null = null;
          if (item.badgeKey === 'pendingReview') badge = pendingReviewCount;
          if (item.badgeKey === 'draft') badge = draftCount;

          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 relative ${
                isActive
                  ? 'bg-accent-cyan/15 text-accent-cyan-light border border-accent-cyan/30 shadow-[0_0_12px_rgba(0,180,216,0.15)]'
                  : 'text-neutral-200 hover:bg-deep-700/60 hover:text-neutral-50 border border-transparent'
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" strokeWidth={isActive ? 2.2 : 1.8} />
              <span className="flex-1">{item.label}</span>
              {badge !== null && badge > 0 && (
                <span className="min-w-[20px] h-5 px-1.5 rounded-full bg-accent-amber text-deep-900 text-[10px] font-bold flex items-center justify-center">
                  {badge}
                </span>
              )}
            </NavLink>
          );
        })}
      </nav>

      <div className="px-4 py-3 border-t border-accent-cyan/10">
        <div className="flex items-center gap-2 text-[11px] text-neutral-300">
          <Search className="w-3.5 h-3.5 text-accent-cyan/60" />
          <span>v1.0.0 · 算法引擎已就绪</span>
        </div>
      </div>
    </aside>
  );
}

function DraftNoticeBar() {
  const { drafts, activeDraftNotice, setActiveDraftNotice } = useStore();
  if (!activeDraftNotice || drafts.length === 0) return null;

  const totalImpacted = drafts.reduce((s, d) => s + d.impacts.length, 0);

  return (
    <div className="bg-accent-amber/15 border-b border-accent-amber/40 px-6 py-2.5 flex items-center gap-3 animate-fade-in">
      <div className="w-7 h-7 rounded-full bg-accent-amber/30 flex items-center justify-center shrink-0">
        <Clock className="w-4 h-4 text-accent-amber" />
      </div>
      <div className="flex-1 text-sm">
        <span className="font-semibold text-accent-amber">{drafts.length} 条计算草稿已到达</span>
        <span className="text-neutral-200 ml-2">可能影响 <span className="text-accent-amber font-medium">{totalImpacted}</span> 条结论，建议查看对比后决定是否应用</span>
      </div>
      <NavLink
        to="/draft"
        className="px-3 py-1.5 rounded-md bg-accent-amber/25 text-accent-amber text-xs font-semibold border border-accent-amber/50 hover:bg-accent-amber/35 transition-colors"
      >
        查看详情 →
      </NavLink>
      <button
        onClick={() => setActiveDraftNotice(false)}
        className="text-neutral-300 hover:text-neutral-50 text-xs"
      >
        暂时隐藏
      </button>
    </div>
  );
}

export default function Layout({ children }: { children: React.ReactNode }) {
  const pendingReviewCount = useStore((s) => s.getPendingReviewCount());
  const draftCount = useStore((s) => s.getDraftCount());

  return (
    <div className="flex h-screen overflow-hidden bg-deep-900">
      <Sidebar pendingReviewCount={pendingReviewCount} draftCount={draftCount} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <DraftNoticeBar />
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
