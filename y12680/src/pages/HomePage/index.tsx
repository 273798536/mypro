import { useEffect } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { Toolbar } from '@/components/Toolbar';
import { FilterBar } from '@/components/FilterBar';
import { DataTable } from '@/components/DataTable';
import { RecordDetail } from '@/components/RecordDetail';

export function HomePage() {
  const { init, isDetailPanelOpen } = useAppStore();

  useEffect(() => {
    init();
  }, []);

  return (
    <div className="flex h-full flex-col">
      <Toolbar />
      <FilterBar />
      <div className="flex flex-1 overflow-hidden">
        <DataTable />
        {isDetailPanelOpen && <RecordDetail />}
      </div>
    </div>
  );
}
