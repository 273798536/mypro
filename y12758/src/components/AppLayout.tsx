import { NavLink, Outlet } from 'react-router-dom';
import type { ReactNode } from 'react';

const navItems = [
  { label: '配平计算', to: '/' },
  { label: '实验记录', to: '/records' },
  { label: '检查结果', to: '/results' },
  { label: '复测建议', to: '/retest' },
  { label: '历史导出', to: '/history' },
];

interface AppLayoutProps {
  children?: ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-ink-light bg-white sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <h1 className="font-serif font-bold text-xl text-ink">药物杂质限度检查</h1>
          <nav className="flex items-center gap-6">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) =>
                  `text-sm font-medium transition-colors ${
                    isActive
                      ? 'text-primary underline underline-offset-4'
                      : 'text-ink-muted hover:text-ink'
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto p-6 w-full">
        {children ?? <Outlet />}
      </main>

      <footer className="border-t border-ink-light bg-white">
        <div className="max-w-7xl mx-auto px-6 py-3 text-xs text-ink-muted text-center">
          药物杂质限度检查系统 v0.0.0
        </div>
      </footer>
    </div>
  );
}
