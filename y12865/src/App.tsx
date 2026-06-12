import Scene3D from '@/components/three/Scene3D';
import TopRiskBar from '@/components/layout/TopRiskBar';
import LeftPanel from '@/components/layout/LeftPanel';
import RightPanel from '@/components/layout/RightPanel';
import BottomTimeline from '@/components/layout/BottomTimeline';

export default function App() {
  return (
    <div className="w-full h-full flex flex-col bg-[#060e1a]">
      <TopRiskBar />
      <div className="flex-1 flex overflow-hidden">
        <LeftPanel />
        <div className="flex-1 relative">
          <Scene3D />
          <div className="scanline-overlay" />
        </div>
        <RightPanel />
      </div>
      <BottomTimeline />
    </div>
  );
}
