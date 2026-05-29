import { useDraggable } from '@dnd-kit/core';
import type { Artist } from '../../types';
import { GripVertical, Clock, Flame, Music } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ArtistCardProps {
  artist: Artist;
  isArranged: boolean;
}

export default function ArtistCard({ artist, isArranged }: ArtistCardProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `artist-${artist.id}`,
    disabled: isArranged,
  });

  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'group relative flex items-stretch gap-3 rounded-lg border border-white/5 bg-[#1A1F2E] p-3 shadow-md transition-all duration-200',
        isArranged && 'opacity-40 pointer-events-none',
        isDragging && 'border-[#FF6B35] shadow-[0_0_16px_rgba(255,107,53,0.5)]',
        !isArranged && !isDragging && 'hover:border-white/15 hover:shadow-[0_0_12px_rgba(255,255,255,0.06)]'
      )}
    >
      {!isArranged && (
        <div
          {...listeners}
          {...attributes}
          className="flex cursor-grab items-center text-white/20 transition-colors hover:text-white/50 active:cursor-grabbing"
        >
          <GripVertical size={16} />
        </div>
      )}

      <div className="flex flex-1 flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1.5 text-sm font-semibold text-white">
            <Music size={14} className="text-[#FF6B35]" />
            {artist.name}
          </span>
          <span className="flex items-center gap-1 text-xs text-white/40">
            <Clock size={12} />
            {artist.duration}分钟
          </span>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex flex-wrap gap-1">
            {artist.equipment.map((eq) => (
              <span
                key={eq}
                className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] text-white/60"
              >
                {eq}
              </span>
            ))}
          </div>
          <span className="flex items-center gap-0.5 text-xs text-[#FF6B35]">
            <Flame size={12} />
            {artist.heat}
          </span>
        </div>
      </div>
    </div>
  );
}

export function ArtistCardOverlay({ artist }: { artist: Artist }) {
  return (
    <div className="flex items-center gap-3 rounded-lg border-2 border-[#FF6B35] bg-[#1A1F2E] px-4 py-3 shadow-[0_0_20px_rgba(255,107,53,0.4)]">
      <Music size={14} className="text-[#FF6B35]" />
      <span className="text-sm font-semibold text-white">{artist.name}</span>
      <span className="text-xs text-white/40">{artist.duration}分钟</span>
    </div>
  );
}
