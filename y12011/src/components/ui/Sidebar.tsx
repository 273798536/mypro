import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Package,
  Receipt,
  FileText,
  Calculator,
  GitCompare,
  AlertTriangle,
  FileBarChart
} from 'lucide-react';

const navItems = [
  { path: '/dashboard', label: '数据工作台', icon: LayoutDashboard },
  { path: '/data/dealers', label: '经销商档案', icon: Users },
  { path: '/data/sales', label: '销售发货', icon: Package },
  { path: '/data/payments', label: '回款流水', icon: Receipt },
  { path: '/agreement/list', label: '协议管理', icon: FileText },
  { path: '/agreement/trace', label: '协议追溯', icon: GitCompare },
  { path: '/trial/calculate', label: '返利试算', icon: Calculator },
  { path: '/trial/compare', label: '版本对比', icon: GitCompare },
  { path: '/correction/suggestions', label: '修正中心', icon: AlertTriangle },
  { path: '/report/preview', label: '报告输出', icon: FileBarChart }
];

export function Sidebar() {
  return (
    <div className="w-64 bg-gray-900 min-h-screen text-white flex flex-col">
      <div className="p-6 border-b border-gray-700">
        <h1 className="text-xl font-bold text-blue-400">医药返利合规核算</h1>
        <p className="text-sm text-gray-400 mt-1">Rebate Compliance System</p>
      </div>
      
      <nav className="flex-1 py-4">
        <ul className="space-y-1 px-3">
          {navItems.map((item) => (
            <li key={item.path}>
              <NavLink
                to={item.path}
                className={({ isActive }) =>
                `flex items-center px-4 py-3 mx-2 rounded-lg text-sm transition-colors ${
                  isActive
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                }`
              }
              >
                <item.icon size={20} className="mr-3" />
                {item.label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
      
      <div className="p-4 border-t border-gray-700">
        <div className="flex items-center">
          <div className="w-10 h-10 bg-gray-700 rounded-full flex items-center justify-center">
            <span className="text-sm font-medium">张</span>
          </div>
          <div className="ml-3">
            <p className="text-sm font-medium">财务BP-张三</p>
            <p className="text-xs text-gray-400">管理员</p>
          </div>
        </div>
      </div>
    </div>
  );
}
