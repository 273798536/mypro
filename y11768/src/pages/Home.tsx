import FunnelScene3D from '@/components/FunnelScene3D';
import FilterPanel from '@/components/FilterPanel';
import NodeDetailPanel from '@/components/NodeDetailPanel';
import AnomalyAlert from '@/components/AnomalyAlert';
import HistoryPanel from '@/components/HistoryPanel';
import ExportButton from '@/components/ExportButton';
import { useFunnelStore } from '@/store/funnelStore';
import { Info, CircleDot, Minus, BarChart3 } from 'lucide-react';

export default function Home() {
  const { funnelData, hoveredNodeIndex, selectedNodeIndex } = useFunnelStore();
  const displayNodeIndex = selectedNodeIndex ?? hoveredNodeIndex;

  return (
    <div id="funnel-root-container" className="relative w-screen h-screen overflow-hidden bg-[#0A1628]">
      <FunnelScene3D />

      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 text-center pointer-events-none mt-12">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-[#F0B429] via-[#FFD54F] to-[#FF8F00] bg-clip-text text-transparent tracking-wide">
          贷款审批漏斗体
        </h1>
        <p className="text-xs text-white/40 mt-1">3D 可视化 · 多维度筛选 · 异常检测 · 痕迹追踪</p>
      </div>

      <div className="absolute top-4 right-4 z-10 flex items-center gap-2 pointer-events-none">
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0A1628]/70 backdrop-blur-md border border-white/10">
          <Info size={12} className="text-white/40" />
          <span className="text-[10px] text-white/50">鼠标拖拽旋转 · 滚轮缩放 · 点击节点查看详情</span>
        </div>
      </div>

      <FilterPanel />
      <ExportButton />

      {displayNodeIndex !== null && funnelData[displayNodeIndex] && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 pointer-events-none">
          <div className="flex items-center gap-3 px-5 py-3 rounded-xl bg-[#0A1628]/80 backdrop-blur-xl border border-white/10 shadow-2xl">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#4FC3F7] to-[#0288D1] flex items-center justify-center">
              <BarChart3 size={18} className="text-white" />
            </div>
            <div>
              <div className="text-xs text-white/50">{funnelData[displayNodeIndex].nodeName}节点</div>
              <div className="flex items-center gap-4 text-sm">
                <span className="text-white/80">进入 <span className="text-[#4FC3F7] font-bold">{funnelData[displayNodeIndex].enterCount}</span></span>
                <span className="text-white/30">|</span>
                <span className="text-white/80">通过 <span className="text-green-400 font-bold">{funnelData[displayNodeIndex].passCount}</span></span>
                <span className="text-white/30">|</span>
                <span className="text-white/80">拒绝 <span className="text-red-400 font-bold">{funnelData[displayNodeIndex].rejectCount}</span></span>
                <span className="text-white/30">|</span>
                <span className="text-white/80">转化率 <span className="text-[#F0B429] font-bold">{(funnelData[displayNodeIndex].conversionRate * 100).toFixed(1)}%</span></span>
              </div>
            </div>
          </div>
        </div>
      )}

      <FunnelLegend />
      <AnomalyAlert />
      <HistoryPanel />
      <NodeDetailPanel />

      <SampleDataHint />
    </div>
  );
}

function FunnelLegend() {
  return (
    <div className="absolute top-20 right-4 z-10 hidden lg:block">
      <div className="rounded-xl border border-white/10 bg-[#0A1628]/70 backdrop-blur-xl p-3 space-y-1.5">
        <div className="text-[10px] text-white/50 mb-1">漏斗节点</div>
        {['申请', '初审', '复审', '终审', '放款'].map((name, i) => (
          <div key={name} className="flex items-center gap-2 text-[10px]">
            <div className={`w-3 h-3 rounded-sm ${i === 0 ? 'bg-[#4FC3F7]' : i === 1 ? 'bg-[#29B6F6]' : i === 2 ? 'bg-[#0288D1]' : i === 3 ? 'bg-[#F0B429]' : 'bg-[#FF8F00]'}`} />
            <span className="text-white/60">{name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function SampleDataHint() {
  return (
    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 hidden pointer-events-none translate-y-[100px] lg:translate-y-[70px]">
      <div className="flex items-center gap-3 text-[10px] text-white/30">
        <div className="flex items-center gap-1">
          <CircleDot size={10} className="text-green-400" />
          <span>正常：APP-2026-001</span>
        </div>
        <Minus size={10} className="text-white/20" />
        <div className="flex items-center gap-1">
          <CircleDot size={10} className="text-amber-400" />
          <span>边界：APP-2026-002（重复节点）</span>
        </div>
        <Minus size={10} className="text-white/20" />
        <div className="flex items-center gap-1">
          <CircleDot size={10} className="text-red-400" />
          <span>异常：APP-2026-003（渠道错归+原因覆盖）</span>
        </div>
      </div>
    </div>
  );
}
