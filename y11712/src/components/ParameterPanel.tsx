import { useState } from 'react';
import { ChevronDown, ChevronUp, AlertTriangle, AlertCircle, CheckCircle } from 'lucide-react';
import { useSimulationStore } from '../store/simulationStore';
import type { SimulationParams } from '../types/simulation';

interface ParamInputProps {
  label: string;
  value: number;
  unit?: string;
  min?: number;
  max?: number;
  step?: number;
  onChange: (value: number) => void;
  hint?: string;
}

function ParamInput({ label, value, unit, min, max, step = 0.01, onChange, hint }: ParamInputProps) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between">
        <label className="text-xs text-slate-400">{label}</label>
        {unit && <span className="text-xs text-slate-500">{unit}</span>}
      </div>
      <div className="flex items-center gap-2">
        <input
          type="number"
          value={value}
          min={min}
          max={max}
          step={step}
          onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
          className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-sm text-slate-100 focus:border-blue-500 focus:outline-none"
        />
      </div>
      {hint && <p className="text-xs text-slate-500">{hint}</p>}
    </div>
  );
}

interface SectionProps {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

function Section({ title, children, defaultOpen = true }: SectionProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="border-b border-slate-700/50">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-3 py-2 text-left hover:bg-slate-800/50 transition-colors"
      >
        <span className="text-sm font-medium text-slate-200">{title}</span>
        {open ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
      </button>
      {open && <div className="px-3 pb-3 space-y-3">{children}</div>}
    </div>
  );
}

export default function ParameterPanel() {
  const { params, setParams, runSimulation, isComputing, stability } = useSimulationStore();

  const handleParamChange = (key: keyof SimulationParams, value: number) => {
    setParams({ [key]: value } as Partial<SimulationParams>);
  };

  const hasErrors = stability.errors.length > 0;
  const hasWarnings = stability.warnings.length > 0;

  return (
    <div className="w-72 bg-slate-900 border-r border-slate-700 flex flex-col h-full overflow-hidden">
      <div className="p-4 border-b border-slate-700">
        <h2 className="text-lg font-semibold text-slate-100">参数设置</h2>
        <p className="text-xs text-slate-500 mt-1">调整物理参数和边界条件</p>
      </div>

      <div className="flex-1 overflow-y-auto">
        <Section title="板材尺寸">
          <ParamInput
            label="长度"
            value={params.plateLength}
            unit="m"
            min={0.001}
            step={0.01}
            onChange={(v) => handleParamChange('plateLength', v)}
          />
          <ParamInput
            label="宽度"
            value={params.plateWidth}
            unit="m"
            min={0.001}
            step={0.01}
            onChange={(v) => handleParamChange('plateWidth', v)}
          />
        </Section>

        <Section title="材料属性" defaultOpen={false}>
          <ParamInput
            label="材料名称"
            value={params.materialName as unknown as number}
            onChange={() => {}}
          />
          <ParamInput
            label="导热系数"
            value={params.thermalConductivity}
            unit="W/(m·K)"
            min={0.1}
            step={1}
            onChange={(v) => handleParamChange('thermalConductivity', v)}
          />
          <ParamInput
            label="比热容"
            value={params.specificHeat}
            unit="J/(kg·K)"
            min={1}
            step={10}
            onChange={(v) => handleParamChange('specificHeat', v)}
          />
          <ParamInput
            label="密度"
            value={params.density}
            unit="kg/m³"
            min={1}
            step={10}
            onChange={(v) => handleParamChange('density', v)}
          />
        </Section>

        <Section title="边界温度" defaultOpen={false}>
          <ParamInput
            label="顶部"
            value={params.boundaryTempTop}
            unit="°C"
            step={1}
            onChange={(v) => handleParamChange('boundaryTempTop', v)}
          />
          <ParamInput
            label="底部"
            value={params.boundaryTempBottom}
            unit="°C"
            step={1}
            onChange={(v) => handleParamChange('boundaryTempBottom', v)}
          />
          <ParamInput
            label="左侧"
            value={params.boundaryTempLeft}
            unit="°C"
            step={1}
            onChange={(v) => handleParamChange('boundaryTempLeft', v)}
          />
          <ParamInput
            label="右侧"
            value={params.boundaryTempRight}
            unit="°C"
            step={1}
            onChange={(v) => handleParamChange('boundaryTempRight', v)}
          />
          <ParamInput
            label="初始温度"
            value={params.initialTemp}
            unit="°C"
            step={1}
            onChange={(v) => handleParamChange('initialTemp', v)}
          />
        </Section>

        <Section title="网格设置">
          <ParamInput
            label="X方向步长"
            value={params.gridStepX}
            unit="m"
            min={0.001}
            step={0.001}
            onChange={(v) => handleParamChange('gridStepX', v)}
            hint={`网格数: ${Math.floor(params.plateLength / params.gridStepX) + 1}`}
          />
          <ParamInput
            label="Y方向步长"
            value={params.gridStepY}
            unit="m"
            min={0.001}
            step={0.001}
            onChange={(v) => handleParamChange('gridStepY', v)}
            hint={`网格数: ${Math.floor(params.plateWidth / params.gridStepY) + 1}`}
          />
        </Section>

        <Section title="时间设置">
          <ParamInput
            label="时间步长"
            value={params.timeStep}
            unit="s"
            min={0.0001}
            step={0.001}
            onChange={(v) => handleParamChange('timeStep', v)}
            hint={`稳定上限: ${stability.maxStableTimeStep.toExponential(2)} s`}
          />
          <ParamInput
            label="总时间"
            value={params.totalTime}
            unit="s"
            min={0.01}
            step={0.1}
            onChange={(v) => handleParamChange('totalTime', v)}
            hint={`时间步数: ${Math.floor(params.totalTime / params.timeStep) + 1}`}
          />
        </Section>
      </div>

      <div className="p-3 border-t border-slate-700 space-y-2">
        {(hasErrors || hasWarnings) && (
          <div className={`flex items-center gap-2 text-xs px-2 py-1.5 rounded ${
            hasErrors ? 'bg-red-900/30 text-red-400' : 'bg-amber-900/30 text-amber-400'
          }`}>
            {hasErrors ? <AlertCircle size={14} /> : <AlertTriangle size={14} />}
            <span>
              {hasErrors
                ? `${stability.errors.length} 个错误需修正`
                : `${stability.warnings.length} 个警告需注意`}
            </span>
          </div>
        )}

        <button
          onClick={runSimulation}
          disabled={hasErrors || isComputing}
          className={`w-full py-2.5 px-4 rounded-lg font-medium text-sm transition-all ${
            hasErrors || isComputing
              ? 'bg-slate-700 text-slate-500 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-500 text-white'
          }`}
        >
          {isComputing ? '计算中...' : hasErrors ? '参数有误' : '开始模拟'}
        </button>
      </div>
    </div>
  );
}
