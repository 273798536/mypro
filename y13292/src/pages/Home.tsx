import { Header } from '../components/Header/Header';
import { MapPanel } from '../components/MapPanel/MapPanel';
import { PointList } from '../components/PointList/PointList';
import { DetailPanel } from '../components/DetailPanel/DetailPanel';
import { Timeline } from '../components/Timeline/Timeline';

export default function Home() {
  return (
    <div className="h-screen w-screen flex flex-col bg-slate-950 overflow-hidden">
      <Header />

      <div className="flex-1 flex flex-col overflow-hidden p-3 gap-3">
        <div className="flex-1 flex gap-3 min-h-0">
          <div className="w-72 flex-shrink-0">
            <PointList />
          </div>

          <div className="flex-1 min-w-0">
            <MapPanel />
          </div>

          <div className="w-80 flex-shrink-0">
            <DetailPanel />
          </div>
        </div>

        <div className="h-52 flex-shrink-0">
          <Timeline />
        </div>
      </div>
    </div>
  );
}
