import { useGameStore } from "@/store/gameStore";
import { getBrickById } from "@/config/bricks";
import { useMemo } from "react";

interface BeatTrackProps {
  onBeatClick: (beatIndex: number) => void;
}

export default function BeatTrack({ onBeatClick }: BeatTrackProps) {
  const currentBeat = useGameStore((s) => s.currentBeat);
  const totalBeats = useGameStore((s) => s.totalBeats);
  const targetSequence = useGameStore((s) => s.targetSequence);
  const beatEvents = useGameStore((s) => s.beatEvents);
  const selectedBrickId = useGameStore((s) => s.selectedBrickId);
  const status = useGameStore((s) => s.status);

  const visibleRange = useMemo(() => {
    const viewSize = 12;
    const start = Math.max(0, currentBeat - 2);
    const end = Math.min(totalBeats, start + viewSize);
    const adjustedStart = Math.max(0, end - viewSize);
    return { start: adjustedStart, end };
  }, [currentBeat, totalBeats]);

  const beats = useMemo(() => {
    const result = [];
    for (let i = visibleRange.start; i < visibleRange.end; i++) {
      const event = beatEvents.find((e) => e.beatIndex === i);
      const targetIds = targetSequence[i] || [];
      const targetBricks = targetIds.map(getBrickById).filter(Boolean);
      const playerBricks = event
        ? event.playerBrickIds.map(getBrickById).filter(Boolean)
        : [];
      const errors = event?.errors || [];

      result.push({
        index: i,
        targetBricks,
        playerBricks,
        event,
        errors,
        isCurrent: i === currentBeat,
        isPast: i < currentBeat,
        judgment: event?.judgment,
      });
    }
    return result;
  }, [visibleRange, targetSequence, beatEvents, currentBeat]);

  return (
    <div className="relative w-full overflow-hidden">
      <div className="flex gap-1.5 items-center justify-center py-3 px-4">
        {beats.map((beat) => {
          const isClickable = status === "playing" && selectedBrickId && !beat.event && (beat.index === currentBeat || beat.index === currentBeat + 1);

          return (
            <button
              key={beat.index}
              onClick={() => isClickable && onBeatClick(beat.index)}
              className={`
                relative flex flex-col items-center justify-between
                w-14 h-24 rounded-lg border transition-all duration-300 flex-shrink-0
                ${beat.isCurrent ? "border-white/40 bg-white/5" : ""}
                ${beat.isPast && !beat.isCurrent ? "border-[#1a1a3a] bg-[#0a0a1a]/60" : ""}
                ${!beat.isPast && !beat.isCurrent ? "border-[#1a1a3a] bg-[#0d0d20]" : ""}
                ${isClickable ? "cursor-pointer hover:bg-white/10 hover:scale-105" : "cursor-default"}
              `}
            >
              <span className="text-[8px] text-[#445566] absolute top-0.5">
                {beat.index + 1}
              </span>

              <div className="flex flex-col gap-0.5 mt-3">
                {beat.targetBricks.map((brick) =>
                  brick ? (
                    <div
                      key={brick.id}
                      className="w-10 h-3 rounded-sm opacity-50 border border-dashed"
                      style={{
                        borderColor: brick.color,
                        backgroundColor: `${brick.color}20`,
                      }}
                    />
                  ) : null
                )}
              </div>

              <div className="flex flex-col gap-0.5 mb-1">
                {beat.playerBricks.map((brick) =>
                  brick ? (
                    <div
                      key={brick.id}
                      className="w-10 h-3 rounded-sm"
                      style={{
                        backgroundColor: brick.color,
                        boxShadow: `0 0 6px ${brick.glowColor}`,
                      }}
                    />
                  ) : null
                )}
              </div>

              {beat.judgment && (
                <span
                  className={`absolute -bottom-0.5 text-[8px] font-bold ${
                    beat.judgment === "perfect"
                      ? "text-[#33ff99]"
                      : beat.judgment === "good"
                      ? "text-[#ff9933]"
                      : "text-[#ff3366]"
                  }`}
                >
                  {beat.judgment === "perfect" ? "完美" : beat.judgment === "good" ? "良好" : "失误"}
                </span>
              )}

              {beat.errors.length > 0 && (
                <div className="absolute -top-1 -right-1 flex flex-col gap-0.5">
                  {beat.errors.map((err) => (
                    <div
                      key={err.id}
                      className="w-2 h-2 rounded-full"
                      style={{
                        backgroundColor:
                          err.type === "aliasing"
                            ? "#9966ff"
                            : err.type === "misalignment"
                            ? "#ff9933"
                            : "#ff3366",
                      }}
                      title={err.description}
                    />
                  ))}
                </div>
              )}

              {beat.isCurrent && (
                <div className="absolute inset-x-0 bottom-0 h-0.5 bg-white/60 rounded-b-lg" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
