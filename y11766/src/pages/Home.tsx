import { useState, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { LiquidityPool } from '../components/Scene3D/LiquidityPool';
import { TimeSlider } from '../components/Timeline/TimeSlider';
import { SidebarPanel } from '../components/Sidebar/SidebarPanel';
import { Legend } from '../components/Header/Legend';
import { ExportModal } from '../components/ExportModal/ExportModal';

export default function Home() {
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  return (
    <div ref={containerRef} className="w-full h-full bg-[#0a1628] relative overflow-hidden">
      <Canvas
        camera={{ position: [8, 8, 8], fov: 50 }}
        shadows
        gl={{ antialias: true, alpha: false }}
      >
        <color attach="background" args={['#0a1628']} />
        <fog attach="fog" args={['#0a1628', 15, 35]} />
        <LiquidityPool />
      </Canvas>

      <Legend onExportClick={() => setExportModalOpen(true)} />

      <TimeSlider />

      <SidebarPanel />

      <ExportModal
        isOpen={exportModalOpen}
        onClose={() => setExportModalOpen(false)}
      />

      <div className="absolute bottom-4 right-84 z-10">
        <div className="text-xs text-slate-500 font-mono">
          数据来源: fund_holdings.xlsx | client_redemption.csv | cash_position.xlsx
        </div>
      </div>
    </div>
  );
}
