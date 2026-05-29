import React from 'react';
import { Snowflake, ThermometerSun, Package, MapPin, Clock } from 'lucide-react';
import type { CargoBox } from '../../data/types';
import { getZoneColorClass, getZoneBorderClass } from '../../utils/zoneValidator';
import { getZoneLabel } from '../../data/levels';
import { useGameStore } from '../../store/gameStore';
import { cn } from '@/lib/utils';

interface CargoBoxItemProps {
  cargoBox: CargoBox;
  isDraggable?: boolean;
  onDragStart?: (e: React.DragEvent, cargoBox: CargoBox) => void;
  onDragEnd?: () => void;
  compact?: boolean;
}

const CargoBoxItem: React.FC<CargoBoxItemProps> = ({
  cargoBox,
  isDraggable = true,
  onDragStart,
  onDragEnd,
  compact = false,
}) => {
  const { isCargoBoxPlaced, draggedCargoBox } = useGameStore();
  const isPlaced = isCargoBoxPlaced(cargoBox.id);
  const isDragging = draggedCargoBox?.id === cargoBox.id;

  const ZoneIcon = {
    frozen: Snowflake,
    chilled: ThermometerSun,
    normal: Package,
  }[cargoBox.temperatureZone];

  const handleDragStart = (e: React.DragEvent) => {
    if (!isDraggable || isPlaced) {
      e.preventDefault();
      return;
    }
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('cargoBoxId', cargoBox.id);
    onDragStart?.(e, cargoBox);
  };

  if (compact) {
    return (
      <div
        className={cn(
          'p-2 rounded border-2 text-xs',
          getZoneBorderClass(cargoBox.temperatureZone),
          'bg-cold-chain-panel/80'
        )}
      >
        <div className="font-mono truncate">{cargoBox.originalName}</div>
      </div>
    );
  }

  return (
    <div
      draggable={isDraggable && !isPlaced}
      onDragStart={handleDragStart}
      onDragEnd={onDragEnd}
      className={cn(
        'relative p-4 rounded-lg border-2 transition-all duration-200 cursor-grab active:cursor-grabbing',
        'bg-cold-chain-panel/90 backdrop-blur-sm',
        getZoneBorderClass(cargoBox.temperatureZone),
        isPlaced && 'opacity-40 cursor-not-allowed',
        isDragging && 'opacity-50 scale-95',
        !isPlaced && !isDragging && 'hover:shadow-lg hover:scale-[1.02] hover:border-cold-chain-primary',
        !isDraggable && 'cursor-default'
      )}
    >
      <div className="absolute top-2 right-2">
        <span className={cn(
          'px-2 py-0.5 rounded text-xs font-bold text-white',
          getZoneColorClass(cargoBox.temperatureZone)
        )}>
          <ZoneIcon className="w-3 h-3 inline mr-1" />
          {getZoneLabel(cargoBox.temperatureZone)}
        </span>
      </div>

      <div className="pr-20 mb-2">
        <h4 className="font-mono font-bold text-sm text-white leading-tight">
          {cargoBox.originalName}
        </h4>
      </div>

      <div className="space-y-1 text-xs text-gray-400 font-mono">
        <div className="flex items-center gap-1">
          <Package className="w-3 h-3" />
          <span>{cargoBox.originalWeight}</span>
        </div>
        <div className="flex items-center gap-1">
          <MapPin className="w-3 h-3" />
          <span className="truncate">{cargoBox.destination}</span>
        </div>
        <div className="flex items-center gap-1">
          <Clock className="w-3 h-3" />
          <span>第{cargoBox.deliveryOrder}站卸货</span>
        </div>
      </div>

      {cargoBox.originalNotes && (
        <div className="mt-2 pt-2 border-t border-cold-chain-border/50">
          <p className="text-xs text-cold-chain-warning font-mono">
            ⚠️ {cargoBox.originalNotes}
          </p>
        </div>
      )}

      {isPlaced && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-lg">
          <span className="text-white font-bold text-sm">已放置</span>
        </div>
      )}
    </div>
  );
};

export default CargoBoxItem;
