import { useState } from 'react';
import { Plus, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import NumberInput from '../common/NumberInput';
import UnitSelect from '../common/UnitSelect';
import InfoTooltip from '../common/InfoTooltip';
import { getUnitOptions } from '../../utils/units';
import { VALVE_LIBRARY, getValveTypes } from '../../data/valves';
import { MATERIAL_LIBRARY } from '../../data/materials';
import { FLUID_LIBRARY } from '../../data/fluids';
import type { CalculationParams, ValveItem } from '../../types';

interface ParamsFormProps {
  params: CalculationParams;
  onChange: (params: CalculationParams) => void;
  errors: Array<{ field: string; message: string }>;
}

export default function ParamsForm({ params, onChange, errors }: ParamsFormProps) {
  const [showValves, setShowValves] = useState(true);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const updateField = <K extends keyof CalculationParams>(
    field: K,
    value: CalculationParams[K]
  ) => {
    onChange({ ...params, [field]: value });
  };

  const addValve = () => {
    const defaultValve = VALVE_LIBRARY[0];
    const newValve: ValveItem = {
      id: crypto.randomUUID(),
      type: defaultValve.type,
      count: 1,
      diameter: params.diameter,
      kValue: defaultValve.kValue,
    };
    onChange({ ...params, valves: [...params.valves, newValve] });
  };

  const updateValve = (index: number, updates: Partial<ValveItem>) => {
    const newValves = [...params.valves];
    newValves[index] = { ...newValves[index], ...updates };
    onChange({ ...params, valves: newValves });
  };

  const removeValve = (index: number) => {
    const newValves = params.valves.filter((_, i) => i !== index);
    onChange({ ...params, valves: newValves });
  };

  const handleValveTypeChange = (index: number, type: string) => {
    const valveOptions = VALVE_LIBRARY.filter((v) => v.type === type);
    const defaultK = valveOptions[0]?.kValue || 0.5;
    updateValve(index, { type, kValue: defaultK });
  };

  const getFieldError = (field: string) => {
    return errors.find((e) => e.field === field)?.message;
  };

  return (
    <div className="space-y-6">
      <div>
        <label className="label flex items-center gap-2">
          方案名称
          <InfoTooltip content="为当前计算方案命名，便于后续识别和对比" />
        </label>
        <input
          type="text"
          value={params.name}
          onChange={(e) => updateField('name', e.target.value as any)}
          className="input"
          placeholder="输入方案名称"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="label flex items-center gap-2">
            管径
            <InfoTooltip content="管道内径，影响流速和压降" />
          </label>
          <div className="flex gap-2">
            <NumberInput
              value={params.diameter}
              onChange={(v) => updateField('diameter', v as any)}
              min={0.1}
              step={1}
              className={getFieldError('diameter') ? 'border-red-500' : ''}
            />
            <UnitSelect
              value={params.diameterUnit}
              onChange={(v) => updateField('diameterUnit', v as any)}
              options={getUnitOptions('diameter')}
              className="w-24"
            />
          </div>
          {getFieldError('diameter') && (
            <p className="text-xs text-red-500 mt-1">{getFieldError('diameter')}</p>
          )}
        </div>

        <div>
          <label className="label flex items-center gap-2">
            流量
            <InfoTooltip content="流体体积流量" />
          </label>
          <div className="flex gap-2">
            <NumberInput
              value={params.flowRate}
              onChange={(v) => updateField('flowRate', v as any)}
              min={0}
              step={1}
              className={getFieldError('flowRate') ? 'border-red-500' : ''}
            />
            <UnitSelect
              value={params.flowRateUnit}
              onChange={(v) => updateField('flowRateUnit', v as any)}
              options={getUnitOptions('flowRate')}
              className="w-24"
            />
          </div>
          {getFieldError('flowRate') && (
            <p className="text-xs text-red-500 mt-1">{getFieldError('flowRate')}</p>
          )}
        </div>

        <div>
          <label className="label flex items-center gap-2">
            管长
            <InfoTooltip content="管道总长度" />
          </label>
          <div className="flex gap-2">
            <NumberInput
              value={params.pipeLength}
              onChange={(v) => updateField('pipeLength', v as any)}
              min={0.1}
              step={1}
              className={getFieldError('pipeLength') ? 'border-red-500' : ''}
            />
            <UnitSelect
              value={params.pipeLengthUnit}
              onChange={(v) => updateField('pipeLengthUnit', v as any)}
              options={getUnitOptions('length')}
              className="w-24"
            />
          </div>
          {getFieldError('pipeLength') && (
            <p className="text-xs text-red-500 mt-1">{getFieldError('pipeLength')}</p>
          )}
        </div>

        <div>
          <label className="label flex items-center gap-2">
            管材
            <InfoTooltip content="选择管材自动填充粗糙度" />
          </label>
          <select
            value=""
            onChange={(e) => {
              const material = MATERIAL_LIBRARY.find((m) => m.id === e.target.value);
              if (material) {
                onChange({
                  ...params,
                  roughness: material.roughness,
                  roughnessUnit: material.roughnessUnit,
                });
              }
            }}
            className="select"
          >
            <option value="">选择管材...</option>
            {MATERIAL_LIBRARY.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name} (ε = {m.roughness} {m.roughnessUnit})
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="label flex items-center gap-2">
            绝对粗糙度 (ε)
            <InfoTooltip content="管壁绝对粗糙度，影响湍流摩擦系数" />
          </label>
          <div className="flex gap-2">
            <NumberInput
              value={params.roughness}
              onChange={(v) => updateField('roughness', v as any)}
              min={0}
              step={0.001}
            />
            <UnitSelect
              value={params.roughnessUnit}
              onChange={(v) => updateField('roughnessUnit', v as any)}
              options={getUnitOptions('roughness')}
              className="w-24"
            />
          </div>
        </div>

        <div>
          <label className="label flex items-center gap-2">
            流体
            <InfoTooltip content="选择流体类型，自动填充密度和粘度" />
          </label>
          <select
            value={params.fluid.id}
            onChange={(e) => {
              const fluid = FLUID_LIBRARY.find((f) => f.id === e.target.value);
              if (fluid) {
                updateField('fluid', fluid as any);
              }
            }}
            className="select"
          >
            {FLUID_LIBRARY.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <button
        type="button"
        onClick={() => setShowAdvanced(!showAdvanced)}
        className="flex items-center gap-2 text-sm text-primary-600 hover:text-primary-700 font-medium"
      >
        {showAdvanced ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        高级流体参数
      </button>

      {showAdvanced && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg animate-fade-in-up">
          <div>
            <label className="label">密度 (kg/m³)</label>
            <NumberInput
              value={params.fluid.density}
              onChange={(v) => updateField('fluid', { ...params.fluid, density: v } as any)}
              min={0.1}
              step={0.1}
            />
          </div>
          <div>
            <label className="label">运动粘度 (m²/s)</label>
            <NumberInput
              value={params.fluid.viscosity}
              onChange={(v) => updateField('fluid', { ...params.fluid, viscosity: v } as any)}
              min={1e-8}
              step={1e-7}
            />
            <p className="text-xs text-gray-500 mt-1">
              20°C水: 1.004e-6 · 空气: 1.51e-5
            </p>
          </div>
        </div>
      )}

      <div className="border-t border-gray-200 pt-6">
        <button
          type="button"
          onClick={() => setShowValves(!showValves)}
          className="flex items-center justify-between w-full mb-4"
        >
          <span className="font-semibold text-gray-800 flex items-center gap-2">
            阀门 & 管件配置
            <span className="badge badge-info">
              {params.valves.length} 种 · {params.valves.reduce((s, v) => s + v.count, 0)} 个
            </span>
          </span>
          {showValves ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
        </button>

        {showValves && (
          <div className="space-y-4 animate-fade-in-up">
            {params.valves.length === 0 && (
              <p className="text-sm text-gray-500 text-center py-4 bg-gray-50 rounded-lg">
                暂无阀门配置，点击下方按钮添加
              </p>
            )}

            {params.valves.map((valve, index) => (
              <div key={valve.id} className="flex flex-wrap items-end gap-3 p-4 bg-gray-50 rounded-lg">
                <div className="flex-1 min-w-[150px]">
                  <label className="label">类型</label>
                  <select
                    value={valve.type}
                    onChange={(e) => handleValveTypeChange(index, e.target.value)}
                    className="select"
                  >
                    {getValveTypes().map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="w-24">
                  <label className="label">数量</label>
                  <NumberInput
                    value={valve.count}
                    onChange={(v) => updateValve(index, { count: v })}
                    min={1}
                    step={1}
                  />
                </div>

                <div className="w-28">
                  <label className="label">K值</label>
                  <NumberInput
                    value={valve.kValue}
                    onChange={(v) => updateValve(index, { kValue: v })}
                    min={0}
                    step={0.01}
                  />
                </div>

                <button
                  type="button"
                  onClick={() => removeValve(index)}
                  className="btn btn-danger !px-3 !py-2"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}

            <button type="button" onClick={addValve} className="btn btn-secondary w-full">
              <Plus className="w-4 h-4" />
              添加阀门/管件
            </button>
          </div>
        )}
      </div>

      <div className="pt-4">
        <label className="label">数据来源</label>
        <input
          type="text"
          value={params.source || ''}
          onChange={(e) => updateField('source', e.target.value as any)}
          className="input"
          placeholder="例如：项目编号、图纸编号等（可选）"
        />
      </div>
    </div>
  );
}
