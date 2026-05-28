import { formatCurrency } from '@/utils/formatters';

interface AmountDisplayProps {
  amount: number;
  currency?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  highlightNegative?: boolean;
}

const sizeClasses = {
  sm: 'text-sm font-medium',
  md: 'text-base font-semibold',
  lg: 'text-xl font-bold',
  xl: 'text-3xl font-black',
};

export function AmountDisplay({
  amount,
  currency = 'CNY',
  size = 'md',
  highlightNegative = true,
}: AmountDisplayProps) {
  const isNegative = amount < 0;
  const colorClass = highlightNegative && isNegative
    ? 'text-red-600'
    : 'text-slate-900';

  return (
    <span className={`font-mono tabular-nums ${sizeClasses[size]} ${colorClass}`}>
      {formatCurrency(amount, currency)}
    </span>
  );
}
