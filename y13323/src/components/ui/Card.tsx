import { ReactNode } from 'react';
import clsx from 'clsx';

interface CardProps {
  children: ReactNode;
  className?: string;
  hover?: boolean;
  onClick?: () => void;
}

export default function Card({ children, className = '', hover = false, onClick }: CardProps) {
  return (
    <div
      className={clsx(
        'bg-white border border-gray-200 rounded-lg shadow-sm',
        hover && 'cursor-pointer transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 hover:border-gray-300',
        className
      )}
      onClick={onClick}
    >
      {children}
    </div>
  );
}
