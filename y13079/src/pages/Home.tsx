import { Header } from '@/components/ui/Header';
import { Timeline } from '@/components/ui/Timeline';
import { PointList } from '@/components/ui/PointList';
import { DetailPanel } from '@/components/ui/DetailPanel';
import { AnomalyAlert } from '@/components/ui/AnomalyAlert';
import { DecisionPanel } from '@/components/ui/DecisionPanel';
import { Scene3D } from '@/components/three/Scene3D';
import { useStore } from '@/store/useStore';
import { clsx } from 'clsx';

export default function Home() {
  const { selectedPointId, setSelectedPointId } = useStore();
  const hasSelection = selectedPointId !== null;

  return (
    <div className="h-screen w-screen flex flex-col relative z-10">
      <Header />
      <Timeline />

      <div className="flex-1 flex overflow-hidden relative">
        <aside className="w-72 flex-shrink-0 hidden lg:block">
          <PointList />
        </aside>

        <main className="flex-1 relative">
          <Scene3D />
          <AnomalyAlert />

          {hasSelection && (
            <div
              className={clsx(
                'absolute top-0 right-0 h-full w-80 z-10',
                'xl:hidden',
                'animate-in slide-in-from-right'
              )}
            >
              <DetailPanel />
            </div>
          )}
        </main>

        <aside className="w-80 flex-shrink-0 hidden xl:block">
          <DetailPanel />
        </aside>
      </div>

      <DecisionPanel />
    </div>
  );
}
