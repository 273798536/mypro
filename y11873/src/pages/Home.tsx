import { useEffect } from 'react';
import { useStore } from '@/store/useStore';
import Scene from '@/components/scene/Scene';
import Toolbar from '@/components/ui/Toolbar';
import FilterPanel from '@/components/ui/FilterPanel';
import DetailPanel from '@/components/ui/DetailPanel';
import ImportModal from '@/components/ui/ImportModal';

export default function Home() {
  const runConflictDetection = useStore((s) => s.runConflictDetection);
  const runSlopeAnalysis = useStore((s) => s.runSlopeAnalysis);

  useEffect(() => {
    runSlopeAnalysis();
    runConflictDetection();
  }, [runSlopeAnalysis, runConflictDetection]);

  return (
    <div className="h-screen w-screen flex flex-col bg-[#1a1f2e] overflow-hidden">
      <Toolbar />
      <div className="flex flex-1 overflow-hidden">
        <FilterPanel />
        <div className="flex-1 relative">
          <Scene />
        </div>
        <DetailPanel />
      </div>
      <ImportModal />
    </div>
  );
}
