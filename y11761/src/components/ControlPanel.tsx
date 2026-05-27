import { useState } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  Camera,
  Grid3X3,
  Thermometer,
  CircleDot,
  Square,
  Target,
  Trash2,
  ChevronDown,
  ChevronUp,
  Sliders,
  Waves,
} from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { ObstacleType } from '@/types';
import { getAnomalyIcon, getAnomalyColor } from '@/utils/anomalyDetector';

const TAU = Math.PI * 2;

export function ControlPanel() {
  const {
    isPlaying,
    waveParams,
    obstacles,
    displayOptions,
    anomalies,
    activeAnomaly,
    togglePlay,
    reset,
    updateWaveSource,
    setDisplayOptions,
    addObstacle,
    setGridResolution,
    gridResolution,
    setActiveAnomaly,
    clearAnomalies,
    setWaveParams,
  } = useAppStore();

  const [expandedSections, setExpandedSections] = useState({
    waveSources: true,
    obstacles: true,
    display: true,
    anomalies: anomalies.length > 0,
  });

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  const handleAddObstacle = (type: ObstacleType) => {
    addObstacle({
      type,
      position: { x: 0, y: -2 },
      size: { width: 3, height: 0.5 },
      rotation: 0,
    });
  };

  const obstacleTypes: { type: ObstacleType; label: string; icon: string }[] = [
    { type: 'barrier', label: '挡板', icon: '🚧' },
    { type: 'slit', label: '单缝', icon: '📏' },
    { type: 'double_slit', label: '双缝', icon: '⚖️' },
    { type: 'reflector', label: '反射板', icon: '🔲' },
  ];

  return (
    <div className="w-80 bg-slate-900/95 backdrop-blur-sm border-l border-slate-700 flex flex-col h-full overflow-hidden">
      <div className="p-4 border-b border-slate-700 bg-gradient-to-r from-slate-800 to-slate-900">
        <h2
          className="text-lg font-bold text-cyan-400 tracking-wider"
          style={{ fontFamily: "'Orbitron', sans-serif" }}
        >
          <Waves className="inline-block w-5 h-5 mr-2" />
          波浪控制台
        </h2>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar">
        <div className="p-4 space-y-4">
          <div className="flex gap-2 mb-4">
            <button
              onClick={togglePlay}
              className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg font-medium transition-all duration-200 ${
                isPlaying
                  ? 'bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 border border-amber-500/50'
                  : 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 border border-emerald-500/50'
              }`}
            >
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              {isPlaying ? '暂停' : '播放'}
            </button>
            <button
              onClick={reset}
              className="flex items-center justify-center gap-2 py-3 px-4 rounded-lg font-medium bg-slate-700/50 text-slate-300 hover:bg-slate-600/50 border border-slate-600/50 transition-all duration-200"
            >
              <RotateCcw className="w-4 h-4" />
              重置
            </button>
          </div>

          <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700">
            <div className="flex items-center justify-between mb-3">
              <label className="text-sm font-medium text-slate-300 flex items-center gap-2">
                <Camera className="w-4 h-4 text-cyan-400" />
                网格分辨率
              </label>
              <span className="text-xs text-slate-400">{gridResolution}x{gridResolution}</span>
            </div>
            <input
              type="range"
              min="32"
              max="128"
              step="16"
              value={gridResolution}
              onChange={(e) => setGridResolution(parseInt(e.target.value))}
              className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"
            />
            <div className="flex justify-between text-xs text-slate-500 mt-1">
              <span>性能优先</span>
              <span>质量优先</span>
            </div>
          </div>

          <div className="border border-slate-700 rounded-lg overflow-hidden">
            <button
              onClick={() => toggleSection('waveSources')}
              className="w-full flex items-center justify-between p-3 bg-slate-800/50 hover:bg-slate-700/50 transition-colors"
            >
              <span className="font-medium text-cyan-300 flex items-center gap-2">
                <Sliders className="w-4 h-4" />
                波源参数
              </span>
              {expandedSections.waveSources ? (
                <ChevronUp className="w-4 h-4 text-slate-400" />
              ) : (
                <ChevronDown className="w-4 h-4 text-slate-400" />
              )}
            </button>
            {expandedSections.waveSources && (
              <div className="p-4 space-y-4 bg-slate-900/50">
                {(['source1', 'source2'] as const).map((source, idx) => (
                  <div key={source} className="space-y-3">
                    <h3 className={`text-sm font-semibold ${idx === 0 ? 'text-cyan-400' : 'text-emerald-400'}`}>
                      波源 {idx + 1}
                    </h3>
                    <div className="space-y-2">
                      <div>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-slate-400">频率 (Hz)</span>
                          <span className="text-slate-300">{waveParams[source].frequency.toFixed(1)}</span>
                        </div>
                        <input
                          type="range"
                          min="0.5"
                          max="5"
                          step="0.1"
                          value={waveParams[source].frequency}
                          onChange={(e) =>
                            updateWaveSource(source, { frequency: parseFloat(e.target.value) })
                          }
                          className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                        />
                      </div>
                      <div>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-slate-400">相位 (rad)</span>
                          <span className="text-slate-300">{(waveParams[source].phase / Math.PI).toFixed(2)}π</span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max={TAU}
                          step="0.1"
                          value={waveParams[source].phase}
                          onChange={(e) =>
                            updateWaveSource(source, { phase: parseFloat(e.target.value) })
                          }
                          className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                        />
                      </div>
                      <div>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-slate-400">振幅</span>
                          <span className="text-slate-300">{waveParams[source].amplitude.toFixed(2)}</span>
                        </div>
                        <input
                          type="range"
                          min="0.1"
                          max="1"
                          step="0.05"
                          value={waveParams[source].amplitude}
                          onChange={(e) =>
                            updateWaveSource(source, { amplitude: parseFloat(e.target.value) })
                          }
                          className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                        />
                      </div>
                    </div>
                  </div>
                ))}
                <div className="pt-2 border-t border-slate-700">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-400">波长 λ</span>
                    <span className="text-slate-300">{waveParams.wavelength.toFixed(2)} m</span>
                  </div>
                  <input
                    type="range"
                    min="0.5"
                    max="3"
                    step="0.1"
                    value={waveParams.wavelength}
                    onChange={(e) => setWaveParams({ wavelength: parseFloat(e.target.value) })}
                    className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                  />
                </div>
              </div>
            )}
          </div>

          <div className="border border-slate-700 rounded-lg overflow-hidden">
            <button
              onClick={() => toggleSection('obstacles')}
              className="w-full flex items-center justify-between p-3 bg-slate-800/50 hover:bg-slate-700/50 transition-colors"
            >
              <span className="font-medium text-orange-300 flex items-center gap-2">
                <Square className="w-4 h-4" />
                障碍物
                <span className="text-xs bg-orange-500/20 text-orange-400 px-2 py-0.5 rounded-full">
                  {obstacles.length}
                </span>
              </span>
              {expandedSections.obstacles ? (
                <ChevronUp className="w-4 h-4 text-slate-400" />
              ) : (
                <ChevronDown className="w-4 h-4 text-slate-400" />
              )}
            </button>
            {expandedSections.obstacles && (
              <div className="p-4 bg-slate-900/50">
                <div className="grid grid-cols-2 gap-2 mb-3">
                  {obstacleTypes.map(({ type, label, icon }) => (
                    <button
                      key={type}
                      onClick={() => handleAddObstacle(type)}
                      className="flex flex-col items-center gap-1 p-3 bg-slate-800/50 hover:bg-slate-700/50 rounded-lg border border-slate-600/50 hover:border-orange-500/50 transition-all"
                    >
                      <span className="text-xl">{icon}</span>
                      <span className="text-xs text-slate-300">{label}</span>
                    </button>
                  ))}
                </div>
                {obstacles.length > 0 && (
                  <div className="space-y-2 max-h-32 overflow-y-auto">
                    {obstacles.map((obstacle, idx) => (
                      <div
                        key={obstacle.id}
                        className="flex items-center justify-between p-2 bg-slate-800/30 rounded border border-slate-700/50"
                      >
                        <span className="text-sm text-slate-300">
                          {obstacleTypes.find((t) => t.type === obstacle.type)?.icon}{' '}
                          {obstacleTypes.find((t) => t.type === obstacle.type)?.label} {idx + 1}
                        </span>
                        <button
                          onClick={() => {
                            const removeObstacle = useAppStore.getState().removeObstacle;
                            removeObstacle(obstacle.id);
                          }}
                          className="p-1 text-red-400 hover:bg-red-500/20 rounded transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <p className="text-xs text-slate-500 mt-2">
                  💡 双击场景中的障碍物可删除，拖拽可移动
                </p>
              </div>
            )}
          </div>

          <div className="border border-slate-700 rounded-lg overflow-hidden">
            <button
              onClick={() => toggleSection('display')}
              className="w-full flex items-center justify-between p-3 bg-slate-800/50 hover:bg-slate-700/50 transition-colors"
            >
              <span className="font-medium text-purple-300 flex items-center gap-2">
                <Target className="w-4 h-4" />
                显示选项
              </span>
              {expandedSections.display ? (
                <ChevronUp className="w-4 h-4 text-slate-400" />
              ) : (
                <ChevronDown className="w-4 h-4 text-slate-400" />
              )}
            </button>
            {expandedSections.display && (
              <div className="p-4 space-y-2 bg-slate-900/50">
                <label className="flex items-center justify-between p-2 hover:bg-slate-800/30 rounded cursor-pointer">
                  <span className="text-sm text-slate-300 flex items-center gap-2">
                    <Grid3X3 className="w-4 h-4 text-cyan-400" />
                    波面网格
                  </span>
                  <input
                    type="checkbox"
                    checked={displayOptions.showMesh}
                    onChange={(e) => setDisplayOptions({ showMesh: e.target.checked })}
                    className="w-4 h-4 accent-cyan-500"
                  />
                </label>
                <label className="flex items-center justify-between p-2 hover:bg-slate-800/30 rounded cursor-pointer">
                  <span className="text-sm text-slate-300 flex items-center gap-2">
                    <Thermometer className="w-4 h-4 text-red-400" />
                    干涉热力图
                  </span>
                  <input
                    type="checkbox"
                    checked={displayOptions.showHeatmap}
                    onChange={(e) => setDisplayOptions({ showHeatmap: e.target.checked })}
                    className="w-4 h-4 accent-red-500"
                  />
                </label>
                <label className="flex items-center justify-between p-2 hover:bg-slate-800/30 rounded cursor-pointer">
                  <span className="text-sm text-slate-300 flex items-center gap-2">
                    <CircleDot className="w-4 h-4 text-emerald-400" />
                    波源标记
                  </span>
                  <input
                    type="checkbox"
                    checked={displayOptions.showWaveSources}
                    onChange={(e) => setDisplayOptions({ showWaveSources: e.target.checked })}
                    className="w-4 h-4 accent-emerald-500"
                  />
                </label>
                <label className="flex items-center justify-between p-2 hover:bg-slate-800/30 rounded cursor-pointer">
                  <span className="text-sm text-slate-300 flex items-center gap-2">
                    <Target className="w-4 h-4 text-amber-400" />
                    采样点标记
                  </span>
                  <input
                    type="checkbox"
                    checked={displayOptions.showSamplePoints}
                    onChange={(e) => setDisplayOptions({ showSamplePoints: e.target.checked })}
                    className="w-4 h-4 accent-amber-500"
                  />
                </label>
                <label className="flex items-center justify-between p-2 hover:bg-slate-800/30 rounded cursor-pointer">
                  <span className="text-sm text-slate-300 flex items-center gap-2">
                    <Square className="w-4 h-4 text-orange-400" />
                    障碍物
                  </span>
                  <input
                    type="checkbox"
                    checked={displayOptions.showObstacles}
                    onChange={(e) => setDisplayOptions({ showObstacles: e.target.checked })}
                    className="w-4 h-4 accent-orange-500"
                  />
                </label>
              </div>
            )}
          </div>

          {anomalies.length > 0 && (
            <div className="border border-slate-700 rounded-lg overflow-hidden">
              <button
                onClick={() => toggleSection('anomalies')}
                className="w-full flex items-center justify-between p-3 bg-red-900/30 hover:bg-red-900/40 transition-colors"
              >
                <span className="font-medium text-red-300 flex items-center gap-2">
                  <span className="animate-pulse">⚠️</span>
                  异常检测
                  <span className="text-xs bg-red-500/30 text-red-300 px-2 py-0.5 rounded-full">
                    {anomalies.length}
                  </span>
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      clearAnomalies();
                    }}
                    className="text-xs text-slate-400 hover:text-red-400 transition-colors"
                  >
                    清除
                  </button>
                  {expandedSections.anomalies ? (
                    <ChevronUp className="w-4 h-4 text-slate-400" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-slate-400" />
                  )}
                </div>
              </button>
              {expandedSections.anomalies && (
                <div className="p-3 space-y-2 bg-slate-900/50 max-h-60 overflow-y-auto">
                  {anomalies.slice().reverse().map((anomaly) => (
                    <div
                      key={anomaly.id}
                      onClick={() => setActiveAnomaly(anomaly)}
                      className={`p-3 rounded-lg border cursor-pointer transition-all ${
                        activeAnomaly?.id === anomaly.id
                          ? 'bg-red-900/40 border-red-500/50'
                          : 'bg-slate-800/50 border-slate-700/50 hover:border-red-500/30'
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        <span className="text-lg">{getAnomalyIcon(anomaly.type)}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span
                              className="text-xs px-1.5 py-0.5 rounded"
                              style={{
                                backgroundColor: getAnomalyColor(anomaly.severity) + '30',
                                color: getAnomalyColor(anomaly.severity),
                              }}
                            >
                              {anomaly.severity === 'error' ? '错误' : '警告'}
                            </span>
                            <span className="text-xs text-slate-500">
                              {new Date(anomaly.timestamp).toLocaleTimeString()}
                            </span>
                          </div>
                          <p className="text-sm text-slate-300 mt-1 break-words">
                            {anomaly.message}
                          </p>
                          {anomaly.correction && (
                            <div className="mt-2 p-2 bg-emerald-900/30 rounded text-xs text-emerald-300">
                              ✅ {anomaly.correction.action}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
