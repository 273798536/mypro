import { motion } from 'framer-motion';
import { Magnet, RotateCcw, Play, Pause, RefreshCw, Plus, Minus, Settings } from 'lucide-react';
import { useConfigStore } from '../../store/useConfigStore';
import { formatValueForDisplay, formatTime } from '../../utils/reportGenerator';

export function ControlPanel() {
  const {
    magnets,
    fieldLineParams,
    interaction,
    updateMagnet,
    reversePole,
    updateFieldLineParams,
    setInteraction,
    resetAll,
    triggerFieldLineRegeneration,
    addMagnet,
  } = useConfigStore();

  const selectedMagnet = magnets[0];

  const handlePositionChange = (axis: 'x' | 'y' | 'z', value: number) => {
    if (!selectedMagnet) return;
    updateMagnet(selectedMagnet.id, {
      position: {
        ...selectedMagnet.position,
        [axis]: value,
      },
    }, 'position-editor');
  };

  const handleStrengthChange = (value: number) => {
    if (!selectedMagnet) return;
    updateMagnet(selectedMagnet.id, {
      strength: value,
    }, 'user');
  };

  const handlePoleDirectionToggle = () => {
    if (!selectedMagnet) return;
    updateMagnet(selectedMagnet.id, {
      poleDirection: selectedMagnet.poleDirection === 'N' ? 'S' : 'N',
      rotation: {
        ...selectedMagnet.rotation,
        y: selectedMagnet.rotation.y + Math.PI,
      },
    }, 'pole-editor');
  };

  return (
    <motion.div
      initial={{ x: -320 }}
      animate={{ x: 0 }}
      className="w-80 h-full bg-slate-900/95 backdrop-blur-md border-r border-slate-700 flex flex-col"
    >
      <div className="p-4 border-b border-slate-700">
        <h2 className="text-lg font-bold text-cyan-400 flex items-center gap-2">
          <Magnet className="w-5 h-5" />
          物理磁场线教具
        </h2>
        <p className="text-xs text-slate-400 mt-1">3D交互式磁场可视化工具</p>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
          <h3 className="text-sm font-semibold text-slate-200 mb-3 flex items-center gap-2">
            <Settings className="w-4 h-4" />
            磁体控制
          </h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-xs text-slate-400 mb-2">位置坐标</label>
              <div className="grid grid-cols-3 gap-2">
                {(['x', 'y', 'z'] as const).map((axis) => (
                  <div key={axis} className="space-y-1">
                    <div className="text-xs text-slate-500 uppercase">{axis}</div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handlePositionChange(axis, (selectedMagnet?.position[axis] || 0) - 0.1)}
                        className="w-6 h-6 bg-slate-700 hover:bg-slate-600 rounded text-slate-300 text-sm flex items-center justify-center transition-colors"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <input
                        type="number"
                        step="0.1"
                        value={selectedMagnet?.position[axis]?.toFixed(2) || '0.00'}
                        onChange={(e) => handlePositionChange(axis, parseFloat(e.target.value))}
                        className="w-14 h-6 bg-slate-900 border border-slate-600 rounded text-center text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
                      />
                      <button
                        onClick={() => handlePositionChange(axis, (selectedMagnet?.position[axis] || 0) + 0.1)}
                        className="w-6 h-6 bg-slate-700 hover:bg-slate-600 rounded text-slate-300 text-sm flex items-center justify-center transition-colors"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-2">磁极方向</label>
              <div className="flex gap-2">
                <button
                  onClick={handlePoleDirectionToggle}
                  className={`flex-1 py-2 px-3 rounded-lg font-medium text-sm transition-all ${
                    selectedMagnet?.poleDirection === 'N'
                      ? 'bg-red-500/20 text-red-400 border border-red-500/50'
                      : 'bg-blue-500/20 text-blue-400 border border-blue-500/50'
                  }`}
                >
                  {selectedMagnet?.poleDirection === 'N' ? 'N极向上 ↑' : 'S极向上 ↓'}
                </button>
                <button
                  onClick={() => selectedMagnet && reversePole(selectedMagnet.id)}
                  className="py-2 px-3 bg-slate-700 hover:bg-slate-600 rounded-lg text-slate-300 transition-colors"
                  title="磁极反向"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-2">
                磁场强度: {selectedMagnet?.strength.toFixed(2)}
              </label>
              <input
                type="range"
                min="0.1"
                max="3"
                step="0.1"
                value={selectedMagnet?.strength || 1}
                onChange={(e) => handleStrengthChange(parseFloat(e.target.value))}
                className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"
              />
            </div>
          </div>
        </div>

        <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
          <h3 className="text-sm font-semibold text-slate-200 mb-3">场线参数</h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-xs text-slate-400 mb-1">
                采样密度: {fieldLineParams.sampleDensity}
                {fieldLineParams.sampleDensity > 8 && (
                  <span className="text-yellow-400 ml-2">⚠️ 过高</span>
                )}
              </label>
              <input
                type="range"
                min="1"
                max="10"
                step="1"
                value={fieldLineParams.sampleDensity}
                onChange={(e) => updateFieldLineParams({ sampleDensity: parseInt(e.target.value) })}
                className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"
              />
              <div className="flex justify-between text-xs text-slate-500 mt-1">
                <span>稀疏</span>
                <span>推荐: 5-7</span>
                <span>密集</span>
              </div>
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1">
                场线数量: {fieldLineParams.lineCount}
              </label>
              <input
                type="range"
                min="5"
                max="50"
                step="5"
                value={fieldLineParams.lineCount}
                onChange={(e) => updateFieldLineParams({ lineCount: parseInt(e.target.value) })}
                className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"
              />
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1">
                场强上限: {fieldLineParams.maxFieldStrength}
              </label>
              <input
                type="range"
                min="10"
                max="500"
                step="10"
                value={fieldLineParams.maxFieldStrength}
                onChange={(e) => updateFieldLineParams({ maxFieldStrength: parseInt(e.target.value) })}
                className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"
              />
            </div>

            <button
              onClick={triggerFieldLineRegeneration}
              className="w-full py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg font-medium text-sm flex items-center justify-center gap-2 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              重新生成场线
            </button>
          </div>
        </div>

        <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
          <h3 className="text-sm font-semibold text-slate-200 mb-3">交互控制</h3>
          
          <div className="space-y-3">
            <div className="flex gap-2">
              <button
                onClick={() => setInteraction({ isPaused: !interaction.isPaused })}
                className={`flex-1 py-2 px-3 rounded-lg font-medium text-sm flex items-center justify-center gap-2 transition-all ${
                  interaction.isPaused
                    ? 'bg-green-600 hover:bg-green-500 text-white'
                    : 'bg-yellow-600 hover:bg-yellow-500 text-white'
                }`}
              >
                {interaction.isPaused ? (
                  <><Play className="w-4 h-4" /> 继续</>
                ) : (
                  <><Pause className="w-4 h-4" /> 暂停</>
                )}
              </button>
              <button
                onClick={resetAll}
                className="py-2 px-3 bg-slate-700 hover:bg-slate-600 rounded-lg text-slate-300 transition-colors"
                title="重置所有"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>

            <button
              onClick={() => addMagnet({
                position: { x: 1, y: 0, z: 0 },
                poleDirection: 'S',
                rotation: { x: 0, y: 0, z: 0 },
                strength: 1.0,
                lastModifiedBy: 'user',
              })}
              className="w-full py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg font-medium text-sm flex items-center justify-center gap-2 transition-colors"
            >
              <Plus className="w-4 h-4" />
              添加磁体
            </button>
          </div>
        </div>

        {selectedMagnet && (
          <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
            <h3 className="text-sm font-semibold text-slate-200 mb-2">当前状态</h3>
            <div className="text-xs text-slate-400 space-y-1">
              <div>位置: {formatValueForDisplay(selectedMagnet.position)}</div>
              <div>磁极: {selectedMagnet.poleDirection === 'N' ? 'N极向上' : 'S极向上'}</div>
              <div>强度: {selectedMagnet.strength.toFixed(2)}</div>
              <div>最后编辑: {selectedMagnet.lastModifiedBy === 'position-editor' ? '位置维护者' : 
                        selectedMagnet.lastModifiedBy === 'pole-editor' ? '磁极维护者' : '用户'}</div>
              <div>更新时间: {formatTime(selectedMagnet.lastModifiedAt)}</div>
              <div className="pt-2 border-t border-slate-700 mt-2">
                <div className={`font-medium ${interaction.isDragging ? 'text-yellow-400' : 'text-slate-400'}`}>
                  拖拽状态: {interaction.isDragging ? '正在拖动' : '空闲'}
                </div>
                <div>动画状态: {interaction.isPaused ? '⏸️ 已暂停' : '▶️ 播放中'}</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}
