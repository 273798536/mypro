import React from 'react';
import { cn } from '@/lib/utils';

interface SliderProps {
  min: number;
  max: number;
  value: [number, number];
  onChange: (value: [number, number]) => void;
  label?: string;
  unit?: string;
  className?: string;
}

export const RangeSlider: React.FC<SliderProps> = ({
  min,
  max,
  value,
  onChange,
  label,
  unit = '',
  className,
}) => {
  const percentage1 = ((value[0] - min) / (max - min)) * 100;
  const percentage2 = ((value[1] - min) / (max - min)) * 100;

  const handleMinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newMin = Math.min(Number(e.target.value), value[1] - 1);
    onChange([newMin, value[1]]);
  };

  const handleMaxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newMax = Math.max(Number(e.target.value), value[0] + 1);
    onChange([value[0], newMax]);
  };

  return (
    <div className={cn('w-full', className)}>
      {label && (
        <div className="flex justify-between mb-2">
          <label className="text-sm text-white/70">{label}</label>
          <span className="text-sm font-mono text-white/90">
            {value[0]}{unit} - {value[1]}{unit}
          </span>
        </div>
      )}
      <div className="relative h-2">
        <div className="absolute inset-0 bg-white/10 rounded-full" />
        <div
          className="absolute h-full bg-gradient-to-r from-blue-500 to-cyan-400 rounded-full"
          style={{ left: `${percentage1}%`, right: `${100 - percentage2}%` }}
        />
        <input
          type="range"
          min={min}
          max={max}
          value={value[0]}
          onChange={handleMinChange}
          className="absolute w-full h-full opacity-0 cursor-pointer pointer-events-auto"
        />
        <input
          type="range"
          min={min}
          max={max}
          value={value[1]}
          onChange={handleMaxChange}
          className="absolute w-full h-full opacity-0 cursor-pointer pointer-events-auto"
        />
        <div
          className="absolute w-4 h-4 bg-white rounded-full shadow-lg transform -translate-x-1/2 -translate-y-1/2 top-1/2"
          style={{ left: `${percentage1}%` }}
        />
        <div
          className="absolute w-4 h-4 bg-white rounded-full shadow-lg transform -translate-x-1/2 -translate-y-1/2 top-1/2"
          style={{ left: `${percentage2}%` }}
        />
      </div>
      <div className="flex justify-between mt-1 text-xs text-white/50">
        <span>{min}{unit}</span>
        <span>{max}{unit}</span>
      </div>
    </div>
  );
};

interface SingleSliderProps {
  min: number;
  max: number;
  value: number;
  onChange: (value: number) => void;
  label?: string;
  unit?: string;
  className?: string;
}

export const SingleSlider: React.FC<SingleSliderProps> = ({
  min,
  max,
  value,
  onChange,
  label,
  unit = '',
  className,
}) => {
  const percentage = ((value - min) / (max - min)) * 100;

  return (
    <div className={cn('w-full', className)}>
      {label && (
        <div className="flex justify-between mb-2">
          <label className="text-sm text-white/70">{label}</label>
          <span className="text-sm font-mono text-white/90">
            {value}{unit}
          </span>
        </div>
      )}
      <div className="relative h-2">
        <div className="absolute inset-0 bg-white/10 rounded-full" />
        <div
          className="absolute h-full bg-gradient-to-r from-blue-500 to-cyan-400 rounded-full"
          style={{ width: `${percentage}%` }}
        />
        <input
          type="range"
          min={min}
          max={max}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="absolute w-full h-full opacity-0 cursor-pointer"
        />
        <div
          className="absolute w-4 h-4 bg-white rounded-full shadow-lg transform -translate-x-1/2 -translate-y-1/2 top-1/2"
          style={{ left: `${percentage}%` }}
        />
      </div>
    </div>
  );
};
