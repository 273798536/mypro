import { useEffect } from 'react';
import Scene from '@/components/Scene';
import ControlPanel from '@/components/ControlPanel';
import CrossSectionPanel from '@/components/CrossSectionPanel';
import ConclusionPanel from '@/components/ConclusionPanel';
import ViewpointPanel from '@/components/ViewpointPanel';
import { useSurfaceStore } from '@/store/useSurfaceStore';

export default function Home() {
  const recompute = useSurfaceStore((s) => s.recompute);
  const loadViewpoints = useSurfaceStore((s) => s.loadViewpoints);
  const config = useSurfaceStore((s) => s.config);
  const isComputing = useSurfaceStore((s) => s.isComputing);
  const surfaceData = useSurfaceStore((s) => s.surfaceData);

  useEffect(() => {
    loadViewpoints();
    recompute();
  }, []);

  return (
    <div className="h-screen w-screen flex overflow-hidden bg-[#060a14] text-gray-200">
      <div className="flex-1 relative">
        <Scene />

        <div className="absolute top-4 left-4 pointer-events-none">
          <h1 className="text-lg font-semibold text-[#00e5c8] tracking-wide" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
            数学曲面探索器
          </h1>
          <p className="text-xs text-gray-500 mt-0.5 font-mono">
            z = {config.expression}
          </p>
        </div>

        {isComputing && (
          <div className="absolute top-4 right-4 flex items-center gap-2 px-3 py-1.5 bg-[#0a0e1a]/90 border border-[#1a2a3a] rounded-lg">
            <div className="w-2 h-2 rounded-full bg-[#00e5c8] animate-pulse" />
            <span className="text-xs text-gray-400">计算中...</span>
          </div>
        )}

        {!surfaceData && !isComputing && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="text-center">
              <p className="text-gray-500 text-sm">输入函数表达式并点击应用</p>
              <p className="text-gray-600 text-xs mt-1">支持: +, -, *, /, ^, sin, cos, tan, exp, log, sqrt, abs</p>
            </div>
          </div>
        )}
      </div>

      <div className="w-[340px] min-w-[300px] bg-[#0a0e1a] border-l border-[#1a2a3a] flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto p-4 space-y-5 scrollbar-thin">
          <ControlPanel />

          <div className="border-t border-[#1a2a3a]" />

          <CrossSectionPanel />

          <div className="border-t border-[#1a2a3a]" />

          <ConclusionPanel />

          <div className="border-t border-[#1a2a3a]" />

          <ViewpointPanel />
        </div>

        <div className="px-4 py-2 border-t border-[#1a2a3a] bg-[#060a14]">
          <p className="text-[10px] text-gray-600 text-center">
            数学曲面探索器 · 旋转/缩放/平移 · 切剖面 · 标极值
          </p>
        </div>
      </div>
    </div>
  );
}
