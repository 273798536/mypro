import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface PageContainerProps {
  title?: string;
  className?: string;
  children: ReactNode;
}

export default function PageContainer({ title, className, children }: PageContainerProps) {
  return (
    <div className={cn('min-h-screen bg-cream p-6', className)}>
      {title && <h1 className="mb-6 text-2xl font-bold text-navy">{title}</h1>}
      {children}
    </div>
  );
}
