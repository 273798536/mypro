import { forwardRef, type HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';
import { X } from 'lucide-react';

export type TagVariant =
  | 'default'
  | 'primary'
  | 'success'
  | 'warning'
  | 'danger';

export interface TagProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: TagVariant;
  closable?: boolean;
  onClose?: () => void;
}

const variantStyles: Record<TagVariant, string> = {
  default: 'bg-slate-100 text-slate-600 border-slate-200',
  primary: 'bg-primary-50 text-primary-600 border-primary-200',
  success: 'bg-success-50 text-success-600 border-success-200',
  warning: 'bg-warning-50 text-warning-600 border-warning-200',
  danger: 'bg-danger-50 text-danger-600 border-danger-200',
};

export const Tag = forwardRef<HTMLSpanElement, TagProps>(
  (
    { className, variant = 'default', closable = false, onClose, ...props },
    ref
  ) => {
    return (
      <span
        ref={ref}
        className={cn(
          'inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-md border transition-colors',
          variantStyles[variant],
          className
        )}
        {...props}
      >
        {props.children}
        {closable && (
          <button
            type="button"
            onClick={onClose}
            className="ml-0.5 hover:bg-black/10 rounded p-0.5 transition-colors"
          >
            <X className="w-3 h-3" />
          </button>
        )}
      </span>
    );
  }
);

Tag.displayName = 'Tag';
