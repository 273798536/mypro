import { Sidebar } from './Sidebar';
import { FlywheelScene } from '../three/FlywheelScene';
import { TimelineController } from '../timeline/TimelineController';
import { DetailDrawer } from '../detail/DetailDrawer';

export function AppLayout() {
  return (
    <div className="flex h-screen w-screen bg-industrial-950 text-industrial-100 overflow-hidden">
      <Sidebar />

      <main className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 relative overflow-hidden">
          <FlywheelScene />
        </div>

        <div className="h-80 bg-industrial-900 border-t border-industrial-700 flex flex-col shrink-0">
          <TimelineController />
        </div>
      </main>

      <DetailDrawer />
    </div>
  );
}
