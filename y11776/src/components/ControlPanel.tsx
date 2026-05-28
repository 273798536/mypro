import { useState, useEffect, useRef } from 'react';
import { useInterpolatorStore } from '../store/useInterpolatorStore';
import {
  Sliders,
  FunctionSquare,
  Hash,
  ArrowRightLeft,
  Calculator,
  Play,
  Save,
  FolderOpen,
  Upload,
} from 'lucide-react';
import { importConfigFromJson } from '../utils/export';

interface SliderControlProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
  unit?: string;
  icon?: React.ReactNode;
}

function SliderControl({ label, value, min, max, step, onChange, unit = '', icon }: SliderControlProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [localValue, setLocalValue] = useState(value);
  const debounceRef = useRef<number>();

  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  const handleChange = (newValue: number) => {
    const clamped = Math.max(min, Math.min(max, newValue));
    setLocalValue(clamped);
    
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    
    debounceRef.current = window.setTimeout(() => {
      onChange(clamped);
    }, 50);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-sm text-primary-300 flex items-center gap-2">
          {icon}
          {label}
        </label>
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleChange(localValue - step)}
            disabled={localValue <= min}
            className="w-6 h-6 flex items-center justify-center text-xs bg-primary-800/50 hover:bg-primary-700/50 disabled:opacity-30 disabled:cursor-not-allowed text-primary-300 rounded transition-colors"
          >
            −
          </button>
          <span className="text-sm font-mono text-primary-100 w-16 text-right">
            {localValue.toFixed(step < 1 ? 2 : 0)}{unit}
          </span>
          <button
            onClick={() => handleChange(localValue + step)}
            disabled={localValue >= max}
            className="w-6 h-6 flex items-center justify-center text-xs bg-primary-800/50 hover:bg-primary-700/50 disabled:opacity-30 disabled:cursor-not-allowed text-primary-300 rounded transition-colors"
          >
            +
          </button>
        </div>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={localValue}
        onChange={(e) => handleChange(Number(e.target.value))}
        onMouseDown={() => setIsDragging(true)}
        onMouseUp={() => setIsDragging(false)}
        className={`w-full h-2 bg-primary-800/50 rounded-lg appearance-none cursor-pointer
          ${isDragging ? 'accent-primary-400' : 'accent-primary-500'}
          [&::-webkit-slider-thumb]:appearance-none
          [&::-webkit-slider-thumb]:w-4
          [&::-webkit-slider-thumb]:h-4
          [&::-webkit-slider-thumb]:rounded-full
          [&::-webkit-slider-thumb]:bg-primary-500
          [&::-webkit-slider-thumb]:cursor-grab
          [&::-webkit-slider-thumb]:shadow-lg
          [&::-webkit-slider-thumb]:transition-all
          [&::-webkit-slider-thumb]:hover:scale-110
          [&::-webkit-slider-thumb]:active:cursor-grabbing`}
      />
      <div className="flex justify-between text-xs text-primary-600 font-mono">
        <span>{min}{unit}</span>
        <span>{max}{unit}</span>
      </div>
    </div>
  );
}

export default function ControlPanel() {
  const {
    config,
    setConfig,
    calculate,
    setShowPresetModal,
    importConfig,
    updateSource,
  } = useInterpolatorStore();

  const [funcExpr, setFuncExpr] = useState(config.functionExpression);
  const [source, setSource] = useState(config.source);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setFuncExpr(config.functionExpression);
    setSource(config.source);
  }, [config.functionExpression, config.source]);

  const handleFuncExprChange = (expr: string) => {
    setFuncExpr(expr);
  };

  const handleFuncExprBlur = () => {
    if (funcExpr.trim() && funcExpr !== config.functionExpression) {
      setConfig({ functionExpression: funcExpr.trim() });
    }
  };

  const handleSourceBlur = () => {
    if (source !== config.source) {
      updateSource(source);
    }
  };

  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const imported = importConfigFromJson(content);
        if (imported) {
          importConfig(imported);
        } else {
          alert('导入失败：无效的配置文件格式');
        }
      } catch (err) {
        alert('导入失败：文件读取错误');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handlePasteImport = async () => {
    try {
      const text = await navigator.clipboard.readText();
      const imported = importConfigFromJson(text);
      if (imported) {
        importConfig(imported);
      } else {
        alert('导入失败：剪贴板内容格式不正确');
      }
    } catch (err) {
      alert('导入失败：无法读取剪贴板');
    }
  };

  return (
    <div className="h-full flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-xl font-semibold text-primary-100 flex items-center gap-2">
          <Sliders size={20} />
          参数控制
        </h2>
        <div className="flex items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleFileImport}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-3 py-2 text-sm bg-primary-800/50 hover:bg-primary-700/50 text-primary-200 rounded-lg transition-colors flex items-center gap-2"
          >
            <Upload size={16} />
            导入
          </button>
          <button
            onClick={handlePasteImport}
            className="px-3 py-2 text-sm bg-primary-800/50 hover:bg-primary-700/50 text-primary-200 rounded-lg transition-colors flex items-center gap-2"
          >
            剪贴板导入
          </button>
        </div>
      </div>

      <div className="space-y-4 flex-1 overflow-y-auto pr-2">
        <div className="space-y-2">
          <label className="text-sm text-primary-300 flex items-center gap-2">
            <FunctionSquare size={16} />
            函数表达式 f(x) =
          </label>
          <input
            type="text"
            value={funcExpr}
            onChange={(e) => handleFuncExprChange(e.target.value)}
            onBlur={handleFuncExprBlur}
            onKeyDown={(e) => e.key === 'Enter' && handleFuncExprBlur()}
            className="w-full px-3 py-2 bg-primary-900/50 border border-primary-700/50 rounded-lg text-primary-100 font-mono text-sm focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 transition-colors"
            placeholder="例如: 1/(1+25*x^2)"
          />
          <p className="text-xs text-primary-500 font-mono">
            支持: +, -, *, /, ^, sin, cos, tan, exp, log, sqrt, abs, pi, e
          </p>
        </div>

        <div className="space-y-2">
          <label className="text-sm text-primary-300 flex items-center gap-2">
            <Calculator size={16} />
            插值方法
          </label>
          <div className="flex gap-2">
            <button
              onClick={() => setConfig({ method: 'lagrange' })}
              className={`flex-1 py-2 px-3 text-sm rounded-lg transition-all ${
                config.method === 'lagrange'
                  ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/25'
                  : 'bg-primary-800/50 text-primary-300 hover:bg-primary-700/50'
              }`}
            >
              拉格朗日
            </button>
            <button
              onClick={() => setConfig({ method: 'newton' })}
              className={`flex-1 py-2 px-3 text-sm rounded-lg transition-all ${
                config.method === 'newton'
                  ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/25'
                  : 'bg-primary-800/50 text-primary-300 hover:bg-primary-700/50'
              }`}
            >
              牛顿
            </button>
          </div>
        </div>

        <SliderControl
          label="插值阶数"
          value={config.order}
          min={1}
          max={20}
          step={1}
          onChange={(v) => setConfig({ order: v })}
          icon={<Hash size={16} />}
        />

        <SliderControl
          label="插值点数"
          value={config.pointCount}
          min={Math.max(2, config.order + 1)}
          max={50}
          step={1}
          onChange={(v) => setConfig({ pointCount: v })}
          icon={<Hash size={16} />}
        />

        <div className="grid grid-cols-2 gap-4">
          <SliderControl
            label="采样起点"
            value={config.sampleStart}
            min={-10}
            max={config.sampleEnd - 0.5}
            step={0.5}
            onChange={(v) => setConfig({ sampleStart: v })}
            icon={<ArrowRightLeft size={16} />}
          />
          <SliderControl
            label="采样终点"
            value={config.sampleEnd}
            min={config.sampleStart + 0.5}
            max={10}
            step={0.5}
            onChange={(v) => setConfig({ sampleEnd: v })}
            icon={<ArrowRightLeft size={16} />}
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm text-primary-300 flex items-center gap-2">
            <FolderOpen size={16} />
            数据来源
          </label>
          <input
            type="text"
            value={source}
            onChange={(e) => setSource(e.target.value)}
            onBlur={handleSourceBlur}
            className="w-full px-3 py-2 bg-primary-900/50 border border-primary-700/50 rounded-lg text-primary-100 text-sm focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 transition-colors"
            placeholder="记录数据来源，便于追溯"
          />
        </div>
      </div>

      <div className="flex gap-2 pt-4 border-t border-primary-800">
        <button
          onClick={calculate}
          className="flex-1 py-3 bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-400 hover:to-primary-500 text-white font-medium rounded-lg transition-all shadow-lg shadow-primary-500/25 hover:shadow-primary-500/40 flex items-center justify-center gap-2"
        >
          <Play size={18} />
          开始计算
        </button>
        <button
          onClick={() => setShowPresetModal(true)}
          className="px-4 py-3 bg-primary-800/50 hover:bg-primary-700/50 text-primary-200 rounded-lg transition-colors flex items-center justify-center gap-2"
        >
          <Save size={18} />
          预设
        </button>
      </div>
    </div>
  );
}
