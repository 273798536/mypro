import { DndContext, DragOverlay, useSensor, useSensors, PointerSensor, type DragStartEvent, type DragEndEvent } from '@dnd-kit/core';
import { useState, useCallback, useRef, useEffect } from 'react';
import Timeline from '../components/Timeline';
import ArtistCard, { ArtistCardOverlay } from '../components/ArtistCard';
import ConflictPanel from '../components/ConflictPanel';
import WeatherBanner from '../components/WeatherBanner';
import HeatPanel from '../components/HeatPanel';
import GameControls from '../components/GameControls';
import ReviewSlider from '../components/ReviewSlider';
import { useGameStore } from '../store/gameStore';
import { artists } from '../data/artists';
import { stages } from '../data/stages';
import { GAME_START_MINUTES, PIXELS_PER_MINUTE } from '../types';
import { Calendar, Users, Wrench, Cloud } from 'lucide-react';

const LABEL_WIDTH = 120;

export default function GamePage() {
  const arrangedArtistIds = useGameStore((s) => s.arrangedArtistIds);
  const activatedWeather = useGameStore((s) => s.activatedWeather);
  const phase = useGameStore((s) => s.phase);
  const conflicts = useGameStore((s) => s.conflicts);
  const placeArtist = useGameStore((s) => s.placeArtist);
  const timelineRef = useGameStore((s) => s.timelineRef);

  const [dragArtistId, setDragArtistId] = useState<string | null>(null);
  const pointerXRef = useRef(0);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      pointerXRef.current = e.clientX;
    };
    window.addEventListener('pointermove', onMove);
    return () => window.removeEventListener('pointermove', onMove);
  }, []);

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const rawId = String(event.active.id).replace('artist-', '');
    setDragArtistId(rawId);
  }, []);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const rawId = String(event.active.id).replace('artist-', '');
      setDragArtistId(null);
      const { over } = event;
      if (!over || !timelineRef) return;

      const stageId = String(over.id);
      const rect = timelineRef.getBoundingClientRect();
      const scrollLeft = timelineRef.scrollLeft;
      const x = pointerXRef.current - rect.left + scrollLeft - LABEL_WIDTH;
      const rawTime = GAME_START_MINUTES + x / PIXELS_PER_MINUTE;
      const startTime = Math.max(
        GAME_START_MINUTES,
        Math.round(rawTime / 5) * 5
      );

      placeArtist(rawId, stageId, startTime);
    },
    [placeArtist, timelineRef]
  );

  const dragArtist = dragArtistId ? artists.find((a) => a.id === dragArtistId) : null;

  const isPaused = phase === 'paused';
  const isReview = phase === 'review';

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="h-screen flex flex-col bg-[#0A0E14] text-white overflow-hidden">
        <WeatherBanner />

        <header className="shrink-0 border-b border-gray-800 px-5 py-3 flex items-center justify-between bg-[#0F1419]">
          <div className="flex items-center gap-3">
            <Calendar className="text-[#FF6B35]" size={20} />
            <h1 className="text-lg font-bold tracking-tight" style={{ fontFamily: 'Orbitron, sans-serif' }}>
              音乐节舞台排期赛
            </h1>
          </div>
          <div className="flex items-center gap-4 text-xs text-gray-400">
            <span className="flex items-center gap-1">
              <Users size={12} />
              {arrangedArtistIds.length}/{artists.length} 艺人
            </span>
            <span className="flex items-center gap-1">
              <Wrench size={12} />
              {conflicts.length} 冲突
            </span>
            <span className="flex items-center gap-1">
              <Cloud size={12} />
              {activatedWeather.length} 天气
            </span>
          </div>
        </header>

        {(isPaused || isReview) && (
          <div className="shrink-0 px-5 py-2 text-center text-xs font-medium"
            style={{
              background: isPaused ? 'rgba(245,158,11,0.1)' : 'rgba(168,85,247,0.1)',
              color: isPaused ? '#F59E0B' : '#A855F7',
              borderBottom: `1px solid ${isPaused ? 'rgba(245,158,11,0.2)' : 'rgba(168,85,247,0.2)'}`,
            }}
          >
            {isPaused ? '⏸ 游戏已暂停 — 拖拽和操作已锁定' : '🔍 复盘模式 — 拖拽下方滑块查看历史状态'}
          </div>
        )}

        <div className="flex-1 flex min-h-0">
          <aside className="w-64 shrink-0 border-r border-gray-800 bg-[#0F1419] flex flex-col">
            <div className="px-3 py-2 border-b border-gray-800">
              <h2 className="text-xs font-bold text-gray-400 tracking-wider">艺人卡片池</h2>
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-2">
              {artists.map((artist) => (
                <ArtistCard
                  key={artist.id}
                  artist={artist}
                  isArranged={arrangedArtistIds.includes(artist.id)}
                />
              ))}
            </div>

            <div className="border-t border-gray-800 p-3">
              <h3 className="text-xs font-bold text-gray-400 mb-2">舞台设备参考</h3>
              {stages.map((stage) => (
                <div key={stage.id} className="mb-2">
                  <div className="text-[10px] text-gray-500">{stage.name}（换场{stage.changeoverTime}分钟）</div>
                  <div className="flex flex-wrap gap-1 mt-0.5">
                    {stage.equipment.map((eq) => (
                      <span key={eq} className="text-[9px] px-1.5 py-0.5 rounded bg-white/5 text-gray-400">
                        {eq}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </aside>

          <main className="flex-1 flex flex-col min-w-0">
            <div className="flex-1 flex min-h-0">
              <div className="flex-1 min-w-0 p-4 overflow-auto">
                <Timeline />
              </div>

              <aside className="w-80 shrink-0 border-l border-gray-800 bg-[#0F1419] flex flex-col">
                <div className="flex-1 overflow-y-auto p-3">
                  <ConflictPanel />
                </div>
                <div className="border-t border-gray-800">
                  <HeatPanel />
                </div>
              </aside>
            </div>

            {isReview && <ReviewSlider />}
            <GameControls />
          </main>
        </div>

        <DragOverlay dropAnimation={null}>
          {dragArtist && <ArtistCardOverlay artist={dragArtist} />}
        </DragOverlay>
      </div>
    </DndContext>
  );
}
