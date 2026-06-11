import { useMemo } from 'react';
import { FilterBar } from '@/components/FilterBar';
import { WindProfileChart } from '@/components/WindProfileChart';
import { ReviewPanel } from '@/components/ReviewPanel';
import { UnitWarningBanner } from '@/components/UnitWarningBanner';
import { CsvModal } from '@/components/CsvModal';
import { HelpFloatingCard } from '@/components/HelpFloatingCard';
import { useHashSync } from '@/hooks/useHashSync';
import { windPoints } from '@/data/windPoints';
import { reviewRecords } from '@/data/reviewRecords';
import { useAppStore } from '@/store/useAppStore';

export default function App() {
  useHashSync();
  const { filters } = useAppStore();

  const filteredPoints = useMemo(() => {
    let out = windPoints;
    if (filters.station) out = out.filter((p) => p.station === filters.station);
    if (filters.statusFilter === 'anomaly') out = out.filter((p) => p.isAnomaly);
    if (filters.statusFilter === 'normal') out = out.filter((p) => !p.isAnomaly);
    return out;
  }, [filters.station, filters.statusFilter]);

  return (
    <div className="min-h-screen bg-ocean-50 flex flex-col">
      <FilterBar />
      <UnitWarningBanner points={windPoints} />
      <main className="flex-1 p-4">
        <div className="grid grid-cols-1 xl:grid-cols-5 gap-4 h-full">
          <div className="xl:col-span-3 flex flex-col">
            <WindProfileChart points={filteredPoints} />
            <div className="mt-3 text-[11px] text-ocean-400 font-mono leading-relaxed">
              图中红色三角形为异常点，点击可联动右侧评审批注；高度已按 1F/1层 ≈ 3m 归一化换算，原始单位保留在 CSV 明细中。
            </div>
          </div>
          <div className="xl:col-span-2 min-h-[520px] xl:min-h-0 xl:h-[calc(100vh-10rem)]">
            <ReviewPanel records={reviewRecords} />
          </div>
        </div>
      </main>
      <CsvModal points={filteredPoints} />
      <HelpFloatingCard />
    </div>
  );
}
