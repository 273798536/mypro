import { Canvas } from '@react-three/fiber';
import Scene3D from '@/components/Scene3D';
import ParameterPanel from '@/components/ParameterPanel';
import TravelTimeChart from '@/components/TravelTimeChart';
import ValidationBar from '@/components/ValidationBar';
import Toolbar from '@/components/Toolbar';
import CorrectionLog from '@/components/CorrectionLog';
import { useSandboxStore } from '@/store/useSandboxStore';
import { PanelLeftClose, PanelLeftOpen, PanelRightClose, PanelRightOpen, History } from 'lucide-react';

export default function Home() {
  const leftPanelOpen = useSandboxStore(s => s.leftPanelOpen);
  const rightPanelOpen = useSandboxStore(s => s.rightPanelOpen);
  const toggleLeftPanel = useSandboxStore(s => s.toggleLeftPanel);
  const toggleRightPanel = useSandboxStore(s => s.toggleRightPanel);
  const toggleCorrectionLog = useSandboxStore(s => s.toggleCorrectionLog);

  return (
    <div id="sandbox-root" className="w-screen h-screen flex flex-col bg-[#0a0e1a] text-white overflow-hidden">
      <Toolbar />

      <div className="flex-1 flex min-h-0">
        <div className="flex items-stretch">
          {leftPanelOpen && <ParameterPanel />}
          <button
            onClick={toggleLeftPanel}
            className="w-5 flex items-center justify-center bg-[#0a0e1a]/80 border-r border-zinc-700/30 hover:bg-zinc-800/50 transition-colors"
          >
            {leftPanelOpen ? <PanelLeftClose size={12} className="text-zinc-500" /> : <PanelLeftOpen size={12} className="text-zinc-500" />}
          </button>
        </div>

        <div className="flex-1 relative">
          <Canvas
            camera={{ position: [0, 50, 150], fov: 50, near: 0.1, far: 2000 }}
            gl={{ preserveDrawingBuffer: true, antialias: true }}
            style={{ background: '#060810' }}
          >
            <Scene3D />
          </Canvas>

          <div className="absolute bottom-3 left-3 flex gap-2">
            <button
              onClick={toggleCorrectionLog}
              className="flex items-center gap-1 px-2 py-1 text-[10px] text-zinc-400 bg-[#0a0e1a]/80 border border-zinc-700/30 rounded hover:text-white transition-colors"
            >
              <History size={10} /> 修正记录
            </button>
          </div>

          <div className="absolute top-3 right-3">
            <div className="flex flex-col gap-1 text-[9px] text-zinc-500">
              <div className="flex items-center gap-1">
                <span className="w-3 h-0.5 bg-[#00e5ff] inline-block" /> P波
              </div>
              <div className="flex items-center gap-1">
                <span className="w-3 h-0.5 bg-[#ff4081] inline-block" /> S波
              </div>
              <div className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-orange-500 inline-block" /> 震源
              </div>
              <div className="flex items-center gap-1">
                <span className="w-0 h-0 border-l-[4px] border-r-[4px] border-b-[6px] border-l-transparent border-r-transparent border-b-green-500 inline-block" /> 测站
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-stretch">
          <button
            onClick={toggleRightPanel}
            className="w-5 flex items-center justify-center bg-[#0a0e1a]/80 border-l border-zinc-700/30 hover:bg-zinc-800/50 transition-colors"
          >
            {rightPanelOpen ? <PanelRightClose size={12} className="text-zinc-500" /> : <PanelRightOpen size={12} className="text-zinc-500" />}
          </button>
          {rightPanelOpen && <TravelTimeChart />}
        </div>
      </div>

      <ValidationBar />
      <CorrectionLog />
    </div>
  );
}
