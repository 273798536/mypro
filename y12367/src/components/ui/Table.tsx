import * as React from 'react';
import { cn } from '@/lib/utils';
import type { AnomalyType } from '@/types';

interface TableProps extends React.TableHTMLAttributes<HTMLTableElement> {
  compact?: boolean;
}

export const Table = React.forwardRef<HTMLTableElement, TableProps>(
  ({ className, compact, ...props }, ref) => (
    <div className="w-full overflow-auto">
      <table
        ref={ref}
        className={cn('industrial-table', compact && 'text-xs', className)}
        {...props}
      />
    </div>
  )
);

Table.displayName = 'Table';

export const TableHeader = React.forwardRef<HTMLTableSectionElement, React.HTMLAttributes<HTMLTableSectionElement>>(
  ({ className, ...props }, ref) => (
    <thead ref={ref} className={cn(className)} {...props} />
  )
);

TableHeader.displayName = 'TableHeader';

export const TableBody = React.forwardRef<HTMLTableSectionElement, React.HTMLAttributes<HTMLTableSectionElement>>(
  ({ className, ...props }, ref) => (
    <tbody ref={ref} className={cn(className)} {...props} />
  )
);

TableBody.displayName = 'TableBody';

export const TableRow = React.forwardRef<HTMLTableRowElement, React.HTMLAttributes<HTMLTableRowElement> & { anomalyType?: AnomalyType }>(
  ({ className, anomalyType, ...props }, ref) => {
    const anomalyClasses = {
      speed_missing: 'anomaly-speed',
      temp_overlimit: 'anomaly-temp',
      power_reverse: 'anomaly-power',
    };

    return (
      <tr
        ref={ref}
        className={cn(anomalyType && anomalyClasses[anomalyType], className)}
        {...props}
      />
    );
  }
);

TableRow.displayName = 'TableRow';

export const TableHead = React.forwardRef<HTMLTableCellElement, React.ThHTMLAttributes<HTMLTableCellElement>>(
  ({ className, ...props }, ref) => (
    <th ref={ref} className={cn(className)} {...props} />
  )
);

TableHead.displayName = 'TableHead';

export const TableCell = React.forwardRef<HTMLTableCellElement, React.TdHTMLAttributes<HTMLTableCellElement>>(
  ({ className, ...props }, ref) => (
    <td ref={ref} className={cn('data-number', className)} {...props} />
  )
);

TableCell.displayName = 'TableCell';
