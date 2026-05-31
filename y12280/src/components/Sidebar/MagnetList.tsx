import { useState } from 'react';
import { Plus, Trash2, RotateCcw, GripVertical, Magnet } from 'lucide-react';
import { useMagneticStore } from '@/store/magneticStore';

export function MagnetList() {
  const {
    magnets,
    selectedMagnetId,
    addMagnet,
    removeMagnet,
    selectMagnet,
    reversePoleDirection,
    updateMagnet
  } = useMagneticStore();

  const [newMagnetName, setNewMagnetName] = useState('');

  const handleAddMagnet = () => {
    const name = newMagnetName.trim() || `磁体 ${magnets.length + 1}`;
    addMagnet({
      name,
      position: { x: Math.random() * 4 - 2, y: 0, z: Math.random() * 4 - 2 },
      poleDirection: { x: 1, y: 0, z: 0 },
      strength: 1000,
      type: 'bar'
    });
    setNewMagnetName('');
  };

  const handleStrengthChange = (id: string, value: number) => {
    updateMagnet(id, { strength: value });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-cyan-400 flex items-center gap-2">
          <Magnet size={16} />
          磁体列表
        </h3>
        <span className="text-xs text-gray-500">
          {magnets.length} 个磁体
        </span>
      </div>

      <div className="flex gap-2">
        <input
          type="text"
          value={newMagnetName}
          onChange={(e) => setNewMagnetName(e.target.value)}
          placeholder="新磁体名称"
          className="flex-1 px-3 py-2 bg-gray-800/50 border border-gray-700 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500 transition-colors"
          onKeyPress={(e) => e.key === 'Enter' && handleAddMagnet()}
        />
        <button
          onClick={handleAddMagnet}
          className="px-3 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg transition-colors flex items-center gap-1"
        >
          <Plus size={16} />
        </button>
      </div>

      <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
        {magnets.map((magnet) => (
          <div
            key={magnet.id}
            onClick={() => selectMagnet(magnet.id)}
            className={`p-3 rounded-lg cursor-pointer transition-all ${
              selectedMagnetId === magnet.id
                ? 'bg-cyan-900/40 border border-cyan-500/50'
                : 'bg-gray-800/30 border border-gray-700/50 hover:bg-gray-700/30'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <GripVertical size={14} className="text-gray-500" />
                <span className="text-sm font-medium text-white">
                  {magnet.name}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    reversePoleDirection(magnet.id);
                  }}
                  className="p-1.5 hover:bg-gray-700 rounded text-gray-400 hover:text-yellow-400 transition-colors"
                  title="反向磁极"
                >
                  <RotateCcw size={14} />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    removeMagnet(magnet.id);
                  }}
                  className="p-1.5 hover:bg-gray-700 rounded text-gray-400 hover:text-red-400 transition-colors"
                  title="删除磁体"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-400">强度</span>
                <span className="text-cyan-400">{magnet.strength}</span>
              </div>
              <input
                type="range"
                min="100"
                max="5000"
                value={magnet.strength}
                onClick={(e) => e.stopPropagation()}
                onChange={(e) => handleStrengthChange(magnet.id, Number(e.target.value))}
                className="w-full h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"
              />
            </div>

            <div className="mt-2 pt-2 border-t border-gray-700/50 flex items-center justify-between text-xs text-gray-500">
              <span>位置: ({magnet.position.x.toFixed(1)}, {magnet.position.y.toFixed(1)}, {magnet.position.z.toFixed(1)})</span>
              <span className="text-[10px] bg-gray-700/50 px-1.5 py-0.5 rounded">
                v{magnet.version}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
