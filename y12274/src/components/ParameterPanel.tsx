import { useState } from 'react';
import { Sliders, Plus, Trash2, Palette } from 'lucide-react';
import { useWorkspaceStore } from '../store/workspaceStore';
import { Parameter, ColorRule } from '../types';

const COLOR_MODES: { value: ColorRule['mode']; label: string }[] = [
  { value: 'normal', label: '法向量' },
  { value: 'height', label: '高度' },
  { value: 'gradient', label: '梯度' },
  { value: 'curvature', label: '曲率' },
];

const COLORMAPS = ['viridis', 'plasma', 'inferno', 'magma'];

export default function ParameterPanel() {
  const currentFormula = useWorkspaceStore((state) => state.currentFormula);
  const parameters = useWorkspaceStore((state) => state.parameters);
  const updateParameter = useWorkspaceStore((state) => state.updateParameter);
  const addParameter = useWorkspaceStore((state) => state.addParameter);
  const removeParameter = useWorkspaceStore((state) => state.removeParameter);
  const updateColorRule = useWorkspaceStore((state) => state.updateColorRule);

  const [showAddParam, setShowAddParam] = useState(false);
  const [newParam, setNewParam] = useState({
    name: '',
    value: 1,
    min: 0,
    max: 5,
    step: 0.1,
  });

  const handleAddParameter = () => {
    if (!newParam.name.trim()) return;
    addParameter({
      name: newParam.name.trim(),
      value: newParam.value,
      min: newParam.min,
      max: newParam.max,
      step: newParam.step,
    });
    setNewParam({ name: '', value: 1, min: 0, max: 5, step: 0.1 });
    setShowAddParam(false);
  };

  if (!currentFormula) return null;

  return (
    <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-slate-200 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-amber-400"></span>
          参数控制
        </h3>
        <button
          onClick={() => setShowAddParam(!showAddParam)}
          className="p-1.5 rounded hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition-colors"
          title="添加参数"
        >
          <Plus size={16} />
        </button>
      </div>

      {showAddParam && (
        <div className="mb-4 p-3 bg-slate-900/50 rounded border border-slate-600">
          <div className="grid grid-cols-2 gap-2 mb-2">
            <input
              type="text"
              placeholder="参数名"
              value={newParam.name}
              onChange={(e) => setNewParam({ ...newParam, name: e.target.value })}
              className="px-2 py-1.5 text-xs bg-slate-800 border border-slate-600 rounded text-slate-200 focus:outline-none focus:border-cyan-500"
            />
            <input
              type="number"
              placeholder="默认值"
              value={newParam.value}
              onChange={(e) => setNewParam({ ...newParam, value: Number(e.target.value) })}
              className="px-2 py-1.5 text-xs bg-slate-800 border border-slate-600 rounded text-slate-200 focus:outline-none focus:border-cyan-500"
            />
            <input
              type="number"
              placeholder="最小值"
              value={newParam.min}
              onChange={(e) => setNewParam({ ...newParam, min: Number(e.target.value) })}
              className="px-2 py-1.5 text-xs bg-slate-800 border border-slate-600 rounded text-slate-200 focus:outline-none focus:border-cyan-500"
            />
            <input
              type="number"
              placeholder="最大值"
              value={newParam.max}
              onChange={(e) => setNewParam({ ...newParam, max: Number(e.target.value) })}
              className="px-2 py-1.5 text-xs bg-slate-800 border border-slate-600 rounded text-slate-200 focus:outline-none focus:border-cyan-500"
            />
          </div>
          <div className="flex justify-end gap-2">
            <button
              onClick={() => setShowAddParam(false)}
              className="px-3 py-1 text-xs text-slate-400 hover:text-slate-200 transition-colors"
            >
              取消
            </button>
            <button
              onClick={handleAddParameter}
              className="px-3 py-1 text-xs bg-cyan-600 hover:bg-cyan-500 text-white rounded transition-colors"
            >
              添加
            </button>
          </div>
        </div>
      )}

      {currentFormula.parameters.length === 0 ? (
        <p className="text-xs text-slate-500 text-center py-4">
          暂无参数，点击 + 添加
        </p>
      ) : (
        <div className="space-y-4">
          {currentFormula.parameters.map((param) => (
            <div key={param.name} className="group">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-mono text-slate-300">
                  {param.name}
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-cyan-400 font-mono">
                    {parameters[param.name]?.toFixed(2) ?? param.value.toFixed(2)}
                  </span>
                  <button
                    onClick={() => removeParameter(param.name)}
                    className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-900/50 text-slate-500 hover:text-red-400 rounded transition-all"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
              <input
                type="range"
                min={param.min}
                max={param.max}
                step={param.step}
                value={parameters[param.name] ?? param.value}
                onChange={(e) => updateParameter(param.name, Number(e.target.value))}
                className="w-full h-1.5 bg-slate-700 rounded-full appearance-none cursor-pointer
                  [&::-webkit-slider-thumb]:appearance-none
                  [&::-webkit-slider-thumb]:w-3
                  [&::-webkit-slider-thumb]:h-3
                  [&::-webkit-slider-thumb]:rounded-full
                  [&::-webkit-slider-thumb]:bg-cyan-400
                  [&::-webkit-slider-thumb]:shadow-lg
                  [&::-webkit-slider-thumb]:cursor-pointer
                  [&::-webkit-slider-thumb]:transition-transform
                  [&::-webkit-slider-thumb]:hover:scale-125"
              />
              <div className="flex justify-between text-[10px] text-slate-500">
                <span>{param.min}</span>
                <span>{param.max}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-6 pt-4 border-t border-slate-700">
        <h4 className="text-xs font-medium text-slate-300 flex items-center gap-2 mb-3">
          <Palette size={14} className="text-purple-400" />
          着色规则
        </h4>
        
        <div className="space-y-3">
          <div>
            <label className="text-[11px] text-slate-400 mb-1 block">着色模式</label>
            <div className="grid grid-cols-4 gap-1">
              {COLOR_MODES.map((mode) => (
                <button
                  key={mode.value}
                  onClick={() => updateColorRule({ mode: mode.value })}
                  className={`px-2 py-1.5 text-[10px] rounded transition-colors ${
                    currentFormula.colorRule.mode === mode.value
                      ? 'bg-cyan-600 text-white'
                      : 'bg-slate-700/50 text-slate-400 hover:bg-slate-600 hover:text-slate-200'
                  }`}
                >
                  {mode.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-[11px] text-slate-400 mb-1 block">配色方案</label>
            <div className="grid grid-cols-4 gap-1">
              {COLORMAPS.map((cm) => (
                <button
                  key={cm}
                  onClick={() => updateColorRule({ colormap: cm })}
                  className={`px-2 py-1.5 text-[10px] rounded capitalize transition-colors ${
                    currentFormula.colorRule.colormap === cm
                      ? 'bg-cyan-600 text-white'
                      : 'bg-slate-700/50 text-slate-400 hover:bg-slate-600 hover:text-slate-200'
                  }`}
                >
                  {cm}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
