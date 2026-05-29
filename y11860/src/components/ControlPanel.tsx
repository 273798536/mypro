import React from 'react';
import { Sliders, Play, RotateCcw, AlertTriangle, Zap, Activity, Layers } from 'lucide-react';
import { useWorkspaceStore } from '@/store/useWorkspaceStore';
import { radToDeg, degToRad } from '@/utils/kinematics';
import { getSampleResolutionOptions, getTestJointConfigs } from '@/utils/mockData';
import { statusColors, statusLabels } from '@/utils/colorMap';

export const ControlPanel: React.FC = () => {
  const {
    currentJointConfig,
    setJointAngle,
    setJointConfig,
    computeWorkspace,
    isComputing,
    sampleResolution,
    setSampleResolution,
    workspaceResult,
    diffResult,
    showDiff,
    setShowDiff,
    clearDiff,
  } = useWorkspaceStore();

  const handleJointChange = (index: number, valueDeg: number) => {
    setJointAngle(index, degToRad(valueDeg));
  };

  const handlePresetSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const presetName = e.target.value;
    const preset = getTestJointConfigs().find(p => p.name === presetName);
    if (preset) {
      setJointConfig(preset.config);
    }
  };

  const handleReset = () => {
    const defaultConfig = getTestJointConfigs()[0].config;
    setJointConfig(defaultConfig);
    clearDiff();
  };

  const isJointOutOfLimit = (index: number) => {
    const angle = currentJointConfig.jointAngles[index];
    const limit = currentJointConfig.jointLimits[index];
    return limit && (angle < limit.min || angle > limit.max);
  };

  return (
    <div className="space-y-4">
      <div className="bg-space-panel border border-space-border rounded-lg p-4 backdrop-blur-md">
        <div className="flex items-center gap-2 mb-4">
          <Sliders className="w-5 h-5 text-neon-cyan" />
          <h2 className="font-display text-lg text-neon-cyan">关节控制</h2>
        </div>

        <div className="mb-4">
          <label className="block text-xs text-gray-400 mb-2">预设姿态</label>
          <select
            className="w-full bg-space-bg border border-space-border rounded px-3 py-2 text-sm text-gray-200 focus:border-neon-cyan focus:outline-none"
            onChange={handlePresetSelect}
            defaultValue=""
          >
            <option value="" disabled>选择预设...</option>
            {getTestJointConfigs().map((preset) => (
              <option key={preset.name} value={preset.name}>
                {preset.name}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-3">
          {currentJointConfig.jointAngles.map((angle, index) => {
            const limit = currentJointConfig.jointLimits[index];
            const angleDeg = radToDeg(angle);
            const minDeg = limit ? radToDeg(limit.min) : -180;
            const maxDeg = limit ? radToDeg(limit.max) : 180;
            const outOfLimit = isJointOutOfLimit(index);

            return (
              <div key={index} className="space-y-1">
                <div className="flex justify-between items-center">
                  <span className={`text-sm font-medium ${outOfLimit ? 'text-warning-orange' : 'text-gray-300'}`}>
                    关节 {index + 1}
                    {outOfLimit && <AlertTriangle className="inline w-3 h-3 ml-1 animate-blink" />}
                  </span>
                  <span className={`font-mono text-xs ${outOfLimit ? 'text-warning-orange' : 'text-gray-400'}`}>
                    {angleDeg.toFixed(1)}° [{minDeg.toFixed(0)}°, {maxDeg.toFixed(0)}°]
                  </span>
                </div>
                <div className="relative h-2 bg-space-bg rounded-full overflow-hidden">
                  <div
                    className="absolute inset-y-0 bg-red-500/20"
                    style={{ left: '0%', width: `${((0 - minDeg) / (maxDeg - minDeg)) * 100}%` }}
                  />
                  <div
                    className="absolute inset-y-0 bg-red-500/20"
                    style={{ right: '0%', width: `${((maxDeg - 0) / (maxDeg - minDeg)) * 100}%` }}
                  />
                  <input
                    type="range"
                    min={minDeg}
                    max={maxDeg}
                    step={0.1}
                    value={angleDeg}
                    onChange={(e) => handleJointChange(index, parseFloat(e.target.value))}
                    className={`absolute inset-0 w-full opacity-0 cursor-pointer z-10`}
                  />
                  <div
                    className={`absolute top-0 h-full rounded-full transition-all ${
                      outOfLimit ? 'bg-warning-orange' : 'bg-neon-cyan'
                    }`}
                    style={{
                      left: `${Math.max(0, Math.min(100, ((angleDeg - minDeg) / (maxDeg - minDeg)) * 100))}%`,
                      width: '4px',
                      transform: 'translateX(-50%)',
                    }}
                  />
                  <div
                    className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full border-2 transition-all"
                    style={{
                      left: `${Math.max(0, Math.min(100, ((angleDeg - minDeg) / (maxDeg - minDeg)) * 100))}%`,
                      transform: 'translate(-50%, -50%)',
                      borderColor: outOfLimit ? '#ff9500' : '#00f0ff',
                      backgroundColor: outOfLimit ? '#ff9500' : '#0a0e1a',
                      boxShadow: outOfLimit
                        ? '0 0 10px rgba(255, 149, 0, 0.8)'
                        : '0 0 10px rgba(0, 240, 255, 0.8)',
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-4 pt-4 border-t border-space-border">
          <label className="block text-xs text-gray-400 mb-2">采样分辨率</label>
          <select
            className="w-full bg-space-bg border border-space-border rounded px-3 py-2 text-sm text-gray-200 focus:border-neon-cyan focus:outline-none"
            value={sampleResolution}
            onChange={(e) => setSampleResolution(parseInt(e.target.value))}
          >
            {getSampleResolutionOptions().map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex gap-2 mt-4">
          <button
            onClick={() => computeWorkspace()}
            disabled={isComputing}
            className="flex-1 flex items-center justify-center gap-2 bg-neon-cyan/20 hover:bg-neon-cyan/30 border border-neon-cyan text-neon-cyan py-2 px-4 rounded font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed animate-pulse-glow"
          >
            {isComputing ? (
              <>
                <Activity className="w-4 h-4 animate-spin" />
                计算中...
              </>
            ) : (
              <>
                <Play className="w-4 h-4" />
                运行分析
              </>
            )}
          </button>
          <button
            onClick={handleReset}
            className="flex items-center justify-center gap-2 bg-gray-700/50 hover:bg-gray-600/50 border border-gray-600 text-gray-300 py-2 px-4 rounded font-medium transition-all"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {workspaceResult && (
        <div className="bg-space-panel border border-space-border rounded-lg p-4 backdrop-blur-md">
          <div className="flex items-center gap-2 mb-4">
            <Layers className="w-5 h-5 text-neon-cyan" />
            <h2 className="font-display text-lg text-neon-cyan">统计信息</h2>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {Object.entries(workspaceResult.statistics).map(([key, value]) => {
              const statusKey = key as keyof typeof workspaceResult.statistics;
              const color = statusColors[statusKey as keyof typeof statusColors] || '#888';
              const label = statusLabels[statusKey as keyof typeof statusLabels] || key;
              const percentage = ((value / workspaceResult.statistics.total) * 100).toFixed(1);

              return (
                <div key={key} className="bg-space-bg/50 rounded p-2 border border-space-border/50">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-gray-400">{label}</span>
                    <span
                      className="text-xs font-mono"
                      style={{ color }}
                    >
                      {value}
                    </span>
                  </div>
                  <div className="h-1.5 bg-space-bg rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${percentage}%`,
                        backgroundColor: color,
                        boxShadow: `0 0 6px ${color}`,
                      }}
                    />
                  </div>
                  <div className="text-right text-xs text-gray-500 mt-0.5">{percentage}%</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {diffResult && (
        <div className="bg-space-panel border border-space-border rounded-lg p-4 backdrop-blur-md">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-diff-changed" />
              <h2 className="font-display text-lg text-diff-changed">差异对比</h2>
            </div>
            <button
              onClick={() => setShowDiff(!showDiff)}
              className={`px-2 py-1 text-xs rounded transition-all ${
                showDiff
                  ? 'bg-diff-changed/20 text-diff-changed border border-diff-changed'
                  : 'bg-gray-700/50 text-gray-400 border border-gray-600'
              }`}
            >
              {showDiff ? '显示差异' : '隐藏差异'}
            </button>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-diff-added" />
                <span className="text-gray-300">新增</span>
              </span>
              <span className="font-mono text-diff-added">{diffResult.added.length}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-diff-removed" />
                <span className="text-gray-300">消失</span>
              </span>
              <span className="font-mono text-diff-removed">{diffResult.removed.length}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-diff-changed" />
                <span className="text-gray-300">改变</span>
              </span>
              <span className="font-mono text-diff-changed">{diffResult.changed.length}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
