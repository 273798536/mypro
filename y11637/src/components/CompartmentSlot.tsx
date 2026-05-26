import { useState } from 'react';
import { motion } from 'framer-motion';
import { X, Package } from 'lucide-react';
import type { Compartment, CargoBox, TemperatureZone } from '../types';
import { ZONE_LABELS } from '../types';

interface CompartmentSlotProps {
  compartment: Compartment;
  cargo?: CargoBox;
  onDrop: (compartmentId: string, cargoId: string) => boolean;
  onRemove: (compartmentId: string) => void;
  isDisabled?: boolean;
}

const zoneColors: Record<TemperatureZone, string> = {
  frozen: 'bg-zone-frozen/10 border-zone-frozen',
  chilled: 'bg-zone-chilled/10 border-zone-chilled',
  ambient: 'bg-zone-ambient/10 border-zone-ambient',
};

const zoneLabelColors: Record<TemperatureZone, string> = {
  frozen: 'bg-zone-frozen',
  chilled: 'bg-zone-chilled',
  ambient: 'bg-zone-ambient',
};

export function CompartmentSlot({
  compartment,
  cargo,
  onDrop,
  onRemove,
  isDisabled = false,
}: CompartmentSlotProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [isInvalid, setIsInvalid] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!isDisabled && !compartment.occupiedBy) {
      setIsDragOver(true);
    }
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
    setIsInvalid(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);

    if (isDisabled || compartment.occupiedBy) return;

    const cargoId = e.dataTransfer.getData('cargoId');
    if (!cargoId) return;

    const success = onDrop(compartment.id, cargoId);
    if (!success) {
      setIsInvalid(true);
      setTimeout(() => setIsInvalid(false), 500);
    }
  };

  return (
    <motion.div
      layout
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`relative aspect-[4/3] rounded-xl border-2 border-dashed transition-all duration-200 ${
        zoneColors[compartment.zone]
      } ${
        isDragOver ? 'scale-105 border-solid border-primary-500 bg-primary-50' : ''
      } ${isInvalid ? 'animate-shake border-status-error bg-red-50' : ''} ${
        cargo ? 'border-solid' : ''
      }`}
    >
      {!cargo && (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400">
          <span className={`text-xs px-2 py-0.5 rounded mb-1 ${zoneLabelColors[compartment.zone]} text-white`}>
            {ZONE_LABELS[compartment.zone]}
          </span>
          <span className="text-xs">空置</span>
        </div>
      )}

      {cargo && (
        <div className="absolute inset-0 p-2 flex items-center justify-center">
          <div
            className={`w-full h-full rounded-lg ${zoneLabelColors[cargo.zone]} text-white flex flex-col items-center justify-center p-2`}
          >
            <Package size={20} />
            <span className="text-xs font-medium truncate w-full text-center mt-1">
              {cargo.name}
            </span>
          </div>
          {!isDisabled && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onRemove(compartment.id);
              }}
              className="absolute -top-2 -right-2 p-1 bg-status-error text-white rounded-full shadow-md hover:bg-red-600 transition-colors"
            >
              <X size={12} />
            </button>
          )}
        </div>
      )}
    </motion.div>
  );
}
