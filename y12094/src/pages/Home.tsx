import { Mountain } from 'lucide-react';
import TerrainScene from '@/components/three/TerrainScene';
import TimelineControl from '@/components/ui/TimelineControl';
import ControlPanel from '@/components/ui/ControlPanel';
import ProfileViewer from '@/components/ui/ProfileViewer';
import RiskPanel from '@/components/ui/RiskPanel';

export default function Home() {
  return (
    <div className="h-screen w-screen flex flex-col bg-slate-900 overflow-hidden">
      <header className="h-12 bg-slate-800/90 backdrop-blur-sm border-b border-slate-700 flex items-center px-4">
        <div className="flex items-center gap-3">
          <div className="p-1.5 bg-gradient-to-br from-orange-500 to-red-500 rounded-lg">
            <Mountain size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-white font-semibold text-sm leading-tight">
              山地滑坡风险剖面分析系统
            </h1>
            <p className="text-slate-400 text-xs leading-tight">
              3D可视化 | 裂缝分析 | 雨量监测
            </p>
          </div>
        </div>
        <div className="flex-1" />
        <div className="flex items-center gap-4 text-xs text-slate-400">
          <span>鼠标左键旋转 | 滚轮缩放 | 点击地形查看剖面</span>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 relative">
          <TerrainScene />
          <RiskPanel />
          <ProfileViewer />
        </div>
        <ControlPanel />
      </div>

      <TimelineControl />
    </div>
  );
}
