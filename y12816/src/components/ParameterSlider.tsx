interface ParameterSliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit: string;
  description?: string;
  warningThreshold?: { value: number; direction: 'above' | 'below'; message: string };
  onChange: (value: number) => void;
}

export default function ParameterSlider({
  label,
  value,
  min,
  max,
  step,
  unit,
  description,
  warningThreshold,
  onChange,
}: ParameterSliderProps) {
  const percent = ((value - min) / (max - min)) * 100;
  const hasWarning =
    warningThreshold &&
    (warningThreshold.direction === 'above'
      ? value > warningThreshold.value
      : value < warningThreshold.value);

  return (
    <div className="space-y-2">
      <div className="flex items-end justify-between">
        <div>
          <label className="block text-sm font-medium text-warm-800">{label}</label>
          {description && <p className="text-xs text-warm-500 mt-0.5">{description}</p>}
        </div>
        <div className="flex items-baseline gap-1">
          <span
            className={`font-mono text-lg font-semibold ${
              hasWarning ? 'text-rose-600 animate-number-flip' : 'text-teal-900'
            }`}
            key={value}
          >
            {value}
          </span>
          <span className="text-xs text-warm-500">{unit}</span>
        </div>
      </div>

      <div className="relative h-2 bg-warm-200 rounded-full overflow-hidden">
        <div
          className={`absolute inset-y-0 left-0 rounded-full transition-all duration-200 ${
            hasWarning ? 'bg-rose-500' : 'bg-teal-700'
          }`}
          style={{ width: `${percent}%` }}
        />
        {warningThreshold && (
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-amber-600"
            style={{
              left: `${((warningThreshold.value - min) / (max - min)) * 100}%`,
            }}
          />
        )}
      </div>

      <div className="flex items-center justify-between text-xs text-warm-400">
        <span>{min}{unit}</span>
        <span>{max}{unit}</span>
      </div>

      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full -mt-8 h-8 appearance-none bg-transparent cursor-pointer
          [&::-webkit-slider-thumb]:appearance-none
          [&::-webkit-slider-thumb]:w-4
          [&::-webkit-slider-thumb]:h-4
          [&::-webkit-slider-thumb]:rounded-full
          [&::-webkit-slider-thumb]:bg-teal-900
          [&::-webkit-slider-thumb]:border-2
          [&::-webkit-slider-thumb]:border-white
          [&::-webkit-slider-thumb]:shadow-md
          [&::-webkit-slider-thumb]:hover:scale-110
          [&::-webkit-slider-thumb]:transition-transform"
      />

      {hasWarning && warningThreshold && (
        <p className="text-xs text-rose-600 flex items-center gap-1 animate-pulse-soft">
          ⚠ {warningThreshold.message}
        </p>
      )}
    </div>
  );
}
