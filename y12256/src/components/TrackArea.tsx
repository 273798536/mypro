import { useGameStore } from '@/store/gameStore';
import { TRACK_COUNT } from '@/types';
import type { BeatNote } from '@/types';
import { cn } from '@/lib/utils';

const TRACK_COLORS = [
  'rgba(240, 168, 48, 0.15)',
  'rgba(240, 168, 48, 0.12)',
  'rgba(240, 168, 48, 0.12)',
  'rgba(240, 168, 48, 0.15)',
];

const NOTE_COLORS = ['#f0a830', '#f0a830', '#f0a830', '#f0a830'];

const SCROLL_DURATION = 2000;

function notePosition(targetTime: number, elapsed: number): number {
  const delta = targetTime - elapsed;
  return 1 - delta / SCROLL_DURATION;
}

function NoteBlock({ note, elapsed }: { note: BeatNote; elapsed: number }) {
  const pos = notePosition(note.targetTime, elapsed);
  if (pos < -0.1 || pos > 1.15) return null;

  const color = NOTE_COLORS[note.trackIndex];
  const opacity = note.judged ? 0.3 : 1;

  return (
    <div
      className="absolute left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none"
      style={{ top: `${pos * 100}%`, opacity }}
    >
      {note.isSyncopation ? (
        <div
          className="relative"
          style={{
            width: 28,
            height: 28,
            transform: 'rotate(45deg)',
            background: color,
            boxShadow: `0 0 12px ${color}, 0 0 24px ${color}80`,
          }}
        >
          <div
            className="absolute inset-1"
            style={{
              background: '#1a1d2e',
              borderRadius: 2,
            }}
          />
        </div>
      ) : (
        <div
          style={{
            width: 52,
            height: 14,
            borderRadius: 4,
            background: color,
            boxShadow: `0 0 8px ${color}, 0 0 20px ${color}60`,
          }}
        />
      )}
      <div
        className="absolute left-1/2 -translate-x-1/2 top-full"
        style={{
          width: note.isSyncopation ? 16 : 36,
          height: 40,
          background: `linear-gradient(to bottom, ${color}40, transparent)`,
          filter: 'blur(4px)',
          borderRadius: '50%',
        }}
      />
    </div>
  );
}

function Track({ index, active }: { index: number; active: boolean }) {
  const notes = useGameStore((s) => s.notes);
  const elapsed = useGameStore((s) => s.elapsedTime);

  const trackNotes = notes.filter((n) => n.trackIndex === index);

  return (
    <div
      className={cn(
        'relative flex-1 transition-colors duration-100',
        active && 'brightness-150'
      )}
      style={{
        background: active
          ? `linear-gradient(to bottom, transparent, ${TRACK_COLORS[index]}66)`
          : TRACK_COLORS[index],
        borderLeft: index > 0 ? '1px solid rgba(240,168,48,0.15)' : undefined,
      }}
    >
      {trackNotes.map((note) => (
        <NoteBlock key={note.id} note={note} elapsed={elapsed} />
      ))}
      <div
        className="absolute bottom-0 left-0 right-0 h-[3px]"
        style={{
          background: 'rgba(255,255,255,0.06)',
        }}
      />
    </div>
  );
}

export default function TrackArea() {
  const activeKeys = useGameStore((s) => s.activeTrackKeys);

  return (
    <div className="relative flex h-full w-full" style={{ background: '#1a1d2e' }}>
      {Array.from({ length: TRACK_COUNT }, (_, i) => (
        <Track key={i} index={i} active={activeKeys.has(i)} />
      ))}
      <div
        className="absolute bottom-[8%] left-0 right-0 h-[3px] z-10"
        style={{
          background: 'white',
          boxShadow:
            '0 0 8px rgba(255,255,255,0.9), 0 0 20px rgba(255,255,255,0.5), 0 0 40px rgba(255,255,255,0.3)',
        }}
      />
    </div>
  );
}
