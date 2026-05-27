import { LengthUnit, MassUnit, TimeUnit, AngularVelocityUnit } from '../types';

interface UnitSelectorProps<T extends string> {
  value: T;
  onChange: (value: T) => void;
  options: { value: T; label: string }[];
  className?: string;
}

export function UnitSelector<T extends string>({
  value,
  onChange,
  options,
  className = '',
}: UnitSelectorProps<T>) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as T)}
      className={`px-2 py-1 text-sm bg-slate-700 border border-slate-600 rounded text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500 cursor-pointer ${className}`}
    >
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}

export const lengthUnitOptions = [
  { value: 'm' as LengthUnit, label: 'm' },
  { value: 'cm' as LengthUnit, label: 'cm' },
  { value: 'mm' as LengthUnit, label: 'mm' },
];

export const massUnitOptions = [
  { value: 'kg' as MassUnit, label: 'kg' },
  { value: 'g' as MassUnit, label: 'g' },
];

export const timeUnitOptions = [
  { value: 's' as TimeUnit, label: 's' },
  { value: 'ms' as TimeUnit, label: 'ms' },
];

export const angularVelocityUnitOptions = [
  { value: 'rad/s' as AngularVelocityUnit, label: 'rad/s' },
  { value: 'rpm' as AngularVelocityUnit, label: 'rpm' },
  { value: 'deg/s' as AngularVelocityUnit, label: 'deg/s' },
];
