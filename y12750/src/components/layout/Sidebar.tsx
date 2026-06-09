import { NavLink } from 'react-router-dom';
import { LayoutList, BookOpen, FlaskRound } from 'lucide-react';

const navItems = [
  { path: '/', label: '记录列表', icon: LayoutList },
  { path: '/samples', label: '样例中心', icon: BookOpen },
];

export default function Sidebar() {
  return (
    <aside className="w-56 bg-white border-r border-paper-dark min-h-screen py-6">
      <nav className="px-4 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-sm-plus transition-all ${
                  isActive
                    ? 'bg-lab-blue text-white shadow-md'
                    : 'text-gray-600 hover:bg-paper hover:text-lab-blue'
                }`
              }
            >
              <Icon size={18} />
              <span className="font-medium text-sm">{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      <div className="mx-4 mt-8 p-4 rounded-sm-plus bg-paper border border-paper-dark">
        <FlaskRound size={20} className="text-lab-green mb-2" />
        <p className="text-xs text-gray-500 leading-relaxed">
          环境监测实验室 · 数据复核规范 v2.3
          <br />
          复核人需保留原始行号与谱图文件名
        </p>
      </div>
    </aside>
  );
}
