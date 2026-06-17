import { useUrlSync } from '@/hooks/useUrlSync';
import { useReviewData } from '@/hooks/useReviewData';
import { useReviewStore } from '@/store/useReviewStore';
import { VersionBar } from '@/components/VersionBar';
import { FilterBar } from '@/components/FilterBar';
import { MetricCards } from '@/components/MetricCards';
import { SampleTable } from '@/components/SampleTable';
import { SkewBoard } from '@/components/SkewBoard';
import { SampleDrawer } from '@/components/SampleDrawer';
import { VersionNotePanel } from '@/components/VersionNotePanel';
import { ExportCenter } from '@/components/ExportCenter';
import { ErrorBanner } from '@/components/ErrorBanner';

export function ReviewConsole() {
  useUrlSync();
  const { visible, metrics, dedupMetrics, topSkewList } = useReviewData();
  const filter = useReviewStore((s) => s.filter);

  return (
    <div className="mx-auto max-w-[1440px] p-4">
      <header className="mb-4 flex items-end justify-between border-b border-graphite-700 pb-3">
        <div>
          <h1 className="font-display text-3xl font-bold uppercase tracking-wide text-zinc-100">
            工业视觉误判回放
          </h1>
          <p className="font-mono text-[11px] uppercase tracking-[0.25em] text-zinc-500">
            Misjudgment Replay Console
          </p>
        </div>
        <div className="text-right font-mono text-[11px] leading-relaxed text-zinc-500">
          <div>视图 / {filter}</div>
          <div>◆ 重复评测 · ▲ 拉偏样本</div>
        </div>
      </header>

      <div className="mb-3">
        <VersionBar />
      </div>
      <div className="mb-3">
        <FilterBar />
      </div>
      <div className="mb-3">
        <MetricCards metrics={metrics} dedup={dedupMetrics} />
      </div>

      <div className="grid grid-cols-1 gap-3 xl:grid-cols-[1fr_340px]">
        <SampleTable rows={visible} />
        <SkewBoard items={topSkewList} />
      </div>

      <SampleDrawer />
      <VersionNotePanel />
      <ExportCenter />
      <ErrorBanner />
    </div>
  );
}
