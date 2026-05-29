import React, { useState } from 'react';
import { DoorOpen, X } from 'lucide-react';
import type { Compartment, CargoBox } from '../../data/types';
import { getZoneBgClass, getZoneBorderClass, getZoneColorClass } from '../../utils/zoneValidator';
import { getZoneLabel, getZoneTemperature } from '../../data/levels';
import { useGameStore } from '../../store/gameStore';
import { cn } from '@/lib/utils';
import CargoBoxItem from './CargoBoxItem';

interface CompartmentSlotProps {
  compartment: Compartment;
  onDrop: (cargoBox: CargoBox, compartment: Compartment) => void;
  cargoBoxes: CargoBox[];
}

const CompartmentSlot: React.FC<CompartmentSlotProps> = ({
  compartment,
  onDrop,
  cargoBoxes,
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [highlightType, setHighlightType] = useState<'success' | 'error' | null>(null);

  const { getPlacedCargoInCompartment, removeCargoBox, draggedCargoBox } = useGameStore();
  const placedCargoIds = getPlacedCargoInCompartment(compartment.id);
  const placedCargoBoxes = placedCargoIds
    .map(id => cargoBoxes.find(c => c.id === id))
    .filter(Boolean) as CargoBox[];

  const isFull = placedCargoBoxes.length >= compartment.capacity;

  const canAcceptDrop = draggedCargoBox
    ? draggedCargoBox.temperatureZone === compartment.temperatureZone
    : false;

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (isFull) return;
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);

    if (isFull || !draggedCargoBox) return;

    const isValid = draggedCargoBox.temperatureZone === compartment.temperatureZone;
    setHighlightType(isValid ? 'success' : 'error');

    setTimeout(() => {
      setHighlightType(null);
    }, 600);

    onDrop(draggedCargoBox, compartment);
  };

  const handleRemoveCargo = (e: React.MouseEvent, cargoBoxId: string) => {
    e.stopPropagation();
    removeCargoBox(cargoBoxId);
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={cn(
        'relative p-3 rounded-lg border-2 min-h-[140px] transition-all duration-200',
        getZoneBgClass(compartment.temperatureZone),
        getZoneBorderClass(compartment.temperatureZone),
        isDragOver && !isFull && canAcceptDrop && 'ring-2 ring-cold-chain-success ring-offset-2 ring-offset-cold-chain-dark scale-[1.02]',
        isDragOver && !isFull && !canAcceptDrop && 'ring-2 ring-cold-chain-danger ring-offset-2 ring-offset-cold-chain-dark',
        highlightType === 'success' && 'animate-glow-success',
        highlightType === 'error' && 'animate-glow-danger animate-shake',
        isFull && 'opacity-80'
      )}
    >
      <div className="flex items-center justify-between mb-2">
        <div>
          <div className="flex items-center gap-2">
            <span className={cn(
              'px-2 py-0.5 rounded text-xs font-bold text-white',
              getZoneColorClass(compartment.temperatureZone)
            )}>
              {getZoneLabel(compartment.temperatureZone)}
            </span>
            <span className="text-xs text-gray-400 font-mono">
              {getZoneTemperature(compartment.temperatureZone)}
            </span>
          </div>
          <h4 className="font-mono text-sm text-white mt-1">{compartment.originalName}</h4>
        </div>
        <div className="text-right">
          <div className="flex items-center gap-1 text-xs text-gray-400">
            <DoorOpen className="w-3 h-3" />
            <span>{compartment.originalLocation}</span>
          </div>
          <div className="text-xs font-mono mt-1">
            <span className={placedCargoBoxes.length >= compartment.capacity ? 'text-cold-chain-danger' : 'text-cold-chain-success'}>
              {placedCargoBoxes.length}
            </span>
            <span className="text-gray-500"> / {compartment.capacity}</span>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {placedCargoBoxes.map(cargoBox => (
          <div key={cargoBox.id} className="relative group">
            <CargoBoxItem cargoBox={cargoBox} isDraggable={false} compact />
            <button
              onClick={(e) => handleRemoveCargo(e, cargoBox.id)}
              className="absolute -top-2 -right-2 w-5 h-5 bg-cold-chain-danger rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <X className="w-3 h-3 text-white" />
            </button>
          </div>
        ))}

        {!isFull && placedCargoBoxes.length === 0 && (
          <div className={cn(
            'w-full h-16 border-2 border-dashed rounded-lg flex items-center justify-center transition-colors',
            isDragOver
              ? canAcceptDrop
                ? 'border-cold-chain-success bg-cold-chain-success/10'
                : 'border-cold-chain-danger bg-cold-chain-danger/10'
              : 'border-cold-chain-border/50'
          )}>
            <span className="text-xs text-gray-500 font-mono">
              {isDragOver
                ? canAcceptDrop
                  ? '✓ 可以放置'
                  : '✗ 温层不匹配'
                : '拖拽货箱到此处'}
            </span>
          </div>
        )}

        {!isFull && placedCargoBoxes.length > 0 && placedCargoBoxes.length < compartment.capacity && (
          <div className={cn(
            'w-24 h-16 border-2 border-dashed rounded-lg flex items-center justify-center transition-colors',
            isDragOver
              ? canAcceptDrop
                ? 'border-cold-chain-success bg-cold-chain-success/10'
                : 'border-cold-chain-danger bg-cold-chain-danger/10'
              : 'border-cold-chain-border/50'
          )}>
            <span className="text-xs text-gray-500 font-mono">+1</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default CompartmentSlot;
