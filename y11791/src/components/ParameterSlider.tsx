import React from 'react';
import { PARAMETER_RANGES } from '../types/simulation';

interface ParameterSliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit: string;
  onChange: (value: number) => void;
  paramKey?: keyof typeof PARAMETER_RANGES;
}

export const ParameterSlider: React.FC<ParameterSliderProps> = ({
  label,
  value,
  min,
  max,
  step,
  unit,
  onChange,
  paramKey,
}) => {
  const isInRange = paramKey 
    ? value >= PARAMETER_RANGES[paramKey].min && value <= PARAMETER_RANGES[paramKey].max
    : true;

  return (
    <div className="mb-4">
      <div className="flex justify-between items-center mb-2">
        <label className="text-sm font-medium text-slate-700">{label}</label>
        <div className="flex items-center gap-1">
          <input
            type="number"
            value={value}
            onChange={(e) => onChange(Number(e.target.value))}
            className={`w-20 px-2 py-1 text-right text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400 ${
              isInRange ? 'border-slate-300' : 'border-red-400 bg-red-50'
            }`}
            step={step}
          />
          <span className="text-xs text-slate-500 w-12">{unit}</span>
        </div>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer slider"
        style={{
          background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${((value - min) / (max - min)) * 100}%, #e2e8f0 ${((value - min) / (max - min)) * 100}%, #e2e8f0 100%)`,
        }}
      />
      <div className="flex justify-between mt-1 text-xs text-slate-400">
        <span>{min}</span>
        <span>{max}</span>
      </div>
    </div>
  );
};
