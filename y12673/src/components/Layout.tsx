import { NavLink, Outlet, useLocation } from 'react-router-dom';
import {
  Clock,
  Download,
  Camera,
  FlaskConical,
  Mountain,
} from 'lucide-react';
import { motion } from 'framer-motion';

const navItems = [
  { to: '/', label: '时间回放', icon: Clock, end: true },
  { to: '/download', label: '数据下载', icon: Download },
  { to: '/perspective', label: '视角保存', icon: Camera },
  { to: '/test', label: '测试场景', icon: FlaskConical },
];

export default function Layout() {
  const location = useLocation();

  return (
    <div className="min-h-screen flex bg-stone-50">
      <aside className="w-60 bg-gradient-to-b from-stone-900 via-stone-800 to-stone-900 text-white flex flex-col">
        <div className="p-5 border-b border-stone-700/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center shadow-lg shadow-orange-900/40">
              <Mountain className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="font-bold text-lg leading-tight">火山地貌</div>
              <div className="text-xs text-stone-400">剖切讲解工作台</div>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-1">
          {navItems.map(item => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm transition-all ${
                    isActive
                      ? 'bg-gradient-to-r from-orange-600/90 to-red-600/90 text-white shadow-md shadow-orange-900/30'
                      : 'text-stone-300 hover:bg-stone-700/40 hover:text-white'
                  }`
                }
              >
                <Icon className="w-4.5 h-4.5" />
                <span className="font-medium">{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        <div className="p-4 border-t border-stone-700/60">
          <div className="text-xs text-stone-400">舞台统筹 · 本地工作台</div>
          <div className="text-xs text-stone-500 mt-0.5">v1.0.0</div>
        </div>
      </aside>

      <main className="flex-1 overflow-auto">
        <motion.div
          key={location.pathname}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.2 }}
        >
          <Outlet />
        </motion.div>
      </main>
    </div>
  );
}
