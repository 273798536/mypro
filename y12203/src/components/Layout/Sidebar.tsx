import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  FileText,
  FileCheck,
  Calculator,
  BarChart3,
  History,
  Shield,
} from 'lucide-react';
import { cn } from '../../lib/utils';

const navItems = [
  { path: '/', label: '仪表盘', icon: LayoutDashboard },
  { path: '/claims', label: '赔案单管理', icon: FileText },
  { path: '/contracts', label: '分保合同', icon: FileCheck },
  { path: '/calculation', label: '摊回计算', icon: Calculator },
  { path: '/statements', label: '摊回表', icon: BarChart3 },
  { path: '/history', label: '历史追溯', icon: History },
];

export default function Sidebar() {
  return (
    <aside className="w-64 bg-primary-900 text-white min-h-screen flex flex-col">
      <div className="p-6 border-b border-primary-700">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-accent-500 rounded-lg flex items-center justify-center">
            <Shield className="w-6 h-6 text-primary-900" />
          </div>
          <div>
            <h1 className="font-serif font-bold text-lg">再保摊回</h1>
            <p className="text-xs text-primary-400">分保赔款管理系统</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === '/'}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200',
                'hover:bg-primary-800 hover:text-white',
                isActive
                  ? 'bg-primary-800 text-accent-400 shadow-lg shadow-primary-950/50'
                  : 'text-primary-300'
              )
            }
          >
            <item.icon className="w-5 h-5" />
            <span className="font-medium">{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="p-4 border-t border-primary-700">
        <div className="bg-primary-800/50 rounded-lg p-4">
          <p className="text-xs text-primary-400 mb-2">当前用户</p>
          <p className="font-medium text-sm">再保会计 - 张三</p>
        </div>
      </div>
    </aside>
  );
}
