import { useState, useCallback } from 'react';
import { Settings, Building2, Wind, AlertTriangle, Save, CheckCircle } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { cn } from '../../utils/cn';

type TabType = 'building' | 'wind' | 'remarks';

const tabConfigs: { key: TabType; label: string; icon: React.ElementType }[] = [
  { key: 'building', label: '建筑参数', icon: Building2 },
  { key: 'wind', label: '风向参数', icon: Wind },
  { key: 'remarks', label: '备注记录', icon: AlertTriangle },
];

export function RightPanel() {
  const [activeTab, setActiveTab] = useState<TabType>('building');
  const selectedEntity = useAppStore((state) => state.selectedEntity);
  const buildings = useAppStore((state) => state.buildings);
  const updateBuilding = useAppStore((state) => state.updateBuilding);
  const addBuildingRemark = useAppStore((state) => state.addBuildingRemark);
  const saveRemarksToStorage = useAppStore((state) => state.saveRemarksToStorage);
  const windData = useAppStore((state) => state.windData);
  const timePeriod = useAppStore((state) => state.timePeriod);

  const [saveFeedback, setSaveFeedback] = useState(false);

  const handleSaveRemark = useCallback(() => {
    saveRemarksToStorage();
    setSaveFeedback(true);
    setTimeout(() => setSaveFeedback(false), 2000);
  }, [saveRemarksToStorage]);

  const selectedBuilding = buildings.find((b) => b.id === selectedEntity);

  return (
    <div className="w-80 h-full bg-slate-900/95 backdrop-blur-sm border-l border-slate-700/50 flex flex-col">
      <div className="p-4 border-b border-slate-700/50">
        <div className="flex items-center gap-2 mb-4">
          <Settings className="w-5 h-5 text-cyan-400" />
          <h2 className="text-sm font-semibold text-white">参数控制</h2>
        </div>

        <div className="flex gap-1 bg-slate-800/50 p-1 rounded-lg">
          {tabConfigs.map((config) => {
            const Icon = config.icon;
            const isActive = activeTab === config.key;
            return (
              <button
                key={config.key}
                onClick={() => setActiveTab(config.key)}
                className={cn(
                  'flex-1 flex items-center justify-center gap-1.5 px-2 py-2 rounded-md text-xs transition-all duration-200',
                  isActive
                    ? 'bg-slate-700 text-white'
                    : 'text-slate-400 hover:text-white'
                )}
              >
                <Icon className="w-3.5 h-3.5" />
                <span className="hidden lg:inline">{config.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4">
        {activeTab === 'building' && selectedBuilding && (
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-white">{selectedBuilding.name}</h3>
              <span
                className={cn(
                  'px-2 py-0.5 rounded text-xs',
                  selectedBuilding.status === 'normal' && 'bg-green-500/20 text-green-400',
                  selectedBuilding.status === 'pending' && 'bg-yellow-500/20 text-yellow-400',
                  selectedBuilding.status === 'anomaly' && 'bg-red-500/20 text-red-400'
                )}
              >
                {selectedBuilding.status === 'normal' && '正常'}
                {selectedBuilding.status === 'pending' && '待确认'}
                {selectedBuilding.status === 'anomaly' && '异常'}
              </span>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs text-slate-400 mb-2 block">建筑名称</label>
                <input
                  type="text"
                  value={selectedBuilding.name}
                  onChange={(e) => updateBuilding(selectedBuilding.id, { name: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500 transition-colors"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-400 mb-1 block">宽度 (m)</label>
                  <input
                    type="number"
                    value={selectedBuilding.dimensions.width}
                    onChange={(e) =>
                      updateBuilding(selectedBuilding.id, {
                        dimensions: {
                          ...selectedBuilding.dimensions,
                          width: parseFloat(e.target.value) || 0,
                        },
                      })
                    }
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500 transition-colors"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 mb-1 block">深度 (m)</label>
                  <input
                    type="number"
                    value={selectedBuilding.dimensions.depth}
                    onChange={(e) =>
                      updateBuilding(selectedBuilding.id, {
                        dimensions: {
                          ...selectedBuilding.dimensions,
                          depth: parseFloat(e.target.value) || 0,
                        },
                      })
                    }
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500 transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs text-slate-400 mb-2 block">
                  建筑高度: {selectedBuilding.dimensions.height}m
                </label>
                <input
                  type="range"
                  min="10"
                  max="150"
                  value={selectedBuilding.dimensions.height}
                  onChange={(e) =>
                    updateBuilding(selectedBuilding.id, {
                      dimensions: {
                        ...selectedBuilding.dimensions,
                        height: parseInt(e.target.value),
                      },
                    })
                  }
                  className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-400 mb-1 block">X 坐标</label>
                  <input
                    type="number"
                    value={selectedBuilding.position.x}
                    onChange={(e) =>
                      updateBuilding(selectedBuilding.id, {
                        position: {
                          ...selectedBuilding.position,
                          x: parseFloat(e.target.value) || 0,
                        },
                      })
                    }
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500 transition-colors"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 mb-1 block">Z 坐标</label>
                  <input
                    type="number"
                    value={selectedBuilding.position.z}
                    onChange={(e) =>
                      updateBuilding(selectedBuilding.id, {
                        position: {
                          ...selectedBuilding.position,
                          z: parseFloat(e.target.value) || 0,
                        },
                      })
                    }
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500 transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs text-slate-400 mb-2 block">
                  退界距离: {selectedBuilding.setbackDistance}m (要求: {selectedBuilding.requiredSetback}m)
                </label>
                <input
                  type="range"
                  min="0"
                  max="30"
                  value={selectedBuilding.setbackDistance}
                  onChange={(e) =>
                    updateBuilding(selectedBuilding.id, {
                      setbackDistance: parseInt(e.target.value),
                    })
                  }
                  className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer"
                />
                {selectedBuilding.setbackDistance < selectedBuilding.requiredSetback && (
                  <p className="text-xs text-red-400 mt-1">
                    ⚠️ 退界距离不满足要求，缺少 {selectedBuilding.requiredSetback - selectedBuilding.setbackDistance}m
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'building' && !selectedBuilding && (
          <div className="flex flex-col items-center justify-center h-48 text-slate-500">
            <Building2 className="w-12 h-12 mb-3 opacity-50" />
            <p className="text-sm">点击选择建筑查看参数</p>
          </div>
        )}

        {activeTab === 'wind' && (
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-white">当前时段风向数据</h3>
            <div className="space-y-3">
              {windData[timePeriod].map((wind, index) => (
                <div
                  key={index}
                  className="bg-slate-800/50 rounded-lg p-3 border border-slate-700/50"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-white">风向 {wind.angle}°</span>
                    <span className="text-xs text-cyan-400">
                      频率 {(wind.frequency * 100).toFixed(0)}%
                    </span>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex-1">
                      <div className="text-xs text-slate-400 mb-1">风速</div>
                      <div className="text-lg font-semibold text-white">
                        {wind.speed} <span className="text-xs text-slate-400">m/s</span>
                      </div>
                    </div>
                    <div className="w-12 h-12 rounded-full border-2 border-cyan-500/50 flex items-center justify-center">
                      <div
                        className="w-1 h-6 bg-cyan-400 rounded-full origin-bottom"
                        style={{ transform: `rotate(${wind.angle}deg)` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'remarks' && selectedBuilding && (
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-white">备注记录</h3>
            <div>
              <label className="text-xs text-slate-400 mb-2 block">添加备注</label>
              <textarea
                value={selectedBuilding.remarks}
                onChange={(e) => addBuildingRemark(selectedBuilding.id, e.target.value)}
                placeholder="输入关于此建筑的备注信息..."
                className="w-full h-32 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500 transition-colors resize-none"
              />
            </div>
            <button
              onClick={handleSaveRemark}
              className={cn(
                'w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm transition-all duration-300',
                saveFeedback
                  ? 'bg-green-500 text-white'
                  : 'bg-cyan-500 hover:bg-cyan-600 text-white'
              )}
            >
              {saveFeedback ? (
                <>
                  <CheckCircle className="w-4 h-4" />
                  已保存至本地
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  保存备注
                </>
              )}
            </button>
            {selectedBuilding.remarks && (
              <div className="mt-4 p-3 bg-slate-800/50 rounded-lg border border-slate-700/50">
                <div className="text-xs text-slate-400 mb-1">当前备注</div>
                <p className="text-sm text-white">{selectedBuilding.remarks}</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'remarks' && !selectedBuilding && (
          <div className="flex flex-col items-center justify-center h-48 text-slate-500">
            <AlertTriangle className="w-12 h-12 mb-3 opacity-50" />
            <p className="text-sm">点击选择建筑添加备注</p>
          </div>
        )}
      </div>
    </div>
  );
}
