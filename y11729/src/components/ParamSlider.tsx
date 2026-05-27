import React from 'react';
import { PARAM_LIMITS } from '../physics';
import type { SimulationParams } from '../physics';

interface ParamSliderProps {
  paramKey: keyof SimulationParams;
  value: number;
  onChange: (key: keyof SimulationParams, value: number) => void;
  label: string;
  unit: string;
  hasError?: boolean;
}

export const ParamSlider: React.FC<ParamSliderProps> = ({
  paramKey,
  value,
  onChange,
  label,
  unit,
  hasError,
}) => {
  const limits = PARAM_LIMITS[paramKey];

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = parseFloat(e.target.value);
    onChange(paramKey, Math.round(newValue / limits.step) * limits.step);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = parseFloat(e.target.value);
    if (!isNaN(newValue)) {
      const clamped = Math.max(limits.min, Math.min(limits.max, newValue));
      onChange(paramKey, Math.round(clamped / limits.step) * limits.step);
    }
  };

  const displayDecimals = limits.step < 0.01 ? 4 : limits.step < 0.1 ? 3 : limits.step < 1 ? 1 : 0;

  return (
    <div className={`mb-4 ${hasError ? 'animate-pulse' : ''}`}>
      <div className="flex justify-between items-center mb-1">
        <label className="text-sm font-medium text-gray-300">{label}</label>
        <div className="flex items-center gap-1">
          <input
            type="number"
            value={value.toFixed(displayDecimals)}
            onChange={handleInputChange}
            min={limits.min}
            max={limits.max}
            step={limits.step}
            className={`w-20 px-2 py-1 text-right text-sm bg-gray-700 border rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 ${
              hasError ? 'border-red-500 text-red-400' : 'border-gray-600 text-white'
            }`}
          />
          <span className="text-xs text-gray-400 w-8">{unit}</span>
        </div>
      </div>
      <input
        type="range"
        value={value}
        onChange={handleSliderChange}
        min={limits.min}
        max={limits.max}
        step={limits.step}
        className={`w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider ${
          hasError ? 'accent-red-500' : 'accent-green-500'
        }`}
      />
      <div className="flex justify-between text-xs text-gray-500 mt-1">
        <span>{limits.min}</span>
        <span>{limits.max}</span>
      </div>
    </div>
  );
};
