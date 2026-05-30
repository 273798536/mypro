import React from 'react';
import { Users, Move } from 'lucide-react';
import { useStageStore } from '@/store/useStageStore';
import { cn } from '@/utils/cn';

export const MusicianEditor: React.FC = () => {
  const {
    currentVersion,
    selectedMusician,
    setSelectedMusician,
    updateMusicianPosition,
  } = useStageStore();

  const musicians = currentVersion?.stage.musicians || [];
  const selected = musicians.find((m) => m.id === selectedMusician);

  const handlePositionChange = (axis: 'x' | 'z', value: number) => {
    if (!selected) return;
    const newX = axis === 'x' ? value : selected.x;
    const newZ = axis === 'z' ? value : selected.z;
    updateMusicianPosition(selected.id, newX, newZ);
  };

  return (
    <div className="p-4">
      <h3 className="text-sm font-bold text-gray-300 mb-3 flex items-center gap-2">
        <Users size={16} />
        乐手位置
      </h3>

      <div className="space-y-2 mb-4 max-h-40 overflow-y-auto pr-1">
        {musicians.map((musician) => (
          <div
            key={musician.id}
            onClick={() => setSelectedMusician(musician.id)}
            className={cn(
              'flex items-center gap-2 p-2 rounded cursor-pointer transition-all',
              selectedMusician === musician.id
                ? 'bg-[#e94560]/20 border border-[#e94560]'
                : 'bg-gray-800 hover:bg-gray-750 border border-transparent'
            )}
          >
            <div
              className="w-3 h-3 rounded-full flex-shrink-0"
              style={{ backgroundColor: musician.color }}
            />
            <div className="flex-1 min-w-0">
              <div className="text-xs font-medium text-gray-200 truncate">
                {musician.name}
              </div>
              <div className="text-xs text-gray-500">{musician.instrument}</div>
            </div>
            <Move size={12} className="text-gray-500" />
          </div>
        ))}
      </div>

      {selected && (
        <div className="p-3 bg-gray-800 rounded border border-gray-700">
          <div className="text-xs font-medium text-gray-300 mb-2">
            调整位置 - {selected.name}
          </div>
          <div className="space-y-2">
            <div>
              <label className="text-xs text-gray-500 block mb-1">
                X 轴: {selected.x.toFixed(2)}m
              </label>
              <input
                type="range"
                min="-5"
                max="5"
                step="0.1"
                value={selected.x}
                onChange={(e) => handlePositionChange('x', parseFloat(e.target.value))}
                className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-[#e94560]"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">
                Z 轴: {selected.z.toFixed(2)}m
              </label>
              <input
                type="range"
                min="-3.5"
                max="3.5"
                step="0.1"
                value={selected.z}
                onChange={(e) => handlePositionChange('z', parseFloat(e.target.value))}
                className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-[#e94560]"
              />
            </div>
          </div>
          <p className="text-xs text-gray-600 mt-2">
            💡 也可直接在3D视图中拖拽乐手
          </p>
        </div>
      )}
    </div>
  );
};
