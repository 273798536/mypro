import { NavLink, Outlet } from 'react-router-dom';
import { List, Clock, Download } from 'lucide-react';

const navItems = [
  { to: '/', label: '投诉列表', icon: List },
  { to: '/history', label: '历史审计', icon: Clock },
  { to: '/export', label: '数据导出', icon: Download },
];

export default function Layout() {
  return (
    <div className="flex min-h-screen">
      <aside
        className="w-64 flex-shrink-0 flex flex-col"
        style={{
          background: 'linear-gradient(180deg, #1B3A4B 0%, #2A5568 100%)',
        }}
      >
        <div className="px-6 py-8">
          <h1
            className="text-xl font-bold text-white leading-tight"
            style={{ fontFamily: "'Noto Serif SC', serif" }}
          >
            雨水口积淤
            <br />
            投诉回放
          </h1>
          <div className="mt-2 h-0.5 w-12 rounded" style={{ backgroundColor: '#E8A838' }} />
        </div>

        <nav className="flex-1 px-3">
          {navItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-lg mb-1 text-sm font-medium transition-colors ${
                  isActive
                    ? 'text-white'
                    : 'text-white/60 hover:text-white/90 hover:bg-white/10'
                }`
              }
              style={({ isActive }) =>
                isActive ? { backgroundColor: 'rgba(232, 168, 56, 0.2)' } : {}
              }
            >
              {({ isActive }) => (
                <>
                  <Icon size={18} style={{ color: isActive ? '#E8A838' : undefined }} />
                  <span>{label}</span>
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="px-6 py-4 text-xs text-white/40">
          v1.0.0
        </div>
      </aside>

      <main className="flex-1 overflow-auto" style={{ backgroundColor: '#F5F3EF' }}>
        <div className="mx-auto max-w-6xl p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
