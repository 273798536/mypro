import { ChevronRight, Home } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';

// 面包屑项类型
export interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
  className?: string;
  showHome?: boolean;
}

// 面包屑导航组件
export default function Breadcrumb({
  items,
  className,
  showHome = true,
}: BreadcrumbProps) {
  return (
    <nav
      aria-label="面包屑导航"
      className={cn('flex items-center text-sm', className)}
    >
      <ol className="flex items-center space-x-1">
        {/* 首页链接 */}
        {showHome && (
          <>
            <li>
              <Link
                to="/dashboard"
                className="flex items-center text-slate-500 transition-colors hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
              >
                <Home size={16} />
              </Link>
            </li>
            <li className="text-slate-300 dark:text-slate-600">
              <ChevronRight size={14} />
            </li>
          </>
        )}

        {/* 面包屑项列表 */}
        {items.map((item, index) => {
          const isLast = index === items.length - 1;

          return (
            <li key={index} className="flex items-center">
              {item.href && !isLast ? (
                <Link
                  to={item.href}
                  className="text-slate-500 transition-colors hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                >
                  {item.label}
                </Link>
              ) : (
                <span
                  className={cn(
                    'font-medium',
                    isLast
                      ? 'text-slate-900 dark:text-white'
                      : 'text-slate-500 dark:text-slate-400',
                  )}
                >
                  {item.label}
                </span>
              )}

              {!isLast && (
                <ChevronRight
                  size={14}
                  className="mx-1 text-slate-300 dark:text-slate-600"
                />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
