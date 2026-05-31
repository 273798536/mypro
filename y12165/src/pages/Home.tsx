import { useEffect } from 'react';
import { useStore } from '@/store/useStore';
import TopBar from '@/components/TopBar';
import Scene3D from '@/components/Scene3D';
import Sidebar from '@/components/Sidebar';

export default function Home() {
  const { recalculate } = useStore();

  useEffect(() => {
    recalculate();
  }, [recalculate]);

  return (
    <div className="h-screen w-screen flex flex-col bg-slate-950 overflow-hidden">
      <TopBar />
      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 relative">
          <Scene3D />
          <div className="absolute bottom-4 left-4 text-xs text-slate-500 bg-slate-900/80 border border-slate-700 rounded px-3 py-2">
            <div className="flex items-center gap-4">
              <span>🖱️ 拖拽旋转</span>
              <span>🔍 滚轮缩放</span>
              <span>👆 点击节点选中</span>
            </div>
          </div>
        </div>
        <div className="w-[420px] shrink-0">
          <Sidebar />
        </div>
      </div>
    </div>
  );
}
