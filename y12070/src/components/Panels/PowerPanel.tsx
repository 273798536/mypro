import { useMemo } from 'react';
import { useStore } from '../../store/useStore';
import { powerRecords, windConditions, schemeA, schemeB, generatePowerRecords } from '../../data/mockData';
import { ChevronLeft, ChevronRight, Zap, TrendingDown } from 'lucide-react';

const schemeBRecords = generatePowerRecords(schemeB.turbines, windConditions);

export default function PowerPanel() {
  const currentTimestampIndex = useStore((s) => s.currentTimestampIndex);
  const activeSchemeId = useStore((s) => s.activeSchemeId);
  const rightPanelOpen = useStore((s) => s.rightPanelOpen);
  const setRightPanelOpen = useStore((s) => s.setRightPanelOpen);
  const windDirection = useStore((s) => s.windDirection);
  const windSpeed = useStore((s) => s.windSpeed);
  const wakeResults = useStore((s) => s.wakeResults);

  const currentRecords = useMemo(() => {
    const ts = windConditions[currentTimestampIndex]?.timestamp;
    if (!ts) return [];
    const records = activeSchemeId === 'scheme-b' ? schemeBRecords : powerRecords;
    return records.filter((r) => r.timestamp === ts);
  }, [currentTimestampIndex, activeSchemeId]);

  const maxPower = useMemo(() => {
    if (currentRecords.length === 0) return 14;
    return Math.max(...currentRecords.map((r) => r.powerOutput), 1);
  }, [currentRecords]);

  const totalPower = currentRecords.reduce((s, r) => s + r.powerOutput, 0);

  if (!rightPanelOpen) {
    return (
      <button
        onClick={() => setRightPanelOpen(true)}
        className="fixed right-0 top-1/2 -translate-y-1/2 z-20 bg-[#0A1628]/80 backdrop-blur-md border border-[#1E3A5F] border-r-0 rounded-l-lg p-2 text-[#00D4AA] hover:bg-[#1E3A5F]/50 transition-all"
      >
        <ChevronLeft size={18} />
      </button>
    );
  }

  return (
    <div className="fixed right-0 top-0 bottom-0 z-20 w-64 bg-[#0A1628]/90 backdrop-blur-xl border-l border-[#1E3A5F]/60 flex flex-col overflow-y-auto">
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#1E3A5F]/40">
        <h2 className="text-[#00D4AA] text-sm font-semibold tracking-wider" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
          发电记录
        </h2>
        <button onClick={() => setRightPanelOpen(false)} className="text-[#4A6B8A] hover:text-[#00D4AA] transition-colors">
          <ChevronRight size={16} />
        </button>
      </div>

      <div className="px-4 py-3 space-y-3 flex-1">
        <div className="bg-[#1E3A5F]/30 rounded-lg p-3">
          <div className="flex items-center gap-2 text-xs text-[#8BA4BC] mb-1">
            <Zap size={12} className="text-[#FBBF24]" />
            当前时段总发电量
          </div>
          <div className="text-xl text-[#00D4AA] font-mono font-bold">
            {totalPower.toFixed(1)} <span className="text-xs text-[#8BA4BC]">MW·h</span>
          </div>
        </div>

        <div className="bg-[#1E3A5F]/30 rounded-lg p-3">
          <div className="flex items-center gap-2 text-xs text-[#8BA4BC] mb-1">
            <TrendingDown size={12} className="text-[#FF6B35]" />
            风况
          </div>
          <div className="flex justify-between text-xs font-mono">
            <span className="text-[#8BA4BC]">风向</span>
            <span className="text-[#00D4AA]">{windDirection}°</span>
          </div>
          <div className="flex justify-between text-xs font-mono mt-1">
            <span className="text-[#8BA4BC]">风速</span>
            <span className="text-[#00D4AA]">{windSpeed} m/s</span>
          </div>
        </div>

        <div>
          <h3 className="text-xs text-[#8BA4BC] mb-2">各风机发电量</h3>
          <div className="space-y-1.5">
            {currentRecords.map((r) => {
              const wake = wakeResults.find((w) => w.turbineId === r.turbineId);
              const isAnomaly = wake && wake.deficit > 0.15;
              const pct = (r.powerOutput / maxPower) * 100;
              return (
                <div key={r.turbineId} className="group">
                  <div className="flex items-center justify-between text-xs mb-0.5">
                    <span className={`font-mono ${isAnomaly ? 'text-[#EF4444]' : 'text-[#E8ECF1]'}`}>
                      {r.turbineId}
                      {isAnomaly && <span className="text-[8px] ml-1 text-[#EF4444]">尾流损失</span>}
                    </span>
                    <span className="font-mono text-[#8BA4BC]">{r.powerOutput.toFixed(1)} MW</span>
                  </div>
                  <div className="h-2 bg-[#1E3A5F]/50 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-300"
                      style={{
                        width: `${Math.max(pct, 1)}%`,
                        background: isAnomaly
                          ? 'linear-gradient(90deg, #EF4444, #FF6B35)'
                          : 'linear-gradient(90deg, #00D4AA, #00A88A)',
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
