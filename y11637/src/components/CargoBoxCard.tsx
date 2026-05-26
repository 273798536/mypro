import { useState } from 'react';
import { Package } from 'lucide-react';
import type { CargoBox } from '../types';
import { ZONE_LABELS } from '../types';

interface CargoBoxCardProps {
  cargo: CargoBox;
  isDraggable?: boolean;
  onDragStart?: (cargo: CargoBox) => void;
  onDragEnd?: () => void;
  stationName?: string;
}

const zoneColors: Record<string, string> = {
  frozen: 'bg-zone-frozen',
  chilled: 'bg-zone-chilled',
  ambient: 'bg-zone-ambient',
};

const zoneBorderColors: Record<string, string> = {
  frozen: 'border-zone-frozen',
  chilled: 'border-zone-chilled',
  ambient: 'border-zone-ambient',
};

export function CargoBoxCard({
  cargo,
  isDraggable = true,
  onDragStart,
  onDragEnd,
  stationName,
}: CargoBoxCardProps) {
  const [isHovered, setIsHovered] = useState(false);

  const handleDragStart = (e: React.DragEvent) => {
    if (!isDraggable) return;
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('cargoId', cargo.id);
    onDragStart?.(cargo);
  };

  return (
    <div
      draggable={isDraggable}
      onDragStart={handleDragStart}
      onDragEnd={onDragEnd}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`cargo-box card p-3 bg-white border-2 rounded-xl transition-transform duration-200 ${zoneBorderColors[cargo.zone]} ${isDraggable ? 'cursor-grab active:cursor-grabbing' : 'opacity-60'} ${isHovered && isDraggable ? 'scale-105' : ''}`}
    >
      <div className="flex items-start gap-3">
        <div className={`p-2 rounded-lg ${zoneColors[cargo.zone]} text-white`}>
          <Package size={24} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gray-800 truncate">{cargo.name}</p>
          <div className="flex items-center gap-2 mt-1">
            <span className={`text-xs px-2 py-0.5 rounded ${zoneColors[cargo.zone]} text-white`}>
              {ZONE_LABELS[cargo.zone]}
            </span>
            {stationName && (
              <span className="text-xs text-gray-500">
                → {stationName}
              </span>
            )}
          </div>
          <div className="text-xs text-gray-500 mt-1">
            优先级: {cargo.priority}
          </div>
        </div>
      </div>
    </div>
  );
}
