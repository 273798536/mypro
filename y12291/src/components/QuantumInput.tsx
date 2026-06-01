import { useState, useCallback } from 'react';
import { useBlochSphereStore } from '@/store/blochSphereStore';
import type { MeasurementBasis, ProbabilityBar } from '@/types/quantum';
import { cn } from '@/lib/utils';

type BasisType = MeasurementBasis['type'];

const BASIS_OPTIONS: { value: BasisType; label: string }[] = [
  { value: 'computational', label: '计算基 (Z)' },
  { value: 'hadamard', label: 'Hadamard 基 (X)' },
  { value: 'circular', label: '圆基 (Y)' },
  { value: 'custom', label: '自定义基' },
];

const BASIS_AXES: Record<BasisType, [number, number, number]> = {
  computational: [0, 0, 1],
  hadamard: [1, 0, 0],
  circular: [0, 1, 0],
  custom: [1, 1, 1],
};

export default function QuantumInput() {
  const { quantumStates, addQuantumState, updateMeasurementBasis, updateProbabilityBars, selectState } = useBlochSphereStore();
  const [theta, setTheta] = useState('');
  const [phi, setPhi] = useState('');
  const [alpha, setAlpha] = useState('');
  const [beta, setBeta] = useState('');
  const [label, setLabel] = useState('');
  const [targetId, setTargetId] = useState<string | null>(null);
  const [basisType, setBasisType] = useState<BasisType>('computational');
  const [barBasis, setBarBasis] = useState('');
  const [barValue, setBarValue] = useState('');
  const [barConfirmed, setBarConfirmed] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = useCallback((field: string, value: string) => {
    const num = Number(value);
    if (value === '') { setErrors((e) => ({ ...e, [field]: '必填' })); return false; }
    if (isNaN(num)) { setErrors((e) => ({ ...e, [field]: '需为数字' })); return false; }
    setErrors((e) => { const { [field]: _, ...rest } = e; return rest; });
    return true;
  }, []);

  const handleAddState = () => {
    const v1 = validate('theta', theta);
    const v2 = validate('phi', phi);
    const v3 = validate('alpha', alpha);
    const v4 = validate('beta', beta);
    if (!v1 || !v2 || !v3 || !v4) return;
    const id = addQuantumState({
      theta: Number(theta), phi: Number(phi),
      alpha: Number(alpha), beta: Number(beta),
      label: label || undefined,
    });
    setTargetId(id);
    selectState(id);
    setTheta(''); setPhi(''); setAlpha(''); setBeta(''); setLabel('');
    setErrors({});
  };

  const handleUpdateBasis = () => {
    if (!targetId) return;
    const basis: MeasurementBasis = { type: basisType, axis: BASIS_AXES[basisType] };
    if (basisType === 'custom') basis.customLabel = '自定义';
    updateMeasurementBasis(targetId, basis);
  };

  const handleAddBar = () => {
    if (!targetId || !barBasis || barValue === '') return;
    const val = Number(barValue);
    if (isNaN(val) || val < 0 || val > 1) {
      setErrors((e) => ({ ...e, barValue: '范围 [0, 1]' })); return;
    }
    const state = quantumStates[targetId];
    if (!state) return;
    const newBar: ProbabilityBar = { basis: barBasis, value: val, confirmed: barConfirmed, source: 'input' };
    updateProbabilityBars(targetId, [...state.probabilityBars, newBar]);
    setBarBasis(''); setBarValue(''); setBarConfirmed(false);
    setErrors((e) => { const { barValue: _, ...rest } = e; return rest; });
  };

  const stateList = Object.values(quantumStates);

  return (
    <div className="bg-[#0a0e1a] rounded-xl p-4 space-y-4 text-gray-200 font-sans">
      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-cyan-400">步骤1: 量子态参数</h3>
        <div className="grid grid-cols-2 gap-2">
          {([['theta', 'θ', theta, setTheta], ['phi', 'φ', phi, setPhi], ['alpha', 'α', alpha, setAlpha], ['beta', 'β', beta, setBeta]] as const).map(([f, lbl, val, set]) => (
            <div key={f}>
              <label className="text-xs text-gray-400">{lbl}</label>
              <input value={val} onChange={(e) => { set(e.target.value); validate(f, e.target.value); }}
                className={cn('w-full rounded bg-[#131927] px-2 py-1 text-sm font-mono [font-family:JetBrains_Mono,monospace] border',
                  errors[f] ? 'border-red-500' : 'border-gray-700 focus:border-cyan-500')} />
              {errors[f] && <span className="text-xs text-red-400">{errors[f]}</span>}
            </div>
          ))}
        </div>
        <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="标签 (可选)"
          className="w-full rounded bg-[#131927] px-2 py-1 text-sm border border-gray-700 focus:border-cyan-500" />
        <button onClick={handleAddState}
          className="w-full rounded bg-cyan-600 hover:bg-cyan-500 text-sm py-1.5 font-medium transition-colors">
          添加量子态
        </button>
      </div>

      {stateList.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-cyan-400">已有量子态</h3>
          <div className="flex flex-wrap gap-1.5">
            {stateList.map((s) => (
              <button key={s.id} onClick={() => { setTargetId(s.id); selectState(s.id); }}
                className={cn('rounded px-2 py-0.5 text-xs transition-colors',
                  targetId === s.id ? 'bg-cyan-600 text-white' : 'bg-[#1a2236] text-gray-300 hover:bg-[#243050]')}>
                {s.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {targetId && (
        <>
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-cyan-400">步骤2: 测量基</h3>
            <select value={basisType} onChange={(e) => setBasisType(e.target.value as BasisType)}
              className="w-full rounded bg-[#131927] px-2 py-1 text-sm border border-gray-700 text-gray-200">
              {BASIS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            <button onClick={handleUpdateBasis}
              className="w-full rounded bg-indigo-600 hover:bg-indigo-500 text-sm py-1.5 font-medium transition-colors">
              更新测量基
            </button>
          </div>

          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-cyan-400">步骤3: 概率条</h3>
            <input value={barBasis} onChange={(e) => setBarBasis(e.target.value)} placeholder="基名"
              className="w-full rounded bg-[#131927] px-2 py-1 text-sm border border-gray-700 focus:border-cyan-500" />
            <input value={barValue} onChange={(e) => { setBarValue(e.target.value); if (e.target.value) validate('barValue', e.target.value); }}
              type="number" min={0} max={1} step={0.01} placeholder="概率值 [0,1]"
              className={cn('w-full rounded bg-[#131927] px-2 py-1 text-sm font-mono [font-family:JetBrains_Mono,monospace] border',
                errors.barValue ? 'border-red-500' : 'border-gray-700 focus:border-cyan-500')} />
            {errors.barValue && <span className="text-xs text-red-400">{errors.barValue}</span>}
            <label className="flex items-center gap-2 text-xs text-gray-400">
              <input type="checkbox" checked={barConfirmed} onChange={(e) => setBarConfirmed(e.target.checked)}
                className="accent-cyan-500" /> 已确认
            </label>
            <button onClick={handleAddBar}
              className="w-full rounded bg-emerald-600 hover:bg-emerald-500 text-sm py-1.5 font-medium transition-colors">
              添加概率条
            </button>
          </div>
        </>
      )}
    </div>
  );
}
