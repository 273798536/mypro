import React, { useState, useMemo } from 'react';
import { Shelf, Chemical, RiskEvent, ShelfSlot } from '../../types';
import { ShelfSlotComponent } from './ShelfSlot';
import { useGameStore } from '../../store/gameStore';

interface ShelfGridProps {
  shelf: Shelf;
  chemicals: Chemical[];
  onSlotClick: (slot: ShelfSlot) => void;
  onChemicalPlace: (chemicalId: string, slotId: string) => void;
}

export const ShelfGrid: React.FC<ShelfGridProps> = ({
  shelf,
  chemicals,
  onSlotClick,
  onChemicalPlace
}) => {
  const [dragOverSlot, setDragOverSlot] = useState<string | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const getCurrentRisks = useGameStore(state => state.getCurrentRisks);
  const getChemicalById = useGameStore(state => state.getChemicalById);

  const allRisks = useMemo(() => getCurrentRisks(), [shelf.slots, getCurrentRisks]);

  const getRisksForSlot = (slotId: string): RiskEvent[] => {
    return allRisks.filter(r => r.slotIds.includes(slotId));
  };

  const handleDragOver = (e: React.DragEvent, slotId: string) => {
    e.preventDefault();
    setDragOverSlot(slotId);
  };

  const handleDragLeave = () => {
    setDragOverSlot(null);
  };

  const handleDrop = (e: React.DragEvent, slotId: string) => {
    e.preventDefault();
    setDragOverSlot(null);
    
    const chemicalId = e.dataTransfer.getData('chemicalId');
    if (chemicalId) {
      onChemicalPlace(chemicalId, slotId);
    }
  };

  const handleSlotSelect = (slot: ShelfSlot) => {
    setSelectedSlot(selectedSlot === slot.id ? null : slot.id);
    onSlotClick(slot);
  };

  const gridStyle = {
    gridTemplateColumns: `repeat(${shelf.cols}, minmax(0, 1fr))`,
    gridTemplateRows: `repeat(${shelf.rows}, minmax(0, 1fr))`
  };

  return (
    <div className="bg-gray-900 rounded-xl p-4 border border-gray-700">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white">{shelf.name}</h3>
        <div className="flex items-center gap-4 text-sm text-gray-400">
          <span>基准温度: {shelf.baseTemperature}°C</span>
          <span>基准湿度: {shelf.baseHumidity}%</span>
        </div>
      </div>
      
      <div 
        className="grid gap-2"
        style={gridStyle}
      >
        {shelf.slots.map(slot => {
          const chemical = slot.chemicalId ? getChemicalById(slot.chemicalId) : undefined;
          const slotRisks = getRisksForSlot(slot.id);
          
          return (
            <ShelfSlotComponent
              key={slot.id}
              slot={slot}
              chemical={chemical}
              risks={slotRisks}
              isSelected={selectedSlot === slot.id}
              isDragOver={dragOverSlot === slot.id}
              isHighlighted={false}
              onSelect={() => handleSlotSelect(slot)}
              onDragOver={(e) => handleDragOver(e, slot.id)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, slot.id)}
            />
          );
        })}
      </div>
    </div>
  );
};
