import type { ReactNode, ThHTMLAttributes, TdHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

interface TableProps {
  children: ReactNode;
  className?: string;
}

export function Table({ children, className }: TableProps) {
  return (
    <div className="overflow-x-auto border border-slate-200 rounded-sm">
      <table className={cn('w-full text-sm', className)}>{children}</table>
    </div>
  );
}

export function Thead({ children }: { children: ReactNode }) {
  return (
    <thead className="bg-slate-50 border-b border-slate-200">
      <tr>{children}</tr>
    </thead>
  );
}

interface ThProps extends ThHTMLAttributes<HTMLTableCellElement> {
  children: ReactNode;
}

export function Th({ children, className, ...props }: ThProps) {
  return (
    <th
      className={cn(
        'px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap',
        className,
      )}
      {...props}
    >
      {children}
    </th>
  );
}

interface TrProps {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
}

export function Tr({ children, className, onClick }: TrProps) {
  return (
    <tr
      className={cn(
        'border-b border-slate-100 last:border-b-0 transition-colors',
        onClick && 'cursor-pointer hover:bg-slate-50',
        className,
      )}
      onClick={onClick}
    >
      {children}
    </tr>
  );
}

interface TdProps extends TdHTMLAttributes<HTMLTableCellElement> {
  children: ReactNode;
}

export function Td({ children, className, ...props }: TdProps) {
  return (
    <td className={cn('px-4 py-3 text-slate-700 align-middle', className)} {...props}>
      {children}
    </td>
  );
}
