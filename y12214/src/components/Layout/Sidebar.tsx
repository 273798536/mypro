import { NavLink, useLocation } from 'react-router-dom';
import { 
  Calculator, 
  Film, 
  DollarSign, 
  AlertTriangle, 
  FileDown,
  Clapperboard
} from 'lucide-react';

const navItems = [
  { path: '/', label: '测算工作台', icon: Calculator },
  { path: '/series', label: '剧集档案', icon: Film },
  { path: '/cost', label: '投流消耗', icon: DollarSign },
  { path: '/exceptions', label: '异常处理', icon: AlertTriangle },
  { path: '/export', label: '报表导出', icon: FileDown },
];

export default function Sidebar() {
  const location = useLocation();
  
  return (
    <aside className="w-64 bg-white border-r border-gray-100 min-h-screen flex flex-col">
      <div className="p-6 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-primary-700 rounded-lg flex items-center justify-center">
            <Clapperboard className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-serif font-bold text-lg text-primary-700">短剧测算</h1>
            <p className="text-xs text-gray-400">投流回收管理系统</p>
          </div>
        </div>
      </div>
      
      <nav className="flex-1 p-4 space-y-1">
        {navItems.map(item => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={isActive ? 'sidebar-link-active' : 'sidebar-link'}
            >
              <Icon className="w-5 h-5" />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>
      
      <div className="p-4 border-t border-gray-100">
        <div className="text-xs text-gray-400 space-y-1">
          <p>数据自动保存到本地</p>
          <p>刷新页面不会丢失</p>
        </div>
      </div>
    </aside>
  );
}
