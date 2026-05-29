import React, { useState } from 'react';
import { Settings, Layers, Eye, EyeOff, Sliders, Save, Camera } from 'lucide-react';
import { useAppStore } from '../store';
import { ESCALATOR_CAPACITY_RANGE, GATE_PASS_RATE_RANGE } from '../types';

const ControlPanel: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'floors' | 'params'>('floors');
  const {
    floors,
    visibleFloors,
    selectedFloor,
    toggleFloorVisibility,
    updateEscalatorCapacity,
    updateGatePassRate,
    toggleBarrier,
    addViewPreset,
    cameraPosition,
    cameraTarget
  } = useAppStore();

  const [capacityError, setCapacityError] = useState<string | null>(null);
  const [presetName, setPresetName] = useState('');
  const [showSavePreset, setShowSavePreset] = useState(false);

  const handleCapacityChange = (floorLevel: number, escalatorId: string, value: number) => {
    const result = updateEscalatorCapacity(floorLevel, escalatorId, value);
    if (!result.valid) {
      setCapacityError(result.message);
      setTimeout(() => setCapacityError(null), 3000);
    }
  };

  const handleSavePreset = () => {
    if (presetName.trim()) {
      addViewPreset({
        name: presetName,
        cameraPosition,
        cameraTarget,
        visibleFloors
      });
      setPresetName('');
      setShowSavePreset(false);
    }
  };

  return (
    <div className="w-80 glass-panel rounded-r-2xl flex flex-col h-full">
      <div className="p-4 border-b border-blue-500/20">
        <div className="flex items-center gap-3 mb-4">
          <Settings className="w-5 h-5 text-blue-400" />
          <h2 className="text-lg font-display font-semibold text-white">控制面板</h2>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('floors')}
            className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'floors'
                ? 'bg-blue-500 text-white'
                : 'bg-blue-500/10 text-blue-300 hover:bg-blue-500/20'
            }`}
          >
            <Layers className="w-4 h-4 inline mr-2" />
            楼层
          </button>
          <button
            onClick={() => setActiveTab('params')}
            className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'params'
                ? 'bg-blue-500 text-white'
                : 'bg-blue-500/10 text-blue-300 hover:bg-blue-500/20'
            }`}
          >
            <Sliders className="w-4 h-4 inline mr-2" />
            参数
          </button>
        </div>
      </div>

      {capacityError && (
        <div className="mx-4 mt-4 p-3 bg-red-500/20 border border-red-500/50 rounded-lg animate-pulse">
          <p className="text-sm text-red-300">{capacityError}</p>
        </div>
      )}

      <div className="flex-1 overflow-y-auto scrollbar-thin p-4">
        {activeTab === 'floors' && (
          <div className="space-y-3">
            {floors.map((floor) => (
              <div
                key={floor.id}
                className={`p-3 rounded-lg border transition-all cursor-pointer ${
                  selectedFloor === floor.level
                    ? 'bg-blue-500/20 border-blue-400'
                    : 'bg-blue-500/5 border-blue-500/20 hover:bg-blue-500/10'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: floor.color }}
                    />
                    <span className="text-white font-medium text-sm">{floor.name}</span>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleFloorVisibility(floor.level);
                    }}
                    className="p-1 hover:bg-blue-500/20 rounded transition-colors"
                  >
                    {visibleFloors.includes(floor.level) ? (
                      <Eye className="w-4 h-4 text-blue-300" />
                    ) : (
                      <EyeOff className="w-4 h-4 text-gray-500" />
                    )}
                  </button>
                </div>
                <div className="text-xs text-blue-200/60 space-y-1">
                  <p>扶梯: {floor.escalators.length} 台</p>
                  <p>闸机: {floor.gates.length} 组</p>
                  <p>围挡: {floor.barriers.filter(b => b.active).length}/{floor.barriers.length} 生效</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'params' && selectedFloor && (
          <div className="space-y-6">
            {(() => {
              const floor = floors.find(f => f.level === selectedFloor);
              if (!floor) return null;
              return (
                <>
                  {floor.escalators.length > 0 && (
                    <div>
                      <h4 className="text-sm font-semibold text-blue-300 mb-3 flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-green-400" />
                        扶梯容量
                      </h4>
                      <div className="space-y-4">
                        {floor.escalators.map((esc) => (
                          <div key={esc.id} className="p-3 bg-blue-500/5 rounded-lg">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm text-white">{esc.name}</span>
                              <span className={`text-xs px-2 py-0.5 rounded ${
                                esc.status === 'error' ? 'bg-red-500/30 text-red-300' :
                                esc.status === 'warning' ? 'bg-yellow-500/30 text-yellow-300' :
                                'bg-green-500/30 text-green-300'
                              }`}>
                                {esc.status === 'error' ? '过载' : esc.status === 'warning' ? '警告' : '正常'}
                              </span>
                            </div>
                            <input
                              type="range"
                              min={ESCALATOR_CAPACITY_RANGE.min}
                              max={ESCALATOR_CAPACITY_RANGE.max}
                              value={esc.capacity}
                              onChange={(e) => handleCapacityChange(floor.level, esc.id, Number(e.target.value))}
                              className="w-full h-2 bg-blue-500/20 rounded-lg appearance-none cursor-pointer"
                            />
                            <div className="flex justify-between text-xs text-blue-200/60 mt-1">
                              <span>{ESCALATOR_CAPACITY_RANGE.min}</span>
                              <span className="text-white font-mono">{esc.capacity} / {esc.maxCapacity}</span>
                              <span>{ESCALATOR_CAPACITY_RANGE.max}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {floor.gates.length > 0 && (
                    <div>
                      <h4 className="text-sm font-semibold text-blue-300 mb-3 flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-blue-400" />
                        闸机速率
                      </h4>
                      <div className="space-y-4">
                        {floor.gates.map((gate) => (
                          <div key={gate.id} className="p-3 bg-blue-500/5 rounded-lg">
                            <span className="text-sm text-white block mb-2">{gate.name}</span>
                            <input
                              type="range"
                              min={GATE_PASS_RATE_RANGE.min}
                              max={GATE_PASS_RATE_RANGE.max}
                              value={gate.passRate}
                              onChange={(e) => updateGatePassRate(floor.level, gate.id, Number(e.target.value))}
                              className="w-full h-2 bg-blue-500/20 rounded-lg appearance-none cursor-pointer"
                            />
                            <div className="flex justify-between text-xs text-blue-200/60 mt-1">
                              <span>{GATE_PASS_RATE_RANGE.min}</span>
                              <span className="text-white font-mono">{gate.passRate} 人/分钟</span>
                              <span>{GATE_PASS_RATE_RANGE.max}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {floor.barriers.length > 0 && (
                    <div>
                      <h4 className="text-sm font-semibold text-blue-300 mb-3 flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-red-400" />
                        围挡设置
                      </h4>
                      <div className="space-y-2">
                        {floor.barriers.map((barrier) => (
                          <div
                            key={barrier.id}
                            className="flex items-center justify-between p-3 bg-blue-500/5 rounded-lg"
                          >
                            <span className="text-sm text-white">{barrier.name}</span>
                            <button
                              onClick={() => toggleBarrier(floor.level, barrier.id)}
                              className={`relative w-12 h-6 rounded-full transition-colors ${
                                barrier.active ? 'bg-red-500' : 'bg-gray-600'
                              }`}
                            >
                              <div
                                className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
                                  barrier.active ? 'translate-x-7' : 'translate-x-1'
                                }`}
                              />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              );
            })()}

            {!selectedFloor && (
              <div className="text-center text-blue-200/60 py-8">
                <p>点击3D场景中的楼层</p>
                <p className="text-sm mt-1">以调整该楼层参数</p>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="p-4 border-t border-blue-500/20">
        {showSavePreset ? (
          <div className="space-y-2">
            <input
              type="text"
              value={presetName}
              onChange={(e) => setPresetName(e.target.value)}
              placeholder="输入视角名称..."
              className="w-full px-3 py-2 bg-blue-500/10 border border-blue-500/30 rounded-lg text-white text-sm placeholder-blue-200/40 focus:outline-none focus:border-blue-400"
            />
            <div className="flex gap-2">
              <button
                onClick={handleSavePreset}
                className="flex-1 px-3 py-2 bg-blue-500 text-white text-sm rounded-lg hover:bg-blue-400 transition-colors"
              >
                保存
              </button>
              <button
                onClick={() => setShowSavePreset(false)}
                className="px-3 py-2 bg-blue-500/10 text-blue-300 text-sm rounded-lg hover:bg-blue-500/20 transition-colors"
              >
                取消
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setShowSavePreset(true)}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-500/10 text-blue-300 rounded-lg hover:bg-blue-500/20 transition-colors"
          >
            <Camera className="w-4 h-4" />
            保存当前视角
          </button>
        )}
      </div>
    </div>
  );
};

export default ControlPanel;
