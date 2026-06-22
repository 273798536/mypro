import { AppLayout } from '../components/layout/AppLayout';
import { StatsCards } from '../components/dashboard/StatsCards';
import { BatchTable } from '../components/dashboard/BatchTable';
import { ReviewDrawer } from '../components/review/ReviewDrawer';
import { TimelineModal } from '../components/timeline/TimelineModal';

export default function Home() {
  return (
    <AppLayout>
      <div className="space-y-5 max-w-[1400px]">
        <header className="flex items-end justify-between">
          <div>
            <div className="text-[11px] font-mono uppercase tracking-widest text-ink-400">
              Review Dashboard
            </div>
            <h1 className="font-display text-2xl font-bold text-ink-800 tracking-wide mt-1">
              复核看板
            </h1>
            <p className="mt-1 text-sm text-ink-500 font-mono">
              所有筛选 · 统计 · 明细 · 导出均绑定同一批计算结果
            </p>
          </div>
          <div className="hidden md:block text-right text-[11px] font-mono text-ink-400 leading-relaxed">
            <div>数据已自动持久化到本地</div>
            <div>服务重启后历史时间线完整保留</div>
          </div>
        </header>

        <StatsCards />
        <BatchTable />

        <footer className="pt-4 text-[11px] font-mono text-ink-400 flex items-center justify-between">
          <div>
            概率抽样 · 错因追踪 · 为竞赛助教小岑定制
          </div>
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-mint-400" />
            localStorage 已就绪
          </div>
        </footer>
      </div>

      <ReviewDrawer />
      <TimelineModal />
    </AppLayout>
  );
}
