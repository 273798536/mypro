import Scene3D from '../components/Scene3D/Scene3D';
import ParameterPanel from '../components/Panels/ParameterPanel';
import PowerPanel from '../components/Panels/PowerPanel';
import ComparisonPanel from '../components/Panels/ComparisonPanel';
import SummaryPanel from '../components/Panels/SummaryPanel';
import Timeline from '../components/Timeline/Timeline';
import { useStore } from '../store/useStore';
import { ArrowLeftRight, Anchor } from 'lucide-react';

export default function Sandbox() {
  const comparisonMode = useStore((s) => s.comparisonMode);
  const setComparisonMode = useStore((s) => s.setComparisonMode);

  return (
    <div className="w-screen h-screen overflow-hidden relative bg-[#0A1628]">
      <Scene3D />

      <ParameterPanel />
      <PowerPanel />
      <ComparisonPanel />
      <SummaryPanel />
      <Timeline />

      <div className="fixed top-4 left-72 z-20 flex items-center gap-2">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#0A1628]/80 backdrop-blur-md border border-[#1E3A5F]/40">
          <Anchor size={16} className="text-[#00D4AA]" />
          <span className="text-[#E8ECF1] text-sm font-semibold tracking-wide" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
            海上风电尾流沙盘
          </span>
        </div>

        <button
          onClick={() => setComparisonMode(!comparisonMode)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-all border ${
            comparisonMode
              ? 'bg-[#00D4AA]/20 text-[#00D4AA] border-[#00D4AA]/30'
              : 'bg-[#1E3A5F]/30 text-[#8BA4BC] border-[#1E3A5F]/40 hover:border-[#00D4AA]/30 hover:text-[#00D4AA]'
          }`}
        >
          <ArrowLeftRight size={14} />
          方案对比
        </button>
      </div>

      <div className="fixed bottom-16 right-4 z-20 space-y-1 text-[8px] font-mono text-[#4A6B8A]">
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-[#00D4AA]" />
          <span>正常</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-[#FF6B35]" />
          <span>尾流影响</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-[#EF4444]" />
          <span>尾流重叠/穿越</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-[#FBBF24]" />
          <span>220kV 海缆</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-[#60A5FA]" />
          <span>66kV 海缆</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-[#34D399]" />
          <span>检修船</span>
        </div>
      </div>
    </div>
  );
}
