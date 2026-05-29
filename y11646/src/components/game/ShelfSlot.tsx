import React from 'react';
import { Flame, Bomb, Droplets, Skull, Zap, Wind, Snowflake, AlertTriangle, Thermometer, Droplet } from 'lucide-react';
import { ShelfSlot, Chemical, RiskEvent } from '../../types';
import { RiskEngine } from '../../engine/RiskEngine';

interface ShelfSlotProps {
  slot: ShelfSlot;
  chemical?: Chemical;
  risks: RiskEvent[];
  isSelected: boolean;
  isDragOver: boolean;
  isHighlighted: boolean;
  onSelect: () => void;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: () => void;
  onDrop: (e: React.DragEvent) => void;
}

const iconMap: Record<string, React.ElementType> = {
  Flame,
  Bomb,
  Droplets,
  Skull,
  Zap,
  Wind,
  Snowflake
};

export const ShelfSlotComponent: React.FC<ShelfSlotProps> = ({
  slot,
  chemical,
  risks,
  isSelected,
  isDragOver,
  isHighlighted,
  onSelect,
  onDragOver,
  onDragLeave,
  onDrop
}) => {
  const hasRisk = risks.length > 0;
  const criticalRisk = risks.some(r => r.severity === 'critical');
  const dangerRisk = risks.some(r => r.severity === 'danger');

  const getBorderColor = () => {
    if (isDragOver) return 'border-green-400 ring-2 ring-green-400';
    if (isSelected) return 'border-blue-400 ring-2 ring-blue-400';
    if (criticalRisk) return 'border-red-600 ring-2 ring-red-500';
    if (dangerRisk) return 'border-orange-500 ring-2 ring-orange-400';
    if (hasRisk) return 'border-yellow-500';
    if (isHighlighted) return 'border-green-500';
    return 'border-gray-600';
  };

  const getBgColor = () => {
    if (isDragOver) return 'bg-green-900/30';
    if (isSelected) return 'bg-blue-900/30';
    if (chemical) return 'bg-gray-700/80';
    return 'bg-gray-800/50';
  };

  const CategoryIcon = chemical ? iconMap[chemical.icon] || Flame : null;

  const riskEngine = new RiskEngine([], { id: '', name: '', rows: 0, cols: 0, slots: [], baseTemperature: 0, baseHumidity: 0 });

  return (
    <div
      className={`
        relative w-full aspect-square rounded-lg border-2 cursor-pointer
        transition-all duration-200 flex flex-col items-center justify-center p-1
        ${getBorderColor()} ${getBgColor()}
        hover:border-gray-500
        ${criticalRisk ? 'animate-pulse' : ''}
      `}
      onClick={onSelect}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      title={slot.allowedCategories.length > 0 ? `允许存放: ${slot.allowedCategories.map(c => riskEngine.getCategoryName(c)).join('、')}` : undefined}
    >
      {chemical ? (
        <>
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center mb-1"
            style={{ backgroundColor: chemical.color + '30' }}
          >
            {CategoryIcon && <CategoryIcon size={20} style={{ color: chemical.color }} />}
          </div>
          <span className="text-xs font-medium text-white truncate w-full text-center">
            {chemical.name}
          </span>
          <span className="text-[10px] text-gray-400 truncate w-full text-center">
            {chemical.formula}
          </span>
        </>
      ) : (
        <div className="text-gray-500 text-xs text-center">
          <span className="block text-lg">+</span>
          <span>空位</span>
        </div>
      )}

      {hasRisk && (
        <div className="absolute -top-1 -right-1">
          <AlertTriangle
            size={16}
            className={criticalRisk ? 'text-red-500' : dangerRisk ? 'text-orange-500' : 'text-yellow-500'}
          />
        </div>
      )}

      <div className="absolute bottom-1 left-1 flex gap-1">
        <div className="flex items-center text-[10px] text-gray-400">
          <Thermometer size={10} />
          <span>{slot.temperature}°</span>
        </div>
        <div className="flex items-center text-[10px] text-gray-400">
          <Droplet size={10} />
          <span>{slot.humidity}%</span>
        </div>
      </div>

      <div className="absolute top-1 left-1 text-[9px] text-gray-500">
        {slot.row + 1}-{slot.col + 1}
      </div>
    </div>
  );
};
