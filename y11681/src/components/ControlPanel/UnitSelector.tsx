import type { SpeedUnit } from '@/types/trajectory';

interface Props {
  value: SpeedUnit;
  onChange: (v: SpeedUnit) => void;
  className?: string;
}

export function UnitSelector({ value, onChange, className = '' }: Props) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as SpeedUnit)}
      className={`text-xs w-16 ${className}`}
    >
      <option value="m/s">m/s</option>
      <option value="km/h">km/h</option>
      <option value="mph">mph</option>
    </select>
  );
}
