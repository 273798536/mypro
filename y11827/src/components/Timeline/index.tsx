import { useRef, useEffect } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { X, Music } from 'lucide-react';
import type { ScheduleItem, Conflict } from '../../types';
import { GAME_START_MINUTES, GAME_END_MINUTES, PIXELS_PER_MINUTE } from '../../types';
import { useGameStore } from '../../store/gameStore';
import { artists } from '../../data/artists';
import { stages } from '../../data/stages';
import { minutesToTimeString } from '../../utils/timeUtils';

const TIMELINE_WIDTH = (GAME_END_MINUTES - GAME_START_MINUTES) * PIXELS_PER_MINUTE;
const GOLDEN_START = 18 * 60;
const GOLDEN_END = 21 * 60;
const LABEL_WIDTH = 120;

const HEAT_COLORS: Record<number, string> = {
  5: '#FF6B35',
  4: '#00E5FF',
  3: '#A855F7',
  2: '#22C55E',
  1: '#3B82F6',
};

function DroppableTrack({
  stageId,
  children,
}: {
  stageId: string;
  children: React.ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: stageId });
  return (
    <div
      ref={setNodeRef}
      className={`relative transition-colors duration-200 ${isOver ? 'bg-cyan-500/10 ring-1 ring-cyan-500/30 ring-inset' : ''}`}
      style={{ width: TIMELINE_WIDTH, minHeight: 56 }}
    >
      {children}
    </div>
  );
}

export default function Timeline() {
  const scheduleItems: ScheduleItem[] = useGameStore((s) => s.scheduleItems);
  const conflicts: Conflict[] = useGameStore((s) => s.conflicts);
  const selectedConflictId = useGameStore((s) => s.selectedConflictId);
  const removeScheduleItem = useGameStore((s) => s.removeScheduleItem);
  const selectConflict = useGameStore((s) => s.selectConflict);
  const setTimelineRef = useGameStore((s) => s.setTimelineRef);

  const timelineRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (timelineRef.current) {
      setTimelineRef(timelineRef.current);
    }
  }, [setTimelineRef]);

  const conflictItemIds = new Set(conflicts.flatMap((c) => c.scheduleItemIds));
  const selectedConflict = conflicts.find((c) => c.id === selectedConflictId);
  const selectedItemIds = new Set(selectedConflict?.scheduleItemIds ?? []);

  const timeMarkers: number[] = [];
  for (let t = GAME_START_MINUTES; t <= GAME_END_MINUTES; t += 30) {
    timeMarkers.push(t);
  }

  const goldenLeft = (GOLDEN_START - GAME_START_MINUTES) * PIXELS_PER_MINUTE;
  const goldenWidth = (GOLDEN_END - GOLDEN_START) * PIXELS_PER_MINUTE;

  const handleItemClick = (itemId: string) => {
    const conflict = conflicts.find((c) =>
      c.scheduleItemIds.includes(itemId)
    );
    if (conflict) {
      selectConflict(
        conflict.id === selectedConflictId ? null : conflict.id
      );
    }
  };

  return (
    <div
      ref={timelineRef}
      className="overflow-x-auto bg-[#0F1419] rounded-lg border border-gray-700/50"
    >
      <div
        style={{ width: TIMELINE_WIDTH + LABEL_WIDTH }}
        className="relative min-w-fit"
      >
        <div className="sticky top-0 z-10 flex border-b border-gray-700/50 bg-[#0F1419]">
          <div className="w-[120px] shrink-0" />
          <div className="relative" style={{ width: TIMELINE_WIDTH }}>
            {timeMarkers.map((t) => (
              <div
                key={t}
                className="absolute top-0 bottom-0 border-l border-gray-700/30 flex items-start pt-1"
                style={{
                  left: (t - GAME_START_MINUTES) * PIXELS_PER_MINUTE,
                }}
              >
                <span className="text-[10px] text-gray-500 ml-1 font-mono">
                  {minutesToTimeString(t)}
                </span>
              </div>
            ))}
          </div>
        </div>

        {stages.map((stage) => {
          const items = scheduleItems.filter(
            (i) => i.stageId === stage.id
          );
          return (
            <div
              key={stage.id}
              className="flex border-b border-gray-700/30"
            >
              <div className="w-[120px] shrink-0 flex items-center px-3 border-r border-gray-700/30 bg-[#0F1419]">
                <Music size={14} className="text-gray-500 mr-2" />
                <span className="text-sm text-gray-300 font-medium">
                  {stage.name}
                </span>
              </div>
              <DroppableTrack stageId={stage.id}>
                <div
                  className="absolute top-0 bottom-0 bg-yellow-500/5 pointer-events-none"
                  style={{ left: goldenLeft, width: goldenWidth }}
                />
                <div
                  className="absolute top-0 bottom-0 pointer-events-none"
                  style={{ left: goldenLeft, width: goldenWidth, background: 'linear-gradient(90deg, rgba(255,215,0,0.03), rgba(255,215,0,0.06), rgba(255,215,0,0.03))' }}
                />
                {timeMarkers.map((t) => (
                  <div
                    key={t}
                    className="absolute top-0 bottom-0 border-l border-gray-700/15 pointer-events-none"
                    style={{
                      left: (t - GAME_START_MINUTES) * PIXELS_PER_MINUTE,
                    }}
                  />
                ))}
                {items.map((item) => {
                  const artist = artists.find(
                    (a) => a.id === item.artistId
                  );
                  if (!artist) return null;
                  const hasConflict = conflictItemIds.has(item.id);
                  const isSelected = selectedItemIds.has(item.id);
                  const itemWidth = (item.endTime - item.startTime) * PIXELS_PER_MINUTE;
                  return (
                    <div
                      key={item.id}
                      className="absolute top-1 bottom-1 rounded-md cursor-pointer flex items-center px-1.5 gap-1 group transition-shadow"
                      style={{
                        left: (item.startTime - GAME_START_MINUTES) * PIXELS_PER_MINUTE,
                        width: itemWidth,
                        backgroundColor: HEAT_COLORS[artist.heat] || '#3B82F6',
                        border: hasConflict
                          ? '2px solid #FF2D55'
                          : isSelected
                            ? '2px solid #FFD700'
                            : '2px solid rgba(255,255,255,0.1)',
                        animation: hasConflict
                          ? 'pulse-border 2s ease-in-out infinite'
                          : undefined,
                        opacity: 0.9,
                        boxShadow: isSelected ? '0 0 8px rgba(255,215,0,0.4)' : hasConflict ? '0 0 8px rgba(255,45,85,0.3)' : 'none',
                      }}
                      onClick={() => handleItemClick(item.id)}
                    >
                      {hasConflict && (
                        <span className="w-2 h-2 rounded-full bg-red-500 shrink-0 animate-pulse" />
                      )}
                      {itemWidth >= 120 && (
                        <>
                          <span className="text-xs text-white font-medium truncate">
                            {artist.name}
                          </span>
                          <span className="text-[10px] text-white/60 shrink-0">
                            {minutesToTimeString(item.startTime)}-{minutesToTimeString(item.endTime)}
                          </span>
                        </>
                      )}
                      {itemWidth < 120 && itemWidth >= 60 && (
                        <span className="text-[10px] text-white font-medium truncate">
                          {artist.name}
                        </span>
                      )}
                      {itemWidth < 60 && (
                        <span className="text-[9px] text-white font-medium truncate">
                          {artist.name.slice(0, 2)}
                        </span>
                      )}
                      <button
                        className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full hidden group-hover:flex items-center justify-center text-white hover:bg-red-400 transition-colors"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeScheduleItem(item.id);
                        }}
                      >
                        <X size={10} />
                      </button>
                    </div>
                  );
                })}
              </DroppableTrack>
            </div>
          );
        })}
      </div>
    </div>
  );
}
