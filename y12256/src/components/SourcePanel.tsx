import { useGameStore } from '@/store/gameStore';
import { getNoteSourceStatus } from '@/engine/arbitrator';
import { AlertTriangle } from 'lucide-react';

function SourceColumn({
  label,
  color,
  trackLabel,
  timeLabel,
  isConflict,
}: {
  label: string;
  color: string;
  trackLabel: string;
  timeLabel: string;
  isConflict: boolean;
}) {
  return (
    <div
      className="flex-1 rounded-lg p-3 transition-all duration-200"
      style={{
        background: isConflict ? 'rgba(231, 76, 60, 0.2)' : 'rgba(255,255,255,0.05)',
        border: isConflict ? '1px solid rgba(231, 76, 60, 0.5)' : '1px solid rgba(255,255,255,0.08)',
      }}
    >
      <div className="flex items-center gap-2 mb-2">
        <span
          style={{
            fontFamily: "'Noto Sans SC', sans-serif",
            fontWeight: 700,
            fontSize: 13,
            color,
          }}
        >
          {label}
        </span>
        {isConflict && (
          <div
            style={{
              animation: 'sourcePulse 0.8s ease-in-out infinite',
            }}
          >
            <AlertTriangle size={14} color="#e74c3c" />
          </div>
        )}
      </div>
      <div
        style={{
          fontFamily: "'Orbitron', sans-serif",
          fontSize: 11,
          color: 'rgba(255,255,255,0.6)',
          marginBottom: 4,
        }}
      >
        {trackLabel}
      </div>
      <div
        style={{
          fontFamily: "'Orbitron', sans-serif",
          fontSize: 11,
          color: 'rgba(255,255,255,0.6)',
        }}
      >
        {timeLabel}
      </div>
      <style>{`
        @keyframes sourcePulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
    </div>
  );
}

export default function SourcePanel() {
  const notes = useGameStore((s) => s.notes);
  const elapsed = useGameStore((s) => s.elapsedTime);
  const phase = useGameStore((s) => s.phase);

  if (phase === 'idle') return null;

  const upcoming = notes
    .filter((n) => !n.judged && n.targetTime > elapsed - 200)
    .sort((a, b) => a.targetTime - b.targetTime);

  const latest = upcoming[0];

  if (!latest) {
    return (
      <div className="flex gap-3 px-2" style={{ fontFamily: "'Noto Sans SC', sans-serif" }}>
        <SourceColumn label="节拍轨" color="#f0a830" trackLabel="--" timeLabel="--" isConflict={false} />
        <SourceColumn label="列车" color="#3dc1d3" trackLabel="--" timeLabel="--" isConflict={false} />
        <SourceColumn label="站台" color="#2ed573" trackLabel="--" timeLabel="--" isConflict={false} />
      </div>
    );
  }

  const status = getNoteSourceStatus(latest);

  return (
    <div className="flex gap-3 px-2" style={{ fontFamily: "'Noto Sans SC', sans-serif" }}>
      <SourceColumn
        label="节拍轨"
        color="#f0a830"
        trackLabel={`轨道 ${latest.sourceBeat.expectedTrack}`}
        timeLabel={`${(latest.sourceBeat.expectedTime / 1000).toFixed(2)}s`}
        isConflict={status.beatTrack === 'conflict'}
      />
      <SourceColumn
        label="列车"
        color="#3dc1d3"
        trackLabel={`轨道 ${latest.sourceTrain.actualTrack}`}
        timeLabel={`延迟 ${latest.sourceTrain.switchDelay}ms`}
        isConflict={status.train === 'conflict'}
      />
      <SourceColumn
        label="站台"
        color="#2ed573"
        trackLabel={`轨道 ${latest.sourcePlatform.designatedTrack}`}
        timeLabel={`${(latest.sourcePlatform.openTime / 1000).toFixed(2)}s`}
        isConflict={status.platform === 'conflict'}
      />
    </div>
  );
}
