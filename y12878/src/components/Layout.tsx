import { Anchor, Bell, User } from 'lucide-react';
import { NavLink, Outlet } from 'react-router-dom';
import { cn } from '@/lib/utils';

const navItems = [
  { to: '/', label: '首页地图' },
  { to: '/review', label: '复盘详情' },
  { to: '/trace', label: '数据溯源' },
  { to: '/correction', label: '人工修正' },
  { to: '/duplicate', label: '重复检测' },
  { to: '/alert', label: '水质预警' },
];

export default function Layout() {
  return (
    <div className="flex min-h-screen flex-col bg-sea-gray">
      <header className="bg-deep-sea text-white shadow-lg">
        <div className="container flex h-16 items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-ocean/20">
              <Anchor className="h-6 w-6 text-ocean" />
            </div>
            <h1 className="text-xl font-bold tracking-wide">渔船油耗航线复盘系统</h1>
          </div>

          <nav className="flex items-center gap-1">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) =>
                  cn(
                    'rounded-md px-4 py-2 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-ocean/20 text-ocean-light'
                      : 'text-white/80 hover:bg-white/10 hover:text-white'
                  )
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>

          <div className="flex items-center gap-4">
            <div className="relative">
              <button className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 transition-colors hover:bg-white/20">
                <Bell className="h-5 w-5" />
              </button>
              <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-coral opacity-75" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-coral" />
              </span>
            </div>

            <div className="flex items-center gap-2 border-l border-white/20 pl-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-ocean/30">
                <User className="h-5 w-5" />
              </div>
              <span className="text-sm font-medium">海岛运维-王工</span>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 bg-nautical-pattern">
        <div className="container p-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
