import { NavLink, useLocation } from 'react-router-dom';
import { Layers, Clock, Download, Shield } from 'lucide-react';
import type { ReactNode } from 'react';

const navItems = [
  { to: '/', label: '关卡列表', icon: Layers },
  { to: '/history', label: '历史记录', icon: Clock },
  { to: '/export', label: '导出下载', icon: Download },
];

export default function Layout({ children }: { children: ReactNode }) {
  const location = useLocation();

  return (
    <div className="flex h-screen overflow-hidden bg-ivory">
      <aside className="flex w-60 flex-shrink-0 flex-col bg-ink text-ivory">
        <div className="flex items-center gap-2.5 px-5 py-5 border-b border-ivory/10">
          <Shield className="h-6 w-6 text-amber" />
          <h1 className="font-serif text-lg font-semibold text-amber tracking-wide">
            合规检查
          </h1>
        </div>

        <nav className="flex-1 space-y-1 px-3 py-4">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              item.to === '/'
                ? location.pathname === '/' || location.pathname.startsWith('/level')
                : location.pathname.startsWith(item.to);
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={isActive ? 'sidebar-link-active' : 'sidebar-link'}
              >
                <Icon className="h-5 w-5" />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        <div className="px-5 py-4 border-t border-ivory/10 text-xs text-ivory/40">
          关卡合规检查平台 v1.0
        </div>
      </aside>

      <main className="flex-1 overflow-auto">
        <div className="p-6">{children}</div>
      </main>
    </div>
  );
}
