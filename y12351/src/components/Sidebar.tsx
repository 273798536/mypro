import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  FileInput,
  GitCompare,
  AlertTriangle,
  Edit3,
  FileBarChart,
  Activity,
} from 'lucide-react';

const menuItems = [
  {
    path: '/',
    label: '仪表盘',
    icon: LayoutDashboard,
  },
  {
    path: '/parameter-input',
    label: '参数录入',
    icon: FileInput,
  },
  {
    path: '/comparison',
    label: '参数对比',
    icon: GitCompare,
  },
  {
    path: '/anomalies',
    label: '异常清单',
    icon: AlertTriangle,
  },
  {
    path: '/manual-correction',
    label: '手动修正',
    icon: Edit3,
  },
  {
    path: '/report',
    label: '报告导出',
    icon: FileBarChart,
  },
];

export const Sidebar = () => {
  return (
    <div className="w-60 bg-slate-900 text-white min-h-screen flex flex-col">
      <div className="p-5 border-b border-slate-700">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
            <Activity className="w-6 h-6" />
          </div>
          <div>
            <h1 className="font-bold text-lg">核磁信号</h1>
            <p className="text-xs text-slate-400">参数调试系统</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-4">
        <ul className="space-y-1">
          {menuItems.map((item) => (
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
                <item.icon className="w-5 h-5" />
                <span className="font-medium">{item.label}</span>
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      <div className="p-4 border-t border-slate-700">
        <div className="bg-slate-800 rounded-lg p-4">
          <p className="text-xs text-slate-400 mb-2">当前用户</p>
          <p className="font-medium">医学物理讲师</p>
          <p className="text-xs text-slate-500 mt-1">版本 v1.0.0</p>
        </div>
      </div>
    </div>
  );
};
