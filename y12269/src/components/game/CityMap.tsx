import { useGameStore } from '../../store/gameStore';
import { CityAreaCard } from './CityAreaCard';
import { soundSources } from '../../data/soundSources';
import { calculateAllAreasDecibels } from '../../utils/decibel';

interface CityMapProps {
  highlightedArea?: string;
}

export function CityMap({ highlightedArea }: CityMapProps) {
  const { areas, placedSources, currentPeriod, residentMood, placeSource } = useGameStore();

  const calculations = calculateAllAreasDecibels(
    areas,
    placedSources,
    soundSources,
    currentPeriod
  );

  const handlePlaceSource = (areaId: string, sourceId: string) => {
    placeSource(sourceId, areaId);
  };

  const getAreaSources = (areaId: string) => {
    return placedSources.filter((ps) => ps.areaId === areaId && ps.isActive);
  };

  const gridStyle = {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gridTemplateRows: 'repeat(3, 1fr)',
    gap: '12px',
  };

  return (
    <div className="bg-white rounded-2xl shadow-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-gray-800">🏙️ 城市声环境地图</h3>
        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1">
            <span className="w-3 h-3 rounded bg-blue-200 border border-blue-300"></span>
            <span className="text-gray-600">居民区</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-3 h-3 rounded bg-yellow-200 border border-yellow-300"></span>
            <span className="text-gray-600">商业区</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-3 h-3 rounded bg-gray-200 border border-gray-400"></span>
            <span className="text-gray-600">工业区</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-3 h-3 rounded bg-green-200 border border-green-300"></span>
            <span className="text-gray-600">公园</span>
          </div>
        </div>
      </div>

      <div style={gridStyle} className="min-h-96">
        {areas.map((area) => (
          <CityAreaCard
            key={area.id}
            area={area}
            placedSources={getAreaSources(area.id)}
            currentDb={calculations[area.id]?.correctValue || 0}
            currentPeriod={currentPeriod}
            mood={residentMood[area.id] || 50}
            onDrop={(sourceId) => handlePlaceSource(area.id, sourceId)}
            isHighlighted={highlightedArea === area.id}
          />
        ))}
      </div>
    </div>
  );
}
