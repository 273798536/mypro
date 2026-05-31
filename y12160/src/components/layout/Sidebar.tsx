import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Settings,
  Gauge,
  Calculator,
  FileBarChart,
  Download
} from 'lucide-react';

const navItems = [
  { path: '/', label: '仪表盘', icon: LayoutDashboard },
  { path: '/nozzles', label: '喷嘴参数', icon: Settings },
  { path: '/pressure', label: '压力记录', icon: Gauge },
  { path: '/calculation', label: '雾化试算', icon: Calculator },
  { path: '/results', label: '试算结果', icon: FileBarChart },
  { path: '/reports', label: '报告导出', icon: Download }
];

export function Sidebar() {
  return (
    <aside className="fixed left-0 top-0 h-screen w-64 bg-slate-900 text-white flex flex-col z-50">
      <div className="p-6 border-b border-slate-700">
        <h1 className="text-xl font-bold text-blue-400">流体喷嘴雾化试算</h1>
        <p className="text-sm text-slate-400 mt-1">农业设备工程师专用</p>
      </div>
      
      <nav className="flex-1 p-4">
        <ul className="space-y-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <li key={item.path}>
                <NavLink
                  to={item.path}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                      isActive
                        ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                        : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                    }`
                  }
                >
                  <Icon size={20} />
                  <span className="font-medium">{item.label}</span>
                </NavLink>
              </li>
            );
          })}
        </ul>
      </nav>
      
      <div className="p-4 border-t border-slate-700">
        <div className="text-xs text-slate-500 text-center">
          版本 1.0.0
        </div>
      </div>
    </aside>
  );
}
