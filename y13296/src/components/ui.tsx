import clsx from 'clsx';
import { AlertTriangle, CheckCircle, XCircle, Info } from 'lucide-react';

type Severity = 'info' | 'warning' | 'error' | 'success';

interface BadgeProps {
  children: React.ReactNode;
  severity?: Severity;
  className?: string;
}

export function Badge({ children, severity = 'info', className }: BadgeProps) {
  const styles: Record<Severity, string> = {
    info: 'bg-blue-100 text-blue-700 border-blue-200',
    warning: 'bg-yellow-100 text-yellow-700 border-yellow-200',
    error: 'bg-red-100 text-red-700 border-red-200',
    success: 'bg-green-100 text-green-700 border-green-200',
  };

  return (
    <span className={clsx(
      'inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border',
      styles[severity],
      className
    )}>
      {children}
    </span>
  );
}

interface AlertProps {
  children: React.ReactNode;
  severity?: Severity;
  title?: string;
  className?: string;
}

export function Alert({ children, severity = 'info', title, className }: AlertProps) {
  const icons: Record<Severity, React.ReactNode> = {
    info: <Info className="w-5 h-5 text-blue-500" />,
    warning: <AlertTriangle className="w-5 h-5 text-yellow-500" />,
    error: <XCircle className="w-5 h-5 text-red-500" />,
    success: <CheckCircle className="w-5 h-5 text-green-500" />,
  };

  const styles: Record<Severity, string> = {
    info: 'bg-blue-50 border-blue-200 text-blue-800',
    warning: 'bg-yellow-50 border-yellow-200 text-yellow-800',
    error: 'bg-red-50 border-red-200 text-red-800',
    success: 'bg-green-50 border-green-200 text-green-800',
  };

  return (
    <div className={clsx('p-4 rounded-lg border', styles[severity], className)}>
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 mt-0.5">{icons[severity]}</div>
        <div className="flex-1">
          {title && <h4 className="font-medium mb-1">{title}</h4>}
          <div className="text-sm">{children}</div>
        </div>
      </div>
    </div>
  );
}

interface CardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
}

export function Card({ children, className, hover = false }: CardProps) {
  return (
    <div className={clsx(
      'bg-white rounded-xl border border-gray-200 shadow-sm',
      hover && 'hover:shadow-md transition-shadow',
      className
    )}>
      {children}
    </div>
  );
}

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
}

export function Button({ 
  children, 
  variant = 'primary', 
  size = 'md', 
  className, 
  disabled,
  ...props 
}: ButtonProps) {
  const variants = {
    primary: 'bg-park-600 hover:bg-park-700 text-white shadow-sm',
    secondary: 'bg-gray-100 hover:bg-gray-200 text-gray-800',
    danger: 'bg-red-600 hover:bg-red-700 text-white shadow-sm',
    ghost: 'hover:bg-gray-100 text-gray-600',
  };

  const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base',
  };

  return (
    <button
      className={clsx(
        'inline-flex items-center justify-center gap-2 font-medium rounded-lg transition-colors',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        variants[variant],
        sizes[size],
        className
      )}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
}

interface SectionHeaderProps {
  title: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  description?: string;
  badge?: React.ReactNode;
}

export function SectionHeader({ title, icon, action, description, badge }: SectionHeaderProps) {
  return (
    <div className="flex items-start justify-between mb-4">
      <div className="flex items-center gap-3">
        {icon && <div className="text-park-600">{icon}</div>}
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
            {badge}
          </div>
          {description && <p className="text-sm text-gray-500 mt-0.5">{description}</p>}
        </div>
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}
