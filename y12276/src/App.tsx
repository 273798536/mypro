import { useRef } from 'react';
import { StageScene } from '@/components/3d/StageScene';
import { Sidebar } from '@/components/ui/Sidebar';
import { DetailPanel } from '@/components/ui/DetailPanel';
import { PlaybackControls } from '@/components/ui/PlaybackControls';
import { ReportModal } from '@/components/ui/ReportModal';
import { useAppStore } from '@/store/useAppStore';

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { showDetailPanel } = useAppStore();

  return (
    <div className="w-full h-full flex flex-col overflow-hidden bg-slate-950">
      <div className="flex-1 flex overflow-hidden relative">
        <Sidebar />

        <div
          id="stage-container"
          ref={canvasRef as unknown as React.RefObject<HTMLDivElement>}
          className="flex-1 relative overflow-hidden"
        >
          <StageScene canvasRef={canvasRef} />

          <div className="absolute top-4 left-4 right-4 flex items-center justify-between pointer-events-none z-10">
            <div className="pointer-events-auto">
              <div className="bg-slate-900/80 backdrop-blur-sm rounded-xl px-4 py-2 border border-slate-700/50">
                <p className="text-xs text-slate-400">
                  提示：鼠标左键旋转 · 滚轮缩放 · 右键平移 · 点击对象查看详情
                </p>
              </div>
            </div>
            <div className="pointer-events-auto">
              <div className="bg-slate-900/80 backdrop-blur-sm rounded-xl px-4 py-2 border border-slate-700/50">
                <p className="text-xs text-cyan-400 font-mono">
                  舞台版本: stage_main_v1.0
                </p>
              </div>
            </div>
          </div>

          <div className="absolute inset-0 scanline pointer-events-none opacity-20" />
        </div>

        {showDetailPanel && <DetailPanel />}
      </div>

      <PlaybackControls />

      <ReportModal />
    </div>
  );
}
