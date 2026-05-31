import RiskHeatmapScene from '@/components/three/RiskHeatmapScene';
import ColorLegend from '@/components/ColorLegend';
import RegionDetailPanel from '@/components/RegionDetailPanel';
import TimeAxis from '@/components/TimeAxis';
import AnomalyPanel from '@/components/AnomalyPanel';
import ParameterPanel from '@/components/ParameterPanel';

export default function Home() {
  return (
    <div className="relative w-full h-screen overflow-hidden bg-slate-950">
      <div className="absolute inset-0">
        <RiskHeatmapScene />
      </div>

      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10">
        <div className="bg-slate-900/90 backdrop-blur-md rounded-xl px-6 py-3 border border-slate-700/50">
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <span className="text-2xl">🏢</span>
            保险风险热力楼
          </h1>
        </div>
      </div>

      <ColorLegend />
      <ParameterPanel />
      <RegionDetailPanel />
      <AnomalyPanel />
      <TimeAxis />

      <div className="absolute bottom-32 right-88 z-10 text-xs text-slate-500 text-right">
        <p>鼠标拖拽旋转 | 滚轮缩放 | 点击楼块查看详情</p>
      </div>
    </div>
  );
}
