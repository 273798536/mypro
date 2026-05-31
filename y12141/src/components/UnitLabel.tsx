interface UnitLabelProps {
  unit: string;
  className?: string;
}

export const UnitLabel = ({ unit, className = '' }: UnitLabelProps) => {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 text-xs font-mono bg-primary-800 text-primary-300 rounded border border-primary-700 ${className}`}
    >
      [{unit}]
    </span>
  );
};
