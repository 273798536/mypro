import { cn } from '@/lib/utils';
import { ChevronRight, Home } from 'lucide-react';
import { Link } from 'react-router-dom';

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
  showHome?: boolean;
  className?: string;
}

export default function Breadcrumb({
  items,
  showHome = true,
  className,
}: BreadcrumbProps) {
  return (
    <nav
      className={cn(
        'flex items-center text-sm text-slate-600 dark:text-slate-400',
        className
      )}
      aria-label="Breadcrumb"
    >
      <ol className="flex items-center gap-1">
        {showHome && (
          <li className="flex items-center">
            <Link
              to="/"
              className="flex items-center gap-1 hover:text-primary-700 dark:hover:text-primary-400 transition-colors"
            >
              <Home className="w-4 h-4" />
              <span className="hidden sm:inline">首页</span>
            </Link>
            <ChevronRight className="w-4 h-4 mx-1 text-slate-400" />
          </li>
        )}
        {items.map((item, index) => (
          <li key={index} className="flex items-center">
            {item.href && index !== items.length - 1 ? (
              <>
                <Link
                  to={item.href}
                  className="hover:text-primary-700 dark:hover:text-primary-400 transition-colors"
                >
                  {item.label}
                </Link>
                <ChevronRight className="w-4 h-4 mx-1 text-slate-400" />
              </>
            ) : (
              <span
                className={cn(
                  'font-medium',
                  index === items.length - 1
                    ? 'text-slate-900 dark:text-slate-100'
                    : 'text-slate-600 dark:text-slate-400'
                )}
              >
                {item.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
