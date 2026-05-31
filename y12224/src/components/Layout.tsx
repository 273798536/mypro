import { Outlet, NavLink, useLocation } from 'react-router-dom';
import { Wallet, Users, FileText, BedDouble, ChevronRight } from 'lucide-react';

const navItems = [
  { path: '/deposit', label: '押金账本', icon: Wallet },
  { path: '/archive', label: '入住档案', icon: Users },
  { path: '/settlement', label: '结算中心', icon: FileText },
  { path: '/beds', label: '床位总览', icon: BedDouble },
];

export default function Layout() {
  const location = useLocation();

  const currentNav = navItems.find(n => location.pathname.startsWith(n.path));

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: 'var(--color-bg)' }}>
      <aside className="w-60 flex-shrink-0 flex flex-col border-r" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
        <div className="px-5 py-5 border-b" style={{ borderColor: 'var(--color-border)' }}>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'var(--color-primary)' }}>
              <Wallet size={16} className="text-white" />
            </div>
            <div>
              <div className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>床位押金管理</div>
              <div className="text-xs" style={{ color: 'var(--color-text-muted)' }}>养老机构本地服务</div>
            </div>
          </div>
        </div>

        <nav className="flex-1 py-3 px-3">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname.startsWith(item.path);
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium mb-0.5 transition-all ${
                  isActive
                    ? 'text-white'
                    : ''
                }`}
                style={isActive ? { background: 'var(--color-primary)' } : { color: 'var(--color-text-secondary)' }}
              >
                <Icon size={18} />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        <div className="px-4 py-3 border-t" style={{ borderColor: 'var(--color-border)' }}>
          <div className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
            数据存储于本地 SQLite
          </div>
        </div>
      </aside>

      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="h-14 flex items-center justify-between px-6 border-b flex-shrink-0" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
          <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
            <span>首页</span>
            {currentNav && (
              <>
                <ChevronRight size={14} />
                <span style={{ color: 'var(--color-text)' }}>{currentNav.label}</span>
              </>
            )}
          </div>
          <div className="text-xs font-mono" style={{ color: 'var(--color-text-muted)' }}>
            {new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' })}
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
