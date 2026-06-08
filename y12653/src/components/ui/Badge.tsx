import { cn } from '@/lib/utils';

type BadgeVariant = 'default' | 'orange' | 'green' | 'red' | 'yellow';

interface BadgeProps {
  variant?: BadgeVariant;
  className?: string;
  children: React.ReactNode;
}

const variantStyles: Record<BadgeVariant, string> = {
  default: 'bg-steel-500 text-white',
  orange: 'bg-accent-orange text-white',
  green: 'bg-accent-green text-white',
  red: 'bg-accent-red text-white',
  yellow: 'bg-accent-yellow text-primary-900',
};

export default function Badge({ variant = 'default', className, children }: BadgeProps) {
  return (
    <span
      className={cn(
        'text-xs font-medium px-2 py-0.5 rounded inline-flex items-center',
        variantStyles[variant],
        className
      )}
    >
      {children}
    </span>
  );
}
