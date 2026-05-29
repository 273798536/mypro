import { Scene3D } from '@/components/Scene3D/Scene3D';
import { ChargePanel } from '@/components/Panels/ChargePanel';
import { TestPointPanel } from '@/components/Panels/TestPointPanel';
import { AnomalyBar } from '@/components/Panels/AnomalyBar';
import { NotesBar } from '@/components/Panels/NotesBar';

export function MainLayout() {
  return (
    <div className="w-screen h-screen relative overflow-hidden bg-[#060a18]">
      <div className="w-full h-full">
        <Scene3D />
      </div>

      <ChargePanel />
      <TestPointPanel />
      <AnomalyBar />
      <NotesBar />
    </div>
  );
}
