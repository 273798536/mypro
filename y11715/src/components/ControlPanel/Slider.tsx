import React from 'react';
import { motion } from 'framer-motion';

interface SliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit: string;
  onChange: (value: number) => void;
  accentColor?: string;
}

export const Slider: React.FC<SliderProps> = ({
  label,
  value,
  min,
  max,
  step = 0.5,
  unit,
  onChange,
  accentColor = '#3b82f6',
}) => {
  const percentage = ((value - min) / (max - min)) * 100;

  return (
    <motion.div
      className="w-full space-y-2"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="flex justify-between items-center">
        <label className="text-sm font-medium text-slate-300">{label}</label>
        <span
          className="font-mono text-sm font-bold px-2 py-1 rounded bg-slate-800/50"
          style={{ color: accentColor }}
        >
          {value.toFixed(1)} {unit}
        </span>
      </div>
      <div className="relative">
        <div
          className="absolute left-0 top-1/2 -translate-y-1/2 h-1.5 rounded-full"
          style={{
            width: `${percentage}%`,
            background: `linear-gradient(to right, ${accentColor}, ${accentColor}aa)`,
          }}
        />
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          className="slider-track w-full relative z-10"
          style={{
            background: `linear-gradient(to right, ${accentColor} ${percentage}%, rgba(148, 163, 184, 0.2) ${percentage}%)`,
          }}
        />
      </div>
      <div className="flex justify-between text-xs text-slate-500">
        <span>{min}</span>
        <span>{(max / 2).toFixed(0)}</span>
        <span>{max}</span>
      </div>
    </motion.div>
  );
};
