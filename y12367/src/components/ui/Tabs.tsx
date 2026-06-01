import * as React from 'react';
import { cn } from '@/lib/utils';

interface TabsProps {
  value: string;
  onValueChange: (value: string) => void;
  children: React.ReactNode;
  className?: string;
}

export const Tabs: React.FC<TabsProps> = ({ value, onValueChange, children, className }) => {
  return (
    <div className={cn('w-full', className)}>
      {React.Children.map(children, (child) => {
        if (React.isValidElement(child)) {
          return React.cloneElement(child as React.ReactElement<any>, { activeTab: value, onTabChange: onValueChange });
        }
        return child;
      })}
    </div>
  );
};

interface TabsListProps extends React.HTMLAttributes<HTMLDivElement> {
  activeTab?: string;
  onTabChange?: (value: string) => void;
}

export const TabsList = React.forwardRef<HTMLDivElement, TabsListProps>(
  ({ className, children, activeTab, onTabChange, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('flex border-b border-industrial-border mb-4', className)}
      {...props}
    >
      {React.Children.map(children, (child) => {
        if (React.isValidElement(child)) {
          return React.cloneElement(child as React.ReactElement<any>, { activeTab, onTabChange });
        }
        return child;
      })}
    </div>
  )
);

TabsList.displayName = 'TabsList';

interface TabsTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  value: string;
  activeTab?: string;
  onTabChange?: (value: string) => void;
}

export const TabsTrigger = React.forwardRef<HTMLButtonElement, TabsTriggerProps>(
  ({ className, value, activeTab, onTabChange, children, ...props }, ref) => {
    const isActive = activeTab === value;
    return (
      <button
        ref={ref}
        onClick={() => onTabChange?.(value)}
        className={cn(
          'px-4 py-2 text-sm font-medium transition-all duration-200 border-b-2 -mb-px',
          isActive
            ? 'border-blue-500 text-blue-400'
            : 'border-transparent text-industrial-text-muted hover:text-industrial-text hover:border-industrial-border-light',
          className
        )}
        {...props}
      >
        {children}
      </button>
    );
  }
);

TabsTrigger.displayName = 'TabsTrigger';

interface TabsContentProps extends React.HTMLAttributes<HTMLDivElement> {
  value: string;
  activeTab?: string;
}

export const TabsContent = React.forwardRef<HTMLDivElement, TabsContentProps>(
  ({ className, value, activeTab, children, ...props }, ref) => {
    if (activeTab !== value) return null;
    return (
      <div ref={ref} className={cn('animate-in fade-in duration-200', className)} {...props}>
        {children}
      </div>
    );
  }
);

TabsContent.displayName = 'TabsContent';
