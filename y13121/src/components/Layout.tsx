import { NavLink, Outlet } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FlaskConical, FileSearch, Clock, FileInput, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/store/useAppStore';

const navItems = [
  { to: '/', label: '校验工作台', icon: FlaskConical },
  { to: '/review', label: '复核详情', icon: FileSearch },
  { to: '/timeline', label: '历史时间线', icon: Clock },
  { to: '/materials', label: '材料入口', icon: FileInput },
];

export default function Layout() {
  const currentOperator = useAppStore((s) => s.currentOperator);

  return (
    <div className="flex h-screen overflow-hidden">
      <aside className="flex w-56 flex-shrink-0 flex-col" style={{ backgroundColor: '#1a365d' }}>
        <div className="px-5 pt-6 pb-4">
          <h1
            className="text-lg font-bold leading-snug tracking-wide text-white"
            style={{ fontFamily: "'Playfair Display', serif" }}
          >
            最短路径
            <br />
            边界校验
          </h1>
          <div className="mt-2 h-px w-10 bg-amber-500/60" />
        </div>

        <nav className="mt-2 flex flex-1 flex-col gap-1 px-3">
          {navItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors',
                  isActive
                    ? 'border-l-[3px] border-amber-500 bg-white/15 text-amber-300'
                    : 'text-slate-300 hover:bg-white/8 hover:text-white'
                )
              }
            >
              <Icon className="h-4 w-4 flex-shrink-0" />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-white/10 px-4 py-4">
          <div className="flex items-center gap-2.5 text-sm text-slate-400">
            <User className="h-4 w-4 flex-shrink-0" />
            <span className="truncate">{currentOperator}</span>
          </div>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto bg-slate-50">
        <motion.div
          className="min-h-full p-8"
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
        >
          <Outlet />
        </motion.div>
      </main>
    </div>
  );
}
