import { useEffect } from 'react';
import Toolbar from '@/components/layout/Toolbar';
import TimelineChart from '@/components/chart/TimelineChart';
import DetailPanel from '@/components/detail/DetailPanel';
import MixedUnitPanel from '@/components/mixed-unit/MixedUnitPanel';
import ExportModal from '@/components/export/ExportModal';
import OpsGuideCard from '@/components/ops-guide/OpsGuideCard';
import { useDataStore } from '@/store/useDataStore';
import { useAppStore } from '@/store/useAppStore';

export default function Home() {
  const { initializeMockData, isInitialized } = useDataStore();
  const { showOpsGuide } = useAppStore();

  useEffect(() => {
    initializeMockData();
  }, [initializeMockData]);

  if (!isInitialized) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-2 border-tech-blue/30 border-t-tech-blue rounded-full animate-spin mx-auto mb-4" />
          <p className="text-text-secondary text-sm">加载数据中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <Toolbar />

      <div className="flex-1 flex min-h-0">
        <div className="flex-1 flex flex-col min-h-0 p-4 gap-4">
          <div className="flex-1 glass-card min-h-0">
            <TimelineChart />
          </div>

          <div className="flex-shrink-0">
            <MixedUnitPanel />
          </div>
        </div>

        <DetailPanel />
      </div>

      <ExportModal />
      {showOpsGuide && <OpsGuideCard />}
    </div>
  );
}
