import { useState } from 'react';
import { Play, Pause, Plus, Trash2, Save, Eye, EyeOff } from 'lucide-react';
import { useSimulationStore } from '../store/useSimulationStore';
import {
  PHASE_MIN,
  PHASE_MAX,
  FREQ_MIN,
  FREQ_MAX,
  AMP_MIN,
  AMP_MAX,
} from '../utils/wavePhysics';
import type { ViewMode } from '../types';

export function ControlPanel() {
  const sources = useSimulationStore((state) => state.sources);
  const obstacles = useSimulationStore((state) => state.obstacles);
  const simulation = useSimulationStore((state) => state.simulation);
  const viewMode = useSimulationStore((state) => state.viewMode);
  const updateSource = useSimulationStore((state) => state.updateSource);
  const removeSource = useSimulationStore((state) => state.removeSource);
  const addSource = useSimulationStore((state) => state.addSource);
  const addObstacle = useSimulationStore((state) => state.addObstacle);
  const removeObstacle = useSimulationStore((state) => state.removeObstacle);
  const setPlaying = useSimulationStore((state) => state.setPlaying);
  const setSpeed = useSimulationStore((state) => state.setSpeed);
  const setViewMode = useSimulationStore((state) => state.setViewMode);
  const saveBaseline = useSimulationStore((state) => state.saveBaseline);
  const toggleComparison = useSimulationStore((state) => state.toggleComparison);

  const [activeTab, setActiveTab] = useState<'sources' | 'obstacles' | 'settings'>('sources');

  const handleAddSource = () => {
    addSource({
      x: 50,
      y: 50,
      frequency: 2,
      phase: 0,
      amplitude: 1,
      enabled: true,
    });
  };

  const handleAddObstacle = (type: 'rect' | 'circle') => {
    if (type === 'rect') {
      addObstacle({
        type: 'rect',
        x: 50,
        y: 50,
        width: 20,
        height: 5,
        absorption: 0.9,
      });
    } else {
      addObstacle({
        type: 'circle',
        x: 50,
        y: 50,
        radius: 8,
        absorption: 0.9,
      });
    }
  };

  const viewModes: { mode: ViewMode; label: string }[] = [
    { mode: '3d', label: '3D视图' },
    { mode: '2d', label: '2D视图' },
    { mode: 'split', label: '分屏' },
  ];

  return (
    <div className="w-80 bg-gray-900 text-white flex flex-col h-full border-r border-gray-700">
      <div className="p-4 border-b border-gray-700">
        <h1 className="text-lg font-bold text-cyan-400 mb-3">物理波干涉水槽</h1>

        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setPlaying(!simulation.isPlaying)}
            className={`flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded font-medium transition-colors ${
              simulation.isPlaying
                ? 'bg-yellow-600 hover:bg-yellow-700'
                : 'bg-green-600 hover:bg-green-700'
            }`}
          >
            {simulation.isPlaying ? (
              <>
                <Pause size={16} /> 暂停
              </>
            ) : (
              <>
                <Play size={16} /> 播放
              </>
            )}
          </button>
        </div>

        <div className="mb-3">
          <label className="block text-xs text-gray-400 mb-1">播放速度</label>
          <select
            value={simulation.speed}
            onChange={(e) => setSpeed(parseFloat(e.target.value))}
            className="w-full bg-gray-800 border border-gray-600 rounded px-2 py-1 text-sm"
          >
            <option value={0.25}>0.25x</option>
            <option value={0.5}>0.5x</option>
            <option value={1}>1x</option>
            <option value={2}>2x</option>
            <option value={4}>4x</option>
          </select>
        </div>

        <div className="flex gap-1">
          {viewModes.map(({ mode, label }) => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              className={`flex-1 py-1 px-2 rounded text-xs transition-colors ${
                viewMode === mode
                  ? 'bg-cyan-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex border-b border-gray-700">
        {(['sources', 'obstacles', 'settings'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-2 text-sm transition-colors ${
              activeTab === tab
                ? 'border-b-2 border-cyan-400 text-cyan-400'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            {tab === 'sources' && `波源 (${sources.length})`}
            {tab === 'obstacles' && `障碍物 (${obstacles.length})`}
            {tab === 'settings' && '设置'}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {activeTab === 'sources' && (
          <div className="space-y-4">
            <button
              onClick={handleAddSource}
              className="w-full flex items-center justify-center gap-2 py-2 bg-cyan-600 hover:bg-cyan-700 rounded text-sm transition-colors"
            >
              <Plus size={16} /> 添加波源
            </button>

            {sources.map((source) => (
              <div
                key={source.id}
                className={`p-3 rounded border ${
                  source.phase < PHASE_MIN || source.phase > PHASE_MAX
                    ? 'border-red-500 bg-red-900/20'
                    : 'border-gray-600 bg-gray-800'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">
                    波源 {source.id.slice(-4)}
                  </span>
                  <div className="flex gap-1">
                    <button
                      onClick={() =>
                        updateSource(source.id, { enabled: !source.enabled })
                      }
                      className="p-1 rounded hover:bg-gray-700"
                    >
                      {source.enabled ? (
                        <Eye size={14} className="text-green-400" />
                      ) : (
                        <EyeOff size={14} className="text-gray-500" />
                      )}
                    </button>
                    <button
                      onClick={() => removeSource(source.id)}
                      className="p-1 rounded hover:bg-red-900 text-red-400"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">
                      频率: {source.frequency.toFixed(2)} Hz
                    </label>
                    <input
                      type="range"
                      min={FREQ_MIN}
                      max={FREQ_MAX}
                      step={0.1}
                      value={source.frequency}
                      onChange={(e) =>
                        updateSource(source.id, {
                          frequency: parseFloat(e.target.value),
                        })
                      }
                      className="w-full accent-cyan-500"
                    />
                  </div>

                  <div>
                    <label
                      className={`block text-xs mb-1 ${
                        source.phase < PHASE_MIN || source.phase > PHASE_MAX
                          ? 'text-red-400 font-bold'
                          : 'text-gray-400'
                      }`}
                    >
                      相位: {source.phase.toFixed(2)}
                      {(source.phase < PHASE_MIN || source.phase > PHASE_MAX) && (
                        <span className="text-red-400 ml-2">⚠ 越界!</span>
                      )}
                    </label>
                    <input
                      type="range"
                      min={-1}
                      max={10}
                      step={0.1}
                      value={source.phase}
                      onChange={(e) =>
                        updateSource(source.id, {
                          phase: parseFloat(e.target.value),
                        })
                      }
                      className="w-full accent-red-500"
                    />
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>-1.0</span>
                      <span className="text-cyan-400">正常: 0 ~ 2π</span>
                      <span>10.0</span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs text-gray-400 mb-1">
                      振幅: {source.amplitude.toFixed(2)}
                    </label>
                    <input
                      type="range"
                      min={AMP_MIN}
                      max={AMP_MAX}
                      step={0.1}
                      value={source.amplitude}
                      onChange={(e) =>
                        updateSource(source.id, {
                          amplitude: parseFloat(e.target.value),
                        })
                      }
                      className="w-full accent-cyan-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">
                        X: {source.x}
                      </label>
                      <input
                        type="number"
                        min={5}
                        max={95}
                        value={source.x}
                        onChange={(e) =>
                          updateSource(source.id, {
                            x: parseInt(e.target.value) || 50,
                          })
                        }
                        className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">
                        Y: {source.y}
                      </label>
                      <input
                        type="number"
                        min={5}
                        max={95}
                        value={source.y}
                        onChange={(e) =>
                          updateSource(source.id, {
                            y: parseInt(e.target.value) || 50,
                          })
                        }
                        className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1 text-sm"
                      />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'obstacles' && (
          <div className="space-y-4">
            <div className="flex gap-2">
              <button
                onClick={() => handleAddObstacle('rect')}
                className="flex-1 flex items-center justify-center gap-1 py-2 bg-orange-600 hover:bg-orange-700 rounded text-sm transition-colors"
              >
                <Plus size={14} /> 矩形
              </button>
              <button
                onClick={() => handleAddObstacle('circle')}
                className="flex-1 flex items-center justify-center gap-1 py-2 bg-purple-600 hover:bg-purple-700 rounded text-sm transition-colors"
              >
                <Plus size={14} /> 圆形
              </button>
            </div>

            {obstacles.map((obs) => (
              <div
                key={obs.id}
                className="p-3 rounded border border-gray-600 bg-gray-800"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">
                    {obs.type === 'rect' ? '矩形' : '圆形'} {obs.id.slice(-4)}
                  </span>
                  <button
                    onClick={() => removeObstacle(obs.id)}
                    className="p-1 rounded hover:bg-red-900 text-red-400"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-gray-400">位置:</span> ({obs.x}, {obs.y})
                  </div>
                  {obs.type === 'rect' && (
                    <>
                      <div>
                        <span className="text-gray-400">宽:</span> {obs.width}
                      </div>
                      <div>
                        <span className="text-gray-400">高:</span> {obs.height}
                      </div>
                    </>
                  )}
                  {obs.type === 'circle' && (
                    <div>
                      <span className="text-gray-400">半径:</span> {obs.radius}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="space-y-4">
            <div className="p-3 rounded border border-gray-600 bg-gray-800">
              <h3 className="text-sm font-medium mb-2">对比模式</h3>
              <p className="text-xs text-gray-400 mb-3">
                保存当前状态作为基线，之后可对比差异
              </p>
              <div className="flex gap-2">
                <button
                  onClick={saveBaseline}
                  className="flex-1 flex items-center justify-center gap-1 py-2 bg-blue-600 hover:bg-blue-700 rounded text-sm transition-colors"
                >
                  <Save size={14} /> 保存基线
                </button>
                <button
                  onClick={toggleComparison}
                  className={`flex-1 py-2 rounded text-sm transition-colors ${
                    simulation.showComparison
                      ? 'bg-orange-600 hover:bg-orange-700'
                      : 'bg-gray-600 hover:bg-gray-500'
                  }`}
                >
                  {simulation.showComparison ? '隐藏对比' : '显示对比'}
                </button>
              </div>
              {simulation.baselineWaveData && (
                <p className="text-xs text-green-400 mt-2">
                  ✓ 已保存基线数据
                </p>
              )}
            </div>

            <div className="p-3 rounded border border-gray-600 bg-gray-800">
              <h3 className="text-sm font-medium mb-2">时间信息</h3>
              <div className="text-xs text-gray-400 space-y-1">
                <div>模拟时间: {simulation.time.toFixed(2)}s</div>
                <div>网格大小: {simulation.gridSize.width} × {simulation.gridSize.height}</div>
              </div>
            </div>

            <div className="p-3 rounded border border-yellow-600 bg-yellow-900/20">
              <h3 className="text-sm font-medium mb-2 text-yellow-400">测试说明</h3>
              <ul className="text-xs text-gray-300 space-y-1 list-disc pl-4">
                <li>调整波源相位滑块到边界外（小于0或大于2π）可触发越界警告</li>
                <li>添加障碍物后观察波的衍射和反射</li>
                <li>保存基线后修改参数可对比差异</li>
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
