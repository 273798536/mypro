import Scene3D from '@/components/Scene3D/Scene3D';
import ControlPanel from '@/components/ControlPanel/ControlPanel';
import DetailPanel from '@/components/DetailPanel/DetailPanel';
import { useStore } from '@/store/useStore';
import { useEffect } from 'react';

export default function Home() {
  const validateData = useStore((s) => s.validateData);
  const terrain = useStore((s) => s.terrain);

  useEffect(() => {
    validateData();
  }, [validateData]);

  return (
    <div className="w-screen h-screen bg-[#0a0a1a] overflow-hidden relative">
      <Scene3D />
      <ControlPanel />
      <DetailPanel />

      <div className="absolute bottom-0 left-0 right-0 h-10 bg-gradient-to-t from-[#0a0a1a] to-transparent z-10 pointer-events-none" />

      <div className="absolute top-3 left-1/2 -translate-x-1/2 z-30">
        <h1 className="text-cyan-300/80 text-sm font-bold tracking-widest">
          {terrain?.name ?? '水库库容地形沙盘'}
        </h1>
      </div>
    </div>
  );
}
