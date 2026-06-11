import Toolbar from '@/components/Toolbar';
import FilterPanel from '@/components/FilterPanel';
import Scene3D from '@/components/Scene3D';
import DetailPanel from '@/components/DetailPanel';
import GuideBar from '@/components/GuideBar';
import OverlapList from '@/components/OverlapList';

export default function Home() {
  return (
    <div className="w-full h-full flex flex-col bg-dock-bg text-slate-200">
      <Toolbar />

      <div className="flex-1 flex pt-14 pb-14">
        <FilterPanel />

        <div className="flex-1 relative">
          <Scene3D />
          <OverlapList />
        </div>

        <DetailPanel />
      </div>

      <GuideBar />
    </div>
  );
}
