import { FileSearch, Plus, Upload, Database } from 'lucide-react';
import { cn } from '@/lib/utils';

interface EmptyStateProps {
  icon?: 'search' | 'add' | 'upload' | 'data' | React.ReactNode;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

const iconMap = {
  search: FileSearch,
  add: Plus,
  upload: Upload,
  data: Database,
};

export function EmptyState({
  icon = 'search',
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  const isReactNode = typeof icon !== 'string';
  const IconComponent = isReactNode ? null : iconMap[icon as keyof typeof iconMap];

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center py-12 px-4 text-center',
        className
      )}
    >
      <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
        {isReactNode ? (
          <div className="text-slate-400">{icon}</div>
        ) : (
          IconComponent && <IconComponent className="w-8 h-8 text-slate-400" />
        )}
      </div>
      <h3 className="text-lg font-medium text-slate-800 mb-2">{title}</h3>
      <p className="text-sm text-slate-500 max-w-sm mb-6">{description}</p>
      {action && (
        <button
          onClick={action.onClick}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
