import { useGameStore } from '@/store/useGameStore';
import { Battery, AlertTriangle } from 'lucide-react';

export function EnergyBar() {
  const energyUsed = useGameStore((state) => state.energyUsed);
  const maxEnergy = useGameStore((state) => state.maxEnergy);
  const remaining = maxEnergy - energyUsed;
  const percentUsed = (energyUsed / maxEnergy) * 100;
  const percentRemaining = 100 - percentUsed;
  
  const isLow = remaining < maxEnergy * 0.2;
  const isCritical = remaining < maxEnergy * 0.1;
  
  const segments = 10;
  const filledSegments = Math.floor(percentRemaining / 10);
  
  return (
    <div className="bg-lab-panel border-2 border-lab-border rounded-lg p-4 w-20">
      <div className="flex flex-col items-center">
        <div className={`mb-2 ${isCritical ? 'animate-pulse' : ''}`}>
          <Battery 
            size={24} 
            className={isCritical ? 'text-neon-red' : isLow ? 'text-neon-orange' : 'text-neon-green'} 
          />
        </div>
        
        <h3 className="font-mono text-xs text-gray-400 mb-3 text-center">
          能量
        </h3>
        
        <div className="flex flex-col gap-1 h-48 w-full">
          {Array.from({ length: segments }).map((_, i) => {
            const segmentIndex = segments - 1 - i;
            const isFilled = segmentIndex < filledSegments;
            const isLastFilled = segmentIndex === filledSegments - 1;
            
            let segmentColor = 'bg-gray-700';
            if (isFilled) {
              if (segmentIndex < 2 || isCritical) {
                segmentColor = isLastFilled && isCritical ? 'bg-neon-red animate-pulse-red' : 'bg-neon-red';
              } else if (segmentIndex < 4 || isLow) {
                segmentColor = 'bg-neon-orange';
              } else {
                segmentColor = 'bg-neon-green';
              }
            }
            
            return (
              <div
                key={i}
                className={`
                  flex-1 rounded-sm border border-lab-border
                  ${segmentColor}
                  ${isFilled ? 'shadow-lg' : ''}
                `}
                style={isFilled ? {
                  boxShadow: segmentColor.includes('red') 
                    ? '0 0 8px rgba(255, 59, 48, 0.5)' 
                    : segmentColor.includes('orange')
                    ? '0 0 8px rgba(255, 149, 0, 0.5)'
                    : '0 0 8px rgba(57, 255, 20, 0.5)'
                } : {}}
              />
            );
          })}
        </div>
        
        <div className="mt-3 text-center">
          <div className={`font-mono text-sm font-bold ${isCritical ? 'text-neon-red animate-pulse' : isLow ? 'text-neon-orange' : 'text-neon-green'}`}>
            {remaining.toFixed(0)}
          </div>
          <div className="font-mono text-xs text-gray-500">
            / {maxEnergy} J
          </div>
        </div>
        
        {isLow && (
          <div className="mt-2 flex items-center gap-1 text-neon-orange animate-pulse">
            <AlertTriangle size={12} />
            <span className="font-mono text-xs">低能量</span>
          </div>
        )}
        
        {isCritical && (
          <div className="mt-2 flex items-center gap-1 text-neon-red animate-pulse">
            <AlertTriangle size={12} />
            <span className="font-mono text-xs">危险</span>
          </div>
        )}
      </div>
    </div>
  );
}
