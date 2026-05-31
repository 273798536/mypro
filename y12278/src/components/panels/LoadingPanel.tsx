import React, { useState } from 'react';
import { Package, Droplets, Calculator, Grid3X3, Tag, Eye, EyeOff } from 'lucide-react';
import { useCargoStore } from '@/store/useCargoStore';
import { useVersionStore } from '@/store/useVersionStore';
import { useStabilityStore } from '@/store/useStabilityStore';
import { useShipStore } from '@/store/useShipStore';
import { GaugeMeter } from '@/components/common/GaugeMeter';
import { weatherLevelDescriptions } from '@/utils/mockData';

export const LoadingPanel: React.FC = () => {
  const { cargoItems, selectedCellId, updateCellLoad, resetCell, getCellById } = useCargoStore();
  const {
    ballastVersions,
    currentBallastId,
    getCurrentBallast,
    addBallastVersion,
    setCurrentBallast,
    getVersionNumber,
    weatherLevel,
    setWeatherLevel,
  } = useVersionStore();
  const { calculate, isCalculating, showGrid, showAnnotations, toggleGrid, toggleAnnotations } = useStabilityStore();
  const { shipRemark, setShipRemark, currentShip } = useShipStore();

  const [activeTab, setActiveTab] = useState<'cargo' | 'ballast' | 'weather'>('cargo');
  const [ballastValues, setBallastValues] = useState({
    foreTank: 0,
    aftTank: 0,
    portTank: 0,
    starboardTank: 0,
    remark: '',
    operator: '',
  });
  const [selectedCargo, setSelectedCargo] = useState<string>('');
  const [loadWeight, setLoadWeight] = useState<string>('');

  const currentBallast = getCurrentBallast();
  const selectedCell = selectedCellId ? getCellById(selectedCellId) : null;

  const handleLoadCargo = () => {
    if (!selectedCellId || !selectedCargo || !loadWeight) return;
    const weight = parseFloat(loadWeight);
    if (isNaN(weight) || weight <= 0) return;

    const cargoItem = cargoItems.find((c) => c.id === selectedCargo);
    updateCellLoad(selectedCellId, weight, cargoItem?.name || '');
    setLoadWeight('');
  };

  const handleResetCell = () => {
    if (!selectedCellId) return;
    resetCell(selectedCellId);
  };

  const handleSaveBallast = () => {
    const totalBallast = ballastValues.foreTank + ballastValues.aftTank + ballastValues.portTank + ballastValues.starboardTank;
    if (totalBallast === 0) return;

    addBallastVersion({
      shipModelId: currentShip.id,
      version: getVersionNumber(),
      foreTank: ballastValues.foreTank,
      aftTank: ballastValues.aftTank,
      portTank: ballastValues.portTank,
      starboardTank: ballastValues.starboardTank,
      totalBallast,
      remark: ballastValues.remark || `压载水调整 - 总计${totalBallast}t`,
      operator: ballastValues.operator || '当前用户',
    });

    setBallastValues({
      foreTank: 0,
      aftTank: 0,
      portTank: 0,
      starboardTank: 0,
      remark: '',
      operator: '',
    });
  };

  const handleUseCurrentBallast = () => {
    if (!currentBallast) return;
    setBallastValues({
      foreTank: currentBallast.foreTank,
      aftTank: currentBallast.aftTank,
      portTank: currentBallast.portTank,
      starboardTank: currentBallast.starboardTank,
      remark: currentBallast.remark,
      operator: currentBallast.operator,
    });
  };

  return (
    <div className="h-full flex flex-col bg-slate-900/95 border-r border-slate-700">
      <div className="p-4 border-b border-slate-700">
        <h2 className="text-lg font-bold text-slate-100 mb-1">船舶稳性装载舱</h2>
        <div className="text-xs text-slate-400 mb-2">
          <span className="font-mono">{currentShip.id}</span>
          <span className="mx-2">|</span>
          <span>{currentShip.name}</span>
        </div>
        <div className="text-xs text-slate-500 mb-3">
          尺寸: {currentShip.length}m × {currentShip.width}m × {currentShip.depth}m
        </div>
        <div className="space-y-2">
          <label className="text-xs text-slate-400 block">船舶模型备注</label>
          <textarea
            value={shipRemark}
            onChange={(e) => setShipRemark(e.target.value)}
            className="w-full px-2 py-1.5 bg-slate-800 border border-slate-600 rounded text-xs text-slate-200 focus:border-blue-500 focus:outline-none resize-none"
            rows={2}
            placeholder="输入船舶模型备注..."
          />
        </div>
      </div>

      <div className="flex border-b border-slate-700">
        {[
          { id: 'cargo', label: '货物装载', icon: Package },
          { id: 'ballast', label: '压载水', icon: Droplets },
          { id: 'weather', label: '天气设置', icon: Grid3X3 },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium transition-colors ${
              activeTab === tab.id
                ? 'text-blue-400 border-b-2 border-blue-400 bg-slate-800/50'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/30'
            }`}
          >
            <tab.icon size={14} />
            {tab.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {activeTab === 'cargo' && (
          <div className="space-y-4">
            <div>
              <label className="text-xs text-slate-400 block mb-2">可选货物</label>
              <div className="grid grid-cols-2 gap-2">
                {cargoItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setSelectedCargo(item.id)}
                    className={`p-2 rounded border-2 text-left transition-all ${
                      selectedCargo === item.id
                        ? 'border-blue-500 bg-blue-900/30'
                        : 'border-slate-600 bg-slate-800/50 hover:border-slate-500'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className="w-4 h-4 rounded"
                        style={{ backgroundColor: item.color }}
                      />
                      <span className="text-xs font-medium text-slate-200">{item.name}</span>
                    </div>
                    <div className="text-[10px] text-slate-500 mt-1 font-mono">
                      {item.weight}t/件 · {item.category}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-3 border-t border-slate-700">
              <label className="text-xs text-slate-400 block mb-2">
                选中舱位
                {selectedCell && (
                  <span className="ml-2 font-mono text-blue-400">{selectedCell.id}</span>
                )}
              </label>
              {selectedCell ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div className="bg-slate-800/50 p-2 rounded">
                      <div className="text-slate-500">当前载重</div>
                      <div className="font-mono text-slate-200">{selectedCell.currentLoad}t</div>
                    </div>
                    <div className="bg-slate-800/50 p-2 rounded">
                      <div className="text-slate-500">最大载重</div>
                      <div className="font-mono text-slate-200">{selectedCell.maxCapacity}t</div>
                    </div>
                    <div className="bg-slate-800/50 p-2 rounded">
                      <div className="text-slate-500">装载率</div>
                      <div className="font-mono text-slate-200">
                        {Math.round((selectedCell.currentLoad / selectedCell.maxCapacity) * 100)}%
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <input
                        type="number"
                        value={loadWeight}
                        onChange={(e) => setLoadWeight(e.target.value)}
                        placeholder="输入载重 (t)"
                        className="flex-1 px-2 py-1.5 bg-slate-800 border border-slate-600 rounded text-xs text-slate-200 focus:border-blue-500 focus:outline-none font-mono"
                      />
                      <button
                        onClick={handleLoadCargo}
                        disabled={!selectedCargo || !loadWeight}
                        className="px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        装载
                      </button>
                    </div>
                    <button
                      onClick={handleResetCell}
                      className="w-full px-3 py-1.5 bg-slate-700 text-slate-300 text-xs font-medium rounded hover:bg-slate-600 transition-colors"
                    >
                      清空舱位
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-xs text-slate-500 text-center py-6 bg-slate-800/30 rounded border-2 border-dashed border-slate-700">
                  <Tag size={20} className="mx-auto mb-2 opacity-50" />
                  点击3D视图中的舱位进行选择
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'ballast' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-xs text-slate-400">当前压载水版本</label>
              <button
                onClick={handleUseCurrentBallast}
                className="text-xs text-blue-400 hover:text-blue-300"
              >
                使用当前值
              </button>
            </div>
            {currentBallast && (
              <div className="bg-slate-800/50 rounded p-3 border border-slate-700">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-mono text-sm text-blue-400">{currentBallast.version}</span>
                  <span className="text-xs text-slate-400">{currentBallast.operator}</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-slate-500">前舱: </span>
                    <span className="font-mono text-slate-200">{currentBallast.foreTank}t</span>
                  </div>
                  <div>
                    <span className="text-slate-500">后舱: </span>
                    <span className="font-mono text-slate-200">{currentBallast.aftTank}t</span>
                  </div>
                  <div>
                    <span className="text-slate-500">左舷: </span>
                    <span className="font-mono text-slate-200">{currentBallast.portTank}t</span>
                  </div>
                  <div>
                    <span className="text-slate-500">右舷: </span>
                    <span className="font-mono text-slate-200">{currentBallast.starboardTank}t</span>
                  </div>
                </div>
                <div className="mt-2 pt-2 border-t border-slate-700 text-xs text-slate-400">
                  {currentBallast.remark}
                </div>
              </div>
            )}

            <div className="pt-3 border-t border-slate-700">
              <label className="text-xs text-slate-400 block mb-2">新建压载水版本</label>
              <div className="grid grid-cols-2 gap-2 mb-3">
                {[
                  { key: 'foreTank', label: '前舱 (t)' },
                  { key: 'aftTank', label: '后舱 (t)' },
                  { key: 'portTank', label: '左舷 (t)' },
                  { key: 'starboardTank', label: '右舷 (t)' },
                ].map((field) => (
                  <div key={field.key}>
                    <label className="text-[10px] text-slate-500 block mb-1">{field.label}</label>
                    <input
                      type="number"
                      value={(ballastValues as any)[field.key]}
                      onChange={(e) =>
                        setBallastValues((prev) => ({
                          ...prev,
                          [field.key]: parseFloat(e.target.value) || 0,
                        }))
                      }
                      className="w-full px-2 py-1.5 bg-slate-800 border border-slate-600 rounded text-xs text-slate-200 focus:border-blue-500 focus:outline-none font-mono"
                    />
                  </div>
                ))}
              </div>
              <div className="text-xs text-slate-400 mb-3">
                总计:
                <span className="ml-2 font-mono text-slate-200">
                  {ballastValues.foreTank + ballastValues.aftTank + ballastValues.portTank + ballastValues.starboardTank}t
                </span>
              </div>
              <div className="space-y-2">
                <input
                  type="text"
                  value={ballastValues.remark}
                  onChange={(e) => setBallastValues((prev) => ({ ...prev, remark: e.target.value }))}
                  placeholder="版本备注（必填，用于记录修改原因）"
                  className="w-full px-2 py-1.5 bg-slate-800 border border-slate-600 rounded text-xs text-slate-200 focus:border-blue-500 focus:outline-none"
                />
                <input
                  type="text"
                  value={ballastValues.operator}
                  onChange={(e) => setBallastValues((prev) => ({ ...prev, operator: e.target.value }))}
                  placeholder="操作人员"
                  className="w-full px-2 py-1.5 bg-slate-800 border border-slate-600 rounded text-xs text-slate-200 focus:border-blue-500 focus:outline-none"
                />
                <button
                  onClick={handleSaveBallast}
                  disabled={ballastValues.foreTank + ballastValues.aftTank + ballastValues.portTank + ballastValues.starboardTank === 0}
                  className="w-full px-3 py-2 bg-blue-600 text-white text-xs font-medium rounded hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  保存为新版本（旧版本保留）
                </button>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-700">
              <label className="text-xs text-slate-400 block mb-2">历史版本</label>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {[...ballastVersions].reverse().map((version) => (
                  <button
                    key={version.id}
                    onClick={() => setCurrentBallast(version.id)}
                    className={`w-full p-2 rounded text-left text-xs transition-all ${
                      currentBallastId === version.id
                        ? 'bg-blue-900/50 border border-blue-500'
                        : 'bg-slate-800/30 border border-slate-700 hover:border-slate-500'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-slate-200">{version.version}</span>
                      <span className="text-slate-500">{version.operator}</span>
                    </div>
                    <div className="text-slate-400 mt-1 text-[10px]">{version.remark}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'weather' && (
          <div className="space-y-4">
            <div>
              <label className="text-xs text-slate-400 block mb-2">天气等级</label>
              <div className="grid grid-cols-7 gap-1">
                {[1, 2, 3, 4, 5, 6, 7].map((level) => {
                  const info = weatherLevelDescriptions[level];
                  return (
                    <button
                      key={level}
                      onClick={() => setWeatherLevel(level)}
                      className={`p-2 rounded text-center transition-all border-2 ${
                        weatherLevel === level
                          ? 'border-white shadow-lg'
                          : 'border-transparent opacity-60 hover:opacity-100'
                      }`}
                      style={{ backgroundColor: info.color }}
                    >
                      <div className="text-[10px] font-bold text-white">{level}</div>
                      <div className="text-[9px] text-white/90 mt-0.5">{info.name}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="pt-3 border-t border-slate-700">
              <div className="text-xs text-slate-400 mb-2">天气参数</div>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between bg-slate-800/50 p-2 rounded">
                  <span className="text-slate-500">风力等级</span>
                  <span className="font-mono text-slate-200">{weatherLevel * 1.5} 级</span>
                </div>
                <div className="flex justify-between bg-slate-800/50 p-2 rounded">
                  <span className="text-slate-500">浪高</span>
                  <span className="font-mono text-slate-200">{(weatherLevel * 0.6).toFixed(1)} m</span>
                </div>
                <div className="flex justify-between bg-slate-800/50 p-2 rounded">
                  <span className="text-slate-500">稳性影响系数</span>
                  <span className="font-mono text-amber-400">×{(1 + (weatherLevel - 1) * 0.1).toFixed(2)}</span>
                </div>
              </div>
              <div className="mt-3 p-2 bg-amber-900/20 border border-amber-700/50 rounded text-[10px] text-amber-300">
                天气等级将作为补充证据保留在计算结果中，当船舶模型与货舱格结论不一致时自动关联。
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="p-4 border-t border-slate-700 space-y-3">
        <div className="grid grid-cols-3 gap-2">
          <GaugeMeter
            value={0}
            min={-10}
            max={10}
            label="横倾角"
            unit="°"
            warningThreshold={3}
            dangerThreshold={5}
          />
          <GaugeMeter
            value={0}
            min={-5}
            max={5}
            label="纵倾角"
            unit="°"
            warningThreshold={1.5}
            dangerThreshold={3}
          />
          <GaugeMeter
            value={0}
            min={0}
            max={2}
            label="GM值"
            unit="m"
            warningThreshold={0.6}
            dangerThreshold={0.4}
          />
        </div>

        <div className="flex gap-2">
          <button
            onClick={calculate}
            disabled={isCalculating}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 text-white text-sm font-medium rounded hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Calculator size={16} />
            {isCalculating ? '计算中...' : '计算稳性'}
          </button>
        </div>

        <div className="flex gap-2">
          <button
            onClick={toggleGrid}
            className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium rounded transition-colors ${
              showGrid
                ? 'bg-slate-600 text-white'
                : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
            }`}
          >
            {showGrid ? <Eye size={14} /> : <EyeOff size={14} />}
            货舱格
          </button>
          <button
            onClick={toggleAnnotations}
            className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium rounded transition-colors ${
              showAnnotations
                ? 'bg-slate-600 text-white'
                : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
            }`}
          >
            {showAnnotations ? <Eye size={14} /> : <EyeOff size={14} />}
            标注
          </button>
        </div>
      </div>
    </div>
  );
};
