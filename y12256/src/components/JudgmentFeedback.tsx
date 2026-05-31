import { useGameStore } from '@/store/gameStore';
import type { JudgmentResult } from '@/types';

const JUDGMENT_STYLES: Record<JudgmentResult, { color: string; glow: string; label: string }> = {
  perfect: {
    color: '#f0a830',
    glow: '0 0 12px #f0a830, 0 0 30px #f0a83080',
    label: 'PERFECT',
  },
  great: {
    color: '#2ed573',
    glow: '0 0 8px #2ed57380',
    label: 'GREAT',
  },
  good: {
    color: '#3dc1d3',
    glow: '0 0 8px #3dc1d380',
    label: 'GOOD',
  },
  miss: {
    color: '#e74c3c',
    glow: '0 0 8px #e74c3c80',
    label: 'MISS',
  },
};

const JUDGMENT_LINE_Y = 8;

export default function JudgmentFeedback() {
  const popup = useGameStore((s) => s.judgmentPopup);
  const combo = useGameStore((s) => s.combo);

  if (!popup) return null;

  const style = JUDGMENT_STYLES[popup.result];
  const trackX = ((popup.trackIndex + 0.5) / 4) * 100;

  return (
    <div
      className="absolute inset-0 pointer-events-none z-20"
    >
      <div
        className="absolute"
        style={{
          left: `${trackX}%`,
          top: `${JUDGMENT_LINE_Y}%`,
          transform: 'translate(-50%, -50%)',
        }}
      >
        <style>{`
          @keyframes judgmentPop {
            0% { transform: scale(0.5); opacity: 0; }
            20% { transform: scale(1.3); opacity: 1; }
            50% { transform: scale(1); opacity: 1; }
            100% { transform: scale(1); opacity: 0; }
          }
        `}</style>
        <div
          style={{
            color: style.color,
            textShadow: style.glow,
            fontFamily: "'Orbitron', sans-serif",
            fontSize: 28,
            fontWeight: 900,
            letterSpacing: 3,
            animation: 'judgmentPop 0.5s ease-out forwards',
            whiteSpace: 'nowrap',
          }}
        >
          {style.label}
        </div>
        {popup.result !== 'miss' && combo > 1 && (
          <div
            style={{
              color: style.color,
              fontFamily: "'Orbitron', sans-serif",
              fontSize: 16,
              fontWeight: 700,
              textAlign: 'center',
              marginTop: 4,
              opacity: 0.85,
              animation: 'judgmentPop 0.5s ease-out forwards',
            }}
          >
            {combo} COMBO
          </div>
        )}
      </div>
    </div>
  );
}
