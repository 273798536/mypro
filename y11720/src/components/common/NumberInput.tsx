interface NumberInputProps {
  value: number | undefined;
  onChange: (value: number) => void;
  placeholder?: string;
  min?: number;
  max?: number;
  step?: number;
  className?: string;
  disabled?: boolean;
}

export default function NumberInput({
  value,
  onChange,
  placeholder,
  min,
  max,
  step = 0.01,
  className = '',
  disabled = false,
}: NumberInputProps) {
  return (
    <input
      type="number"
      value={value ?? ''}
      onChange={(e) => {
        const val = parseFloat(e.target.value);
        if (!isNaN(val)) {
          if (min !== undefined && val < min) return;
          if (max !== undefined && val > max) return;
          onChange(val);
        }
      }}
      placeholder={placeholder}
      min={min}
      max={max}
      step={step}
      className={`input font-mono ${className}`}
      disabled={disabled}
    />
  );
}
