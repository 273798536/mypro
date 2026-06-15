import { NavLink, Outlet, useLocation } from 'react-router-dom';
import {
  ClipboardList,
  Layers,
  GitBranch,
  History,
  Sparkles,
  Music2,
  User,
} from 'lucide-react';
import { useAppStore } from '@/store/appStore';

const navItems = [
  { to: '/', label: '分账对齐', icon: ClipboardList },
  { to: '/versions', label: '曲目版本', icon: Layers },
  { to: '/traceability', label: '影响溯源', icon: GitBranch },
  { to: '/history', label: '历史复盘', icon: History },
  { to: '/quickstart', label: '新人快速入口', icon: Sparkles },
];

export default function AppLayout() {
  const location = useLocation();
  const user = useAppStore((s) => s.currentUser);
  const sampleLoaded = useAppStore((s) => s.sampleLoaded);
  const pending = useAppStore((s) =>
    s.splitRecords.filter((r) => r.status === 'pending').length
  );
  const suspended = useAppStore((s) =>
    s.splitRecords.filter((r) => r.status === 'suspended').length
  );
  const conflicted = useAppStore((s) =>
    s.splitRecords.filter((r) => r.status === 'conflicted').length
  );

  return (
    <div className="flex h-full min-h-screen w-full flex-col">
      <header className="sticky top-0 z-30 border-b border-ink-100 bg-ink-700/95 backdrop-blur">
        <div className="mx-auto flex h-16 w-full max-w-[1400px] items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-400/90 text-ink-900 shadow-card">
              <Music2 size={20} strokeWidth={2.2} />
            </div>
            <div>
              <h1 className="font-display text-lg font-semibold tracking-wide text-white">
                剧场返场曲 · 分账对齐
              </h1>
              <p className="text-xs text-amber-100/80">
                版本不乱 · 结论可溯 · 交接说人话 · 到期不瞎判
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {sampleLoaded && (
              <div className="hidden items-center gap-2 md:flex">
                <span className="theater-chip bg-rouge-100 text-rouge-500">
                  挂起 {suspended}
                </span>
                <span className="theater-chip bg-rattan-100 text-rattan-500">
                  冲突 {conflicted}
                </span>
                <span className="theater-chip bg-ink-100 text-ink-500">
                  待办 {pending}
                </span>
              </div>
            )}
            <div className="flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-white">
              <User size={14} />
              <span className="text-xs font-medium">{user}</span>
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-[1400px] flex-1 gap-6 px-6 py-6">
        <aside className="sticky top-24 hidden h-fit w-56 shrink-0 md:block">
          <nav className="theater-card p-3">
            <p className="mb-2 px-2 pt-1 pb-2 text-xs font-medium tracking-wider text-ink-400">
              工作台
            </p>
            <ul className="space-y-1">
              {navItems.map(({ to, label, icon: Icon }) => {
                const isActive =
                  to === '/'
                    ? location.pathname === '/'
                    : location.pathname.startsWith(to);
                return (
                  <li key={to}>
                    <NavLink
                      to={to}
                      className={`group flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition ${
                        isActive
                          ? 'bg-ink-700 text-white shadow-card'
                          : 'text-ink-500 hover:bg-ink-50 hover:text-ink-700'
                      }`}
                    >
                      <Icon
                        size={16}
                        className={isActive ? 'text-amber-400' : ''}
                      />
                      <span>{label}</span>
                    </NavLink>
                  </li>
                );
              })}
            </ul>
          </nav>
        </aside>

        <main className="min-w-0 flex-1">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
