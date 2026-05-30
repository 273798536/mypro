import { useMemo } from 'react';
import { useStore } from '../../store/useStore';
import { schemeA, schemeB, powerRecords, windConditions } from '../../data/mockData';
import { compareSchemes } from '../../utils/schemeComparison';
import { ArrowLeftRight, TrendingUp, AlertTriangle } from 'lucide-react';

export default function ComparisonPanel() {
  const comparisonMode = useStore((s) => s.comparisonMode);
  const setComparisonMode = useStore((s) => s.setComparisonMode);
  const windDirection = useStore((s) => s.windDirection);
  const windSpeed = useStore((s) => s.windSpeed);

  const comparison = useMemo(() => {
    const recordsB = powerRecords.slice(0, schemeB.turbines.length * windConditions.length).map((r, i) => ({
      ...r,
      powerOutput: r.powerOutput * (0.85 + Math.random() * 0.3),
    }));
    return compareSchemes(schemeA, schemeB, windDirection, windSpeed, powerRecords, recordsB);
  }, [windDirection, windSpeed]);

  if (!comparisonMode) return null;

  return (
    <div className="fixed top-16 left-1/2 -translate-x-1/2 z-30 w-[480px] bg-[#0A1628]/95 backdrop-blur-xl border border-[#1E3A5F]/60 rounded-xl shadow-2xl shadow-black/40">
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-[#1E3A5F]/40">
        <h2 className="text-[#00D4AA] text-xs font-semibold tracking-wider flex items-center gap-2" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
          <ArrowLeftRight size={14} />
          方案对比
        </h2>
        <button
          onClick={() => setComparisonMode(false)}
          className="text-[#4A6B8A] hover:text-[#00D4AA] text-xs transition-colors"
        >
          关闭
        </button>
      </div>

      <div className="p-4 space-y-3">
        <div className="grid grid-cols-3 gap-2 text-center text-xs">
          <div className="text-[#4A6B8A]" />
          <div className="text-[#FBBF24] font-mono">紧密排布</div>
          <div className="text-[#60A5FA] font-mono">宽松排布</div>
        </div>

        <div className="grid grid-cols-3 gap-2 text-center text-xs">
          <div className="text-[#8BA4BC] text-left">风机数</div>
          <div className="text-[#E8ECF1] font-mono">{schemeA.turbines.length}</div>
          <div className="text-[#E8ECF1] font-mono">{schemeB.turbines.length}</div>
        </div>

        <div className="grid grid-cols-3 gap-2 text-center text-xs">
          <div className="text-[#8BA4BC] text-left flex items-center gap-1">
            <TrendingUp size={10} className="text-[#FF6B35]" />
            尾流损失
          </div>
          <div className={`font-mono ${comparison.avgDeficitA > comparison.avgDeficitB ? 'text-[#EF4444]' : 'text-[#00D4AA]'}`}>
            {(comparison.avgDeficitA * 100).toFixed(1)}%
          </div>
          <div className={`font-mono ${comparison.avgDeficitB > comparison.avgDeficitA ? 'text-[#EF4444]' : 'text-[#00D4AA]'}`}>
            {(comparison.avgDeficitB * 100).toFixed(1)}%
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 text-center text-xs">
          <div className="text-[#8BA4BC] text-left flex items-center gap-1">
            <AlertTriangle size={10} className="text-[#EF4444]" />
            尾流重叠
          </div>
          <div className={`font-mono ${comparison.wakeOverlapCountA > 0 ? 'text-[#EF4444]' : 'text-[#00D4AA]'}`}>
            {comparison.wakeOverlapCountA} 处
          </div>
          <div className={`font-mono ${comparison.wakeOverlapCountB > 0 ? 'text-[#EF4444]' : 'text-[#00D4AA]'}`}>
            {comparison.wakeOverlapCountB} 处
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 text-center text-xs">
          <div className="text-[#8BA4BC] text-left">海缆穿越</div>
          <div className={`font-mono ${comparison.crossingsA.length > 0 ? 'text-[#EF4444]' : 'text-[#00D4AA]'}`}>
            {comparison.crossingsA.length} 处
          </div>
          <div className={`font-mono ${comparison.crossingsB.length > 0 ? 'text-[#EF4444]' : 'text-[#00D4AA]'}`}>
            {comparison.crossingsB.length} 处
          </div>
        </div>
      </div>
    </div>
  );
}
