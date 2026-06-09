import { NavLink } from 'react-router-dom';
import { Home, FileInput, LineChart, FileBarChart, Search, FlaskConical } from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { to: '/', label: '首页', icon: Home },
  { to: '/input', label: '数据录入', icon: FileInput },
  { to: '/curve', label: '曲线展示', icon: LineChart },
  { to: '/result', label: '结果报告', icon: FileBarChart },
  { to: '/trace', label: '异常追溯', icon: Search },
];

export default function NavBar() {
  return (
    <nav className="bg-[#1e3a5f] text-white shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            <FlaskConical className="w-8 h-8 text-[#0d9488]" />
            <span className="text-xl font-bold">溶解度曲线教学器</span>
          </div>
          <div className="flex items-center gap-1">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-[#0d9488] text-white'
                      : 'text-gray-200 hover:bg-[#2a4a73] hover:text-white'
                  )
                }
              >
                <item.icon className="w-4 h-4" />
                <span>{item.label}</span>
              </NavLink>
            ))}
          </div>
        </div>
      </div>
    </nav>
  );
}
