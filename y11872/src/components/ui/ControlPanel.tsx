import { useState } from 'react';
import { Play, Eye, Save, Layers, RotateCcw, EyeOff, Filter } from 'lucide-react';
import { useTheaterStore } from '@/store/theaterStore';
import { ViewMode, SectionType } from '@/types';

const viewModes: { value: ViewMode; label: string }[] = [
  { value: 'perspective', label: '透视' },
  { value: 'top', label: '俯视' },
  { value: 'front', label: '正视' },
  { value: 'side', label: '侧视' },
];

export function ControlPanel() {
  const [versionName, setVersionName] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  
  const viewMode = useTheaterStore((state) => state.viewMode);
  const showRays = useTheaterStore((state) => state.showRays);
  const filters = useTheaterStore((state) => state.filters);
  const detectionRunning = useTheaterStore((state) => state.detectionRunning);
  const obstacles = useTheaterStore((state) => state.obstacles);
  const blockedCount = useTheaterStore((state) => state.getBlockedSeats()).length;
  const totalSeats = useTheaterStore((state) => state.seats.length);
  
  const setViewMode = useTheaterStore((state) => state.setViewMode);
  const toggleShowRays = useTheaterStore((state) => state.toggleShowRays);
  const runDetection = useTheaterStore((state) => state.runDetection);
  const saveVersion = useTheaterStore((state) => state.saveVersion);
  const setFilters = useTheaterStore((state) => state.setFilters);
  const toggleObstacle = useTheaterStore((state) => state.toggleObstacle);

  const handleSave = () => {
    const name = versionName || `版本 ${new Date().toLocaleString('zh-CN')}`;
    saveVersion(name);
    setVersionName('');
  };

  return (
    <div className="bg-theater-dark border border-gray-700 rounded-lg p-4 space-y-4">
      <h3 className="text-theater-gold font-display text-lg font-semibold flex items-center gap-2">
        <Layers size={18} />
        控制面板
      </h3>

      <div className="space-y-2">
        <label className="text-gray-400 text-sm">视角切换</label>
        <div className="grid grid-cols-4 gap-1">
          {viewModes.map((mode) => (
            <button
              key={mode.value}
              onClick={() => setViewMode(mode.value)}
              className={`px-2 py-1.5 text-xs rounded transition-all ${
                viewMode === mode.value
                  ? 'bg-theater-gold text-black font-medium'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              {mode.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between">
        <span className="text-gray-400 text-sm">显示视线射线</span>
        <button
          onClick={toggleShowRays}
          className={`p-2 rounded transition-all ${
            showRays ? 'bg-theater-gold text-black' : 'bg-gray-700 text-gray-400'
          }`}
        >
          {showRays ? <Eye size={16} /> : <EyeOff size={16} />}
        </button>
      </div>

      <button
        onClick={runDetection}
        disabled={detectionRunning}
        className="w-full py-2.5 bg-theater-red hover:bg-red-600 disabled:bg-gray-600 text-white rounded-lg flex items-center justify-center gap-2 transition-all font-medium"
      >
        <Play size={18} />
        {detectionRunning ? '检测中...' : '运行视线检测'}
      </button>

      <div className="flex items-center justify-between p-3 bg-gray-800 rounded">
        <span className="text-gray-400 text-sm">受阻座位</span>
        <span className={`font-mono font-bold ${blockedCount > 0 ? 'text-theater-red' : 'text-theater-success'}`}>
          {blockedCount} / {totalSeats}
        </span>
      </div>

      <div className="pt-2 border-t border-gray-700">
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="w-full flex items-center justify-between text-gray-400 hover:text-white transition-colors"
        >
          <span className="flex items-center gap-2">
            <Filter size={16} />
            筛选条件
          </span>
          <span className="text-xs">{showFilters ? '收起' : '展开'}</span>
        </button>
        
        {showFilters && (
          <div className="mt-3 space-y-3">
            <div>
              <label className="text-gray-500 text-xs">区域</label>
              <select
                value={filters.section}
                onChange={(e) => setFilters({ section: e.target.value as SectionType | 'all' })}
                className="w-full mt-1 bg-gray-800 border border-gray-600 rounded px-2 py-1.5 text-sm"
              >
                <option value="all">全部区域</option>
                <option value="orchestra">管弦乐区</option>
                <option value="mezzanine">中层区</option>
                <option value="balcony">阳台区</option>
              </select>
            </div>
            
            <div>
              <label className="text-gray-500 text-xs">视线状态</label>
              <select
                value={filters.visibility}
                onChange={(e) => setFilters({ visibility: e.target.value as any })}
                className="w-full mt-1 bg-gray-800 border border-gray-600 rounded px-2 py-1.5 text-sm"
              >
                <option value="all">全部</option>
                <option value="visible">视线正常</option>
                <option value="partial">部分受阻</option>
                <option value="blocked">视线受阻</option>
              </select>
            </div>

            <div>
              <label className="text-gray-500 text-xs">价格范围</label>
              <div className="flex items-center gap-2 mt-1">
                <input
                  type="number"
                  value={filters.priceRange[0]}
                  onChange={(e) => setFilters({ priceRange: [Number(e.target.value), filters.priceRange[1]] })}
                  className="w-full bg-gray-800 border border-gray-600 rounded px-2 py-1.5 text-sm"
                  placeholder="最低"
                />
                <span className="text-gray-500">-</span>
                <input
                  type="number"
                  value={filters.priceRange[1]}
                  onChange={(e) => setFilters({ priceRange: [filters.priceRange[0], Number(e.target.value)] })}
                  className="w-full bg-gray-800 border border-gray-600 rounded px-2 py-1.5 text-sm"
                  placeholder="最高"
                />
              </div>
            </div>

            <div>
              <label className="text-gray-500 text-xs">搜索座位</label>
              <input
                type="text"
                value={filters.searchText}
                onChange={(e) => setFilters({ searchText: e.target.value })}
                className="w-full mt-1 bg-gray-800 border border-gray-600 rounded px-2 py-1.5 text-sm"
                placeholder="输入排号或座号"
              />
            </div>
          </div>
        )}
      </div>

      <div className="pt-2 border-t border-gray-700">
        <h4 className="text-gray-400 text-sm mb-2">遮挡物</h4>
        <div className="space-y-2">
          {obstacles.map((obstacle) => (
            <label
              key={obstacle.id}
              className="flex items-center gap-2 text-sm cursor-pointer hover:text-white transition-colors"
            >
              <input
                type="checkbox"
                checked={obstacle.visible}
                onChange={() => toggleObstacle(obstacle.id)}
                className="rounded border-gray-600 bg-gray-700 text-theater-gold focus:ring-theater-gold"
              />
              <span className={obstacle.visible ? 'text-white' : 'text-gray-500'}>
                {obstacle.name}
              </span>
            </label>
          ))}
        </div>
      </div>

      <div className="pt-2 border-t border-gray-700 space-y-2">
        <input
          type="text"
          value={versionName}
          onChange={(e) => setVersionName(e.target.value)}
          placeholder="输入版本名称（可选）"
          className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-sm"
        />
        <div className="flex gap-2">
          <button
            onClick={handleSave}
            className="flex-1 py-2 bg-theater-gold hover:bg-yellow-500 text-black rounded-lg flex items-center justify-center gap-2 transition-all font-medium text-sm"
          >
            <Save size={16} />
            保存版本
          </button>
          <button
            onClick={() => setFilters({
              section: 'all',
              visibility: 'all',
              priceRange: [100, 500],
              status: 'all',
              searchText: '',
            })}
            className="p-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-all"
            title="重置筛选"
          >
            <RotateCcw size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
