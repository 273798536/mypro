import { Suspense } from 'react';
import { OrbitalScene } from '../components/orbital3d/OrbitalScene';
import { LeftSidebar, RightSidebar } from '../components/layout/Sidebar';
import { Loader2 } from 'lucide-react';

function LoadingFallback() {
  return (
    <div className="flex items-center justify-center h-full">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
        <span className="text-xs text-slate-500">加载3D场景...</span>
      </div>
    </div>
  );
}

export function MainPage() {
  return (
    <div className="h-screen w-screen flex overflow-hidden bg-[#0a1628]">
      <LeftSidebar />

      <div className="flex-1 relative">
        <Suspense fallback={<LoadingFallback />}>
          <OrbitalScene />
        </Suspense>

        <div className="absolute top-3 left-1/2 -translate-x-1/2 pointer-events-none">
          <div className="px-4 py-1.5 rounded-full bg-slate-900/60 backdrop-blur-sm border border-slate-700/30">
            <h1 className="text-sm font-semibold tracking-wider bg-gradient-to-r from-cyan-300 via-purple-300 to-cyan-300 bg-clip-text text-transparent">
              量子轨道云课堂
            </h1>
          </div>
        </div>

        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 pointer-events-none">
          <div className="text-[10px] text-slate-600">
            左键旋转 · 滚轮缩放 · 右键平移
          </div>
        </div>
      </div>

      <RightSidebar />
    </div>
  );
}
