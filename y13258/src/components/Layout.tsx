import { NavLink, Outlet } from 'react-router-dom';
import { BarChart3, ClipboardList, MapPin, History } from 'lucide-react';

const navItems = [
  { to: '/', label: '方案比选', icon: BarChart3 },
  { to: '/ledger', label: '审批台账', icon: ClipboardList },
  { to: '/field', label: '现场补录', icon: MapPin },
  { to: '/history', label: '历史复盘', icon: History },
];

export default function Layout() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#f0fdfa] to-white">
      <nav className="fixed top-0 left-0 right-0 z-50 h-16 bg-white shadow flex items-center px-6">
        <span className="text-xl font-bold text-[#0D7377] mr-10 whitespace-nowrap">学校接送方案比选</span>
        <div className="flex items-center gap-1">
          {navItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-medium transition-colors border-b-2 ${
                  isActive
                    ? 'text-[#0D7377] border-[#0D7377]'
                    : 'text-gray-500 border-transparent hover:text-[#0D7377] hover:border-[#0D7377]/30'
                }`
              }
            >
              <Icon size={18} />
              {label}
            </NavLink>
          ))}
        </div>
      </nav>
      <main className="pt-16 p-6">
        <Outlet />
      </main>
    </div>
  );
}
