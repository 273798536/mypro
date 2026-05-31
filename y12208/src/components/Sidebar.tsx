import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Calculator, 
  FileSearch, 
  GitCompare, 
  FileBarChart,
  Shield
} from 'lucide-react';

const navItems = [
  { path: '/', label: '概览仪表盘', icon: LayoutDashboard },
  { path: '/trial-calculation', label: '准备金试算', icon: Calculator },
  { path: '/claim-deduplication', label: '索赔去重分析', icon: FileSearch },
  { path: '/rule-versions', label: '规则版本管理', icon: GitCompare },
  { path: '/rolling-report', label: '滚动报告', icon: FileBarChart },
];

export default function Sidebar() {
  return (
    <aside className="w-64 bg-primary-900 min-h-screen flex flex-col">
      <div className="p-6 border-b border-primary-700">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary-600 rounded-lg flex items-center justify-center">
            <Shield className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-white font-serif font-bold text-lg">质保准备金</h1>
            <p className="text-primary-400 text-xs">管理系统 v2.1</p>
          </div>
        </div>
      </div>
      
      <nav className="flex-1 p-4 space-y-1">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `sidebar-link ${isActive ? 'sidebar-link-active' : ''}`
            }
          >
            <item.icon className="w-5 h-5" />
            <span className="font-medium">{item.label}</span>
          </NavLink>
        ))}
      </nav>
      
      <div className="p-4 border-t border-primary-700">
        <div className="bg-primary-800 rounded-lg p-4">
          <p className="text-primary-300 text-xs mb-2">当前操作员</p>
          <p className="text-white font-medium">财务分析师</p>
          <p className="text-primary-400 text-xs mt-1">
            上次登录: {new Date().toLocaleDateString('zh-CN')}
          </p>
        </div>
      </div>
    </aside>
  );
}
