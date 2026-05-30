import { ReactNode } from 'react';
import { Info } from 'lucide-react';

interface ParameterSliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
  unit?: string;
  description?: string;
  icon?: ReactNode;
  color?: string;
}

export function ParameterSlider({
  label,
  value,
  min,
  max,
  step,
  onChange,
  unit = '',
  description,
  icon,
  color = '#0EA5E9',
}: ParameterSliderProps) {
  const percentage = ((value - min) / (max - min)) * 100;

  return (
    <div className="mb-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          {icon && <span className="text-slate-400">{icon}</span>}
          <span className="text-sm text-slate-200 font-medium">{label}</span>
          {description && (
            <div className="relative group">
              <Info size={14} className="text-slate-500 cursor-help" />
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-slate-700 text-xs text-slate-200 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
                {description}
              </div>
            </div>
          )}
        </div>
        <div className="text-sm font-mono" style={{ color }}>
          {value.toFixed(step < 1 ? 2 : 0)}{unit && <span className="text-slate-500 ml-1">{unit}</span>}
        </div>
      </div>

      <div className="relative">
        <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-150"
            style={{ width: `${percentage}%`, backgroundColor: color }}
          />
        </div>
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
        <div
          className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full shadow-lg pointer-events-none border-2 transition-all duration-150"
          style={{
            left: `calc(${percentage}% - 8px)`,
            borderColor: color,
          }}
        />
      </div>

      <div className="flex justify-between mt-1 text-[10px] text-slate-500">
        <span>{min}{unit}</span>
        <span>{max}{unit}</span>
      </div>
    </div>
  );
}
