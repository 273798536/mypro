import { NavLink, Outlet } from 'react-router-dom';
import { Drum, List, Moon } from 'lucide-react';

const navItems = [
  { to: '/practices', label: '练习列表', icon: List },
];

export default function Layout() {
  return (
    <div className="flex h-screen overflow-hidden bg-dark-primary">
      <aside className="w-64 flex-shrink-0 bg-dark-secondary border-r border-dark-border flex flex-col">
        <div className="p-5 border-b border-dark-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-primary/20 flex items-center justify-center">
              <Drum className="w-5 h-5 text-amber-primary" />
            </div>
            <div>
              <h1 className="font-display text-base font-semibold text-text-primary leading-tight">
                鼓手练习
              </h1>
              <p className="text-xs text-text-muted">速度阶梯工作台</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? 'bg-amber-primary/15 text-amber-primary'
                    : 'text-text-secondary hover:bg-dark-tertiary hover:text-text-primary'
                }`
              }
            >
              <item.icon className="w-4 h-4" />
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="p-4 border-t border-dark-border">
          <div className="flex items-center gap-2 text-xs text-text-muted">
            <Moon className="w-3.5 h-3.5" />
            <span>深色主题</span>
          </div>
        </div>
      </aside>

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-12 flex-shrink-0 bg-dark-secondary border-b border-dark-border flex items-center px-6">
          <div className="flex items-center gap-2 text-sm text-text-muted">
            <NavLink to="/practices" className="hover:text-text-primary transition-colors">
              首页
            </NavLink>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
