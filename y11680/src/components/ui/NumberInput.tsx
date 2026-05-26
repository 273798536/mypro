interface NumberInputProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
}

export default function NumberInput({ label, value, min, max, step, onChange }: NumberInputProps) {
  return (
    <div className="space-y-1">
      <label className="text-xs text-gray-400 block">{label}</label>
      <input
        type="number"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value) || min)}
        className="w-full px-2 py-1.5 bg-dark-900 border border-dark-900 rounded text-sm
          text-white focus:outline-none focus:border-primary-500 transition-colors
          font-mono"
      />
    </div>
  );
}
