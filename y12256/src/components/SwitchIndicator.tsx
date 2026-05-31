import { useGameStore } from '@/store/gameStore';
import type { TrackSwitch } from '@/types';
import { ChevronRight } from 'lucide-react';

const JUDGMENT_LINE_Y = 8;

function SwitchArrow({ sw, elapsed }: { sw: TrackSwitch; elapsed: number }) {
  const fromX = ((sw.fromTrack + 0.5) / 4) * 100;
  const toX = ((sw.toTrack + 0.5) / 4) * 100;
  const y = JUDGMENT_LINE_Y;

  const remaining = sw.triggerTime + sw.arrivalDelay - elapsed;
  const isPending = !sw.isDelivered && remaining > 0;
  const isImminent = !sw.isDelivered && remaining <= 0;

  if (!isPending && !isImminent && !sw.isDelivered) return null;

  const countdown = Math.max(0, Math.ceil(remaining / 1000));

  if (sw.isDelivered) {
    return (
      <div
        className="absolute pointer-events-none"
        style={{
          left: `${fromX}%`,
          top: `${y - 6}%`,
          transform: 'translate(-50%, -50%)',
        }}
      >
        <style>{`
          @keyframes switchFlash {
            0% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
            100% { opacity: 0; transform: translate(-50%, -50%) scale(1.8); }
          }
        `}</style>
        <div
          style={{
            animation: 'switchFlash 0.4s ease-out forwards',
            color: '#f0a830',
            filter: 'drop-shadow(0 0 8px #f0a830)',
          }}
        >
          <ChevronRight size={32} />
        </div>
      </div>
    );
  }

  return (
    <div
      className="absolute pointer-events-none"
      style={{
        left: `${(fromX + toX) / 2}%`,
        top: `${y - 6}%`,
        transform: 'translate(-50%, -50%)',
      }}
    >
      <style>{`
        @keyframes pulseArrow {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 0.9; }
        }
      `}</style>
      <div
        style={{
          animation: 'pulseArrow 0.6s ease-in-out infinite',
          color: isImminent ? '#2ed573' : '#3dc1d3',
          opacity: 0.6,
          filter: isImminent
            ? 'drop-shadow(0 0 8px #2ed573)'
            : 'drop-shadow(0 0 4px #3dc1d3)',
          transform: sw.toTrack > sw.fromTrack ? 'scaleX(1)' : 'scaleX(-1)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <ChevronRight size={24} />
        {isPending && countdown > 0 && (
          <span
            style={{
              fontSize: 10,
              fontWeight: 700,
              fontFamily: "'Orbitron', sans-serif",
              color: '#3dc1d3',
              marginTop: 2,
            }}
          >
            {countdown}s
          </span>
        )}
      </div>
    </div>
  );
}

export default function SwitchIndicator() {
  const switches = useGameStore((s) => s.switches);
  const elapsed = useGameStore((s) => s.elapsedTime);
  const phase = useGameStore((s) => s.phase);

  if (phase === 'idle') return null;

  const activeSwitches = switches.filter((sw) => {
    if (sw.isDelivered) {
      return elapsed - sw.triggerTime < 500;
    }
    return elapsed >= sw.triggerTime - 2000;
  });

  if (activeSwitches.length === 0) return null;

  return (
    <div className="absolute inset-0 pointer-events-none z-30">
      {activeSwitches.map((sw) => (
        <SwitchArrow key={sw.id} sw={sw} elapsed={elapsed} />
      ))}
    </div>
  );
}
