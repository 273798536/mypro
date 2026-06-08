import Toolbar from '@/components/Toolbar';
import FilterPanel from '@/components/FilterPanel';
import AnomalyTable from '@/components/AnomalyTable';
import DetailDrawer from '@/components/DetailDrawer';

export default function DetailLinkage() {
  return (
    <div className="h-[calc(100vh-3.5rem)] flex flex-col">
      <Toolbar />
      <div className="flex-1 min-h-0 flex">
        <FilterPanel />
        <AnomalyTable />
      </div>
      <DetailDrawer />
    </div>
  );
}
