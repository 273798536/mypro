import { Link, Outlet, useLocation } from 'react-router-dom';
import { LayoutDashboard, Database, Trophy, FileText } from 'lucide-react';

const navItems = [
  { to: '/materials', label: '材料导入', icon: Database },
  { to: '/scheduler', label: '排程竞技', icon: LayoutDashboard },
  { to: '/result', label: '结果回放', icon: Trophy },
  { to: '/report', label: '运行报告', icon: FileText },
];

export default function AppLayout() {
  const loc = useLocation();
  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-white/10 bg-black/20 backdrop-blur">
        <div className="max-w-[1400px] mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-[#2E5BFF] to-[#5B8DFF] flex items-center justify-center font-display text-white font-bold">
              冷
            </div>
            <div>
              <div className="font-display text-lg tracking-wider">冷库除霜排程赛</div>
              <div className="text-[11px] text-white/50">Cold Storage Defrost Scheduler Arena</div>
            </div>
          </div>
          <nav className="flex items-center gap-1">
            {navItems.map((n) => {
              const Icon = n.icon;
              const active = loc.pathname.startsWith(n.to);
              return (
                <Link
                  key={n.to}
                  to={n.to}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition ${
                    active ? 'bg-white/10 text-white' : 'text-white/60 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <Icon size={16} />
                  {n.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </header>
      <main className="flex-1 max-w-[1400px] w-full mx-auto px-6 py-6">
        <Outlet />
      </main>
    </div>
  );
}
