import { NavLink } from 'react-router-dom';
import { Calculator, Layers, BarChart3, History, Home } from 'lucide-react';

const navItems = [
  { path: '/', label: '首页', icon: Home },
  { path: '/single', label: '单条计算', icon: Calculator },
  { path: '/batch', label: '批量计算', icon: Layers },
  { path: '/results', label: '结果分析', icon: BarChart3 },
  { path: '/history', label: '历史记录', icon: History }
];

export function Navigation() {
  return (
    <nav className="bg-slate-900 text-white shadow-xl">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center">
              <span className="text-white font-bold text-lg">D</span>
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight">多普勒测速教具</h1>
              <p className="text-xs text-slate-400">Doppler Effect Calculator</p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            {navItems.map(({ path, label, icon: Icon }) => (
              <NavLink
                key={path}
                to={path}
                className={({ isActive }) =>
                  `flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/30'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`
                }
              >
                <Icon className="w-4 h-4" />
                <span className="hidden sm:inline">{label}</span>
              </NavLink>
            ))}
          </div>
        </div>
      </div>
    </nav>
  );
}
