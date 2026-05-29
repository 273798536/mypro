import { NavLink, Outlet } from 'react-router-dom';
import { Upload, CheckSquare, FileText, Zap } from 'lucide-react';

const navItems = [
  { to: '/import', label: '数据导入', icon: Upload },
  { to: '/grading', label: '批改执行', icon: CheckSquare },
  { to: '/report', label: '报告明细', icon: FileText },
];

export default function Layout() {
  return (
    <div className="flex h-screen bg-[#1a1a2e] text-gray-100">
      <aside className="w-56 flex-shrink-0 border-r border-[#2d2d44] bg-[#13132a] flex flex-col">
        <div className="px-5 py-5 flex items-center gap-2.5 border-b border-[#2d2d44]">
          <Zap className="w-6 h-6 text-[#f0c040]" />
          <span className="text-base font-bold tracking-wide text-[#f0c040]">
            几何光路批改器
          </span>
        </div>
        <nav className="flex-1 py-4">
          {navItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-5 py-3 text-sm transition-all duration-150 ${
                  isActive
                    ? 'bg-[#2d2d44] text-[#f0c040] border-l-[3px] border-[#f0c040]'
                    : 'text-gray-400 hover:bg-[#1e1e38] hover:text-gray-200 border-l-[3px] border-transparent'
                }`
              }
            >
              <Icon className="w-4 h-4" />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="px-5 py-4 text-[10px] text-gray-600 border-t border-[#2d2d44]">
          光学作业批改工具 v1.0
        </div>
      </aside>
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}
