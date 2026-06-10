import React from 'react';
import clsx from 'clsx';

interface TableProps {
  children: React.ReactNode;
  className?: string;
}

export const Table: React.FC<TableProps> = ({ children, className }) => {
  return (
    <div className="overflow-x-auto">
      <table className={clsx('min-w-full divide-y divide-paper-200', className)}>
        {children}
      </table>
    </div>
  );
};

interface TableHeaderProps {
  children: React.ReactNode;
  className?: string;
}

export const TableHeader: React.FC<TableHeaderProps> = ({ children, className }) => {
  return (
    <thead className={clsx('bg-paper-50', className)}>
      {children}
    </thead>
  );
};

interface TableBodyProps {
  children: React.ReactNode;
  className?: string;
}

export const TableBody: React.FC<TableBodyProps> = ({ children, className }) => {
  return (
    <tbody className={clsx('bg-white divide-y divide-paper-100', className)}>
      {children}
    </tbody>
  );
};

interface TableRowProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
  onClick?: () => void;
}

export const TableRow: React.FC<TableRowProps> = ({ children, className, hover = true, onClick }) => {
  return (
    <tr
      className={clsx(
        hover && 'transition-colors duration-150 hover:bg-paper-50 cursor-pointer',
        onClick && 'cursor-pointer',
        className
      )}
      onClick={onClick}
    >
      {children}
    </tr>
  );
};

interface TableCellProps {
  children: React.ReactNode;
  className?: string;
  header?: boolean;
}

export const TableCell: React.FC<TableCellProps> = ({ children, className, header = false }) => {
  const baseClasses = header
    ? 'px-4 py-3 text-left text-xs font-semibold text-paper-700 uppercase tracking-wider'
    : 'px-4 py-3 text-sm text-paper-900 whitespace-nowrap';
  
  return (
    <td className={clsx(baseClasses, className)}>
      {children}
    </td>
  );
};

interface TableHeadProps {
  children: React.ReactNode;
  className?: string;
}

export const TableHead: React.FC<TableHeadProps> = ({ children, className }) => {
  return (
    <th className={clsx(
      'px-4 py-3 text-left text-xs font-semibold text-paper-700 uppercase tracking-wider',
      className
    )}>
      {children}
    </th>
  );
};
