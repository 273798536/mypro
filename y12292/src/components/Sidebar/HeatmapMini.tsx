
import { useMemo } from 'react';
import { useDataStore } from '../../store/useDataStore';

interface HeatmapMiniProps {
  floorId: string;
}

export function HeatmapMini({ floorId }: HeatmapMiniProps) {
  const heatmapData = useDataStore(state => state.heatmapData);
  const floors = useDataStore(state => state.floors);
  
  const floor = floors.find(f => f.id === floorId);
  const floorHeatmap = useMemo(() => {
    return heatmapData.filter(h => h.floorId === floorId);
  }, [heatmapData, floorId]);
  
  if (!floor) return null;
  
  const getValueColor = (value: number) => {
    const normalized = Math.min(Math.max(value / 100, 0), 1);
    const hue = (1 - normalized) * 60;
    return `hsl(${hue}, 100%, 50%)`;
  };
  
  const scale = 3;
  const width = floor.width * scale;
  const height = floor.height * scale;
  
  return (
    <div 
      className="relative bg-slate-800 rounded-xl overflow-hidden border border-slate-700"
      style={{ width: '100%', aspectRatio: `${floor.width}/${floor.height}` }}
    >
      {floorHeatmap.map((cell, i) => {
        const x = ((cell.x + floor.width / 2) / floor.width) * 100;
        const y = ((cell.y + floor.height / 2) / floor.height) * 100;
        
        return (
          <div
            key={i}
            className="absolute"
            style={{
              left: `${x}%`,
              top: `${y}%`,
              width: `${(4.5 / floor.width) * 100}%`,
              height: `${(4.5 / floor.height) * 100}%`,
              backgroundColor: getValueColor(cell.value),
              opacity: 0.6 + (cell.value / 100) * 0.4,
              transform: 'translate(-50%, -50%)'
            }}
          />
        );
      })}
      
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="text-center">
          <div className="text-white/60 text-xs font-medium">{floor.name}</div>
        </div>
      </div>
      
      <div className="absolute bottom-2 left-2 right-2 flex items-center gap-1">
        <div className="flex-1 h-1.5 rounded-full bg-gradient-to-r from-red-500 via-yellow-500 to-green-500" />
      </div>
      <div className="absolute bottom-4 left-2 right-2 flex justify-between">
        <span className="text-[8px] text-gray-500">弱信号</span>
        <span className="text-[8px] text-gray-500">强信号</span>
      </div>
    </div>
  );
}

