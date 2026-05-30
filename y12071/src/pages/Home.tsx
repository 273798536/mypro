import { ControlPanel } from '../components/ControlPanel/ControlPanel';
import { DetectionPanel } from '../components/DetectionPanel/DetectionPanel';
import { MineScene } from '../components/Scene3D/MineScene';

export default function Home() {
  return (
    <div className="h-screen w-screen flex bg-slate-950 overflow-hidden">
      <ControlPanel />
      
      <div className="flex-1 relative">
        <MineScene />
        
        <div className="absolute top-4 left-4 bg-slate-900 bg-opacity-90 rounded-lg px-4 py-2 border border-slate-700">
          <div className="text-xs text-slate-400">操作提示</div>
          <div className="text-xs text-slate-500 mt-1">
            左键拖拽旋转 · 滚轮缩放 · 右键平移 · 点击标记查看详情
          </div>
        </div>
      </div>
      
      <DetectionPanel />
    </div>
  );
}
