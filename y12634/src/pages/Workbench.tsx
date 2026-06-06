import { AnomalyPanel } from '@/components/AnomalyPanel';
import { DetailDrawer } from '@/components/DetailDrawer';
import { LaneChart } from '@/components/LaneChart';
import { Toolbar } from '@/components/Toolbar';

export default function Workbench() {
  return (
    <div className="h-screen w-screen flex flex-col bg-slate-950 text-slate-100">
      <Toolbar />
      <div className="flex-1 flex overflow-hidden">
        <aside className="w-72 flex-shrink-0">
          <AnomalyPanel />
        </aside>
        <main className="flex-1 min-w-0">
          <LaneChart />
        </main>
        <aside className="w-80 flex-shrink-0">
          <DetailDrawer />
        </aside>
      </div>
    </div>
  );
}
