import { NavLink } from 'react-router-dom';
import { cn } from '@/lib/utils';

const navItems = [
  { to: '/section', label: '剖切巡检' },
  { to: '/render', label: '3D复核' },
  { to: '/records', label: '记录管理' },
  { to: '/test', label: '测试' },
];

export default function AppHeader() {
  return (
    <header
      className="h-14 bg-primary-900 border-b border-white/5 flex items-center px-6"
      style={{ height: '56px' }}
    >
      <div className="flex-1">
        <span className="font-display font-bold text-lg text-white tracking-wide">
          化工反应釜视角巡检
        </span>
      </div>
      <nav className="flex items-center gap-2">
        {navItems.map((item) => (
          <NavLink
            key={item.to + item.label}
            to={item.to}
            className={({ isActive }) =>
              cn(
                'px-4 py-2 text-sm rounded transition-colors',
                isActive
                  ? 'text-accent-orange font-medium'
                  : 'text-steel-100 hover:text-white hover:bg-white/5'
              )
            }
          >
            {item.label}
          </NavLink>
        ))}
      </nav>
    </header>
  );
}
