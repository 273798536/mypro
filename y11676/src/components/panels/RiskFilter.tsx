import { useCallback, useRef, useState } from 'react';
import { TrendingUp } from 'lucide-react';
import { useCashFlowStore } from '../../hooks/useCashFlowStore';
import { RISK_COLORS } from '../../types/index';

const RISK_LABELS: Record<number, string> = {
  1: '极低',
  2: '低',
  3: '中',
  4: '高',
  5: '极高',
};

export default function RiskFilter() {
  const riskRange = useCashFlowStore(s => s.filters.riskRange);
  const setRiskRange = useCashFlowStore(s => s.setRiskRange);

  const trackRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState<null | 'min' | 'max'>(null);

  const levels = [1, 2, 3, 4, 5];

  const getPositionFromLevel = (level: number) => ((level - 1) / 4) * 100;

  const getLevelFromX = useCallback((clientX: number): number => {
    const track = trackRef.current;
    if (!track) return 1;
    const rect = track.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    return Math.round(ratio * 4) + 1;
  }, []);

  const handlePointerDown = (handle: 'min' | 'max') => (e: React.PointerEvent) => {
    e.preventDefault();
    setDragging(handle);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragging) return;
    const newLevel = getLevelFromX(e.clientX);
    if (dragging === 'min') {
      if (newLevel <= riskRange[1]) {
        setRiskRange([newLevel, riskRange[1]]);
      }
    } else {
      if (newLevel >= riskRange[0]) {
        setRiskRange([riskRange[0], newLevel]);
      }
    }
  };

  const handlePointerUp = () => {
    setDragging(null);
  };

  const minPct = getPositionFromLevel(riskRange[0]);
  const maxPct = getPositionFromLevel(riskRange[1]);

  return (
    <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-5">
      <div className="flex items-center gap-2 mb-1">
        <TrendingUp className="w-4 h-4 text-amber-400" />
        <h3 className="text-base font-semibold text-white">风险等级</h3>
      </div>
      <p className="text-xs text-white/50 mb-5 pl-6">Risk Level</p>

      <div
        ref={trackRef}
        className="relative h-10 select-none touch-none"
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-1.5 rounded-full bg-white/10" />
        <div
          className="absolute top-1/2 -translate-y-1/2 h-1.5 rounded-full"
          style={{
            left: `${minPct}%`,
            width: `${maxPct - minPct}%`,
            background: `linear-gradient(90deg, ${RISK_COLORS[riskRange[0]]}, ${RISK_COLORS[riskRange[1]]})`,
          }}
        />

        <div
          className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-5 h-5 rounded-full bg-white shadow-lg cursor-pointer transition-transform duration-150"
          style={{
            left: `${minPct}%`,
            border: `3px solid ${RISK_COLORS[riskRange[0]]}`,
            transform: `translate(-50%, -50%) scale(${dragging === 'min' ? 1.2 : 1})`,
          }}
          onPointerDown={handlePointerDown('min')}
        />
        <div
          className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-5 h-5 rounded-full bg-white shadow-lg cursor-pointer transition-transform duration-150"
          style={{
            left: `${maxPct}%`,
            border: `3px solid ${RISK_COLORS[riskRange[1]]}`,
            transform: `translate(-50%, -50%) scale(${dragging === 'max' ? 1.2 : 1})`,
          }}
          onPointerDown={handlePointerDown('max')}
        />
      </div>

      <div className="mt-6">
        <div className="flex rounded-lg overflow-hidden h-10 relative">
          {levels.map(level => {
            const inRange = level >= riskRange[0] && level <= riskRange[1];
            return (
              <div
                key={level}
                className="flex-1 flex flex-col items-center justify-center relative transition-all duration-300"
                style={{
                  backgroundColor: RISK_COLORS[level],
                  opacity: inRange ? 1 : 0.25,
                }}
              >
                <span className="text-[10px] font-bold text-white/95 drop-shadow">
                  {level}
                </span>
                <span className="text-[9px] text-white/90">
                  {RISK_LABELS[level]}
                </span>
                {inRange && level === riskRange[0] && (
                  <span
                    className="absolute -left-0.5 top-0 bottom-0 w-1 bg-white/80 rounded-r-sm"
                    style={{
                      boxShadow: '2px 0 0 rgba(255,255,255,0.3)',
                    }}
                  />
                )}
                {inRange && level === riskRange[1] && (
                  <span
                    className="absolute -right-0.5 top-0 bottom-0 w-1 bg-white/80 rounded-l-sm"
                    style={{
                      boxShadow: '-2px 0 0 rgba(255,255,255,0.3)',
                    }}
                  />
                )}
              </div>
            );
          })}
        </div>
        <div className="flex justify-between mt-2 text-[10px] text-white/40">
          <span>安全</span>
          <span>危险</span>
        </div>
      </div>

      <div className="mt-3 text-center text-xs text-white/70">
        当前范围：
        <span
          className="font-semibold ml-1"
          style={{ color: RISK_COLORS[riskRange[0]] }}
        >
          {riskRange[0]}·{RISK_LABELS[riskRange[0]]}
        </span>
        <span className="text-white/40 mx-1">→</span>
        <span
          className="font-semibold"
          style={{ color: RISK_COLORS[riskRange[1]] }}
        >
          {riskRange[1]}·{RISK_LABELS[riskRange[1]]}
        </span>
      </div>
    </div>
  );
}
