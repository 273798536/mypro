import { useStore } from '../../store/useStore';
import { Wind, Gauge, LayoutGrid, Eye, EyeOff, ChevronLeft, ChevronRight, Compass } from 'lucide-react';

export default function ParameterPanel() {
  const windDirection = useStore((s) => s.windDirection);
  const windSpeed = useStore((s) => s.windSpeed);
  const activeSchemeId = useStore((s) => s.activeSchemeId);
  const showWake = useStore((s) => s.showWake);
  const showCables = useStore((s) => s.showCables);
  const showVessels = useStore((s) => s.showVessels);
  const showParticles = useStore((s) => s.showParticles);
  const leftPanelOpen = useStore((s) => s.leftPanelOpen);
  const wakeResults = useStore((s) => s.wakeResults);
  const cableCrossings = useStore((s) => s.cableCrossings);
  const maintenanceConflicts = useStore((s) => s.maintenanceConflicts);
  const setWindDirection = useStore((s) => s.setWindDirection);
  const setWindSpeed = useStore((s) => s.setWindSpeed);
  const setActiveSchemeId = useStore((s) => s.setActiveSchemeId);
  const setShowWake = useStore((s) => s.setShowWake);
  const setShowCables = useStore((s) => s.setShowCables);
  const setShowVessels = useStore((s) => s.setShowVessels);
  const setShowParticles = useStore((s) => s.setShowParticles);
  const setLeftPanelOpen = useStore((s) => s.setLeftPanelOpen);

  const affectedCount = wakeResults.filter((w) => w.deficit > 0.01).length;
  const overlapCount = wakeResults.filter((w) => w.affectedBy.length > 1).length;

  if (!leftPanelOpen) {
    return (
      <button
        onClick={() => setLeftPanelOpen(true)}
        className="fixed left-0 top-1/2 -translate-y-1/2 z-20 bg-[#0A1628]/80 backdrop-blur-md border border-[#1E3A5F] border-l-0 rounded-r-lg p-2 text-[#00D4AA] hover:bg-[#1E3A5F]/50 transition-all"
      >
        <ChevronRight size={18} />
      </button>
    );
  }

  return (
    <div className="fixed left-0 top-0 bottom-0 z-20 w-72 bg-[#0A1628]/90 backdrop-blur-xl border-r border-[#1E3A5F]/60 flex flex-col overflow-y-auto">
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#1E3A5F]/40">
        <h2 className="text-[#00D4AA] text-sm font-semibold tracking-wider" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
          参数控制
        </h2>
        <button onClick={() => setLeftPanelOpen(false)} className="text-[#4A6B8A] hover:text-[#00D4AA] transition-colors">
          <ChevronLeft size={16} />
        </button>
      </div>

      <div className="px-4 py-3 space-y-4 flex-1">
        <div>
          <label className="flex items-center gap-2 text-xs text-[#8BA4BC] mb-2">
            <Wind size={14} className="text-[#00D4AA]" />
            风向
            <span className="ml-auto text-[#00D4AA] font-mono text-xs">{windDirection}°</span>
          </label>
          <div className="flex items-center gap-3">
            <input
              type="range"
              min={0}
              max={360}
              step={1}
              value={windDirection}
              onChange={(e) => setWindDirection(Number(e.target.value))}
              className="flex-1 h-1.5 appearance-none bg-[#1E3A5F] rounded-full cursor-pointer accent-[#00D4AA]"
            />
            <div className="w-10 h-10 rounded-full border-2 border-[#1E3A5F] relative flex items-center justify-center bg-[#0A1628]/60">
              <div
                className="absolute w-0.5 h-4 bg-[#00D4AA] rounded-full origin-bottom"
                style={{
                  transform: `rotate(${windDirection}deg)`,
                  bottom: '50%',
                }}
              />
              <div className="w-1.5 h-1.5 rounded-full bg-[#00D4AA]" />
            </div>
          </div>
        </div>

        <div>
          <label className="flex items-center gap-2 text-xs text-[#8BA4BC] mb-2">
            <Gauge size={14} className="text-[#00D4AA]" />
            风速
            <span className="ml-auto text-[#00D4AA] font-mono text-xs">{windSpeed} m/s</span>
          </label>
          <input
            type="range"
            min={1}
            max={25}
            step={0.1}
            value={windSpeed}
            onChange={(e) => setWindSpeed(Number(e.target.value))}
            className="w-full h-1.5 appearance-none bg-[#1E3A5F] rounded-full cursor-pointer accent-[#00D4AA]"
          />
          <div className="flex justify-between text-[8px] text-[#4A6B8A] mt-1">
            <span>1 m/s</span>
            <span>切入3</span>
            <span>额定12</span>
            <span>25 m/s</span>
          </div>
        </div>

        <div>
          <label className="flex items-center gap-2 text-xs text-[#8BA4BC] mb-2">
            <LayoutGrid size={14} className="text-[#00D4AA]" />
            排布方案
          </label>
          <div className="flex gap-2">
            {['scheme-a', 'scheme-b'].map((id) => (
              <button
                key={id}
                onClick={() => setActiveSchemeId(id)}
                className={`flex-1 px-3 py-2 rounded-lg text-xs font-mono transition-all ${
                  activeSchemeId === id
                    ? 'bg-[#00D4AA]/20 text-[#00D4AA] border border-[#00D4AA]/50'
                    : 'bg-[#1E3A5F]/30 text-[#8BA4BC] border border-[#1E3A5F]/40 hover:border-[#00D4AA]/30'
                }`}
              >
                {id === 'scheme-a' ? '紧密排布' : '宽松排布'}
              </button>
            ))}
          </div>
        </div>

        <div className="border-t border-[#1E3A5F]/40 pt-3">
          <label className="flex items-center gap-2 text-xs text-[#8BA4BC] mb-3">
            <Eye size={14} className="text-[#00D4AA]" />
            可视化图层
          </label>
          <div className="space-y-2">
            {[
              { key: 'wake' as const, label: '尾流锥体', show: showWake, set: setShowWake, color: '#FF6B35' },
              { key: 'cables' as const, label: '海缆路径', show: showCables, set: setShowCables, color: '#FBBF24' },
              { key: 'vessels' as const, label: '检修船', show: showVessels, set: setShowVessels, color: '#34D399' },
              { key: 'particles' as const, label: '风场粒子', show: showParticles, set: setShowParticles, color: '#00D4AA' },
            ].map(({ key, label, show, set, color }) => (
              <button
                key={key}
                onClick={() => set(!show)}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs transition-all ${
                  show
                    ? 'bg-[#1E3A5F]/40 text-[#E8ECF1]'
                    : 'bg-transparent text-[#4A6B8A]'
                }`}
              >
                <div className={`w-2.5 h-2.5 rounded-full ${show ? '' : 'opacity-30'}`} style={{ background: color }} />
                <span className="flex-1 text-left">{label}</span>
                {show ? <Eye size={12} /> : <EyeOff size={12} />}
              </button>
            ))}
          </div>
        </div>

        <div className="border-t border-[#1E3A5F]/40 pt-3">
          <h3 className="text-xs text-[#8BA4BC] mb-2 flex items-center gap-2">
            <Compass size={14} className="text-[#FF6B35]" />
            实时诊断
          </h3>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-[#8BA4BC]">尾流影响</span>
              <span className={`font-mono ${affectedCount > 0 ? 'text-[#FF6B35]' : 'text-[#00D4AA]'}`}>
                {affectedCount} 台
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-[#8BA4BC]">尾流重叠</span>
              <span className={`font-mono ${overlapCount > 0 ? 'text-[#EF4444]' : 'text-[#00D4AA]'}`}>
                {overlapCount} 处
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-[#8BA4BC]">海缆穿越</span>
              <span className={`font-mono ${cableCrossings.length > 0 ? 'text-[#EF4444]' : 'text-[#00D4AA]'}`}>
                {cableCrossings.length} 处
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-[#8BA4BC]">检修冲突</span>
              <span className={`font-mono ${maintenanceConflicts.length > 0 ? 'text-[#EF4444]' : 'text-[#00D4AA]'}`}>
                {maintenanceConflicts.length} 项
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
