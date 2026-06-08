import { useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import {
  ClipboardList,
  FileText,
  Menu,
  X,
  ChevronRight,
  User,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface AppLayoutProps {
  children?: React.ReactNode;
  title?: string;
  breadcrumb?: Array<{ label: string; to?: string }>;
  operator?: string;
}

const TITLE_MAP: Record<string, string> = {
  '/inspections': '检查记录',
  '/docs': '说明文档',
};

const NAV_ITEMS = [
  { to: '/inspections', label: '检查记录', icon: ClipboardList },
  { to: '/docs', label: '说明文档', icon: FileText },
];

export default function AppLayout({
  children,
  title,
  breadcrumb,
  operator = '舞台统筹',
}: AppLayoutProps) {
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const resolvedTitle =
    title ?? TITLE_MAP[location.pathname] ?? '检查记录';

  return (
    <div className="flex h-screen bg-cream overflow-hidden">
      <aside
        className={cn(
          'bg-brand-500 text-white flex flex-col transition-all duration-300 flex-shrink-0',
          sidebarOpen ? 'w-60' : 'w-16'
        )}
      >
        <div className="h-16 flex items-center px-4 border-b border-brand-600 flex-shrink-0">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-8 h-8 bg-white/10 rounded flex-shrink-0 flex items-center justify-center">
              <ClipboardList className="w-5 h-5" />
            </div>
            {sidebarOpen && (
              <span className="font-display font-semibold text-sm whitespace-nowrap">
                地下车库净空检查
              </span>
            )}
          </div>
        </div>

        <nav className="flex-1 py-4 overflow-y-auto scrollbar-thin">
          <ul className="space-y-1 px-3">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              return (
                <li key={item.to}>
                  <NavLink
                    to={item.to}
                    className={({ isActive }) =>
                      cn(
                        'flex items-center gap-3 px-3 py-2.5 rounded text-sm transition-colors',
                        'hover:bg-brand-600',
                        isActive ? 'bg-brand-600 text-white' : 'text-brand-100'
                      )
                    }
                  >
                    <Icon className="w-5 h-5 flex-shrink-0" />
                    {sidebarOpen && <span>{item.label}</span>}
                  </NavLink>
                </li>
              );
            })}
          </ul>
        </nav>

        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="h-12 border-t border-brand-600 flex items-center justify-center hover:bg-brand-600 transition-colors flex-shrink-0"
        >
          {sidebarOpen ? (
            <X className="w-5 h-5" />
          ) : (
            <Menu className="w-5 h-5" />
          )}
        </button>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 bg-white border-b border-slate/10 flex items-center justify-between px-6 flex-shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            {breadcrumb && breadcrumb.length > 0 ? (
              <div className="flex items-center gap-2 text-sm">
                {breadcrumb.map((item, index) => (
                  <div key={index} className="flex items-center gap-2">
                    {index > 0 && (
                      <ChevronRight className="w-4 h-4 text-slate flex-shrink-0" />
                    )}
                    {item.to ? (
                      <NavLink
                        to={item.to}
                        className="text-slate hover:text-brand transition-colors"
                      >
                        {item.label}
                      </NavLink>
                    ) : (
                      <span className="text-graphite font-medium truncate">
                        {item.label}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <h1 className="text-lg font-display font-semibold text-graphite truncate">
                {resolvedTitle}
              </h1>
            )}
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <div className="w-8 h-8 rounded-full bg-brand-50 flex items-center justify-center">
              <User className="w-4 h-4 text-brand" />
            </div>
            <span className="text-sm text-graphite">{operator}</span>
          </div>
        </header>

        <main className="flex-1 overflow-auto p-6 scrollbar-thin">
          {children ?? <Outlet />}
        </main>
      </div>
    </div>
  );
}
