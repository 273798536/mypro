import { Header } from '../components/ui/Header';
import { ConflictList } from '../components/ui/ConflictList';
import { DetailPanel } from '../components/ui/DetailPanel';
import { Timeline } from '../components/ui/Timeline';
import { DataGapWarning } from '../components/ui/DataGapWarning';
import { SandboxScene } from '../components/three/SandboxScene';

export default function Home() {
  return (
    <div className="h-screen w-screen flex flex-col bg-slate-950 overflow-hidden">
      <Header />

      <div className="flex-1 flex overflow-hidden">
        <ConflictList />

        <div className="flex-1 relative">
          <SandboxScene />
          <DataGapWarning />

          <div className="absolute bottom-4 left-4 bg-slate-900/80 backdrop-blur-sm rounded-lg p-3 text-xs text-slate-400 border border-slate-700/50">
            <div className="flex items-center gap-2 mb-1">
              <span className="w-3 h-3 rounded bg-red-500" />
              <span>机位冲突</span>
            </div>
            <div className="flex items-center gap-2 mb-1">
              <span className="w-3 h-3 rounded bg-yellow-500" />
              <span>滑行穿越</span>
            </div>
            <div className="flex items-center gap-2 mb-1">
              <span className="w-3 h-3 rounded bg-orange-500" />
              <span>等待超时</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded bg-green-500" />
              <span>正常机位</span>
            </div>
          </div>

          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-slate-900/80 backdrop-blur-sm rounded-lg px-3 py-2 text-xs text-slate-400 border border-slate-700/50">
            鼠标左键拖拽旋转 | 滚轮缩放 | 右键拖拽平移 | 点击机位或滑行道查看详情
          </div>
        </div>

        <DetailPanel />
      </div>

      <Timeline />
    </div>
  );
}
