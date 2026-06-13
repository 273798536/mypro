import TopBar from '@/components/TopBar/TopBar';
import FilterBar from '@/components/FilterBar/FilterBar';
import BuoyChart from '@/components/Chart/BuoyChart';
import AnomalyList from '@/components/AnomalyList/AnomalyList';
import DetailPanel from '@/components/DetailPanel/DetailPanel';

export default function Dashboard() {
  return (
    <div className="h-screen flex flex-col bg-deep-ocean">
      <TopBar />
      <FilterBar />
      <div className="flex-1 min-h-0 flex">
        <div className="flex-1 min-w-0 flex flex-col p-4 gap-4">
          <div className="flex-1 min-h-0 bg-slate-900/40 backdrop-blur-sm rounded-xl border border-slate-700/50 p-4">
            <BuoyChart />
          </div>
          <div className="h-72 bg-slate-900/40 backdrop-blur-sm rounded-xl border border-slate-700/50 p-4">
            <AnomalyList />
          </div>
        </div>
        <DetailPanel />
      </div>
    </div>
  );
}
