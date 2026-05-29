import { useStore } from '@/store/useStore';
import { interpolateCapacity } from '@/utils/waterLevel';
import {
  Droplets,
  Eye,
  EyeOff,
  Mountain,
  ChevronLeft,
  ChevronRight,
  Plus,
  Trash2,
} from 'lucide-react';
import { useState, useCallback } from 'react';

export default function ControlPanel() {
  const terrain = useStore((s) => s.terrain);
  const waterLevel = useStore((s) => s.waterLevel);
  const setWaterLevel = useStore((s) => s.setWaterLevel);
  const showContourLines = useStore((s) => s.showContourLines);
  const showSubmergedArea = useStore((s) => s.showSubmergedArea);
  const showSpillways = useStore((s) => s.showSpillways);
  const toggleContourLines = useStore((s) => s.toggleContourLines);
  const toggleSubmergedArea = useStore((s) => s.toggleSubmergedArea);
  const toggleSpillways = useStore((s) => s.toggleSpillways);
  const collapsed = useStore((s) => s.leftPanelCollapsed);
  const togglePanel = useStore((s) => s.toggleLeftPanel);
  const addVillage = useStore((s) => s.addVillage);
  const capacityCurve = useStore((s) => s.capacityCurve);
  const validationResults = useStore((s) => s.validationResults);

  const [newVillageName, setNewVillageName] = useState('');
  const [newVillageX, setNewVillageX] = useState('');
  const [newVillageY, setNewVillageY] = useState('');
  const [newVillageElev, setNewVillageElev] = useState('');

  const interpResult = terrain
    ? interpolateCapacity(capacityCurve, waterLevel)
    : null;

  const handleAddVillage = useCallback(() => {
    if (!newVillageName || !newVillageX || !newVillageY || !newVillageElev) return;
    addVillage({
      id: `v-${Date.now()}`,
      name: newVillageName,
      x: parseFloat(newVillageX),
      y: parseFloat(newVillageY),
      elevation: parseFloat(newVillageElev),
      population: 0,
      riskLevel: 'low',
      createdAt: new Date().toISOString(),
    });
    setNewVillageName('');
    setNewVillageX('');
    setNewVillageY('');
    setNewVillageElev('');
  }, [newVillageName, newVillageX, newVillageY, newVillageElev, addVillage]);

  if (collapsed) {
    return (
      <div className="absolute left-0 top-0 h-full w-10 bg-gray-900/80 backdrop-blur-md flex items-center justify-center cursor-pointer border-r border-cyan-900/30 z-20"
        onClick={togglePanel}>
        <ChevronRight className="w-4 h-4 text-cyan-400" />
      </div>
    );
  }

  return (
    <div className="absolute left-0 top-0 h-full w-72 bg-gray-900/90 backdrop-blur-md border-r border-cyan-900/30 z-20 overflow-y-auto">
      <div className="flex items-center justify-between p-3 border-b border-cyan-900/30">
        <h2 className="text-cyan-300 font-bold text-sm flex items-center gap-2">
          <Mountain className="w-4 h-4" /> 控制面板
        </h2>
        <button onClick={togglePanel} className="text-gray-400 hover:text-white transition-colors">
          <ChevronLeft className="w-4 h-4" />
        </button>
      </div>

      <div className="p-3 space-y-4">
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-gray-300 text-xs font-medium flex items-center gap-1">
              <Droplets className="w-3 h-3 text-cyan-400" /> 水位
            </label>
            <span className="text-cyan-300 text-sm font-mono font-bold">{waterLevel}m</span>
          </div>
          <input
            type="range"
            min={terrain?.minElevation ?? 0}
            max={terrain?.maxElevation ?? 300}
            step={1}
            value={waterLevel}
            onChange={(e) => setWaterLevel(Number(e.target.value))}
            className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"
          />
          <div className="flex justify-between text-[10px] text-gray-500 mt-1">
            <span>{terrain?.minElevation ?? 0}m</span>
            <span>{terrain?.maxElevation ?? 300}m</span>
          </div>
        </div>

        {interpResult && (
          <div className={`p-2 rounded text-xs ${interpResult.confidence === 'low' ? 'bg-red-900/40 border border-red-700/50' : interpResult.confidence === 'medium' ? 'bg-yellow-900/40 border border-yellow-700/50' : 'bg-cyan-900/30 border border-cyan-700/40'}`}>
            <div className="text-gray-300 font-medium">库容插值</div>
            <div className="text-white font-mono">{interpResult.value.toFixed(1)} 万m³</div>
            <div className="text-gray-400 mt-1">{interpResult.method}</div>
            <div className={`mt-1 text-[10px] ${interpResult.confidence === 'low' ? 'text-red-400' : interpResult.confidence === 'medium' ? 'text-yellow-400' : 'text-green-400'}`}>
              可信度: {interpResult.confidence === 'high' ? '高' : interpResult.confidence === 'medium' ? '中' : '低'}
            </div>
          </div>
        )}

        <div className="space-y-2">
          <h3 className="text-gray-400 text-xs font-medium">图层显示</h3>
          {[
            { label: '等高线', value: showContourLines, toggle: toggleContourLines },
            { label: '淹没区域', value: showSubmergedArea, toggle: toggleSubmergedArea },
            { label: '泄洪口', value: showSpillways, toggle: toggleSpillways },
          ].map((item) => (
            <button
              key={item.label}
              onClick={item.toggle}
              className="flex items-center gap-2 w-full px-2 py-1.5 rounded text-xs hover:bg-gray-800 transition-colors"
            >
              {item.value ? (
                <Eye className="w-3 h-3 text-cyan-400" />
              ) : (
                <EyeOff className="w-3 h-3 text-gray-600" />
              )}
              <span className={item.value ? 'text-gray-200' : 'text-gray-500'}>{item.label}</span>
            </button>
          ))}
        </div>

        <div className="space-y-2">
          <h3 className="text-gray-400 text-xs font-medium flex items-center gap-1">
            <Plus className="w-3 h-3" /> 补录村庄点
          </h3>
          <input
            type="text"
            placeholder="村庄名称"
            value={newVillageName}
            onChange={(e) => setNewVillageName(e.target.value)}
            className="w-full px-2 py-1 bg-gray-800 border border-gray-700 rounded text-xs text-gray-200 focus:border-cyan-500 focus:outline-none"
          />
          <div className="grid grid-cols-3 gap-1">
            <input
              type="number"
              placeholder="X"
              value={newVillageX}
              onChange={(e) => setNewVillageX(e.target.value)}
              className="px-2 py-1 bg-gray-800 border border-gray-700 rounded text-xs text-gray-200 focus:border-cyan-500 focus:outline-none"
            />
            <input
              type="number"
              placeholder="Y"
              value={newVillageY}
              onChange={(e) => setNewVillageY(e.target.value)}
              className="px-2 py-1 bg-gray-800 border border-gray-700 rounded text-xs text-gray-200 focus:border-cyan-500 focus:outline-none"
            />
            <input
              type="number"
              placeholder="高程m"
              value={newVillageElev}
              onChange={(e) => setNewVillageElev(e.target.value)}
              className="px-2 py-1 bg-gray-800 border border-gray-700 rounded text-xs text-gray-200 focus:border-cyan-500 focus:outline-none"
            />
          </div>
          <button
            onClick={handleAddVillage}
            disabled={!newVillageName || !newVillageX || !newVillageY || !newVillageElev}
            className="w-full py-1.5 bg-cyan-700 hover:bg-cyan-600 disabled:bg-gray-700 disabled:text-gray-500 text-white text-xs rounded transition-colors"
          >
            添加村庄
          </button>
        </div>

        {terrain && (
          <div className="text-[10px] text-gray-500 space-y-1 border-t border-gray-800 pt-2">
            <div>地形: {terrain.name}</div>
            <div>网格: {terrain.gridSize.width}×{terrain.gridSize.height} | 单元: {terrain.cellSize}m</div>
            <div>高程范围: {terrain.minElevation}m ~ {terrain.maxElevation}m | 单位: {terrain.unit}</div>
          </div>
        )}
      </div>
    </div>
  );
}
