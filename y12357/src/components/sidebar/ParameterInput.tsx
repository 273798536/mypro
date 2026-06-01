import { useState } from 'react';
import { Settings, Upload, Plus } from 'lucide-react';
import type { Flywheel } from '../../types';
import { useAppStore, useFlywheelErrors } from '../../store/useAppStore';
import { convertFromMeters } from '../../utils/unitConverter';
import { suggestFrictionCoefficient } from '../../engine/frictionCorrector';

interface ParameterInputProps {
  flywheel: Flywheel | null;
}

export function ParameterInput({ flywheel }: ParameterInputProps) {
  const { flywheels, selectedFlywheelId, setSelectedFlywheel, updateFlywheel } = useAppStore();
  const { unitErrors, frictionOmissions } = useFlywheelErrors(flywheel?.id);
  
  const [radiusValue, setRadiusValue] = useState(flywheel?.rawRadiusInput || '');
  const [radiusUnit, setRadiusUnit] = useState<'mm' | 'cm' | 'm'>(flywheel?.radiusUnit || 'm');
  const [massValue, setMassValue] = useState(flywheel?.mass.toString() || '');
  const [frictionValue, setFrictionValue] = useState(flywheel?.frictionCoeff?.toString() || '');
  const [materialValue, setMaterialValue] = useState(flywheel?.material || '');
  
  const hasRadiusError = unitErrors.some(e => e.field === 'radius');
  const hasFrictionOmission = frictionOmissions.length > 0;
  
  const handleRadiusChange = (value: string) => {
    setRadiusValue(value);
    if (flywheel) {
      const updated: Flywheel = {
        ...flywheel,
        rawRadiusInput: value,
        radiusUnit,
      };
      updateFlywheel(updated);
    }
  };
  
  const handleUnitChange = (unit: 'mm' | 'cm' | 'm') => {
    setRadiusUnit(unit);
    if (flywheel && radiusValue) {
      const numValue = parseFloat(radiusValue);
      if (!isNaN(numValue)) {
        const updated: Flywheel = {
          ...flywheel,
          radiusUnit: unit,
        };
        updateFlywheel(updated);
      }
    }
  };
  
  const handleMassChange = (value: string) => {
    setMassValue(value);
    if (flywheel) {
      const numValue = parseFloat(value);
      if (!isNaN(numValue)) {
        const updated: Flywheel = {
          ...flywheel,
          mass: numValue,
        };
        updateFlywheel(updated);
      }
    }
  };
  
  const handleFrictionChange = (value: string) => {
    setFrictionValue(value);
    if (flywheel) {
      const numValue = parseFloat(value);
      const updated: Flywheel = {
        ...flywheel,
        frictionCoeff: value === '' ? null : (isNaN(numValue) ? null : numValue),
      };
      updateFlywheel(updated);
    }
  };
  
  const handleMaterialChange = (value: string) => {
    setMaterialValue(value);
    if (flywheel) {
      const updated: Flywheel = {
        ...flywheel,
        material: value,
      };
      updateFlywheel(updated);
      
      if (value && (!frictionValue || parseFloat(frictionValue) === 0)) {
        const suggested = suggestFrictionCoefficient(value);
        setFrictionValue(suggested.toString());
      }
    }
  };
  
  const handleFlywheelSelect = (id: string) => {
    const selected = flywheels.find(f => f.id === id);
    if (selected) {
      setSelectedFlywheel(id);
      setRadiusValue(selected.rawRadiusInput);
      setRadiusUnit(selected.radiusUnit);
      setMassValue(selected.mass.toString());
      setFrictionValue(selected.frictionCoeff?.toString() || '');
      setMaterialValue(selected.material);
    }
  };
  
  if (!flywheel) {
    return (
      <div className="industrial-card p-4">
        <div className="section-title flex items-center gap-2">
          <Settings size={14} />
          参数设置
        </div>
        <p className="text-industrial-500 text-sm">请选择一个飞轮</p>
      </div>
    );
  }
  
  return (
    <div className={`industrial-card p-4 ${hasFrictionOmission ? 'animate-border-pulse' : ''}`}>
      <div className="section-title flex items-center gap-2">
        <Settings size={14} />
        参数设置
      </div>
      
      <div className="mb-4">
        <label className="data-label block mb-1">飞轮选择</label>
        <select
          value={selectedFlywheelId || ''}
          onChange={(e) => handleFlywheelSelect(e.target.value)}
          className="industrial-input w-full"
        >
          {flywheels.map(fw => (
            <option key={fw.id} value={fw.id}>
              {fw.name} ({fw.batchNo})
            </option>
          ))}
        </select>
      </div>
      
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div>
          <label className="data-label block mb-1">材料</label>
          <input
            type="text"
            value={materialValue}
            onChange={(e) => handleMaterialChange(e.target.value)}
            className="industrial-input w-full"
            placeholder="45号钢"
          />
        </div>
        <div>
          <label className="data-label block mb-1">批次号</label>
          <input
            type="text"
            value={flywheel.batchNo}
            disabled
            className="industrial-input w-full bg-industrial-900/50 text-industrial-500"
          />
        </div>
      </div>
      
      <div className="mb-4">
        <label className="data-label block mb-1">飞轮半径</label>
        <div className="flex gap-2">
          <input
            type="text"
            value={radiusValue}
            onChange={(e) => handleRadiusChange(e.target.value)}
            className={`industrial-input flex-1 ${hasRadiusError ? 'industrial-input-error' : ''}`}
            placeholder="输入半径"
          />
          <select
            value={radiusUnit}
            onChange={(e) => handleUnitChange(e.target.value as 'mm' | 'cm' | 'm')}
            className="industrial-input w-20"
          >
            <option value="mm">mm</option>
            <option value="cm">cm</option>
            <option value="m">m</option>
          </select>
        </div>
        <div className="flex justify-between mt-1">
          <span className="data-label">换算值: {flywheel.radius.toFixed(4)} m</span>
          {hasRadiusError && (
            <span className="text-xs text-alert-red">单位不一致</span>
          )}
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div>
          <label className="data-label block mb-1">质量 (kg)</label>
          <input
            type="number"
            value={massValue}
            onChange={(e) => handleMassChange(e.target.value)}
            className="industrial-input w-full"
            placeholder="120"
            step="0.1"
          />
        </div>
        <div>
          <label className="data-label block mb-1">摩擦系数</label>
          <input
            type="number"
            value={frictionValue}
            onChange={(e) => handleFrictionChange(e.target.value)}
            className={`industrial-input w-full ${hasFrictionOmission ? 'industrial-input-error' : ''}`}
            placeholder="0.025"
            step="0.001"
          />
        </div>
      </div>
      
      {hasFrictionOmission && (
        <div className="error-alert text-xs mb-4">
          {frictionOmissions.map(o => (
            <div key={o.id}>
              【摩擦修正遗漏】{o.batchNo}批次{o.materialName}摩擦系数未配置，
              建议配置标准值 {suggestFrictionCoefficient(o.materialName)}
              <button
                onClick={() => {
                  const suggested = suggestFrictionCoefficient(o.materialName);
                  setFrictionValue(suggested.toString());
                  handleFrictionChange(suggested.toString());
                }}
                className="ml-2 underline hover:text-white"
              >
                一键填充
              </button>
            </div>
          ))}
        </div>
      )}
      
      <div className="flex gap-2">
        <button className="industrial-btn flex-1 flex items-center justify-center gap-1.5">
          <Upload size={14} />
          导入角速度
        </button>
        <button className="industrial-btn flex-1 flex items-center justify-center gap-1.5">
          <Plus size={14} />
          添加记录
        </button>
      </div>
    </div>
  );
}
