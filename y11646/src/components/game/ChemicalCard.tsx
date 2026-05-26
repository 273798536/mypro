import React from 'react';
import { Flame, Bomb, Droplets, Skull, Zap, Wind, Snowflake, AlertTriangle, Thermometer, Droplet, Info } from 'lucide-react';
import { Chemical, HazardLevel } from '../../types';
import { RiskEngine } from '../../engine/RiskEngine';

interface ChemicalCardProps {
  chemical: Chemical;
  isSelected: boolean;
  onSelect: () => void;
  onDragStart: (e: React.DragEvent) => void;
  showDetails?: boolean;
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

const hazardLevelColors: Record<HazardLevel, string> = {
  [HazardLevel.LOW]: 'bg-green-500',
  [HazardLevel.MEDIUM]: 'bg-yellow-500',
  [HazardLevel.HIGH]: 'bg-orange-500',
  [HazardLevel.EXTREME]: 'bg-red-600'
};

const hazardLevelLabels: Record<HazardLevel, string> = {
  [HazardLevel.LOW]: '低危',
  [HazardLevel.MEDIUM]: '中危',
  [HazardLevel.HIGH]: '高危',
  [HazardLevel.EXTREME]: '极危'
};

export const ChemicalCard: React.FC<ChemicalCardProps> = ({
  chemical,
  isSelected,
  onSelect,
  onDragStart,
  showDetails = false
}) => {
  const CategoryIcon = iconMap[chemical.icon] || Flame;
  const riskEngine = new RiskEngine([], { id: '', name: '', rows: 0, cols: 0, slots: [], baseTemperature: 0, baseHumidity: 0 });

  return (
    <div
      className={`
        relative p-3 rounded-lg border-2 cursor-grab active:cursor-grabbing
        transition-all duration-200
        ${isSelected ? 'border-blue-400 ring-2 ring-blue-400 bg-gray-700' : 'border-gray-600 bg-gray-800 hover:border-gray-500'}
      `}
      draggable
      onDragStart={onDragStart}
      onClick={onSelect}
    >
      <div className="flex items-start gap-3">
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: chemical.color + '30' }}
        >
          <CategoryIcon size={20} style={{ color: chemical.color }} />
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-white truncate">{chemical.name}</span>
            <span className={`px-1.5 py-0.5 text-[10px] rounded text-white ${hazardLevelColors[chemical.hazardLevel]}`}>
              {hazardLevelLabels[chemical.hazardLevel]}
            </span>
          </div>
          <span className="text-xs text-gray-400">{chemical.formula}</span>
          <div className="text-[10px] text-gray-500 mt-1">
            {riskEngine.getCategoryName(chemical.category)}
          </div>
        </div>
      </div>

      {showDetails && (
        <div className="mt-3 pt-3 border-t border-gray-700 space-y-2">
          <div className="flex items-center gap-4 text-xs text-gray-400">
            <div className="flex items-center gap-1">
              <Thermometer size={12} />
              <span>{chemical.minTemp}°C ~ {chemical.maxTemp}°C</span>
            </div>
            <div className="flex items-center gap-1">
              <Droplet size={12} />
              <span>{chemical.minHumidity}% ~ {chemical.maxHumidity}%</span>
            </div>
          </div>
          
          {chemical.isolationDistance > 0 && (
            <div className="flex items-center gap-1 text-xs text-orange-400">
              <AlertTriangle size={12} />
              <span>需要 {chemical.isolationDistance} 格隔离距离</span>
            </div>
          )}
          
          <div className="flex items-start gap-1 text-xs text-gray-500">
            <Info size={12} className="mt-0.5" />
            <span>{chemical.storageRequirements}</span>
          </div>

          {chemical.incompatibleWith.length > 0 && (
            <div className="text-xs text-red-400">
              <span className="font-medium">禁忌化学品：</span>
              <span>请避免与不相容化学品相邻存放</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
